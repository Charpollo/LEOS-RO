# RED ORBIT REALISM REQUIREMENTS

## CRITICAL: Physics Realism is Non-Negotiable

Red Orbit is a **professional disaster simulation platform**. Every aspect MUST be physically accurate and realistic. This is not a game or visualization - it's a tool for understanding real space disasters.

## Core Realism Principles

1. **Physics Engine is MANDATORY**
   - Real collision detection with accurate momentum transfer
   - Proper fragmentation patterns based on impact velocity and angle
   - Conservation of momentum and energy
   - No "visual-only" demonstrations in production

2. **Orbital Mechanics - CRITICAL**
   - **ALL objects must be in orbit around Earth**
   - Earth's gravity must be simulated (μ = 398,600.4418 km³/s²)
   - Objects follow Keplerian orbits until perturbed
   - Collisions create debris that remains in orbit
   - Debris clouds expand along orbital paths, not randomly
   - Low perigee objects decay and re-enter atmosphere
   - High energy impacts can create elliptical orbits
   - Perturbations from J2, atmospheric drag (for LEO)
   - Accurate propagation using SGP4 or better
   - Real-time or accelerated time with proper scaling

3. **Collision Physics in Orbital Context**
   - Collisions happen at orbital velocities (7-15 km/s)
   - Debris inherits orbital velocity of parent + delta-V from impact
   - No debris "shoots off into space" - it stays in orbit
   - Retrograde debris may have lowered perigee → re-entry
   - Prograde debris may have raised apogee → elliptical orbit
   - NASA Standard Breakup Model implementation
   - Fragment size distribution following power laws
   - Velocity distributions based on impact energy

4. **Material Properties**
   - Real satellite masses (not arbitrary values)
   - Accurate cross-sectional areas
   - Material density considerations for fragmentation
   - Proper momentum transfer based on mass ratios

5. **Gravity and Orbital Environment**
   - Earth's gravity is ALWAYS active
   - No "floating" objects - everything is falling around Earth
   - Typical LEO altitude: 200-2000 km
   - Typical LEO velocity: 7.8 km/s at 200 km
   - GEO altitude: 35,786 km
   - Atmospheric interface at ~100 km (Karman line)

## Physics Engine Selection

### Why Ammo.js?
- **Pros**:
  - Full Bullet Physics port (industry standard)
  - Deterministic simulation
  - Continuous collision detection (CCD) for high-velocity impacts
  - Proven in aerospace applications
  - Works with Babylon.js

- **Cons**:
  - WASM can be tricky to initialize
  - Memory management needs care
  - Performance overhead for large debris fields

### Alternatives Considered:
1. **Cannon.js** - Simpler but less accurate for high-velocity impacts
2. **Oimo.js** - Fast but lacks features needed for space physics
3. **Custom Physics** - Most accurate but massive development effort
4. **Rapier** - Excellent but newer, less Babylon.js integration

### Decision: Stick with Ammo.js
Ammo.js remains the best choice for accurate space collision physics. We MUST get it working properly.

## Implementation Requirements

1. **Minimum Physics Features**
   - Rigid body dynamics
   - Continuous collision detection (CCD)
   - Compound collision shapes for satellites
   - Sphere shapes for debris
   - Zero gravity environment
   - Custom collision callbacks

2. **Accuracy Targets**
   - Position accuracy: < 1 meter
   - Velocity accuracy: < 0.1 m/s
   - Angular momentum conservation
   - Energy conservation within 1%

3. **Performance Targets**
   - 1,000 objects @ 60 FPS (minimum)
   - 10,000 objects @ 30 FPS (professional)
   - 100,000 objects @ 10 FPS (analysis mode)

## Testing Requirements

Every release MUST include:
1. Validation against known collision events (Iridium-Cosmos)
2. Comparison with STK/GMAT results
3. Energy/momentum conservation tests
4. Fragment distribution validation

## NO COMPROMISES

- **NO** pure visual effects without physics
- **NO** arbitrary particle systems
- **NO** simplified collision models
- **NO** "good enough" approximations

If the physics isn't working, we fix it. We don't work around it.

---

Last Updated: 2025-08-05
Status: MANDATORY REQUIREMENT