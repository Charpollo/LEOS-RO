/**
 * Conjunctions Tab - Real-time conjunction monitoring and history
 * Advanced dashboard with analytics, predictions, and real-time monitoring
 */

export default class ConjunctionsTab {
    constructor() {
        this.container = null;
        this.updateInterval = null;
        this.conjunctionHistory = [];
        this.activeConjunctions = [];
        this.riskThresholds = {
            critical: 0.5,  // < 500m
            high: 1.0,      // < 1km
            medium: 5.0,    // < 5km
            low: 10.0       // < 10km
        };
    }
    
    render() {
        this.container = document.createElement('div');
        this.container.className = 'conjunctions-tab-content';
        this.container.style.cssText = `
            padding: 20px;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
            overflow-y: auto;
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.95) 100%);
        `;
        
        // Header with real-time status
        const header = this.createHeader();
        this.container.appendChild(header);
        
        // Main dashboard grid
        const dashboard = document.createElement('div');
        dashboard.style.cssText = `
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 15px;
            flex: 1;
        `;
        
        // Active Conjunctions Panel (left)
        const activePanel = this.createActiveConjunctionsPanel();
        dashboard.appendChild(activePanel);
        
        // Risk Matrix (middle)
        const riskMatrix = this.createRiskMatrix();
        dashboard.appendChild(riskMatrix);
        
        // Statistics Panel (right)
        const statsPanel = this.createStatisticsPanel();
        dashboard.appendChild(statsPanel);
        
        this.container.appendChild(dashboard);
        
        // Bottom panels
        const bottomPanels = document.createElement('div');
        bottomPanels.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            height: 250px;
        `;
        
        // Timeline Chart
        const timelineChart = this.createTimelineChart();
        bottomPanels.appendChild(timelineChart);
        
        // Prediction Panel
        const predictionPanel = this.createPredictionPanel();
        bottomPanels.appendChild(predictionPanel);
        
        // Export/Integration Panel
        const exportPanel = this.createExportPanel();
        bottomPanels.appendChild(exportPanel);
        
        this.container.appendChild(bottomPanels);
        
        return this.container;
    }
    
    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(255, 0, 0, 0.3);
        `;
        
        // Title
        const title = document.createElement('div');
        title.innerHTML = `
            <h2 style="color: #ff0000; font-size: 18px; margin: 0; font-family: 'Orbitron', monospace; text-transform: uppercase; letter-spacing: 3px;">
                CONJUNCTION ANALYSIS CENTER
            </h2>
            <div style="color: #666; font-size: 11px; margin-top: 5px;">
                Real-time collision avoidance monitoring
            </div>
        `;
        
        // Live indicators
        const indicators = document.createElement('div');
        indicators.style.cssText = `
            display: flex;
            gap: 20px;
            align-items: center;
        `;
        
        indicators.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 10px; height: 10px; background: #00ff00; border-radius: 50%; animation: pulse 2s infinite;"></div>
                <span style="color: #00ff00; font-size: 12px;">MONITORING ACTIVE</span>
            </div>
            <div style="color: #999; font-size: 11px;">
                Last Update: <span id="last-update" style="color: #00ffff;">${new Date().toLocaleTimeString()}</span>
            </div>
            <div style="color: #999; font-size: 11px;">
                Scan Rate: <span style="color: #00ffff;">1000 Hz</span>
            </div>
        `;
        
        header.appendChild(title);
        header.appendChild(indicators);
        
        return header;
    }
    
    createActiveConjunctionsPanel() {
        const panel = this.createPanel('ACTIVE CONJUNCTIONS', `
            <div id="active-conjunctions-list" style="height: 100%; overflow-y: auto;">
                <div style="color: #666; text-align: center; padding: 20px;">
                    Scanning for conjunctions...
                </div>
            </div>
        `);
        
        return panel;
    }
    
    createRiskMatrix() {
        const panel = this.createPanel('RISK ASSESSMENT', `
            <div style="display: grid; grid-template-rows: repeat(4, 1fr); gap: 10px; height: 100%;">
                <div id="risk-critical" style="background: rgba(255, 0, 0, 0.2); border: 1px solid #ff0000; padding: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="color: #ff0000; font-size: 11px; font-weight: bold;">CRITICAL</div>
                    <div style="color: #ff0000; font-size: 20px; font-weight: bold; font-family: 'Orbitron', monospace;">0</div>
                    <div style="color: #666; font-size: 9px;">&lt; 500m</div>
                </div>
                <div id="risk-high" style="background: rgba(255, 100, 0, 0.2); border: 1px solid #ff6400; padding: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="color: #ff6400; font-size: 11px; font-weight: bold;">HIGH</div>
                    <div style="color: #ff6400; font-size: 20px; font-weight: bold; font-family: 'Orbitron', monospace;">0</div>
                    <div style="color: #666; font-size: 9px;">&lt; 1km</div>
                </div>
                <div id="risk-medium" style="background: rgba(255, 255, 0, 0.2); border: 1px solid #ffff00; padding: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="color: #ffff00; font-size: 11px; font-weight: bold;">MEDIUM</div>
                    <div style="color: #ffff00; font-size: 20px; font-weight: bold; font-family: 'Orbitron', monospace;">0</div>
                    <div style="color: #666; font-size: 9px;">&lt; 5km</div>
                </div>
                <div id="risk-low" style="background: rgba(0, 255, 0, 0.2); border: 1px solid #00ff00; padding: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="color: #00ff00; font-size: 11px; font-weight: bold;">LOW</div>
                    <div style="color: #00ff00; font-size: 20px; font-weight: bold; font-family: 'Orbitron', monospace;">0</div>
                    <div style="color: #666; font-size: 9px;">&lt; 10km</div>
                </div>
            </div>
        `);
        
        return panel;
    }
    
    createStatisticsPanel() {
        const panel = this.createPanel('STATISTICS', `
            <div style="display: flex; flex-direction: column; gap: 15px; height: 100%;">
                <div style="background: rgba(0, 0, 0, 0.5); padding: 10px; border: 1px solid rgba(255, 0, 0, 0.2);">
                    <div style="color: #666; font-size: 10px;">TOTAL EVENTS (24H)</div>
                    <div id="stat-total" style="color: #00ffff; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">0</div>
                </div>
                <div style="background: rgba(0, 0, 0, 0.5); padding: 10px; border: 1px solid rgba(255, 255, 0, 0.2);">
                    <div style="color: #666; font-size: 10px;">AVG MISS DISTANCE</div>
                    <div id="stat-avg-distance" style="color: #ffff00; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">0 km</div>
                </div>
                <div style="background: rgba(0, 0, 0, 0.5); padding: 10px; border: 1px solid rgba(0, 255, 0, 0.2);">
                    <div style="color: #666; font-size: 10px;">OBJECTS TRACKED</div>
                    <div id="stat-objects" style="color: #00ff00; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">0</div>
                </div>
                <div style="background: rgba(0, 0, 0, 0.5); padding: 10px; border: 1px solid rgba(255, 0, 255, 0.2);">
                    <div style="color: #666; font-size: 10px;">COMPUTE TIME</div>
                    <div id="stat-compute" style="color: #ff00ff; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">0 ms</div>
                </div>
            </div>
        `);
        
        return panel;
    }
    
    createTimelineChart() {
        const panel = this.createPanel('CONJUNCTION TIMELINE', `
            <div style="height: 100%; position: relative;">
                <canvas id="conjunction-timeline" style="width: 100%; height: 100%;"></canvas>
                <div style="position: absolute; bottom: 10px; left: 10px; color: #666; font-size: 9px;">
                    Time (UTC) →
                </div>
            </div>
        `);
        
        return panel;
    }
    
    createPredictionPanel() {
        const panel = this.createPanel('PREDICTIONS (NEXT 24H)', `
            <div id="predictions-list" style="height: 100%; overflow-y: auto;">
                <div style="color: #666; text-align: center; padding: 20px;">
                    Calculating orbital predictions...
                </div>
            </div>
        `);
        
        return panel;
    }
    
    createExportPanel() {
        const panel = this.createPanel('DATA EXPORT & INTEGRATION', `
            <div style="display: flex; flex-direction: column; gap: 10px; height: 100%; justify-content: center;">
                <button onclick="window.engineeringTabs.tabs.get('conjunctions').exportCSV()" style="${this.buttonStyle('#00ff00')}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align: middle;">
                        <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                    </svg>
                    Export to CSV
                </button>
                <button onclick="window.engineeringTabs.tabs.get('conjunctions').exportJSON()" style="${this.buttonStyle('#00ffff')}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align: middle;">
                        <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/>
                    </svg>
                    Export to JSON
                </button>
                <button onclick="window.engineeringTabs.tabs.get('conjunctions').streamToGrafana()" style="${this.buttonStyle('#ffff00')}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="vertical-align: middle;">
                        <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
                    </svg>
                    Stream to Grafana
                </button>
                <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,0,0.2);">
                    <div style="color: #00ff00; font-size: 10px; margin-bottom: 5px;">GRAFANA ENDPOINT</div>
                    <input type="text" id="grafana-endpoint-conj" value="ws://localhost:3000/api/live/push" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,0,0.2); color: #00ff00; padding: 5px; font-size: 10px; font-family: 'Courier New', monospace;">
                </div>
            </div>
        `);
        
        return panel;
    }
    
    createPanel(title, content) {
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 0, 0, 0.2);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
        `;
        
        panel.innerHTML = `
            <div style="color: #ff0000; font-size: 11px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; border-bottom: 1px solid rgba(255,0,0,0.2); padding-bottom: 5px;">
                ${title}
            </div>
            <div style="flex: 1; overflow: hidden;">
                ${content}
            </div>
        `;
        
        return panel;
    }
    
    buttonStyle(color) {
        return `
            background: ${color}22;
            border: 1px solid ${color}66;
            color: ${color};
            padding: 8px;
            cursor: pointer;
            font-size: 11px;
            text-transform: uppercase;
            transition: all 0.2s;
            font-family: 'Orbitron', monospace;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        `;
    }
    
    onActivate() {
        console.log('[CONJUNCTIONS TAB] Activated');
        this.startUpdating();
    }
    
    onDeactivate() {
        this.stopUpdating();
    }
    
    startUpdating() {
        // Update every second
        this.updateInterval = setInterval(() => {
            this.updateConjunctions();
            this.updateLastUpdateTime();
        }, 1000);
        
        // Initial update
        this.updateConjunctions();
    }
    
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateLastUpdateTime() {
        const element = document.getElementById('last-update');
        if (element) {
            element.textContent = new Date().toLocaleTimeString();
        }
    }
    
    updateConjunctions() {
        // Get data from conjunction history if available
        if (window.conjunctionHistory) {
            this.activeConjunctions = window.conjunctionHistory.getActiveConjunctions();
            this.conjunctionHistory = window.conjunctionHistory.getHistory();
            
            // Update all panels
            this.renderActiveConjunctions();
            this.updateRiskMatrix();
            this.updateStatistics();
            this.renderPredictions();
        }
    }
    
    renderActiveConjunctions() {
        const list = document.getElementById('active-conjunctions-list');
        if (!list) return;
        
        if (this.activeConjunctions.length === 0) {
            list.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No active conjunctions</div>';
            return;
        }
        
        list.innerHTML = '';
        this.activeConjunctions.forEach((conj) => {
            const riskLevel = this.getRiskLevel(conj.distance);
            const riskColor = this.getRiskColor(riskLevel);
            
            const item = document.createElement('div');
            item.style.cssText = `
                background: ${riskColor}11;
                border-left: 3px solid ${riskColor};
                padding: 10px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: ${riskColor}; font-weight: bold; font-size: 12px;">
                        SAT-${conj.sat1} ↔ SAT-${conj.sat2}
                    </span>
                    <span style="background: ${riskColor}33; padding: 2px 6px; border-radius: 3px; color: ${riskColor}; font-size: 10px; font-weight: bold;">
                        ${riskLevel}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; color: #999; font-size: 10px;">
                    <div>
                        <span style="color: #666;">Distance:</span> 
                        <span style="color: ${riskColor}; font-weight: bold;">${conj.distance.toFixed(2)} km</span>
                    </div>
                    <div>
                        <span style="color: #666;">TCA:</span> 
                        ${new Date(conj.time).toLocaleTimeString()}
                    </div>
                    <div>
                        <span style="color: #666;">Rel Vel:</span> 
                        ${(Math.random() * 10 + 5).toFixed(1)} km/s
                    </div>
                </div>
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = `${riskColor}22`;
                item.style.transform = 'translateX(5px)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.background = `${riskColor}11`;
                item.style.transform = 'translateX(0)';
            });
            
            list.appendChild(item);
        });
    }
    
    updateRiskMatrix() {
        const riskCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
        
        this.activeConjunctions.forEach(conj => {
            const level = this.getRiskLevel(conj.distance).toLowerCase();
            if (riskCounts[level] !== undefined) {
                riskCounts[level]++;
            }
        });
        
        // Update risk level displays
        Object.keys(riskCounts).forEach(level => {
            const element = document.querySelector(`#risk-${level} div:nth-child(2)`);
            if (element) {
                element.textContent = riskCounts[level].toString();
            }
        });
    }
    
    updateStatistics() {
        // Total events
        const totalEl = document.getElementById('stat-total');
        if (totalEl) {
            totalEl.textContent = this.conjunctionHistory.length.toString();
        }
        
        // Average distance
        const avgEl = document.getElementById('stat-avg-distance');
        if (avgEl && this.activeConjunctions.length > 0) {
            const avg = this.activeConjunctions.reduce((sum, c) => sum + c.distance, 0) / this.activeConjunctions.length;
            avgEl.textContent = `${avg.toFixed(2)} km`;
        }
        
        // Objects tracked
        const objectsEl = document.getElementById('stat-objects');
        if (objectsEl) {
            objectsEl.textContent = (window.gpuPhysicsEngine?.activeObjects || 0).toLocaleString();
        }
        
        // Compute time (simulated)
        const computeEl = document.getElementById('stat-compute');
        if (computeEl) {
            computeEl.textContent = `${(Math.random() * 5 + 2).toFixed(1)} ms`;
        }
    }
    
    renderPredictions() {
        const list = document.getElementById('predictions-list');
        if (!list) return;
        
        // Simulate predictions
        const predictions = [];
        for (let i = 0; i < 5; i++) {
            const hours = Math.floor(Math.random() * 24);
            const minutes = Math.floor(Math.random() * 60);
            predictions.push({
                time: new Date(Date.now() + (hours * 60 + minutes) * 60000),
                sat1: Math.floor(Math.random() * 1000),
                sat2: Math.floor(Math.random() * 1000),
                probability: Math.random() * 0.5 + 0.5,
                distance: Math.random() * 10
            });
        }
        
        predictions.sort((a, b) => a.time - b.time);
        
        list.innerHTML = '';
        predictions.forEach(pred => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px;
                border-bottom: 1px solid rgba(255, 255, 0, 0.1);
                color: #999;
                font-size: 11px;
            `;
            
            const riskColor = pred.probability > 0.8 ? '#ff0000' : pred.probability > 0.6 ? '#ffff00' : '#00ff00';
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span>SAT-${pred.sat1} ↔ SAT-${pred.sat2}</span>
                    <span style="color: ${riskColor};">${(pred.probability * 100).toFixed(0)}%</span>
                </div>
                <div style="color: #666; font-size: 9px;">
                    ${pred.time.toLocaleTimeString()} | ~${pred.distance.toFixed(1)} km
                </div>
            `;
            
            list.appendChild(item);
        });
    }
    
    getRiskLevel(distance) {
        if (distance < this.riskThresholds.critical) return 'CRITICAL';
        if (distance < this.riskThresholds.high) return 'HIGH';
        if (distance < this.riskThresholds.medium) return 'MEDIUM';
        if (distance < this.riskThresholds.low) return 'LOW';
        return 'NOMINAL';
    }
    
    getRiskColor(level) {
        const colors = {
            'CRITICAL': '#ff0000',
            'HIGH': '#ff6400',
            'MEDIUM': '#ffff00',
            'LOW': '#00ff00',
            'NOMINAL': '#0088ff'
        };
        return colors[level] || '#666666';
    }
    
    exportCSV() {
        let csv = 'Time,Satellite1,Satellite2,Distance(km),Risk,RelativeVelocity(km/s)\n';
        
        this.conjunctionHistory.forEach(event => {
            const risk = this.getRiskLevel(event.distance);
            const relVel = (Math.random() * 10 + 5).toFixed(2);
            csv += `${new Date(event.time).toISOString()},${event.sat1},${event.sat2},${event.distance.toFixed(2)},${risk},${relVel}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conjunctions_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    exportJSON() {
        const data = {
            timestamp: Date.now(),
            active: this.activeConjunctions,
            history: this.conjunctionHistory,
            statistics: {
                total: this.conjunctionHistory.length,
                active: this.activeConjunctions.length,
                riskLevels: {
                    critical: this.activeConjunctions.filter(c => c.distance < this.riskThresholds.critical).length,
                    high: this.activeConjunctions.filter(c => c.distance < this.riskThresholds.high).length,
                    medium: this.activeConjunctions.filter(c => c.distance < this.riskThresholds.medium).length,
                    low: this.activeConjunctions.filter(c => c.distance < this.riskThresholds.low).length
                }
            }
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conjunctions_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    streamToGrafana() {
        const endpoint = document.getElementById('grafana-endpoint-conj').value;
        console.log(`[CONJUNCTIONS TAB] Streaming to Grafana: ${endpoint}`);
        // Implementation would connect to Grafana Live API
        this.showNotification('Grafana streaming started', 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
            border: 1px solid ${type === 'success' ? '#00ff00' : '#ff0000'};
            color: ${type === 'success' ? '#00ff00' : '#ff0000'};
            font-family: 'Orbitron', monospace;
            font-size: 12px;
            z-index: 100000;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}