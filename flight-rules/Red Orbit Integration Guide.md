# Red Orbit Integration Guide

## CRITICAL: This is Your Complete Implementation Blueprint

This document is for the **NEW Red Orbit codebase** at https://github.com/Charpollo/LEOS-RO. You have cloned First Orbit (LEOS-FO) and will build Red Orbit ON TOP of it, keeping all First Orbit functionality.

## Current Situation

- You have cloned First Orbit and created https://github.com/Charpollo/LEOS-RO
- This codebase is currently a direct copy of First Orbit (LEOS-FO)
- The LEOS-RO repository is empty and this will be your first commit
- You MUST update git remotes to point to LEOS-RS (not First Orbit)
- You will KEEP all First Orbit educational features
- You will ADD Red Orbit disaster simulation features on top
- You will maintain the existing First Orbit design (no Mission Ready styles needed)

## Quick Start Checklist

- [ ] Read this entire document
- [ ] Update git remote to point to LEOS-RS
- [ ] Keep all First Orbit features intact
- [ ] Add Red Orbit simulation features
- [ ] Implement physics engine (Ammo.js)
- [ ] Add disaster scenarios on top of existing code
- [ ] Configure Netlify deployment
- [ ] Test both educational AND disaster features work together

## Product Vision

Red Orbit serves a distinct market segment focused on:
- **Risk Assessment**: Model catastrophic space events with realistic physics
- **Disaster Planning**: Simulate and analyze debris cascades, conjunctions, and space weather
- **Space Sustainability**: Analyze long-term orbital environment evolution
- **Education & Training**: Provide realistic scenarios for mission planning

## Architecture Strategy

### Separate Product Implementation

Red Orbit operates as an independent product (LEOS-RS) within the LEOS ecosystem:
```
LEOS Ecosystem:
├── First Orbit (LEOS-FO) - Free education platform
├── Mission Ready (LEOS-MR) - Professional operations
└── Red Orbit (LEOS-RS) - Disaster simulation platform
```

### Key Architectural Principles

1. **Complete Isolation**: Separate codebase, no shared state with Mission Ready
2. **Independent Release Cycles**: Can evolve without impacting operations
3. **Performance Isolation**: Resource-intensive simulations don't affect ops
4. **Shared Design Language**: Maintain Mission Ready's visual identity

## Mission Ready Design System

Red Orbit must maintain the established LEOS visual language. Here are the core design elements to implement:

### Color Palette

```css
:root {
    /* Primary Brand Colors */
    --neon-blue: #00cfff;           /* Primary highlight color */
    --neon-blue-dark: #0099cc;
    --neon-blue-light: #66d9ff;
    --neon-blue-glow: rgba(0, 207, 255, 0.3);
    
    /* Background Colors */
    --background-black: #000000;
    --background-dark: #0a0e27;     /* Primary dark background */
    --background-panel: rgba(15, 23, 42, 0.95);
    --background-gradient: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    
    /* Text Colors */
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    
    /* UI Element Colors */
    --border-glow: rgba(0, 212, 255, 0.3);
    --border-subtle: rgba(148, 163, 184, 0.2);
    --button-bg: rgba(0, 207, 255, 0.2);
    --button-hover: rgba(0, 207, 255, 0.4);
    
    /* Status Colors */
    --success: #10b981;
    --warning: #fbbf24;
    --danger: #ef4444;
}
```

### Typography

```css
/* Font Stack */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Consolas', 'Monaco', monospace;

/* Font Sizes */
--text-xs: 11px;
--text-sm: 12px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 32px;
--text-4xl: 36px;

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### UI Components

#### Panel Design
```css
.panel {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
}

.panel:hover {
    border-color: rgba(0, 212, 255, 0.3);
}
```

#### Button Styles
```css
.button {
    background: rgba(0, 207, 255, 0.2);
    border: 1px solid rgba(0, 207, 255, 0.3);
    color: #00d4ff;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.button:hover {
    background: rgba(0, 207, 255, 0.4);
    border-color: #00d4ff;
    box-shadow: 0 0 20px rgba(0, 207, 255, 0.3);
}
```

#### Navigation Pattern
- Fixed sidebar: 260px width (80px when collapsed)
- Dark gradient background
- Active state with blue left border
- Icon + text layout with descriptions

### Animation Guidelines

```css
/* Standard transitions */
transition: all 0.2s ease;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Glow effects */
text-shadow: 0 0 20px var(--neon-blue-glow);
box-shadow: 0 0 20px rgba(0, 207, 255, 0.3);

