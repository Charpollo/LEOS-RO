# RED ORBIT FLIGHT RULES

## MISSION CRITICAL: This Document Governs All Development

**RED ORBIT** is a professional real-time physics simulation platform for space operations. These flight rules are **NON-NEGOTIABLE**.

---

## 🚨 RULE #1: PHYSICS REALISM IS SACRED

### No Compromises, Ever
- **NEVER** compromise physics accuracy for performance
- **NEVER** use fake or approximated orbital mechanics  
- **NEVER** implement "visual-only" effects without physics
- **ALWAYS** use real gravitational constants (μ = 398,600.4418 km³/s²)
- **ALWAYS** validate against real-world data (TLE, NORAD, STK, GMAT)

### Real Physics or Nothing
```javascript
// This is MANDATORY - no shortcuts
const EARTH_MU = 398600.4418;      // km³/s² (WGS84)
const EARTH_RADIUS = 6371.0;       // km
const J2 = 0.00108263;              // Earth's oblateness
const LIGHT_SPEED = 299792.458;    // km/s
```

---

## 📏 RULE #2: CODE MODULARIZATION IS MANDATORY

### The 1000-Line Law
- **NO FILE** shall exceed 1000 lines of code
- **NO EXCEPTIONS** - not for "just this feature"
- **NO ADDITIONS** to files already over 1000 lines
- **ALWAYS** modularize before reaching 900 lines

### Files That MUST NOT Be Extended:
```
FORBIDDEN FILES - DO NOT ADD CODE:
- app.js (3,280 lines) → Create new modules
- gpu-physics-engine.js (1,529 lines) → Create physics extensions
- navigation-controller.js (1,238 lines) → Add new UI in separate controllers
- satellites.js (1,195 lines) → Use satellite-extensions.js

DEAD CODE TO REMOVE:
- sda-visualization.js (3,003 lines) → NOT USED, should be deleted
```

### Modular Architecture Pattern:
```javascript
// WRONG - Adding to bloated file
// app.js (already 3000+ lines)
function newFeature() {
    // 200 more lines added...
}

// CORRECT - New module
// features/new-feature.js (new file)
export class NewFeature {
    constructor() { /* implementation */ }
}

// app.js - just import
import { NewFeature } from './features/new-feature.js';
```

### Check Before Every Commit:
```bash
# Find files over 1000 lines
find frontend/js -name "*.js" -exec wc -l {} \; | sort -rn | head -20

# Any file approaching 900 lines = REFACTOR NOW
```

---

## 🎯 RULE #3: ORBITAL MECHANICS ACCURACY

### Everything Is In Orbit
- **ALL** objects must be in orbit around Earth
- **NO** floating objects - everything is falling around Earth
- Objects follow **Keplerian orbits** until perturbed
- Collisions happen at **orbital velocities** (7-15 km/s)
- Debris **inherits orbital velocity** + delta-V from impact

### Orbital Zones (REAL):
- **LEO**: 200-2,000 km (7.8 km/s @ 200km)
- **MEO**: 2,000-35,786 km
- **GEO**: 35,786 km ± 200 km
- **Atmospheric Interface**: ~100 km (Kármán line)

### Debris Behavior:
- Retrograde impacts → lowered perigee → atmospheric re-entry
- Prograde impacts → raised apogee → elliptical orbit
- **NASA Standard Breakup Model** for fragmentation
- Power law distribution for fragment sizes
- **No debris "shoots off into space"** - it stays in orbit

---

## 💻 RULE #4: GPU PHYSICS ARCHITECTURE

### Pure GPU Implementation
- **Technology**: WebGPU compute shaders ONLY
- **Scale**: 10K to 8M objects in real-time
- **NO CPU PHYSICS** - Everything on GPU
- **480M+ calculations per second**

### Performance Requirements:
```
MINIMUM ACCEPTABLE PERFORMANCE:
- 10,000 objects @ 60 FPS (95% conjunction tracking)
- 100,000 objects @ 60 FPS (minimal collision detection)
- 1,000,000 objects @ 40-60 FPS (physics only)
- 8,000,000 objects @ 30-40 FPS (maximum scale)
```

