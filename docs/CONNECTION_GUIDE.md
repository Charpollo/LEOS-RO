# RED WATCH Connection Guide

## Overview

RED WATCH is a real-time mission control visualization platform that accepts telemetry data via WebSocket connections. This guide explains how to connect external systems (like RED ORBIT) to stream data into RED WATCH.

---

## Connection Architecture

```
┌─────────────┐       WebSocket        ┌─────────────┐       WebSocket        ┌─────────────┐
│  RED ORBIT  │  ──────────────────►   │  RED WATCH  │  ──────────────────►   │   Frontend  │
│  Simulator  │   ws://localhost:8000   │   Backend   │   ws://localhost:8000   │  Dashboard  │
└─────────────┘     /ws/ingest         └─────────────┘      /ws/stream        └─────────────┘
```

---

## WebSocket Endpoints

### 1. Data Ingestion Endpoint (For Data Sources)
**URL:** `ws://localhost:8000/ws/ingest`  
**Purpose:** Receive telemetry data from external systems  
**Direction:** External System → RED WATCH

### 2. Data Streaming Endpoint (For Frontend)
**URL:** `ws://localhost:8000/ws/stream`  
**Purpose:** Stream processed data to visualization dashboard  
**Direction:** RED WATCH → Frontend

---

## Data Format Specification

All data must be sent as JSON messages over the WebSocket connection.

### Message Structure

```json
{
  "type": "telemetry",
  "timestamp": "2025-08-18T12:00:00Z",
  "data": {
    "objects": [...],
    "metrics": {...},
    "alerts": [...],
    "conjunctions": [...]
  }
}
```

### Object Data Format

```json
{
  "objects": [
    {
      "id": "SAT-001",
      "name": "Satellite Alpha",
      "type": "satellite",        // satellite, debris, rocket, station
      "position": {
        "x": 7000000,              // meters from Earth center
        "y": 0,
        "z": 0
      },
      "velocity": {
        "x": 0,                    // meters per second
        "y": 7500,
        "z": 0
      },
      "altitude": 400,             // km above Earth surface
      "inclination": 51.6,         // degrees
      "eccentricity": 0.0001,
      "risk": 25,                  // 0-100 collision risk score
      "status": "active",          // active, inactive, decaying
      "last_updated": "2025-08-18T12:00:00Z"
    }
  ]
}
```

### Metrics Data Format

```json
{
  "metrics": {
    "objects_tracked": 150,
    "cpu_usage": 45.2,            // percentage
    "memory_mb": 512,              // megabytes
    "latency_ms": 12.5,            // milliseconds
    "data_rate_mbps": 1.2,         // megabits per second
    "active_connections": 3,
    "simulation_time": "2025-08-18T12:00:00Z",
    "time_scale": 1.0              // 1.0 = real-time, 10.0 = 10x speed
  }
}
```

### Alert Data Format

```json
{
  "alerts": [
    {
      "id": "ALERT-001",
      "timestamp": "2025-08-18T12:00:00Z",
      "severity": "critical",      // critical, warning, info
      "type": "conjunction",        // conjunction, decay, comms_loss, system
      "message": "High probability conjunction detected",
      "details": {
        "object1_id": "SAT-001",
        "object2_id": "DEB-456",
        "time_to_closest": "00:15:30",
        "miss_distance": 250        // meters
      },
      "acknowledged": false,
      "auto_resolve": false
    }
  ]
}
```

### Conjunction Data Format

```json
{
  "conjunctions": [
    {
      "id": "CONJ-001",
      "object1": "SAT-001",
      "object2": "DEB-456",
      "time_of_closest_approach": "2025-08-18T12:15:30Z",
      "time_to_closest": "00:15:30",
      "probability": 85.5,          // percentage
      "miss_distance": 250,          // meters
      "relative_velocity": 14000,    // meters per second
      "status": "monitoring"         // monitoring, warning, critical
    }
  ]
}
```

---

## Connection Implementation

### Python Example (RED ORBIT)

```python
import asyncio
import websockets
import json
from datetime import datetime

async def send_telemetry():
    uri = "ws://localhost:8000/ws/ingest"
    
    async with websockets.connect(uri) as websocket:
        while True:
            # Prepare telemetry data
            telemetry = {
                "type": "telemetry",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "objects": get_satellite_data(),
                    "metrics": get_system_metrics(),
                    "alerts": get_active_alerts(),
                    "conjunctions": get_conjunctions()
                }
            }
            
            # Send data
            await websocket.send(json.dumps(telemetry))
            
            # Wait before next update (adjust rate as needed)
            await asyncio.sleep(1)  # 1 Hz update rate

# Run the telemetry sender
asyncio.run(send_telemetry())
```

### JavaScript/TypeScript Example

