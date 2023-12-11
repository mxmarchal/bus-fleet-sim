import { useState, useEffect, useMemo, useCallback } from "react";
import { line } from "d3-shape";
import "./App.css";
import { invoke } from "@tauri-apps/api/tauri";

type Bus = {
  percent: number;
  is_active: boolean;
};

type GlobalState = {
  balance: number;
  speed: number;
  refresh_rate: number;
  buses: Record<string, Bus>;
};

type BusCoordinates = {
  uuid: string;
  is_active: boolean;
  coordinates: Point[];
};

type Block = {
  x: number;
  y: number;
  uuid: string;
  is_active: boolean;
};

type Point = {
  x: number;
  y: number;
};

type PathData = {
  uuid: string;
  path: string;
};

function App() {
  const BLOCK_SIZE = 10;
  const ORIGNAL_BUS = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 20, y: 10 },
    { x: 20, y: 20 },
    { x: 30, y: 20 },
    { x: 30, y: 30 },
    { x: 40, y: 30 },
    { x: 40, y: 40 },
    { x: 50, y: 40 },
  ];
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState<BusCoordinates[]>([]);

  // Load the global state and generate the coordinates for each bus if not already loaded
  useEffect(() => {
    if (isLoaded) {
      return;
    }
    invoke("get_global_state").then((response) => {
      const parse: GlobalState = JSON.parse(response as string);
      setGlobalState(parse);
      setIsLoaded(true);
      // for each bus, we have to create the coordinates and paths.
      const busKeys = Object.keys(parse.buses);
      const allCoordinates: BusCoordinates[] = [];
      for (let i = 0; i < busKeys.length; i++) {
        const busCoordinates: Point[] = ORIGNAL_BUS.map((point) => {
          return {
            x: point.x,
            y: point.y + i * 50,
          };
        });
        //generate const final with busuuid : busCoordinates
        allCoordinates.push({
          uuid: busKeys[i],
          coordinates: busCoordinates,
          is_active: parse.buses[busKeys[i]].is_active,
        });
      }
      setCoordinates(allCoordinates);
    });
  }, []);

  useEffect(() => {
    if (globalState === null) {
      return;
    }
    const fetch = setInterval(() => {
      invoke("get_global_state").then((response) => {
        const parse: GlobalState = JSON.parse(response as string);
        setGlobalState(parse);
      });
    }, globalState.refresh_rate);
    return () => clearInterval(fetch);
  }, [globalState?.refresh_rate]);

  const viewBox = useMemo(() => {
    if (coordinates.length === 0) {
      return "";
    }

    const allCoordinates = coordinates.map((coord) => coord.coordinates).flat();

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    allCoordinates.forEach((coord) => {
      minX = Math.min(minX, coord.x);
      minY = Math.min(minY, coord.y);
      maxX = Math.max(maxX, coord.x);
      maxY = Math.max(maxY, coord.y);
    });

    const padding = 50; // Desired padding around the line
    const viewBoxWidth = maxX - minX + padding * 2;
    const viewBoxHeight = maxY - minY + padding * 2;

    return `${minX - padding} ${
      minY - padding
    } ${viewBoxWidth} ${viewBoxHeight}`;
  }, [coordinates]);

  const pathData = useMemo(() => {
    if (coordinates.length === 0) {
      return [];
    }

    // Define a scale factor
    const scaleFactor = 1; // Adjust this value to scale the coordinates

    // Use d3 to create path data with scaled coordinates
    const lineGenerator = line<Point>()
      .x((d) => d.x * scaleFactor) // Scale the x coordinate
      .y((d) => d.y * scaleFactor); // Scale the y coordinate

    // Initialize the block at the start of the path, also scaled
    // setBlockPosition({
    //   x: coordinates[0].x * scaleFactor - blockSize / 2,
    //   y: coordinates[0].y * scaleFactor - blockSize / 2,
    // });

    const allPathData: PathData[] = [];
    for (let i = 0; i < coordinates.length; i++) {
      const newPathData = lineGenerator(coordinates[i].coordinates);
      if (newPathData) {
        allPathData.push({
          uuid: coordinates[i].uuid,
          path: newPathData,
        });
      }
    }
    return allPathData;
  }, [coordinates]);

  const blocks = useMemo<Block[]>(() => {
    if (globalState === null || coordinates.length === 0) {
      return [];
    }

    return coordinates.map((busCoord) => {
      const pathCoordinates = busCoord.coordinates;
      const blockPercent = globalState.buses[busCoord.uuid].percent / 10;
      // Calculate total path length and lengths of each segment
      let totalLength = 0;
      let segmentLengths = [];
      for (let i = 0; i < pathCoordinates.length - 1; i++) {
        let segmentLength = Math.hypot(
          pathCoordinates[i + 1].x - pathCoordinates[i].x,
          pathCoordinates[i + 1].y - pathCoordinates[i].y
        );
        segmentLengths.push(segmentLength);
        totalLength += segmentLength;
      }

      // Determine the target length along the path for the block
      let targetLength = (blockPercent / 100) * totalLength;

      // Find the segment where the block should be
      let accumulatedLength = 0;
      let segmentIndex = 0;
      while (accumulatedLength + segmentLengths[segmentIndex] < targetLength) {
        accumulatedLength += segmentLengths[segmentIndex];
        segmentIndex++;
        if (segmentIndex >= segmentLengths.length) {
          break;
        }
      }

      // Adjust if we've exceeded the path length
      segmentIndex = Math.min(segmentIndex, segmentLengths.length - 1);

      // Calculate the position within the segment
      let segmentProgress = 0;
      if (segmentIndex < segmentLengths.length) {
        segmentProgress =
          (targetLength - accumulatedLength) / segmentLengths[segmentIndex];
      }

      let segmentStart = pathCoordinates[segmentIndex];
      let segmentEnd = pathCoordinates[segmentIndex + 1];

      const posX =
        segmentStart.x +
        (segmentEnd.x - segmentStart.x) * segmentProgress -
        BLOCK_SIZE / 2;
      const posY =
        segmentStart.y +
        (segmentEnd.y - segmentStart.y) * segmentProgress -
        BLOCK_SIZE / 2;

      return {
        uuid: busCoord.uuid,
        is_active: globalState.buses[busCoord.uuid].is_active,
        x: posX,
        y: posY,
      };
    });
  }, [globalState, coordinates]);

  const handleOnClick = useCallback(
    (uuid: string) => () => {
      invoke("toggle_bus", { busId: uuid });
    },
    []
  );

  const handleOnSpeedSliderChange = useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      const speed = parseInt(event.currentTarget.value);
      invoke("update_simulation_speed", { speed });
    },
    []
  );

  const handleOnRefreshRateSliderChange = useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      const refreshRate = parseInt(event.currentTarget.value);
      invoke("update_refresh_rate", { refreshRate });
    },
    []
  );

  return (
    <div className="container">
      <div className="content">
        {globalState && viewBox.length > 0 && (
          <svg
            height="500"
            width="500"
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
          >
            {pathData.map((path) => (
              <path
                key={path.uuid}
                d={path.path}
                id={`path-${path.uuid}`}
                style={{
                  fill: "none",
                  stroke: "#000000",
                  strokeWidth: "2",
                  strokeLinecap: "square",
                }}
              />
            ))}
            {blocks.map((block) => (
              <rect
                key={block.uuid}
                id={`block-${block.uuid}`}
                width={BLOCK_SIZE}
                height={BLOCK_SIZE}
                x={block.x} // Center the block
                y={block.y}
                fill={
                  block.is_active
                    ? "rgba(0, 0, 255, 0.5)"
                    : "rgba(255, 0, 0, 0.5)"
                }
                onClick={handleOnClick(block.uuid)}
              />
            ))}
          </svg>
        )}
        <div>
          <h2>Simulation controller</h2>
          <pre>
            {globalState && JSON.stringify(globalState, null, 2)}
            {!globalState && "Loading..."}
          </pre>
          {
            // slider to control the speed of the simulation
          }
          <label htmlFor="speed">Speed</label>
          <input
            type="range"
            id="speed"
            name="speed"
            min="1"
            max="100"
            defaultValue="50"
            onMouseUp={handleOnSpeedSliderChange}
          />
          <label htmlFor="refresh_rate">Refresh rate</label>
          <input
            type="range"
            id="refresh_rate"
            name="refresh_rate"
            min="20"
            max="1000"
            defaultValue="20"
            step="20"
            onMouseUp={handleOnRefreshRateSliderChange}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
