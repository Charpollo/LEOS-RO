# Engineering Panel Option 2: Tab Interface
*Future Implementation Roadmap*

## Overview
Option 2 provides a persistent tab interface at the bottom of the screen for continuous monitoring and control during demonstrations. This design is optimized for live presentations and extended monitoring sessions.

## Design Specification

### Layout
```
┌──────────────────────────────────────────────────────────┐
│                    Main Viewport                          │
│                  (3D Visualization)                       │
│                                                           │
├──────────────────────────────────────────────────────────┤
│ Objects │ Scenarios │ Physics │ Conjunctions │ Export    │
├──────────────────────────────────────────────────────────┤
│                   Tab Content Area                        │
│                    (Height: 200px)                        │
└──────────────────────────────────────────────────────────┘
```

### Implementation Details

#### 1. Tab Bar Structure
- **Position**: Fixed bottom, full width
- **Height**: 40px for tab headers, 200px for content
- **Style**: Dark theme with red accent (matching Red Orbit brand)
- **Behavior**: Click to switch tabs, double-click to minimize

#### 2. Tab Contents

##### Objects Tab
```javascript
{
  layout: 'horizontal',
  sections: [
    'object_count_slider',     // Real-time adjustment
    'preset_buttons',          // Quick presets (15K, 55K, 91K, 200K, 1M)
    'live_counter',           // Current active objects
    'performance_meter'       // FPS and GPU usage
  ]
}
```

##### Scenarios Tab
```javascript
{
  layout: 'grid',
  columns: 3,
  scenarios: [
    'current_catalog',        // Today's tracked objects
    'starlink_full',         // Complete constellation
    'megaconstellations',    // All planned satellites
    'kessler_syndrome',      // Cascade simulation
    'historical_events',     // Fengyun, Cosmos collisions
    'stress_test'           // GPU maximum capacity
  ]
}
```

##### Physics Tab
```javascript
{
  layout: 'dashboard',
  displays: [
    'gravitational_parameter',  // μ = 398,600.4418 km³/s²
    'integration_method',       // GPU Euler @ 60Hz
    'time_acceleration',        // 1x, 60x, 600x, 3600x
    'collision_threshold',      // Distance in km
    'atmospheric_drag',         // On/off toggle
    'debris_generation'         // NASA breakup model
  ]
}
```

##### Conjunctions Tab
```javascript
{
  layout: 'split',
  left: 'active_conjunctions_list',
  right: 'conjunction_statistics',
  features: [
    'real_time_updates',
    'risk_assessment',
    'probability_calculations',
    'time_to_closest_approach',
    'avoidance_maneuvers'
  ]
}
```

##### Export Tab
```javascript
{
  layout: 'vertical',
  options: [
    'telemetry_json',          // Raw data export
    'grafana_webhook',         // Real-time streaming
    'csv_download',            // Spreadsheet format
    'video_capture',           // Record demonstration
    'snapshot_state'           // Save current configuration
  ]
}
```

### 3. Technical Implementation

#### File Structure
```
frontend/js/ui/
├── engineering-tabs.js       # Main tab controller
├── tabs/
│   ├── objects-tab.js        # Object management
│   ├── scenarios-tab.js      # Scenario loader
│   ├── physics-tab.js        # Physics controls
│   ├── conjunctions-tab.js   # Conjunction monitor
│   └── export-tab.js         # Data export
└── styles/
    └── engineering-tabs.css   # Tab styling
```

