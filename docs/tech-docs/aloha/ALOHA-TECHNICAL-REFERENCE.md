# ALOHA Technical Reference
## Accurate Documentation of Current System

---

## System Overview

ALOHA is a trajectory visualization module for RED ORBIT that displays anti-satellite (ASAT) weapons from launch to impact. It provides interactive trajectory creation and playback with visual markers and labels.

### Core Components

```
/frontend/js/aloha/
├── aloha-handler.js              # Main trajectory playback system
├── aloha-translator.js           # TEME coordinate conversion
├── asat-trajectory-generator.js  # Ballistic trajectory calculations
├── asat-targeting-mode.js        # Interactive targeting interface
├── asat-launch-configurator.js   # Launch parameter UI
└── aloha-config-popup.js         # Settings configuration
```

---

## Features

### Trajectory Visualization
- Loads trajectory data from JSON files
- Displays ASAT as red glowing triangle mesh
- Shows full trajectory path (red/orange gradient line)
- Projects ground track on Earth surface (yellow line)
- Dynamic trail mode (toggle with 'M' key)

### Visual Markers
- **Launch Site**: Orange sphere with location label
- **Impact Point**: Red debris cloud with 8 fragments
- **Apogee**: White sphere at highest altitude
- **Labels**: Geographic coordinates and location names

### Interactive Targeting
1. Select "CUSTOM LAUNCH" from engineering panel
2. Right-click Earth to set launch point (green marker)
3. Right-click again to set target (red marker)
4. Adjust parameters:
   - Target altitude: 200-1000 km
   - Flight time: 300-600 seconds
5. Click "LAUNCH" to execute

### Playback Control
- Real-time or accelerated playback (1x, 2x, 5x, 10x)
- Pause/resume with spacebar
- Uses RO-Engine's global time multiplier
- Smooth interpolation between trajectory points

---

## Data Format

### Input Structure
```json
{
  "id": "trajectory_identifier",
  "name": "Human readable name",
  "epoch": "2025-01-01T12:00:00Z",
  "frame": "TEME",
  "trajectory": [
    [0, 3252.3, -3713.3, -4025.7],
    [1, 3252.5, -3713.5, -4025.9],
    [2, 3252.8, -3713.7, -4026.1]
  ]
}
```

### Coordinate System
- **Input**: TEME (True Equator Mean Equinox) coordinates in kilometers
- **Internal**: Converted to Babylon.js world coordinates
- **Display**: Geographic lat/lon for labels

---

## Trajectory Generator

The `ASATTrajectoryGenerator` class creates realistic ballistic trajectories:

### Physics Model
```javascript
// Three-phase ballistic trajectory
BOOST_PHASE:     0-60s,    0-150km,   0-3 km/s
MIDCOURSE_PHASE: 60-300s,  150-600km, 3-7 km/s  
TERMINAL_PHASE:  300-420s, 600-400km, 7-10 km/s
```

### Calculations
- Great circle path between launch and target
- Parabolic altitude profile
- Maximum velocity: 10 km/s (realistic limit)
- Gravity: 9.81 m/s² (0.00981 km/s²)

---

## Integration with RO-Engine

### Systems Used
- **Conjunction Detection**: Uses RO-Engine's spatial hashing
- **Time Management**: Synchronized with global simulation time
- **Camera System**: Can track ASAT during flight
- **Occlusion**: Handles Earth blocking visibility

### Events Fired
```javascript
'asat-launched' - Launch detected with location
'asat-impact'   - Impact occurred with target info
'conjunction-warning' - Close approach detected
```

---

## Controls

| Key | Function |
|-----|----------|
| M | Toggle trail mode |
| Space | Pause/resume |
| 1-4 | Playback speed |
| ESC | Exit targeting mode |

### Mouse
- **Left-drag**: Rotate camera
- **Right-click**: Select launch/target (in targeting mode)
- **Scroll**: Zoom in/out
- **Hover**: Show tooltip with altitude/velocity

---

## Performance

- Single ASAT trajectory at a time
- ~200 trajectory points typical
- 60 FPS maintained
- ~15MB memory per trajectory
- WebGL2 required

---

## Test Data

Available in `/frontend/data/`:

| File | Description | Issues |
|------|-------------|--------|
| traj_0.json | Original test data | Starts underground |
| aurora_asat_test.json | Aurora, CO launch | Valid |
| russia_asat_test.json | Plesetsk launch | Valid |
| orbital_intercept_1_test.json | LEO intercept | Velocity warnings |
| orbital_intercept_2_test.json | MEO intercept | Velocity warnings |

---

## Known Limitations

### Current System
- Only one ASAT at a time
- No real sensor data integration
- Simple JSON format only
- No export functionality
- No threat assessment
- No automated responses

### Physics Simplifications
- Assumes spherical Earth (6371 km radius)
- No atmospheric drag modeling
- Simplified gravity model
- No perturbations (J2, solar pressure, etc.)

---

## API Usage

### Initialize
```javascript
import { ALOHAHandler } from './aloha/aloha-handler.js';
const alohaHandler = new ALOHAHandler(roEngine);
```

### Load Trajectory
```javascript
const trajectoryData = {
  id: "test_asat",
  epoch: "2025-01-01T12:00:00Z",
  frame: "TEME",
  trajectory: [[0, x, y, z], ...]
};

alohaHandler.loadTrajectory({
  data: trajectoryData,
  showConjunctions: true,
  autoTarget: true,
  playbackSpeed: 1
});
```

### Start Playback
```javascript
alohaHandler.start();
```

### Stop
```javascript
alohaHandler.stop();
```

---

## Future Improvements

These features are NOT implemented but could be added:

### Near-term
- Multiple simultaneous ASATs
- TLE support
- Export trajectory data
- Saved scenario management

### Long-term
- Real sensor integration
- Military data formats
- Threat assessment
- Debris propagation
- Automated responses

---

## Summary

ALOHA is a trajectory visualization tool that accurately displays ASAT paths with interactive targeting. It integrates cleanly with RO-Engine and provides a foundation for future space defense capabilities.

**Current Status**: Visualization complete, military features not implemented.

---

*Last Updated: December 2024*
*Version: 1.0 (Current Implementation)*