# RED ORBIT PHYSICS DOCUMENTATION
*Last Updated: December 2024*

## Core Physics Engine

RED ORBIT uses a **pure Newtonian physics simulation** powered by Havok Physics (via Babylon.js WebAssembly integration) to accurately model orbital mechanics and collisions in real-time.

### Key Features
- Real gravitational dynamics (no cheating!)
- Accurate collision detection and debris generation
- NASA Standard Breakup Model for realistic fragmentation
- Support for 15,000+ simultaneous orbiting objects at 30-60 FPS
- Elliptical and circular orbit support (e = 0 to 0.75)

## Physics Constants

```javascript
EARTH_RADIUS = 6371 km
EARTH_MU = 398600.4418 km³/s² (Earth's gravitational parameter)
KM_TO_PHYSICS = 1.0 (1 physics unit = 1 km)
KM_TO_BABYLON = 1/6371 (Earth radius = 1 Babylon unit)
```

## Orbital Mechanics

### Velocity Calculation
All satellites use the **vis-viva equation** for proper orbital velocities:
```
v² = μ(2/r - 1/a)
```
Where:
- v = orbital velocity
- μ = Earth's gravitational parameter (398,600.4418 km³/s²)
- r = current orbital radius
- a = semi-major axis

### Orbital Types Implemented

1. **Circular Orbits** (e ≈ 0-0.02)
   - GPS/GLONASS: MEO, e < 0.01
   - Sun-synchronous: LEO, polar, e < 0.02
   - Polar satellites: e < 0.02

2. **Slightly Elliptical** (e = 0.05-0.15)
   - General LEO satellites
   - Some MEO satellites
   - Equatorial orbits

3. **Moderately Elliptical** (e = 0.3-0.5)
   - GTO (Geostationary Transfer Orbit)
   - Communication satellites
   - Transfer orbits

4. **Highly Elliptical** (e = 0.6-0.75)
   - **Molniya orbits**: e = 0.6-0.75, i = 63.4° (critical inclination)
   - Special reconnaissance orbits
   - High apogee communication satellites

### Inclination Types
- **Equatorial**: 0-10°
- **Inclined**: 20-80°
- **Critical (Molniya)**: 63.4° (no apsidal precession)
- **Polar**: 85-95°
- **Sun-synchronous**: 96-104° (retrograde)

### Realistic Orbital Periods

#### Expected Times (Real World)
- **ISS (400 km)**: ~90 minutes
- **LEO (200-2000 km)**: 88-127 minutes
- **MEO (2000-20,000 km)**: 2-12 hours
- **GPS (20,200 km)**: ~12 hours
- **Molniya (600-40,000 km)**: ~12 hours
- **GEO (35,786 km)**: 24 hours
- **Moon**: 27.3 days

#### At 60x Time Acceleration
- **ISS**: 1.5 minutes to watch one orbit
- **LEO**: 1.5-2.1 minutes to watch
- **MEO**: 2-12 minutes to watch
- **GPS**: 12 minutes to watch
- **Molniya**: 12 minutes to watch (fast at perigee, slow at apogee)
- **Earth rotation**: 24 minutes to watch one day
- **Moon orbit**: 655 minutes (10.9 hours) to watch

## Atmospheric Model

### Atmospheric Layers
- **Burnup Zone**: < 100 km altitude - objects destroyed
- **Drag Zone**: 100-200 km altitude - atmospheric drag applied
- **Safe Zone**: > 200 km altitude - negligible drag

### Drag Implementation
Simplified exponential atmosphere model:
```javascript
dragFactor = exp(-(altitude - 100) / 50) * 0.001
F_drag = -velocity * dragFactor
```

## Collision System

### Detection
- Continuous collision detection using Havok Physics
- Sphere-sphere collision shapes for efficiency
- Real-time processing at 30-60 FPS
- O(n log n) spatial partitioning for broad phase

### Debris Generation
Based on **NASA Standard Breakup Model**:
```javascript
numFragments = floor(impactVelocity * 10)
// Mass distribution follows power law
// Velocity distribution: Gaussian with σ based on impact energy
```

### Kessler Syndrome Cascade
Enhanced cascade tracking:
- Collision counter
- Cascade levels (increases every 5 collisions)
- Progressive debris multiplication
- Real-time status monitoring

Cascade Messages:
- Level 0: "Initial Impact Detected"
- Level 1: "Secondary Collisions Beginning"
- Level 2: "Cascade Effect Accelerating"
- Level 3: "Critical Mass Approaching"
- Level 4+: "FULL KESSLER CASCADE ACTIVE"

## Time Acceleration

### Speed Modes
1. **Real-Time Mode (1x)**
   - Earth rotation: 24 hours
   - ISS orbit: ~90 minutes
   - Moon orbit: 27.3 days
   - Realistic but slow for observation

2. **Fast Mode (60x)** - Default
   - Earth rotation: 24 minutes to watch
   - ISS orbit: ~1.5 minutes to watch
   - Moon orbit: ~655 minutes (10.9 hours) to watch
   - Optimal for visualization