/* Hover states */
transform: translateY(-2px);
opacity: 0.8 → 1;
```

## Red Orbit Specific Implementation

### Core Features

#### 1. Kessler Syndrome Simulation
- NASA Standard Breakup Model implementation
- Fragment velocity distributions
- Cascade propagation mechanics
- Real-time debris tracking (1000s of objects)

#### 2. Physics Integration
```javascript
// Ammo.js integration example
const redSkyPhysics = {
    engine: 'Ammo.js',
    features: {
        collisionDetection: true,
        fragmentationPatterns: true,
        velocityCalculations: true,
        massDistribution: true,
        gpuAcceleration: true
    }
};
```

#### 3. Performance Modes
- **Standard Mode**: 1,000 objects @ 60 FPS
- **Enterprise Mode**: 10,000 objects @ 30 FPS
- **Demo Mode**: Pre-recorded scenarios

### File Structure
```
LEOS-RS/
├── frontend/
│   ├── js/
│   │   ├── core/
│   │   │   ├── red-sky-engine.js
│   │   │   ├── red-sky-scene.js
│   │   │   ├── red-sky-physics.js
│   │   │   └── red-sky-renderer.js
│   │   ├── simulation/
│   │   │   ├── collision-model.js
│   │   │   ├── debris-manager.js
│   │   │   ├── propagator.js
│   │   │   └── scenario-runner.js
│   │   ├── scenarios/
│   │   │   ├── kessler.js
│   │   │   ├── solar-storm.js
│   │   │   └── conjunction.js
│   │   └── ui/
│   │       ├── red-sky-tabs.js
│   │       ├── scenario-controls.js
│   │       └── statistics-panel.js
│   ├── css/
│   │   ├── red-sky.css
│   │   └── red-sky-theme.css
│   └── assets/
│       └── red-sky/
├── netlify/
│   └── functions/
│       └── api/
└── docs/
```

### API Design
```javascript
// Public API for Red Orbit
class RedSkyEngine {
    constructor(config) {
        this.mode = config.mode || 'standard';
        this.container = config.container;
        this.enablePhysics = config.enablePhysics !== false;
    }
    
    // Scenario management
    loadScenario(type, params) {}
    runSimulation() {}
    pauseSimulation() {}
    exportResults() {}
    
    // Integration with Mission Ready
    importConstellation(data) {}
    exportToMissionReady() {}
}

// Usage example
const redSky = new RedSkyEngine({
    container: document.getElementById('red-sky-viewport'),
    mode: 'enterprise'
});

const kesslerScenario = redSky.scenarios.kessler({
    target: 'STARLINK-1234',
    impactVelocity: 14.2,
    altitude: 550
});

await kesslerScenario.run();
```

## Integration with Mission Ready

### SSO Integration
```javascript
// Mission Ready navigation integration
if (user.clicksRedSky) {
    if (user.hasRedSkyLicense) {
        // SSO redirect with token
        const ssoToken = await generateSSOToken(user);
        window.open(`https://redsky.leos.space?token=${ssoToken}`, '_blank');
    } else {
        // Show upgrade modal
        showRedSkyUpgradeModal();
    }
}
```

### Data Exchange Format
```javascript
// Constellation export from Mission Ready
{
    "version": "1.0",
    "timestamp": "2025-08-04T00:00:00Z",
    "constellation": {
        "name": "Customer Fleet",
        "satellites": [
            {
                "id": "SAT-001",
                "tle": ["line1", "line2"],
                "mass": 500,
                "dimensions": [2, 2, 1],
                "crossSection": 4
            }
        ]
    }
}

// Results import to Mission Ready
{
    "scenario": "kessler",
    "timestamp": "2025-08-04T00:00:00Z",
    "affectedSatellites": ["SAT-001", "SAT-002"],
    "debrisCloud": {
        "fragments": 1523,
        "perigee": 540,
        "apogee": 580
    }
}
```

## Development Guidelines

### Code Standards
1. **Modular Architecture**: No file exceeds 1000 lines
2. **Performance First**: Target 60 FPS for standard scenarios
3. **Physics Accuracy**: Validate against published models
4. **Memory Management**: Implement object pooling for debris

### Testing Requirements
```javascript
// Unit tests
describe('BreakupModel', () => {
    it('should generate correct fragment distribution', () => {
        // NASA model validation
    });
});

// Performance tests
describe('Performance', () => {
    it('should maintain 60fps with 1000 objects', () => {
        // Frame rate monitoring
    });
});