#### Core Module
```javascript
export class EngineeringTabs {
    constructor() {
        this.activeTab = 'objects';
        this.minimized = false;
        this.container = null;
        this.tabs = new Map();
    }
    
    initialize() {
        this.createContainer();
        this.registerTabs();
        this.setupKeyboardShortcuts();
        this.attachToViewport();
    }
    
    registerTab(name, component) {
        this.tabs.set(name, component);
    }
    
    switchTab(tabName) {
        if (!this.tabs.has(tabName)) return;
        
        // Hide all tabs
        this.tabs.forEach(tab => tab.hide());
        
        // Show selected tab
        const selectedTab = this.tabs.get(tabName);
        selectedTab.show();
        this.activeTab = tabName;
        
        // Update visual state
        this.updateTabButtons();
    }
    
    minimize() {
        this.container.style.height = '40px';
        this.minimized = true;
    }
    
    restore() {
        this.container.style.height = '240px';
        this.minimized = false;
    }
}
```

### 4. Advantages of Tab Interface

#### For Engineers
- **Persistent Monitoring**: Always visible during testing
- **Quick Access**: No need to open/close panels
- **Multi-tasking**: Monitor multiple aspects simultaneously
- **Keyboard Shortcuts**: Tab switching via number keys

#### For Demonstrations
- **Professional Appearance**: Clean, organized interface
- **Easy Navigation**: Clear tab labels
- **Live Updates**: Real-time data visible at all times
- **Screen Recording Friendly**: UI stays in predictable location

### 5. WebSocket Integration for Grafana

```javascript
class TelemetryExporter {
    constructor() {
        this.websocket = null;
        this.grafanaEndpoint = 'ws://localhost:3000/api/live/push';
    }
    
    connect() {
        this.websocket = new WebSocket(this.grafanaEndpoint);
        this.websocket.onopen = () => this.startStreaming();
    }
    
    startStreaming() {
        setInterval(() => {
            const telemetry = {
                timestamp: Date.now(),
                objects: window.gpuPhysicsEngine.activeObjects,
                fps: window.engine.getFps(),
                conjunctions: window.conjunctionHistory.getActiveConjunctions().length,
                debris: window.gpuPhysicsEngine.debrisGenerated
            };
            
            this.websocket.send(JSON.stringify(telemetry));
        }, 1000);
    }
}
```

### 6. Migration Path from Option 1

1. **Keep Option 1**: Modal panel remains for focused configuration
2. **Add Option 2**: Tabs for continuous monitoring
3. **User Choice**: Settings to choose preferred interface
4. **Hybrid Mode**: Use modal for setup, tabs for monitoring

### 7. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Alt+1 | Objects Tab |
| Alt+2 | Scenarios Tab |
| Alt+3 | Physics Tab |
| Alt+4 | Conjunctions Tab |
| Alt+5 | Export Tab |
| Alt+M | Minimize/Restore |
| Alt+H | Hide Tabs |

### 8. Performance Considerations

- **Lazy Loading**: Only active tab updates
- **Throttling**: Update rates limited to 10Hz
- **Virtual Scrolling**: For large conjunction lists
- **GPU Offloading**: Charts rendered via WebGL

### 9. Future Enhancements

- **Tab Persistence**: Save tab configurations
- **Custom Tabs**: User-defined monitoring panels
- **Tab Sharing**: Export tab layouts to colleagues
- **Mobile Support**: Touch-friendly tab interface
- **Voice Control**: "Switch to physics tab"

## Implementation Timeline

### Phase 1: Core Structure (Week 1)
- Create tab container and styling
- Implement tab switching logic
- Set up keyboard shortcuts

### Phase 2: Tab Content (Week 2)
- Port Option 1 features to tabs
- Add real-time updates
- Implement minimize/restore

### Phase 3: Advanced Features (Week 3)
- WebSocket integration
- Grafana connection
- Export functionality

### Phase 4: Polish (Week 4)
- Performance optimization
- User preferences
- Documentation

## Conclusion

Option 2 provides a professional, always-available interface perfect for engineering work and demonstrations. The tab design ensures critical information is always visible while maintaining a clean, organized appearance suitable for showcasing to stakeholders.

The implementation can coexist with Option 1, giving users flexibility to choose their preferred workflow - modal for configuration, tabs for monitoring, or both as needed.