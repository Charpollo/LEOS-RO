# Proximity Visualization System
*Inspired by the particle connection effect in login.html*

## Overview
Implement dynamic proximity lines between space objects that appear when they get within collision/conjunction distance, similar to the beautiful particle effect on our login page.

## Core Concept
When any two objects (satellites, debris, ASATs) get within a defined threshold distance, automatically draw a connecting line between them with visual properties that indicate:
- Distance (line opacity/thickness)
- Threat level (color: red=danger, yellow=warning, blue=formation)
- Relative velocity (animated dash pattern for approaching objects)

## Implementation Details

### Distance Thresholds
```javascript
const PROXIMITY_LEVELS = {
    COLLISION: 1,      // < 1 km - RED ALERT
    CRITICAL: 5,       // < 5 km - Orange warning  
    CONJUNCTION: 10,   // < 10 km - Yellow caution
    AWARENESS: 25,     // < 25 km - White awareness
    FORMATION: 50      // < 50 km - Blue for friendly formations
};
```

### Visual Properties
- **Line Color**: Based on threat level and closing velocity
- **Line Opacity**: Stronger as objects get closer (like login page effect)
- **Line Width**: Thicker for more critical conjunctions
- **Animation**: Pulsing for active threats, static for stable formations

### Performance Optimization
- Use spatial indexing (octree) to avoid O(n²) distance checks
- Only check objects in same orbital regime
- Update proximity lines at 5 Hz (not every frame)
- Maximum 100 lines displayed at once (prioritize by threat)

### 3D Rendering in Babylon.js
```javascript
// Pseudo-code for proximity line system
class ProximityLineSystem {
    constructor(scene) {
        this.lines = [];
        this.linePool = []; // Object pooling for performance
        this.spatialIndex = new Octree();
    }
    
    update(objects) {
        // Clear previous frame
        this.clearLines();
        
        // Find nearby pairs using spatial index
        const proximityPairs = this.spatialIndex.findProximityPairs(
            objects, 
            PROXIMITY_LEVELS.AWARENESS
        );
        
        // Create lines for each pair
        proximityPairs.forEach(pair => {
            const distance = BABYLON.Vector3.Distance(
                pair.obj1.position,
                pair.obj2.position
            );
            
            const line = this.getLineFromPool();
            this.configureLine(line, pair, distance);
            this.lines.push(line);
        });
    }
    
    configureLine(line, pair, distance) {
        // Set line points
        line.setPoints([pair.obj1.position, pair.obj2.position]);
        
        // Set color based on threat
        if (distance < PROXIMITY_LEVELS.COLLISION) {
            line.color = new BABYLON.Color3(1, 0, 0); // Red
            line.alpha = 0.9;
        } else if (distance < PROXIMITY_LEVELS.CRITICAL) {
            line.color = new BABYLON.Color3(1, 0.5, 0); // Orange
            line.alpha = 0.7;
        } else if (distance < PROXIMITY_LEVELS.CONJUNCTION) {
            line.color = new BABYLON.Color3(1, 1, 0); // Yellow
            line.alpha = 0.5;
        } else {
            line.color = new BABYLON.Color3(1, 1, 1); // White
            line.alpha = 0.2 * (1 - distance/PROXIMITY_LEVELS.AWARENESS);
        }
    }
}
```

## User Interface Integration

### Toggle Controls
- **P key**: Toggle proximity lines on/off
- **Shift+P**: Cycle through display modes (all/threats only/formations only)
- **UI Panel**: Slider to adjust distance thresholds

### Information Display
When hovering over a proximity line:
- Distance between objects
- Relative velocity
- Time to closest approach (TCA)
- Probability of collision (PoC)

## Use Cases

### 1. Collision Avoidance
- Real-time conjunction assessment
- Visual warning system for operators
- Automatic alert generation

### 2. Formation Flying
- Visualize satellite constellations
- Monitor formation integrity
- Identify drift/deviation

### 3. Debris Field Analysis
- Show relationships between debris pieces
- Identify expanding debris clouds
- Track fragmentation events

### 4. ASAT Threat Assessment
- Visualize intercept trajectories
- Show danger zones around targets
- Display evasion opportunities

## Implementation Phases

### Phase 1: Basic Proximity Lines (Week 1)
- Simple distance-based lines
- Color coding by distance
- Basic on/off toggle

### Phase 2: Performance Optimization (Week 2)
- Implement octree spatial indexing
- Add object pooling for lines
- Optimize render calls

### Phase 3: Advanced Features (Week 3)
- Relative velocity indicators
- TCA calculations
- Collision probability display

### Phase 4: UI Integration (Week 4)
- Control panel
- Hotkeys
- Information overlays

## Technical Requirements
- Babylon.js 5.x for 3D rendering
- Octree.js for spatial indexing
- Web Workers for distance calculations (optional)

## Performance Targets
- Handle 15,000 objects
- Maintain 60 FPS with lines active
- < 100ms update time for proximity calculations

## Visual Reference
The effect should look similar to the particle connection system in `/frontend/login.html` (lines 456-469) but adapted for 3D space with threat-based coloring and orbital dynamics considerations.

## Success Metrics
- Operators can identify potential conjunctions at a glance
- System provides 5+ minutes warning for collision threats
- Formation flying satellites show clear relationship lines
- Performance impact < 10% FPS drop

## Future Enhancements
- Machine learning for collision probability
- Predictive lines showing future positions
- Integration with maneuver planning system
- AR/VR mode with proximity haptic feedback