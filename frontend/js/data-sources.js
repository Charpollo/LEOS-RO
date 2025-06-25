/**
 * LEOS Data Sources Module
 * Flexible system for connecting to various telemetry data sources:
 * - Static files (current system)
 * - Real-time APIs
 * - Databases 
 * - WebSocket streams
 * - File uploads
 */

export class TelemetryDataManager {
    constructor() {
        this.dataSources = new Map();
        this.activeSource = null;
        this.subscribers = new Set();
        this.updateInterval = null;
        this.isRealTime = false;
    }

    /**
     * Register a data source
     * @param {string} name - Source identifier
     * @param {Object} sourceConfig - Source configuration
     */
    registerSource(name, sourceConfig) {
        this.dataSources.set(name, {
            ...sourceConfig,
            isConnected: false,
            lastUpdate: null,
            errorCount: 0
        });
        console.log(`Data source '${name}' registered:`, sourceConfig.type);
    }

    /**
     * Switch to a different data source
     * @param {string} sourceName - Name of source to activate
     */
    async setActiveSource(sourceName) {
        const source = this.dataSources.get(sourceName);
        if (!source) {
            throw new Error(`Data source '${sourceName}' not found`);
        }

        // Disconnect from current source
        if (this.activeSource) {
            await this.disconnect();
        }

        this.activeSource = sourceName;
        await this.connect();
        
        // Start real-time updates if supported
        if (source.realTime) {
            this.startRealTimeUpdates();
        }
    }

    /**
     * Connect to the active data source
     */
    async connect() {
        const source = this.dataSources.get(this.activeSource);
        if (!source) return;

        try {
            switch (source.type) {
                case 'static-file':
                    await this.connectStaticFile(source);
                    break;
                case 'rest-api':
                    await this.connectRestAPI(source);
                    break;
                case 'websocket':
                    await this.connectWebSocket(source);
                    break;
                case 'database':
                    await this.connectDatabase(source);
                    break;
                case 'file-upload':
                    await this.connectFileUpload(source);
                    break;
                default:
                    throw new Error(`Unknown source type: ${source.type}`);
            }
            
            source.isConnected = true;
            source.errorCount = 0;
            this.notifySubscribers('connected', { source: this.activeSource });
            
        } catch (error) {
            source.errorCount++;
            console.error(`Failed to connect to ${this.activeSource}:`, error);
            throw error;
        }
    }

    /**
     * Static file data source (current system)
     */
    async connectStaticFile(source) {
        const response = await fetch(source.url);
        if (!response.ok) {
            throw new Error(`Failed to load static file: ${response.statusText}`);
        }
        
        const data = await response.text();
        source.data = this.parseStaticData(data, source.format);
        source.lastUpdate = new Date();
    }

