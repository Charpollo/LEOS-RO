# LEOS: First Orbit

LEOS: First Orbit is a 3D web-based satellite visualization application that displays the CRTS1 and BULLDOG satellites in orbit around Earth. It uses realistic orbital mechanics to simulate satellite trajectories and provides real-time telemetry data.

## Project Overview

This application features:
- Real-time 3D visualization of Earth and satellites using Babylon.js
- Realistic orbital path calculations using Skyfield
- Satellite telemetry simulation including battery, temperature, and anomalies
- RESTful API for accessing orbital and telemetry data
- Docker deployment for local development and Google Cloud Run production

## Project Structure

The LEOS First Orbit codebase is organized into a modern, modular structure:

```
├── backend/               # Python backend code
│   ├── api/               # API routes and response handling
│   ├── satellite/         # Satellite orbit and telemetry simulation
│   ├── simulation/        # Core simulation engine
│   └── utils/             # Helper functions
├── frontend/              # Web frontend 
│   ├── assets/            # 3D models, textures, and images
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript modules
├── cache/                 # Orbit data cache
├── server.py              # Main application entry point
├── webpack.config.js      # Webpack configuration
├── build_frontend.sh      # Frontend build script
├── Dockerfile             # Development Docker configuration
├── Dockerfile.prod        # Production Docker configuration
├── deploy.sh              # Deployment script for Google Cloud Run
├── obfuscate.py           # Code obfuscation utility
└── requirements.txt       # Python dependencies
```

### Key Components

| Component | Description |
|-----------|-------------|
| `backend/app.py` | Flask application initialization and configuration |
| `backend/simulation/engine.py` | Core simulation engine that generates satellite orbits |
| `backend/satellite/tle_generator.py` | Two-Line Element generator for realistic orbits |
| `backend/satellite/orbit.py` | Orbit calculation and position functions |
| `backend/api/routes.py` | RESTful API endpoints for accessing orbital data |
| `frontend/js/app.js` | Frontend entry point for Babylon.js visualization |
| `frontend/index.html` | Main HTML template for the application |
| `frontend/css/styles.css` | Styling for the user interface |
| `server.py` | Main entry point that runs the Flask application |
| `webpack.config.js` | Webpack configuration for bundling frontend assets |
| `obfuscate.py` | Python utility for code obfuscation before deployment |

## Prerequisites

