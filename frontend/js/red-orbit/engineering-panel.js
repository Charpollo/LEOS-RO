/**
 * RED ORBIT Engineering Panel
 * Advanced configuration and control interface for simulation
 * Accessed via hotkey 'O'
 */

export class EngineeringPanel {
    constructor() {
        this.isOpen = false;
        this.wsConnection = null;
        this.wsUrl = 'ws://localhost:8000/ws/ingest';
        this.isStreaming = false;
        this.currentScenario = 'showcase'; // Default beautiful math mode
        
        this.initPanel();
        this.initKeyboardHandler();
        this.initTabs();
    }

    /**
     * Get saved ASAT scenarios from localStorage
     */
    getSavedScenarios() {
        try {
            const saved = localStorage.getItem('asat_scenarios');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading saved scenarios:', e);
            return [];
        }
    }
    
    /**
     * Render saved scenario options for dropdown
     */
    renderSavedScenarioOptions() {
        const scenarios = this.getSavedScenarios();
        if (scenarios.length === 0) return '';
        
        let html = '<optgroup label="Saved Scenarios">';
        scenarios.forEach(scenario => {
            html += `<option value="saved_${scenario.id}">${scenario.name}</option>`;
        });
        html += '</optgroup>';
        return html;
    }
    
    initPanel() {
        // Check if we're on the ALOHA subdomain
        const isAlohaSubdomain = window.location.hostname === 'aloha.redorbit.space' || 
                                 window.location.hostname.startsWith('aloha.') ||
                                 window.location.hostname === 'localhost'; // For testing
        
        console.log('InitPanel - hostname:', window.location.hostname, 'isAloha:', isAlohaSubdomain);
        
        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'engineering-panel';
        panel.className = 'engineering-panel closed';
        
        // Keep exact same look but conditionally hide tabs
        const tabsHTML = isAlohaSubdomain ? 
            '' : // No tabs for ALOHA
            `<div class="panel-tabs">
                <button class="tab-btn active" data-tab="scenarios">Scenarios</button>
                <button class="tab-btn" data-tab="simulation">Simulation</button>
                <button class="tab-btn" data-tab="display">Display</button>
                <button class="tab-btn" data-tab="data">Data Pipeline</button>
                <button class="tab-btn" data-tab="performance">Performance</button>
            </div>`;
        
        panel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">
                    <span class="red-orbit-badge">RED ORBIT</span>
                    <span>${isAlohaSubdomain ? 'ALOHA Panel' : 'Engineering Panel'}</span>
                </div>
                <button class="panel-close" id="close-panel">×</button>
            </div>
            
            ${tabsHTML}
            
            <div class="panel-content">
                <!-- Scenarios Tab -->
                <div class="tab-content active" id="scenarios-tab">
                    <h3>Quick Scenarios</h3>
                    <div class="scenario-grid" id="scenario-grid">
                        <div class="scenario-tile" data-scenario="showcase">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="20" fill="none" stroke="#ff3333" stroke-width="2"/>
                                <circle cx="30" cy="30" r="15" fill="none" stroke="#ff6666" stroke-width="1.5"/>
                                <circle cx="70" cy="40" r="18" fill="none" stroke="#ff9999" stroke-width="1.5"/>
                                <circle cx="45" cy="70" r="12" fill="none" stroke="#ffcccc" stroke-width="1"/>
                            </svg>
                            <h4>Beautiful Math</h4>
                            <p>Random orbits creating natural patterns. ~15,000 objects showcasing physics engine.</p>
                            <span class="object-count">15,000 objects</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="nominal">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="25" fill="none" stroke="#00ff00" stroke-width="2"/>
                                <circle cx="50" cy="50" r="5" fill="#00ff00"/>
                            </svg>
                            <h4>Nominal Operations</h4>
                            <p>Clean space environment. No debris, no collisions. Operational satellites only.</p>
                            <span class="object-count">3,000 objects</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="starlink">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <g stroke="#4080ff" fill="none" stroke-width="1.5">
                                    <circle cx="50" cy="50" r="30"/>
                                    <circle cx="50" cy="50" r="25"/>
                                    <circle cx="50" cy="50" r="20"/>
                                </g>
                                <circle cx="50" cy="20" r="3" fill="#4080ff"/>
                                <circle cx="80" cy="50" r="3" fill="#4080ff"/>
                                <circle cx="50" cy="80" r="3" fill="#4080ff"/>
                                <circle cx="20" cy="50" r="3" fill="#4080ff"/>
                            </svg>
                            <h4>Starlink Constellation</h4>
                            <p>Full Starlink deployment. Multiple orbital shells at 550km altitude.</p>
                            <span class="object-count">5,000+ objects</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="leo-all">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="35" fill="none" stroke="#ffaa00" stroke-width="2"/>
                                <circle cx="50" cy="50" r="30" fill="none" stroke="#ffaa00" stroke-width="1" opacity="0.7"/>
                                <circle cx="50" cy="50" r="25" fill="none" stroke="#ffaa00" stroke-width="1" opacity="0.5"/>
                            </svg>
                            <h4>All LEO Assets</h4>
                            <p>Everything in Low Earth Orbit (200-2000km). Satellites, debris, stations.</p>
                            <span class="object-count">8,000+ objects</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="meo-all">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="#00aaff" stroke-width="2"/>
                                <path d="M 20,50 A 30,15 0 0,1 80,50" stroke="#00aaff" fill="none" stroke-width="1.5"/>
                            </svg>
                            <h4>MEO Navigation</h4>
                            <p>GPS, GLONASS, Galileo, BeiDou constellations at ~20,000km.</p>
                            <span class="object-count">120+ objects</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="geo-all">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#ff00ff" stroke-width="2"/>
                                <rect x="45" y="45" width="10" height="10" fill="#ff00ff"/>
                            </svg>
                            <h4>GEO Belt</h4>
                            <p>Geostationary satellites at 35,786km. Communication and weather.</p>
                            <span class="object-count">500+ objects</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="asat">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <path d="M 50,20 L 60,40 L 80,40 L 65,55 L 75,75 L 50,60 L 25,75 L 35,55 L 20,40 L 40,40 Z" 
                                      fill="none" stroke="#ff0000" stroke-width="2"/>
                                <circle cx="50" cy="50" r="3" fill="#ff0000"/>
                            </svg>
                            <h4>ASAT Test</h4>
                            <p>Anti-satellite weapon test scenario. Instant debris field generation.</p>
                            <span class="object-count">10,000+ debris</span>
                        </div>
                        
                        <div class="scenario-tile" id="aloha-tile" data-scenario="aloha">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <!-- Launch point -->
                                <circle cx="50" cy="80" r="3" fill="#ff6600"/>
                                <!-- Trajectory path -->
                                <path d="M 50,80 Q 30,50 50,20" fill="none" stroke="#ff0000" stroke-width="2" stroke-dasharray="3,1"/>
                                <!-- Target -->
                                <circle cx="50" cy="20" r="5" fill="none" stroke="#ffff00" stroke-width="2"/>
                                <line x1="45" y1="20" x2="55" y2="20" stroke="#ffff00" stroke-width="1"/>
                                <line x1="50" y1="15" x2="50" y2="25" stroke="#ffff00" stroke-width="1"/>
                                <!-- Warning indicators -->
                                <circle cx="35" cy="50" r="2" fill="#ffff00"/>
                                <circle cx="40" cy="35" r="2" fill="#ff9900"/>
                            </svg>
                            <h4>ALOHA</h4>
                            <p>Load trajectory data with conjunction analysis and impact simulation.</p>
                            <span class="object-count">Custom trajectory</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="kessler">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <g stroke="#ff0000" fill="none" stroke-width="1.5">
                                    <circle cx="35" cy="35" r="8"/>
                                    <circle cx="65" cy="35" r="8"/>
                                    <circle cx="50" cy="60" r="8"/>
                                    <line x1="35" y1="35" x2="65" y2="35" stroke-dasharray="2,2"/>
                                    <line x1="65" y1="35" x2="50" y2="60" stroke-dasharray="2,2"/>
                                    <line x1="50" y1="60" x2="35" y2="35" stroke-dasharray="2,2"/>
                                </g>
                            </svg>
                            <h4>Kessler Syndrome</h4>
                            <p>Cascading collision scenario. Watch debris multiply over time.</p>
                            <span class="object-count">Evolving</span>
                        </div>
                        
                        <div class="scenario-tile" data-scenario="catastrophic">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="30" fill="none" stroke="#ff0000" stroke-width="3"/>
                                <path d="M 50,20 L 55,50 L 80,50" stroke="#ff0000" stroke-width="2"/>
                                <path d="M 50,50 L 30,30" stroke="#ff0000" stroke-width="2"/>
                                <path d="M 50,50 L 70,70" stroke="#ff0000" stroke-width="2"/>
                                <circle cx="50" cy="50" r="5" fill="#ff0000"/>
                            </svg>
                            <h4>Catastrophic Event</h4>
                            <p>Major collision between large satellites. Extreme debris generation.</p>
                            <span class="object-count">25,000+ objects</span>
                        </div>
                        
                        <div class="scenario-tile disabled" data-scenario="solar">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="20" fill="#ffff00" opacity="0.3"/>
                                <g stroke="#ffff00" stroke-width="2" opacity="0.3">
                                    <line x1="50" y1="10" x2="50" y2="25"/>
                                    <line x1="50" y1="75" x2="50" y2="90"/>
                                    <line x1="10" y1="50" x2="25" y2="50"/>
                                    <line x1="75" y1="50" x2="90" y2="50"/>
                                </g>
                            </svg>
                            <h4>Solar Storm</h4>
                            <p>Coming Soon: Solar radiation pressure effects on satellites.</p>
                            <span class="object-count">TBD</span>
                        </div>
                        
                        <div class="scenario-tile disabled" data-scenario="magnetic">
                            <svg class="scenario-icon" viewBox="0 0 100 100">
                                <path d="M 30,50 Q 50,20 70,50 Q 50,80 30,50" fill="none" stroke="#0080ff" stroke-width="2" opacity="0.3"/>
                            </svg>
                            <h4>Magnetic Storm</h4>
                            <p>Coming Soon: Geomagnetic disturbances affecting orbits.</p>
                            <span class="object-count">TBD</span>
                        </div>
                    </div>
                </div>
                
                <!-- Simulation Tab -->
                <div class="tab-content" id="simulation-tab">
                    <h3>Simulation Controls</h3>
                    
                    <div class="control-group">
                        <label>Object Count</label>
                        <input type="range" id="object-count" min="100" max="50000" value="15000" step="100">
                        <span id="object-count-value">15,000</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Physics Rate (Hz)</label>
                        <input type="range" id="physics-rate" min="30" max="240" value="240" step="30">
                        <span id="physics-rate-value">240 Hz</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Time Multiplier</label>
                        <input type="range" id="time-multiplier" min="0.1" max="100" value="1" step="0.1" log>
                        <span id="time-multiplier-value">1.0x</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Collision Detection</label>
                        <label class="switch">
                            <input type="checkbox" id="collision-detection" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="control-group">
                        <label>Debris Generation</label>
                        <label class="switch">
                            <input type="checkbox" id="debris-generation" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="control-group">
                        <label>Debris Multiplier</label>
                        <input type="range" id="debris-multiplier" min="0.5" max="5" value="1" step="0.1">
                        <span id="debris-multiplier-value">1.0x</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Gravity Model</label>
                        <select id="gravity-model">
                            <option value="point-mass" selected>Point Mass (Simple)</option>
                            <option value="j2" disabled>J2 Perturbation</option>
                            <option value="j2-j6" disabled>J2-J6 Harmonics</option>
                        </select>
                    </div>
                </div>
                
                <!-- Display Tab -->
                <div class="tab-content" id="display-tab">
                    <h3>Display Options</h3>
                    
                    <div class="control-group">
                        <label>Show Orbits</label>
                        <label class="switch">
                            <input type="checkbox" id="show-orbits">
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="control-group">
                        <label>Show Labels</label>
                        <label class="switch">
                            <input type="checkbox" id="show-labels">
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="control-group">
                        <label>Show Trails</label>
                        <label class="switch">
                            <input type="checkbox" id="show-trails">
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="control-group">
                        <label>Classification Banner</label>
                        <select id="classification-banner">
                            <option value="none" selected>None</option>
                            <option value="unclassified">UNCLASSIFIED</option>
                            <option value="cui">CUI</option>
                            <option value="secret">SECRET</option>
                            <option value="topsecret">TOP SECRET</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>Theme</label>
                        <select id="theme">
                            <option value="dark" selected>Dark Space</option>
                            <option value="realistic">Realistic</option>
                            <option value="tactical">Tactical</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>Object Scale</label>
                        <input type="range" id="object-scale" min="0.5" max="5" value="1" step="0.1">
                        <span id="object-scale-value">1.0x</span>
                    </div>
                </div>
                
                <!-- Data Pipeline Tab -->
                <div class="tab-content" id="data-tab">
                    <h3>Data Pipeline Configuration</h3>
                    
                    <div class="control-group">
                        <label>WebSocket URL</label>
                        <input type="text" id="ws-url" value="ws://localhost:8000/ws/ingest" placeholder="ws://localhost:8000/ws/ingest">
                    </div>
                    
                    <div class="control-group">
                        <label>Stream Rate (Hz)</label>
                        <input type="range" id="stream-rate" min="1" max="60" value="10">
                        <span id="stream-rate-value">10 Hz</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Data Format</label>
                        <select id="data-format">
                            <option value="redwatch" selected>RED-WATCH Native</option>
                            <option value="json">Generic JSON</option>
                            <option value="protobuf" disabled>Protocol Buffers</option>
                        </select>
                    </div>
                    
                    <div class="streaming-controls">
                        <button id="test-connection" class="btn btn-secondary">Test Connection</button>
                        <button id="start-streaming" class="btn btn-primary">Start Streaming</button>
                        <button id="stop-streaming" class="btn btn-danger" disabled>Stop Streaming</button>
                    </div>
                    
                    <div class="connection-status">
                        <h4>Connection Status</h4>
                        <div class="status-indicator disconnected" id="ws-status">
                            <span class="status-dot"></span>
                            <span class="status-text">Disconnected</span>
                        </div>
                        <div class="status-stats" id="stream-stats">
                            <div>Messages Sent: <span id="msg-sent">0</span></div>
                            <div>Data Rate: <span id="data-rate">0 KB/s</span></div>
                            <div>Uptime: <span id="stream-uptime">00:00:00</span></div>
                        </div>
                    </div>
                </div>
                
                <!-- Performance Tab -->
                <div class="tab-content" id="performance-tab">
                    <h3>Performance Monitoring</h3>
                    
                    <div class="perf-stats">
                        <div class="stat-card">
                            <h4>Rendering</h4>
                            <div class="stat-value" id="fps">60 FPS</div>
                            <div class="stat-label">Frame Rate</div>
                        </div>
                        
                        <div class="stat-card">
                            <h4>Physics</h4>
                            <div class="stat-value" id="physics-fps">240 Hz</div>
                            <div class="stat-label">Update Rate</div>
                        </div>
                        
                        <div class="stat-card">
                            <h4>Objects</h4>
                            <div class="stat-value" id="total-objects">15,000</div>
                            <div class="stat-label">Total Count</div>
                        </div>
                        
                        <div class="stat-card">
                            <h4>Memory</h4>
                            <div class="stat-value" id="memory-usage">2.4 GB</div>
                            <div class="stat-label">RAM Usage</div>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label>LOD Distance</label>
                        <input type="range" id="lod-distance" min="1000" max="50000" value="10000" step="1000">
                        <span id="lod-distance-value">10,000 km</span>
                    </div>
                    
                    <div class="control-group">
                        <label>Max Render Count</label>
                        <input type="range" id="max-render" min="1000" max="50000" value="5000" step="1000">
                        <span id="max-render-value">5,000</span>
                    </div>
                    
                    <div class="control-group">
                        <button id="test-coords-btn" class="action-button">Test Coordinate System</button>
                    </div>
                    
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        // Add close button handler
        document.getElementById('close-panel').addEventListener('click', () => this.close());
    }

