# LEOS App.js Refactoring Plan

**Date:** June 20, 2025  
**Current State:** 1500+ line monolithic `app.js` file  
**Goal:** Modular, maintainable architecture leveraging existing frontend structure

## Current State Analysis

The `app.js` file currently handles:
- Scene initialization and Babylon.js setup (200+ lines)
- Ground station dashboard logic (300+ lines)
- Telemetry display and management
- Animation controls and solar panel logic
- Event handling and UI interactions
- Satellite selection and model viewer
- Time controls and simulation state
- Real-time updates and auto-refresh

## Existing Module Assessment

### **Strong Existing Modules (to be expanded):**
- ✅ `satellites.js` - Mesh creation, telemetry data (453 lines)
- ✅ `groundStations.js` - Station management, LOS calculations (656 lines)
- ✅ `sda-visualization.js` - Self-contained, well-structured (813 lines)
- ✅ `controls.js` - Basic keyboard controls (48 lines)
- ✅ `ui/manager.js` - UI management foundation (201 lines)

### **Existing Structure:**
```
frontend/js/
├── components/
│   ├── telemetry-card.js
│   └── telemetry-item.js
├── ui/
│   ├── brand-ui.js
│   ├── manager.js
│   ├── template-manager.js
│   └── templates.js
├── satellites.js
├── groundStations.js
├── sda-visualization.js
├── controls.js
└── app.js (1693 lines - TARGET FOR REFACTORING)
```

## Proposed Refactoring Strategy

### **Phase 1: Expand `groundStations.js` (Priority 1)**

**Rationale:** Already contains station operations, LOS calculations, and connection tracking.

**Move from app.js lines 80-400:**
```javascript
// Add these functions to groundStations.js:
export function showGroundStationDashboard(station)
export function closeGroundStationDashboard()
export function handleDashboardAutoRefresh()
export function updateDashboardConnections()
```

**Dashboard logic to extract:**
- Ground station selection event handling
- Real-time telemetry display generation
- LOS line drawing and animation
- Auto-refresh timer management
- Signal strength calculations
- Contact time estimations

### **Phase 2: Create New Module Directories**

#### **`scene/` directory:**
```
frontend/js/scene/
├── scene-manager.js      # Scene initialization, camera, lighting
├── animation-controller.js  # Solar panel animations, model viewer
└── render-manager.js     # Render loop, performance optimization
```

**`scene-manager.js` (extract from app.js lines 804-933):**
- `createScene()` function
- Camera setup and boundaries
- Lighting system configuration
- Engine optimization settings

**`animation-controller.js`:**
- Solar panel animation logic
- Model viewer state management
- Animation group controls

#### **`interactions/` directory:**
```
frontend/js/interactions/
├── event-manager.js      # Centralized event handling
└── time-controls.js      # Time control UI and logic
```

**`event-manager.js`:**
- All `addEventListener` calls from app.js
- Custom event dispatching
- Ground station selection events
- Keyboard shortcut handling

**`time-controls.js` (extract from app.js lines 753-803):**
- `setupTimeControls()` function
- Speed button controls
- Panel visibility management

### **Phase 3: Enhance Existing Modules**

#### **`satellites.js` enhancements:**
**Add from app.js lines 934-1600:**
- `initModelViewer()` function
- Model animation state management
- Satellite selection handling
- Solar panel animation coordination

#### **`ui/manager.js` enhancements:**
- Dashboard state coordination
- Panel show/hide orchestration
- Auto-refresh timer management
- UI state transitions

#### **`controls.js` expansions:**
- Expand from basic keyboard to full interaction handling
- Include dial action handling (`handleDialAction()`)
- Camera control improvements
- Integration with event manager

### **Phase 4: New Streamlined `app.js` (<200 lines)**

```javascript
// Orchestration-focused app.js
import { SceneManager } from './scene/scene-manager.js';
import { EventManager } from './interactions/event-manager.js';
import { AnimationController } from './scene/animation-controller.js';
import { createGroundStations } from './groundStations.js';
import { createSatellites } from './satellites.js';

export async function initApp() {
    // Initialize core systems
    const sceneManager = await SceneManager.initialize();
    const eventManager = new EventManager();
    const animationController = new AnimationController();
    
    // Setup world
    await Promise.all([
        createGroundStations(scene, advancedTexture),
        createSatellites(scene, satelliteData, orbitalElements),
        animationController.initialize()
    ]);
    
    // Setup interactions
    eventManager.setupEventListeners();
    
    // Start simulation
    startSimulationLoop();
}
```

