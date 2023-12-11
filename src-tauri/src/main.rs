use serde::{Serialize, Deserialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::thread;
use std::time::Duration;
use uuid::Uuid;
use once_cell::sync::Lazy;

#[derive(Serialize, Deserialize)]
struct Bus {
    percent: u32,
    is_active: bool,
}

#[derive(Serialize, Deserialize)]
struct GlobalData {
    balance: i32,
    speed: u32,
    refresh_rate: u64,
    buses: HashMap<Uuid, Bus>,
}

// Global data shared across threads
static GLOBAL_DATA: Lazy<Arc<Mutex<GlobalData>>> = Lazy::new(|| {
    Arc::new(Mutex::new(GlobalData {
        balance: 0,
        speed: 1,
        refresh_rate: 20,
        buses: HashMap::new(),
    }))
});

#[tauri::command]
fn get_global_state() -> String {
    let data = GLOBAL_DATA.lock().unwrap();
    serde_json::to_string(&*data).expect("Failed to serialize data")
}

#[tauri::command]
fn toggle_bus(bus_id: Uuid) {
    let mut data = GLOBAL_DATA.lock().unwrap();
    let bus = data.buses.entry(bus_id).or_insert(Bus {
        percent: 0,
        is_active: false,
    });
    bus.is_active = !bus.is_active;
}

#[tauri::command]
fn update_simulation_speed(speed: u32) {
    let mut data = GLOBAL_DATA.lock().unwrap();
    data.speed = speed;
}

#[tauri::command]
fn update_refresh_rate(refresh_rate: u64) {
    let mut data = GLOBAL_DATA.lock().unwrap();
    data.refresh_rate = refresh_rate;
}

fn main() {
    let bus_ids = vec![Uuid::new_v4(), Uuid::new_v4()];
    for bus_id in bus_ids {
        let global_data: Arc<Mutex<GlobalData>> = GLOBAL_DATA.clone();
        thread::spawn(move || {
            let mut increasing = true;
            const PERIOD: u64 = 20; // 5ms
            
            loop {
                thread::sleep(Duration::from_millis(PERIOD));
                let mut data = global_data.lock().unwrap();
                let speed = data.speed;
                let bus = data.buses.entry(bus_id).or_insert(Bus {
                    percent: 0,
                    is_active: true,
                });
                if !bus.is_active {
                    continue;
                }
                let current = bus.percent;
                let new_value = if increasing {
                    if current >= 1000 - speed { // 100.0 in tenths
                        increasing = false;
                        1000
                    } else {
                        current + speed
                    }
                } else {
                    if current < speed {
                        increasing = true;
                        0
                    } else {
                        current - speed
                    }
                };
                bus.percent = new_value;
            }
        });
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_global_state, toggle_bus, update_simulation_speed, update_refresh_rate])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}