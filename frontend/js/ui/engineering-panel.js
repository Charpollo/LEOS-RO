/**
 * RED ORBIT ENGINEERING PANEL
 * Professional control interface for demonstration and testing
 * Flight Rules: Modular, <1000 lines, clean interfaces
 * 
 * Press 'O' to toggle panel
 */

export class EngineeringPanel {
    constructor() {
        this.isVisible = false;
        this.panel = null;
        this.initialized = false;
        
        // Current configuration
        this.config = {
            objectCount: 15000,
            scenario: 'current',
            unclassified: false,
            debrisGeneration: true,
            showConjunctions: true,
            timeMultiplier: 1
        };
        
        // Object count presets
        this.objectPresets = [
            { label: '15K', value: 15000, description: 'Tracked Objects Today' },
            { label: '55K', value: 55000, description: 'Starlink Full Constellation' },
            { label: '91K', value: 91000, description: 'All Planned Megaconstellations' },
            { label: '200K', value: 200000, description: 'Kessler Critical Mass' },
            { label: '1M', value: 1000000, description: 'Maximum GPU Capacity' }
        ];
        
        // Scenario presets
        this.scenarios = {
            current: {
                name: 'Current NORAD Catalog',
                description: 'All tracked objects as of today',
                objects: 15000,
                distribution: { satellites: 0.3, debris: 0.7 }
            },
            starlink: {
                name: 'Starlink Constellation',
                description: '42,000 satellites in LEO shells',
                objects: 42000,
                distribution: { satellites: 1.0, debris: 0 }
            },
            blueorigin: {
                name: 'Blue Origin Kuiper',
                description: '3,236 satellites in 98 orbital planes',
                objects: 3236,
                distribution: { satellites: 1.0, debris: 0 }
            },
            megaconstellations: {
                name: 'All Megaconstellations',
                description: 'Starlink + Kuiper + OneWeb + Chinese',
                objects: 91000,
                distribution: { satellites: 0.95, debris: 0.05 }
            },
            kessler: {
                name: 'Kessler Syndrome',
                description: 'Cascading collision scenario',
                objects: 200000,
                distribution: { satellites: 0.2, debris: 0.8 }
            },
            stress: {
                name: 'GPU Stress Test',
                description: '1 million objects at maximum capacity',
                objects: 1000000,
                distribution: { satellites: 0.1, debris: 0.9 }
            }
        };
        
        this.setupHotkey();
    }
    
