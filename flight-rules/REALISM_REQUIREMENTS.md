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
   - Earth's gravity must be simulated (μ = 398,600.4418 km³/s²) ✓ IMPLEMENTED
   - Objects follow Keplerian orbits until perturbed ✓ IMPLEMENTED
   - Collisions create debris that remains in orbit ✓ IMPLEMENTED
   - Debris clouds expand along orbital paths, not randomly ✓ IMPLEMENTED
   - Low perigee objects decay and re-enter atmosphere ✓ IMPLEMENTED
   - High energy impacts can create elliptical orbits ✓ IMPLEMENTED
   - Atmospheric drag for LEO (exponential model) ✓ IMPLEMENTED
   - Perturbations (J2, solar pressure) - FUTURE ENHANCEMENT
   - Real-time or accelerated time with proper scaling ✓ IMPLEMENTED (1x-60x)

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

### Current Implementation: Havok Physics
- **Pros**:
  - Industry-leading physics engine (used in AAA games and simulations)
  - WebAssembly integration via Babylon.js
  - Excellent performance (15,000+ objects at 30-60 FPS)
  - Continuous collision detection (CCD) for high-velocity impacts
  - Native JavaScript bindings
  - Spatial partitioning for O(n log n) broad phase
  - Proven stable with orbital mechanics

- **Performance Achieved**:
  - 15,000 objects @ 30-60 FPS (current production)
  - 240Hz physics timestep for numerical stability
  - Real Newtonian gravity (F = -GMm/r²)
  - NASA Standard Breakup Model for debris

### Migration Path (Completed):
1. **Ammo.js** (original) → Issues with WASM initialization
2. **Havok Physics** (current) → Successfully integrated and production-ready
3. **Future GPU acceleration** → WebGPU for 100,000+ objects

### Decision: Havok Physics is Production Ready
Havok provides the accuracy, performance, and stability needed for professional space collision simulation.

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
   - 1,000 objects @ 60 FPS ✓ ACHIEVED
   - 10,000 objects @ 30 FPS ✓ ACHIEVED  
   - 15,000 objects @ 30-60 FPS ✓ CURRENT PRODUCTION
   - 100,000 objects @ 10 FPS (future with GPU acceleration)

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

Last Updated: December 2024
Status: MANDATORY REQUIREMENT - FULLY IMPLEMENTED