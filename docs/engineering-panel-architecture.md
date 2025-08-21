# RED ORBIT Engineering Panel & Data Pipeline Architecture
*Separating Simulation from Analytics*

## Executive Summary

RED ORBIT becomes the **pure physics simulation and visualization engine** while RED-WATCH handles **all analytics, alerts, and data analysis**. An Engineering Panel (hotkey "O") provides complete control over the simulation environment.

---

## ARCHITECTURAL VISION

### RED ORBIT (Simulation Engine)
```
PURPOSE: Real-time physics simulation and 3D visualization
- Renders 15,000+ objects in 3D space
- Runs physics at 240Hz
- Shows collisions and cascades
- Beautiful visual experience
- NO CLUTTER - just space and objects
```

### RED-WATCH (Analytics Platform)
```
PURPOSE: Data analysis, alerts, and operational intelligence
- Receives all telemetry from RED ORBIT
- Generates alerts and warnings
- Performs conjunction analysis
- Creates reports and metrics
- Handles all UI complexity
```

---

## ENGINEERING PANEL SPECIFICATION
*Hotkey: "O" - Hidden from normal users*

### Panel Layout
```javascript
class EngineeringPanel {
    constructor(scene) {
        this.visible = false;
        this.settings = {
            // Simulation Settings
            simulation: {
                objectCount: 15000,
                physicsHz: 240,
                timeMultiplier: 60,
                renderBudget: 5000,
                lodEnabled: true
            },
            
            // Scenario Configuration
            scenarios: {
                mode: 'OPERATIONAL', // DEMO | TRAINING | OPERATIONAL | CHAOS
                kesslerEnabled: false,
                collisionProbability: 0.001,
                debrisMultiplier: 1.0,
                catalogData: 'SIMULATED' // SIMULATED | NORAD | HYBRID
            },
            
            // Display Settings
            display: {
                showOrbits: false,
                showLabels: false,
                showTrails: false,
                showGrid: false,
                classification: 'NONE', // NONE | UNCLASSIFIED | SECRET
                organizationLogo: null
            },
            
            // Data Pipeline
            dataPipeline: {
                redWatchEnabled: false,
                streamingUrl: 'ws://localhost:8000/ws/ingest',
                updateRate: 10, // Hz
                compression: true,
                authentication: null
            },
            
            // Performance
            performance: {
                targetFPS: 30,
                autoQuality: true,
                gpuEnabled: false,
                memoryLimit: 2048 // MB
            }
        };
    }
    
    toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            this.createPanel();
        } else {
            this.hidePanel();
        }
    }
    
    createPanel() {
        const panel = `
        <div id="engineering-panel" style="
            position: fixed;
            right: 20px;
            top: 80px;
            width: 400px;
            max-height: 80vh;
            background: rgba(0,0,0,0.95);
            border: 2px solid #ff0000;
            border-radius: 8px;
            padding: 20px;
            overflow-y: auto;
            z-index: 10000;
            font-family: 'Consolas', monospace;
            color: #fff;
        ">
            <h2 style="color: #ff0000; margin: 0 0 20px 0;">
                🔧 ENGINEERING PANEL
            </h2>
            
            <!-- Simulation Control -->
            <div class="panel-section">
                <h3>SIMULATION</h3>
                <label>Object Count: <input type="range" id="object-count" min="100" max="50000" value="15000">
                    <span id="object-count-display">15000</span>
                </label>
                <label>Physics Rate: <select id="physics-rate">
                    <option value="60">60 Hz</option>
                    <option value="120">120 Hz</option>
                    <option value="240" selected>240 Hz</option>
                    <option value="480">480 Hz</option>
                </select></label>
                <label>Time Speed: <select id="time-speed">
                    <option value="1">Real-time (1x)</option>
                    <option value="10">10x</option>
                    <option value="60" selected>60x</option>
                    <option value="100">100x</option>
                    <option value="1000">1000x</option>
                </select></label>
            </div>
            
            <!-- Scenario Setup -->
            <div class="panel-section">
                <h3>SCENARIO</h3>
                <label>Mode: <select id="scenario-mode">
                    <option value="DEMO">Demo (Impressive)</option>
                    <option value="TRAINING">Training</option>
                    <option value="OPERATIONAL" selected>Operational</option>
                    <option value="CHAOS">Chaos (Stress Test)</option>
                </select></label>
                <button id="trigger-kessler">💥 TRIGGER KESSLER</button>
                <button id="inject-anomaly">⚠️ INJECT ANOMALY</button>
                <button id="create-conjunction">🎯 CREATE CONJUNCTION</button>
                <label>Debris Multiplier: <input type="range" id="debris-mult" min="0.1" max="10" step="0.1" value="1">
                    <span id="debris-mult-display">1.0x</span>
                </label>
            </div>
            
            <!-- Display Options -->
            <div class="panel-section">
                <h3>DISPLAY</h3>
                <label><input type="checkbox" id="show-orbits"> Show Orbits</label>
                <label><input type="checkbox" id="show-labels"> Show Labels</label>
                <label><input type="checkbox" id="show-trails"> Show Trails</label>
                <label><input type="checkbox" id="show-stats"> Show Stats Overlay</label>
                <label>Classification: <select id="classification">
                    <option value="NONE" selected>None</option>
                    <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                    <option value="CUI">CUI</option>
                    <option value="SECRET">SECRET</option>
                    <option value="TOP SECRET">TOP SECRET</option>
                </select></label>
            </div>
            
            <!-- Data Pipeline -->
            <div class="panel-section">
                <h3>RED-WATCH PIPELINE</h3>
                <label><input type="checkbox" id="enable-streaming"> Enable Streaming</label>
                <label>Endpoint: <input type="text" id="stream-endpoint" value="ws://localhost:8000/ws/ingest"></label>
                <label>Update Rate: <select id="stream-rate">
                    <option value="1">1 Hz</option>
                    <option value="5">5 Hz</option>
                    <option value="10" selected>10 Hz</option>
                    <option value="30">30 Hz</option>
                    <option value="60">60 Hz</option>
                </select></label>
                <button id="test-connection">📡 TEST CONNECTION</button>
                <div id="stream-status" style="color: #00ff00; margin-top: 10px;">
                    Status: Not Connected
                </div>
            </div>
            
            <!-- Quick Scenarios -->
            <div class="panel-section">
                <h3>QUICK SCENARIOS</h3>
                <button id="scenario-starlink">🛰️ Starlink Deployment</button>
                <button id="scenario-china">🇨🇳 China ASAT Test</button>
                <button id="scenario-solar">☀️ Solar Storm</button>
                <button id="scenario-iss">🚀 ISS Emergency</button>
                <button id="scenario-geo">📡 GEO Collision</button>
                <button id="scenario-cleanup">🧹 Debris Cleanup</button>
            </div>
            
            <!-- Performance -->
            <div class="panel-section">
                <h3>PERFORMANCE</h3>
                <div>FPS: <span id="current-fps">60</span></div>
                <div>Objects: <span id="current-objects">15000</span></div>
                <div>Physics: <span id="physics-time">16ms</span></div>
                <div>Memory: <span id="memory-usage">2048 MB</span></div>
                <label><input type="checkbox" id="auto-quality" checked> Auto Quality</label>
                <label>Target FPS: <input type="number" id="target-fps" value="30" min="10" max="120"></label>
            </div>
            
            <!-- Actions -->
            <div class="panel-section">
                <h3>ACTIONS</h3>
                <button id="export-state">💾 EXPORT STATE</button>
                <button id="load-state">📂 LOAD STATE</button>
                <button id="reset-sim">🔄 RESET SIMULATION</button>
                <button id="screenshot">📸 SCREENSHOT</button>
                <button id="record-video">🎥 RECORD VIDEO</button>
            </div>
            
            <!-- Close Button -->
            <button id="close-panel" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: #ff0000;
                color: #fff;
                border: none;
                padding: 5px 10px;
                cursor: pointer;
            ">✖</button>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', panel);
        this.attachEventListeners();
    }
}
```

---

## DATA PIPELINE ARCHITECTURE

### RED ORBIT → RED-WATCH Flow
```javascript
class DataPipeline {
    constructor() {
        this.ws = null;
        this.buffer = [];
        this.streaming = false;
        this.metricsOnly = false; // Can choose what to send
    }
    