// Integration tests
describe('MissionReadyIntegration', () => {
    it('should import constellation data', () => {
        // Data exchange validation
    });
});
```

### Security Considerations
1. **Input Validation**: Sanitize all imported TLE/constellation data
2. **Resource Limits**: Implement caps on simulation complexity
3. **API Rate Limiting**: Protect against abuse
4. **Data Isolation**: No cross-origin data access

## Netlify Deployment (IMPORTANT: Same as Mission Ready)

Red Orbit will be hosted on Netlify, following the same deployment patterns as Mission Ready and First Orbit.

### Complete Netlify Configuration

#### netlify.toml (Place in root directory)
```toml
[build]
  command = "npm run build"
  publish = "frontend/dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[dev]
  command = "npm run dev"
  port = 5173
  targetPort = 3000
  publish = "frontend/dist"
  autoLaunch = false
```

### Netlify Setup Instructions

1. **Create Netlify Account/Site**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Login to Netlify
   netlify login
   
   # Create new site
   netlify init
   # Choose "Create & configure a new site"
   # Team: Your team name
   # Site name: redsky-leos (or your preference)
   ```

2. **Configure Environment Variables in Netlify Dashboard**
   ```
   # Production Environment Variables
   VITE_API_URL=https://redsky.leos.space/api
   VITE_AUTH_DOMAIN=auth.leos.space
   VITE_PHYSICS_WORKER_URL=/workers/physics.js
   VITE_MAX_DEBRIS_OBJECTS=10000
   VITE_BABYLON_CDN=https://cdn.babylonjs.com/babylon.js
   VITE_AMMO_WASM_URL=/wasm/ammo.wasm.js
   VITE_DEMO_MODE=false
   
   # Auth0 Configuration (if using Auth0)
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   AUTH0_AUDIENCE=https://api.redsky.leos.space
   
   # API Keys (keep secure)
   SPACE_TRACK_API_KEY=your-api-key
   CELESTRAK_API_KEY=your-api-key
   ```

3. **Build Configuration**
   ```json
   // package.json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "clean": "rm -rf frontend/dist",
       "deploy": "npm run build && netlify deploy --prod"
     }
   }
   ```

4. **Vite Configuration**
   ```javascript
   // vite.config.js
   import { defineConfig } from 'vite';
   import { resolve } from 'path';
   
   export default defineConfig({
     root: 'frontend',
     build: {
       outDir: 'dist',
       emptyOutDir: true,
       rollupOptions: {
         input: {
           main: resolve(__dirname, 'frontend/index.html')
         }
       }
     },
     server: {
       port: 5173,
       strictPort: true
     },
     define: {
       'process.env': {}
     }
   });
   ```

### Netlify Functions Structure

```
netlify/functions/
├── api/
│   ├── health.js              # Health check endpoint
│   ├── auth-validate.js       # SSO token validation
│   ├── scenarios-list.js      # List available scenarios
│   ├── scenarios-run.js       # Execute simulation
│   ├── scenarios-export.js    # Export results
│   └── constellation-import.js # Import from Mission Ready
├── utils/
│   ├── auth.js               # Auth helpers
│   ├── response.js           # Standardized responses
│   └── cors.js               # CORS configuration
└── middleware/
    └── rate-limit.js         # Rate limiting
```

#### Example Netlify Function
```javascript
// netlify/functions/api/health.js
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'healthy',
      service: 'Red Orbit',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    })
  };
};
```

### Environment Variables Management
```javascript
// frontend/js/config/environment.js
export const config = {
  api: {
    url: import.meta.env.VITE_API_URL || '/.netlify/functions/api',
    timeout: 30000
  },
  auth: {
    domain: import.meta.env.VITE_AUTH_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE
  },
  physics: {
    workerUrl: import.meta.env.VITE_PHYSICS_WORKER_URL,
    maxDebris: parseInt(import.meta.env.VITE_MAX_DEBRIS_OBJECTS) || 10000
  },
  demo: {
    enabled: import.meta.env.VITE_DEMO_MODE === 'true'
  }
};
```

## Pricing & Licensing

### Standalone Pricing
- **Individual**: $39.99/month
- **Team**: $29.99/user/month (5+ users)
- **Enterprise**: Custom pricing

### Mission Ready Bundle
- **Individual**: +$29.99/month (save $10)
- **Team**: +$19.99/user/month (save $10)
- **Enterprise**: INCLUDED

