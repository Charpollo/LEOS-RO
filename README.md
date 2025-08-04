# LEOS Red Orbit - Space Disaster Simulation Platform

## Overview

LEOS Red Orbit is a powerful space disaster simulation platform built on top of LEOS First Orbit. It combines educational space visualization with advanced physics-based disaster modeling, focusing on scenarios like Kessler Syndrome, solar storms, and satellite conjunctions.

## Features

### Educational Features (from First Orbit)
- Interactive 3D satellite visualization
- Real-time orbital mechanics
- Educational tutorials and quizzes
- Telemetry data integration

### Red Orbit Disaster Simulations
- **Kessler Syndrome Modeling**: NASA Standard Breakup Model implementation
- **Physics Engine**: Ammo.js integration for realistic collision dynamics
- **Debris Tracking**: Handle thousands of fragments in real-time
- **Solar Storm Effects**: Model atmospheric drag and radiation impacts
- **Conjunction Analysis**: Predict and analyze close approaches

## Technology Stack

- **3D Rendering**: Babylon.js
- **Physics**: Ammo.js
- **Orbital Mechanics**: satellite.js
- **Build System**: Webpack
- **Server**: Python HTTP server

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
│   │   ├── core/              # First Orbit core functionality
│   │   ├── red-orbit/         # Red Orbit specific features
│   │   │   ├── core/          # Disaster simulation engine
│   │   │   ├── physics/       # Ammo.js physics integration
│   │   │   ├── scenarios/     # Disaster scenarios
│   │   │   └── ui/           # Red Orbit UI components
│   │   └── ...               # First Orbit modules
│   ├── css/
│   ├── assets/
│   └── dist/                  # Built files
├── docs/                      # Documentation
├── flight-rules/              # Operational procedures
└── scripts/                   # Build and utility scripts
```

## Disaster Scenarios

### Kessler Syndrome
Simulate cascading collisions in orbit:
- Fragment generation using NASA breakup models
- Velocity distribution calculations
- Cascade propagation mechanics
- Long-term orbital evolution

### Solar Storms
Model space weather impacts:
- Atmospheric drag increases
- Satellite orientation disruption
- Communication blackouts
- Radiation exposure calculations

### Conjunction Analysis
Predict close approaches:
- Probability calculations
- Miss distance analysis
- Avoidance maneuver planning
- Risk assessment

## Performance Modes

- **Standard Mode**: 1,000 objects @ 60 FPS
- **Enterprise Mode**: 10,000 objects @ 30 FPS
- **Demo Mode**: Pre-recorded scenarios for presentations

## Contributing

We welcome contributions! Please see our contributing guidelines in `CONTRIBUTING.md`.

## License

This project is proprietary software. See `LICENSE` for details.

## Support

- Technical Documentation: `/docs/`
- Integration Guide: `/docs/INTEGRATION_GUIDE.md`
- Community Forum: community.leos.space/red-orbit
- Support Email: support@leos.space

## Acknowledgments

Built on the foundation of LEOS First Orbit, incorporating NASA's Standard Breakup Model and industry-standard orbital mechanics calculations.

---

**LEOS Red Orbit** - Simulating Tomorrow's Space Disasters Today