    startStreaming(config) {
        // Connect to RED-WATCH
        this.ws = new WebSocket(config.endpoint);
        
        this.ws.onopen = () => {
            console.log('📡 RED-WATCH Connected');
            this.streaming = true;
            this.streamLoop(config);
        };
    }
    
    streamLoop(config) {
        setInterval(() => {
            if (!this.streaming) return;
            
            const data = {
                timestamp: new Date().toISOString(),
                simulation: {
                    // Only send what RED-WATCH needs
                    mode: window.engineeringPanel.settings.scenarios.mode,
                    timeMultiplier: window.simState.timeMultiplier,
                    objectCount: window.redOrbitPhysics.bodies.size
                },
                objects: this.getObjectStates(), // Position, velocity, etc
                events: this.getEvents(),        // Collisions, conjunctions
                metrics: this.getMetrics(),      // FPS, memory, etc
                kessler: this.getKesslerStatus() // Cascade data
            };
            
            // Send to RED-WATCH
            this.ws.send(JSON.stringify(data));
            
        }, 1000 / config.updateRate); // Hz to ms
    }
    
    getObjectStates() {
        // Only send essential data
        const objects = [];
        window.redOrbitPhysics.bodies.forEach((body, id) => {
            objects.push({
                id: id,
                position: body.position,
                velocity: body.velocity,
                altitude: body.altitude,
                mass: body.mass
                // NOT sending visual properties
            });
        });
        return objects;
    }
}
```

---

## UI SIMPLIFICATION

### What Gets REMOVED from RED ORBIT
```
❌ Alert panels
❌ Telemetry displays  
❌ Data tables
❌ Charts and graphs
❌ Risk assessments
❌ Conjunction lists
❌ Statistics overlays
❌ Warning banners (except classification)
❌ Top black banner bar (make UI elements float instead)
```

### What STAYS in RED ORBIT
```
✅ 3D Earth and space
✅ Satellites and orbits
✅ Collision animations
✅ RED ORBIT logo (top left - floating)
✅ RED ORBIT lettering (top left - floating)
✅ Time controls (top middle - floating)
✅ Camera controls
✅ Classification banner (if enabled)
✅ Simple object count
✅ Engineering Panel (hidden)
```

---

## IMPLEMENTATION STEPS

### Phase 1: Create Engineering Panel
```javascript
// In app.js
document.addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') {
        if (!window.engineeringPanel) {
            window.engineeringPanel = new EngineeringPanel(scene);
        }
        window.engineeringPanel.toggle();
    }
});
```

### Phase 2: Remove UI Clutter & Float Elements
```javascript
// Remove these elements
const elementsToRemove = [
    '#telemetry-panel',
    '#alert-banner',
    '#statistics-overlay',
    '#conjunction-list',
    '#risk-matrix',
    '#debris-counter',
    '#top-banner' // Remove the black banner bar
];

