# Data Source Integration Examples

This document shows how to integrate different types of telemetry data sources with the LEOS frontend.

## Quick Start

The data source system is automatically initialized when the application loads. You can:

1. **Press Ctrl+D** or click the 📊 button to open the Data Source Manager
2. **Switch between pre-configured sources** (static files, APIs, etc.)
3. **Add custom data sources** using the built-in UI
4. **Upload files** with telemetry data

## Data Format

All data sources should provide telemetry in this format:

```javascript
{
  "timestamp": "2025-06-24T12:00:00Z",
  "satellite": "CRTS1",                    // or "name"
  "latitude_deg": 37.7749,                 // or "latitude"
  "longitude_deg": -122.4194,              // or "longitude" 
  "altitude_km": 435.2,                    // or "altitude"
  "velocity_kmps": 7.65,                   // or "velocity" or "speed"
  "velocity_eci": [-5.45, 4.54, -2.87],   // optional: 3D velocity vector
  "position_eci": [4370.9, 2291.5, -4681.5] // optional: 3D position vector
}
```

## 1. Static File Sources

### JSONL Format (recommended)
```jsonl
{"timestamp":"2025-06-24T12:00:00Z","satellite":"CRTS1","latitude_deg":37.7749,"longitude_deg":-122.4194,"altitude_km":435.2,"velocity_kmps":7.65}
{"timestamp":"2025-06-24T12:01:00Z","satellite":"CRTS1","latitude_deg":37.8012,"longitude_deg":-122.3985,"altitude_km":435.1,"velocity_kmps":7.64}
```

### JSON Array Format
```json
[
  {
    "timestamp": "2025-06-24T12:00:00Z",
    "satellite": "CRTS1",
    "latitude_deg": 37.7749,
    "longitude_deg": -122.4194,
    "altitude_km": 435.2,
    "velocity_kmps": 7.65
  }
]
```

### CSV Format
```csv
timestamp,satellite,latitude_deg,longitude_deg,altitude_km,velocity_kmps
2025-06-24T12:00:00Z,CRTS1,37.7749,-122.4194,435.2,7.65
2025-06-24T12:01:00Z,CRTS1,37.8012,-122.3985,435.1,7.64
```

## 2. REST API Integration

### Simple API Endpoint
Your API should return JSON with telemetry data:

```javascript
// Example API endpoint: GET /api/telemetry
{
  "data": [
    {
      "time": "2025-06-24T12:00:00Z",
      "vehicle": {
        "name": "CRTS1",
        "position": {
          "lat": 37.7749,
          "lon": -122.4194,
          "alt": 435.2
        },
        "velocity": {
          "speed": 7.65
        }
      }
    }
  ]
}
```

### Field Mapping
Configure field mapping in the UI:

```json
{
  "timestamp": "data.time",
  "satellite": "data.vehicle.name", 
  "latitude_deg": "data.vehicle.position.lat",
  "longitude_deg": "data.vehicle.position.lon",
  "altitude_km": "data.vehicle.position.alt",
  "velocity_kmps": "data.vehicle.velocity.speed"
}
```

### Example Backend (Node.js + Express)
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Serve telemetry data
app.get('/api/telemetry', (req, res) => {
  const currentTime = new Date().toISOString();
  
  // Example: Generate or fetch real telemetry data
  const telemetryData = [
    {
      timestamp: currentTime,
      satellite: "CRTS1",
      latitude_deg: 37.7749 + Math.random() * 0.1,
      longitude_deg: -122.4194 + Math.random() * 0.1,
      altitude_km: 435 + Math.random() * 10,
      velocity_kmps: 7.65 + Math.random() * 0.1
    }
  ];
  
  res.json(telemetryData);
});

app.listen(3001, () => {
  console.log('Telemetry API running on port 3001');
});
```

### Authentication
For APIs requiring authentication:

```javascript
// Add API key in the Data Source Manager UI
// The system will automatically add it as Authorization: Bearer <key>

// Or for custom authentication:
app.get('/api/telemetry', (req, res) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (apiKey !== 'your-secret-key') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Return telemetry data...
});
```

## 3. WebSocket Real-Time Streaming

### WebSocket Server Example (Node.js)
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send telemetry data every 5 seconds
  const interval = setInterval(() => {
    const telemetry = {
      timestamp: new Date().toISOString(),
      satellite: "CRTS1",
      latitude_deg: 37.7749 + Math.random() * 0.1,
      longitude_deg: -122.4194 + Math.random() * 0.1,
      altitude_km: 435 + Math.random() * 10,
      velocity_kmps: 7.65 + Math.random() * 0.1
    };
    
    ws.send(JSON.stringify(telemetry));
  }, 5000);
  
  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});
```

### WebSocket Client (automatically handled by LEOS)
The system automatically connects to WebSocket endpoints. Just provide:
- WebSocket URL: `wss://your-server.com/telemetry`
- Field mapping (if needed)

## 4. Database Integration

Since browsers can't directly connect to databases, you need a backend API proxy:

