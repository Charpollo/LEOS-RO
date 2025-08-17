/**
 * Engineering Control Panel - Floating overlay with full simulation control
 * Activated with 'O' key, contains all configuration and control options
 * Following flight-rules: Modular components under 1000 lines
 */

import { scenarioDetails, scenarioPresets } from './engineering-panel-scenarios.js';

export class EngineeringControlPanel {
    constructor() {
        this.isOpen = false;
        this.container = null;
        this.activeTab = 'simulation';
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Simulation presets following 2:1 minimum ratio (simulated:rendered)
        this.simulationPresets = [
            { name: 'Demo Small', simulated: 10000, rendered: 5000, ratio: '2:1' },
            { name: 'Demo Medium', simulated: 30000, rendered: 15000, ratio: '2:1' },
            { name: 'Operations', simulated: 100000, rendered: 50000, ratio: '2:1' },
            { name: 'Large Scale', simulated: 200000, rendered: 100000, ratio: '2:1' },
            { name: 'Mega Scale', simulated: 1000000, rendered: 50000, ratio: '20:1' },
            { name: 'Ultra Scale', simulated: 8000000, rendered: 25000, ratio: '320:1' }
        ];
        
        // Scenario presets
        // Import scenario presets from modular file (flight-rules compliance)
        this.scenarioPresets = scenarioPresets;
        this.scenarioDetails = scenarioDetails;
        
        // Current simulation state
        this.currentSimulation = {
            simulated: 100000,
            rendered: 50000,
            fps: 60,
            physicsTime: 0,
            gpuMemory: 0,
            conjunctions: 0,
            collisions: 0
        };
        
        this.initialize();
    }
    
    initialize() {
        this.createPanel();
        this.setupEventListeners();
        this.setupKeyboardShortcut();
    }
    
    createPanel() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'engineering-control-panel';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            max-height: 600px;
            background: rgba(10, 10, 15, 0.98);
            border: 2px solid #00ffff;
            border-radius: 8px;
            display: none;
            flex-direction: column;
            z-index: 100000;
            font-family: 'Orbitron', monospace;
            box-shadow: 0 0 50px rgba(0, 255, 255, 0.3);
        `;
        
        // Header with drag handle
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: rgba(0, 255, 255, 0.1);
            border-bottom: 1px solid rgba(0, 255, 255, 0.3);
            cursor: move;
        `;
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ffff" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                    <path d="M20.5 7.5L16 12l4.5 4.5M3.5 7.5L8 12l-4.5 4.5"/>
                </svg>
                <span style="color: #00ffff; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                    Engineering Control Panel
                </span>
            </div>
            <button id="panel-close" style="
                background: none;
                border: 1px solid #ff6600;
                color: #ff6600;
                width: 30px;
                height: 30px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            ">×</button>
        `;
        
        // Tab navigation
        const tabNav = document.createElement('div');
        tabNav.style.cssText = `
            display: flex;
            gap: 2px;
            padding: 10px 20px;
            background: rgba(0, 0, 0, 0.5);
            border-bottom: 1px solid rgba(0, 255, 255, 0.2);
        `;
        
        const tabs = [
            { id: 'simulation', label: 'LIVE MONITOR' },
            { id: 'scenarios', label: 'SCENARIOS' },
            { id: 'grafana', label: 'GRAFANA' },
            { id: 'export', label: 'EXPORT' },
            { id: 'settings', label: 'SETTINGS' }
        ];
        
        tabs.forEach(tab => {
            const tabBtn = document.createElement('button');
            tabBtn.dataset.tab = tab.id;
            tabBtn.style.cssText = `
                padding: 8px 16px;
                background: ${tab.id === this.activeTab ? 'rgba(0, 255, 255, 0.2)' : 'transparent'};
                border: 1px solid ${tab.id === this.activeTab ? '#00ffff' : 'rgba(0, 255, 255, 0.3)'};
                color: ${tab.id === this.activeTab ? '#00ffff' : '#888'};
                cursor: pointer;
                border-radius: 4px;
                font-family: 'Orbitron', monospace;
                font-size: 12px;
                text-transform: uppercase;
                transition: all 0.3s;
            `;
            tabBtn.innerHTML = tab.label;
            tabBtn.onclick = () => this.switchTab(tab.id);
            tabNav.appendChild(tabBtn);
        });
        
        // Content area
        const content = document.createElement('div');
        content.id = 'panel-content';
        content.style.cssText = `
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            max-height: 400px;
        `;
        
        // Status bar
        const statusBar = document.createElement('div');
        statusBar.id = 'panel-status';
        statusBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 10px 20px;
            background: rgba(0, 0, 0, 0.5);
            border-top: 1px solid rgba(0, 255, 255, 0.2);
            font-size: 11px;
            color: #888;
        `;
        statusBar.innerHTML = `
            <div>Status: <span style="color: #00ff00;">READY</span></div>
            <div>FPS: <span id="fps-display" style="color: #00ffff;">60</span></div>
            <div>Objects: <span id="objects-display" style="color: #00ffff;">100K/50K</span></div>
            <div>Press ESC to close</div>
        `;
        
        // Assemble panel
        this.container.appendChild(header);
        this.container.appendChild(tabNav);
        this.container.appendChild(content);
        this.container.appendChild(statusBar);
        
        document.body.appendChild(this.container);
        
        // Load initial content
        this.loadTabContent('simulation');
        
