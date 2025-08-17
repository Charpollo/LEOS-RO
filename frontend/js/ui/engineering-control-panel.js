/**
 * Engineering Control Panel - Floating overlay with full simulation control
 * Activated with 'O' key, contains all configuration and control options
 */

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
        this.scenarioPresets = [
            { name: 'Current (2025)', satellites: 9500, debris: 34000 },
            { name: 'Projected 2035', satellites: 100000, debris: 500000 },
            { name: 'Starlink Full', satellites: 42000, debris: 0 },
            { name: 'Chinese ASAT Test', satellites: 9500, debris: 3000000 },
            { name: 'Kessler Cascade', satellites: 5000, debris: 8000000 },
            { name: 'Blue Origin Kuiper', satellites: 3236, debris: 0 }
        ];
        
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
            { id: 'simulation', label: 'Simulation', icon: '🎯' },
            { id: 'scenarios', label: 'Scenarios', icon: '🌍' },
            { id: 'performance', label: 'Performance', icon: '📊' },
            { id: 'grafana', label: 'Grafana', icon: '📡' },
            { id: 'export', label: 'Export', icon: '💾' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
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
            tabBtn.innerHTML = `<span style="margin-right: 5px;">${tab.icon}</span>${tab.label}`;
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
            case 'performance':
                content.innerHTML = this.getPerformanceContent();
                break;
            case 'grafana':
                content.innerHTML = this.getGrafanaContent();
                break;
            case 'export':
                content.innerHTML = this.getExportContent();
                break;
            case 'settings':
                content.innerHTML = this.getSettingsContent();
                break;
        }
    }
    
    getSimulationContent() {
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <h3 style="color: #00ffff; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase;">
                        Simulation Presets (Simulated:Rendered Ratio)
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        ${this.simulationPresets.map(preset => `
                            <button class="preset-btn" data-sim="${preset.simulated}" data-ren="${preset.rendered}" style="
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
                </div>
                
                <div>
                    <h3 style="color: #00ffff; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase;">
                        Custom Configuration
                    </h3>
                    <div style="display: flex; gap: 20px;">
                        <div style="flex: 1;">
                            <label style="color: #888; font-size: 11px; display: block; margin-bottom: 5px;">
                                SIMULATED OBJECTS
                            </label>
                            <input type="number" id="custom-simulated" value="${this.currentSimulation.simulated}" style="
                                width: 100%;
                                padding: 8px;
                                background: rgba(0, 255, 255, 0.05);
                                border: 1px solid rgba(0, 255, 255, 0.3);
                                color: #00ffff;
                                border-radius: 4px;
                            ">
                        </div>
                        <div style="flex: 1;">
                            <label style="color: #888; font-size: 11px; display: block; margin-bottom: 5px;">
                                RENDERED OBJECTS
                            </label>
                            <input type="number" id="custom-rendered" value="${this.currentSimulation.rendered}" style="
                                width: 100%;
                                padding: 8px;
                                background: rgba(0, 255, 255, 0.05);
                                border: 1px solid rgba(0, 255, 255, 0.3);
                                color: #00ffff;
                                border-radius: 4px;
                            ">
                        </div>
                    </div>
                    <div style="margin-top: 10px; padding: 10px; background: rgba(255, 102, 0, 0.1); border: 1px solid rgba(255, 102, 0, 0.3); border-radius: 4px;">
                        <div style="color: #ff6600; font-size: 11px;">
                            ⚠️ Minimum ratio must be 2:1 (simulated:rendered)
                        </div>
                        <div id="ratio-display" style="color: #00ffff; font-size: 12px; margin-top: 5px;">
                            Current ratio: 2:1
                        </div>
                    </div>
                    <button id="apply-custom" style="
                        margin-top: 10px;
                        width: 100%;
                        padding: 10px;
                        background: rgba(0, 255, 255, 0.1);
                        border: 1px solid #00ffff;
                        color: #00ffff;
                        cursor: pointer;
                        border-radius: 4px;
                        font-weight: bold;
                        text-transform: uppercase;
                    ">Apply Configuration</button>
                </div>
            </div>
        `;
    }
    
    getScenariosContent() {
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <h3 style="color: #00ffff; margin: 0; font-size: 14px; text-transform: uppercase;">
                    Scenario Presets
                </h3>
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                    ${this.scenarioPresets.map(scenario => `
                        <button class="scenario-btn" data-scenario="${scenario.name}" style="
                            padding: 15px;
                            background: rgba(0, 255, 255, 0.05);
                            border: 1px solid rgba(0, 255, 255, 0.3);
                            color: #00ffff;
                            cursor: pointer;
                            border-radius: 4px;
                            text-align: left;
                            transition: all 0.3s;
                        ">
                            <div style="font-weight: bold; margin-bottom: 8px;">${scenario.name}</div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888;">
                                <span>Satellites: ${scenario.satellites.toLocaleString()}</span>
                                <span>Debris: ${scenario.debris.toLocaleString()}</span>
                            </div>
                            <div style="margin-top: 8px; height: 4px; background: rgba(0, 255, 255, 0.1); border-radius: 2px; overflow: hidden;">
                                <div style="
                                    height: 100%;
                                    width: ${(scenario.satellites / (scenario.satellites + scenario.debris) * 100)}%;
                                    background: #00ffff;
                                    display: inline-block;
                                "></div>
                                <div style="
                                    height: 100%;
                                    width: ${(scenario.debris / (scenario.satellites + scenario.debris) * 100)}%;
                                    background: #ff6600;
                                    display: inline-block;
                                "></div>
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <div style="padding: 15px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px;">
                    <h4 style="color: #ff6600; margin: 0 0 10px 0; font-size: 12px;">Classification Banner</h4>
                    <select id="classification-select" style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(0, 255, 255, 0.05);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        color: #00ffff;
                        border-radius: 4px;
                    ">
                        <option value="none">No Banner</option>
                        <option value="unclassified">UNCLASSIFIED</option>
                        <option value="fouo">FOR OFFICIAL USE ONLY</option>
                        <option value="secret">SECRET</option>
                        <option value="topsecret">TOP SECRET</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    getPerformanceContent() {
        return `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <h3 style="color: #00ffff; margin: 0; font-size: 14px; text-transform: uppercase;">
                    Performance Metrics
                </h3>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">FRAME RATE</div>
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">${this.currentSimulation.fps} FPS</div>
                    </div>
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">PHYSICS TIME</div>
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">${this.currentSimulation.physicsTime}ms</div>
                    </div>
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">GPU MEMORY</div>
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">${this.currentSimulation.gpuMemory}MB</div>
                    </div>
                    <div style="padding: 15px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 4px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">CONJUNCTIONS</div>
                        <div style="color: #ff6600; font-size: 24px; font-weight: bold;">${this.currentSimulation.conjunctions}</div>
                    </div>
                </div>
                
                <div style="padding: 15px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 4px;">
                    <h4 style="color: #00ffff; margin: 0 0 10px 0; font-size: 12px;">Accuracy Notes</h4>
                    <ul style="color: #888; font-size: 11px; margin: 0; padding-left: 20px;">
                        <li>Physics: Full Newtonian F = -GMm/r²</li>
                        <li>Integration: RK4 at 240Hz</li>
                        <li>Collision: NASA Standard Breakup Model</li>
                        <li>Conjunction scanning limited to rendered objects</li>
                        <li>Full truth data streamed to Grafana</li>
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
                        <div style="font-size: 24px; margin-bottom: 5px;">📄</div>
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
                        <div style="font-size: 24px; margin-bottom: 5px;">📊</div>
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
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const simulated = parseInt(e.currentTarget.dataset.sim);
                const rendered = parseInt(e.currentTarget.dataset.ren);
                this.applySimulationConfig(simulated, rendered);
            });
        });
        
        // Custom configuration
        const simInput = document.getElementById('custom-simulated');
        const renInput = document.getElementById('custom-rendered');
        const ratioDisplay = document.getElementById('ratio-display');
        
        const updateRatio = () => {
            const sim = parseInt(simInput.value) || 0;
            const ren = parseInt(renInput.value) || 1;
            const ratio = sim / ren;
            ratioDisplay.textContent = `Current ratio: ${ratio.toFixed(1)}:1`;
            
            if (ratio < 2) {
                ratioDisplay.style.color = '#ff0000';
                ratioDisplay.innerHTML += ' ⚠️ Below minimum!';
            } else {
                ratioDisplay.style.color = '#00ffff';
            }
        };
        
        simInput.addEventListener('input', updateRatio);
        renInput.addEventListener('input', updateRatio);
        
        document.getElementById('apply-custom').addEventListener('click', () => {
            const sim = parseInt(simInput.value);
            const ren = parseInt(renInput.value);
            
            if (sim / ren < 2) {
                alert('Ratio must be at least 2:1 (simulated:rendered)');
                return;
            }
            
            this.applySimulationConfig(sim, ren);
        });
    }
    
    attachScenarioHandlers() {
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenarioName = e.currentTarget.dataset.scenario;
                const scenario = this.scenarioPresets.find(s => s.name === scenarioName);
                if (scenario) {
                    this.loadScenario(scenario);
                }
            });
        });
        
        document.getElementById('classification-select').addEventListener('change', (e) => {
            this.setClassificationBanner(e.target.value);
        });
    }
    
    applySimulationConfig(simulated, rendered) {
        console.log(`[Engineering Panel] Applying config: ${simulated} simulated, ${rendered} rendered`);
        
        this.currentSimulation.simulated = simulated;
        this.currentSimulation.rendered = rendered;
        
        // Update display
        document.getElementById('objects-display').textContent = 
            `${(simulated/1000).toFixed(0)}K/${(rendered/1000).toFixed(0)}K`;
        
        // Apply to physics engine
        if (window.redOrbitPhysics && window.redOrbitPhysics.setObjectCounts) {
            window.redOrbitPhysics.setObjectCounts(simulated, rendered);
        }
        
        // Show confirmation
        this.showNotification(`Configuration applied: ${simulated.toLocaleString()} / ${rendered.toLocaleString()}`);
    }
    
    loadScenario(scenario) {
        console.log(`[Engineering Panel] Loading scenario: ${scenario.name}`);
        
        // Apply scenario to physics engine
        if (window.redOrbitPhysics && window.redOrbitPhysics.loadScenario) {
            window.redOrbitPhysics.loadScenario(scenario);
        }
        
        this.showNotification(`Scenario loaded: ${scenario.name}`);
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
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 255, 255, 0.9);
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
            document.getElementById('fps-display').textContent = this.currentSimulation.fps;
        }
        
        // Update other metrics if available
        if (window.redOrbitPhysics && window.redOrbitPhysics.getStats) {
            const stats = window.redOrbitPhysics.getStats();
            this.currentSimulation.physicsTime = stats.computeTime || 0;
            this.currentSimulation.gpuMemory = stats.memory || 0;
            this.currentSimulation.conjunctions = stats.conjunctions || 0;
        }
        
        // Schedule next update if panel is open
        if (this.isOpen) {
            setTimeout(() => this.updatePerformanceMetrics(), 1000);
        }
    }
}

// Create and export singleton instance
export const engineeringPanel = new EngineeringControlPanel();

// Expose globally for debugging
window.engineeringPanel = engineeringPanel;