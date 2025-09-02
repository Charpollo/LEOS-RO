# Red Orbit Data Ingestion Guide

## Overview
Red Orbit provides multiple methods to ingest data into the Red Watch platform for real-time space situational awareness and telemetry monitoring. This guide covers both streaming real-time data via WebSocket and uploading static telemetry files.

## Table of Contents
1. [Real-Time Streaming Data](#real-time-streaming-data)
2. [Static File Upload](#static-file-upload)
3. [Data Formats](#data-formats)
4. [Integration Examples](#integration-examples)
5. [Performance Considerations](#performance-considerations)
6. [Troubleshooting](#troubleshooting)

---

## Real-Time Streaming Data

### WebSocket Connection
Red Watch accepts real-time telemetry data through a WebSocket endpoint that processes and broadcasts data to all connected visualization clients.

#### Endpoint
```
ws://localhost:8000/ws/ingest
```

#### Connection Requirements
- **Protocol**: WebSocket (ws://)
- **Port**: 8000
- **Authentication**: None required for local development
- **Auto-reconnect**: Recommended with 1-second delay
- **Message Format**: JSON

#### Data Structure
Send telemetry data in the following JSON format:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "objects": [
      {
        "id": "OBJ-12345",
        "name": "Satellite-12345",
        "type": "satellite",
        "status": "active",
        "position": {
          "x": 7000000.0,  // meters from Earth center
          "y": 0.0,
          "z": 0.0
        },
        "velocity": {
          "x": 7500.0,  // meters per second
          "y": 0.0,
          "z": 0.0
        },
        "orbital_elements": {
          "altitude": "629.0",
          "speed": "7500.0",
          "semi_major_axis": "7000.0",
          "eccentricity": "0.0010",
          "inclination": "28.50",
          "apogee": "635.0",
          "perigee": "623.0",
          "period": "97.2"
        },
        "mass": 500.0,
        "risk": 75
      }
    ],
    "metrics": {
      "objects_tracked": 30000,
      "cpu_usage": 45.2,
      "memory_mb": 2048.5,
      "fps": 60
    },
    "conjunctions": [],
    "alerts": []
  }
}
```

### Implementation Examples

#### Python Client
```python
import websocket
import json
import time

def connect_to_red_watch():
    ws = websocket.WebSocket()
    ws.connect("ws://localhost:8000/ws/ingest")
    
    while True:
        telemetry_data = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "data": {
                "objects": generate_satellite_data(),
                "metrics": get_system_metrics(),
                "conjunctions": check_conjunctions(),
                "alerts": get_active_alerts()
            }
        }
        
        ws.send(json.dumps(telemetry_data))
        time.sleep(0.1)  # 10Hz update rate

ws = connect_to_red_watch()
```

#### Node.js Client
```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000/ws/ingest');

ws.on('open', () => {
    console.log('Connected to Red Watch');
    
    setInterval(() => {
        const telemetryData = {
            timestamp: new Date().toISOString(),
            data: {
                objects: generateSatelliteData(),
                metrics: getSystemMetrics(),
                conjunctions: checkConjunctions(),
                alerts: getActiveAlerts()
            }
        };
        
        ws.send(JSON.stringify(telemetryData));
    }, 100); // 10Hz update rate
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    // Implement reconnection logic
});
```

#### cURL Example (Single Message)
```bash
curl --include \
     --no-buffer \
     --header "Connection: Upgrade" \
     --header "Upgrade: websocket" \
     --header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     --header "Sec-WebSocket-Version: 13" \
     http://localhost:8000/ws/ingest
```

### Streaming Performance
- **Update Rate**: 10Hz (100ms intervals) recommended
- **Message Size**: ~3-5 MB for 30,000 objects
- **Bandwidth**: 30-50 MB/s at full rate
- **Latency**: <10ms local, <100ms network

---

## Static File Upload

### Browser-Based Upload
Red Watch provides a web interface for uploading telemetry files directly through the browser.

#### Steps to Upload
1. Open Red Watch in your browser at `http://localhost:3000`
2. Click the "Upload Telemetry" button in the interface
3. Select your `.telemetry` file
4. The system will parse and display the data automatically

### File Format
Red Watch accepts `.telemetry` files in JSONL (JSON Lines) format where each line is a valid JSON object.

#### Example Telemetry File Structure
```jsonl
{"timestamp":"2025-01-01T00:00:00Z","tick":0,"in_eclipse":false,"position_eci":[2444.97,-4680.52,4287.86],"velocity_eci":[4.52,-2.73,-5.55],"systems":{"thermal":{"altitude_km":431.27,"temperature_c":0.54,"thermal_power_w":62.22}}}
{"timestamp":"2025-01-01T00:00:10Z","tick":1,"in_eclipse":false,"position_eci":[2449.50,-4683.26,4282.28],"velocity_eci":[4.51,-2.72,-5.55],"systems":{"thermal":{"altitude_km":431.27,"temperature_c":1.15,"thermal_power_w":61.91}}}
```

### Programmatic File Upload
While Red Watch currently uses client-side file parsing, you can programmatically convert and stream file data through the WebSocket endpoint.

#### Python File Streamer
```python
import json
import websocket
import time

def stream_telemetry_file(filepath):
    ws = websocket.WebSocket()
    ws.connect("ws://localhost:8000/ws/ingest")
    
    with open(filepath, 'r') as file:
        objects = []
        for line in file:
            entry = json.loads(line)
            
            # Convert telemetry format to Red Watch format
            satellite_object = {
                "id": f"SAT-{entry['tick']}",
                "name": filepath.split('/')[-1].replace('.telemetry', ''),
                "type": "satellite",
                "status": "active",
                "position": {
                    "x": entry['position_eci'][0] * 1000,  # km to meters
                    "y": entry['position_eci'][1] * 1000,
                    "z": entry['position_eci'][2] * 1000
                },
                "velocity": {
                    "x": entry['velocity_eci'][0] * 1000,  # km/s to m/s
                    "y": entry['velocity_eci'][1] * 1000,
                    "z": entry['velocity_eci'][2] * 1000
                },
                "orbital_elements": {
                    "altitude": str(entry['systems']['thermal']['altitude_km'])
                },
                "risk": 50
            }
            objects.append(satellite_object)
            
            # Send batch every 100 objects
            if len(objects) >= 100:
                message = {
                    "timestamp": entry['timestamp'],
                    "data": {
                        "objects": objects,
                        "metrics": {},
                        "conjunctions": [],
                        "alerts": []
                    }
                }
                ws.send(json.dumps(message))
                objects = []
                time.sleep(0.1)  # Rate limiting
    
    ws.close()

# Usage
stream_telemetry_file('/path/to/SATELLITE.telemetry')
```

---

## Data Formats

### Object Properties

| Field | Type | Description | Unit |
|-------|------|-------------|------|
| id | string | Unique identifier | - |
| name | string | Object name | - |
| type | string | "satellite" or "debris" | - |
| position.x/y/z | float | Position in ECI frame | meters |
| velocity.x/y/z | float | Velocity vector | m/s |
| orbital_elements.altitude | string | Altitude above surface | km |
| orbital_elements.inclination | string | Orbital inclination | degrees |
| orbital_elements.eccentricity | string | Orbital eccentricity | 0-1 |
| orbital_elements.period | string | Orbital period | minutes |
| risk | integer | Collision risk score | 0-100 |

### System Metrics

| Field | Type | Description |
|-------|------|-------------|
| objects_tracked | integer | Total objects being tracked |
| cpu_usage | float | CPU utilization percentage |
| memory_mb | float | Memory usage in megabytes |
| fps | integer | Rendering frames per second |

### Conjunction Events

```json
{
  "id": "CONJ-123456",
  "object1": "OBJ-100",
  "object2": "OBJ-200",
  "tca": "2024-01-01T12:00:00Z",
  "miss_distance": 0.5,
  "probability": 0.0001,
  "status": "monitoring"
}
```

### Alert Structure

```json
{
  "id": "ALERT-001",
  "severity": "warning",
  "type": "collision",
  "message": "Close approach detected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Integration Examples

### Satellite Tracking System Integration
```python
from satellite_tracker import SatelliteTracker
import websocket
import json

class RedWatchIntegration:
    def __init__(self):
        self.tracker = SatelliteTracker()
        self.ws = websocket.WebSocket()
        self.ws.connect("ws://localhost:8000/ws/ingest")
    
    def stream_tracking_data(self):
        while True:
            satellites = self.tracker.get_all_positions()
            
            objects = []
            for sat in satellites:
                objects.append({
                    "id": sat.norad_id,
                    "name": sat.name,
                    "type": "satellite",
                    "position": {
                        "x": sat.position_eci[0],
                        "y": sat.position_eci[1],
                        "z": sat.position_eci[2]
                    },
                    "velocity": {
                        "x": sat.velocity_eci[0],
                        "y": sat.velocity_eci[1],
                        "z": sat.velocity_eci[2]
                    },
                    "orbital_elements": {
                        "altitude": str(sat.altitude_km),
                        "inclination": str(sat.inclination),
                        "period": str(sat.period_minutes)
                    },
                    "risk": self.calculate_risk(sat)
                })
            
            message = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "objects": objects,
                    "metrics": self.tracker.get_metrics(),
                    "conjunctions": self.tracker.get_conjunctions(),
                    "alerts": self.tracker.get_alerts()
                }
            }
            
            self.ws.send(json.dumps(message))
            time.sleep(0.1)  # 10Hz update
```

### TLE Data Converter
```python
from sgp4.api import Satrec
from sgp4.api import jday
import json
import websocket

def tle_to_redwatch(tle_line1, tle_line2):
    satellite = Satrec.twoline2rv(tle_line1, tle_line2)
    
    # Current time
    jd, fr = jday(2024, 1, 1, 0, 0, 0)
    
    # Propagate
    e, r, v = satellite.sgp4(jd, fr)
    
    if e == 0:  # Success
        return {
            "position": {
                "x": r[0] * 1000,  # km to m
                "y": r[1] * 1000,
                "z": r[2] * 1000
            },
            "velocity": {
                "x": v[0] * 1000,  # km/s to m/s
                "y": v[1] * 1000,
                "z": v[2] * 1000
            }
        }
    return None

# Stream TLE data
ws = websocket.WebSocket()
ws.connect("ws://localhost:8000/ws/ingest")

with open('active_satellites.txt', 'r') as f:
    lines = f.readlines()
    
    objects = []
    for i in range(0, len(lines), 3):
        name = lines[i].strip()
        tle1 = lines[i+1].strip()
        tle2 = lines[i+2].strip()
        
        state = tle_to_redwatch(tle1, tle2)
        if state:
            objects.append({
                "id": f"SAT-{i//3}",
                "name": name,
                "type": "satellite",
                **state,
                "risk": 50
            })
    
    message = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {
            "objects": objects,
            "metrics": {},
            "conjunctions": [],
            "alerts": []
        }
    }
    
    ws.send(json.dumps(message))
```

---

## Performance Considerations

### Optimization Tips

1. **Batch Updates**: Send multiple objects in a single message rather than individual updates
2. **Data Compression**: For large datasets (>1000 objects), consider gzip compression
3. **Sampling**: For visualization, Red Watch renders 15,000 of 30,000 objects - prioritize important objects
4. **Update Frequency**: 10Hz is optimal; higher rates may not improve visualization
5. **Connection Pooling**: Maintain persistent WebSocket connections rather than reconnecting

### Resource Requirements

| Objects | Message Size | Bandwidth (10Hz) | CPU Usage | Memory |
|---------|-------------|------------------|-----------|---------|
| 100 | ~30 KB | 300 KB/s | <5% | 50 MB |
| 1,000 | ~300 KB | 3 MB/s | 10% | 200 MB |
| 10,000 | ~3 MB | 30 MB/s | 30% | 1 GB |
| 30,000 | ~5 MB | 50 MB/s | 45% | 2 GB |

### Network Configuration

```javascript
// Optimal WebSocket configuration
const ws = new WebSocket('ws://localhost:8000/ws/ingest', {
    perMessageDeflate: true,  // Enable compression
    maxPayload: 10 * 1024 * 1024,  // 10MB max message
    handshakeTimeout: 5000,  // 5 second timeout
});

// Implement reconnection
ws.on('close', () => {
    setTimeout(() => {
        reconnect();
    }, 1000);  // 1 second delay
});
```

---

## Troubleshooting

### Common Issues

#### Connection Refused
```
Error: ECONNREFUSED 127.0.0.1:8000
```
**Solution**: Ensure Red Watch backend is running on port 8000

#### Large Message Rejection
```
Error: Payload Too Large
```
**Solution**: Split data into smaller batches (<5MB per message)

#### Data Not Displaying
**Checklist**:
1. Verify JSON format is valid
2. Check timestamp format (ISO 8601)
3. Ensure position/velocity units are correct (meters, m/s)
4. Confirm object IDs are unique

#### High Latency
**Optimizations**:
1. Reduce update frequency to 5-10Hz
2. Sample data (send every Nth object)
3. Enable WebSocket compression
4. Use binary frames instead of text

### Debug Mode

Enable debug logging to troubleshoot data flow:

```javascript
// Frontend console
localStorage.setItem('DEBUG', 'websocket:*');

// Backend logs
tail -f red-watch-backend.log | grep "ingest"
```

### Health Check

Verify system status:
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "operational",
  "service": "RED WATCH",
  "clients": 2
}
```

---

## Security Considerations

### Production Deployment

1. **Authentication**: Implement JWT or API key authentication for the WebSocket endpoint
2. **Encryption**: Use WSS (WebSocket Secure) with TLS certificates
3. **Rate Limiting**: Implement connection and message rate limits
4. **Input Validation**: Validate all incoming data against schema
5. **Access Control**: Restrict endpoint access by IP or network

### Example Secure Configuration

```javascript
// Secure WebSocket with authentication
const ws = new WebSocket('wss://redwatch.example.com/ws/ingest', {
    headers: {
        'Authorization': 'Bearer YOUR_API_TOKEN'
    },
    rejectUnauthorized: true,
    ca: fs.readFileSync('ca-cert.pem')
});
```