elementsToRemove.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.remove();
});

// Make logo and time controls float directly on display
const logo = document.querySelector('#red-orbit-logo');
const lettering = document.querySelector('#red-orbit-text');
const timeControls = document.querySelector('#time-controls');

// Float the logo (top left)
if (logo) {
    logo.style.position = 'fixed';
    logo.style.top = '20px';
    logo.style.left = '20px';
    logo.style.zIndex = '1000';
    logo.style.background = 'none';
}

// Float the RED ORBIT lettering (top left)
if (lettering) {
    lettering.style.position = 'fixed';
    lettering.style.top = '20px';
    lettering.style.left = '80px'; // Next to logo
    lettering.style.zIndex = '1000';
    lettering.style.background = 'none';
}

// Float time controls (top middle)
if (timeControls) {
    timeControls.style.position = 'fixed';
    timeControls.style.top = '20px';
    timeControls.style.left = '50%';
    timeControls.style.transform = 'translateX(-50%)';
    timeControls.style.zIndex = '1000';
    timeControls.style.background = 'rgba(0,0,0,0.5)';
    timeControls.style.padding = '10px';
    timeControls.style.borderRadius = '8px';
}
```

### Phase 3: Setup Data Pipeline
```javascript
// Initialize pipeline when streaming enabled
if (engineeringPanel.settings.dataPipeline.redWatchEnabled) {
    const pipeline = new DataPipeline();
    pipeline.startStreaming({
        endpoint: engineeringPanel.settings.dataPipeline.streamingUrl,
        updateRate: engineeringPanel.settings.dataPipeline.updateRate
    });
}
```

---

## QUICK SCENARIOS

### Starlink Deployment
```javascript
scenarios.starlinkDeployment = () => {
    // Create 60 satellites in formation
    for (let i = 0; i < 60; i++) {
        createSatellite({
            altitude: 550,
            inclination: 53,
            name: `STARLINK-${i}`,
            deployed: false
        });
    }
    // Animate deployment over 60 seconds
};
```

### China ASAT Test
```javascript
scenarios.chinaASAT = () => {
    // Find target satellite
    const target = findSatellite('USA-245');
    // Launch interceptor
    const interceptor = createMissile({
        target: target,
        origin: [40.4, 100.1], // Xichang
        velocity: 8.5 // km/s
    });
    // Track to impact
};
```

---

## BENEFITS OF THIS ARCHITECTURE

### For Development
- **Clean separation** of concerns
- **Easier testing** - simulate without analytics
- **Better performance** - no UI overhead
- **Modular updates** - change viz without breaking analytics

### For Sales/Demos  
- **Clean visuals** for screenshots/videos
- **No distracting UI** during presentations
- **Quick scenario setup** via Engineering Panel
- **Professional appearance** with classification banners

### For Operations
- **RED ORBIT** = What's happening (visualization)
- **RED-WATCH** = What it means (analysis)
- **Data Pipeline** = Real-time intelligence flow
- **Engineering Panel** = Complete control

---

## CONCLUSION

This architecture makes RED ORBIT a **pure, beautiful simulation engine** while RED-WATCH becomes the **brain for analysis**. The Engineering Panel gives you total control without cluttering the main experience.

**RED ORBIT**: Shows the problem
**RED-WATCH**: Solves the problem
**Together**: Complete space awareness solution

---

*"Simulation without clutter. Analysis without limits. This is professional SDA."*