### License Validation
```javascript
// Check license status
async function validateLicense(user) {
    const license = await apiClient.checkRedSkyLicense(user.id);
    return {
        hasAccess: license.active,
        tier: license.tier,
        features: license.features,
        expiresAt: license.expiresAt
    };
}
```

## Step-by-Step Transformation Guide

Since you have forked First Orbit and created https://github.com/Charpollo/LEOS-RS, here's how to transform it into Red Orbit:

### Phase 0: Configure Git Remote (CRITICAL - Do This First!)

```bash
# Navigate to your local First Orbit fork
cd /path/to/your-first-orbit-fork

# Check current remotes (will show First Orbit)
git remote -v

# Remove the old origin
git remote remove origin

# Add new Red Orbit origin
git remote add origin https://github.com/Charpollo/LEOS-RS.git

# Verify the change
git remote -v
# Should now show:
# origin  https://github.com/Charpollo/LEOS-RS.git (fetch)
# origin  https://github.com/Charpollo/LEOS-RS.git (push)

# Create initial commit for Red Orbit
git add .
git commit -m "Initial commit: Red Orbit disaster simulation platform (forked from First Orbit)"
git push -u origin main
```

### Phase 1: Prepare First Orbit Code (Day 1)

1. **KEEP All First Orbit Features**
   ```bash
   # Navigate to your repo
   cd /path/to/LEOS-RS
   
   # DO NOT REMOVE ANY FIRST ORBIT FILES
   # Keep everything:
   # - All tutorials
   # - All quizzes  
   # - All educational content
   # - All learning paths
   
   # Verify all First Orbit features are intact:
   ls -la frontend/js/
   # Should see tutorials/, quiz/, educational/, etc.
   ```

2. **Update Package.json (ADD to existing First Orbit dependencies)**
   ```json
   {
     "name": "red-sky",
     "version": "1.0.0",
     "description": "Space Education & Disaster Simulation Platform",
     "repository": {
       "type": "git",
       "url": "https://github.com/Charpollo/LEOS-RS.git"
     },
     "dependencies": {
       // KEEP all existing First Orbit dependencies
       // ADD these for Red Orbit:
       "ammo.js": "^0.0.10"  // Physics engine for disasters
     }
   }
   ```

3. **ADD Red Orbit Navigation (Keep First Orbit navigation too)**
   ```javascript
   // In app.js, ADD Red Orbit items to existing navigation
   // DO NOT remove First Orbit educational items
   const combinedNavigation = {
     // KEEP all First Orbit items:
     'learn': { label: 'Learn', icon: 'education.svg' },
     'tutorials': { label: 'Tutorials', icon: 'tutorial.svg' },
     'quiz': { label: 'Quiz', icon: 'quiz.svg' },
     
     // ADD Red Orbit items:
     'disasters': { label: 'Disaster Scenarios', icon: 'disaster.svg' },
     'physics': { label: 'Physics Simulation', icon: 'physics.svg' },
     'kessler': { label: 'Kessler Syndrome', icon: 'debris.svg' },
     'export': { label: 'Export Results', icon: 'export.svg' }
   };
   ```

### Phase 2: Create Red Orbit Structure (Day 2)

1. **Create Red Orbit Directory Structure (Alongside First Orbit)**
   ```bash
   # Create Red Orbit specific directories
   # These go ALONGSIDE First Orbit directories, not replacing them
   mkdir -p frontend/js/red-sky/{core,physics,scenarios,ui}
   mkdir -p frontend/css/red-sky
   mkdir -p frontend/assets/red-sky
   
   # Verify both First Orbit and Red Orbit exist:
   ls frontend/js/
   # Should show: tutorials/, quiz/, educational/, red-sky/
   ```

2. **Update index.html to include BOTH systems**
   ```html
   <!-- frontend/index.html -->
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Red Orbit - Space Disaster Simulation</title>
     <link rel="stylesheet" href="/css/red-sky.css">
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
   </head>
   <body>
     <div id="loading-screen">
       <div class="loading-content">
         <h1 class="red-sky-logo">RED SKY</h1>
         <p class="loading-subtitle">Space Disaster Simulation Platform</p>
       </div>
     </div>
     <div id="app" style="display: none;">
       <div id="red-sky-interface">
         <!-- Navigation sidebar -->
         <nav id="sidebar"></nav>
         <!-- Main viewport -->
         <main id="viewport">
           <canvas id="renderCanvas"></canvas>
           <div id="ui-overlay"></div>
         </main>
       </div>
     </div>
     <script type="module" src="/js/main.js"></script>
   </body>
   </html>
   ```

