# RED ORBIT Architecture Separation

## Overview
This document outlines the architectural separation of the RED ORBIT engine into two distinct components:
1. **RED ORBIT Engine** - Pure physics simulation and visualization
2. **LEOS-RO Mission Control** (Grafana-based) - All monitoring, analytics, and operational dashboards

## Current State → Target State

### What We're Removing from RED ORBIT Engine
- ❌ All dashboard panels (mission control, objects, conjunctions tabs)
- ❌ Activity feeds and status displays
- ❌ Conjunction analysis UI
- ❌ Alert panels and notifications
- ❌ Timeline scrubbers
- ❌ Data export interfaces
- ❌ Graph/chart visualizations
- ❌ Engineering tabs/panels

### What Stays in RED ORBIT Engine
- ✅ WebGPU physics simulation (8M objects)
- ✅ 3D visualization (Babylon.js scene)
- ✅ Full camera controls (keyboard, mouse, cinematic mode)
- ✅ Settings popup (keep as-is for configuration)
- ✅ Data Export popup (keep as-is for quick exports)
- ✅ CyberRTS and RED ORBIT logos (top left)
- ✅ Red time display (top center - existing style)
- ✅ LIVE indicator (top right)
- ✅ Time multiplier controls (1x/60x toggle)
- ✅ FPS counter
- ✅ Telemetry data streamer (sends to Grafana)
- ✅ All existing keyboard shortcuts (K for Kessler, Space for pause, etc.)

## Implementation Plan

### Phase 1: Strip Down RED ORBIT Engine

#### Files to Remove/Modify:
```
frontend/js/ui/
├── engineering-tabs.js       [REMOVE]
├── panel-system.js           [REMOVE]
├── sidebar-nav.js            [REMOVE]
├── mode-manager.js           [REMOVE]
├── dock-manager.js           [REMOVE]
├── window-manager.js         [REMOVE]
├── tabs/                     [REMOVE FOLDER]
│   ├── mission-control-tab.js
│   ├── objects-tab.js
│   ├── conjunctions-tab.js
│   ├── scenarios-tab.js
│   └── export-tab.js
└── conjunction-history.js    [MODIFY - keep data, remove UI]
```

#### What We Keep From Existing UI:
```javascript
// These existing UI elements stay exactly as they are:

// 1. Top left logos (brand-ui.js) - KEEP AS-IS
// CyberRTS and RED ORBIT branding

// 2. Top center time display (brand-ui.js) - KEEP AS-IS  
// Red time display that's already there

// 3. Settings popup (brand-ui.js) - KEEP AS-IS
// User can configure simulation parameters

// 4. Data Export popup - KEEP AS-IS
// Quick CSV/JSON export functionality

// 5. Camera controls (controls.js) - KEEP AS-IS
// All keyboard shortcuts:
// - Arrow keys: rotate camera
// - W/A/S/D: move camera  
// - Option+Arrows: cinematic mode
// - K: trigger Kessler
// - Space: pause/resume
// - 1-9: time multipliers

// 6. Help button (?) - KEEP AS-IS
// Shows keyboard shortcuts
```

