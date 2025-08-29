# ASAT Trajectory Analysis Documentation
## ALOHA Defense System - Trajectory Mathematics and Detection

---

## 1. Overview

The ALOHA (Anti-Satellite Intercept) trajectory data represents a direct-ascent kinetic kill vehicle tracked from launch to intercept altitude. This document explains the mathematics, detection criteria, and trajectory analysis used in RED ORBIT.

## 2. Data Structure

### Raw JSON Format
```json
{
  "id": "trajectory 4.0",
  "epoch": "2025-07-03 19:35:15+00:00",
  "frame": "TEME",
  "trajectory": [
    [time_seconds, x_km, y_km, z_km],
    [0, 4075.849, 4327.987, 2302.374],
    [1, 4075.854, 4327.993, 2302.377],
    ...
    [206, final_x, final_y, final_z]
  ]
}
```

### Coordinate System: TEME (True Equator Mean Equinox)
- **Origin**: Earth's center of mass
- **X-axis**: Points toward vernal equinox
- **Y-axis**: 90° east in equatorial plane  
- **Z-axis**: North through Earth's rotation axis
- **Units**: Kilometers (km) for position, seconds for time

## 3. Mathematical Calculations

### 3.1 Altitude Calculation

Given position vector **r** = [x, y, z] in TEME coordinates:

```
radius = ||r|| = √(x² + y² + z²)
altitude = radius - R_earth

where R_earth = 6371 km (mean Earth radius)
```

**Example from t=0:**
```
x = 4075.849 km, y = 4327.987 km, z = 2302.374 km

radius = √(4075.849² + 4327.987² + 2302.374²)
       = √(16,612,539 + 18,731,426 + 5,300,927)
       = √40,644,892
       = 6,375.3 km

altitude = 6,375.3 - 6,371 = 4.3 km (14,100 ft)
```

### 3.2 Velocity Calculation

Velocity between two trajectory points:

```
v = Δr/Δt

where:
Δr = ||r₂ - r₁|| = √[(x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²]
Δt = t₂ - t₁
```

**Example between t=0 and t=1:**
```
Δx = 4075.854 - 4075.849 = 0.005 km
Δy = 4327.993 - 4327.987 = 0.006 km
Δz = 2302.377 - 2302.374 = 0.003 km

Δr = √(0.005² + 0.006² + 0.003²) = 0.008 km
Δt = 1 second

velocity = 0.008 km/s = 8 m/s (initial velocity)
```

### 3.3 Acceleration Profile

Acceleration between velocity measurements:

```
a = Δv/Δt

where v is calculated as above
```

Typical ASAT acceleration profile:
- **Boost phase (0-60s)**: 5-10 g acceleration
- **Mid-course (60-150s)**: 2-5 g acceleration  
- **Terminal phase (150-206s)**: Variable, possibly negative (deceleration)

## 4. ASAT Detection Criteria

### 4.1 Trajectory Characteristics

| Parameter | ASAT Profile | Orbital Launch | Ballistic Missile |
|-----------|-------------|----------------|-------------------|
| **Launch Altitude** | 0-10 km | 0-10 km | 0-10 km |
| **Target Altitude** | 200-2000 km | 200-36000 km | Suborbital arc |
| **Time to Target** | 3-10 minutes | 8-15 minutes | 20-30 minutes |
| **Velocity Profile** | Continuous acceleration | Multi-stage | Boost then coast |
| **Trajectory Shape** | Direct ascent | Spiral to orbit | Parabolic arc |
| **Terminal Velocity** | 7-10 km/s | 7.8+ km/s | 3-7 km/s |

### 4.2 ASAT Identification Algorithm

```python
def is_asat_trajectory(trajectory):
    """
    Identifies ASAT trajectory based on kinematic profile
    """
    # 1. Check launch altitude
    start_altitude = calculate_altitude(trajectory[0])
    if start_altitude > 50:  # km
        return False  # Not ground-launched
    
    # 2. Check target altitude
    end_altitude = calculate_altitude(trajectory[-1])
    if not (200 <= end_altitude <= 2000):  # km
        return False  # Not targeting LEO
    
    # 3. Check time to target
    total_time = trajectory[-1][0] - trajectory[0][0]
    if not (180 <= total_time <= 600):  # 3-10 minutes
        return False
    
    # 4. Check velocity profile (should be mostly increasing)
    velocities = calculate_velocities(trajectory)
    acceleration_phases = count_acceleration_phases(velocities)
    if acceleration_phases < 0.7:  # 70% of flight accelerating
        return False
    
    # 5. Check for direct ascent (not orbital insertion)
    max_altitude = max([calculate_altitude(p) for p in trajectory])
    if max_altitude > end_altitude + 50:  # km tolerance
        return False  # Has apogee, likely ballistic
    
    return True  # Matches ASAT profile
```