### Phase 3: Implement Red Orbit Core (Day 3-4)

Since you're transforming the existing Mission Ready codebase, you'll modify the existing files rather than creating from scratch:

1. **Main Entry Point**
   ```javascript
   // frontend/js/main.js
   import { RedSkyApp } from './core/red-sky-app.js';
   
   // Initialize app when DOM is ready
   document.addEventListener('DOMContentLoaded', async () => {
     const app = new RedSkyApp();
     await app.initialize();
     
     // Hide loading screen
     document.getElementById('loading-screen').style.display = 'none';
     document.getElementById('app').style.display = 'block';
   });
   ```

2. **Red Orbit App Class**
   ```javascript
   // frontend/js/core/red-sky-app.js
   import { RedSkyEngine } from './red-sky-engine.js';
   import { NavigationUI } from '../ui/navigation-ui.js';
   import { ScenarioManager } from '../scenarios/scenario-manager.js';
   
   export class RedSkyApp {
     constructor() {
       this.engine = null;
       this.navigation = null;
       this.scenarioManager = null;
     }
     
     async initialize() {
       // Initialize Babylon.js engine
       const canvas = document.getElementById('renderCanvas');
       this.engine = new RedSkyEngine(canvas);
       await this.engine.initialize();
       
       // Initialize UI
       this.navigation = new NavigationUI();
       this.navigation.render();
       
       // Initialize scenario manager
       this.scenarioManager = new ScenarioManager(this.engine);
       
       // Set up event listeners
       this.setupEventListeners();
     }
     
     setupEventListeners() {
       // Navigation events
       this.navigation.on('scenario-selected', (type) => {
         this.scenarioManager.loadScenario(type);
       });
       
       // Window resize
       window.addEventListener('resize', () => {
         this.engine.resize();
       });
     }
   }
   ```

3. **Babylon.js Engine Wrapper**
   ```javascript
   // frontend/js/core/red-sky-engine.js
   export class RedSkyEngine {
     constructor(canvas) {
       this.canvas = canvas;
       this.engine = null;
       this.scene = null;
       this.camera = null;
     }
     
     async initialize() {
       // Create Babylon engine
       this.engine = new BABYLON.Engine(this.canvas, true, {
         preserveDrawingBuffer: true,
         stencil: true,
         antialias: true
       });
       
       // Create scene
       this.scene = new BABYLON.Scene(this.engine);
       this.scene.clearColor = new BABYLON.Color3(0.04, 0.05, 0.15);
       
       // Create camera
       this.camera = new BABYLON.UniversalCamera(
         "camera",
         new BABYLON.Vector3(0, 0, -100),
         this.scene
       );
       this.camera.setTarget(BABYLON.Vector3.Zero());
       
       // Add lights
       const light = new BABYLON.HemisphericLight(
         "light",
         new BABYLON.Vector3(0, 1, 0),
         this.scene
       );
       light.intensity = 0.7;
       
       // Create Earth
       await this.createEarth();
       
       // Start render loop
       this.engine.runRenderLoop(() => {
         this.scene.render();
       });
     }
     
     async createEarth() {
       const earth = BABYLON.MeshBuilder.CreateSphere(
         "earth",
         { diameter: 12.742, segments: 64 },
         this.scene
       );
       
       // Earth material with glow
       const earthMat = new BABYLON.StandardMaterial("earthMat", this.scene);
       earthMat.diffuseColor = new BABYLON.Color3(0.2, 0.3, 0.8);
       earthMat.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
       earth.material = earthMat;
       
       return earth;
     }
     
     resize() {
       this.engine.resize();
     }
   }
   ```

### Phase 3: Physics Integration (Day 4-5)

