/**
 * KESSLER CASCADE UI SYSTEM
 * Real-time tracking and control interface
 */

export class KesslerUI {
    constructor() {
        this.createDashboard();
        this.setupEventListeners();
        this.updateInterval = null;
    }
    
    createDashboard() {
        // Don't create dashboard here - it will be created by navigation controller
        return;
    }
    
    createToggleButton() {
        // Don't create floating button - navigation handles this
        return;
    }
    
    setupEventListeners() {
        // Skip button setup since navigation handles this
        
        // Anomaly injection buttons
        document.querySelectorAll('[data-anomaly]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.anomaly;
                this.injectAnomaly(type);
            });
        });
        
        // Cascade trigger buttons
        document.querySelectorAll('[data-scenario]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenario = e.target.dataset.scenario;
                this.triggerCascade(scenario);
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'k' || e.key === 'K') {
                // Navigate to Kessler page when K is pressed
                const kesslerNavItem = document.querySelector('[data-content="kessler"]');
                if (kesslerNavItem) {
                    kesslerNavItem.click();
                }
            }
            
            // Quick triggers with number keys - WORK FROM ANYWHERE
            switch(e.key) {
                case '1':
                    this.injectAnomaly('rogue');
                    break;
                case '2':
                    this.injectAnomaly('asat');
                    break;
                case '3':
                    this.injectAnomaly('meteorite');
                    break;
                case '4':
                    this.injectAnomaly('defunct');
                    break;
                case '5':
                    this.triggerCascade('collision');
                    break;
            }
        });
    }
    
    show() {
        const dashboard = document.getElementById('kessler-dashboard');
        const mainToggle = document.getElementById('kessler-toggle-main');
        
        dashboard.style.display = 'block';
        mainToggle.style.display = 'none';
        
        // Start real-time updates
        this.startUpdates();
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('KESSLER CASCADE CONTROL ACTIVATED', 'warning');
        }
    }
    
    hide() {
        const dashboard = document.getElementById('kessler-dashboard');
        const mainToggle = document.getElementById('kessler-toggle-main');
        
        dashboard.style.display = 'none';
        mainToggle.style.display = 'block';
        
        // Stop updates when hidden
        this.stopUpdates();
    }
    
    injectAnomaly(type) {
        if (!window.advancedKessler) {
            console.error('Advanced Kessler system not initialized!');
            return;
        }
        
        // Map UI types to system types
        const typeMap = {
            'rogue': 'rogue_satellite',
            'asat': 'asat_debris',
            'meteorite': 'micrometeorite',
            'defunct': 'defunct_stage'
        };
        
        // Create specific anomaly
        const anomaly = window.advancedKessler.createAnomaly(typeMap[type]);
        window.advancedKessler.anomalies.set(anomaly.id, anomaly);
        window.advancedKessler.dashboardData.activeAnomalies++;
        window.advancedKessler.updateThreatLevel();
        
        // Flash effect
        this.flashButton(event.target);
        
        // Show notification
        const messages = {
            'rogue': '⚠️ ROGUE SATELLITE DETECTED!',
            'asat': '💥 ASAT DEBRIS FIELD CREATED!',
            'meteorite': '☄️ MICROMETEORITE INCOMING!',
            'defunct': '🚀 DEFUNCT STAGE TUMBLING!'
        };
        
        if (window.showNotification) {
            window.showNotification(messages[type], 'error');
        }
        
        // Update display immediately
        this.updateDisplay();
    }
    
    triggerCascade(scenario) {
        if (!window.advancedKessler) {
            console.error('Advanced Kessler system not initialized!');
            return;
        }
        
        window.advancedKessler.triggerAdvancedKessler(scenario);
        
        // Flash all cascade buttons
        document.querySelectorAll('.cascade-btn').forEach(btn => {
            this.flashButton(btn);
        });
        
        // Show dramatic notification
        const messages = {
            'collision': '💥 COLLISION CASCADE INITIATED!',
            'asat': '🎯 ASAT STRIKE DETECTED!',
            'cascade': '🌟 MULTI-POINT CASCADE TRIGGERED!',
            'swarm': '☄️ DEBRIS SWARM ENCOUNTERED!'
        };
        
        if (window.showNotification) {
            window.showNotification(messages[scenario], 'critical');
        }
    }
    
    flashButton(button) {
        if (!button) return;
        
        const originalBg = button.style.background;
        button.style.background = 'rgba(255, 255, 0, 0.6)';
        button.style.boxShadow = '0 0 20px rgba(255, 255, 0, 1)';
        
        setTimeout(() => {
            button.style.background = originalBg;
            button.style.boxShadow = '';
        }, 300);
    }
    
    startUpdates() {
        // Update every 100ms for smooth real-time tracking
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 100);
    }
    
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateDisplay() {
        if (!window.advancedKessler) return;
        
        const status = window.advancedKessler.getStatus();
        
        // Update threat level
        const threatStatus = document.getElementById('threat-status');
        if (threatStatus) {
            threatStatus.textContent = status.threatLevel;
            
            // Color based on threat
            const colors = {
                'NOMINAL': '#00ff00',
                'CAUTION': '#ffff00',
                'ELEVATED': '#ff8800',
                'SEVERE': '#ff4400',
                'CRITICAL': '#ff0000'
            };
            
            threatStatus.style.color = colors[status.threatLevel] || '#00ff00';
            
            // Add pulse effect for high threats
            if (status.threatLevel === 'SEVERE' || status.threatLevel === 'CRITICAL') {
                threatStatus.classList.add('warning-pulse');
            } else {
                threatStatus.classList.remove('warning-pulse');
            }
        }
        
        // Update metrics
        document.getElementById('anomaly-count').textContent = status.activeAnomalies || 0;
        document.getElementById('collision-count').textContent = status.cascadeMetrics?.totalCollisions || 0;
        document.getElementById('debris-count').textContent = status.cascadeMetrics?.debrisGenerated || 0;
        document.getElementById('cascade-level').textContent = status.cascadeMetrics?.cascadeLevel || 0;
        document.getElementById('prediction-count').textContent = status.predictedCollisions || 0;
        
        // Update predictions list
        const predictionsList = document.getElementById('collision-predictions');
        if (status.predictions && status.predictions.length > 0) {
            predictionsList.innerHTML = status.predictions.map(pred => `
                <div style="margin-bottom: 5px; color: ${pred.probability > 50 ? '#ff0000' : '#ff8800'};">
                    T-${pred.time.toFixed(1)}s | ${pred.objects[0].substring(0, 8)} ↔ ${pred.objects[1].substring(0, 8)}
                    | P: ${pred.probability.toFixed(0)}% | S: ${pred.impact}/10
                </div>
            `).join('');
        } else {
            predictionsList.innerHTML = '<div style="color: #666;">No imminent collisions</div>';
        }
        
        // Update anomaly list
        const anomalyList = document.getElementById('anomaly-list');
        if (status.anomalies && status.anomalies.length > 0) {
            anomalyList.innerHTML = status.anomalies.map(a => `
                <div style="margin-bottom: 5px; color: ${a.threat === 'CRITICAL' ? '#ff0000' : '#ff8800'};">
                    ${a.type} | Alt: ${a.altitude.toFixed(0)}km | Risk: ${a.risk}% | ${a.threat}
                </div>
            `).join('');
        } else {
            anomalyList.innerHTML = '<div style="color: #666;">No anomalies detected</div>';
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.kesslerUI = new KesslerUI();
    });
} else {
    window.kesslerUI = new KesslerUI();
}