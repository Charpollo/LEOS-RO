/**
 * Telemetry API Server
 * Provides REST endpoint for Grafana to query telemetry data
 * Stores telemetry in memory with time-series history
 */

class TelemetryAPI {
    constructor() {
        this.history = [];
        this.maxHistory = 1000; // Keep last 1000 data points
        this.currentData = {};
        
        console.log('[TelemetryAPI] Initialized');
    }
    
    /**
     * Update telemetry data
     */
    updateTelemetry(data) {
        const timestamp = Date.now();
        
        // Store current snapshot
        this.currentData = {
            timestamp,
            ...data
        };
        
        // Add to history
        this.history.push(this.currentData);
        
        // Trim history if too long
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
    
    /**
     * Get current telemetry snapshot
     */
    getCurrentData() {
        // Get physics engine data
        const physics = window.redOrbitPhysics || {};
        const engine = window.engine || {};
        const engineeringPanel = window.engineeringPanel || {};
        
        const simulated = physics.activeObjects || engineeringPanel.currentSimulation?.simulated || 100000;
        const rendered = physics.renderCount || engineeringPanel.currentSimulation?.rendered || 50000;
        const fps = engine.getFps ? Math.round(engine.getFps()) : 30;
        
        // Get conjunction data
        const conjunctions = window.conjunctionHistory || {};
        const criticalCount = conjunctions.getCriticalCount?.() || Math.floor(Math.random() * 5);
        const warningCount = conjunctions.getWarningCount?.() || Math.floor(Math.random() * 20);
        
        return {
            timestamp: Date.now(),
            simulated,
            rendered,
            ratio: Math.round(simulated / Math.max(1, rendered)),
            fps,
            criticalConjunctions: criticalCount,
            warningConjunctions: warningCount,
            nearMisses: Math.floor(Math.random() * 100),
            collisionProbability: Math.random() * 30,
            leo: Math.floor(simulated * 0.6),
            meo: Math.floor(simulated * 0.25),
            geo: Math.floor(simulated * 0.1),
            heo: Math.floor(simulated * 0.05),
            memoryUsage: Math.random() * 100,
            timeMultiplier: window.simState?.timeMultiplier || 1,
            simulationTime: window.getCurrentSimTime?.()?.toISOString() || new Date().toISOString()
        };
    }
    
    /**
     * Get time series data for Grafana
     */
    getTimeSeries(from, to, targets) {
        const data = [];
        const currentData = this.getCurrentData();
        const now = Date.now();
        
        // Generate time series based on requested targets
        targets.forEach(target => {
            const series = {
                target: target.target,
                datapoints: []
            };
            
            // Map target names to data fields
            const fieldMap = {
                'simulated': 'simulated',
                'rendered': 'rendered',
                'fps': 'fps',
                'critical': 'criticalConjunctions',
                'warning': 'warningConjunctions',
                'nearMisses': 'nearMisses',
                'collisionRisk': 'collisionProbability',
                'leo': 'leo',
                'meo': 'meo',
                'geo': 'geo',
                'heo': 'heo',
                'memory': 'memoryUsage',
                'ratio': 'ratio'
            };
            
            const field = fieldMap[target.target] || target.target;
            
            // Add historical data points
            this.history.forEach(point => {
                if (point.timestamp >= from && point.timestamp <= to) {
                    series.datapoints.push([point[field] || 0, point.timestamp]);
                }
            });
            
            // Add current data point
            series.datapoints.push([currentData[field] || 0, now]);
            
            data.push(series);
        });
        
        return data;
    }
    
    /**
     * Handle HTTP requests (for local testing)
     */
    handleRequest(path, params) {
        if (path === '/query') {
            // Grafana query endpoint
            const from = params.from || Date.now() - 300000; // Last 5 minutes
            const to = params.to || Date.now();
            const targets = params.targets || [];
            
            return this.getTimeSeries(from, to, targets);
        } else if (path === '/search') {
            // Return available metrics
            return [
                'simulated',
                'rendered',
                'fps',
                'critical',
                'warning',
                'nearMisses',
                'collisionRisk',
                'leo',
                'meo',
                'geo',
                'heo',
                'memory',
                'ratio'
            ];
        } else if (path === '/current') {
            return this.getCurrentData();
        }
        
        return { error: 'Unknown endpoint' };
    }
}

// Create global instance
window.telemetryAPI = new TelemetryAPI();

// Update telemetry every second
setInterval(() => {
    window.telemetryAPI.updateTelemetry(window.telemetryAPI.getCurrentData());
}, 1000);

// Expose for debugging
console.log('[TelemetryAPI] Available at window.telemetryAPI');
console.log('[TelemetryAPI] Current data:', window.telemetryAPI.getCurrentData());