1. **Ammo.js Physics Setup**
   ```javascript
   // frontend/js/physics/physics-engine.js
   export class PhysicsEngine {
     constructor() {
       this.world = null;
       this.bodies = new Map();
     }
     
     async initialize() {
       // Wait for Ammo to load
       await Ammo();
       
       // Setup physics world
       const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
       const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
       const broadphase = new Ammo.btDbvtBroadphase();
       const solver = new Ammo.btSequentialImpulseConstraintSolver();
       
       this.world = new Ammo.btDiscreteDynamicsWorld(
         dispatcher,
         broadphase,
         solver,
         collisionConfig
       );
       
       // No gravity in space
       this.world.setGravity(new Ammo.btVector3(0, 0, 0));
     }
     
     addDebris(mesh, velocity, mass = 1) {
       const shape = new Ammo.btSphereShape(mesh.scaling.x);
       const transform = new Ammo.btTransform();
       transform.setIdentity();
       transform.setOrigin(
         new Ammo.btVector3(
           mesh.position.x,
           mesh.position.y,
           mesh.position.z
         )
       );
       
       const motionState = new Ammo.btDefaultMotionState(transform);
       const localInertia = new Ammo.btVector3(0, 0, 0);
       shape.calculateLocalInertia(mass, localInertia);
       
       const rbInfo = new Ammo.btRigidBodyConstructionInfo(
         mass,
         motionState,
         shape,
         localInertia
       );
       
       const body = new Ammo.btRigidBody(rbInfo);
       body.setLinearVelocity(
         new Ammo.btVector3(velocity.x, velocity.y, velocity.z)
       );
       
       this.world.addRigidBody(body);
       this.bodies.set(mesh.id, { body, mesh });
     }
     
     update(deltaTime) {
       this.world.stepSimulation(deltaTime, 10);
       
       // Update mesh positions from physics
       for (const [id, data] of this.bodies) {
         const transform = new Ammo.btTransform();
         data.body.getMotionState().getWorldTransform(transform);
         const origin = transform.getOrigin();
         
         data.mesh.position.set(
           origin.x(),
           origin.y(),
           origin.z()
         );
       }
     }
   }
   ```

### Phase 4: Kessler Syndrome Implementation (Day 6-7)

1. **NASA Breakup Model**
   ```javascript
   // frontend/js/physics/breakup-model.js
   export class BreakupModel {
     constructor() {
       // NASA Standard Breakup Model parameters
       this.L_c = -1.75;  // Characteristic length
       this.mu = 0.5;     // Mass scaling exponent
     }
     
     generateFragments(parentMass, impactVelocity) {
       const fragments = [];
       
       // Calculate number of fragments > 10cm
       const N = this.calculateFragmentCount(parentMass, impactVelocity);
       
       for (let i = 0; i < N; i++) {
         const fragment = this.generateFragment(parentMass, impactVelocity);
         fragments.push(fragment);
       }
       
       return fragments;
     }
     
     calculateFragmentCount(mass, velocity) {
       // Simplified NASA model
       const energy = 0.5 * mass * velocity * velocity;
       const baseCount = 100 * Math.pow(mass / 1000, 0.75);
       return Math.floor(baseCount * (1 + energy / 1e9));
     }
     
     generateFragment(parentMass, impactVelocity) {
       // Random fragment properties
       const mass = this.generateFragmentMass(parentMass);
       const velocity = this.generateFragmentVelocity(impactVelocity);
       
       return {
         mass,
         velocity,
         size: Math.pow(mass / 2700, 1/3) // Assuming aluminum density
       };
     }
     
     generateFragmentMass(parentMass) {
       // Power law distribution
       const minMass = 0.001; // 1 gram
       const maxMass = parentMass * 0.1;
       const random = Math.random();
       return minMass * Math.pow(maxMass / minMass, random);
     }
     
     generateFragmentVelocity(impactVelocity) {
       // Maxwell-Boltzmann distribution
       const sigma = impactVelocity * 0.2;
       const theta = Math.random() * Math.PI * 2;
       const phi = Math.acos(1 - 2 * Math.random());
       const speed = sigma * Math.sqrt(-2 * Math.log(Math.random()));
       
       return {
         x: speed * Math.sin(phi) * Math.cos(theta),
         y: speed * Math.sin(phi) * Math.sin(theta),
         z: speed * Math.cos(phi)
       };
     }
   }
   ```

### Phase 5: UI Implementation (Day 8-9)

1. **Navigation Sidebar**
   ```javascript
   // frontend/js/ui/navigation-ui.js
   export class NavigationUI {
     constructor() {
       this.container = document.getElementById('sidebar');
       this.scenarios = [
         { id: 'kessler', name: 'Kessler Syndrome', icon: '💥' },
         { id: 'solar', name: 'Solar Storm', icon: '☀️' },
         { id: 'conjunction', name: 'Conjunction', icon: '🔀' }
       ];
     }
     
     render() {
       this.container.innerHTML = `
         <div class="sidebar-header">
           <h1 class="logo">RED SKY</h1>
           <p class="tagline">Disaster Simulation</p>
         </div>
         <div class="scenario-list">
           <h2>Scenarios</h2>
           ${this.renderScenarios()}
         </div>
         <div class="controls">
           <button id="run-simulation" class="btn-primary">
             Run Simulation
           </button>
           <button id="export-results" class="btn-secondary">
             Export Results
           </button>
         </div>
       `;
       
       this.attachEvents();
     }
     
     renderScenarios() {
       return this.scenarios.map(s => `
         <div class="scenario-item" data-id="${s.id}">
           <span class="icon">${s.icon}</span>
           <span class="name">${s.name}</span>
         </div>
       `).join('');
     }
   }
   ```

