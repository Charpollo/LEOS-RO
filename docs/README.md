# RED ORBIT Documentation Index

## 📁 Documentation Structure

### 🔧 `/tech-docs/` - Technical Documentation
Core physics, mathematics, and implementation details.

- **ORBITAL-PHYSICS-MATHEMATICS.md** - Complete physics & math for 15,000 object simulation
- **COLLISION-CONJUNCTION-ACCURACY.md** - Conjunction analysis & collision detection accuracy
- **ASAT-TRAJECTORY-ANALYSIS.md** - ALOHA ASAT trajectory mathematics & detection
- **simulation-vs-rendering-optimization.md** - Decoupling physics from rendering strategy
- **RO-DATA.md** - Data formats and structures
- **CRTS2-HIL-SATELLITE.md** - Hardware-in-the-loop satellite integration
- **Zones-Radiation-Environment.md** - Radiation zones and environmental modeling
- **moon.md** - Lunar operations and cislunar physics

### 🚀 `/roadmap/` - Development Roadmaps
Future capabilities and integration plans.

- **havok-advanced-roadmap.md** - Havok physics engine roadmap to 50,000+ objects
- **sda-norad-integration-roadmap.md** - Space Domain Awareness & NORAD integration
- **RED-WATCH.md** - Analytics platform integration roadmap

### 💼 `/business/` - Business & Marketing
Market analysis and value propositions.

- **COMPETITIVE-ANALYSIS-2024.md** - Market position vs STK/GMAT/others
- **MARKETING-BRIEF.md** - Marketing strategy and messaging
- **RED-ORBIT-VALUE-PROPOSITION.md** - Core value propositions

---

## 🎯 Quick Reference

### Current Capabilities
- **15,000 objects** at 30-60 FPS
- **240Hz physics timestep** (4.16ms resolution)
- **< 1km conjunction accuracy**
- **All CPU physics** via Havok WASM
- **Real N-body gravity** (not approximations)

### Key Technologies
- **Havok Physics Engine** - CPU computation via WebAssembly
- **Babylon.js** - GPU rendering (visualization only)
- **Velocity Verlet** - Numerical integration
- **Spatial Hashing** - O(n) collision detection

### Performance Metrics
```
Physics (15K objects): ~8ms (Havok CPU)
Rendering (instanced): ~3ms (Babylon GPU)
Collision checks: ~2ms (CPU)
UI/Logic: ~2ms
Total: ~15ms = 66 FPS
```

---

*Use this index to navigate RED ORBIT's technical documentation.*