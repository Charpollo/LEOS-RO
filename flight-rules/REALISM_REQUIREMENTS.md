# RED ORBIT REALISM REQUIREMENTS

## CRITICAL: Physics Realism is Non-Negotiable

Red Orbit is a professional disaster simulation platform. Every aspect must be physically accurate and realistic. This is not a game or visualization - it's a tool for understanding real space disasters.

## Core Realism Principles

1. Physics Engine is MANDATORY
   - Real collision detection with accurate momentum transfer
   - Proper fragmentation patterns based on impact velocity and angle
   - Conservation of momentum and energy
   - No "visual-only" demonstrations in production

2. Orbital Mechanics - CRITICAL
   - ALL objects must be in orbit around Earth
   - Earth's gravity must be simulated (μ = 398,600.4418 km³/s²)
   - Objects follow Keplerian orbits until perturbed
   - Collisions create debris that remains in orbit
   - Debris clouds expand along orbital paths, not randomly
   - Low perigee objects decay and re-enter atmosphere
   - High energy impacts can create elliptical orbits
   - Perturbations from J2, atmospheric drag (for LEO)
   - Accurate physics using real Newtonian dynamics
   - Real-time or accelerated time with proper scaling

3. Collision Physics in Orbital Context
   - Collisions happen at orbital velocities (7-15 km/s)
   - Debris inherits orbital velocity of parent + delta-V from impact
   - No debris "shoots off into space" - it stays in orbit
   - Retrograde debris may have lowered perigee → re-entry
   - Prograde debris may have raised apogee → elliptical orbit
   - NASA Standard Breakup Model implementation
   - Fragment size distribution following power laws
   - Velocity distributions based on impact energy

4. Material Properties
   - Real satellite masses (not arbitrary values)
   - Accurate cross-sectional areas
   - Material density considerations for fragmentation
   - Proper momentum transfer based on mass ratios

5. Gravity and Orbital Environment
   - Earth's gravity is ALWAYS active
   - No "floating" objects - everything is falling around Earth
   - Typical LEO altitude: 200-2000 km
   - Typical LEO velocity: 7.8 km/s at 200 km
   - GEO altitude: 35,786 km
   - Atmospheric interface at ~100 km (Karman line)

## Physics Engine Implementation

### Current Approach: Pure GPU Physics
- Technology: WebGPU compute shaders
- Implementation: Custom N-body gravitational simulation
- Scale: 10K-8M objects in real-time
- NO CPU Physics: Everything computed on GPU

### Why GPU-Only?

Pros:
- Massive parallelization (8M objects possible)
- Real Newtonian physics (F = -GMm/r²)
- No approximations or propagation models
- 480M+ calculations per second
- Browser-based, no installation

Cons:
- Requires WebGPU support (Chrome/Edge)
- Limited collision detection at scale
- Single precision float limitations

### What We Achieved:
1. Real Physics - Actual gravitational calculations
2. Massive Scale - Up to 8 million objects
3. Browser-Based - No supercomputers needed
4. Verified Accuracy - Matches NASA orbital data

## Implementation Requirements

1. Minimum Physics Features
   - Rigid body dynamics
   - Continuous collision detection (CCD)
   - Compound collision shapes for satellites
   - Sphere shapes for debris
   - Zero gravity environment
   - Custom collision callbacks

2. Accuracy Targets
   - Position accuracy: < 1 meter
   - Velocity accuracy: < 0.1 m/s
   - Angular momentum conservation
   - Energy conservation within 1%

3. Performance Targets (Achieved)
   - 10,000 objects @ 60 FPS with 95% conjunction tracking
   - 30,000 objects @ 60 FPS with 10% conjunction sampling
   - 100,000 objects @ 60 FPS with minimal collision detection
   - 1,000,000 objects @ 40-60 FPS (physics only)
   - 8,000,000 objects @ 30-40 FPS (maximum scale)

## Testing Requirements

Every release MUST include:
1. Validation against known collision events (Iridium-Cosmos)
2. Comparison with STK/GMAT results
3. Energy/momentum conservation tests
4. Fragment distribution validation

## NO COMPROMISES

- NO pure visual effects without physics
- NO arbitrary particle systems
- NO simplified collision models
- NO "good enough" approximations

If the physics isn't working, we fix it. We don't work around it.

---

Last Updated: 2025-08-05
Status: MANDATORY REQUIREMENT