    /**
     * REST API data source
     */
    async connectRestAPI(source) {
        const headers = {
            'Content-Type': 'application/json',
            ...source.headers
        };

        // Add authentication if provided
        if (source.apiKey) {
            headers['Authorization'] = `Bearer ${source.apiKey}`;
        }

        const response = await fetch(source.url, {
            method: source.method || 'GET',
            headers,
            body: source.body ? JSON.stringify(source.body) : undefined
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        source.data = this.parseAPIData(data, source.mapping);
        source.lastUpdate = new Date();
    }

    /**
     * WebSocket data source for real-time streaming
     */
    async connectWebSocket(source) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(source.url);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                source.connection = ws;
                resolve();
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const telemetry = this.parseWebSocketData(data, source.mapping);
                    this.notifySubscribers('data', telemetry);
                } catch (error) {
                    console.error('WebSocket data parsing error:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                source.isConnected = false;
                source.connection = null;
            };
        });
    }

    /**
     * Database connection (through API proxy)
     */
    async connectDatabase(source) {
        // Since frontend can't directly connect to databases,
        // this would typically go through a backend API
        const queryParams = new URLSearchParams({
            query: source.query,
            table: source.table,
            ...source.params
        });

        const response = await fetch(`${source.proxyUrl}?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${source.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Database query failed: ${response.statusText}`);
        }

        const data = await response.json();
        source.data = this.parseDatabaseData(data, source.schema);
        source.lastUpdate = new Date();
    }

    /**
     * File upload data source
     */
    async connectFileUpload(source) {
        // This would be triggered by file input
        if (!source.file) {
            throw new Error('No file provided for upload');
        }

        const text = await source.file.text();
        source.data = this.parseUploadedFile(text, source.format);
        source.lastUpdate = new Date();
    }

    /**
     * Parse different data formats
     */
    parseStaticData(data, format) {
        switch (format) {
            case 'jsonl':
                return data.split('\n')
                    .filter(line => line.trim())
                    .map(line => JSON.parse(line));
            case 'json':
                return JSON.parse(data);
            case 'csv':
                return this.parseCSV(data);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    parseAPIData(data, mapping) {
        if (!mapping) return data;
        
        // Apply field mapping to transform API response
        return data.map(item => {
            const mapped = {};
            for (const [localField, apiField] of Object.entries(mapping)) {
                mapped[localField] = this.getNestedValue(item, apiField);
            }
            return mapped;
        });
    }

    parseWebSocketData(data, mapping) {
        if (!mapping) return data;
        
        const mapped = {};
        for (const [localField, wsField] of Object.entries(mapping)) {
            mapped[localField] = this.getNestedValue(data, wsField);
        }
        return mapped;
    }

    parseDatabaseData(data, schema) {
        if (!schema) return data;
        
        // Transform database rows according to schema
        return data.rows.map(row => {
            const item = {};
            schema.fields.forEach((field, index) => {
                item[field] = row[index];
            });
            return item;
        });
    }

    parseUploadedFile(data, format) {
        return this.parseStaticData(data, format);
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });
                return obj;
            });
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Subscribe to data updates
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers(event, data) {
        this.subscribers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Subscriber callback error:', error);
            }
        });
    }

    /**
     * Start real-time updates for polling-based sources
     */
    startRealTimeUpdates(intervalMs = 5000) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.isRealTime = true;
        this.updateInterval = setInterval(async () => {
            try {
                await this.refreshData();
            } catch (error) {
                console.error('Real-time update failed:', error);
            }
        }, intervalMs);
    }

    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isRealTime = false;
    }

    async refreshData() {
        const source = this.dataSources.get(this.activeSource);
        if (!source || !source.isConnected) return;

        if (source.type === 'rest-api' || source.type === 'database') {
            await this.connect(); // Refresh data
            this.notifySubscribers('data-refreshed', source.data);
        }
    }

    /**
     * Get current telemetry data
     */
    getCurrentData() {
        const source = this.dataSources.get(this.activeSource);
        return source?.data || [];
    }

    /**
     * Get telemetry for specific satellite at specific time
     */
    getTelemetryAtTime(satelliteName, timestamp) {
        const data = this.getCurrentData();
        if (!Array.isArray(data)) return null;

        // Find closest telemetry point to requested time
        return data
            .filter(item => item.satellite === satelliteName || item.name === satelliteName)
            .reduce((closest, current) => {
                const currentTime = new Date(current.timestamp);
                const targetTime = new Date(timestamp);
                
                if (!closest) return current;
                
                const currentDiff = Math.abs(currentTime - targetTime);
                const closestDiff = Math.abs(new Date(closest.timestamp) - targetTime);
                
                return currentDiff < closestDiff ? current : closest;
            }, null);
    }

    async disconnect() {
        const source = this.dataSources.get(this.activeSource);
        if (!source) return;

        if (source.connection) {
            source.connection.close();
            source.connection = null;
        }

        this.stopRealTimeUpdates();
        source.isConnected = false;
        this.notifySubscribers('disconnected', { source: this.activeSource });
    }

    getSourceStatus() {
        return Array.from(this.dataSources.entries()).map(([name, source]) => ({
            name,
            type: source.type,
            isConnected: source.isConnected,
            lastUpdate: source.lastUpdate,
            errorCount: source.errorCount,
            isActive: name === this.activeSource
        }));
    }
}

// Pre-configured data source examples
export const DEFAULT_SOURCES = {
    // Current static file system
    static_bulldog: {
        type: 'static-file',
        url: '/frontend/data/telemetry/Bulldog_000000.jsonl',
        format: 'jsonl',
        description: 'Static Bulldog telemetry file'
    },
    
    static_crts: {
        type: 'static-file', 
        url: '/frontend/data/telemetry/CRTS1_000000.jsonl',
        format: 'jsonl',
        description: 'Static CRTS telemetry file'
    },

    // REST API example
    mission_control_api: {
        type: 'rest-api',
        url: 'https://api.mission-control.com/v1/telemetry',
        method: 'GET',
        headers: {
            'X-API-Version': '1.0'
        },
        // Map API fields to local telemetry format
        mapping: {
            timestamp: 'data.timestamp',
            latitude_deg: 'position.lat',
            longitude_deg: 'position.lon', 
            altitude_km: 'position.alt',
            velocity_kmps: 'velocity.magnitude',
            satellite: 'vehicle.name'
        },
        realTime: true,
        description: 'Live mission control API'
    },

    // WebSocket real-time stream
    realtime_stream: {
        type: 'websocket',
        url: 'wss://telemetry.space-agency.gov/live',
        mapping: {
            timestamp: 'time',
            latitude_deg: 'pos.lat',
            longitude_deg: 'pos.lng',
            altitude_km: 'pos.altitude',
            velocity_kmps: 'vel.speed'
        },
        realTime: true,
        description: 'Real-time telemetry stream'
    },

    // Database connection (through backend proxy)
    satellite_database: {
        type: 'database',
        proxyUrl: '/api/database/query',
        table: 'satellite_telemetry',
        query: 'SELECT * FROM satellite_telemetry WHERE timestamp > NOW() - INTERVAL 1 HOUR',
        schema: {
            fields: ['timestamp', 'satellite_id', 'latitude', 'longitude', 'altitude', 'velocity']
        },
        realTime: true,
        description: 'Satellite database via API proxy'
    }
};
