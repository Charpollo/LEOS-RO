# ALOHA Documentation
## Anti-Satellite Trajectory Visualization System

---

## 📚 Current Documentation Structure

### Core Documentation (What Exists Today)
| File | Description | Purpose |
|------|-------------|---------|
| [ALOHA-TECHNICAL-REFERENCE.md](./ALOHA-TECHNICAL-REFERENCE.md) | Complete technical documentation | Main reference for developers |
| [ALOHA-ACTUAL-SYSTEM.md](./ALOHA-ACTUAL-SYSTEM.md) | Reality check - features vs limitations | Understand what's real vs planned |
| [test_trajectories_summary.md](./test_trajectories_summary.md) | Test data documentation | Available test trajectories |

### Future Planning (`/future/`)
| File | Description | Purpose |
|------|-------------|---------|
| [military_data_requirements.md](./future/military_data_requirements.md) | Military/Space Force requirements | What to build for real operations |
| [wow_factor_features.md](./future/wow_factor_features.md) | Vision features and roadmap | Future capabilities wishlist |

---

## 🚀 Quick Start

1. **Start Here**: [ALOHA-TECHNICAL-REFERENCE.md](./ALOHA-TECHNICAL-REFERENCE.md) - Complete system documentation
2. **Reality Check**: [ALOHA-ACTUAL-SYSTEM.md](./ALOHA-ACTUAL-SYSTEM.md) - What works today
3. **Test It**: Use data files documented in [test_trajectories_summary.md](./test_trajectories_summary.md)

---

## ✅ Current Capabilities

ALOHA is a **trajectory visualization tool** that:
- Visualizes single ASAT trajectory from JSON files
- Shows launch → apogee → impact with visual markers
- Interactive targeting mode (right-click Earth twice)
- Adjustable playback speed (1x-10x)
- Integrates with RO-Engine physics
- Displays altitude, velocity, and ground track

## ❌ NOT Implemented Yet

- Multiple simultaneous ASATs
- Real sensor data integration
- Military data formats (TLE, CCSDS, etc.)
- Threat assessment algorithms
- Decision support systems
- Export/reporting capabilities
- Debris propagation physics

---

## 📊 Data Format

ALOHA currently accepts simple JSON:
```json
{
  "id": "trajectory_name",
  "epoch": "2025-01-01T12:00:00Z",
  "frame": "TEME",
  "trajectory": [
    [time_seconds, x_km, y_km, z_km],
    ...
  ]
}
```

---

## 📁 Code Structure

```
/frontend/js/aloha/
├── aloha-handler.js              # Main trajectory playback
├── aloha-translator.js           # TEME coordinate conversion
├── asat-trajectory-generator.js  # Ballistic physics (7-10 km/s)
├── asat-targeting-mode.js        # Interactive click targeting
├── asat-launch-configurator.js   # Launch parameter UI
└── aloha-config-popup.js         # Settings panel

/frontend/data/
├── aurora_asat_test.json         # Test: Colorado launch
├── russia_asat_test.json         # Test: Plesetsk launch
├── orbital_intercept_*.json      # Test: Orbital scenarios
└── traj_0.json                   # Original test (has issues)
```

---

## ⚡ Physics Notes

### Realistic ASAT Speeds
- **Actual ASATs**: 7-10 km/s maximum
- **Escape velocity**: 11.2 km/s (absolute limit)
- **Our generator**: Uses realistic ballistic model
- **NOT 46 km/s**: Previous docs had this error - it's impossible

### Known Issues
- Some orbital intercept test files show unrealistic velocities
- Ground-launched trajectories (aurora, russia) are more accurate
- `traj_0.json` starts underground (data error from provider)

---

## 🔮 Future Development

See [`/future/`](./future/) folder for:
- Military requirements and data formats
- Vision features (probability clouds, decision support, etc.)
- Roadmap for Space Force/Air Force capabilities

---

## Summary

ALOHA is currently a **visualization tool** for ASAT trajectories. It's not yet a military command system, but provides a solid foundation for future capabilities outlined in the `/future/` folder.

**For implementation details**: See [ALOHA-TECHNICAL-REFERENCE.md](./ALOHA-TECHNICAL-REFERENCE.md)

---

*Last Updated: December 2024*  
*Documentation Version: 2.0 (Cleaned & Accurate)*