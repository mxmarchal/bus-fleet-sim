# Project Title: bus-fleet-sim

## Overview

This project is an advanced, interactive simulation system developed using the Tauri framework, integrating both Rust and React technologies. The application simulates the movement of buses along predefined paths, offering real-time control and visualization of various parameters.

To be honest, I relied on ChatGPT to draft this README, and I haven't thoroughly reviewed it. However, the motivation behind this project stems from a noticeable issue in many 2D top-down games and strategy simulations - they often struggle with managing a large number of units efficiently. This lack of optimization can drain the fun out of the gameplay after a few hours. I explored the idea of decoupling the simulation and UI rendering processes. Rust emerged as an ideal language for handling the simulation aspect due to its performance and safety, while React's capabilities made it a prime choice for managing the UI (And also because I don't have any skilled in other UI stuff). This project is the result of merging these two powerful technologies to create a more efficient and enjoyable gaming experience.

## Key Features

- **Dynamic Bus Simulation**: The core functionality revolves around simulating buses on a grid. Each bus follows a predefined path, with its progress and status dynamically updated based on user interactions and internal logic.

- **Real-time Global State Management**: A shared global state, implemented in Rust, manages critical simulation data like bus status (active/inactive), balance, speed, and refresh rate. This state is continuously updated and synchronized across the simulation.

- **Interactive Visualization**: The React frontend presents a visual representation of the bus paths and current locations. The buses are rendered on a scalable SVG canvas, allowing users to visually track their progress.

- **User Controls**: Users can interact with the simulation in real-time. This includes toggling the active status of individual buses, adjusting the simulation speed, and modifying the refresh rate.

- **Concurrent Processing**: Leveraging Rust’s concurrency features, the simulation runs multiple threads to manage the state of each bus independently, ensuring smooth and efficient performance.

- **Responsive Design**: The interface is designed to be user-friendly, providing immediate visual feedback and controls for various simulation parameters.

## Technical Stack

- **Frontend**: React for the interactive user interface, integrated with D3.js for rendering complex SVG paths.
- **Backend**: Rust for efficient and safe handling of concurrency and state management, exposing functionalities via Tauri commands.
- **Data Visualization**: SVG for rendering bus paths and locations, with D3.js for calculating path data and coordinates.
- **State Management**: Use of Rust's Arc and Mutex for thread-safe management of global state.

## Use Cases

This simulation system can be adapted for various scenarios, including educational purposes, algorithm testing, and interactive demonstrations of path-following entities in a grid-like environment.
