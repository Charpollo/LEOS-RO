# RED WATCH TELEMETRY DATA FORMAT

## Overview
Red Orbit streams real-time telemetry data to Red Watch via WebSocket at `ws://localhost:8000/ws/ingest`
- **Update Rate**: 10Hz (100ms intervals)
- **Objects**: 30,000 simulated / 15,000 rendered (optimized for real-time)
- **Format**: JSON with full orbital parameters

## Complete Data Structure

```json
{
  "type": "telemetry",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "objects": [...],      // Array of 30,000 space objects
    "metrics": {...},      // System performance metrics
    "conjunctions": [...], // Close approach events
    "alerts": [...]        // Active warnings
  }
}
```

## Object Data Structure (30,000 objects)

Each object contains:

```json
{
  "id": "OBJ-12345",
  "name": "Satellite-12345", // or "Debris-12345"
  "type": "satellite",       // or "debris"
  "status": "active",
  
  // Real-time Position (meters)
  "position": {
    "x": 7000000.0,   // meters from Earth center
    "y": 0.0,
    "z": 0.0
  },
  
  // Real-time Velocity (m/s)
  "velocity": {
    "x": 7500.0,      // meters per second
    "y": 0.0,
    "z": 0.0
  },
  
  // Complete Orbital Elements
  "orbital_elements": {
    "altitude": "629.0",           // km above Earth surface
    "speed": "7500.0",             // m/s orbital velocity
    "semi_major_axis": "7000.0",  // km orbit size
    "eccentricity": "0.0010",     // 0=circular, 1=parabolic
    "inclination": "28.50",        // degrees from equator
    "apogee": "635.0",            // km highest point
    "perigee": "623.0",           // km lowest point  
    "period": "97.2"              // minutes per orbit
  },
  
  // Physical Properties
  "mass": 500.0,      // kg
  "altitude": 629.0,  // km (backward compatibility)
  
  // Risk Assessment
  "risk": 75,         // 0-100 collision risk score
                      // 75+ for <600km (LEO congestion)
                      // 50-75 for 600-2000km
                      // +10 for eccentric orbits
  
  "last_updated": "2024-01-01T00:00:00.000Z"
}
```

## System Metrics Structure

```json
{
  "objects_tracked": 30000,      // Total simulated objects
  "objects_rendered": 15000,     // Visible objects (2:1 ratio)
  "cpu_usage": 45.2,            // Percentage (0-100)
  "memory_mb": 2048.5,          // Memory usage in MB
  "fps": 60,                    // Frames per second
  "time_scale": 1,              // Simulation speed multiplier
  "collision_checks": 450000,   // Active collision calculations
  "kessler_active": false,      // Kessler syndrome status
  "debris_generated": 0,        // New debris from collisions
  "cache_hits": 1500,           // Data cache performance
  "cache_misses": 10,
  "gpu_reads": 100,             // GPU data transfers
  "simulation_time": "2024-01-01T00:00:00.000Z"
}
```

## Conjunction Events Structure

```json
{
  "id": "CONJ-123456789",
  "object1": "OBJ-100",
  "object2": "OBJ-200", 
  "tca": "2024-01-01T12:00:00.000Z",  // Time of Closest Approach
  "miss_distance": 0.5,                // km minimum separation
  "probability": 0.0001,               // Collision probability (0-1)
  "status": "monitoring"               // monitoring/warning/critical
}
```

## Alert Structure

```json
{
  "id": "KESSLER-ACTIVE",
  "severity": "critical",        // info/warning/critical
  "type": "system",             // system/collision/performance
  "message": "Kessler Syndrome cascade in progress",
  "details": {
    "debris_generated": 50000   // Additional context data
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Alert Types

1. **Kessler Syndrome Alert**
   - ID: `KESSLER-ACTIVE`
   - Triggered when cascade collision event begins
   - Includes debris generation count

2. **High Object Count Alert**
   - ID: `HIGH-OBJECT-COUNT`
   - Triggered when objects exceed 1,000,000
   - Performance warning

3. **Collision Warning**
   - ID: `COLLISION-IMMINENT-{id}`
   - Triggered for high probability conjunctions
   - Includes affected objects

## Data Volume

- **Per Message Size**: ~3-5 MB (30,000 objects)
- **Data Rate**: 30-50 MB/s at 10Hz
- **Network Protocol**: WebSocket binary frames
- **Compression**: Optional gzip for large deployments

## Integration Notes

1. **Connection**: WebSocket to `ws://localhost:8000/ws/ingest`
2. **Authentication**: None required for local development
3. **Reconnection**: Automatic with 1-second delay
4. **Error Handling**: Graceful degradation on connection loss
5. **Buffering**: 1-second cache for performance

## Red Watch Display Expectations

With this data, Red Watch should display:

1. **3D Visualization**
   - 15,000 rendered objects in real-time
   - Color-coded by altitude/risk
   - Orbital tracks

2. **Risk Heat Map**
   - Altitude-based congestion zones
   - High-risk regions (LEO <600km)
   - Kessler syndrome indicators

3. **Metrics Dashboard**
   - FPS and performance metrics
   - Object count trends
   - Collision probability graphs
   - Debris generation rates

4. **Conjunction Analysis**
   - Time to closest approach
   - Miss distance predictions
   - Probability calculations
   - Alert prioritization

5. **Alert Panel**
   - Real-time warnings
   - Kessler syndrome status
   - System health indicators

## Example WebSocket Client

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/ingest');

ws.onmessage = (event) => {
  const telemetry = JSON.parse(event.data);
  
  // Process objects
  telemetry.data.objects.forEach(obj => {
    // Update 3D positions
    updateObjectPosition(obj.id, obj.position);
    
    // Check risk levels
    if (obj.risk > 75) {
      highlightHighRisk(obj.id);
    }
    
    // Display orbital elements
    displayOrbitalData(obj.id, obj.orbital_elements);
  });
  
  // Update metrics
  updateDashboard(telemetry.data.metrics);
  
  // Process conjunctions
  telemetry.data.conjunctions.forEach(conj => {
    if (conj.probability > 0.001) {
      showConjunctionWarning(conj);
    }
  });
  
  // Handle alerts
  telemetry.data.alerts.forEach(alert => {
    if (alert.severity === 'critical') {
      showCriticalAlert(alert);
    }
  });
};
```

## Performance Optimization

For best real-time performance:
1. Use binary WebSocket frames when possible
2. Implement client-side buffering
3. Update UI at 30-60 FPS max
4. Use WebGL for 3D rendering
5. Implement level-of-detail for distant objects