```typescript
class TelemetryClient {
  private ws: WebSocket;
  private reconnectInterval = 5000;
  
  connect() {
    this.ws = new WebSocket('ws://localhost:8000/ws/ingest');
    
    this.ws.onopen = () => {
      console.log('Connected to RED WATCH');
      this.startSending();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }
  
  startSending() {
    setInterval(() => {
      const telemetry = {
        type: 'telemetry',
        timestamp: new Date().toISOString(),
        data: {
          objects: this.getObjectData(),
          metrics: this.getMetrics(),
          alerts: this.getAlerts(),
          conjunctions: this.getConjunctions()
        }
      };
      
      this.ws.send(JSON.stringify(telemetry));
    }, 1000); // 1 Hz update rate
  }
}
```

### Go Example

```go
package main

import (
    "encoding/json"
    "log"
    "time"
    "github.com/gorilla/websocket"
)

type Telemetry struct {
    Type      string    `json:"type"`
    Timestamp string    `json:"timestamp"`
    Data      TelemetryData `json:"data"`
}

func connectToRedWatch() {
    url := "ws://localhost:8000/ws/ingest"
    
    conn, _, err := websocket.DefaultDialer.Dial(url, nil)
    if err != nil {
        log.Fatal("Failed to connect:", err)
    }
    defer conn.Close()
    
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            telemetry := Telemetry{
                Type:      "telemetry",
                Timestamp: time.Now().UTC().Format(time.RFC3339),
                Data:      collectTelemetryData(),
            }
            
            if err := conn.WriteJSON(telemetry); err != nil {
                log.Println("Write error:", err)
                return
            }
        }
    }
}
```

---

## Update Rates and Performance

### Recommended Update Rates
- **Object Positions:** 1-5 Hz (higher for LEO, lower for GEO)
- **System Metrics:** 1 Hz
- **Alerts:** On event trigger
- **Conjunctions:** Every 30 seconds or on significant change

### Performance Considerations
- **Batch Updates:** Send multiple objects in single message
- **Delta Updates:** Only send changed data when possible
- **Compression:** Use WebSocket compression for large datasets
- **Rate Limiting:** Backend can handle up to 100 messages/second

---

## Connection States and Error Handling

### Connection States
1. **Connecting** - Initial WebSocket handshake
2. **Connected** - Active data transmission
3. **Reconnecting** - Automatic reconnection after disconnect
4. **Failed** - Connection cannot be established

### Error Codes
- `1000` - Normal closure
- `1001` - Going away (server shutdown)
- `1002` - Protocol error
- `1003` - Unsupported data
- `1006` - Abnormal closure (network issue)
- `1008` - Policy violation (invalid message format)

### Reconnection Strategy
```javascript
class ReconnectingWebSocket {
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectAttempts = 0;
  
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }
}
```

---

## Testing Your Connection

### 1. Using WebSocket CLI Tool

```bash
# Install wscat
npm install -g wscat

# Connect to RED WATCH
wscat -c ws://localhost:8000/ws/ingest

# Send test data
> {"type":"telemetry","timestamp":"2025-08-18T12:00:00Z","data":{"objects":[],"metrics":{"objects_tracked":100}}}
```

### 2. Using curl

```bash
# Test if server is running
curl http://localhost:8000/health

# Expected response
{"status":"healthy","version":"1.0.0"}
```

### 3. Browser Console Test

```javascript
// Open browser console and run:
const ws = new WebSocket('ws://localhost:8000/ws/ingest');
ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'telemetry',
    timestamp: new Date().toISOString(),
    data: {
      objects: [],
      metrics: { objects_tracked: 50 }
    }
  }));
};
```

---

## Security Considerations

### Authentication (Future)
- JWT token-based authentication planned
- API key support for service accounts
- Role-based access control (RBAC)

### Data Validation
- All incoming data is validated against schema
- Invalid messages are logged and rejected
- Rate limiting per connection

### Encryption
- Use `wss://` for production environments
- TLS 1.3 recommended
- Certificate pinning for critical systems

---

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```
**Solution:** Ensure RED WATCH backend is running on port 8000

#### 2. Invalid Message Format
```
Error: 1008 Policy Violation
```
**Solution:** Verify JSON structure matches specification

#### 3. Connection Drops Frequently
**Possible Causes:**
- Network instability
- Message rate too high
- Invalid data causing server rejection

#### 4. No Data Appearing in Dashboard
**Check:**
- WebSocket connection established
- Data format is correct
- Frontend is connected to `/ws/stream`

### Debug Mode

Enable debug logging in RED WATCH:
```bash
export RED_WATCH_DEBUG=true
./launch.sh
```

---

## API Reference

### REST Endpoints (Alternative to WebSocket)

#### POST /api/telemetry
Send telemetry data via REST (lower performance than WebSocket)

```bash
curl -X POST http://localhost:8000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"objects":[],"metrics":{}}'
```

#### GET /api/health
Check system health

```bash
curl http://localhost:8000/api/health
```

#### GET /api/status
Get connection statistics

```bash
curl http://localhost:8000/api/status
```

---

## Support and Contact

---

## Version History

- **v1.0.0-alpha** - Initial WebSocket implementation
- **v1.1.0** - Added conjunction data support (planned)
- **v1.2.0** - Authentication system (planned)
- **v2.0.0** - GraphQL subscription support (future)

---

Last Updated: 2025-08-18