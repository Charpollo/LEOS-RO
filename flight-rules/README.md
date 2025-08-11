# RED ORBIT - Space Disaster Simulation Platform

## Overview

RED ORBIT is the world's most advanced space debris visualization platform, capable of simulating up to 9 million objects with real Newtonian physics. Unlike traditional tools that use propagation models (SGP4), RED ORBIT computes actual gravitational forces for every object in real-time using GPU acceleration via WebGPU.

## Current Features

### Core Capabilities
- **9 Million Objects**: Unprecedented scale with real physics (not propagation)
- **GPU Physics Engine**: WebGPU compute shaders processing 540M calculations/second
- **Real Newtonian Dynamics**: F = -GMm/r² for every object, no shortcuts
- **Browser-Based**: No installation required, runs entirely in modern browsers
- **Default 1M Objects**: Starts with 1 million objects at 60 FPS

### Disaster Simulations & Analysis
- **Kessler Syndrome**: 
  - GPU-accelerated cascade modeling
  - NASA Standard Breakup Model
  - Real-time debris generation and tracking
  - Multiple trigger scenarios (collision, ASAT, etc.)
  
- **Conjunction Analysis**:
  - Real-time collision probability calculations
  - Interactive conjunction panel (bottom-right)
  - Clickable events with detailed data
  - Historical tracking and export
  
- **Megaconstellation Scenarios**:
  - Starlink (42,000 satellites)
  - Project Kuiper (3,236 satellites)
  - Chinese Guowang (13,000 satellites)
  - Combined deployment simulations

## Technology Stack

- **3D Rendering**: Babylon.js with WebGPU support
- **Physics Engine**: Custom GPU compute shaders (no CPU physics)
- **Computation**: WebGPU parallel processing
- **Scale**: 1-9 million objects in real-time
- **Build System**: Webpack with ES6 modules
- **UI Framework**: Engineering control panel (Press 'O')
- **Data Export**: JSON telemetry, conjunction history

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
│   │   │   │   ├── red-orbit-physics.js     # PURE physics engine
│   │   │   │   ├── hybrid-orbital-system.js  # (deprecated - replaced)
│   │   │   │   ├── orbital-physics.js        # Ammo.js wrapper
│   │   │   │   └── ammo-loader.js           # Local Ammo.js loader
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

## Performance Metrics

- **1 Million Objects**: 60 FPS (default configuration)
- **9 Million Objects**: 30+ FPS (maximum tested)
- **GPU Utilization**: 256 thread workgroups
- **Calculations**: 540 million force calculations/second at 1M objects
- **Conjunction Analysis**: Real-time scanning of all object pairs
- **Memory**: Efficient GPU buffer management
- **Browser Support**: Chrome/Edge with WebGPU enabled

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

## Engineering Controls

Press **'O'** to open the engineering panel:
- **Object Presets**: 15K, 55K, 91K, 200K, 1M, 9M objects
- **Scenario Loading**: Pre-configured constellation deployments
- **Live Statistics**: FPS, conjunctions, risk assessment
- **Data Export**: Telemetry and conjunction history

## Current Limitations

- WebGPU required (Chrome/Edge with flag enabled)
- Maximum tested: 9 million objects
- No SGP4 support (by design - real physics only)
- Single-body gravity (Earth only, no Moon/Sun perturbations yet)

## Support

- Technical Documentation: See CLAUDE.md for development guidelines
- Build Issues: Check webpack.config.js and package.json
- Physics Issues: Verify Ammo.js is loaded from assets/ammo.js

---

**LEOS RED ORBIT** - Professional Space Disaster Simulation Platform
**Status**: Demo Ready | **Version**: 1.0.0 | **Classification**: UNCLASSIFIED