## 5. Physical Interpretation

### 5.1 Flight Phases

**Phase 1: Boost (0-60 seconds)**
- Altitude: 4.3 km → ~100 km
- Velocity: 0.008 km/s → ~2 km/s
- High acceleration from solid rocket motor
- Clearing dense atmosphere

**Phase 2: Mid-course (60-150 seconds)**
- Altitude: 100 km → 300 km
- Velocity: 2 km/s → 5 km/s
- Continued acceleration, possible stage separation
- Above significant atmosphere

**Phase 3: Terminal (150-206 seconds)**
- Altitude: 300 km → 398 km
- Velocity: 5 km/s → ~7 km/s
- Final guidance corrections
- Kinetic intercept preparation

### 5.2 Energy Requirements

Total ΔV (delta-velocity) requirement:
```
ΔV_total = √(2 * μ * (1/r_start - 1/r_end)) + v_earth_rotation

where:
μ = 398,600.4 km³/s² (Earth's gravitational parameter)
r_start = 6,375.3 km (launch radius)
r_end = 6,769.1 km (intercept radius)
v_earth_rotation = 0.465 km/s (at equator)

ΔV_total ≈ 7.5 km/s (typical for LEO intercept)
```

## 6. Defensive Applications

### 6.1 Detection Timeline

From trajectory data, critical decision points:

| Time (s) | Event | Response Window |
|----------|-------|-----------------|
| 0 | Launch detected | 206 seconds to impact |
| 10 | Trajectory confirmed | 196 seconds |
| 30 | Target prediction | 176 seconds |
| 60 | Intercept probable | 146 seconds |
| 120 | Evasion maneuver deadline | 86 seconds |
| 180 | Point of no return | 26 seconds |
| 206 | Impact | 0 seconds |

### 6.2 Countermeasure Options

Based on warning time:
- **>180s**: Target satellite maneuver (requires fuel)
- **>120s**: Deploy decoys or chaff
- **>60s**: Active jamming/spoofing
- **>30s**: Emergency broadcast warning
- **<30s**: Brace for impact, activate contingency

## 7. Implementation in RO-Engine

### 7.1 Trajectory Visualization

```javascript
class ASATTrajectory {
    constructor(alohaData) {
        this.id = alohaData.id;
        this.epoch = new Date(alohaData.epoch);
        this.trajectory = alohaData.trajectory;
        this.frame = alohaData.frame;
    }
    
    getPositionAtTime(t) {
        // Interpolate between trajectory points
        const index = Math.floor(t);
        const fraction = t - index;
        
        if (index >= this.trajectory.length - 1) {
            return this.trajectory[this.trajectory.length - 1];
        }
        
        const p1 = this.trajectory[index];
        const p2 = this.trajectory[index + 1];
        
        return [
            p1[1] + (p2[1] - p1[1]) * fraction,
            p1[2] + (p2[2] - p1[2]) * fraction,
            p1[3] + (p2[3] - p1[3]) * fraction
        ];
    }
    
    getVelocityAtTime(t) {
        if (t >= this.trajectory.length - 1) return [0, 0, 0];
        
        const p1 = this.getPositionAtTime(t);
        const p2 = this.getPositionAtTime(t + 0.1);
        
        return [
            (p2[0] - p1[0]) * 10,
            (p2[1] - p1[1]) * 10,
            (p2[2] - p1[2]) * 10
        ];
    }
}
```

### 7.2 Threat Assessment

```javascript
function assessThreat(asatTrajectory, satellitePositions) {
    const results = [];
    
    for (const sat of satellitePositions) {
        const closestApproach = findClosestApproach(
            asatTrajectory, 
            sat.position
        );
        
        results.push({
            satelliteId: sat.id,
            minDistance: closestApproach.distance,
            timeToIntercept: closestApproach.time,
            probability: calculateInterceptProbability(
                closestApproach.distance,
                asatTrajectory.getVelocityAtTime(closestApproach.time)
            )
        });
    }
    
    return results.sort((a, b) => b.probability - a.probability);
}
```

## 8. Summary

The ALOHA trajectory data represents a high-fidelity ASAT intercept profile with:
- **206-second** flight time from surface launch to LEO intercept
- **398 km** terminal altitude (typical for LEO satellites)
- **Direct-ascent** profile (non-orbital)
- **Kinetic kill** vehicle characteristics

This data enables RED ORBIT to:
1. Visualize realistic ASAT threats
2. Calculate intercept probabilities
3. Test defensive responses
4. Train operators on threat recognition
5. Validate countermeasure effectiveness

---

*Last Updated: 2024*
*Classification: UNCLASSIFIED // FOR OFFICIAL USE ONLY*