        // Make header draggable
        this.setupDragging(header);
    }
    
    setupDragging(header) {
        header.addEventListener('mousedown', (e) => {
            if (e.target.id === 'panel-close') return;
            this.isDragging = true;
            const rect = this.container.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            this.container.style.transform = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.container.style.left = `${e.clientX - this.dragOffset.x}px`;
            this.container.style.top = `${e.clientY - this.dragOffset.y}px`;
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }
    
    switchTab(tabId) {
        this.activeTab = tabId;
        
        // Update tab buttons
        document.querySelectorAll('[data-tab]').forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.style.background = 'rgba(0, 255, 255, 0.2)';
                btn.style.borderColor = '#00ffff';
                btn.style.color = '#00ffff';
            } else {
                btn.style.background = 'transparent';
                btn.style.borderColor = 'rgba(0, 255, 255, 0.3)';
                btn.style.color = '#888';
            }
        });
        
        this.loadTabContent(tabId);
    }
    
    loadTabContent(tabId) {
        const content = document.getElementById('panel-content');
        
        switch(tabId) {
            case 'simulation':
                content.innerHTML = this.getSimulationContent();
                this.attachSimulationHandlers();
                break;
            case 'scenarios':
                content.innerHTML = this.getScenariosContent();
                this.attachScenarioHandlers();
                break;
            case 'grafana':
                content.innerHTML = this.getGrafanaContent();
                break;
            case 'export':
                content.innerHTML = this.getExportContent();
                break;
            case 'settings':
                content.innerHTML = this.getSettingsContent();
                this.attachSettingsHandlers();
                break;
        }
    }
    
    getSimulationContent() {
        // Get real-time performance metrics
        const fps = window.engine ? Math.round(window.engine.getFps()) : 0;
        const activeObjects = window.redOrbitPhysics?.activeObjects || this.currentSimulation.simulated;
        const rendered = window.redOrbitPhysics?.renderCount || this.currentSimulation.rendered;
        const ratio = activeObjects / rendered || 2;
        const conjunctionAccuracy = ratio <= 2 ? '100%' : ratio <= 10 ? `~${Math.round(100/ratio)}%` : '<10%';
        const physicsMode = window.redOrbitPhysics ? 'WebGPU' : 'Initializing';
        const maxCapacity = 10000000; // 10 million max
        const gpuMemory = ((activeObjects * 32 * 4) / (1024 * 1024)).toFixed(1);
        const timeMultiplier = window.simState?.timeMultiplier || 1;
        
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Real-time Performance Dashboard -->
                <div style="background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 0, 0, 0.5)); border: 2px solid #00ffff; border-radius: 8px; padding: 15px;">
                    <h4 style="color: #00ffff; margin: 0 0 15px 0; font-size: 13px; text-transform: uppercase; display: flex; align-items: center;">
                        <span style="display: inline-block; width: 8px; height: 8px; background: ${fps > 30 ? '#00ff00' : '#ff0000'}; border-radius: 50%; margin-right: 10px; animation: pulse 1s infinite;"></span>
                        LIVE PERFORMANCE METRICS
                    </h4>
                    
                    <!-- Main metrics grid -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                        <div style="padding: 12px; background: rgba(0, 0, 0, 0.5); border: 1px solid ${fps > 30 ? 'rgba(0, 255, 0, 0.5)' : fps > 20 ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'}; border-radius: 4px;">
                            <div style="color: #888; font-size: 10px; margin-bottom: 5px; text-transform: uppercase;">Frame Rate</div>
                            <div style="color: ${fps > 30 ? '#00ff00' : fps > 20 ? '#ffff00' : '#ff0000'}; font-size: 24px; font-weight: bold;">${fps}</div>
                            <div style="color: #666; font-size: 9px; margin-top: 3px;">FPS</div>
                        </div>
                        
                        <div style="padding: 12px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                            <div style="color: #888; font-size: 10px; margin-bottom: 5px; text-transform: uppercase;">Simulated</div>
                            <div style="color: #00ffff; font-size: 24px; font-weight: bold;">${activeObjects >= 1000000 ? (activeObjects/1000000).toFixed(1) + 'M' : activeObjects >= 1000 ? (activeObjects/1000).toFixed(0) + 'K' : activeObjects}</div>
                            <div style="color: #666; font-size: 9px; margin-top: 3px;">OBJECTS</div>
                        </div>
                        
                        <div style="padding: 12px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                            <div style="color: #888; font-size: 10px; margin-bottom: 5px; text-transform: uppercase;">Rendered</div>
                            <div style="color: #ff6600; font-size: 24px; font-weight: bold;">${rendered >= 1000 ? (rendered/1000).toFixed(0) + 'K' : rendered}</div>
                            <div style="color: #666; font-size: 9px; margin-top: 3px;">VISIBLE</div>
                        </div>
                    </div>
                    
                    <!-- Scale Control -->
                    <div style="margin-bottom: 15px; padding: 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="color: #00ffff; font-size: 12px; font-weight: bold;">
                                OBJECT SCALE MODE
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button id="scale-visualization" style="
                                padding: 8px 16px;
                                background: rgba(0, 255, 255, 0.2);
                                border: 2px solid #00ffff;
                                color: #00ffff;
                                cursor: pointer;
                                border-radius: 4px;
                                font-size: 11px;
                                font-weight: bold;
                                transition: all 0.3s;
                            ">
                                VISUALIZATION
                            </button>
                            <button id="scale-real" style="
                                padding: 8px 16px;
                                background: transparent;
                                border: 1px solid rgba(0, 255, 255, 0.3);
                                color: rgba(0, 255, 255, 0.6);
                                cursor: pointer;
                                border-radius: 4px;
                                font-size: 11px;
                                font-weight: bold;
                                transition: all 0.3s;
                            ">
                                REAL SCALE
                            </button>
                            </div>
                        </div>
                        
                        <!-- Scale Information -->
                        <div id="scale-info" style="padding: 8px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 255, 255, 0.1); border-radius: 4px; font-size: 10px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: #888;">
                                <div><strong style="color: #00ffff;">Current Scale:</strong> <span id="scale-value">0.008 (800x)</span></div>
                                <div><strong style="color: #00ffff;">Mode:</strong> <span id="scale-mode">Visualization</span></div>
                                <div><strong style="color: #00ffff;">Satellite Size:</strong> <span id="sat-size">~51km visual</span></div>
                                <div><strong style="color: #00ffff;">Real Size:</strong> 1-10m actual</div>
                            </div>
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0, 255, 255, 0.1);">
                                <div style="color: #ff6600; font-size: 9px; margin-bottom: 4px;">SCALE COMPARISON:</div>
                                <div style="color: #666; font-size: 9px; line-height: 1.4;">
                                    • <strong>Real Scale:</strong> 1 pixel ≈ 10m satellite (nearly invisible)
                                    • <strong>Minimum Visible:</strong> 0.0001 scale (100x larger than real)
                                    • <strong>Visualization:</strong> 0.008 scale (8000x larger than real)
                                    • <strong>Earth Diameter:</strong> 12,742 km (reference)
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Secondary metrics -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px;">
                        <div style="padding: 8px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px; text-align: center;">
                            <div style="color: #666; font-size: 9px;">RATIO</div>
                            <div style="color: #00ffff; font-size: 16px; font-weight: bold;">${ratio.toFixed(1)}:1</div>
                        </div>
                        <div style="padding: 8px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px; text-align: center;">
                            <div style="color: #666; font-size: 9px;">GPU MEM</div>
                            <div style="color: #ff6600; font-size: 16px; font-weight: bold;">${gpuMemory}MB</div>
                        </div>
                        <div style="padding: 8px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px; text-align: center;">
                            <div style="color: #666; font-size: 9px;">TIME</div>
                            <div style="color: #00ff00; font-size: 16px; font-weight: bold;">${timeMultiplier}x</div>
                        </div>
                        <div style="padding: 8px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px; text-align: center;">
                            <div style="color: #666; font-size: 9px;">ACCURACY</div>
                            <div style="color: ${ratio <= 2 ? '#00ff00' : ratio <= 10 ? '#ffff00' : '#ff0000'}; font-size: 16px; font-weight: bold;">${conjunctionAccuracy}</div>
                        </div>
                    </div>
                    
                    <!-- Physics Engine Details -->
                    <details style="cursor: pointer;">
                        <summary style="color: #00ffff; font-size: 11px; padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; list-style: none; outline: none;">
                            ▶ Physics Engine Details
                        </summary>
                        <div style="margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(0, 255, 255, 0.1); border-radius: 4px; font-size: 10px; color: #888;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div><strong style="color: #00ffff;">Mode:</strong> ${physicsMode}</div>
                                <div><strong style="color: #00ffff;">Integration:</strong> RK4 @ 240Hz</div>
                                <div><strong style="color: #00ffff;">Gravity:</strong> Point-mass Earth</div>
                                <div><strong style="color: #00ffff;">μ:</strong> 398,600 km³/s²</div>
                                <div><strong style="color: #00ffff;">Collisions:</strong> NASA Model</div>
                                <div><strong style="color: #00ffff;">Threads:</strong> 256/workgroup</div>
                                <div><strong style="color: #00ffff;">Capacity:</strong> ${((activeObjects/maxCapacity)*100).toFixed(1)}%</div>
                                <div><strong style="color: #00ffff;">Calc/Frame:</strong> ${(activeObjects * 7).toLocaleString()}</div>
                            </div>
                        </div>
                    </details>
                    
                    ${ratio > 10 ? `
                    <div style="margin-top: 10px; padding: 10px; background: rgba(255, 0, 0, 0.1); border: 1px solid #ff0000; border-radius: 4px;">
                        <div style="color: #ff0000; font-size: 11px; font-weight: bold;">⚠️ HIGH RATIO WARNING</div>
                        <div style="color: #ff6600; font-size: 10px; margin-top: 5px;">
                            Only ${((1/ratio)*100).toFixed(1)}% of objects visible. Conjunction accuracy severely limited.
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    getScenariosContent() {
        // Use imported scenario details from modular file
        const scenarioDetails = this.scenarioDetails || {
            'Current (2025)': {
                description: 'Real-time snapshot of current orbital environment',
                details: [
                    'Active satellites: ~11,500 operational',
                    'Tracked debris: 34,000+ objects >10cm',
                    'Orbital density: Manageable with avoidance',
                    'Key orbits: LEO congested, MEO/GEO stable'
                ],
                risks: 'Low-Medium',
                riskColor: '#ffff00',
                highlights: ['SpaceX Starlink: ~5,000 sats', 'OneWeb: ~600 sats', 'ISS operations normal']
            },
            'Projected 2035': {
                description: 'Conservative 10-year projection based on current launch rates',
                details: [
                    'Expected satellites: 58,000-100,000',
                    'Debris growth: 5x current (170,000+ objects)',
                    'New constellations: Multiple mega-constellations',
                    'Launch rate: 2,000+ satellites/year'
                ],
                risks: 'High',
                riskColor: '#ff6600',
                highlights: ['Starlink complete: 42,000', 'Chinese GuoWang: 13,000', 'Amazon Kuiper: 3,200']
            },
            'Kessler Syndrome': {
                description: 'Catastrophic cascade collision scenario - LEO becomes unusable',
                details: [
                    'Trigger: Major collision at 800-900km',
                    'Cascade rate: Exponential debris growth',
                    'Timeline: Full cascade in 5-10 years',
                    'Recovery: 50-100 years minimum'
                ],
                risks: 'CRITICAL',
                riskColor: '#ff0000',
                highlights: ['No new launches possible', 'Loss of all LEO services', 'GPS/comms failure']
            },
            'Starlink Full': {
                description: 'Complete SpaceX Starlink constellation deployment',
                details: [
                    'Total satellites: 42,000 approved',
                    'Orbital shells: 5 distinct altitudes',
                    'Coverage: Global broadband <25ms latency',
                    'Collision avoidance: Autonomous AI'
                ],
                risks: 'Medium',
                riskColor: '#ffff00',
                highlights: ['550km shell: 1,584 sats', '540km shell: 1,584 sats', '570km shell: 720 sats']
            },
            'Chinese Mega': {
                description: 'Chinese GuoWang mega-constellation scenario',
                details: [
                    'Total satellites: 13,000 planned',
                    'Deployment: 2028-2035 timeline',
                    'Purpose: Broadband + surveillance',
                    'Orbits: 500-1,145km altitude range'
                ],
                risks: 'Medium-High',
                riskColor: '#ff6600',
                highlights: ['State-controlled network', 'Dual-use capabilities', 'Orbital slot competition']
            },
            'Military Surge': {
                description: 'Rapid military satellite deployment for conflict scenario',
                details: [
                    'Tactical satellites: 5,000+ in 6 months',
                    'Purpose: C3ISR enhancement',
                    'Orbits: Mixed LEO/MEO for coverage',
                    'Lifetime: 2-5 years expendable'
                ],
                risks: 'High',
                riskColor: '#ff0000',
                highlights: ['Proliferated LEO', 'Resilient architecture', 'Anti-jam comms']
            },
            'ASAT Test': {
                description: 'Simulation of anti-satellite weapon test creating massive debris',
                details: [
                    'Target altitude: 850km (worst case)',
                    'Debris created: 3,000+ trackable pieces',
                    'Micro-debris: 1M+ particles <10cm',
                    'Orbit persistence: 20-100 years'
                ],
                risks: 'EXTREME',
                riskColor: '#ff0000',
                highlights: ['Based on 2007 Chinese test', 'Fengyun-1C destruction', 'Still tracking debris today']
            },
            'Kessler Cascade': {
                description: 'Active Kessler syndrome with ongoing cascade collisions',
                details: [
                    'Initial trigger: 10+ major collisions',
                    'Cascade level: Self-sustaining',
                    'Debris field: Expanding rapidly',
                    'Safe orbits: None below 2000km'
                ],
                risks: 'CATASTROPHIC',
                riskColor: '#ff0000',
                highlights: ['Space access denied', 'Civilization impact', 'No mitigation possible']
            }
        };
        
        return `
            <div style="display: flex; flex-direction: column; gap: 15px; max-height: 500px; overflow-y: auto;">
                <h3 style="color: #00ffff; margin: 0; font-size: 14px; text-transform: uppercase; position: sticky; top: 0; background: rgba(0, 0, 0, 0.95); padding: 10px 0;">
                    SCENARIO LIBRARY
                </h3>
                
                ${this.scenarioPresets.map(scenario => {
                    const details = scenarioDetails[scenario.name] || {
                        description: 'Custom scenario configuration',
                        details: [],
                        risks: 'Unknown',
                        riskColor: '#888',
                        highlights: []
                    };
                    const totalObjects = scenario.satellites + scenario.debris;
                    const satPercent = (scenario.satellites / totalObjects * 100).toFixed(1);
                    const debrisPercent = (scenario.debris / totalObjects * 100).toFixed(1);
                    
                    return `
                        <div class="scenario-btn" data-scenario="${scenario.name}" style="
                            padding: 15px;
                            background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(0, 0, 0, 0.3));
                            border: 1px solid rgba(0, 255, 255, 0.3);
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.3s;
                            position: relative;
                        ">
                            <!-- Header with name and risk level -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="font-weight: bold; color: #00ffff; font-size: 13px;">${scenario.name}</div>
                                <div style="
                                    padding: 3px 8px;
                                    background: ${details.riskColor}33;
                                    border: 1px solid ${details.riskColor};
                                    border-radius: 4px;
                                    font-size: 10px;
                                    color: ${details.riskColor};
                                    font-weight: bold;
                                ">
                                    RISK: ${details.risks}
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <div style="color: #888; font-size: 11px; margin-bottom: 10px; font-style: italic;">
                                ${details.description}
                            </div>
                            
                            <!-- Object counts and ratio bar -->
                            <div style="margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 5px;">
                                    <span style="color: #00ffff;">SAT: ${scenario.satellites.toLocaleString()} (${satPercent}%)</span>
                                    <span style="color: #ff6600;">DEB: ${scenario.debris.toLocaleString()} (${debrisPercent}%)</span>
                                </div>
                                <div style="height: 6px; background: rgba(0, 255, 255, 0.1); border-radius: 3px; overflow: hidden;">
                                    <div style="
                                        height: 100%;
                                        width: ${satPercent}%;
                                        background: linear-gradient(90deg, #00ffff, #0099ff);
                                        display: inline-block;
                                        box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                                    "></div>
                                    <div style="
                                        height: 100%;
                                        width: ${debrisPercent}%;
                                        background: linear-gradient(90deg, #ff6600, #ff0000);
                                        display: inline-block;
                                        box-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
                                    "></div>
                                </div>
                            </div>
                            
                            <!-- Key details -->
                            ${details.details.length > 0 ? `
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="color: #00ffff; font-size: 10px; margin-bottom: 5px; font-weight: bold;">KEY DETAILS:</div>
                                <ul style="margin: 0; padding-left: 15px; font-size: 10px; color: #888; line-height: 1.4;">
                                    ${details.details.map(detail => `<li>${detail}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}
                            
                            <!-- Highlights -->
                            ${details.highlights.length > 0 ? `
                            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                ${details.highlights.map(highlight => `
                                    <span style="
                                        padding: 2px 6px;
                                        background: rgba(0, 255, 255, 0.1);
                                        border: 1px solid rgba(0, 255, 255, 0.3);
                                        border-radius: 3px;
                                        font-size: 9px;
                                        color: #00ffff;
                                    ">${highlight}</span>
                                `).join('')}
                            </div>
                            ` : ''}
                            
                            <!-- Total objects summary -->
                            <div style="
                                position: absolute;
                                bottom: 10px;
                                right: 10px;
                                font-size: 10px;
                                color: #666;
                            ">
                                Total: ${totalObjects.toLocaleString()} objects
                            </div>
                        </div>
                    `;
                }).join('')}
                
                <!-- Simulation Presets Section -->
                <h3 style="color: #00ffff; margin: 20px 0 15px 0; font-size: 14px; text-transform: uppercase;">
                    SIMULATION PRESETS (Simulated:Rendered Ratio)
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${this.simulationPresets.map(preset => `
                        <button class="sim-preset-btn" data-sim="${preset.simulated}" data-ren="${preset.rendered}" style="
                            padding: 12px;
                            background: rgba(0, 255, 255, 0.05);
                            border: 1px solid rgba(0, 255, 255, 0.3);
                            color: #00ffff;
                            cursor: pointer;
                            border-radius: 4px;
                            text-align: left;
                            transition: all 0.3s;
                        ">
                            <div style="font-weight: bold; margin-bottom: 5px;">${preset.name}</div>
                            <div style="font-size: 11px; color: #888;">
                                ${preset.simulated.toLocaleString()} / ${preset.rendered.toLocaleString()}
                            </div>
                            <div style="font-size: 10px; color: #ff6600;">Ratio: ${preset.ratio}</div>
                        </button>
                    `).join('')}
                </div>
                
                <!-- Quick reference legend -->
                <div style="padding: 12px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px; margin-top: 10px;">
                    <h4 style="color: #00ffff; margin: 0 0 8px 0; font-size: 11px;">QUICK REFERENCE</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px; color: #888;">
                        <div><strong style="color: #00ff00;">Low Risk:</strong> Sustainable operations</div>
                        <div><strong style="color: #ffff00;">Medium Risk:</strong> Active management required</div>
                        <div><strong style="color: #ff6600;">High Risk:</strong> Collision probability elevated</div>
                        <div><strong style="color: #ff0000;">Critical/Extreme:</strong> Cascade conditions</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getPerformanceContent() {
        // Calculate accuracy based on current ratio
        const ratio = this.currentSimulation.simulated / this.currentSimulation.rendered;
        const conjunctionAccuracy = ratio <= 2 ? '100%' : ratio <= 10 ? '~50%' : '<10%';
        const physicsMode = this.currentSimulation.simulated > 100000 ? 'GPU Compute' : 'CPU';
        
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <h3 style="color: #00ffff; margin: 0; font-size: 14px; text-transform: uppercase;">
                    Performance & Engineering Metrics
                </h3>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">FRAME RATE</div>
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">${this.currentSimulation.fps} FPS</div>
                    </div>
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">PHYSICS ENGINE</div>
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">${physicsMode}</div>
                    </div>
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">SIM:RENDER RATIO</div>
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">${ratio.toFixed(1)}:1</div>
                    </div>
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">CONJUNCTION COVERAGE</div>
                        <div style="color: #ff6600; font-size: 24px; font-weight: bold;">${conjunctionAccuracy}</div>
                    </div>
                </div>
                
                <div style="padding: 15px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px;">
                    <h4 style="color: #00ffff; margin: 0 0 10px 0; font-size: 12px;">Physics Accuracy (Per Flight Rules)</h4>
                    <ul style="color: #888; font-size: 11px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li><strong style="color: #00ffff;">Full Physics:</strong> Newtonian F = -GMm/r² for ALL ${this.currentSimulation.simulated.toLocaleString()} simulated objects</li>
                        <li><strong style="color: #00ffff;">Integration:</strong> RK4 at 240Hz (4.16ms timestep)</li>
                        <li><strong style="color: #00ffff;">Gravity Model:</strong> Point-mass Earth (μ = 398,600.4418 km³/s²)</li>
                        <li><strong style="color: #00ffff;">Collision Model:</strong> NASA Standard Breakup Model with momentum conservation</li>
                        <li><strong style="color: #00ffff;">WebGPU Compute:</strong> 256 thread workgroups, ${(this.currentSimulation.simulated * 7).toLocaleString()} calculations/frame</li>
                    </ul>
                </div>
                
                <div style="padding: 15px; background: rgba(255, 102, 0, 0.1); border: 1px solid rgba(255, 102, 0, 0.3); border-radius: 4px;">
                    <h4 style="color: #ff6600; margin: 0 0 10px 0; font-size: 12px;">Accuracy Limitations at ${ratio.toFixed(1)}:1 Ratio</h4>
                    <ul style="color: #ff6600; font-size: 11px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li><strong>Rendered:</strong> Only ${this.currentSimulation.rendered.toLocaleString()} of ${this.currentSimulation.simulated.toLocaleString()} objects visible</li>
                        <li><strong>Conjunction Analysis:</strong> Limited to rendered objects (~${conjunctionAccuracy} coverage)</li>
                        <li><strong>Visual Accuracy:</strong> ${ratio > 10 ? 'Sampling mode - not all objects shown' : 'Most objects visible'}</li>
                        <li><strong>Truth Data:</strong> Full ${this.currentSimulation.simulated.toLocaleString()} object physics streamed to Grafana</li>
                        <li><strong>Collision Detection:</strong> ${this.currentSimulation.simulated > 100000 ? 'Spatial hashing on GPU' : 'Full N² comparison'}</li>
                    </ul>
                </div>
                
                <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px;">
                    <h4 style="color: #00ffff; margin: 0 0 10px 0; font-size: 12px;">Rendering Strategy (render-sim.md)</h4>
                    <ul style="color: #888; font-size: 11px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li><strong>Pin Strategy:</strong> Events/conjunctions always rendered (pinned)</li>
                        <li><strong>Swap Rate:</strong> 2%/sec background rotation for variety</li>
                        <li><strong>Min Dwell:</strong> 3 seconds before object swap</li>
                        <li><strong>Index Mapping:</strong> Center-of-bin for even distribution</li>
                        <li><strong>LOD:</strong> 10-segment spheres for quality</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    getGrafanaContent() {
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <h3 style="color: #00ffff; margin: 0; font-size: 14px; text-transform: uppercase;">
                    Grafana Connection
                </h3>
                
                <div>
                    <label style="color: #888; font-size: 11px; display: block; margin-bottom: 5px;">
                        GRAFANA URL
                    </label>
                    <input type="text" id="grafana-url" value="http://localhost:3000" style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        border-radius: 4px;
                    ">
                </div>
                
                <div>
                    <label style="color: #888; font-size: 11px; display: block; margin-bottom: 5px;">
                        STREAM KEY
                    </label>
                    <input type="text" id="grafana-key" value="leos-ro-stream" style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        border-radius: 4px;
                    ">
                </div>
                
                <div>
                    <label style="color: #888; font-size: 11px; display: block; margin-bottom: 5px;">
                        UPDATE INTERVAL (ms)
                    </label>
                    <input type="number" id="grafana-interval" value="1000" style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        border-radius: 4px;
                    ">
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button id="grafana-connect" style="
                        flex: 1;
                        padding: 10px;
                        background: rgba(0, 255, 255, 0.1);
                        border: 1px solid #00ffff;
                        color: #00ffff;
                        cursor: pointer;
                        border-radius: 4px;
                        font-weight: bold;
                    ">Connect</button>
                    <button id="grafana-test" style="
                        flex: 1;
                        padding: 10px;
                        background: rgba(255, 102, 0, 0.1);
                        border: 1px solid #ff6600;
                        color: #ff6600;
                        cursor: pointer;
                        border-radius: 4px;
                        font-weight: bold;
                    ">Test Connection</button>
                </div>
                
                <div id="grafana-status" style="
                    padding: 10px;
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(0, 255, 255, 0.2);
                    border-radius: 4px;
                    color: #888;
                    font-size: 11px;
                ">
                    Status: Not connected
                </div>
            </div>
        `;
    }
    
    getExportContent() {
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <h3 style="color: #00ffff; margin: 0; font-size: 14px; text-transform: uppercase;">
                    Data Export
                </h3>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <button class="export-btn" data-format="json" style="
                        padding: 15px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        cursor: pointer;
                        border-radius: 4px;
                        text-align: center;
                    ">
                        <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #00ffff;">JSON</div>
                        <div>Export JSON</div>
                    </button>
                    <button class="export-btn" data-format="csv" style="
                        padding: 15px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        cursor: pointer;
                        border-radius: 4px;
                        text-align: center;
                    ">
                        <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #00ffff;">CSV</div>
                        <div>Export CSV</div>
                    </button>
                </div>
                
                <div>
                    <h4 style="color: #ff6600; margin: 0 0 10px 0; font-size: 12px;">Export Options</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox" checked> Include telemetry data
                        </label>
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox" checked> Include conjunction history
                        </label>
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox"> Include orbital elements
                        </label>
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox"> Include performance metrics
                        </label>
                    </div>
                </div>
            </div>
        `;
    }
    
    getSettingsContent() {
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <h3 style="color: #00ffff; margin: 0; font-size: 14px; text-transform: uppercase;">
                    System Settings
                </h3>
                
                <!-- Classification Banner Settings -->
                <div style="padding: 15px; background: rgba(255, 102, 0, 0.1); border: 1px solid rgba(255, 102, 0, 0.3); border-radius: 4px;">
                    <h4 style="color: #ff6600; margin: 0 0 10px 0; font-size: 12px;">CLASSIFICATION BANNER</h4>
                    <select id="classification-select" style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        border-radius: 4px;
                        font-size: 11px;
                    ">
                        <option value="none">No Banner</option>
                        <option value="unclassified" selected>UNCLASSIFIED</option>
                        <option value="fouo">FOR OFFICIAL USE ONLY</option>
                        <option value="secret">SECRET</option>
                        <option value="topsecret">TOP SECRET</option>
                        <option value="ts-sci">TOP SECRET//SCI</option>
                    </select>
                    <div style="margin-top: 8px; font-size: 10px; color: #888;">
                        Sets the classification level displayed at top of screen
                    </div>
                </div>
                
                <div>
                    <h4 style="color: #ff6600; margin: 0 0 10px 0; font-size: 12px;">Visualization</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox" checked> Show orbital trails
                        </label>
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox" checked> Show conjunction lines
                        </label>
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox"> Show debris clouds
                        </label>
                        <label style="color: #888; font-size: 11px;">
                            <input type="checkbox"> Show satellite labels
                        </label>
                    </div>
                </div>
                
                <div>
                    <h4 style="color: #ff6600; margin: 0 0 10px 0; font-size: 12px;">Physics</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="color: #888; font-size: 11px; display: block; margin-bottom: 5px;">
                                COLLISION THRESHOLD (km)
                            </label>
                            <input type="number" value="0.01" step="0.001" style="
                                width: 100%;
                                padding: 8px;
                                background: rgba(0, 255, 255, 0.05);
                                border: 1px solid rgba(0, 255, 255, 0.3);
                                color: #00ffff;
                                border-radius: 4px;
                            ">
                        </div>
                        <div>
                            <label style="color: #888; font-size: 11px; display: block; margin-bottom: 5px;">
                                CONJUNCTION WARNING (km)
                            </label>
                            <input type="number" value="5" step="1" style="
                                width: 100%;
                                padding: 8px;
                                background: rgba(0, 255, 255, 0.05);
                                border: 1px solid rgba(0, 255, 255, 0.3);
                                color: #00ffff;
                                border-radius: 4px;
                            ">
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 style="color: #ff6600; margin: 0 0 10px 0; font-size: 12px;">License</h4>
                    <input type="text" placeholder="Enter license key" style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        border-radius: 4px;
                    ">
                </div>
            </div>
        `;
    }
    
    attachSimulationHandlers() {
        // Scale mode toggle buttons
        const scaleVizBtn = document.getElementById('scale-visualization');
        const scaleRealBtn = document.getElementById('scale-real');
        
        if (scaleVizBtn && scaleRealBtn) {
            scaleVizBtn.addEventListener('click', () => {
                this.setScaleMode('visualization');
                // Update button styles
                scaleVizBtn.style.background = 'rgba(0, 255, 255, 0.2)';
                scaleVizBtn.style.border = '2px solid #00ffff';
                scaleVizBtn.style.color = '#00ffff';
                scaleRealBtn.style.background = 'transparent';
                scaleRealBtn.style.border = '1px solid rgba(0, 255, 255, 0.3)';
                scaleRealBtn.style.color = 'rgba(0, 255, 255, 0.6)';
            });
            
            scaleRealBtn.addEventListener('click', () => {
                this.setScaleMode('real');
                // Update button styles
                scaleRealBtn.style.background = 'rgba(0, 255, 255, 0.2)';
                scaleRealBtn.style.border = '2px solid #00ffff';
                scaleRealBtn.style.color = '#00ffff';
                scaleVizBtn.style.background = 'transparent';
                scaleVizBtn.style.border = '1px solid rgba(0, 255, 255, 0.3)';
                scaleVizBtn.style.color = 'rgba(0, 255, 255, 0.6)';
            });
        }
    }
    
    attachSettingsHandlers() {
        // Handle classification banner changes
        const classSelect = document.getElementById('classification-select');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.setClassificationBanner(e.target.value);
            });
        }
        
        // Handle other settings checkboxes
        const checkboxes = document.querySelectorAll('#panel-content input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                // Handle visualization settings changes
                console.log(`Setting changed: ${e.target.parentElement.textContent.trim()} = ${e.target.checked}`);
            });
        });
    }
    
    attachScenarioHandlers() {
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                // Handle click on any child element
                let target = e.target;
                while (target && !target.classList.contains('scenario-btn')) {
                    target = target.parentElement;
                }
                
                if (target) {
                    const scenarioName = target.dataset.scenario;
                    const scenario = this.scenarioPresets.find(s => s.name === scenarioName);
                    if (scenario) {
                        // Highlight selected scenario
                        document.querySelectorAll('.scenario-btn').forEach(b => {
                            b.style.border = '1px solid rgba(0, 255, 255, 0.3)';
                            b.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(0, 0, 0, 0.3))';
                        });
                        target.style.border = '2px solid #00ffff';
                        target.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 0, 0, 0.5))';
                        
                        // Update dynamic notes when scenario is selected
                        this.updateDynamicNotes(scenario);
                        await this.loadScenario(scenario);
                    }
                }
            });
        });
        
        // Handle simulation preset buttons
        document.querySelectorAll('.sim-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const simulated = parseInt(e.currentTarget.dataset.sim);
                const rendered = parseInt(e.currentTarget.dataset.ren);
                this.applySimulationConfig(simulated, rendered);
                
                // Highlight selected preset
                document.querySelectorAll('.sim-preset-btn').forEach(b => {
                    b.style.border = '1px solid rgba(0, 255, 255, 0.3)';
                    b.style.background = 'rgba(0, 255, 255, 0.05)';
                });
                e.currentTarget.style.border = '2px solid #00ffff';
                e.currentTarget.style.background = 'rgba(0, 255, 255, 0.15)';
            });
        });
        
        // Classification select might be in settings now
        const classSelect = document.getElementById('classification-select');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.setClassificationBanner(e.target.value);
            });
        }
    }
    
    setScaleMode(mode) {
        // Calculate scale based on mode
        let scale, scaleMultiplier, visualSize, modeText;
        
        if (mode === 'real') {
            // Real scale: satellites are 1-10m, Earth radius is 6371km
            // At true scale, a 10m satellite would be 10/6371000 = 0.0000015 of Earth's radius
            // But that would be invisible, so we'll use minimum visible scale
            scale = 0.0001; // Smallest visible size - still 100x larger than reality
            scaleMultiplier = 100; // 100x larger than real
            visualSize = '~0.6km'; // Visual size on screen
            modeText = 'Real Scale (Minimum Visible)';
            this.showNotification('Real Scale Mode: Objects at minimum visible size');
        } else {
            // Visualization scale - current default
            scale = 0.008; // Current visualization scale
            scaleMultiplier = 8000; // 8000x larger than real
            visualSize = '~51km'; // Visual size on screen
            modeText = 'Visualization';
            this.showNotification('Visualization Mode: Objects scaled for visibility');
        }
        
        // Update scale information display
        const scaleValue = document.getElementById('scale-value');
        const scaleMode = document.getElementById('scale-mode');
        const satSize = document.getElementById('sat-size');
        
        if (scaleValue) scaleValue.textContent = `${scale} (${scaleMultiplier}x)`;
        if (scaleMode) scaleMode.textContent = modeText;
        if (satSize) satSize.textContent = `${visualSize} visual`;
        
        // Update all rendered objects
        if (window.redOrbitPhysics && window.redOrbitPhysics.updateObjectScale) {
            window.redOrbitPhysics.updateObjectScale(scale);
        } else if (window.scene && window.scene.meshes) {
            // Fallback: directly update mesh scales
            window.scene.meshes.forEach(mesh => {
                if (mesh.name && (mesh.name.includes('satellite') || mesh.name.includes('debris'))) {
                    mesh.scaling.setAll(scale);
                }
            });
        }
        
        // Store current scale mode
        this.currentScaleMode = mode;
        this.currentScale = scale;
        
        console.log(`[Engineering Panel] Scale mode set to: ${mode} (${scale}, ${scaleMultiplier}x real size)`);
    }
    
    async applySimulationConfig(simulated, rendered) {
        console.log(`[Engineering Panel] Applying config: ${simulated} simulated, ${rendered} rendered`);
        
        // Check if physics engine is ready (might need to wait for it)
        if (!window.redOrbitPhysics) {
            console.log('[Engineering Panel] Waiting for physics engine...');
            // Try to wait for physics engine
            let attempts = 0;
            while (!window.redOrbitPhysics && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
        }
        
        this.currentSimulation.simulated = simulated;
        this.currentSimulation.rendered = rendered;
        
        // Update display
        document.getElementById('objects-display').textContent = 
            `${(simulated/1000).toFixed(0)}K/${(rendered/1000).toFixed(0)}K`;
        
        // Apply to physics engine (async operation)
        if (window.redOrbitPhysics && window.redOrbitPhysics.setObjectCounts) {
            this.showNotification('Updating simulation...');
            const success = await window.redOrbitPhysics.setObjectCounts(simulated, rendered);
            
            if (success) {
                this.showNotification(`Configuration applied: ${simulated.toLocaleString()} / ${rendered.toLocaleString()}`);
            } else {
                this.showNotification('Failed to update configuration', 'error');
            }
        } else {
            this.showNotification('Physics engine not ready', 'error');
            console.error('[Engineering Panel] Physics engine not available:', window.redOrbitPhysics);
        }
    }
    
    async loadScenario(scenario) {
        console.log(`[Engineering Panel] Loading scenario: ${scenario.name}`);
        console.log('[Engineering Panel] Physics engine status:', {
            exists: !!window.redOrbitPhysics,
            hasLoadScenario: !!(window.redOrbitPhysics && window.redOrbitPhysics.loadScenario),
            engine: window.redOrbitPhysics
        });
        
        // Check if physics engine is ready (might need to wait for it)
        if (!window.redOrbitPhysics) {
            console.log('[Engineering Panel] Waiting for physics engine...');
            // Try to wait for physics engine
            let attempts = 0;
            while (!window.redOrbitPhysics && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
                console.log(`[Engineering Panel] Waiting attempt ${attempts}/10...`);
            }
        }
        
        // Apply scenario to physics engine
        if (window.redOrbitPhysics && window.redOrbitPhysics.loadScenario) {
            this.showNotification(`Loading scenario: ${scenario.name}...`);
            const success = await window.redOrbitPhysics.loadScenario(scenario);
            
            if (success) {
                // Update current simulation values
                this.currentSimulation.simulated = scenario.simulated;
                this.currentSimulation.rendered = scenario.rendered;
                
                // Update display
                document.getElementById('objects-display').textContent = 
                    `${(scenario.simulated/1000).toFixed(0)}K/${(scenario.rendered/1000).toFixed(0)}K`;
                
                this.showNotification(`Scenario loaded: ${scenario.name}`);
            } else {
                this.showNotification('Failed to load scenario', 'error');
            }
        } else {
            this.showNotification('Physics engine not ready', 'error');
            console.error('[Engineering Panel] Physics engine not available:', {
                hasRedOrbitPhysics: !!window.redOrbitPhysics,
                hasLoadScenario: !!(window.redOrbitPhysics && window.redOrbitPhysics.loadScenario),
                availableMethods: window.redOrbitPhysics ? Object.keys(window.redOrbitPhysics) : []
            });
        }
    }
    
    updateDynamicNotes(scenario) {
        const notesSection = document.getElementById('engineering-notes');
        if (!notesSection) return;
        
        // Generate dynamic notes based on the scenario
        let notesContent = `
            <style>
                #engineering-notes h3 {
                    color: #00ffff;
                    margin: 0 0 15px 0;
                    font-size: 14px;
                    text-transform: uppercase;
                    border-bottom: 1px solid rgba(0, 255, 255, 0.3);
                    padding-bottom: 10px;
                }
                #engineering-notes .note-section {
                    padding: 15px;
                    background: rgba(0, 255, 255, 0.05);
                    border: 1px solid rgba(0, 255, 255, 0.2);
                    border-radius: 4px;
                    margin-bottom: 15px;
                }
                #engineering-notes .note-section h4 {
                    color: #00ffff;
                    margin: 0 0 10px 0;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                #engineering-notes .note-section p {
                    color: #888;
                    font-size: 11px;
                    margin: 5px 0;
                    line-height: 1.6;
                }
                #engineering-notes .note-section p strong {
                    color: #00ffff;
                }
            </style>
            <h3>SCENARIO: ${scenario.name.toUpperCase()}</h3>
            <div class="note-section">
                <h4>Configuration</h4>
                <p><strong>Simulated Objects:</strong> ${scenario.simulated.toLocaleString()}</p>
                <p><strong>Rendered Objects:</strong> ${scenario.rendered.toLocaleString()}</p>
                <p><strong>Ratio:</strong> ${(scenario.simulated/scenario.rendered).toFixed(1)}:1</p>
            </div>
        `;
        
        // Add scenario-specific details
        switch(scenario.name) {
            case 'Current (2025)':
                notesContent += `
                    <div class="note-section">
                        <h4>Scenario Details</h4>
                        <p>Current operational satellite and debris environment as of 2025.</p>
                        <p><strong>Active Satellites:</strong> ~11,500</p>
                        <p><strong>Tracked Debris:</strong> ~34,000 objects > 10cm</p>
                        <p><strong>Total Mass in Orbit:</strong> ~11,000 metric tons</p>
                    </div>
                    <div class="note-section">
                        <h4>Key Characteristics</h4>
                        <p>• Manageable collision risk</p>
                        <p>• Clear orbital highways</p>
                        <p>• Regular conjunction warnings</p>
                        <p>• Sustainable with active management</p>
                    </div>
                `;
                break;
            
            case 'Projected 2035':
                notesContent += `
                    <div class="note-section">
                        <h4>Scenario Details</h4>
                        <p>Conservative projection for 2035 based on current launch rates.</p>
                        <p><strong>Expected Satellites:</strong> ~58,000</p>
                        <p><strong>Debris Growth:</strong> 5x current levels</p>
                        <p><strong>Mega-constellations:</strong> Multiple deployed</p>
                    </div>
                    <div class="note-section">
                        <h4>Key Risks</h4>
                        <p>• Increased collision probability</p>
                        <p>• Crowded LEO orbits</p>
                        <p>• Cascade effect potential</p>
                        <p>• Requires active debris removal</p>
                    </div>
                `;
                break;
                
            case 'Kessler Syndrome':
                notesContent += `
                    <div class="note-section">
                        <h4>Scenario Details</h4>
                        <p>Full Kessler Syndrome cascade event simulation.</p>
                        <p><strong>Debris Cascade:</strong> Self-sustaining</p>
                        <p><strong>Collision Rate:</strong> Exponential growth</p>
                        <p><strong>LEO Status:</strong> Unusable for decades</p>
                    </div>
                    <div class="note-section">
                        <h4>Critical Impacts</h4>
                        <p>• LEO becomes inaccessible</p>
                        <p>• Loss of all satellite services</p>
                        <p>• No GPS, communications, weather</p>
                        <p>• Space exploration halted</p>
                        <p>• Recovery time: 50-100 years</p>
                    </div>
                `;
                break;
                
            case 'Starlink Full':
                notesContent += `
                    <div class="note-section">
                        <h4>Scenario Details</h4>
                        <p>Complete Starlink constellation at full deployment.</p>
                        <p><strong>Starlink Satellites:</strong> 42,000</p>
                        <p><strong>Orbital Shells:</strong> Multiple altitudes</p>
                        <p><strong>Coverage:</strong> Global broadband</p>
                    </div>
                    <div class="note-section">
                        <h4>Operational Notes</h4>
                        <p>• Autonomous collision avoidance</p>
                        <p>• 5-year satellite lifespan</p>
                        <p>• Continuous replacement launches</p>
                        <p>• Deorbit at end-of-life</p>
                    </div>
                `;
                break;
                
            case 'Chinese Mega':
                notesContent += `
                    <div class="note-section">
                        <h4>Scenario Details</h4>
                        <p>Chinese GuoWang mega-constellation deployment.</p>
                        <p><strong>GuoWang Satellites:</strong> 13,000</p>
                        <p><strong>Purpose:</strong> Broadband + surveillance</p>
                        <p><strong>Deployment:</strong> 2028-2035 planned</p>
                    </div>
                    <div class="note-section">
                        <h4>Strategic Implications</h4>
                        <p>• Competition for orbital slots</p>
                        <p>• Dual-use capabilities</p>
                        <p>• Regional coverage priority</p>
                        <p>• Independent from Western systems</p>
                    </div>
                `;
                break;
                
            case 'Military Surge':
                notesContent += `
                    <div class="note-section">
                        <h4>Scenario Details</h4>
                        <p>Rapid military satellite deployment scenario.</p>
                        <p><strong>Tactical Satellites:</strong> 5,000+</p>
                        <p><strong>Response Time:</strong> < 6 months</p>
                        <p><strong>Classification:</strong> Mixed LEO/MEO</p>
                    </div>
                    <div class="note-section">
                        <h4>Capabilities</h4>
                        <p>• Resilient C3 architecture</p>
                        <p>• Proliferated sensing layer</p>
                        <p>• Rapid reconstitution</p>
                        <p>• Anti-jam communications</p>
                        <p>• Space domain awareness</p>
                    </div>
                `;
                break;
                
            default:
                notesContent += `
                    <div class="note-section">
                        <h4>Custom Configuration</h4>
                        <p>User-defined simulation parameters.</p>
                    </div>
                `;
        }
        
        // Add physics accuracy note
        notesContent += `
            <div class="note-section">
                <h4>Physics Accuracy</h4>
                <p><strong>Integration:</strong> RK4 @ 240Hz</p>
                <p><strong>Breakup Model:</strong> NASA Standard</p>
                <p><strong>Compute:</strong> WebGPU parallel</p>
                <p><strong>Precision:</strong> Double (64-bit)</p>
            </div>
        `;
        
        notesSection.innerHTML = notesContent;
    }
    
    setClassificationBanner(classification) {
        const banner = document.getElementById('unclass-banner');
        if (!banner) return;
        
        if (classification === 'none') {
            banner.style.display = 'none';
        } else {
            banner.style.display = 'block';
            banner.textContent = classification.toUpperCase();
            
            // Set appropriate colors
            switch(classification) {
                case 'secret':
                case 'topsecret':
                    banner.style.background = '#ff0000';
                    break;
                case 'fouo':
                    banner.style.background = '#ff6600';
                    break;
                default:
                    banner.style.background = '#00ff00';
            }
        }
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? 'rgba(255, 102, 0, 0.9)' : 'rgba(0, 255, 255, 0.9)';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${bgColor};
            color: #000;
            padding: 15px 20px;
            border-radius: 4px;
            font-family: 'Orbitron', monospace;
            font-size: 12px;
            font-weight: bold;
            z-index: 100001;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
    
    setupEventListeners() {
        // Close button
        document.getElementById('panel-close').addEventListener('click', () => {
            this.close();
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'o' || e.key === 'O') {
                this.toggle();
            }
        });
    }
    
    open() {
        this.isOpen = true;
        this.container.style.display = 'flex';
        
        // Update performance metrics
        this.updatePerformanceMetrics();
    }
    
    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    updatePerformanceMetrics() {
        // Update FPS
        if (window.engine) {
            this.currentSimulation.fps = Math.round(window.engine.getFps());
            const fpsDisplay = document.getElementById('fps-display');
            if (fpsDisplay) {
                fpsDisplay.textContent = this.currentSimulation.fps;
            }
        }
        
        // Update object counts from physics engine
        if (window.redOrbitPhysics) {
            // Get the actual active objects and render count
            this.currentSimulation.activeObjects = window.redOrbitPhysics.activeObjects || this.currentSimulation.simulated;
            
            // Update rendered count from render manager if available
            if (window.redOrbitPhysics.renderManager && window.redOrbitPhysics.renderManager.config) {
                this.currentSimulation.rendered = window.redOrbitPhysics.renderManager.config.rendered;
            } else if (window.redOrbitPhysics.renderCount) {
                this.currentSimulation.rendered = window.redOrbitPhysics.renderCount;
            }
            
            // Get other stats if available
            if (window.redOrbitPhysics.getStats) {
                const stats = window.redOrbitPhysics.getStats();
                this.currentSimulation.physicsTime = stats.computeTime || 0;
                this.currentSimulation.gpuMemory = stats.memory || 0;
                this.currentSimulation.conjunctions = stats.conjunctions || 0;
            }
        }
        
        // Update the Live Monitor tab if it's active (refresh the content)
        if (this.activeTab === 'simulation' && this.isOpen) {
            const content = document.getElementById('panel-content');
            if (content) {
                // Save scroll position
                const scrollTop = content.scrollTop;
                // Update content
                content.innerHTML = this.getSimulationContent();
                this.attachSimulationHandlers();
                // Restore scroll position
                content.scrollTop = scrollTop;
            }
        }
        
        // Update status bar displays
        const objectsDisplay = document.getElementById('objects-display');
        if (objectsDisplay) {
            const sim = this.currentSimulation.activeObjects || this.currentSimulation.simulated;
            const ren = this.currentSimulation.rendered;
            objectsDisplay.textContent = `${(sim/1000).toFixed(0)}K/${(ren/1000).toFixed(0)}K`;
        }
        
        // Schedule next update if panel is open
        if (this.isOpen) {
            setTimeout(() => this.updatePerformanceMetrics(), 500); // Update every 500ms for smoother display
        }
    }
}

// Create and export singleton instance
export const engineeringPanel = new EngineeringControlPanel();

// Expose globally for debugging
window.engineeringPanel = engineeringPanel;