2. **Mission Ready CSS Theme**
   ```css
   /* frontend/css/red-sky.css */
   :root {
     /* Mission Ready colors */
     --neon-blue: #00cfff;
     --background-dark: #0a0e27;
     --background-panel: rgba(15, 23, 42, 0.95);
     --text-primary: #e2e8f0;
     --text-secondary: #94a3b8;
     --border-subtle: rgba(148, 163, 184, 0.2);
   }
   
   body {
     margin: 0;
     font-family: 'Inter', -apple-system, sans-serif;
     background: var(--background-dark);
     color: var(--text-primary);
   }
   
   #red-sky-interface {
     display: grid;
     grid-template-columns: 300px 1fr;
     height: 100vh;
   }
   
   #sidebar {
     background: var(--background-panel);
     border-right: 1px solid var(--border-subtle);
     padding: 24px;
   }
   
   .logo {
     font-size: 2rem;
     font-weight: 700;
     color: var(--neon-blue);
     text-shadow: 0 0 20px rgba(0, 207, 255, 0.5);
     margin: 0;
   }
   
   .btn-primary {
     background: rgba(0, 207, 255, 0.2);
     border: 1px solid var(--neon-blue);
     color: var(--neon-blue);
     padding: 12px 24px;
     border-radius: 6px;
     cursor: pointer;
     transition: all 0.2s;
   }
   
   .btn-primary:hover {
     background: rgba(0, 207, 255, 0.4);
     box-shadow: 0 0 20px rgba(0, 207, 255, 0.3);
   }
   ```

### Phase 6: Demo Data & Testing (Day 10)

1. **Demo Scenarios**
   ```javascript
   // frontend/js/data/demo-scenarios.js
   export const demoScenarios = {
     kessler: {
       name: "Iridium-Cosmos Collision",
       description: "Recreation of 2009 collision event",
       satellites: [
         {
           id: "IRIDIUM-33",
           tle: [
             "1 24946U 97051C   09041.00000000  .00000000  00000-0  00000-0 0  0000",
             "2 24946  86.4000 121.0000 0002000  90.0000 270.1000 14.34200000000000"
           ],
           mass: 560
         },
         {
           id: "COSMOS-2251",
           tle: [
             "1 22675U 93036A   09041.00000000  .00000000  00000-0  00000-0 0  0000",
             "2 22675  74.0000 340.0000 0016000  90.0000 270.0000 14.30000000000000"
           ],
           mass: 900
         }
       ],
       impactVelocity: 11.7 // km/s
     }
   };
   ```

