const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Enable CORS for all origins
app.use(cors());
app.use(bodyParser.json());

// Store telemetry data in memory
class TelemetryStore {
    constructor() {
        this.currentData = {};
        this.timeSeries = {};
        this.maxDataPoints = 1000;
        this.clients = new Set();
        
        console.log('[TelemetryStore] Initialized');
    }
    
    updateData(data) {
        const timestamp = Date.now();
        this.currentData = { ...data, timestamp };
        
        // Store time series data for each metric
        Object.keys(data).forEach(key => {
            if (!this.timeSeries[key]) {
                this.timeSeries[key] = [];
            }
            
            this.timeSeries[key].push({
                value: data[key],
                timestamp
            });
            
            // Trim old data
            if (this.timeSeries[key].length > this.maxDataPoints) {
                this.timeSeries[key].shift();
            }
        });
        
        // Broadcast to WebSocket clients
        this.broadcast(this.currentData);
    }
    
    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    
    addClient(ws) {
        this.clients.add(ws);
        // Send current data immediately
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(this.currentData));
        }
    }
    
    removeClient(ws) {
        this.clients.delete(ws);
    }
    
    getTimeSeries(metric, from, to) {
        const series = this.timeSeries[metric] || [];
        return series
            .filter(point => point.timestamp >= from && point.timestamp <= to)
            .map(point => [point.value, point.timestamp]);
    }
    
    getMetrics() {
        return Object.keys(this.timeSeries);
    }
}

const telemetryStore = new TelemetryStore();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('[WebSocket] New client connected');
    telemetryStore.addClient(ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('[WebSocket] Received telemetry update');
            telemetryStore.updateData(data);
        } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
        telemetryStore.removeClient(ws);
    });
    
    ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
    });
});

// REST API endpoints for Grafana JSON datasource

// Test endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'LEOS-RO Telemetry Server',
        metrics: telemetryStore.getMetrics().length,
        clients: telemetryStore.clients.size
    });
});

// Health check for Grafana
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Search endpoint - returns available metrics
app.post('/search', (req, res) => {
    console.log('[API] Search request');
    const metrics = telemetryStore.getMetrics();
    res.json(metrics);
});

// Query endpoint - returns time series data
app.post('/query', (req, res) => {
    console.log('[API] Query request:', req.body);
    
    const { targets, range } = req.body;
    
    // Handle both time-range queries and instant queries
    let from, to;
    if (range) {
        from = new Date(range.from).getTime();
        to = new Date(range.to).getTime();
    } else {
        // Default to last 5 minutes if no range specified
        to = Date.now();
        from = to - (5 * 60 * 1000);
    }
    
    const response = targets.map(target => {
        const metric = target.target;
        const datapoints = telemetryStore.getTimeSeries(metric, from, to);
        
        return {
            target: metric,
            datapoints
        };
    });
    
    res.json(response);
});

// Annotations endpoint (optional)
app.post('/annotations', (req, res) => {
    console.log('[API] Annotations request');
    res.json([]);
});

// Tag keys endpoint (optional)
app.post('/tag-keys', (req, res) => {
    res.json([]);
});

// Tag values endpoint (optional)
app.post('/tag-values', (req, res) => {
    res.json([]);
});

// Current data endpoint (for debugging)
app.get('/current', (req, res) => {
    res.json(telemetryStore.currentData);
});

// Metrics list endpoint
app.get('/metrics', (req, res) => {
    const metrics = telemetryStore.getMetrics();
    const details = {};
    
    metrics.forEach(metric => {
        const series = telemetryStore.timeSeries[metric] || [];
        details[metric] = {
            points: series.length,
            latest: series[series.length - 1]?.value || null
        };
    });
    
    res.json(details);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`[Server] LEOS-RO Telemetry Server running on port ${PORT}`);
    console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`[Server] REST API endpoint: http://localhost:${PORT}`);
    console.log(`[Server] Grafana datasource URL: http://localhost:${PORT}`);
});