### GPU Compute Pattern:
```wgsl
// WebGPU Compute Shader - REQUIRED PATTERN
@compute @workgroup_size(256)
fn update_orbits(@builtin(global_invocation_id) id: vec3<u32>) {
    // Real Newtonian physics: F = -GMm/r²
    // NO approximations, NO propagation models
}
```

---

## ✅ RULE #5: TESTING & VALIDATION

### Every Release MUST:
1. **Validate** against Iridium-Cosmos collision (2009)
2. **Compare** with STK/GMAT results
3. **Verify** energy/momentum conservation (< 1% error)
4. **Test** fragment distribution against NASA models
5. **Benchmark** GPU performance at all scales

### Accuracy Requirements:
- Position accuracy: **< 1 meter**
- Velocity accuracy: **< 0.1 m/s**
- Angular momentum: **conserved**
- Energy conservation: **within 1%**

---

## 🚫 RULE #6: WHAT WE NEVER DO

### Absolute Prohibitions:
- ❌ **NO** fake orbital mechanics for "gameplay"
- ❌ **NO** reducing object counts for performance
- ❌ **NO** skipping collision checks for distant objects
- ❌ **NO** sprites or billboards for debris
- ❌ **NO** "good enough" approximations
- ❌ **NO** pure visual effects without physics
- ❌ **NO** arbitrary particle systems
- ❌ **NO** simplified collision models

### If It's Not Real, It Doesn't Ship

---

## ⚡ RULE #7: KESSLER SYNDROME ACCURACY

### This Is Why We Exist
- Kessler Syndrome must be **demonstrable and terrifying**
- Every collision creates **real debris fields**
- Debris **persists and affects future orbits**
- Cascade events must match **real physics**
- **Hypervelocity impacts** (7-15 km/s typical)

### Collision Energy:
```javascript
// Kinetic energy at orbital velocity
// 1kg at 7.8 km/s = 30.4 MJ (equivalent to 7.3 kg of TNT)
// This is NOT a game - these are real energies
```

---

## 🏗️ RULE #8: CODE ORGANIZATION

### Directory Structure:
```
frontend/js/
├── core/           # Core systems (<1000 lines each)
├── physics/        # Physics modules (<1000 lines each)
├── ui/            # UI components (<1000 lines each)
├── features/      # Feature modules (<1000 lines each)
└── extensions/    # Extensions to large files
```

### Import Pattern:
```javascript
// Core functionality
import { PhysicsEngine } from './physics/engine.js';
import { OrbitalMechanics } from './physics/orbital.js';

// Extensions for legacy code
import { AppExtensions } from './extensions/app-ext.js';
import { SatelliteExtensions } from './extensions/sat-ext.js';

// New features in separate modules
import { KesslerAnalysis } from './features/kessler.js';
```

---

## 📊 RULE #9: PROFESSIONAL STANDARDS

### Code Quality:
- **Mission-critical** quality code
- **Aerospace professional** UI/UX
- **Scientifically accurate** data
- **Comprehensive** documentation
- **Type-safe** where possible
- **Tested** at every scale

### Comments & Documentation:
```javascript
/**
 * Calculate orbital position using real Kepler's equations
 * @param {number} a - Semi-major axis (km)
 * @param {number} e - Eccentricity (0-1)
 * @param {number} M - Mean anomaly (radians)
 * @returns {Vector3} Position in ECI coordinates
 * 
 * CRITICAL: This uses Newton-Raphson iteration for eccentric anomaly
 * DO NOT replace with approximations
 */
```

---

## 🚀 RULE #10: PERFORMANCE OPTIMIZATION

### Optimization Priority:
1. **Physics accuracy** - NEVER compromise
2. **GPU efficiency** - Optimize shaders first
3. **Memory usage** - Stream, don't store
4. **Visualization** - Reduce before physics
5. **UI updates** - Throttle, don't skip

