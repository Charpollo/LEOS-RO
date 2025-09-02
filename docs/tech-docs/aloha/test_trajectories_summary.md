# Test Trajectories for ALOHA System

## Created Test Data Files

We've successfully created four test trajectory files that match the format expected by our ALOHA system:

### 1. Ground-Launched ASATs

#### aurora_asat_test.json
- **Launch Site:** Aurora, Colorado (39.7°N, 104.8°W)
- **Target:** Northern US satellite at 600km altitude
- **Duration:** 420 seconds (7 minutes)
- **Type:** Ballistic ground-to-space intercept
- **File Size:** 42KB

#### russia_asat_test.json
- **Launch Site:** Plesetsk Cosmodrome, Russia (62.9°N, 40.6°E)
- **Target:** Arctic satellite at 800km altitude
- **Duration:** 480 seconds (8 minutes)
- **Type:** Ballistic ground-to-space intercept
- **File Size:** 48KB

### 2. Orbital Intercepts

#### orbital_intercept_1_test.json
- **Start:** LEO at 400km (Equator)
- **Target:** LEO at 450km (25°N, 45°E)
- **Duration:** 180 seconds (3 minutes)
- **Type:** Orbital-to-orbital intercept
- **File Size:** 18KB

#### orbital_intercept_2_test.json
- **Start:** MEO at 600km (15°S, 60°W)
- **Target:** MEO at 800km (30°N, 120°E)
- **Duration:** 240 seconds (4 minutes)
- **Type:** Orbital-to-orbital intercept
- **File Size:** 24KB

## Data Format

All files follow the same JSON structure expected by ALOHA:

```json
{
  "id": "unique_identifier",
  "name": "Human readable name",
  "epoch": "ISO 8601 timestamp",
  "frame": "TEME",
  "launch_site": "Location description",
  "target_info": "Target description",
  "trajectory": [
    [time_seconds, x_km, y_km, z_km],
    ...
  ]
}
```

## How to Use

These files are ready to be loaded into the ALOHA system. They can be:
1. Loaded directly through the ALOHA configuration interface
2. Used as test data for trajectory visualization
3. Referenced as examples of proper data formatting

## Validation Notes

- Ground-launched ASATs use the existing `ASATTrajectoryGenerator` class
- Follows realistic ballistic physics for boost, midcourse, and terminal phases
- Orbital intercepts use simplified Hohmann transfer approximations
- All trajectories use TEME coordinate frame as expected by the system

## Files Location

All test trajectory files are saved in:
`/Users/missioncontrol/LEOS-RO/frontend/data/`

These test files provide perfect examples of what our ALOHA system expects for trajectory ingestion.