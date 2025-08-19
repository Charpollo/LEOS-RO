/**
 * Universal Telemetry Connector
 * Streams RED ORBIT simulation data to any external dashboard/monitoring system
 * Supports WebSocket connections to RED WATCH, Grafana, custom dashboards, etc.
 * 
 * Default: RED WATCH at ws://localhost:8000/ws/ingest
 * Can be configured for any WebSocket endpoint
 */

class UniversalTelemetryConnector {
    constructor(config = {}) {
        // Connection configuration - can connect to ANY WebSocket endpoint
        this.endpoints = {
            redWatch: 'ws://localhost:8000/ws/ingest',
            grafana: 'ws://localhost:3000/api/live/push',
            custom: config.endpoint || null
        };
        
        // Active endpoint
        this.activeEndpoint = config.endpoint || this.endpoints.redWatch;
        this.endpointName = config.name || 'RED WATCH';
        
        // Connection state
        this.ws = null;
        this.connected = false;
        this.enabled = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = config.maxReconnects || 10;
        this.reconnectDelay = config.reconnectDelay || 1000;
        this.updateInterval = null;
        this.updateRate = config.updateRate || 1000; // 1 Hz (1 second) - practical balance
        
        // Data collection configuration - SEND EVERYTHING for real-time
        this.dataConfig = Object.assign({
            sendAllObjects: true,  // Always send all objects for real-time monitoring
            maxObjects: 30000,     // Send all 30K objects
            sampleRate: 1,         // No sampling - send every object
            includeMetrics: true,
            includeObjects: true,  
            includeConjunctions: true,
            includeAlerts: true,
            includeOrbitalElements: true,  // Include all orbital parameters
            includeRiskAssessment: true,   // Include risk scores
            includeVelocityData: true,     // Include velocity vectors
            format: 'redwatch'     // Data format: 'redwatch', 'grafana', 'prometheus', 'custom'
        }, config.dataConfig || {});
        
        // Custom data transformer for different formats
        this.dataTransformer = config.transformer || null;
        
        // Performance tracking
        this.lastSendTime = 0;
        this.messageCount = 0;
        this.bytesSent = 0;
        
        console.log(`[TelemetryConnector] Initialized for ${this.endpointName}`);
    }
    
    /**
     * Set endpoint dynamically
     */
    setEndpoint(endpoint, name = 'Custom') {
        this.activeEndpoint = endpoint;
        this.endpointName = name;
        if (this.connected) {
            this.disconnect();
            this.connect();
        }
    }
    
    /**
     * Connect to configured endpoint
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log(`[TelemetryConnector] Already connected to ${this.endpointName}`);
            return;
        }
        
        if (!this.activeEndpoint) {
            console.error('[TelemetryConnector] No endpoint configured');
            return;
        }
        
        try {
            this.ws = new WebSocket(this.activeEndpoint);
            
            this.ws.onopen = () => {
                console.log(`%c[TelemetryConnector] Connected to ${this.endpointName}`, 'color: #00ffff; font-weight: bold');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.startDataStream();
                
                // Update UI if engineering panel exists (check if method exists)
                if (window.engineeringPanel && window.engineeringPanel.updateTelemetryStatus) {
                    window.engineeringPanel.updateTelemetryStatus(true, this.endpointName);
                }
            };
            
            this.ws.onmessage = (event) => {
                // Handle any responses from endpoint if needed
                try {
                    const response = JSON.parse(event.data);
                    console.log(`[TelemetryConnector] Received from ${this.endpointName}:`, response);
                } catch (e) {
                    // Ignore non-JSON messages
                }
            };
            
            this.ws.onerror = (error) => {
                console.error(`[TelemetryConnector] WebSocket error for ${this.endpointName}:`, error);
                this.connected = false;
            };
            
            this.ws.onclose = () => {
                console.log(`[TelemetryConnector] Disconnected from ${this.endpointName}`);
                this.connected = false;
                this.stopDataStream();
                
                // Update UI
                if (window.engineeringPanel) {
                    window.engineeringPanel.updateTelemetryStatus(false, this.endpointName);
                }
                
                // Attempt reconnection if enabled
                if (this.enabled && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = this.reconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5));
                    console.log(`[TelemetryConnector] Reconnecting to ${this.endpointName} in ${delay}ms... (attempt ${this.reconnectAttempts})`);
                    setTimeout(() => this.connect(), delay);
                }
            };
        } catch (error) {
            console.error(`[TelemetryConnector] Failed to create WebSocket for ${this.endpointName}:`, error);
            this.connected = false;
        }
    }
    
    /**
     * Disconnect from endpoint
     */
    disconnect() {
        this.enabled = false;
        this.stopDataStream();
        
        if (this.ws) {
            this.ws.close(1000, 'User requested disconnect');
            this.ws = null;
        }
        
        this.connected = false;
        console.log(`[TelemetryConnector] Disconnected from ${this.endpointName}`);
    }
    