1. [Python 3.9+](https://www.python.org/downloads/) installed
2. [Docker](https://docs.docker.com/get-docker/) installed (for containerized development)
3. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured (for cloud deployment)
4. [Node.js and npm](https://nodejs.org/) installed (for frontend asset processing)

## Local Development

### Option 1: Running Directly

1. **Install required Python packages**

```bash
pip install -r requirements.txt
```

2. **Install required JavaScript packages**

```bash
npm install
```

3. **Run the application in development mode**

```bash
# Using npm script with webpack watch mode and auto-rebuild
npm run dev

# OR run manually with options
python3 server.py --watch --debug
```

This will start the application at http://localhost:8080 with automatic frontend rebuilding when files change.

### Development Tools

For an easier development experience, use the included development helper script:

```bash
# Show available commands
./dev.sh help

# Start in development mode (auto-rebuilding + debug)
./dev.sh dev

# Clean, build, and start the server
./dev.sh clean build start

# Start on a custom port
./dev.sh port 8081 start

# Just build the frontend
./dev.sh build

# Start webpack in watch mode only
./dev.sh watch
```

### Option 2: Running with Docker

1. **Build and run the Docker container**

```bash
# Build the container
docker build -t leos-first-orbit .

# Run the container
docker run -p 8080:8080 leos-first-orbit
```

This will start the application at http://localhost:8080.

### Option 3: Using Docker Compose

For a development environment with hot-reloading:

```bash
# Start the service
docker-compose up

# Run in the background
docker-compose up -d

# Stop the service
docker-compose down
```

## Deployment to Google Cloud Run

### Setting Up Google Cloud Permissions

Before deploying, set up proper permissions in your Google Cloud account:

1. **Create a new project or select an existing one**

```bash
gcloud projects create leos-first-orbit-dev --name="LEOS First Orbit Dev"
gcloud config set project leos-first-orbit-dev
```

2. **Enable necessary APIs**

```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com
```

3. **Set up Artifact Registry repository**

```bash
gcloud artifacts repositories create leos-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="LEOS Docker images"
```

### Deployment Process

1. **Edit the deploy.sh script** (if needed)

Update the following variables in `deploy.sh`:
- `PROJECT_ID` - Your Google Cloud Project ID
- `SERVICE_NAME` - Name for your Cloud Run service
- `REGION` - Google Cloud Region (default: us-central1)

2. **Run the deployment script**

```bash
chmod +x deploy.sh
./deploy.sh
```

The deployment script will:
- Obfuscate the backend Python code using PyArmor
- Minify and obfuscate frontend JavaScript files
- Build a Docker container using the production Dockerfile
- Push the container to Google Artifact Registry
- Deploy the container to Cloud Run

3. **Access your deployed application**

After successful deployment, the script will output a URL where your application is available:

```
Service [leos-first-orbit] deployed to Cloud Run: https://leos-first-orbit-abcdef123-uc.a.run.app
```

### Multi-Environment Deployment

The application supports deploying to multiple environments (development and production):

```bash
# Deploy to development
gcloud config set project leos-first-orbit-dev
./deploy.sh

# Deploy to production
gcloud config set project leos-first-orbit
./deploy.sh
```

## Architectural Details

### Backend Architecture

The backend uses a modular architecture built with Flask:

1. **Simulation Engine** (`backend/simulation/engine.py`)
   - Generates realistic satellite orbit data
   - Calculates positions, velocities, and altitudes
   - Produces telemetry data including battery levels and temperature

2. **Satellite Modules** (`backend/satellite/`)
   - TLE Generation: Creates realistic Two-Line Element sets
   - Orbit Calculation: Computes orbital trajectories using Skyfield
   - Telemetry Generation: Simulates satellite system status

3. **API Layer** (`backend/api/`)
   - RESTful endpoints for accessing simulation data
   - JSON-formatted responses for frontend consumption

### Frontend Architecture

The frontend is built using vanilla JavaScript modules and Three.js:

1. **Rendering Engine** (`frontend/js/scene.js`, `frontend/js/earth.js`)
   - 3D Earth with realistic textures and cloud layer
   - Dynamic lighting and shadows
   - Camera controls for interactive viewing

2. **Satellite Visualization** (`frontend/js/satellites.js`)
   - 3D satellite models with accurate positioning
   - Orbit trail visualization
   - Satellite selection and focus capabilities

3. **User Interface** (`frontend/js/ui.js`, `frontend/js/user-interaction.js`)
   - Interactive controls for manipulating the view
   - Telemetry display panels
   - Responsive design for various screen sizes

# Frontend Architecture Documentation

## 1. Core Architecture Components

### Entry Point (`main.js`)
- Main application initialization sequence
- Initializes core systems in order:
  1. Responsive system for device adaptation
  2. 3D scene initialization
  3. UI components setup
  4. Event listeners registration
  5. Earth and Moon object creation
  6. Animation systems startup
  7. Satellite data loading

### Scene Management (`scene.js`)
- 3D scene initialization and configuration
- Multiple camera management:
  - Earth view
  - Moon view
  - Satellite tracking view
- Window resize handling with performance optimization
- Scene optimization settings
- Star field and space background
- Adaptive orbit controls for smooth navigation

### Earth Rendering (`earth.js`)
- Photorealistic Earth visualization:
  - PBR (Physically Based Rendering) materials
  - Dynamic day/night cycle with city lights
  - Animated cloud layer with transparency
  - Atmospheric scattering for realistic atmosphere
  - Seasonal lighting variations
  - Accurate Earth rotation (counterclockwise)
  - Surface detail mapping with specular highlights
  - Fresnel-based rim lighting

### Satellite System (`satellites.js`)
- Comprehensive satellite management:
  - Dynamic mesh creation and disposal
  - Real-time position updates via orbital mechanics
  - Telemetry data generation and updates
  - Eclipse detection and visual effects
  - Interactive selection and highlighting
  - Label management with distance scaling
  - Orientation based on velocity vector
  - Safe altitude enforcement

### Orbital Mechanics (`orbital-mechanics.js`)
- High-precision orbital calculations:
  - Kepler equation solver
  - Position and velocity computation
  - Orbital elements processing
  - Eclipse condition detection
  - Coordinate transformations
  - Fallback trajectories for error cases

## 2. User Interface Components

### Core UI (`ui.js`)
- Base UI system:
  - Satellite information panel
  - Orbit information display
  - Following mode indicator
  - Instructions overlay
  - Panel collapse/expand functionality
  - Dynamic resizing handlers
  - Error message display

### User Interaction (`user-interaction.js`)
- Comprehensive input handling:
  - Mouse and touch event processing
  - Camera control system
  - Satellite selection logic
  - Smooth view transitions
  - Zoom and pan controls
  - Double-tap/click detection
  - Long press handling
  - Custom cursor states

### Brand UI (`ui/brand-ui.js`)
- Brand-specific interface elements:
  - Welcome modal with tutorial
  - Loading screen with progress
  - Custom-styled UI components
  - Logo and branding elements
  - Modal dialogs
  - Notification system

### Telemetry Display (`telemetry.js`)
- Real-time data visualization:
  - Satellite status monitoring
  - Position and velocity display
  - System health metrics
  - Power system status
  - Temperature monitoring
  - Custom telemetry cards

## 3. Animation and Time Management

### Animation System (`animation.js`)
- Advanced animation control:
  - Main animation loop
  - Frame timing management
  - Performance optimization
  - Smooth transitions
  - Animation state tracking
  - Frame limiting (30 FPS)
  - Animation smoothing

### Time Management (`simulation.js`)
- Simulation time control:
  - Time acceleration handling
  - Day/night cycle management
  - Seasonal changes
  - Time display formatting
  - Simulation speed adjustment
  - Time synchronization

## 4. Configuration and Utilities

### Constants (`config.js`)
- Centralized configuration:
  - Earth and space constants
  - Animation parameters
  - Camera settings
  - UI configuration
  - Scale factors
  - Asset paths
  - Debug settings
  - Performance tuning

### Utilities (`utils.js`)
- Helper functions:
  - Logging and debugging
  - Mathematical calculations
  - Window dimension handling
  - Performance monitoring
  - Error handling
  - Data formatting
  - Type checking

## 5. Data Management

### Data Loading (`data.js`)
- Data handling system:
  - API data fetching
  - Trajectory loading
  - Data caching
  - Error handling
  - Retry logic
  - Data validation
  - Cache invalidation

## 6. Build and Asset Management

### Webpack Configuration
```javascript
// webpack.config.js key features:
- Development mode with source maps
- Entry point: frontend/js/app.js
- Output: Bundled JavaScript
- CSS processing with style-loader
- Asset preservation
- HTML template processing
- File copying for assets and CSS
```

### Asset Structure
```plaintext
/frontend/assets/
  ├── earth_diffuse.png     # High-detail Earth texture
  ├── earth_clouds.jpg      # Dynamic cloud layer
  ├── earth_night.jpg      # Night lights texture
  ├── earth_specular.tif   # Surface detail map
  ├── moon_texture.jpg     # Moon surface texture
  ├── stars.jpg            # Space background
  ├── crts_satellite.glb   # CRTS satellite model
  └── bulldog_sat.glb      # Bulldog satellite model
```

## 7. Performance Optimizations

### Rendering Optimizations
- Frame rate limiting to 30 FPS
- Throttled resize event handling
- Selective rendering updates
- Optimized material settings
- Reduced geometry complexity
- Proper resource cleanup
- Texture compression
- Level of detail management

### Memory Management
- Proper mesh disposal
- Texture cleanup
- Event listener cleanup
- Cache size limits
- Asset preloading
- Garbage collection optimization

## 8. Code Organization
```plaintext
/frontend/js/
  ├── main.js              # Application entry
  ├── scene.js            # 3D scene management
  ├── earth.js            # Earth visualization
  ├── satellites.js       # Satellite management
  ├── orbital-mechanics.js # Orbital calculations
  ├── animation.js        # Animation system
  ├── ui.js              # Core UI components
  ├── user-interaction.js # User input handling
  ├── config.js          # Constants and settings
  ├── data.js            # Data management
  ├── utils.js           # Utility functions
  └── ui/                # UI components
      ├── brand-ui.js    # Brand-specific UI
      ├── manager.js     # UI state management
      └── templates.js   # UI templates
```

## 9. Best Practices

### Code Style
- Modular architecture
- Clear separation of concerns
- Consistent naming conventions
- Comprehensive error handling
- Proper documentation
- Performance optimization
- Memory management
- Event cleanup

### Development Workflow
- Use npm for dependency management
- Webpack for asset bundling
- Source maps for debugging
- CSS preprocessing
- Asset optimization
- Code minification
- Cache management

This documentation provides a comprehensive overview of the LEOS frontend architecture, making it easier for developers to understand and maintain the codebase. Each component is designed to be modular and maintainable, with clear responsibilities and interfaces.
