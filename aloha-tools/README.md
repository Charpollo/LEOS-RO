# ALOHA Tools - ASAT Trajectory Generation & Analysis

This directory contains Python scripts for generating and analyzing ASAT (Anti-Satellite) trajectories for the ALOHA system.

## Scripts Overview

### 1. `generate_asat_trajectories.py`
**Purpose:** Creates realistic ASAT trajectory data with proper physics
**Reusable:** YES - Main trajectory generator

```python
# Example usage - create a new ASAT trajectory:
trajectory = generate_asat_trajectory(
    launch_lat=39.7294,    # Launch latitude
    launch_lon=-104.8319,  # Launch longitude  
    target_lat=35.0,       # Target latitude
    target_lon=-140.0,     # Target longitude
    target_alt_km=400,     # Target altitude in km
    duration_s=420         # Flight duration in seconds
)
```

**Features:**
- Realistic 3-phase flight profile (boost, midcourse, terminal)
- Proper ballistic physics (3-5 km/s velocities)
- Great circle path calculation
- TEME coordinate output for Babylon.js compatibility

### 2. `analyze_aloha.py`
**Purpose:** Analyzes existing trajectory data to check for physics realism
**Reusable:** YES - Can analyze any trajectory JSON

```bash
# Usage:
python3 analyze_aloha.py

# Modify line 5 to analyze different files:
with open('/path/to/your/trajectory.json', 'r') as f:
```

**Output:**
- Velocity analysis between points
- Altitude tracking
- Detection of unrealistic physics (e.g., speeds > 100 km/s)

### 3. `convert_aloha.py`
**Purpose:** Converts TEME coordinates to lat/lon for geographic understanding
**Reusable:** YES - Universal TEME to lat/lon converter

```python
# Example usage:
lat, lon, alt, r = teme_to_latlon(x_km, y_km, z_km)
```

### 4. `convert_coords.py`
**Purpose:** Bi-directional conversion between lat/lon and TEME
**Reusable:** YES - General coordinate conversion utility

```python
# Lat/Lon to TEME:
x, y, z = latlon_to_teme(lat_deg, lon_deg, alt_km)

# TEME to Lat/Lon:
lat, lon, alt = teme_to_latlon(x_km, y_km, z_km)
```

## How to Create New ASAT Trajectories

1. **Edit `generate_asat_trajectories.py`**
2. **Add your new trajectory:**

```python
# Example: Create China ASAT trajectory
china_trajectory = generate_asat_trajectory(
    launch_lat=41.1445,    # Jiuquan Launch Center
    launch_lon=100.1314,
    target_lat=30.0,        # Target over Pacific
    target_lon=150.0,
    target_alt_km=500,      # Target altitude
    duration_s=360          # 6 minute flight
)

# Save to JSON
china_data = {
    "id": "China ASAT",
    "name": "DN-3 Interceptor",
    "launch_site": "Jiuquan, China",
    "target": "LEO Satellite at 500km",
    "epoch": "2025-01-01T00:00:00Z",
    "frame": "TEME",
    "trajectory": china_trajectory
}

with open('../frontend/data/china_asat.json', 'w') as f:
    json.dump(china_data, f, indent=2)
```

3. **Run the script:**
```bash
cd /Users/missioncontrol/LEOS-RO/aloha-tools
python3 generate_asat_trajectories.py
```

4. **Add to UI** (in `frontend/js/red-orbit/engineering-panel.js`):
```javascript
const trajectoryFiles = {
    'aloha': '/data/aloha.json',
    'colorado_asat': '/data/colorado_asat.json',
    'russia_asat': '/data/russia_asat.json',
    'china_asat': '/data/china_asat.json'  // Add new trajectory
};
```

## Physics Parameters

The trajectory generator uses realistic ASAT physics:

- **Boost Phase (0-60s):** Rapid acceleration to 3 km/s
- **Midcourse (60-360s):** Ballistic arc, peak altitude ~400km  
- **Terminal (360-420s):** Final approach and acceleration to impact
- **Max Velocity:** 3-5 km/s (realistic for kinetic interceptors)
- **Typical Duration:** 6-7 minutes
- **Altitude Range:** 0-450km (LEO intercept profile)

## Quick Commands

```bash
# Generate new trajectories
python3 generate_asat_trajectories.py

# Analyze trajectory physics
python3 analyze_aloha.py

# Convert coordinates
python3 convert_coords.py

# Start local server (if needed)
python3 server.py
```

## Trajectory Data Format

All trajectories use this format:
```json
{
    "id": "Unique ID",
    "name": "Display Name",
    "launch_site": "Location Name",
    "target": "Target Description",
    "epoch": "2025-01-01T00:00:00Z",
    "frame": "TEME",
    "trajectory": [
        [time_s, x_km, y_km, z_km],
        ...
    ]
}
```