### Package.json Complete Setup
```json
{
  "name": "red-sky",
  "version": "1.0.0",
  "description": "Space Disaster Simulation Platform",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf frontend/dist",
    "deploy": "npm run build && netlify deploy --prod",
    "test": "vitest",
    "lint": "eslint frontend/js"
  },
  "dependencies": {
    "babylon": "^6.3.1",
    "ammo.js": "^0.0.10",
    "satellite.js": "^5.0.0"
  },
  "devDependencies": {
    "vite": "^4.4.5",
    "@vitejs/plugin-legacy": "^4.1.1",
    "terser": "^5.19.2",
    "vitest": "^0.34.1",
    "eslint": "^8.45.0"
  }
}

## Success Metrics

### Technical Metrics
- Physics accuracy: ±1% of truth models
- Performance: 60 FPS @ 1000 objects
- Memory usage: <2GB for standard scenarios
- Load time: <3 seconds

### Business Metrics
- Conversion from Mission Ready: >20%
- Standalone adoption rate
- Enterprise bundle attach rate: >50%
- User engagement: >30 min average session

## Future Roadmap

### Phase 2 (Q3 2025)
- Solar storm modeling with atmospheric drag
- Conjunction analysis with probability calculations
- REST API for automated analysis
- Export to STK, GMAT formats

### Phase 3 (Q4 2025)
- Machine learning predictions
- Multi-body gravitational perturbations
- VR/AR visualization support
- Custom physics model plugins

## Support & Documentation

### Resources
- Technical Documentation: `/docs/technical/`
- API Reference: `/docs/api/`
- Physics Models: `/docs/physics/`
- Integration Guide: `/docs/integration/`

### Contact
- Technical Support: support@leos.space
- Enterprise Sales: enterprise@leos.space
- Community Forum: community.leos.space/red-sky

## Critical Implementation Notes

### What to KEEP from First Orbit Codebase (EVERYTHING!)

1. **ALL Educational Features**
   - `/frontend/js/tutorials/` - KEEP
   - `/frontend/js/quiz/` - KEEP
   - `/frontend/js/educational/` - KEEP
   - `/frontend/js/learning-paths/` - KEEP
   - `/frontend/content/lessons/` - KEEP

2. **Core Babylon.js Setup** 
   - `app.js`, `earth.js`, `moon.js`
   - All rendering pipeline
   - All existing visualizations

3. **First Orbit Design**
   - Keep existing CSS
   - Keep existing branding
   - Keep all UI elements

### What to ADD for Red Orbit (New Features)

1. **Physics Engine**
   - Ammo.js integration
   - Collision detection
   - Debris fragmentation
   
2. **Disaster Scenarios**
   - Kessler syndrome simulation
   - Solar storm effects
   - Conjunction analysis
   
3. **Advanced Features**
   - NASA breakup model
   - Fragment propagation
   - Results export

### Development Approach

- Red Orbit is an EXTENSION of First Orbit, not a replacement
- Users get BOTH educational content AND disaster simulations
- Think of it as "First Orbit Pro" with advanced features
- All First Orbit features remain functional

### Mission Ready Files to Reference (for style only)

- `/frontend/css/brand-ui.css` - Color palette and animations
- `/frontend/css/mission-ready.css` - Layout patterns
- `/frontend/js/mission-ready/main-interface.js` - UI structure patterns
- `/frontend/css/components.css` - Component styling

### Development Timeline

**Week 1**: Core Setup
- Days 1-2: Repository setup, Netlify config, basic structure
- Days 3-4: Babylon.js integration, basic Earth rendering
- Days 5-7: Physics engine integration

**Week 2**: Features
- Days 8-9: Kessler syndrome implementation
- Days 10-11: UI development
- Days 12-14: Testing and demo scenarios

**Week 3**: Polish
- Days 15-16: Performance optimization
- Days 17-18: Documentation
- Days 19-21: Deployment and launch

### Common Pitfalls to Avoid

1. **Don't Over-Engineer**: Start simple, iterate
2. **Performance First**: Test with 1000+ objects early
3. **Mobile Support**: Test on mobile devices from day 1
4. **Memory Leaks**: Proper cleanup of physics bodies
5. **CORS Issues**: Configure Netlify headers correctly

### Quick Debug Commands

```bash
# Local development
npm run dev

# Check bundle size
npm run build && ls -lh frontend/dist/assets/

# Deploy to staging
netlify deploy

# Deploy to production
netlify deploy --prod

# View function logs
netlify functions:log
```

### Support Resources

1. **Babylon.js Forum**: https://forum.babylonjs.com/
2. **Ammo.js Docs**: https://github.com/kripken/ammo.js/
3. **Netlify Support**: https://answers.netlify.com/
4. **Mission Ready Reference**: This repo (for design patterns)

### First Day Checklist (Starting from First Orbit Fork)

- [ ] Clone your local First Orbit fork
- [ ] Update git remote to https://github.com/Charpollo/LEOS-RS.git
- [ ] Verify remote with `git remote -v`
- [ ] Copy this document to LEOS-RS/docs/INTEGRATION_GUIDE.md
- [ ] Make initial commit to LEOS-RS
- [ ] Remove First Orbit educational features
- [ ] Copy Mission Ready design files (brand-ui.css)
- [ ] Update package.json for Red Orbit
- [ ] Test that basic app still runs
- [ ] Commit transformation changes
- [ ] Start implementing Red Orbit physics

### Remember

- Red Orbit is a SEPARATE product from Mission Ready
- Maintain the visual design language
- Focus on physics accuracy
- Performance is critical
- Start simple, iterate quickly
- Deploy early and often

---

*Last Updated: August 2025*
*Version: 2.0*
*Document Status: Complete Integration Blueprint for Red Orbit Repository*
*Next Step: Copy this entire document to LEOS-RS/docs/INTEGRATION_GUIDE.md*