    /**
     * Toggle connection
     */
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.enabled;
    }
    
    /**
     * Enable telemetry streaming
     */
    enable() {
        this.enabled = true;
        this.connect();
        console.log(`[TelemetryConnector] Enabled streaming to ${this.endpointName}`);
    }
    
    /**
     * Disable telemetry streaming
     */
    disable() {
        this.enabled = false;
        this.disconnect();
        console.log(`[TelemetryConnector] Disabled streaming to ${this.endpointName}`);
    }
    
    /**
     * Start streaming data
     */
    startDataStream() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Adjust update rate based on object count
        const adjustUpdateRate = () => {
            const physics = window.redOrbitPhysics;
            if (physics && physics.activeObjects) {
                if (physics.activeObjects > 1000000) {
                    this.updateRate = 500; // 2 Hz for > 1M objects
                } else if (physics.activeObjects > 100000) {
                    this.updateRate = 200; // 5 Hz for > 100K objects
                } else {
                    this.updateRate = 100; // 10 Hz for <= 100K objects
                }
            }
        };
        
        // Send data at configured rate
        this.updateInterval = setInterval(() => {
            if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                adjustUpdateRate();
                this.sendTelemetry();
            }
        }, this.updateRate);
        
        console.log(`[TelemetryConnector] Started data stream to ${this.endpointName} at ${1000/this.updateRate} Hz`);
    }
    
    /**
     * Stop streaming data
     */
    stopDataStream() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log(`[TelemetryConnector] Stopped data stream to ${this.endpointName}`);
    }
    
    /**
     * Collect and send telemetry data
     */
    async sendTelemetry() {
        try {
            // Collect raw data
            const rawData = await this.collectRawData();
            
            // Format data based on endpoint type
            let telemetry;
            if (this.dataTransformer) {
                // Use custom transformer if provided
                telemetry = this.dataTransformer(rawData);
            } else {
                // Use built-in formatters
                telemetry = this.formatData(rawData);
            }
            
            
            // Send data
            const message = JSON.stringify(telemetry);
            this.ws.send(message);
            
            // Track performance
            this.messageCount++;
            this.bytesSent += message.length;
            this.lastSendTime = Date.now();
            
            // Log every 500th message (reduced frequency)
            if (this.messageCount % 500 === 0) {
                console.log(`[TelemetryConnector] Sent ${this.messageCount} messages to ${this.endpointName}, ${(this.bytesSent/1024/1024).toFixed(2)} MB total`);
            }
        } catch (error) {
            console.error(`[TelemetryConnector] Failed to send telemetry to ${this.endpointName}:`, error);
        }
    }
    
    /**
     * Collect raw data from simulation
     */
    async collectRawData() {
        // Use centralized data collector if available
        if (window.dataCollector) {
            const collectedData = window.dataCollector.getData({
                maxObjects: this.dataConfig.sendAllObjects ? 100000 : 10000
            });
            
            if (collectedData && collectedData.objects) {
                // Only log data collection occasionally
                if (this.messageCount % 100 === 0) {
                    console.log(`[TelemetryConnector] Streaming ${collectedData.objects.length} objects to ${this.endpointName}`);
                }
                return {
                    objects: collectedData.objects,
                    metrics: collectedData.metrics,
                    conjunctions: collectedData.conjunctions,
                    alerts: collectedData.alerts,
                    timestamp: collectedData.timestamp
                };
            }
        }
        
        // Fallback to direct collection
        const data = {
            objects: await this.collectObjectData(),
            metrics: this.collectMetrics(),
            conjunctions: this.collectConjunctions(),
            alerts: this.collectAlerts(),
            timestamp: new Date().toISOString()
        };
        
        return data;
    }
    
    /**
     * Format data based on endpoint type
     */
    formatData(rawData) {
        switch (this.dataConfig.format) {
            case 'redwatch':
                return this.formatRedWatch(rawData);
            case 'grafana':
                return this.formatGrafana(rawData);
            case 'prometheus':
                return this.formatPrometheus(rawData);
            case 'influxdb':
                return this.formatInfluxDB(rawData);
            case 'elasticsearch':
                return this.formatElasticsearch(rawData);
            default:
                return rawData; // Return raw data for custom formats
        }
    }
    
    /**
     * Format for RED WATCH
     */
    formatRedWatch(data) {
        return {
            type: 'telemetry',
            timestamp: data.timestamp,
            data: {
                objects: this.dataConfig.includeObjects !== false ? data.objects : [],
                metrics: this.dataConfig.includeMetrics ? data.metrics : {},
                conjunctions: this.dataConfig.includeConjunctions ? data.conjunctions : [],
                alerts: this.dataConfig.includeAlerts ? data.alerts : []
            }
        };
    }
    
    /**
     * Format for Grafana Live
     */
    formatGrafana(data) {
        const streams = [];
        
        // Convert metrics to Grafana stream format
        if (data.metrics) {
            Object.entries(data.metrics).forEach(([key, value]) => {
                streams.push({
                    stream: {
                        app: 'red-orbit',
                        metric: key
                    },
                    values: [[data.timestamp, String(value)]]
                });
            });
        }
        
        return { streams };
    }
    
    /**
     * Format for Prometheus
     */
    formatPrometheus(data) {
        const metrics = [];
        const timestamp = Date.now();
        
        if (data.metrics) {
            Object.entries(data.metrics).forEach(([key, value]) => {
                metrics.push({
                    name: `red_orbit_${key}`,
                    value: value,
                    timestamp: timestamp,
                    labels: {
                        source: 'red_orbit',
                        endpoint: this.endpointName
                    }
                });
            });
        }
        
        return { metrics };
    }
    
    /**
     * Format for InfluxDB
     */
    formatInfluxDB(data) {
        const points = [];
        const timestamp = Date.now() * 1000000; // nanoseconds
        
        // System metrics
        if (data.metrics) {
            points.push({
                measurement: 'red_orbit_metrics',
                tags: {
                    source: 'simulation',
                    endpoint: this.endpointName
                },
                fields: data.metrics,
                timestamp: timestamp
            });
        }
        
        // Object counts by type
        if (data.objects && data.objects.length > 0) {
            const objectCounts = {};
            data.objects.forEach(obj => {
                objectCounts[obj.type] = (objectCounts[obj.type] || 0) + 1;
            });
            
            points.push({
                measurement: 'red_orbit_objects',
                tags: {
                    source: 'simulation'
                },
                fields: objectCounts,
                timestamp: timestamp
            });
        }
        
        return points;
    }
    
    /**
     * Format for Elasticsearch
     */
    formatElasticsearch(data) {
        return {
            '@timestamp': data.timestamp,
            'service.name': 'red-orbit',
            'service.type': 'simulation',
            'endpoint.name': this.endpointName,
            metrics: data.metrics,
            objects: {
                total: data.objects.length,
                by_type: data.objects.reduce((acc, obj) => {
                    acc[obj.type] = (acc[obj.type] || 0) + 1;
                    return acc;
                }, {})
            },
            conjunctions: {
                total: data.conjunctions.length,
                critical: data.conjunctions.filter(c => c.status === 'critical').length
            },
            alerts: {
                total: data.alerts.length,
                critical: data.alerts.filter(a => a.severity === 'critical').length
            }
        };
    }
    
    /**
     * Collect object position and velocity data
     */
    async collectObjectData() {
        // First, try to use the centralized data collector if available
        if (window.dataCollector) {
            const data = window.dataCollector.getData({
                maxObjects: this.dataConfig.sendAllObjects ? 100000 : 10000
            });
            
            if (data.objects && data.objects.length > 0) {
                console.log(`[TelemetryConnector] Got ${data.objects.length} objects from DataCollector (cache age: ${data.cacheAge}ms)`);
                return data.objects;
            }
        }
        
        // Fallback to direct GPU access if data collector not available
        const objects = [];
        const physics = window.redOrbitPhysics || window.gpuPhysicsEngine;
        
        if (!physics || !physics.activeObjects) {
            return objects;
        }
        
        const objectCount = physics.activeObjects;
        
        // Determine sampling strategy and max objects to export
        let maxExport = 100000; // Default max for real-time streaming
        if (objectCount > 100000 && !this.dataConfig.sendAllObjects) {
            maxExport = 10000; // Send 10K samples for large simulations
            console.log(`[TelemetryConnector] Limiting export to ${maxExport} objects from ${objectCount} total`);
        } else if (objectCount <= 100000) {
            maxExport = objectCount;
            console.log(`[TelemetryConnector] Sending all ${objectCount} objects`);
        }
        
        // Try to get data from GPU physics engine using new export method
        const gpuPhysics = window.gpuPhysicsEngine || window.redOrbitPhysics;
        
        // Check if we have the GPU physics engine with data
        if (gpuPhysics && gpuPhysics.activeObjects > 0) {
            // Debug: Log what methods are available
            console.log('[TelemetryConnector] GPU Physics methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(gpuPhysics)).filter(m => typeof gpuPhysics[m] === 'function'));
            
            // Use the new exportObjectData method if available
            if (typeof gpuPhysics.exportObjectData === 'function') {
                try {
                    console.log(`[TelemetryConnector] Exporting ${maxExport} objects from GPU physics...`);
                    const exportedObjects = await gpuPhysics.exportObjectData(maxExport);
                    
                    if (exportedObjects && exportedObjects.length > 0) {
                        console.log(`[TelemetryConnector] Successfully exported ${exportedObjects.length} objects`);
                        // Add risk scores based on altitude and type
                        exportedObjects.forEach(obj => {
                            // Calculate risk based on altitude
                            if (obj.altitude < 600) {
                                obj.risk = 75; // High risk in LEO congested zone
                            } else if (obj.altitude < 2000) {
                                obj.risk = 50; // Medium risk
                            } else {
                                obj.risk = 25; // Lower risk in higher orbits
                            }
                            
                            // Debris always has higher risk
                            if (obj.type === 'debris') {
                                obj.risk = Math.min(100, obj.risk + 25);
                            }
                        });
                        return exportedObjects;
                    }
                } catch (error) {
                    console.error('[TelemetryConnector] Error exporting object data:', error);
                }
            }
            
            // Fallback: Try to access instance matrices if export method not available
            console.log('[TelemetryConnector] Export method not available, trying fallback...');
            
            if (gpuPhysics.instanceMatrices && gpuPhysics.renderCount > 0) {
                const matrices = gpuPhysics.instanceMatrices;
                const count = Math.min(gpuPhysics.renderCount, maxExport);
                
                for (let i = 0; i < count; i++) {
                    // Instance matrix is 16 floats per object (4x4 matrix)
                    // Position is in elements 12, 13, 14 (last column)
                    const offset = i * 16;
                    const x = matrices[offset + 12];
                    const y = matrices[offset + 13];
                    const z = matrices[offset + 14];
                    
                    // Skip if position is invalid
                    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
                    
                    const altitude = Math.sqrt(x * x + y * y + z * z) * 6371 - 6371; // km
                    
                    objects.push({
                        id: `OBJ-${i}`,
                        name: `Object-${i}`,
                        type: i < 100 ? 'satellite' : 'debris',
                        position: {
                            x: x * 6371000, // Convert from Babylon units to meters
                            y: y * 6371000,
                            z: z * 6371000
                        },
                        velocity: {
                            x: 0, // Velocity not available from instance matrices
                            y: 0,
                            z: 0
                        },
                        altitude: altitude,
                        risk: altitude < 600 ? 75 : (altitude < 2000 ? 50 : 25),
                        status: 'active',
                        last_updated: new Date().toISOString()
                    });
                }
                
                if (objects.length > 0) {
                    console.log(`[TelemetryConnector] Collected ${objects.length} objects from instance matrices`);
                    return objects;
                }
            }
            
            // Last resort: Send test data so connection can be verified
            console.log('[TelemetryConnector] No position data available, sending test object');
            objects.push({
                id: 'TEST-001',
                name: 'Test Satellite',
                type: 'satellite',
                position: {
                    x: 7000000, // 7000km from Earth center in meters
                    y: 0,
                    z: 0
                },
                velocity: { x: 7500, y: 0, z: 0 },
                altitude: 629,
                risk: 50,
                status: 'active',
                last_updated: new Date().toISOString()
            });
        }
        
        // Fallback to satellite manager if it exists
        const satelliteManager = window.satelliteManager;
        if (objects.length === 0 && satelliteManager && satelliteManager.satellites) {
            satelliteManager.satellites.forEach((sat, index) => {
                // No sampling needed for satellite manager fallback
                if (index >= maxExport) return;
                
                // Get position from mesh if available
                if (sat.mesh && sat.mesh.position) {
                    const pos = sat.mesh.position;
                    const vel = sat.velocity || { x: 0, y: 0, z: 0 };
                    
                    objects.push({
                        id: `SAT-${sat.id || index}`,
                        name: sat.name || `Object-${index}`,
                        type: sat.type || 'satellite',
                        position: {
                            x: pos.x * 6371000, // Convert from Babylon units to meters
                            y: pos.y * 6371000,
                            z: pos.z * 6371000
                        },
                        velocity: {
                            x: vel.x * 1000, // Convert to m/s
                            y: vel.y * 1000,
                            z: vel.z * 1000
                        },
                        altitude: Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) * 6371 - 6371, // km
                        risk: sat.collisionRisk || 0,
                        status: sat.status || 'active',
                        last_updated: new Date().toISOString()
                    });
                }
            });
        }
        
        // Get debris data if Kessler is active
        const debrisManager = window.debrisManager;
        if (debrisManager && debrisManager.debris) {
            debrisManager.debris.forEach((debris, index) => {
                // Limit debris objects
                if (index >= maxExport / 2) return; // Only include half as many debris objects
                
                if (debris.mesh && debris.mesh.position) {
                    const pos = debris.mesh.position;
                    
                    objects.push({
                        id: `DEB-${index}`,
                        name: `Debris-${index}`,
                        type: 'debris',
                        position: {
                            x: pos.x * 6371000,
                            y: pos.y * 6371000,
                            z: pos.z * 6371000
                        },
                        velocity: {
                            x: debris.velocity?.x || 0,
                            y: debris.velocity?.y || 0,
                            z: debris.velocity?.z || 0
                        },
                        altitude: Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) * 6371 - 6371,
                        risk: 50, // Debris always high risk
                        status: 'active',
                        last_updated: new Date().toISOString()
                    });
                }
            });
        }
        
        console.log(`[TelemetryConnector] Collected ${objects.length} objects (${objectCount} total, sample rate: 1/${sampleRate})`);
        return objects;
    }
    
    /**
     * Collect system metrics
     */
    collectMetrics() {
        const physics = window.redOrbitPhysics || {};
        const engine = window.engine || {};
        const engineeringPanel = window.engineeringPanel || {};
        
        return {
            objects_tracked: physics.activeObjects || 0,
            cpu_usage: performance.memory ? (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100) : 0,
            memory_mb: performance.memory ? (performance.memory.usedJSHeapSize / 1024 / 1024) : 0,
            latency_ms: this.lastSendTime ? Date.now() - this.lastSendTime : 0,
            data_rate_mbps: this.bytesSent > 0 ? (this.bytesSent * 8 / 1024 / 1024) / (Date.now() / 1000) : 0,
            active_connections: this.connected ? 1 : 0,
            simulation_time: window.getCurrentSimTime?.()?.toISOString() || new Date().toISOString(),
            time_scale: physics.physicsTimeMultiplier || 1,
            fps: engine.getFps ? Math.round(engine.getFps()) : 30,
            rendered_objects: physics.renderCount || 0,
            collision_checks_per_frame: physics.collisionCount || 0,
            kessler_active: physics.kesslerActive || false,
            debris_generated: physics.debrisGenerated || 0
        };
    }
    
    /**
     * Collect conjunction events
     */
    collectConjunctions() {
        const conjunctions = [];
        const conjunctionHistory = window.conjunctionHistory;
        
        if (conjunctionHistory && conjunctionHistory.events) {
            // Get recent conjunctions (last 100)
            const recent = conjunctionHistory.events.slice(-100);
            
            recent.forEach(event => {
                conjunctions.push({
                    id: event.id || `CONJ-${Date.now()}-${Math.random()}`,
                    object1: event.object1 || 'UNKNOWN',
                    object2: event.object2 || 'UNKNOWN',
                    time_of_closest_approach: event.tca || new Date().toISOString(),
                    time_to_closest: event.timeToClosest || '00:00:00',
                    probability: event.probability || 0,
                    miss_distance: event.missDistance || 0,
                    relative_velocity: event.relativeVelocity || 0,
                    status: event.riskLevel || 'monitoring'
                });
            });
        }
        
        return conjunctions;
    }
    
    /**
     * Collect active alerts
     */
    collectAlerts() {
        const alerts = [];
        
        // Check for critical conjunctions
        const conjunctionHistory = window.conjunctionHistory;
        if (conjunctionHistory) {
            const critical = conjunctionHistory.getCriticalCount?.() || 0;
            if (critical > 0) {
                alerts.push({
                    id: `ALERT-CONJ-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    severity: 'critical',
                    type: 'conjunction',
                    message: `${critical} critical conjunction${critical > 1 ? 's' : ''} detected`,
                    details: {
                        count: critical
                    },
                    acknowledged: false,
                    auto_resolve: false
                });
            }
        }
        
        // Check for Kessler syndrome
        const physics = window.redOrbitPhysics;
        if (physics && physics.kesslerActive) {
            alerts.push({
                id: `ALERT-KESSLER-${Date.now()}`,
                timestamp: new Date().toISOString(),
                severity: 'critical',
                type: 'system',
                message: 'Kessler Syndrome cascade in progress',
                details: {
                    debris_generated: physics.debrisGenerated || 0,
                    collision_count: physics.collisionCount || 0
                },
                acknowledged: false,
                auto_resolve: false
            });
        }
        
        // Check for high object count
        if (physics && physics.activeObjects > 1000000) {
            alerts.push({
                id: `ALERT-SCALE-${Date.now()}`,
                timestamp: new Date().toISOString(),
                severity: 'warning',
                type: 'system',
                message: `High object count: ${physics.activeObjects.toLocaleString()} objects`,
                details: {
                    object_count: physics.activeObjects
                },
                acknowledged: false,
                auto_resolve: true
            });
        }
        
        return alerts;
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
        Object.assign(this.dataConfig, config);
        console.log('[TelemetryConnector] Updated configuration:', this.dataConfig);
    }
    
    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.connected,
            enabled: this.enabled,
            messagesSent: this.messageCount,
            bytesSent: this.bytesSent,
            updateRate: this.updateRate,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Create global instances for different endpoints
window.telemetryConnector = new UniversalTelemetryConnector();

// Convenience shortcuts for specific endpoints
window.redWatchConnector = window.telemetryConnector; // Backward compatibility

// Helper function to create connectors for different endpoints
window.createTelemetryConnector = (config) => {
    return new UniversalTelemetryConnector(config);
};

// Pre-configured connectors for common platforms
window.telemetryConnectors = {
    redWatch: () => new UniversalTelemetryConnector({
        endpoint: 'ws://localhost:8000/ws/ingest',
        name: 'RED WATCH',
        dataConfig: { format: 'redwatch' }
    }),
    grafana: () => new UniversalTelemetryConnector({
        endpoint: 'ws://localhost:3000/api/live/push',
        name: 'Grafana',
        dataConfig: { format: 'grafana' }
    }),
    prometheus: () => new UniversalTelemetryConnector({
        endpoint: 'ws://localhost:9090/api/v1/write',
        name: 'Prometheus',
        dataConfig: { format: 'prometheus' }
    }),
    influxdb: () => new UniversalTelemetryConnector({
        endpoint: 'ws://localhost:8086/api/v2/write',
        name: 'InfluxDB',
        dataConfig: { format: 'influxdb' }
    }),
    custom: (endpoint, format = 'raw') => new UniversalTelemetryConnector({
        endpoint: endpoint,
        name: 'Custom',
        dataConfig: { format: format }
    })
};

// Expose for debugging
console.log('[TelemetryConnector] Universal telemetry connector available at window.telemetryConnector');
console.log('[TelemetryConnector] Use .enable() to start streaming to configured endpoint');
console.log('[TelemetryConnector] Pre-configured connectors available at window.telemetryConnectors');
console.log('[TelemetryConnector] Example: window.telemetryConnectors.grafana().enable()');

export { UniversalTelemetryConnector };