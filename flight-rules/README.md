# LEOS Red Orbit - Space Disaster Simulation Platform

## Overview

LEOS Red Orbit is a professional space disaster simulation platform focused on modeling catastrophic orbital events. Built as a transformation of LEOS First Orbit, it provides real-time physics-based disaster modeling for scenarios like Kessler Syndrome, with solar storms and unexpected launches planned for future releases.

## Current Features

### Core Capabilities
- **3D Earth Visualization**: Interactive globe with realistic textures and atmosphere
- **Pure Physics Engine**: Havok-powered real gravity orbital mechanics
- **15,000+ Objects**: Industry-leading scale at 30-60 FPS
- **Earth's Gravitational Field**: Accurate μ = 398,600.4418 km³/s² implementation
- **Collision Detection**: O(n log n) spatial partitioning with momentum conservation
- **Offline Operation**: Fully functional without internet connection

### Red Orbit Disaster Simulations
- **Kessler Syndrome (Active)**: 
  - Trigger cascading collision events with real physics
  - Adjustable impact velocity (1-15 km/s)
  - Real-time debris generation from collisions
  - Accurate orbital velocity calculations
  - Pure physics-based collision detection
- **Solar Storm (Coming Soon)**: Placeholder for space weather impacts
- **Unexpected Launch (Coming Soon)**: Placeholder for rogue satellite scenarios

## Technology Stack

- **3D Rendering**: Babylon.js 6.x (with aurora background effects)
- **Physics**: Havok Physics (WebAssembly via Babylon.js integration)
- **Orbital Mechanics**: Pure Newtonian physics (F = -GMm/r²) with real gravity
- **Build System**: Webpack 5
- **Server**: Python HTTP server or Node.js
- **UI Framework**: Custom navigation controller with collapsible sidebar
- **Styling**: Red theme with no external font dependencies

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Python 3.x

### Installation

```bash
# Clone the repository
git clone https://github.com/Charpollo/LEOS-RO.git
cd LEOS-RO

# Install dependencies
npm install

# Build the project
npm run build

# Start the development server
npm run dev
```

### Development Commands

```bash
# Clean build directory
npm run clean

# Build for production
npm run build:prod

# Watch mode for development
npm run watch

# Start server on custom port
./run-frontend.sh --port 3000

# Kill all server processes
./kill.sh
```

## Project Structure

```
LEOS-RO/
├── frontend/
│   ├── js/
│   │   ├── app.js                    # Main application entry
│   │   ├── navigation-controller.js  # Left sidebar navigation
│   │   ├── red-orbit/
│   │   │   ├── physics/
│   │   │   │   ├── havok-physics.js         # Main Havok physics engine
│   │   │   │   ├── havok-10k.js            # 10K+ object optimization
│   │   │   │   ├── havok-simple.js         # Simplified test version
│   │   │   │   ├── debris-manager.js       # Debris generation system
│   │   │   │   └── physics-selector.js     # Physics engine selector
│   │   │   └── ui/
│   │   │       └── collision-controls.js    # Kessler controls
│   │   ├── satellites.js            # Satellite management
│   │   ├── earth.js                 # Earth rendering
│   │   └── ui/                      # UI components
│   ├── css/
│   │   └── brand-ui.css            # Red theme styling
│   ├── assets/
│   │   ├── ammo.js                 # Local physics engine
│   │   └── *.svg                   # Icon assets
│   └── dist/                       # Built files
├── CLAUDE.md                       # AI assistant instructions
└── flight-rules/                   # This documentation
```

## User Interface

### Navigation System
- **Left Sidebar**: Collapsible navigation with icon-only mode
- **User Profile**: Kelly Johnson (Mission Commander) with dropdown panel
- **Top Header**: CyberRTS and Red Orbit branding with mission statistics
- **Loading Screen**: Aurora background with RED ORBIT branding
- **Time Controls**: Speed multiplier (0.25x to 4x) in top center

### Mission Control Dashboard
- **Objects Tracked**: Real-time count display
- **Active Debris**: Dynamic debris counter
- **Risk Level**: LOW/MEDIUM/HIGH indicator
- **System Status**: READY/MONITORING/ALERT states
- **UNCLASSIFIED Banner**: Optional classification banner that pushes content down

## Operational Scenarios

### Kessler Syndrome (Implemented)
How to trigger a cascade event:
1. Navigate to "Kessler Syndrome" in left sidebar
2. Adjust Fragment Velocity slider (1-15 km/s)
3. Set Debris Count (10-100 fragments)
4. Click "TRIGGER CASCADE" button
5. Observe debris propagation in 3D view

### Solar Storm (Planned)
Future implementation for space weather modeling

### Unexpected Launch (Planned)
Future implementation for rogue satellite scenarios

## Performance Considerations

- **Object Capacity**: 15,000+ simultaneous objects (3x industry standard)
- **Physics Engine**: Havok WASM at 240Hz timestep
- **Collision Detection**: Continuous with O(n log n) broad phase
- **Target Performance**: 30-60 FPS with 15,000 objects
- **Debris Generation**: NASA Standard Breakup Model
- **Offline Mode**: All assets loaded locally, no network latency

## Contributing

We welcome contributions! Please see our contributing guidelines in `CONTRIBUTING.md`.

## License

This project is proprietary software. See `LICENSE` for details.

## Key Improvements from First Orbit

- **Pure Physics Engine**: Complete replacement of hybrid TLE/physics system
- **Real Orbital Mechanics**: Accurate Earth gravity with μ = 398,600 km³/s²
- **Professional UI**: Clean, minimalist interface for demo presentations
- **Offline Capability**: Fully functional without internet connection
- **Red Theme**: Complete visual overhaul with red/orange color scheme
- **Simplified Navigation**: Single left sidebar replacing multiple panels
- **Performance Focus**: Optimized for real-time disaster visualization

## Current Capabilities vs Future Enhancements

### Production Ready:
- ✅ 15,000 object simulation with real physics
- ✅ Kessler Syndrome cascade modeling
- ✅ Collision detection and debris generation
- ✅ Atmospheric drag and re-entry
- ✅ Real-time telemetry data collection

### Future Enhancements:
- ⏳ J2 perturbation (Earth's oblateness)
- ⏳ Solar radiation pressure
- ⏳ Third-body effects (Moon/Sun)
- ⏳ GPU acceleration for 100,000+ objects
- ⏳ Solar Storm and Unexpected Launch scenarios

## Support

- Technical Documentation: See flight-rules/physics.md for physics details
- Realism Requirements: See flight-rules/REALISM_REQUIREMENTS.md
- Build Issues: Check webpack.config.js and package.json
- Physics Issues: Havok WASM loads automatically (~2MB)

---

**LEOS RED ORBIT** - Professional Space Disaster Simulation Platform
**Status**: Demo Ready | **Version**: 1.0.0 | **Classification**: UNCLASSIFIED