    setupHotkey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'o' || e.key === 'O') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    this.toggle();
                }
            }
        });
    }
    
    toggle() {
        if (!this.initialized) {
            this.create();
            this.initialized = true;
        }
        
        this.isVisible = !this.isVisible;
        if (this.panel) {
            this.panel.style.display = this.isVisible ? 'block' : 'none';
            if (this.isVisible) {
                this.updateStats();
                this.startStatsUpdate();
            } else {
                this.stopStatsUpdate();
            }
        }
    }
    
    create() {
        // Create main panel
        this.panel = document.createElement('div');
        this.panel.id = 'engineering-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            max-height: 90vh;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #ff0000;
            border-radius: 12px;
            padding: 0;
            z-index: 100000;
            display: none;
            overflow: hidden;
            box-shadow: 0 0 50px rgba(255, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            font-family: 'Orbitron', monospace;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(90deg, rgba(255,0,0,0.2), rgba(255,0,0,0.1));
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255,0,0,0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        header.innerHTML = `
            <h2 style="margin: 0; color: #ff0000; font-size: 18px; letter-spacing: 2px; flex: 1; text-align: center;">
                ENGINEERING CONTROL PANEL
            </h2>
            <button id="close-panel" style="
                background: transparent;
                border: 1px solid #ff0000;
                color: #ff0000;
                width: 30px;
                height: 30px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            ">×</button>
        `;
        
        // Create content area
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            max-height: calc(90vh - 80px);
        `;
        
        content.innerHTML = this.createContent();
        
        this.panel.appendChild(header);
        this.panel.appendChild(content);
        document.body.appendChild(this.panel);
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    createContent() {
        return `
            <!-- Staging Controls -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #ff0000; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
                    Stage Configuration
                </h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <button class="action-btn" id="toggle-unclass" style="${this.buttonStyle()}">
                        Toggle Banner
                    </button>
                    <button class="action-btn" id="trigger-kessler" style="${this.buttonStyle('#ff6600')}">
                        Launch Kessler
                    </button>
                    <button class="action-btn" id="export-data" style="${this.buttonStyle('#00ccff')}">
                        Export Data
                    </button>
                </div>
            </div>
            
            <!-- Object Count Control -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #ff0000; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
                    Object Count
                </h3>
                <div id="object-presets" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 15px;">
                    ${this.objectPresets.map(preset => `
                        <button class="preset-btn" data-count="${preset.value}" style="${this.presetButtonStyle()}">
                            <div style="font-size: 16px; font-weight: bold;">${preset.label}</div>
                            <div style="font-size: 9px; color: #666; margin-top: 2px;">${preset.description}</div>
                        </button>
                    `).join('')}
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <input type="range" id="object-slider" min="1000" max="1000000" value="${this.config.objectCount}" 
                           style="flex: 1; height: 6px; background: rgba(255,0,0,0.2); outline: none; -webkit-appearance: none;">
                    <span id="object-count-display" style="color: #ff0000; font-size: 16px; font-weight: bold; min-width: 100px; text-align: right;">
                        ${this.formatNumber(this.config.objectCount)}
                    </span>
                </div>
            </div>
            
            <!-- Scenario Staging -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #ff0000; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
                    Load Scenario
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${Object.entries(this.scenarios).map(([key, scenario]) => `
                        <button class="scenario-btn" data-scenario="${key}" style="${this.scenarioButtonStyle()}">
                            <div style="font-size: 13px; font-weight: bold; color: #ff0000;">${scenario.name}</div>
                            <div style="font-size: 10px; color: #999; margin-top: 4px;">${scenario.description}</div>
                            <div style="font-size: 9px; color: #666; margin-top: 4px;">
                                Objects: ${this.formatNumber(scenario.objects)} | 
                                Sats: ${Math.round(scenario.distribution.satellites * 100)}% | 
                                Debris: ${Math.round(scenario.distribution.debris * 100)}%
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <!-- Physics Parameters -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #ff0000; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
                    Physics Engine (GPU)
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="background: rgba(255,0,0,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,0,0,0.2);">
                        <div style="color: #666; font-size: 10px; margin-bottom: 5px;">Earth μ (km³/s²)</div>
                        <div style="color: #ff0000; font-size: 14px; font-weight: bold;">398,600.4418</div>
                    </div>
                    <div style="background: rgba(255,0,0,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,0,0,0.2);">
                        <div style="color: #666; font-size: 10px; margin-bottom: 5px;">Integration Method</div>
                        <div style="color: #ff0000; font-size: 14px; font-weight: bold;">GPU Euler @ 60Hz</div>
                    </div>
                    <div style="background: rgba(255,0,0,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,0,0,0.2);">
                        <div style="color: #666; font-size: 10px; margin-bottom: 5px;">Workgroup Size</div>
                        <div style="color: #ff0000; font-size: 14px; font-weight: bold;" id="workgroup-size">256 threads</div>
                    </div>
                    <div style="background: rgba(255,0,0,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,0,0,0.2);">
                        <div style="color: #666; font-size: 10px; margin-bottom: 5px;">Collision Threshold</div>
                        <div style="color: #ff0000; font-size: 14px; font-weight: bold;">1.0 km</div>
                    </div>
                </div>
            </div>
            
            <!-- Live Statistics -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #ff0000; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
                    Live Statistics
                </h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="background: rgba(0,255,0,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(0,255,0,0.2);">
                        <div style="color: #666; font-size: 10px; margin-bottom: 5px;">FPS</div>
                        <div style="color: #00ff00; font-size: 20px; font-weight: bold;" id="fps-display">60</div>
                    </div>
                    <div style="background: rgba(255,200,0,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,200,0,0.2);">
                        <div style="color: #666; font-size: 10px; margin-bottom: 5px;">Active Conjunctions</div>
                        <div style="color: #ffc800; font-size: 20px; font-weight: bold;" id="conjunction-count">0</div>
                    </div>
                    <div style="background: rgba(255,0,0,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,0,0,0.2);">
                        <div style="color: #666; font-size: 10px; margin-bottom: 5px;">Risk Level</div>
                        <div style="color: #ff0000; font-size: 20px; font-weight: bold;" id="risk-level">NOMINAL</div>
                    </div>
                </div>
            </div>
            
            <!-- Conjunction Events -->
            <div>
                <h3 style="color: #ff0000; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">
                    Recent Conjunction Events
                </h3>
                <div id="conjunction-list" style="
                    background: rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,0,0,0.2);
                    border-radius: 6px;
                    padding: 10px;
                    max-height: 150px;
                    overflow-y: auto;
                ">
                    <div style="color: #666; font-size: 11px; text-align: center;">No recent conjunctions</div>
                </div>
            </div>
        `;
    }
    
    buttonStyle(color = '#ff0000') {
        return `
            background: rgba(255,0,0,0.1);
            border: 1px solid ${color};
            color: ${color};
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-family: 'Orbitron', monospace;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
    }
    
    presetButtonStyle() {
        return `
            background: rgba(255,0,0,0.05);
            border: 1px solid rgba(255,0,0,0.3);
            color: #ff0000;
            padding: 10px 5px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Orbitron', monospace;
            transition: all 0.2s;
            text-align: center;
        `;
    }
    
    scenarioButtonStyle() {
        return `
            background: rgba(255,0,0,0.02);
            border: 1px solid rgba(255,0,0,0.2);
            padding: 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Orbitron', monospace;
            transition: all 0.2s;
            text-align: left;
        `;
    }
    
    setupEventListeners() {
        // Close button
        document.getElementById('close-panel')?.addEventListener('click', () => {
            this.toggle();
        });
        
        // UNCLASSIFIED banner toggle
        document.getElementById('toggle-unclass')?.addEventListener('click', () => {
            const banner = document.getElementById('unclass-banner');
            if (banner) {
                banner.style.display = banner.style.display === 'none' ? 'block' : 'none';
                this.config.unclassified = banner.style.display !== 'none';
                if (window.showNotification) {
                    window.showNotification(
                        `UNCLASSIFIED banner ${this.config.unclassified ? 'enabled' : 'disabled'}`,
                        'info'
                    );
                }
            }
        });
        
        // Trigger Kessler
        document.getElementById('trigger-kessler')?.addEventListener('click', () => {
            if (window.kesslerSystem) {
                window.kesslerSystem.trigger();
                if (window.showNotification) {
                    window.showNotification('KESSLER CASCADE INITIATED!', 'warning');
                }
            }
        });
        
        // Export data
        document.getElementById('export-data')?.addEventListener('click', () => {
            this.exportTelemetry();
        });
        
        // Object presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const count = parseInt(e.currentTarget.dataset.count);
                this.setObjectCount(count);
                this.updatePresetButtons(count);
            });
        });
        
        // Object slider
        const slider = document.getElementById('object-slider');
        const display = document.getElementById('object-count-display');
        slider?.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            display.textContent = this.formatNumber(count);
            this.config.objectCount = count;
        });
        
        slider?.addEventListener('change', (e) => {
            const count = parseInt(e.target.value);
            this.setObjectCount(count);
        });
        
        // Scenario buttons
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenarioKey = e.currentTarget.dataset.scenario;
                this.loadScenario(scenarioKey);
            });
        });
        
        // Hover effects
        this.addHoverEffects();
    }
    
    addHoverEffects() {
        // Add hover effects to all buttons
        const buttons = this.panel.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.02)';
                btn.style.boxShadow = '0 0 10px rgba(255,0,0,0.5)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });
        });
    }
    
    setObjectCount(count) {
        this.config.objectCount = count;
        
        // Update GPU physics engine
        if (window.gpuPhysicsEngine) {
            window.gpuPhysicsEngine.setTargetObjects(count);
        }
        
        // Update display
        document.getElementById('object-count-display').textContent = this.formatNumber(count);
        document.getElementById('object-slider').value = count;
        
        if (window.showNotification) {
            window.showNotification(`Object count set to ${this.formatNumber(count)}`, 'info');
        }
    }
    
    updatePresetButtons(activeCount) {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            const count = parseInt(btn.dataset.count);
            if (count === activeCount) {
                btn.style.background = 'rgba(255,0,0,0.2)';
                btn.style.borderColor = '#ff0000';
            } else {
                btn.style.background = 'rgba(255,0,0,0.05)';
                btn.style.borderColor = 'rgba(255,0,0,0.3)';
            }
        });
    }
    
    loadScenario(scenarioKey) {
        const scenario = this.scenarios[scenarioKey];
        if (!scenario) return;
        
        this.config.scenario = scenarioKey;
        this.setObjectCount(scenario.objects);
        
        // Update distribution
        if (window.simulationConfig) {
            window.simulationConfig.currentConfig.distribution = scenario.distribution;
        }
        
        // Highlight active scenario
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            if (btn.dataset.scenario === scenarioKey) {
                btn.style.background = 'rgba(255,0,0,0.1)';
                btn.style.borderColor = '#ff0000';
            } else {
                btn.style.background = 'rgba(255,0,0,0.02)';
                btn.style.borderColor = 'rgba(255,0,0,0.2)';
            }
        });
        
        if (window.showNotification) {
            window.showNotification(`Loaded scenario: ${scenario.name}`, 'success');
        }
    }
    
    updateStats() {
        // Update FPS
        if (window.engine) {
            const fps = Math.round(window.engine.getFps());
            const fpsDisplay = document.getElementById('fps-display');
            if (fpsDisplay) {
                fpsDisplay.textContent = fps;
                fpsDisplay.style.color = fps >= 30 ? '#00ff00' : fps >= 20 ? '#ffc800' : '#ff0000';
            }
        }
        
        // Update conjunction count
        if (window.conjunctionHistory) {
            const active = window.conjunctionHistory.getActiveConjunctions();
            const conjDisplay = document.getElementById('conjunction-count');
            if (conjDisplay) {
                conjDisplay.textContent = active.length;
            }
            
            // Update risk level
            const risk = window.conjunctionHistory.calculateRiskLevel();
            const riskDisplay = document.getElementById('risk-level');
            if (riskDisplay) {
                riskDisplay.textContent = risk;
                riskDisplay.style.color = 
                    risk === 'CRITICAL' ? '#ff0000' :
                    risk === 'HIGH' ? '#ff6600' :
                    risk === 'MODERATE' ? '#ffc800' :
                    risk === 'LOW' ? '#00ccff' : '#00ff00';
            }
            
            // Update conjunction list
            this.updateConjunctionList(active.slice(0, 5));
        }
        
        // Update workgroup size
        if (window.gpuPhysicsEngine) {
            const workgroupDisplay = document.getElementById('workgroup-size');
            if (workgroupDisplay) {
                workgroupDisplay.textContent = `${window.gpuPhysicsEngine.workgroupSize || 256} threads`;
            }
        }
    }
    
    updateConjunctionList(conjunctions) {
        const list = document.getElementById('conjunction-list');
        if (!list) return;
        
        if (conjunctions.length === 0) {
            list.innerHTML = '<div style="color: #666; font-size: 11px; text-align: center;">No recent conjunctions</div>';
        } else {
            list.innerHTML = conjunctions.map(conj => `
                <div style="margin-bottom: 8px; padding: 8px; background: rgba(255,200,0,0.05); border-radius: 4px; border-left: 3px solid ${conj.minDistance < 1 ? '#ff0000' : '#ffc800'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: #ffc800; font-size: 11px;">
                            Objects ${conj.object1} ↔ ${conj.object2}
                        </div>
                        <div style="color: ${conj.minDistance < 1 ? '#ff0000' : '#ffc800'}; font-size: 11px; font-weight: bold;">
                            ${conj.minDistance.toFixed(2)} km
                        </div>
                    </div>
                    <div style="color: #666; font-size: 9px; margin-top: 4px;">
                        Time to closest: ${Math.round(conj.timeToClosestApproach)} seconds
                    </div>
                </div>
            `).join('');
        }
    }
    
    startStatsUpdate() {
        this.statsInterval = setInterval(() => {
            this.updateStats();
        }, 1000);
    }
    
    stopStatsUpdate() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
    
    exportTelemetry() {
        const data = {
            timestamp: new Date().toISOString(),
            config: this.config,
            physics: {
                earth_mu: 398600.4418,
                integration: 'GPU Euler',
                frequency: 60,
                workgroup_size: window.gpuPhysicsEngine?.workgroupSize || 256
            },
            performance: {
                fps: window.engine?.getFps() || 0,
                object_count: this.config.objectCount,
                gpu_memory: 'N/A'
            },
            conjunctions: window.conjunctionHistory?.getHistory(100) || []
        };
        
        // Create download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `red-orbit-telemetry-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.showNotification) {
            window.showNotification('Telemetry data exported', 'success');
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
        return num.toString();
    }
}

// Export singleton instance
export const engineeringPanel = new EngineeringPanel();