### When Performance Degrades:
```javascript
// WRONG
if (objectCount > 1000000) {
    skipPhysics = true;  // NEVER DO THIS
}

// CORRECT
if (objectCount > 1000000) {
    reduceVisualDetail();     // Reduce rendering
    optimizeGPUWorkgroups();  // Optimize compute
    // Physics continues at full accuracy
}
```

---

## 🔴 EMERGENCY PROCEDURES

### Collision Cascade Event:
1. **TRACK** all fragments immediately
2. **PROPAGATE** new orbits in parallel
3. **UPDATE** collision detection in real-time
4. **ALERT** user to cascade severity
5. **NEVER** drop fragments to maintain performance

### Memory Overflow:
1. **PRIORITIZE** active collision zones
2. **COMPRESS** distant object data
3. **STREAM** to system RAM if needed
4. **NEVER** delete tracked objects

---

## 📋 MISSION SUCCESS CRITERIA

### Minimum Viable Simulation:
- [ ] 8M objects tracked simultaneously
- [ ] Real-time collision detection
- [ ] Accurate orbital propagation
- [ ] Kessler Syndrome demonstration
- [ ] Professional visualization
- [ ] All files under 1000 lines

### Excellence Standards:
- [ ] 10M+ objects capability
- [ ] Sub-frame collision precision
- [ ] Multi-body perturbations (J2, J3, J4)
- [ ] Atmospheric drag modeling
- [ ] Solar radiation pressure
- [ ] Third-body effects (Moon, Sun)

---

## 🎖️ CHAIN OF COMMAND

### Decision Priority:
1. **Physics Accuracy** → Non-negotiable
2. **Code Modularity** → Mandatory under 1000 lines
3. **Performance** → Optimize without compromise
4. **Features** → Only if physics maintained
5. **UI/UX** → Professional aerospace standard

### Review Requirements:
- Physics changes → **Full validation required**
- Files over 900 lines → **Immediate refactor**
- GPU kernels → **Performance testing mandatory**
- Collision system → **Real event comparison**

---

## 💡 FINAL WORD

**This is not a game. This is not a visualization.**

This is a **REAL PHYSICS SIMULATION PLATFORM** for space operations.

We simulate:
- Orbital mechanics with unprecedented accuracy
- Satellite constellations and their interactions
- Space debris evolution and propagation
- Collision cascades and Kessler Syndrome
- Mission planning and trajectory analysis
- Real-time space situational awareness

Every shortcut in physics could miss a critical event.
Every bloated file makes the system harder to validate.
Every compromise reduces our credibility.

**We build this system as if lives depend on it - because they do.**

---

## 📚 APPENDIX: Key Implementations

### Modular File Template:
```javascript
/**
 * filename.js - [Purpose]
 * Part of RED ORBIT Flight Software
 * 
 * CRITICAL: This file must remain under 1000 lines
 * Current lines: XXX / 1000
 */

export class ModuleName {
    // Implementation
}

// Check at bottom of file
console.assert(
    new Error().stack.split('\n').length < 1000,
    'FILE EXCEEDS 1000 LINES - REFACTOR IMMEDIATELY'
);
```

### Real Physics Constants:
```javascript
// These values are MANDATORY - no modifications
export const PHYSICS_CONSTANTS = {
    EARTH_MU: 398600.4418,        // km³/s² (WGS84)
    EARTH_RADIUS: 6371.0,         // km (mean)
    EARTH_J2: 0.00108263,         // Oblateness
    EARTH_ROTATION: 7.2921150e-5, // rad/s
    
    // Atmospheric model
    KARMAN_LINE: 100.0,           // km
    ATMOSPHERIC_DENSITY_SEA: 1.225, // kg/m³
    
    // Never change these
    GRAVITATIONAL_CONSTANT: 6.67430e-11, // m³/kg⋅s²
    SPEED_OF_LIGHT: 299792.458,   // km/s
};
```

---

**Remember**: In space, there are no small mistakes - only future disasters.

**Last Updated**: 2025-08-15
**Status**: MANDATORY FLIGHT RULES
**Enforcement**: IMMEDIATE