### Database API Proxy Example
```javascript
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'telemetry_user',
  password: 'password',
  database: 'satellite_db'
};

app.get('/api/database/query', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT timestamp, satellite_name, latitude, longitude, altitude, velocity 
      FROM telemetry 
      WHERE timestamp > NOW() - INTERVAL 1 HOUR 
      ORDER BY timestamp DESC
    `);
    
    // Convert to LEOS format
    const telemetryData = rows.map(row => ({
      timestamp: row.timestamp,
      satellite: row.satellite_name,
      latitude_deg: row.latitude,
      longitude_deg: row.longitude,
      altitude_km: row.altitude,
      velocity_kmps: row.velocity
    }));
    
    res.json(telemetryData);
    await connection.end();
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### SQL Database Schema Example
```sql
CREATE TABLE telemetry (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  satellite_name VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  altitude DECIMAL(8, 2) NOT NULL,
  velocity DECIMAL(6, 3) NOT NULL,
  INDEX idx_timestamp (timestamp),
  INDEX idx_satellite (satellite_name)
);

-- Insert sample data
INSERT INTO telemetry (timestamp, satellite_name, latitude, longitude, altitude, velocity) VALUES
('2025-06-24 12:00:00', 'CRTS1', 37.7749, -122.4194, 435.2, 7.65),
('2025-06-24 12:01:00', 'CRTS1', 37.8012, -122.3985, 435.1, 7.64);
```

## 5. File Upload Integration

Users can upload telemetry files directly through the UI:

### Supported Formats
- **JSONL** (JSON Lines) - recommended for large datasets
- **JSON** arrays
- **CSV** with headers

### Large File Handling
For large files (>10MB):

```javascript
// Process files in chunks to avoid memory issues
function processLargeFile(file) {
  const chunkSize = 1024 * 1024; // 1MB chunks
  let offset = 0;
  
  const processChunk = () => {
    const chunk = file.slice(offset, offset + chunkSize);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      // Process chunk...
      
      offset += chunkSize;
      if (offset < file.size) {
        processChunk(); // Process next chunk
      }
    };
    
    reader.readAsText(chunk);
  };
  
  processChunk();
}
```

## 6. Integration with Existing Systems

### Ground Station Networks
```javascript
// Example: Integrate with ground station telemetry
const groundStationAPI = {
  url: 'https://ground-station.com/api/passes',
  mapping: {
    "timestamp": "pass_time",
    "satellite": "satellite_id", 
    "latitude_deg": "gs_lat",
    "longitude_deg": "gs_lon",
    "altitude_km": "satellite_altitude",
    "elevation": "elevation_angle",
    "azimuth": "azimuth_angle"
  }
};
```

### Mission Control Systems
```javascript
// Example: NASA/ESA mission control integration
const missionControlAPI = {
  url: 'https://api.mission-control.gov/telemetry',
  headers: {
    'X-Mission-ID': 'CRTS-001',
    'X-Classification': 'UNCLASSIFIED'
  },
  mapping: {
    "timestamp": "mission_time",
    "satellite": "vehicle_name",
    "latitude_deg": "state_vector.position.lat", 
    "longitude_deg": "state_vector.position.lon",
    "altitude_km": "state_vector.position.alt",
    "velocity_kmps": "state_vector.velocity.magnitude"
  }
};
```

## 7. Error Handling and Monitoring

### Connection Status
The system automatically monitors connection status and provides:
- Connection indicators
- Error counts
- Last update timestamps
- Automatic reconnection for WebSockets

### Data Validation
All incoming data is validated and normalized:
- Missing fields are computed when possible
- Invalid data points are logged but don't break the system
- Field type conversion (strings to numbers, etc.)

### Performance Optimization
- Batched updates for large datasets
- Configurable update intervals
- Memory management for continuous streams
- Automatic cleanup of old data points

## 8. Deployment Considerations

### CORS Configuration
For browser security, your API must allow CORS:

```javascript
// Express.js CORS setup
app.use(cors({
  origin: ['http://localhost:8000', 'https://your-leos-domain.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### HTTPS Requirements
- WebSocket connections require WSS (secure) in production
- API endpoints should use HTTPS
- File uploads work over HTTP/HTTPS

### Rate Limiting
Implement rate limiting for APIs:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // max 100 requests per minute
});

app.use('/api/telemetry', limiter);
```

## 9. Testing Your Integration

### Using the Built-in UI
1. Open LEOS
2. Press **Ctrl+D** to open Data Source Manager
3. Add your custom source (REST API, WebSocket, or file)
4. Activate the source and verify connection
5. Check that telemetry data appears in satellite panels

### Debug Console
Open browser dev tools to see:
- Connection logs
- Data parsing errors
- Network requests
- Performance metrics

### Example Test Endpoint
```javascript
// Simple test endpoint that returns static data
app.get('/api/test-telemetry', (req, res) => {
  res.json([
    {
      timestamp: new Date().toISOString(),
      satellite: "TEST-SAT",
      latitude_deg: 0,
      longitude_deg: 0,
      altitude_km: 400,
      velocity_kmps: 7.66
    }
  ]);
});
```

## Support and Troubleshooting

### Common Issues
1. **CORS errors**: Configure your API server to allow cross-origin requests
2. **Authentication failures**: Verify API keys and authentication headers
3. **Data format mismatches**: Use field mapping to convert your format
4. **WebSocket connection failures**: Check URL format (wss://) and firewall settings

### Getting Help
- Check browser console for error messages
- Verify data format matches expected structure
- Test API endpoints independently before integrating
- Use the debug logging in the Data Source Manager

This integration system makes LEOS extremely flexible for connecting to any telemetry data source while maintaining a consistent user experience.