#### What We Add:
```javascript
// frontend/js/ui/minimal-additions.js
export class MinimalAdditions {
    constructor() {
        this.addLiveIndicator();
        this.addSpeedToggle();
    }
    
    addLiveIndicator() {
        // Add LIVE indicator near time display
        const liveDiv = document.createElement('div');
        liveDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 5px;
            z-index: 1000;
        `;
        liveDiv.innerHTML = `
            <div style="width: 8px; height: 8px; background: #00ff00; border-radius: 50%; animation: pulse 2s infinite;"></div>
            <span style="color: #00ff00; font-family: 'Orbitron', monospace; font-size: 12px; text-transform: uppercase;">Live</span>
        `;
        document.body.appendChild(liveDiv);
    }
    
    addSpeedToggle() {
        // Simple 1x/60x toggle button
        const btn = document.createElement('button');
        btn.id = 'speed-toggle';
        btn.textContent = '1x';
        btn.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: transparent;
            border: 1px solid #00ffff;
            color: #00ffff;
            padding: 5px 15px;
            cursor: pointer;
            font-family: 'Orbitron', monospace;
            z-index: 1000;
        `;
        btn.onclick = () => {
            if (window.simState.timeMultiplier === 1) {
                window.simState.timeMultiplier = 60;
                btn.textContent = '60x';
            } else {
                window.simState.timeMultiplier = 1;
                btn.textContent = '1x';
            }
        };
        document.body.appendChild(btn);
    }
}
```

#### Settings Configuration (Stays):
```javascript
// frontend/js/ui/settings-popup.js
export class SettingsPopup {
    // User configuration
    // Simulation parameters
    // Grafana connection settings
    // License key
}
```

### Phase 2: Add Telemetry Streamer

#### Create Telemetry API:
```javascript
// frontend/js/telemetry/streamer.js
export class TelemetryStreamer {
    constructor(config) {
        this.grafanaEndpoint = config.grafanaUrl || 'http://localhost:3000';
        this.streamKey = config.streamKey;
        this.interval = config.interval || 1000; // 1 second default
    }
    
    startStreaming() {
        setInterval(() => {
            this.sendTelemetryPacket();
        }, this.interval);
    }
    
    sendTelemetryPacket() {
        const packet = {
            timestamp: Date.now(),
            simulation: {
                fps: window.engine?.getFps() || 0,
                time_multiplier: window.simState?.timeMultiplier || 1,
                simulation_time: window.getCurrentSimTime?.() || new Date()
            },
            physics: {
                total_objects: window.redOrbitPhysics?.getStats?.().count || 0,
                active_objects: window.redOrbitPhysics?.getStats?.().active || 0,
                compute_time_ms: window.redOrbitPhysics?.getStats?.().computeTime || 0,
                memory_usage_mb: window.redOrbitPhysics?.getStats?.().memory || 0
            },
            conjunctions: {
                active: window.conjunctionHistory?.getActive?.() || [],
                predictions: window.conjunctionHistory?.getPredictions?.() || [],
                critical_count: window.conjunctionHistory?.getCriticalCount?.() || 0,
                warning_count: window.conjunctionHistory?.getWarningCount?.() || 0
            },
            objects: this.getObjectTelemetry()
        };
        
        // Send to Grafana Live
        fetch(`${this.grafanaEndpoint}/api/live/push/${this.streamKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(packet)
        });
    }
    
    getObjectTelemetry() {
        // Sample of object positions/velocities for tracking
        return {
            leo_count: 5000000,
            meo_count: 2000000,
            geo_count: 1000000,
            debris_count: window.redOrbitPhysics?.debris?.size || 0
        };
    }
}
```

### Phase 3: Grafana Integration

#### Directory Structure:
```
LEOS-RO/
├── frontend/           [RED ORBIT Engine]
├── grafana/           [NEW - Mission Control]
│   ├── docker-compose.yml
│   ├── provisioning/
│   │   ├── dashboards/
│   │   │   ├── mission-control.json
│   │   │   ├── conjunction-analysis.json
│   │   │   ├── object-tracking.json
│   │   │   └── predictions.json
│   │   ├── datasources/
│   │   │   └── leos-ro-stream.yml
│   │   └── plugins/
│   │       └── leos-ro-custom/
│   ├── branding/
│   │   ├── logo.svg
│   │   ├── favicon.ico
│   │   └── theme.css
│   └── config/
│       └── grafana.ini
```

#### Grafana Configuration:
```ini
# grafana/config/grafana.ini
[server]
domain = localhost
root_url = http://localhost:3000
serve_from_sub_path = false

[branding]
app_title = CyberRTS Mission Control
app_name = CyberRTS
app_logo = /public/img/cyberrts-logo.svg

[theme]
default_theme = dark

[live]
max_connections = 100
allowed_origins = http://localhost:8080

[auth.anonymous]
enabled = true
org_role = Viewer
```

#### Custom Theme (Cyan & Aerospace Orange):
```css
/* grafana/branding/theme.css */
:root {
    --cyberrts-cyan: #00ffff;
    --cyberrts-cyan-dark: #00cccc;
    --aerospace-orange: #ff6600;
    --aerospace-orange-dark: #cc5200;
    --background-primary: #0a0a0f;
    --background-secondary: #14141e;
}

/* Override Grafana colors with CyberRTS branding */
.navbar {
    background: linear-gradient(90deg, var(--background-primary) 0%, var(--background-secondary) 100%);
    border-bottom: 1px solid var(--cybertrs-cyan-dark);
}

.panel-title {
    color: var(--cybertrs-cyan);
    font-family: 'Orbitron', monospace;
    text-transform: uppercase;
}

/* Success/Info = Cyan */
.alert-success, .btn-success {
    background: var(--cybertrs-cyan-dark);
    border-color: var(--cybertrs-cyan);
}

/* Warning/Critical = Aerospace Orange */
.alert-warning, .btn-warning {
    background: var(--aerospace-orange-dark);
    border-color: var(--aerospace-orange);
}

/* Graph lines default colors */
.graph-legend-series--cyan {
    color: var(--cybertrs-cyan);
}

.graph-legend-series--orange {
    color: var(--aerospace-orange);
}

/* Side menu */
.sidemenu {
    background: var(--background-primary);
    border-right: 1px solid var(--cybertrs-cyan-dark);
}

.sidemenu-item.active {
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1));
    border-left: 3px solid var(--cybertrs-cyan);
}
```

#### Docker Compose:
```yaml
# grafana/docker-compose.yml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    container_name: leos-ro-grafana
    ports:
      - "3000:3000"
    volumes:
      - ./config/grafana.ini:/etc/grafana/grafana.ini
      - ./provisioning:/etc/grafana/provisioning
      - ./branding/logo.svg:/usr/share/grafana/public/img/grafana_icon.svg
      - ./branding/theme.css:/usr/share/grafana/public/build/theme.css
      - grafana-storage:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=redis-datasource,websocket-datasource
    restart: unless-stopped

