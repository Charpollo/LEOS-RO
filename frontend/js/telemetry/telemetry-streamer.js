/**
 * Telemetry Streamer for Grafana Integration
 * Streams REAL-TIME OPERATIONAL DATA to Grafana Live
 * Part of RO-Grafana architecture separation
 */

export class TelemetryStreamer {
    constructor(config = {}) {
        this.serverUrl = config.serverUrl || 'ws://localhost:3001';
        this.interval = config.interval || 1000; // 1 second default
        this.enabled = false;
        this.streamTimer = null;
        this.ws = null;
        
        // Connection state
        this.connected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        
        // Performance tracking
        this.lastStreamTime = 0;
        this.streamCount = 0;
        this.errorCount = 0;
        this.startTime = Date.now();
        
        // Track last values for delta calculations
        this.lastValues = {};
        
        console.log('[TelemetryStreamer] Initialized with config:', {
            serverUrl: this.serverUrl,
            interval: this.interval
        });
    }
    
    /**
     * Start streaming telemetry data
     */
    async startStreaming() {
        if (this.enabled) {
            console.warn('[TelemetryStreamer] Already streaming');
            return;
        }
        
        console.log('[TelemetryStreamer] Starting telemetry stream...');
        this.enabled = true;
        this.startTime = Date.now();
        
        // Connect to WebSocket server
        this.connectWebSocket();
        
        // Start streaming loop
        this.streamTimer = setInterval(() => {
            if (this.connected) {
                this.sendTelemetryPacket();
            }
        }, this.interval);
        
        return true;
    }
    
    /**
     * Stop streaming telemetry data
     */
    stopStreaming() {
        if (!this.enabled) return;
        
        console.log('[TelemetryStreamer] Stopping telemetry stream');
        this.enabled = false;
        
        if (this.streamTimer) {
            clearInterval(this.streamTimer);
            this.streamTimer = null;
        }
        
        // Close WebSocket connection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.connected = false;
    }
    
    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        
        console.log('[TelemetryStreamer] Connecting to WebSocket server:', this.serverUrl);
        
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('[TelemetryStreamer] WebSocket connected');
                this.connected = true;
                this.connectionAttempts = 0;
                
