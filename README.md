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

## Babylon.js Visualization

The frontend uses Babylon.js to create a realistic 3D visualization of:

- Earth with realistic textures, including cloud layers and night lights
- The Moon in proper orbit around Earth
- LEO satellites with their orbital paths
- Realistic lighting and space environment

### Features

- Interactive camera controls for exploring the 3D environment
- Real-time telemetry display for each satellite
- Orbital path visualization
- Time controls to adjust simulation speed
- Satellite tracking camera mode

### Development

To build the frontend:

```bash
# Install dependencies
npm install

# Build the frontend with webpack
./build_frontend.sh
```

To run the application locally:

```bash
python3 server.py
```

The application will be available at [http://localhost:8080](http://localhost:8080).

## API Documentation

The application provides several API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/simulation_data` | GET | Get all simulation data for all satellites |
| `/api/tle` | GET | Get Two-Line Element data for all satellites |
| `/api/telemetry` | GET | Get current telemetry for all satellites |
| `/api/telemetry/<satellite>` | GET | Get telemetry for a specific satellite |
| `/api/starpath/<satellite>` | GET | Get orbit path data for a specific satellite |
| `/api/status` | GET | Get system status information |

## Frontend Module Overview

The JavaScript code is organized into 12 modules:

1. **config.js** - Configuration parameters and constants
2. **utils.js** - General utility functions
3. **scene.js** - Three.js scene management
4. **earth.js** - Earth and Moon rendering
5. **satellites.js** - Satellite visualization
6. **ui.js** - User interface elements
7. **animation.js** - Animation loop and timing
8. **data-loader.js** - API data fetching
9. **main.js** - Application entry point
10. **user-interaction.js** - User input handling
11. **data.js** - Data processing and caching
12. **interaction.js** - High-level interaction logic

## Security Features

- Backend code can be obfuscated with PyArmor for intellectual property protection
- Frontend JavaScript is minified and obfuscated before deployment
- Docker containers run with non-root users for enhanced security
- HTTPS encryption when deployed to Cloud Run

## Troubleshooting

### Application Issues

- **Blank screen**: Check browser console for JavaScript errors
- **Missing satellite models**: Verify that all assets are properly loaded
- **API errors**: Check backend logs for Python exceptions

### Deployment Issues

- **Permission errors**: Ensure proper GCP permissions are set up
- **Build failures**: Check Docker build logs for errors
- **Python errors**: Verify all dependencies are installed correctly

## Performance Considerations

- The simulation engine caches orbit data to improve performance
- 3D models are optimized for web delivery
- Adaptive sampling of orbit points based on distance and visibility

## Future Enhancements

Potential areas for future development:

- Additional satellite types and configurations
- Real-time data from actual satellite sources
- Enhanced physics simulation with perturbations
- Mobile application versions
- VR/AR visualization capabilities

## Contributing

When contributing to this project:

1. Follow the existing code structure and style
2. Document all new functions and modules
3. Test thoroughly in the development environment before deploying
4. Update the README with any necessary changes

## License

This project is proprietary software. All rights reserved.