volumes:
  grafana-storage:
```

### Phase 4: Grafana Dashboards

#### Mission Control Dashboard:
```json
{
  "dashboard": {
    "title": "CyberRTS MISSION CONTROL",
    "panels": [
      {
        "title": "OBJECTS TRACKED",
        "type": "stat",
        "targets": [{
          "channel": "leos-ro-stream",
          "path": "physics.total_objects"
        }],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "fixed",
              "fixedColor": "#00ffff"
            }
          }
        }
      },
      {
        "title": "ACTIVE CONJUNCTIONS",
        "type": "stat",
        "targets": [{
          "channel": "leos-ro-stream",
          "path": "conjunctions.critical_count"
        }],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds",
              "thresholds": [
                {"value": 0, "color": "#00ffff"},
                {"value": 1, "color": "#ff6600"}
              ]
            }
          }
        }
      },
      {
        "title": "CONJUNCTION TIMELINE",
        "type": "graph",
        "targets": [{
          "channel": "leos-ro-stream",
          "path": "conjunctions.active"
        }],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic",
              "seriesBy": "last",
              "palette": ["#00ffff", "#ff6600", "#00cccc", "#cc5200"]
            }
          }
        }
      }
    ]
  }
}
```

#### Conjunction Analysis Dashboard:
```json
{
  "dashboard": {
    "title": "CONJUNCTION ANALYSIS",
    "panels": [
      {
        "title": "RISK MATRIX",
        "type": "heatmap"
      },
      {
        "title": "PREDICTION TIMELINE",
        "type": "graph"
      },
      {
        "title": "CLOSEST APPROACHES",
        "type": "table"
      },
      {
        "title": "COLLISION PROBABILITY",
        "type": "gauge"
      }
    ]
  }
}
```

## Integration Points

### RED ORBIT → Grafana Data Flow:
```
1. Physics engine calculates positions
2. Conjunction detector finds close approaches
3. TelemetryStreamer packages data
4. WebSocket/HTTP POST to Grafana Live
5. Grafana displays real-time dashboards
```

### User Workflow:
```
1. Start RED ORBIT Engine (localhost:8080)
   - Pure simulation view
   - Settings popup for configuration

2. Start Grafana (localhost:3000)
   - All dashboards and analytics
   - Conjunction predictions
   - Historical analysis
   - Alert management

3. Two-monitor setup:
   - Monitor 1: RED ORBIT simulation
   - Monitor 2: Grafana Mission Control
```

## Build Scripts

### Package.json Updates:
```json
{
  "scripts": {
    "start": "npm run start:engine & npm run start:grafana",
    "start:engine": "webpack serve --config webpack.config.js",
    "start:grafana": "cd grafana && docker-compose up",
    "build": "npm run build:engine && npm run build:grafana",
    "build:engine": "webpack --config webpack.config.js",
    "build:grafana": "cd grafana && ./build-dashboards.sh"
  }
}
```

### Startup Script:
```bash
#!/bin/bash
# start-leos-ro.sh

echo "Starting LEOS-RO System..."

# Start Grafana
echo "Starting Grafana Mission Control..."
cd grafana
docker-compose up -d
cd ..

# Wait for Grafana to be ready
sleep 5

# Start RED ORBIT Engine
echo "Starting RED ORBIT Engine..."
npm run start:engine &

# Open both in browser
sleep 3
open http://localhost:8080  # Simulation
open http://localhost:3000  # Mission Control

echo "LEOS-RO System Ready!"
echo "Simulation: http://localhost:8080"
echo "Mission Control: http://localhost:3000"
```

## Development Workflow

### For Development:
1. Make changes to RED ORBIT engine physics/visualization
2. Telemetry automatically streams to Grafana
3. Update Grafana dashboards as JSON files
4. Commit both engine and Grafana configs to repo

### For Production:
1. Build minified RED ORBIT engine
2. Export Grafana dashboards as provisioning files
3. Package together for distribution

## Benefits of This Architecture

1. **Clean Separation** - Engine does physics, Grafana does analytics
2. **Professional** - Industry-standard monitoring stack
3. **Scalable** - Can add more Grafana instances
4. **Flexible** - Customers can use their own Grafana
5. **Maintainable** - Update dashboards without touching engine
6. **Performant** - UI rendering doesn't impact physics

## Next Steps

1. Remove all UI panels from current codebase
2. Implement TelemetryStreamer class
3. Create Grafana docker setup
4. Build conjunction analysis dashboards
5. Test two-window workflow
6. Create branded Grafana theme

## Testing Checklist

- [ ] RED ORBIT runs with minimal UI only
- [ ] Telemetry streams to Grafana successfully
- [ ] All conjunction data visible in Grafana
- [ ] Predictions and timeline work
- [ ] Alerts trigger in Grafana
- [ ] Performance improved without UI overhead
- [ ] Both systems start with single command
- [ ] Grafana shows LEOS-RO branding