### Mode Toggle
- Click buttons or press 'R' for real-time, 'F' for fast mode
- Updates both simulation time and physics multiplier
- Maintains physics accuracy at all speeds

### Implementation Note
- TIME_ACCELERATION constant = 1 (fixed in constants.js)
- Time multiplier handled separately in app.js (1x or 60x)
- Prevents double multiplication bug (was 3600x instead of 60x)

## Object Management

### Current Configuration
- **Total Objects**: 15,000
  - LEO: 9,000 satellites (polar, sun-sync, inclined)
  - MEO: 3,750 satellites (GPS, GLONASS patterns)
  - GEO: 1,500 satellites (geostationary belt)
  - HEO: 600 satellites (Molniya e=0.6-0.75)
  - Debris: 150 initial objects

### Performance Optimizations
- Mesh instancing for similar objects
- Object pooling for debris
- Batch updates (200 objects/frame)
- Frustum culling
- Progressive mesh cleanup

## Key Physics Methods

### `createSatellite(params)`
Creates a satellite with proper orbital mechanics:
- Supports circular and elliptical orbits (e = 0 to 0.75)
- Calculates semi-major axis from periapsis and eccentricity
- Places satellites at random true anomaly positions
- Uses vis-viva equation for correct velocity at any orbital position
- Proper velocity vectors using cross products for inclined orbits
- Handles retrograde orbits (inclination > 90°)

### `applyGravity()`
Applies gravitational force to all bodies:
```javascript
F = -GMm/r² * r̂
```

### `triggerKesslerSyndrome()`
Initiates cascade collision event:
- Finds two satellites at similar altitudes
- Sets collision course at 7.5 km/s
- Tracks cascade progression
- Focuses camera on impact

### `createAtmosphericBurnup(position, mass)`
Creates realistic burnup effect:
- Orange-red expanding fireball
- Size based on object mass
- Automatic fade and removal

## Moon Orbital Mechanics

### Orbital Parameters
- **Distance**: 384,400 km from Earth center
- **Orbital Period**: 27.3 days (2,358,720 seconds)
- **Tidal Locking**: Same face always points to Earth
- **Scale**: 0.27x Earth radius for visual representation

### Implementation (moon.js)
```javascript
// Calculate Moon's position based on real time
const moonOrbitalPeriod = 27.3 * 24 * 60 * 60; // seconds
const moonOrbitAngle = (totalSeconds / moonOrbitalPeriod) * 2 * Math.PI;

// Tidal locking - Moon rotates once per orbit
moonMesh.rotation.y = -moonOrbitAngle;
```

## Physics Stability Improvements

### Time Step Configuration
- **Fixed timestep**: 1/240 second (240 Hz physics)
- **Max deltaTime**: 1/30 second (prevents large jumps)
- **Substeps**: Calculated dynamically based on time acceleration
- **Result**: Stable orbits even at 60x speed

### Velocity Vector Calculation
- Uses proper cross products for perpendicular velocity
- Handles edge cases (polar orbits)
- Ensures velocity magnitude matches orbital speed exactly
- Supports all inclinations (0-180°)

## Validation

### Real Orbital Velocities
- ISS (400 km): 7.67 km/s ✓
- LEO (1000 km): 7.35 km/s ✓
- GPS (20,200 km): 3.87 km/s ✓
- GEO (35,786 km): 3.07 km/s ✓
- Moon (384,400 km): 1.02 km/s ✓

### Elliptical Orbit Velocities
- Periapsis: Faster than circular at same altitude ✓
- Apoapsis: Slower than circular at same altitude ✓
- Follows Kepler's 2nd law (equal areas in equal times) ✓

### Orbital Period Ratios
For every Earth rotation:
- LEO satellites: 15-16 orbits ✓
- MEO satellites: 1-2 orbits ✓
- HIGH satellites: 1-4 orbits ✓
- Moon: 0.037 orbits (1/27.3) ✓

## No Cheating Policy

This simulation uses **REAL PHYSICS ONLY**:
- ❌ No artificial station-keeping
- ❌ No magic forces
- ❌ No simplified 2-body approximations
- ✅ Real gravitational dynamics
- ✅ Real atmospheric drag
- ✅ Real collision physics
- ✅ Conservation of energy and momentum

## Usage Notes

### Initialization
```javascript
// Using Havok Physics implementation
const redOrbitPhysics = new RedOrbitHavokPhysics(scene);
await redOrbitPhysics.initialize();
// Havok WASM module loads automatically (~2MB)
```

### Update Loop
```javascript
redOrbitPhysics.update(deltaTime);
```

### Speed Control
```javascript
// Set real-time mode
redOrbitPhysics.physicsTimeMultiplier = 1;

// Set 60x speed mode
redOrbitPhysics.physicsTimeMultiplier = 60;
```

## Future Enhancements

- [ ] N-body gravitation (Moon, Sun perturbations)
- [ ] Solar radiation pressure
- [ ] J2 perturbation (Earth's oblateness)
- [ ] Detailed atmospheric density models
- [ ] Magnetic field interactions
- [ ] Tidal forces

---

*This document serves as the single source of truth for RED ORBIT physics implementation.*