## Implementation Details

### **Module Communication Strategy:**
- **Events:** Custom events for loose coupling
- **State Objects:** Shared state where needed (e.g., `simState`)
- **Direct Imports:** For utility functions and constants
- **Dependency Injection:** Pass scene, camera, etc. to modules

### **Key Interfaces:**

#### **Ground Station Dashboard Interface:**
```javascript
// In groundStations.js
export function showGroundStationDashboard(station) {
    // Generate telemetry card HTML
    // Calculate LOS connections
    // Setup real-time updates
    // Draw animated LOS lines
}

export function closeGroundStationDashboard() {
    // Clear LOS lines
    // Stop auto-refresh
    // Reset UI state
}
```

#### **Scene Management Interface:**
```javascript
// In scene/scene-manager.js
export class SceneManager {
    static async initialize() {
        // Create engine and scene
        // Setup camera and lighting
        // Configure performance settings
    }
}
```

#### **Event Management Interface:**
```javascript
// In interactions/event-manager.js
export class EventManager {
    setupEventListeners() {
        // Ground station selection
        // Keyboard shortcuts
        // UI interactions
    }
}
```

## Migration Checklist

### **Phase 1: Ground Station Dashboard**
- [ ] Extract dashboard HTML generation from app.js
- [ ] Move LOS line drawing logic to groundStations.js
- [ ] Implement auto-refresh in groundStations.js
- [ ] Test dashboard functionality
- [ ] Update imports in app.js

### **Phase 2: Scene Management**
- [ ] Create `scene/` directory
- [ ] Extract `createScene()` to scene-manager.js
- [ ] Move camera and lighting setup
- [ ] Test scene initialization
- [ ] Update app.js imports

### **Phase 3: Event Handling**
- [ ] Create `interactions/` directory
- [ ] Extract all event listeners to event-manager.js
- [ ] Move time controls to time-controls.js
- [ ] Test all interactions
- [ ] Update app.js orchestration

### **Phase 4: Animation & Model Logic**
- [ ] Move `initModelViewer()` to satellites.js
- [ ] Create animation-controller.js
- [ ] Test solar panel animations
- [ ] Test model viewer functionality
- [ ] Final app.js cleanup

## Benefits

1. **Maintainability:** Each module <300 lines with clear responsibilities
2. **Testability:** Smaller, focused modules easier to test
3. **Scalability:** New features can be added to appropriate modules
4. **Performance:** Better code splitting opportunities
5. **Developer Experience:** Easier to locate and modify specific functionality
6. **Leverage Existing:** Builds on current modular foundation

## Risks & Mitigation

**Risk:** Breaking existing functionality during migration  
**Mitigation:** Incremental migration with testing at each phase

**Risk:** Complex dependencies between modules  
**Mitigation:** Use event-driven architecture for loose coupling

**Risk:** Performance impact from module overhead  
**Mitigation:** Modern bundlers optimize module imports

## Post-Refactoring Structure

```
frontend/js/
├── components/
│   ├── telemetry-card.js
│   └── telemetry-item.js
├── ui/
│   ├── brand-ui.js
│   ├── manager.js (enhanced)
│   ├── template-manager.js
│   └── templates.js
├── scene/
│   ├── scene-manager.js (new)
│   ├── animation-controller.js (new)
│   └── render-manager.js (new)
├── interactions/
│   ├── event-manager.js (new)
│   └── time-controls.js (new)
├── satellites.js (enhanced)
├── groundStations.js (enhanced with dashboard)
├── sda-visualization.js
├── controls.js (enhanced)
└── app.js (streamlined <200 lines)
```

## Success Metrics

- [ ] app.js reduced from 1693 lines to <200 lines
- [ ] All existing functionality preserved
- [ ] No performance regression
- [ ] Improved code readability and maintainability
- [ ] Easier to add new features
- [ ] Better separation of concerns

---

**Next Steps:** Begin with Phase 1 - extracting ground station dashboard logic to `groundStations.js` as it provides the highest impact with lowest risk.