    initKeyboardHandler() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'o' || e.key === 'O') {
                if (this.isOpen) {
                    this.close();
                } else {
                    this.open();
                }
            }
        });
    }

    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Only set up tabs if they exist (not in ALOHA mode)
        if (tabButtons.length > 0) {
            tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.dataset.tab;
                    
                    // Update button states
                    tabButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Update content visibility
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                        if (content.id === `${targetTab}-tab`) {
                            content.classList.add('active');
                        }
                    });
                });
            });
        }
        
        // Check if we're in ALOHA mode
        const isAlohaMode = window.location.hostname === 'aloha.redorbit.space' || 
                           window.location.hostname.startsWith('aloha.') ||
                           window.location.hostname === 'localhost';
        
        // Always initialize scenarios
        this.initScenarios();
        this.filterScenariosForSubdomain();
        
        // Only initialize other controls if not ALOHA
        if (!isAlohaMode) {
            this.initSimulationControls();
            this.initDisplayControls();
            this.initDataControls();
            this.initPerformanceMonitoring();
        }
        
        // Add test coordinate button handler
        const testCoordsBtn = document.getElementById('test-coords-btn');
        if (testCoordsBtn) {
            testCoordsBtn.addEventListener('click', () => this.testCoordinateSystem());
        }
    }

    initScenarios() {
        const tiles = document.querySelectorAll('.scenario-tile:not(.disabled)');
        tiles.forEach(tile => {
            tile.addEventListener('click', () => {
                const scenario = tile.dataset.scenario;
                this.loadScenario(scenario);
            });
        });
    }
    
    filterScenariosForSubdomain() {
        const isAlohaSubdomain = window.location.hostname === 'aloha.redorbit.space' || 
                                 window.location.hostname.startsWith('aloha.') ||
                                 window.location.hostname === 'localhost'; // For testing
        
        console.log('Filtering scenarios, isAlohaSubdomain:', isAlohaSubdomain, 'hostname:', window.location.hostname);
        
        if (isAlohaSubdomain) {
            // Only show ALOHA, Beautiful Math, and LEO cards for ALOHA subdomain
            const allowedScenarios = ['aloha', 'showcase', 'leo-all'];
            const tiles = document.querySelectorAll('.scenario-tile');
            
            console.log('Found tiles:', tiles.length);
            
            tiles.forEach(tile => {
                const scenario = tile.dataset.scenario;
                if (!allowedScenarios.includes(scenario)) {
                    console.log('Hiding tile:', scenario);
                    tile.style.cssText = 'display: none !important;';
                    tile.classList.add('hidden-for-aloha');
                } else {
                    console.log('Keeping tile:', scenario);
                }
            });
        }
    }
    
    setupALOHAFileHandlers() {
        const trajectorySelect = document.getElementById('aloha-trajectory-select');
        const loadBtn = document.getElementById('load-scenario-btn');
        
        if (!trajectorySelect) return;
        
        this.alohaData = null;
        
        // Trajectory selection
        trajectorySelect.addEventListener('change', async (e) => {
            const selection = e.target.value;
            if (selection === 'custom') {
                // Close the panel first
                this.minimize();
                // Show custom launch configurator
                window.dispatchEvent(new CustomEvent('show-asat-configurator'));
                // Reset selection
                trajectorySelect.value = '';
            } else if (selection) {
                await this.loadPresetTrajectory(selection);
            } else {
                // Reset if no selection
                this.alohaData = null;
                document.getElementById('aloha-upload-section').style.display = 'block';
                document.getElementById('aloha-analysis').style.display = 'none';
                if (loadBtn) {
                    loadBtn.textContent = 'Select Trajectory First';
                    loadBtn.disabled = true;
                }
            }
        });
        
        // Update load button
        if (loadBtn) {
            loadBtn.textContent = 'Select Trajectory First';
            loadBtn.disabled = true;
        }
    }
    
    async loadPresetTrajectory(trajectoryName) {
        try {
            // Map selection to file path
            const trajectoryFiles = {
                'aloha': '/data/aloha.json',
                'ascent_traj': '/data/ascent_traj.json',
                'traj_0': '/data/traj_0.json',
                'aurora_asat': '/data/aurora_asat_test.json',
                'russia_asat': '/data/russia_asat_test.json',
                'orbital_intercept_1': '/data/orbital_intercept_1_test.json',
                'orbital_intercept_2': '/data/orbital_intercept_2_test.json',
                'nudol_threat': '/data/nudol_threat_scenario.json',
                'cosmos_rpo': '/data/cosmos_rpo_scenario.json'
            };
            
            // Add saved scenarios from localStorage
            const savedScenarios = this.getSavedScenarios();
            savedScenarios.forEach(scenario => {
                trajectoryFiles[`saved_${scenario.id}`] = scenario;
            });
            
            const filePathOrData = trajectoryFiles[trajectoryName];
            if (!filePathOrData) {
                throw new Error('Unknown trajectory: ' + trajectoryName);
            }
            
            let data;
            
            // Check if it's a saved scenario (object) or a file path (string)
            if (typeof filePathOrData === 'object') {
                // It's a saved scenario, use directly
                data = filePathOrData;
            } else {
                // It's a file path, fetch it
                const response = await fetch(filePathOrData);
                if (!response.ok) {
                    throw new Error(`Failed to load ${trajectoryName}: ${response.statusText}`);
                }
                data = await response.json();
            }
            
            this.alohaData = data;
            
            // Trajectory loaded successfully
            
            // Enable load button
            const loadBtn = document.getElementById('load-scenario-btn');
            if (loadBtn) {
                loadBtn.textContent = 'Launch Simulation';
                loadBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Error loading preset trajectory:', error);
            this.showNotification(`Failed to load trajectory: ${error.message}`, 'error');
        }
    }
    
    async loadALOHAFilePopup(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            this.alohaData = data;
            
            // Trajectory loaded successfully
            
            // Enable load button
            const loadBtn = document.getElementById('load-scenario-btn');
            if (loadBtn) {
                loadBtn.textContent = 'Launch Simulation';
                loadBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Error loading file:', error);
            
            // Show error
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid rgba(255, 0, 0, 0.5);
                padding: 10px;
                margin: 10px 0;
                border-radius: 5px;
                color: #ff6666;
                font-family: monospace;
                font-size: 11px;
                white-space: pre-wrap;
            `;
            errorDiv.textContent = error.message;
            
            const uploadSection = document.getElementById('aloha-upload-section');
            if (uploadSection) {
                uploadSection.appendChild(errorDiv);
                setTimeout(() => errorDiv.remove(), 5000);
            }
        }
    }
    
    analyzeTrajectory(data) {
        // Detect format and analyze
        let states = [];
        let epoch = null;
        
        if (data.states && Array.isArray(data.states)) {
            states = data.states;
            epoch = states[0].epoch;
        } else if (data.trajectories && Array.isArray(data.trajectories)) {
            const traj = data.trajectories[0];
            epoch = traj.epoch;
            states = traj.trajectory.map(point => ({
                position: [point[1], point[2], point[3]],
                time: point[0]
            }));
        }
        
        if (states.length === 0) return;
        
        // Calculate metrics
        const duration = states[states.length - 1].time || 
                        (new Date(states[states.length - 1].epoch) - new Date(states[0].epoch)) / 1000;
        
        const firstPos = states[0].position;
        const startAlt = Math.sqrt(firstPos[0]**2 + firstPos[1]**2 + firstPos[2]**2) - 6371;
        
        let maxAlt = 0;
        states.forEach(state => {
            if (state.position) {
                const alt = Math.sqrt(state.position[0]**2 + state.position[1]**2 + state.position[2]**2) - 6371;
                maxAlt = Math.max(maxAlt, alt);
            }
        });
        
        // Update analysis display
        const analysisContent = document.getElementById('aloha-analysis-content');
        if (analysisContent) {
            analysisContent.innerHTML = `
                <div>Format: ${data.states ? 'States Array' : data.trajectories ? 'Trajectories Array' : 'Unknown'}</div>
                <div>Data Points: ${states.length}</div>
                <div>Duration: ${duration ? duration.toFixed(1) : 'N/A'} seconds</div>
                <div>Start Altitude: ${startAlt.toFixed(1)} km</div>
                <div>Max Altitude: ${maxAlt.toFixed(1)} km</div>
                <div>Epoch: ${epoch || 'N/A'}</div>
            `;
        }
        
        // Update mission parameters
        const missionParams = document.getElementById('aloha-mission-params');
        if (missionParams) {
            missionParams.innerHTML = `
                <div class="metric">
                    <span class="metric-label">Type:</span>
                    <span class="metric-value">${maxAlt < 500 ? 'LEO' : maxAlt < 20000 ? 'MEO' : 'GEO'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Points:</span>
                    <span class="metric-value">${states.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Duration:</span>
                    <span class="metric-value">${duration ? duration.toFixed(0) : 'N/A'}s</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Apogee:</span>
                    <span class="metric-value">${maxAlt.toFixed(0)} km</span>
                </div>
            `;
        }
    }
    
    async launchALOHA(config) {
        try {
            console.log('Launching ALOHA with config:', config);
            
            // Validate it's ALOHA data  
            if (!config.data) {
                throw new Error('No trajectory data provided');
            }
            
            const hasStates = config.data.states && config.data.states.length > 0;
            const hasTrajectories = config.data.trajectories && config.data.trajectories.length > 0;
            const hasTrajectory = config.data.trajectory && config.data.trajectory.length > 0;
            
            if (!hasStates && !hasTrajectories && !hasTrajectory) {
                throw new Error('Invalid trajectory data: no recognized format found');
            }
            
            // Reset simulation first
            this.resetSimulation();
            
            // Load background objects if requested
            if (config.backgroundObjects > 0) {
                console.log(`Loading ${config.backgroundObjects} background objects`);
                window.dispatchEvent(new CustomEvent('load-scenario', { 
                    detail: { type: 'mixed', count: config.backgroundObjects } 
                }));
            } else {
                console.log('Loading trajectory only (no background objects)');
            }
            
            // Load ALOHA trajectory with config
            window.dispatchEvent(new CustomEvent('load-aloha', { 
                detail: config
            }));
            
            // Show success with details
            const msg = config.backgroundObjects > 0 ? 
                `ALOHA trajectory loaded with ${config.backgroundObjects.toLocaleString()} background objects` :
                'ALOHA trajectory loaded (trajectory only)';
            this.showNotification(msg, 'success');
            
        } catch (error) {
            console.error('Failed to load ALOHA file:', error);
            this.showNotification('Failed to load ALOHA file: ' + error.message, 'error');
        }
    }
    
    testCoordinateSystem() {
        console.log('Testing coordinate system with reference orbs...');
        
        // Test coordinates
        const testPoints = [
            { lat: 46.797333, lon: -123.957992, name: 'Washington USA', color: [0, 0, 1] }, // Blue
            { lat: -6.355253, lon: -35.345825, name: 'Brazil Coast', color: [0, 1, 0] }  // Green
        ];
        
        // Use the same coordinate conversion as ground stations
        testPoints.forEach(point => {
            // Convert lat/lon to cartesian
            const phi = point.lat * Math.PI / 180;
            const lambda = point.lon * Math.PI / 180;
            const radius = 1; // Earth radius = 1 in Babylon units
            
            // Standard spherical to cartesian conversion
            const x = radius * Math.cos(phi) * Math.cos(lambda);
            const y = radius * Math.sin(phi);  // Y is up (North)
            const z = radius * Math.cos(phi) * Math.sin(lambda);
            
            // Create test orb
            const orb = BABYLON.MeshBuilder.CreateSphere(`testOrb_${point.name}`, {
                diameter: 0.02  // Visible size
            }, this.scene);
            
            // Position on Earth surface
            orb.position = new BABYLON.Vector3(x, y, z);
            
            // Create material with specified color
            const material = new BABYLON.StandardMaterial(`testMat_${point.name}`, this.scene);
            material.emissiveColor = new BABYLON.Color3(...point.color);
            material.diffuseColor = new BABYLON.Color3(...point.color);
            orb.material = material;
            
            console.log(`Placed ${point.name} orb at:`, {
                lat: point.lat,
                lon: point.lon,
                babylonPos: { x: x.toFixed(3), y: y.toFixed(3), z: z.toFixed(3) }
            });
        });
        
        this.showNotification('Test orbs placed: Blue (Washington), Green (Brazil)', 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#ff3333' : type === 'success' ? '#00ff00' : '#ffaa00'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    initSimulationControls() {
        // Object count slider
        const objectCount = document.getElementById('object-count');
        const objectCountValue = document.getElementById('object-count-value');
        objectCount.addEventListener('input', (e) => {
            objectCountValue.textContent = parseInt(e.target.value).toLocaleString();
        });
        
        // Physics rate slider
        const physicsRate = document.getElementById('physics-rate');
        const physicsRateValue = document.getElementById('physics-rate-value');
        physicsRate.addEventListener('input', (e) => {
            physicsRateValue.textContent = `${e.target.value} Hz`;
        });
        
        // Time multiplier slider
        const timeMultiplier = document.getElementById('time-multiplier');
        const timeMultiplierValue = document.getElementById('time-multiplier-value');
        timeMultiplier.addEventListener('input', (e) => {
            timeMultiplierValue.textContent = `${e.target.value}x`;
            if (window.simState) {
                window.simState.timeMultiplier = parseFloat(e.target.value);
            }
        });
        
        // Debris multiplier slider
        const debrisMultiplier = document.getElementById('debris-multiplier');
        const debrisMultiplierValue = document.getElementById('debris-multiplier-value');
        debrisMultiplier.addEventListener('input', (e) => {
            debrisMultiplierValue.textContent = `${e.target.value}x`;
        });
    }

    initDisplayControls() {
        // Object scale slider
        const objectScale = document.getElementById('object-scale');
        const objectScaleValue = document.getElementById('object-scale-value');
        objectScale.addEventListener('input', (e) => {
            objectScaleValue.textContent = `${e.target.value}x`;
        });
        
        // Classification banner handler
        const classificationSelect = document.getElementById('classification-banner');
        classificationSelect.addEventListener('change', (e) => {
            this.updateClassificationBanner(e.target.value);
        });
    }
    
    updateClassificationBanner(classification) {
        // Remove existing banner
        const existingBanner = document.querySelector('.classification-banner');
        if (existingBanner) {
            existingBanner.remove();
        }
        
        // Add new banner if not "none"
        if (classification !== 'none') {
            const banner = document.createElement('div');
            banner.className = `classification-banner ${classification}`;
            
            // Set text based on classification
            const texts = {
                'unclassified': 'UNCLASSIFIED',
                'cui': 'CONTROLLED UNCLASSIFIED INFORMATION',
                'secret': 'SECRET',
                'topsecret': 'TOP SECRET'
            };
            
            banner.textContent = texts[classification] || 'UNCLASSIFIED';
            document.body.appendChild(banner);
            
            // Adjust UI elements to account for banner
            const logoContainer = document.getElementById('logo-container');
            const statusContainer = document.getElementById('status-container');
            const timeDisplay = document.getElementById('time-display');
            
            if (logoContainer) logoContainer.style.top = '45px';
            if (statusContainer) statusContainer.style.top = '45px';
            if (timeDisplay) timeDisplay.style.top = '49px';
        } else {
            // Reset positions
            const logoContainer = document.getElementById('logo-container');
            const statusContainer = document.getElementById('status-container');
            const timeDisplay = document.getElementById('time-display');
            
            if (logoContainer) logoContainer.style.top = '20px';
            if (statusContainer) statusContainer.style.top = '20px';
            if (timeDisplay) timeDisplay.style.top = '24px';
        }
    }

    initDataControls() {
        const wsUrlInput = document.getElementById('ws-url');
        const testBtn = document.getElementById('test-connection');
        const startBtn = document.getElementById('start-streaming');
        const stopBtn = document.getElementById('stop-streaming');
        
        // Stream rate slider
        const streamRate = document.getElementById('stream-rate');
        const streamRateValue = document.getElementById('stream-rate-value');
        streamRate.addEventListener('input', (e) => {
            streamRateValue.textContent = `${e.target.value} Hz`;
        });
        
        testBtn.addEventListener('click', () => this.testConnection());
        startBtn.addEventListener('click', () => this.startStreaming());
        stopBtn.addEventListener('click', () => this.stopStreaming());
        
        // Update URL when changed
        wsUrlInput.addEventListener('change', (e) => {
            this.wsUrl = e.target.value;
        });
    }

    initPerformanceMonitoring() {
        // Update performance stats every second
        setInterval(() => {
            if (this.isOpen && document.querySelector('#performance-tab').classList.contains('active')) {
                this.updatePerformanceStats();
            }
        }, 1000);
    }

    loadScenario(scenario) {
        console.log(`Loading scenario: ${scenario}`);
        
        // Show detailed scenario information popup
        this.showScenarioDetails(scenario);
    }
    
    showScenarioDetails(scenario) {
        // Create scenario details popup
        const popup = document.createElement('div');
        popup.className = 'scenario-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <button class="popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
                ${this.getScenarioContent(scenario)}
                <div class="popup-actions">
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    <button class="btn btn-primary" id="load-scenario-btn">Load Scenario</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add load button handler
        document.getElementById('load-scenario-btn').addEventListener('click', () => {
            popup.remove();
            this.executeScenario(scenario);
        });
    }
    
    getScenarioContent(scenario) {
        const scenarios = {
            showcase: {
                title: 'Beautiful Math Mode',
                description: 'Experience the natural beauty of orbital mechanics with randomly distributed objects creating mesmerizing patterns.',
                details: [
                    '15,000 objects in random orbits',
                    'Natural collision patterns emerge',
                    'Demonstrates N-body physics at scale',
                    'Objects decay and collide over time',
                    'Perfect for demonstrations'
                ],
                metrics: {
                    'Initial Objects': '15,000',
                    'Altitude Range': '200-2000 km',
                    'Physics Rate': '240 Hz',
                    'Collision Detection': 'Enabled'
                }
            },
            nominal: {
                title: 'Nominal Operations',
                description: 'Clean space environment with only operational satellites. No debris or collision risks.',
                details: [
                    'Only active satellites',
                    'No space debris',
                    'Stable orbits maintained',
                    'Represents ideal conditions',
                    'Baseline for comparisons'
                ],
                metrics: {
                    'Active Satellites': '3,000',
                    'Debris Objects': '0',
                    'Collision Risk': 'None',
                    'Environment': 'Pristine'
                }
            },
            starlink: {
                title: 'Starlink Constellation',
                description: 'Full deployment of SpaceX Starlink mega-constellation across multiple orbital shells.',
                details: [
                    'Multiple orbital shells at 550km',
                    'Phased array deployment',
                    'Inter-satellite links visualized',
                    'Realistic orbital spacing',
                    'Ground coverage patterns'
                ],
                metrics: {
                    'Satellites': '5,000+',
                    'Orbital Shells': '5',
                    'Altitude': '550 km',
                    'Inclination': '53°'
                }
            },
            kessler: {
                title: 'Kessler Syndrome',
                description: 'Cascading collision scenario demonstrating runaway debris generation.',
                details: [
                    'Initial trigger collision',
                    'Debris cloud expansion',
                    'Secondary collisions cascade',
                    'Exponential debris growth',
                    'Orbital environment degradation'
                ],
                metrics: {
                    'Initial Event': 'Collision at 800km',
                    'Debris Generation': '2x multiplier',
                    'Cascade Time': '~6 hours',
                    'Final Debris Count': '25,000+'
                }
            },
            aloha: {
                title: 'ALOHA',
                description: 'Load and analyze trajectory data with real-time simulation.',
                customContent: true,
                details: [],
                metrics: {}
            },
            asat: {
                title: 'ASAT Weapon Test',
                description: 'Anti-satellite weapon demonstration creating instant debris field.',
                details: [
                    'Kinetic kill vehicle impact',
                    'Instant fragmentation',
                    'High-velocity debris cloud',
                    'Long-term orbital pollution',
                    'Cross-orbit threat assessment'
                ],
                metrics: {
                    'Target Altitude': '500 km',
                    'Initial Fragments': '10,000+',
                    'Velocity Spread': '±3 km/s',
                    'Threat Duration': 'Years'
                }
            },
            catastrophic: {
                title: 'Catastrophic Collision',
                description: 'Major collision event between two large satellites creating extreme debris field.',
                details: [
                    'High-mass satellite collision',
                    'Complete fragmentation',
                    'Maximum debris generation',
                    'Multiple orbit contamination',
                    'Worst-case scenario'
                ],
                metrics: {
                    'Collision Mass': '10,000 kg total',
                    'Fragment Count': '25,000+',
                    'Affected Orbits': 'LEO-wide',
                    'Recovery Time': 'Decades'
                }
            },
            'leo-all': {
                title: 'All LEO Assets',
                description: 'Complete Low Earth Orbit environment including all satellites, debris, and space stations.',
                details: [
                    'All operational satellites',
                    'Tracked debris objects',
                    'International Space Station',
                    'Chinese Space Station',
                    'Full LEO population'
                ],
                metrics: {
                    'Total Objects': '8,000+',
                    'Altitude Range': '200-2000 km',
                    'Active Satellites': '4,500',
                    'Debris Objects': '3,500+'
                }
            },
            'meo-all': {
                title: 'MEO Navigation Constellations',
                description: 'All Medium Earth Orbit navigation satellite constellations for global positioning.',
                details: [
                    'GPS (USA) - 31 satellites',
                    'GLONASS (Russia) - 24 satellites',
                    'Galileo (EU) - 28 satellites',
                    'BeiDou (China) - 35 satellites',
                    'Precise orbital mechanics'
                ],
                metrics: {
                    'Total Satellites': '120+',
                    'Altitude': '~20,200 km',
                    'Orbital Period': '12 hours',
                    'Coverage': 'Global'
                }
            },
            'geo-all': {
                title: 'Geostationary Belt',
                description: 'All geostationary satellites maintaining fixed positions above Earth\'s equator.',
                details: [
                    'Communication satellites',
                    'Weather monitoring',
                    'TV broadcast satellites',
                    'Military surveillance',
                    'Fixed ground footprints'
                ],
                metrics: {
                    'Active Satellites': '500+',
                    'Altitude': '35,786 km',
                    'Orbital Period': '24 hours',
                    'Coverage': '40% of Earth'
                }
            }
        };
        
        const data = scenarios[scenario] || scenarios.showcase;
        
        // ALOHA custom content
        if (data.customContent && scenario === 'aloha') {
            // Set up file handling after popup is added to DOM
            setTimeout(() => this.setupALOHAFileHandlers(), 100);
            
            return `
                <h2>${data.title}</h2>
                <p class="scenario-description">${data.description}</p>
                
                <div id="aloha-selection" style="margin: 20px 0;">
                    <div style="background: rgba(255, 0, 0, 0.05); border: 1px solid rgba(255, 0, 0, 0.3); padding: 20px; border-radius: 5px;">
                        <label style="color: #ff0000; font-size: 14px; display: block; margin-bottom: 10px;">Select Trajectory:</label>
                        <select id="aloha-trajectory-select" style="width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.5); border: 1px solid #ff0000; color: white; font-family: monospace; font-size: 13px;">
                            <option value="">-- Select a trajectory --</option>
                            <optgroup label="Original Test Data">
                                <option value="aloha">ALOHA - Saudi Arabia ASAT (206s, 398km apogee)</option>
                                <option value="ascent_traj">Ascent - New Zealand Launch (206s trajectory)</option>
                                <option value="traj_0">Trajectory 0 - Test Data (206s trajectory)</option>
                            </optgroup>
                            <optgroup label="Ground-Launched ASATs">
                                <option value="aurora_asat">Aurora, CO → 600km (7 min)</option>
                                <option value="russia_asat">Plesetsk, Russia → 800km (8 min)</option>
                            </optgroup>
                            <optgroup label="Orbital Intercepts">
                                <option value="orbital_intercept_1">LEO to LEO (400→450km, 3 min)</option>
                                <option value="orbital_intercept_2">MEO Intercept (600→800km, 4 min)</option>
                            </optgroup>
                            <optgroup label="Realistic Threats">
                                <option value="nudol_threat">Russian Nudol/PL-19 Scenario</option>
                                <option value="cosmos_rpo">Co-orbital RPO (Cosmos-2558)</option>
                            </optgroup>
                            ${this.renderSavedScenarioOptions()}
                            <option value="custom">CUSTOM LAUNCH - Configure your own ASAT</option>
                        </select>
                        
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 0, 0, 0.2);">
                            <label style="color: #0099ff; font-size: 13px;">
                                <input type="checkbox" id="enable-background" style="margin-right: 5px;">
                                Enable 15,000 background objects
                            </label>
                            <div style="color: #666; font-size: 11px; margin-top: 5px; margin-left: 20px;">
                                Includes conjunction analysis and Red Watch integration
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Standard content for other scenarios
        return `
            <h2>${data.title}</h2>
            <p class="scenario-description">${data.description}</p>
            
            <div class="scenario-details">
                <h3>What Will Happen:</h3>
                <ul>
                    ${data.details.map(detail => `<li>${detail}</li>`).join('')}
                </ul>
            </div>
            
            <div class="scenario-metrics">
                <h3>Key Metrics:</h3>
                <div class="metrics-grid">
                    ${Object.entries(data.metrics).map(([key, value]) => `
                        <div class="metric">
                            <span class="metric-label">${key}:</span>
                            <span class="metric-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    executeScenario(scenario) {
        console.log(`Executing scenario: ${scenario}`);
        
        // Don't handle ALOHA here - let it go through the switch statement below
        
        // Show confirmation that scenario is loading
        if (true) {
            // Reset simulation
            this.resetSimulation();
            
            // Apply scenario-specific settings
            switch(scenario) {
                case 'showcase':
                    this.applyShowcaseSettings();
                    break;
                case 'nominal':
                    this.applyNominalSettings();
                    break;
                case 'starlink':
                    this.applyStarlinkSettings();
                    break;
                case 'kessler':
                    this.applyKesslerSettings();
                    break;
                case 'aloha':
                    this.applyALOHASettings();
                    break;
                case 'asat':
                    this.applyASATSettings();
                    break;
                // Add more scenarios as needed
            }
            
            // Highlight selected tile
            document.querySelectorAll('.scenario-tile').forEach(t => t.classList.remove('selected'));
            document.querySelector(`[data-scenario="${scenario}"]`).classList.add('selected');
        }
    }

    applyShowcaseSettings() {
        // Beautiful math mode - random orbits
        document.getElementById('object-count').value = 15000;
        document.getElementById('object-count-value').textContent = '15,000';
        document.getElementById('collision-detection').checked = true;
        document.getElementById('debris-generation').checked = true;
        
        // Trigger scene reload with random orbits
        window.dispatchEvent(new CustomEvent('load-scenario', { 
            detail: { type: 'showcase', count: 15000 } 
        }));
    }

    applyNominalSettings() {
        // Clean space - no debris
        document.getElementById('object-count').value = 3000;
        document.getElementById('object-count-value').textContent = '3,000';
        document.getElementById('collision-detection').checked = false;
        document.getElementById('debris-generation').checked = false;
        
        window.dispatchEvent(new CustomEvent('load-scenario', { 
            detail: { type: 'nominal', count: 3000 } 
        }));
    }

    applyStarlinkSettings() {
        document.getElementById('object-count').value = 5000;
        document.getElementById('object-count-value').textContent = '5,000';
        
        window.dispatchEvent(new CustomEvent('load-scenario', { 
            detail: { type: 'starlink', count: 5000 } 
        }));
    }

    applyKesslerSettings() {
        document.getElementById('collision-detection').checked = true;
        document.getElementById('debris-generation').checked = true;
        document.getElementById('debris-multiplier').value = 2;
        document.getElementById('debris-multiplier-value').textContent = '2.0x';
        
        window.dispatchEvent(new CustomEvent('load-scenario', { 
            detail: { type: 'kessler' } 
        }));
    }

    applyALOHASettings() {
        // Show upload dialog for ALOHA trajectories
        this.showALOHAUploadDialog();
    }
    
    showALOHAUploadDialog() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'aloha-upload-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; border: 2px solid #ff0000; border-radius: 10px; padding: 30px; max-width: 600px;">
                <h2 style="color: #ff0000; margin-top: 0;">Load ALOHA Trajectory</h2>
                <p style="color: #ccc;">Upload a JSON trajectory file or select an example dataset</p>
                
                <!-- File Upload -->
                <div style="margin: 20px 0;">
                    <input type="file" id="aloha-file-input" accept=".json" style="display: none;">
                    <button id="aloha-upload-btn" style="
                        background: #ff0000;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        width: 100%;
                    ">📁 Choose JSON File</button>
                </div>
                
                <div style="color: #888; text-align: center; margin: 15px 0;">— OR —</div>
                
                <!-- Example Files -->
                <div style="margin: 20px 0;">
                    <h4 style="color: #ff6600; margin-bottom: 10px;">Example Datasets:</h4>
                    <div style="display: grid; gap: 10px;">
                        <button class="aloha-example-btn" data-file="aloha" style="
                            background: rgba(255, 0, 0, 0.2);
                            color: white;
                            border: 1px solid #ff0000;
                            padding: 10px;
                            border-radius: 5px;
                            cursor: pointer;
                            text-align: left;
                        ">
                            <strong>ALOHA ASAT</strong><br>
                            <small style="color: #999;">Saudi Arabia • 398km apogee • 206s duration</small>
                        </button>
                        <button class="aloha-example-btn" data-file="ascent_traj" style="
                            background: rgba(0, 255, 0, 0.2);
                            color: white;
                            border: 1px solid #00ff00;
                            padding: 10px;
                            border-radius: 5px;
                            cursor: pointer;
                            text-align: left;
                        ">
                            <strong>Ascent Trajectory</strong><br>
                            <small style="color: #999;">New Zealand Launch • Orbital insertion</small>
                        </button>
                        <button class="aloha-example-btn" data-file="traj_0" style="
                            background: rgba(0, 100, 255, 0.2);
                            color: white;
                            border: 1px solid #0066ff;
                            padding: 10px;
                            border-radius: 5px;
                            cursor: pointer;
                            text-align: left;
                        ">
                            <strong>Test Trajectory</strong><br>
                            <small style="color: #999;">Sample dataset • 206s duration</small>
                        </button>
                    </div>
                </div>
                
                <!-- Options -->
                <div style="background: rgba(0, 0, 0, 0.5); padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px; color: #ccc;">
                        <input type="checkbox" id="aloha-conjunctions" checked> Show Conjunction Analysis
                    </label>
                    <label style="display: block; margin-bottom: 10px; color: #ccc;">
                        Background Objects:
                        <select id="aloha-bg-objects" style="background: #222; color: white; border: 1px solid #444; padding: 5px; margin-left: 10px;">
                            <option value="0">None (Trajectory Only)</option>
                            <option value="1000">1,000 Objects</option>
                            <option value="5000" selected>5,000 Objects</option>
                            <option value="10000">10,000 Objects</option>
                        </select>
                    </label>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button id="aloha-cancel-btn" style="
                        flex: 1;
                        background: #444;
                        color: white;
                        border: 1px solid #666;
                        padding: 10px;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // File upload handler
        const fileInput = document.getElementById('aloha-file-input');
        const uploadBtn = document.getElementById('aloha-upload-btn');
        
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    this.loadALOHATrajectory(data);
                    modal.remove();
                } catch (error) {
                    console.error('Error loading file:', error);
                    this.showNotification('Invalid JSON file', 'error');
                }
            }
        });
        
        // Example dataset handlers
        const exampleBtns = modal.querySelectorAll('.aloha-example-btn');
        exampleBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const fileName = btn.dataset.file;
                try {
                    const response = await fetch(`/data/${fileName}.json`);
                    const data = await response.json();
                    this.loadALOHATrajectory(data);
                    modal.remove();
                } catch (error) {
                    console.error('Error loading example:', error);
                    this.showNotification('Failed to load example dataset', 'error');
                }
            });
        });
        
        // Cancel button
        document.getElementById('aloha-cancel-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    loadALOHATrajectory(data) {
        const bgObjects = parseInt(document.getElementById('aloha-bg-objects')?.value || '5000');
        const showConjunctions = document.getElementById('aloha-conjunctions')?.checked !== false;
        
        this.launchALOHA({
            data: data,
            backgroundObjects: bgObjects,
            showConjunctions: showConjunctions,
            autoTarget: true,
            playbackSpeed: 1
        });
        
        this.close(); // Close engineering panel
    }

    applyASATSettings() {
        window.dispatchEvent(new CustomEvent('load-scenario', { 
            detail: { type: 'asat', targetId: 'SAT-001' } 
        }));
    }

    resetSimulation() {
        console.log('Resetting simulation...');
        // This will be connected to the actual simulation reset
        window.dispatchEvent(new CustomEvent('reset-simulation'));
    }

    testConnection() {
        const statusEl = document.getElementById('ws-status');
        const statusText = statusEl.querySelector('.status-text');
        
        statusEl.className = 'status-indicator connecting';
        statusText.textContent = 'Testing...';
        
        const testWs = new WebSocket(this.wsUrl);
        
        testWs.onopen = () => {
            statusEl.className = 'status-indicator connected';
            statusText.textContent = 'Connection Successful';
            testWs.close();
            
            setTimeout(() => {
                statusEl.className = 'status-indicator disconnected';
                statusText.textContent = 'Disconnected';
            }, 3000);
        };
        
        testWs.onerror = () => {
            statusEl.className = 'status-indicator error';
            statusText.textContent = 'Connection Failed';
        };
    }

    startStreaming() {
        if (this.isStreaming) return;
        
        const statusEl = document.getElementById('ws-status');
        const statusText = statusEl.querySelector('.status-text');
        const startBtn = document.getElementById('start-streaming');
        const stopBtn = document.getElementById('stop-streaming');
        
        // Update UI
        statusEl.className = 'status-indicator connecting';
        statusText.textContent = 'Connecting...';
        
        // Create WebSocket connection
        this.wsConnection = new WebSocket(this.wsUrl);
        
        this.wsConnection.onopen = () => {
            this.isStreaming = true;
            statusEl.className = 'status-indicator connected';
            statusText.textContent = 'Streaming';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            
            // Start streaming telemetry data
            this.startDataStream();
        };
        
        this.wsConnection.onerror = (error) => {
            console.error('WebSocket error:', error);
            statusEl.className = 'status-indicator error';
            statusText.textContent = 'Connection Error';
            this.stopStreaming();
        };
        
        this.wsConnection.onclose = () => {
            this.stopStreaming();
        };
    }

    stopStreaming() {
        if (this.wsConnection) {
            this.wsConnection.close();
            this.wsConnection = null;
        }
        
        this.isStreaming = false;
        
        const statusEl = document.getElementById('ws-status');
        const statusText = statusEl.querySelector('.status-text');
        const startBtn = document.getElementById('start-streaming');
        const stopBtn = document.getElementById('stop-streaming');
        
        statusEl.className = 'status-indicator disconnected';
        statusText.textContent = 'Disconnected';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // Stop data stream
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }
    }

    startDataStream() {
        const rate = parseInt(document.getElementById('stream-rate').value);
        const interval = 1000 / rate;
        
        let messageCount = 0;
        let bytesSent = 0;
        const startTime = Date.now();
        
        this.streamInterval = setInterval(() => {
            if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
                const data = this.collectTelemetryData();
                const message = JSON.stringify(data);
                
                this.wsConnection.send(message);
                
                messageCount++;
                bytesSent += message.length;
                
                // Update stats
                document.getElementById('msg-sent').textContent = messageCount.toLocaleString();
                document.getElementById('data-rate').textContent = `${(bytesSent / 1024).toFixed(1)} KB/s`;
                
                const uptime = Date.now() - startTime;
                const hours = Math.floor(uptime / 3600000);
                const minutes = Math.floor((uptime % 3600000) / 60000);
                const seconds = Math.floor((uptime % 60000) / 1000);
                document.getElementById('stream-uptime').textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, interval);
    }

    collectTelemetryData() {
        // Collect current simulation data
        // This will be connected to the actual simulation
        return {
            timestamp: new Date().toISOString(),
            data: {
                objects: [] // Will be populated from simulation
            }
        };
    }

    updatePerformanceStats() {
        // These will be connected to actual performance metrics
        // For now, using placeholder values
        const stats = {
            fps: 60,
            physicsFps: 240,
            objects: 15000,
            memory: 2.4
        };
        
        document.getElementById('fps').textContent = `${stats.fps} FPS`;
        document.getElementById('physics-fps').textContent = `${stats.physicsFps} Hz`;
        document.getElementById('total-objects').textContent = stats.objects.toLocaleString();
        document.getElementById('memory-usage').textContent = `${stats.memory.toFixed(1)} GB`;
    }

    open() {
        this.isOpen = true;
        this.panel.classList.remove('closed');
        this.panel.classList.add('open');
    }

    close() {
        this.isOpen = false;
        this.panel.classList.remove('open');
        this.panel.classList.add('closed');
    }
}

// Initialize on load
export function initEngineeringPanel() {
    return new EngineeringPanel();
}