# ALOHA System - What It Actually Does Today

## Current Implementation Status

### ✅ What ALOHA Actually Does

#### 1. Trajectory Visualization
- **Loads trajectory data** from JSON files (TEME coordinates)
- **Displays ASAT vehicle** as red glowing triangle mesh
- **Shows trajectory path** (red/orange line from launch to impact)
- **Shows ground track** (yellow line projected on Earth)
- **Dynamic trail mode** (toggle with 'M' key - full path or trailing)

#### 2. Visual Markers
- **Launch marker**: Orange sphere at launch site
- **Impact marker**: Red debris cloud at impact point  
- **Apogee marker**: White sphere at highest altitude
- **Labels**: Shows location names and coordinates

#### 3. Interactive Features
- **Custom targeting mode**: Right-click to select launch/target points
- **Launch configurator**: UI panel to adjust altitude/flight time
- **Saved scenarios**: Store/load trajectories in localStorage
- **Playback speed control**: 1x, 2x, 5x, 10x speed

#### 4. Physics Calculations
- **Trajectory generator**: Creates ballistic paths (client-side JavaScript)
- **Great circle paths**: Calculates shortest distance between points
- **Altitude tracking**: Shows current altitude during flight
- **Velocity display**: Shows speed in km/s

#### 5. Integration with RO-Engine
- **Conjunction detection**: Uses RO-Engine's existing system
- **Time synchronization**: Uses global simulation time
- **Camera tracking**: Can follow ASAT during flight
- **Occlusion handling**: Hides labels behind Earth

### ❌ What ALOHA Does NOT Do (Yet)

#### Not Implemented
- Multiple simultaneous ASATs
- Real sensor data ingestion
- Military data formats (CCSDS OMM, etc.)
- Threat assessment calculations
- Debris field propagation physics
- Automated evasion recommendations
- Intelligence fusion
- Attribution analysis
- Export to PowerPoint
- Mobile/tablet interface
- Classification handling
- Real-time sensor feeds

#### Not Accurate
- No actual military integration
- No Space Force data formats
- No decision timelines
- No ROE checking
- No coalition sharing
- No SBIRS/radar feeds

---

## Actual File Structure

```
/frontend/js/aloha/
├── aloha-handler.js              # Main trajectory player
├── aloha-translator.js           # TEME to Babylon conversion
├── asat-trajectory-generator.js  # Ballistic trajectory math
├── asat-targeting-mode.js        # Interactive click-to-target
├── asat-launch-configurator.js   # UI for launch parameters
└── aloha-config-popup.js         # Settings panel
```

---

## Actual Data Format

### What It Accepts
```json
{
  "id": "trajectory_name",
  "epoch": "2025-01-01T12:00:00Z",
  "frame": "TEME",
  "trajectory": [
    [time_seconds, x_km, y_km, z_km],
    [0, 3252.3, -3713.3, -4025.7],
    [1, 3252.5, -3713.5, -4025.9]
  ]
}
```

### What It Does NOT Accept
- TLEs
- CCSDS formats
- Military message formats
- Real-time sensor feeds
- Classified data

---

## Actual Controls

| Key | Function |
|-----|----------|
| M | Toggle trail mode (full/dynamic) |
| Space | Pause/resume |
| 1-4 | Playback speed |

### Mouse
- Right-click Earth: Select launch/target (in custom mode)
- Left-drag: Rotate camera
- Scroll: Zoom

---

## Actual Performance

- Handles single ASAT trajectory
- 207 points typical
- 60 FPS maintained
- ~15MB memory usage
- Works in Chrome/Edge/Firefox

---

## Test Data That Works

Located in `/frontend/data/`:
- `traj_0.json` - Sample trajectory (has issues)
- `aurora_asat_test.json` - Generated test
- `russia_asat_test.json` - Generated test
- `orbital_intercept_1_test.json` - Generated test
- `orbital_intercept_2_test.json` - Generated test

---

## What The Docs Should Say

### KEEP These Docs
1. **Technical implementation** - How the code works
2. **Trajectory generator** - Math for ballistic paths
3. **Test data guide** - What test files exist

### REMOVE These Claims
1. Military integration features
2. Real-time sensor feeds
3. Decision support systems
4. Intelligence fusion
5. Attribution capabilities
6. Export to briefings
7. Multi-domain correlation
8. 46 km/s speeds (physically impossible)

### CORRECT These Items
1. **Speeds**: Real ASATs go 7-10 km/s max, not 46
2. **Data formats**: Only accepts simple JSON, not military formats
3. **Features**: It's a visualization tool, not a command system

---

## Summary

ALOHA is currently a **trajectory visualization tool** that:
- Shows ASAT paths from launch to impact
- Allows interactive trajectory creation
- Integrates with RO-Engine's physics

It is NOT (yet):
- A military command system
- Connected to real sensors
- Capable of threat assessment
- Able to recommend responses

The documentation should reflect what exists TODAY, not aspirational features.