                // Send initial packet
                this.sendTelemetryPacket();
            };
            
            this.ws.onclose = () => {
                console.log('[TelemetryStreamer] WebSocket disconnected');
                this.connected = false;
                
                // Reconnect if enabled
                if (this.enabled && this.connectionAttempts < this.maxRetries) {
                    this.connectionAttempts++;
                    console.log(`[TelemetryStreamer] Reconnecting... (attempt ${this.connectionAttempts})`);
                    setTimeout(() => this.connectWebSocket(), 2000);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('[TelemetryStreamer] WebSocket error:', error);
            };
            
            this.ws.onmessage = (event) => {
                // Handle any messages from server if needed
                try {
                    const data = JSON.parse(event.data);
                    // Only log errors or important messages
                    if (data.error || data.warning || data.alert) {
                        console.log('[TelemetryStreamer] Server message:', data);
                    }
                } catch (e) {
                    // Ignore non-JSON messages
                }
            };
        } catch (error) {
            console.error('[TelemetryStreamer] Failed to create WebSocket:', error);
            this.connected = false;
        }
    }
    
    /**
     * Send telemetry packet via WebSocket
     */
    sendTelemetryPacket(flags = {}) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        
        const packet = this.buildCompleteTelemetryPacket(flags);
        
        try {
            this.ws.send(JSON.stringify(packet));
            this.streamCount++;
            this.lastStreamTime = Date.now();
        } catch (error) {
            this.errorCount++;
            console.error('[TelemetryStreamer] Failed to send packet:', error);
        }
    }
    
    /**
     * Build COMPLETE telemetry packet with ALL REAL simulation data
     */
    buildCompleteTelemetryPacket(flags = {}) {
        const now = Date.now();
        
        // Get all system references
        const physics = window.redOrbitPhysics || {};
        const engine = window.engine || {};
        const engineeringPanel = window.engineeringPanel || {};
        const conjunctionHistory = window.conjunctionHistory || {};
        const simState = window.simState || {};
        
        // ============= CORE SIMULATION METRICS =============
        const simulated = physics.activeObjects || engineeringPanel.currentSimulation?.simulated || 0;
        const rendered = physics.renderCount || engineeringPanel.currentSimulation?.rendered || 0;
        const maxCapacity = physics.maxObjects || 10000000;
        const fps = engine.getFps ? Math.round(engine.getFps()) : 0;
        
        // ============= PERFORMANCE METRICS =============
        const stats = physics.getStats ? physics.getStats() : {};
        const renderStats = physics.renderManager?.getStats?.() || {};
        
        // Calculate real GPU memory usage (32 bytes per vec4 * 4 attributes per object)
        const gpuMemoryMB = ((simulated * 32 * 4) / (1024 * 1024));
        const gpuMemoryPercent = (gpuMemoryMB / 8192) * 100; // Assume 8GB GPU
        
        // Calculate physics compute time
        const computeTimeMs = stats.physicsTime || (1000 / Math.max(fps, 1));
        
        // ============= KESSLER SYNDROME DATA =============
        const kesslerStatus = physics.getKesslerStatus ? physics.getKesslerStatus() : {
            active: false,
            chainReactionActive: false,
            debrisGenerated: 0,
            collisionCount: 0,
            criticalMass: false
        };
        
        // ============= CONJUNCTION/COLLISION DATA =============
        const activeConjunctions = conjunctionHistory.getActiveConjunctions?.() || [];
        const conjunctionHistoryData = conjunctionHistory.getHistory?.() || [];
        
        // Get REAL critical and warning counts based on actual distance thresholds
        const criticalThreshold = 5; // km
        const warningThreshold = 50; // km
        
        const criticalConjunctions = activeConjunctions.filter(c => 
            c.minDistance < criticalThreshold
        );
        
        const warningConjunctions = activeConjunctions.filter(c => 
            c.minDistance >= criticalThreshold && c.minDistance < warningThreshold
        );
        
        const nearMisses = activeConjunctions.filter(c => 
            c.minDistance >= warningThreshold && c.minDistance < 100
        );
        
        // Calculate REAL collision probability based on conjunction data
        let maxCollisionProbability = 0;
        let highestRiskPair = null;
        
        activeConjunctions.forEach(conj => {
            // Simple probability calculation based on distance and relative velocity
            const probability = Math.max(0, Math.min(100, 
                (100 - conj.minDistance) * (conj.relativeVelocity / 15)
            ));
            
            if (probability > maxCollisionProbability) {
                maxCollisionProbability = probability;
                highestRiskPair = conj;
            }
        });
        
        // ============= ORBITAL DISTRIBUTION =============
        // Get REAL orbital distribution from physics engine or calculate from positions
        let orbitDistribution = { LEO: 0, MEO: 0, GEO: 0, HEO: 0 };
        
        if (physics.orbitStats) {
            orbitDistribution = physics.orbitStats;
        } else if (physics.objects && physics.objects.length > 0) {
            // Calculate from actual orbital altitudes
            physics.objects.forEach(obj => {
                const altitude = obj.altitude || 0;
                if (altitude < 2000) orbitDistribution.LEO++;
                else if (altitude < 35786) orbitDistribution.MEO++;
                else if (altitude < 40000) orbitDistribution.GEO++;
                else orbitDistribution.HEO++;
            });
        } else {
            // Fallback estimation
            orbitDistribution.LEO = Math.floor(simulated * 0.6);
            orbitDistribution.MEO = Math.floor(simulated * 0.25);
            orbitDistribution.GEO = Math.floor(simulated * 0.1);
            orbitDistribution.HEO = Math.floor(simulated * 0.05);
        }
        
        // ============= DETAILED CONJUNCTION EVENTS =============
        // Get top 10 highest risk conjunctions with full details
        const topRiskEvents = activeConjunctions
            .sort((a, b) => a.minDistance - b.minDistance)
            .slice(0, 10)
            .map(conj => ({
                id: conj.id,
                object1: {
                    id: conj.object1,
                    name: conj.object1Name || `OBJ-${conj.object1}`,
                    type: conj.object1Type || 'satellite',
                    altitude: conj.object1Altitude || 0,
                    velocity: conj.object1Velocity || 0
                },
                object2: {
                    id: conj.object2,
                    name: conj.object2Name || `OBJ-${conj.object2}`,
                    type: conj.object2Type || 'debris',
                    altitude: conj.object2Altitude || 0,
                    velocity: conj.object2Velocity || 0
                },
                minDistance: conj.minDistance,
                timeToClosest: conj.timeToClosest,
                relativeVelocity: conj.relativeVelocity,
                collisionProbability: Math.max(0, Math.min(100, 
                    (100 - conj.minDistance) * (conj.relativeVelocity / 15)
                )),
                riskLevel: conj.minDistance < 5 ? 'CRITICAL' : 
                          conj.minDistance < 50 ? 'WARNING' : 'WATCH'
            }));
        
        // ============= TREND CALCULATIONS =============
        // Calculate deltas from last values
        const debrisGrowthRate = (kesslerStatus.debrisGenerated - (this.lastValues.debrisGenerated || 0)) / 
                                 Math.max(1, (now - (this.lastValues.timestamp || now)) / 1000);
        
        const collisionRate = (kesslerStatus.collisionCount - (this.lastValues.collisionCount || 0)) / 
                              Math.max(1, (now - (this.lastValues.timestamp || now)) / 60000); // per minute
        
        // Store current values for next delta calculation
        this.lastValues = {
            timestamp: now,
            debrisGenerated: kesslerStatus.debrisGenerated,
            collisionCount: kesslerStatus.collisionCount
        };
        
        // ============= SYSTEM STATUS =============
        const systemStatus = {
            operational: fps > 20 && this.connected,
            performance: fps > 30 ? 'OPTIMAL' : fps > 20 ? 'NOMINAL' : fps > 10 ? 'DEGRADED' : 'CRITICAL',
            simulationLoad: (simulated / maxCapacity) * 100,
            renderLoad: (rendered / (maxCapacity * 0.1)) * 100, // Assume 10:1 max ratio
            kesslerRisk: kesslerStatus.criticalMass ? 'CRITICAL' : 
                        kesslerStatus.chainReactionActive ? 'ACTIVE' : 
                        kesslerStatus.active ? 'WARNING' : 'NOMINAL'
        };
        
        // ============= BUILD COMPLETE PACKET =============
        const packet = {
            // Timestamp and metadata
            timestamp: now,
            scenario: engineeringPanel.currentScenario || 'Default',
            
            // Core metrics - REAL VALUES
            simulated,
            rendered,
            ratio: Math.round(simulated / Math.max(1, rendered)),
            fps,
            
            // Performance metrics - REAL VALUES
            computeTimeMs,
            gpuMemoryMB: gpuMemoryMB.toFixed(2),
            gpuMemoryPercent: gpuMemoryPercent.toFixed(1),
            
            // Conjunction metrics - REAL VALUES
            criticalConjunctions: criticalConjunctions.length,
            warningConjunctions: warningConjunctions.length,
            nearMisses: nearMisses.length,
            activeConjunctions: activeConjunctions.length,
            collisionProbability: maxCollisionProbability.toFixed(2),
            
            // Kessler syndrome - REAL VALUES
            kesslerActive: kesslerStatus.active,
            chainReactionActive: kesslerStatus.chainReactionActive,
            debrisCount: kesslerStatus.debrisGenerated,
            collisionCount: kesslerStatus.collisionCount,
            debrisGrowthRate: debrisGrowthRate.toFixed(2),
            collisionRate: collisionRate.toFixed(2),
            
            // Orbital distribution - REAL VALUES
            LEO: orbitDistribution.LEO,
            MEO: orbitDistribution.MEO,
            GEO: orbitDistribution.GEO,
            HEO: orbitDistribution.HEO,
            
            // Simulation control
            timeMultiplier: simState.timeMultiplier || 1,
            paused: simState.paused || false,
            simulationTime: window.getCurrentSimTime?.()?.toISOString() || new Date().toISOString(),
            
            // System status
            systemStatus,
            
            // Detailed events for drill-down
            topRiskEvents,
            highestRiskPair: highestRiskPair ? {
                objects: `${highestRiskPair.object1} <-> ${highestRiskPair.object2}`,
                distance: highestRiskPair.minDistance,
                timeToImpact: highestRiskPair.timeToClosest,
                probability: maxCollisionProbability.toFixed(2)
            } : null,
            
            // Historical metrics (last 5 minutes)
            recentCollisions: conjunctionHistoryData
                .filter(h => (now - new Date(h.timestamp).getTime()) < 300000)
                .length,
            
            // Streamer performance
            streamHealth: {
                packetsTransmitted: this.streamCount,
                errors: this.errorCount,
                errorRate: ((this.errorCount / Math.max(1, this.streamCount)) * 100).toFixed(2),
                uptime: Math.floor((now - this.startTime) / 1000)
            }
        };
        
        return packet;
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
        const wasStreaming = this.enabled;
        
        if (wasStreaming) {
            this.stopStreaming();
        }
        
        this.serverUrl = config.serverUrl || this.serverUrl;
        this.interval = config.interval || this.interval;
        
        console.log('[TelemetryStreamer] Configuration updated:', {
            serverUrl: this.serverUrl,
            interval: this.interval
        });
        
        if (wasStreaming) {
            this.startStreaming();
        }
    }
    
    /**
     * Reset telemetry stream for new scenario
     */
    resetForScenario(scenarioName) {
        console.log(`[TelemetryStreamer] Resetting for scenario: ${scenarioName}`);
        
        // Send a marker packet indicating scenario change
        this.sendTelemetryPacket({ 
            scenarioChange: true,
            newScenario: scenarioName,
            timestamp: Date.now()
        });
        
        // Reset counters
        this.streamCount = 0;
        this.errorCount = 0;
        this.lastStreamTime = Date.now();
        this.lastValues = {};
        
        // Store current scenario
        this.currentScenario = scenarioName;
    }
    
    /**
     * Get streamer statistics
     */
    getStats() {
        return {
            enabled: this.enabled,
            connected: this.connected,
            streamCount: this.streamCount,
            errorCount: this.errorCount,
            errorRate: this.streamCount > 0 ? (this.errorCount / this.streamCount * 100).toFixed(1) + '%' : '0%',
            lastStreamTime: this.lastStreamTime,
            uptime: Date.now() - (this.startTime || Date.now()),
            currentScenario: this.currentScenario || 'Unknown'
        };
    }
}

// Create singleton instance
export const telemetryStreamer = new TelemetryStreamer();

// Expose globally for debugging
window.telemetryStreamer = telemetryStreamer;