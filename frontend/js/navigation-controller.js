/**
 * Navigation Controller for Red Orbit
 * Manages the left navigation sidebar and content switching
 */

export function initNavigationController() {
    const navSidebar = document.getElementById('nav-sidebar');
    const mainContent = document.getElementById('main-content');
    const collapseBtn = document.getElementById('nav-collapse-btn');
    const dashboard = document.getElementById('red-orbit-dashboard');
    
    // Debug logging
    console.log('[Navigation] Initializing navigation controller');
    console.log('[Navigation] Collapse button found:', !!collapseBtn);
    console.log('[Navigation] Nav sidebar found:', !!navSidebar);
    console.log('[Navigation] Main content found:', !!mainContent);
    
    let isFullscreen = false;
    
    // Create and expose navigation controller for other modules
    window.navigationController = {
        updateKesslerStatus: updateKesslerStatus
    };
    
    // Navigation items configuration with SVG paths
    const navItems = [
        { id: 'mission-control', iconPath: 'assets/earth.svg', label: 'Mission Control', color: '#ff0000' },
        { id: 'kessler', iconPath: 'assets/3d.svg', label: 'Kessler Syndrome', color: '#ff6600' },
        { id: 'solar', iconPath: 'assets/sun.svg', label: 'Solar Storm', color: '#ffc800' },
        { id: 'launch', iconPath: 'assets/rocket.svg', label: 'Unexpected Launch', color: '#00ff00' },
        { id: 'telemetry', iconPath: 'assets/telem.svg', label: 'Telemetry', color: '#00ccff' },
        { id: 'reports', iconPath: 'assets/3d.svg', label: 'Reports', color: '#9966ff' },
        { id: 'settings', iconPath: 'assets/support.svg', label: 'Settings', color: '#666666' }
    ];
    
    // Fullscreen functionality removed since button is gone
    
    // Initialize collapse/expand functionality
    if (collapseBtn && navSidebar && mainContent) {
        collapseBtn.addEventListener('click', () => {
            const isCollapsed = navSidebar.classList.contains('collapsed');
            if (isCollapsed) {
                // Expand
                navSidebar.classList.remove('collapsed');
                navSidebar.style.width = '280px';
                navSidebar.style.overflow = 'hidden';
                mainContent.style.left = '280px';
                
                // Show labels and headers
                document.querySelectorAll('.nav-label').forEach(label => {
                    label.style.display = '';
                    label.style.opacity = '1';
                });
                document.querySelectorAll('.nav-section-header').forEach(header => {
                    header.style.display = 'block';
                    header.style.opacity = '1';
                });
                
                // Show expand icons
                document.querySelectorAll('.expand-icon').forEach(icon => {
                    icon.style.display = '';
                });
                
                // Adjust user profile
                const userProfile = document.querySelector('.user-profile');
                if (userProfile) {
                    userProfile.style.padding = '20px';
                    userProfile.style.justifyContent = 'flex-start';
                    const userName = userProfile.querySelector('.nav-label');
                    if (userName) userName.style.display = 'block';
                }
                
                // Adjust nav items and sub-items
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.style.padding = '12px 20px';
                    item.style.justifyContent = 'flex-start';
                });
                document.querySelectorAll('.nav-subitem').forEach(item => {
                    item.style.padding = '10px 20px 10px 45px';
                    item.style.justifyContent = 'flex-start';
                });
                
                collapseBtn.innerHTML = '◀';
                collapseBtn.style.left = '280px';
            } else {
                // Collapse
                navSidebar.classList.add('collapsed');
                navSidebar.style.width = '70px';
                navSidebar.style.overflow = 'visible'; // Allow tooltips
                mainContent.style.left = '70px';
                
                // Hide labels with animation
                document.querySelectorAll('.nav-label').forEach(label => {
                    label.style.display = 'none';
                    label.style.opacity = '0';
                });
                document.querySelectorAll('.nav-section-header').forEach(header => {
                    header.style.display = 'none';
                    header.style.opacity = '0';
                });
                
                // Hide expand icons
                document.querySelectorAll('.expand-icon').forEach(icon => {
                    icon.style.display = 'none';
                });
                
                // Hide sub-items completely in collapsed state
                document.querySelectorAll('.nav-subitems').forEach(subitems => {
                    subitems.style.display = 'none';
                });
                
                // Center user profile avatar only
                const userProfile = document.querySelector('.user-profile');
                if (userProfile) {
                    userProfile.style.padding = '15px 10px';
                    userProfile.style.justifyContent = 'center';
                    const userName = userProfile.querySelector('.nav-label');
                    if (userName) userName.style.display = 'none';
                }
                
                // Center nav item icons
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.style.padding = '12px 0';
                    item.style.justifyContent = 'center';
                });
                
                // Hide sub-items
                document.querySelectorAll('.nav-subitem').forEach(item => {
                    item.style.display = 'none';
                });
                
                collapseBtn.innerHTML = '▶';
                collapseBtn.style.left = '70px';
            }
        });
    }
    
    // Handle UNCLASSIFIED banner
    const banner = document.getElementById('unclass-banner');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const isVisible = banner.style.display !== 'none';
                const offset = isVisible ? '30px' : '0';
                
                if (topHeader) topHeader.style.top = offset;
                if (navSidebar) navSidebar.style.top = isVisible ? '80px' : '50px';
                if (mainContent) mainContent.style.top = isVisible ? '80px' : '50px';
            }
        });
    });
    
    if (banner) {
        observer.observe(banner, { attributes: true });
    }
    
    // Initialize navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Handle expandable items (Mission Control)
            if (item.classList.contains('expandable')) {
                const subitems = item.nextElementSibling;
                const expandIcon = item.querySelector('.expand-icon');
                
                if (subitems && subitems.classList.contains('nav-subitems')) {
                    const isExpanded = subitems.style.maxHeight && subitems.style.maxHeight !== '0px';
                    
                    if (isExpanded) {
                        subitems.style.maxHeight = '0px';
                        if (expandIcon) expandIcon.style.transform = 'rotate(-90deg)';
                    } else {
                        subitems.style.maxHeight = '500px';
                        if (expandIcon) expandIcon.style.transform = 'rotate(0deg)';
                    }
                }
                
                // Don't process further for expandable items
                return;
            }
            
            // Remove active from all items
            document.querySelectorAll('.nav-item, .nav-subitem').forEach(i => {
                i.classList.remove('active');
                i.style.borderLeft = '3px solid transparent';
            });
            
            // Add active to clicked item
            item.classList.add('active');
            item.style.borderLeft = '3px solid #ff0000';
            
            // Load content based on selection
            const contentId = item.dataset.content;
            if (contentId) {
                loadContent(contentId);
            }
        });
    });
    
    // Initialize sub-navigation items
    document.querySelectorAll('.nav-subitem').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Remove active from all items
            document.querySelectorAll('.nav-item, .nav-subitem').forEach(i => {
                i.classList.remove('active');
                i.style.borderLeft = '3px solid transparent';
            });
            
            // Keep parent Mission Control highlighted
            const missionControl = document.querySelector('.nav-item[data-content="mission-control"]');
            if (missionControl) {
                missionControl.style.borderLeft = '3px solid #ff0000';
            }
            
            // Add active to clicked sub-item
            item.classList.add('active');
            item.style.borderLeft = '3px solid #00ccff';
            
            // Load content based on selection
            const contentId = item.dataset.content;
            if (contentId) {
                loadContent(contentId);
            }
        });
    });
    
    // Load default content
    loadContent('mission-control');
}

function loadContent(contentId) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    switch(contentId) {
        case 'configuration':
            loadConfiguration();
            break;
        case 'mission-control':
            loadMissionControl();
            break;
        case 'kessler':
            loadKesslerScenario();
            break;
        case 'solar':
            loadSolarScenario();
            break;
        case 'launch':
            loadLaunchScenario();
            break;
        case 'telemetry':
            loadTelemetry();
            break;
        case 'reports':
            loadReports();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

async function loadConfiguration() {
    const mainContent = document.getElementById('main-content');
    mainContent.style.pointerEvents = 'auto'; // Enable interaction with config panel
    
    // Load the configuration template
    try {
        const response = await fetch('/templates/simulation-config.html');
        const html = await response.text();
        mainContent.innerHTML = html;
        
        // Initialize the configuration module
        const { simulationConfig } = await import('./ui/simulation-config.js');
        simulationConfig.initialize();
        
        console.log('Configuration panel loaded');
    } catch (error) {
        console.error('Failed to load configuration panel:', error);
        mainContent.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff0000; text-align: center;">
                <h3>Failed to load configuration panel</h3>
                <p style="color: #999;">${error.message}</p>
            </div>
        `;
    }
}

function loadMissionControl() {
    const mainContent = document.getElementById('main-content');
    mainContent.style.pointerEvents = 'none'; // Allow camera control through the content area
    
    // Create conjunction analysis panels for nominal state monitoring
    mainContent.innerHTML = `
        <!-- Conjunction Analysis Panel - MOVED TO BOTTOM RIGHT -->
        <div id="conjunction-analysis" style="position: absolute; bottom: 20px; right: 20px; width: 350px; background: rgba(0,0,0,0.95); border: 2px solid #00ccff; border-radius: 10px; padding: 20px; backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(0,200,255,0.3); pointer-events: auto;">
            <h3 style="color: #00ccff; font-size: 14px; margin-bottom: 15px; font-family: 'Orbitron', monospace; text-transform: uppercase; letter-spacing: 2px;">Conjunction Analysis</h3>
            
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(0,200,255,0.05); border-radius: 6px; border: 1px solid rgba(0,200,255,0.2);">
                <div style="color: #00ccff; font-size: 11px; margin-bottom: 8px;">SCAN STATUS</div>
                <div id="scan-status" style="color: #999; font-size: 10px;">Analyzing orbital paths...</div>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button id="refresh-conjunctions" style="flex: 1; padding: 6px 12px; background: linear-gradient(135deg, #0099cc, #00ccff); border: none; border-radius: 4px; color: white; font-size: 10px; cursor: pointer; font-family: 'Orbitron', monospace;">REFRESH SCAN</button>
                    <button id="save-analysis" style="padding: 6px 12px; background: rgba(0,200,255,0.2); border: 1px solid rgba(0,200,255,0.4); border-radius: 4px; color: #00ccff; font-size: 10px; cursor: pointer; font-family: 'Orbitron', monospace; text-transform: uppercase; letter-spacing: 1px;">Save</button>
                    <button id="export-history" style="padding: 6px 12px; background: rgba(0,200,255,0.2); border: 1px solid rgba(0,200,255,0.4); border-radius: 4px; color: #00ccff; font-size: 10px; cursor: pointer; font-family: 'Orbitron', monospace; text-transform: uppercase; letter-spacing: 1px;">Export</button>
                </div>
            </div>
            
            <div id="conjunction-list" style="max-height: 250px; overflow-y: auto;">
                <div style="color: #666; font-size: 10px; text-align: center; padding: 20px;">No imminent conjunctions detected</div>
            </div>
        </div>
        
        <!-- Near Miss Alert Panel - STAYS TOP RIGHT BUT SMALLER -->
        <div id="near-miss-panel" style="position: absolute; top: 20px; right: 20px; width: 300px; background: rgba(255,200,0,0.9); border: 2px solid #ffc800; border-radius: 10px; padding: 20px; backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(255,200,0,0.3); pointer-events: auto; display: none;">
            <h3 style="color: #ffc800; font-size: 14px; margin-bottom: 15px; font-family: 'Orbitron', monospace; text-transform: uppercase; letter-spacing: 2px;">Near Miss Alert</h3>
            
            <div id="near-miss-details" style="color: white; font-size: 11px;">
                <!-- Near miss details will be populated here -->
            </div>
        </div>
        
        <!-- Orbital Legend (Toggle with L key) -->
        <div id="orbital-legend" style="position: absolute; bottom: 180px; left: 20px; width: 250px; background: rgba(0,0,0,0.95); border: 2px solid #666; border-radius: 10px; padding: 15px; backdrop-filter: blur(10px); pointer-events: auto; display: none;">
            <div style="color: #999; font-size: 11px; margin-bottom: 10px; text-transform: uppercase;">Orbital Zones (Press L to toggle)</div>
            <div style="font-size: 10px; line-height: 1.8;">
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; background: #00ff00; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #ccc;">LEO (200-2000 km) - Satellites</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; background: rgba(255,100,0,0.2); border: 1px solid #ff6600; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #ff6600;">Inner Van Allen Belt (1,000-6,000 km)</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; background: rgba(0,255,0,0.1); border: 1px solid #00ff00; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #00ff00;">Slot Region (6,000-13,000 km) - Safe Zone</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; background: #ffff00; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #ccc;">MEO (20,000 km) - GPS/GLONASS</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; background: rgba(255,0,255,0.2); border: 1px solid #ff00ff; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #ff00ff;">Outer Van Allen Belt (13,000-60,000 km)</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; background: #00ccff; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #ccc;">GEO (35,786 km) - Clarke Belt</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; background: #ff00ff; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #ccc;">HEO - Molniya/Tundra orbits</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="width: 12px; height: 12px; background: #ff6600; border-radius: 2px; margin-right: 8px;"></div>
                    <span style="color: #ccc;">Debris - Space junk</span>
                </div>
            </div>
        </div>
        
        <!-- Statistics Panel -->
        <div id="nominal-stats" style="position: absolute; bottom: 20px; left: 20px; width: 250px; background: rgba(0,0,0,0.95); border: 2px solid #666; border-radius: 10px; padding: 15px; backdrop-filter: blur(10px); pointer-events: auto;">
            <div style="color: #999; font-size: 11px; margin-bottom: 10px; text-transform: uppercase;">Nominal State Metrics</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <div style="color: #666; font-size: 9px;">Active Objects</div>
                    <div id="active-count" style="color: #00ff00; font-size: 14px; font-family: 'Orbitron', monospace;">--</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 9px;">Debris Count</div>
                    <div id="debris-count" style="color: #ff6600; font-size: 14px; font-family: 'Orbitron', monospace;">0</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 9px;">Conjunctions/Hr</div>
                    <div id="conjunction-rate" style="color: #ffc800; font-size: 14px; font-family: 'Orbitron', monospace;">--</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 9px;">Risk Level</div>
                    <div id="risk-level" style="color: #00ff00; font-size: 14px; font-family: 'Orbitron', monospace;">LOW</div>
                </div>
            </div>
        </div>
    `;
    
    // Set up conjunction monitoring
    startConjunctionMonitoring();
    
    // Update header stats to show mission control is active
    const statusElement = document.querySelector('#mission-stats div:last-child div:last-child');
    if (statusElement) {
        statusElement.textContent = 'MONITORING';
        statusElement.style.color = '#00ff00';
    }
}

function loadKesslerScenario() {
    const mainContent = document.getElementById('main-content');
    mainContent.style.pointerEvents = 'none'; // Allow camera control
    
    // Get status from advanced Kessler system
    const kesslerStatus = window.advancedKessler?.getStatus() || { 
        threatLevel: 'NOMINAL',
        activeAnomalies: 0,
        predictedCollisions: 0,
        cascadeMetrics: {
            totalCollisions: 0,
            debrisGenerated: 0,
            cascadeLevel: 0
        }
    };
    
    mainContent.innerHTML = `
        <div style="position: absolute; bottom: 20px; right: 20px; width: 400px; background: rgba(0,0,0,0.95); border: 2px solid #ff0000; border-radius: 10px; padding: 20px; backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(255,0,0,0.5); pointer-events: auto;">
            <h3 style="color: #ff0000; font-size: 16px; margin-bottom: 20px; font-family: 'Orbitron', monospace; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Kessler Cascade Control</h3>
            
            <div id="kessler-status" style="margin-bottom: 20px; padding: 15px; background: rgba(255,100,0,0.1); border-radius: 6px; border: 1px solid rgba(255,100,0,0.3);">
                <div style="color: #ff6600; font-size: 12px; margin-bottom: 10px;">STATUS: <span id="status-message" style="color: ${kesslerStatus.active ? '#ff0000' : '#00ff00'}">${kesslerStatus.message || 'System Stable'}</span></div>
                
                <!-- Collision Data Display -->
                <div id="collision-data" style="display: none; margin-top: 10px; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 4px; border: 1px solid rgba(255,0,0,0.3);">
                    <div style="color: #ff0000; font-size: 11px; margin-bottom: 8px; text-transform: uppercase; animation: pulse 1s infinite;">IMPACT IMMINENT</div>
                    <div style="color: #999; font-size: 10px; margin-bottom: 4px;">Targets: <span id="collision-targets" style="color: #ff6600"></span></div>
                    <div style="color: #999; font-size: 10px; margin-bottom: 4px;">Distance: <span id="collision-distance" style="color: #ff6600"></span> km</div>
                    <div style="color: #999; font-size: 10px; margin-bottom: 4px;">Impact Velocity: <span id="collision-velocity" style="color: #ff6600"></span> km/s</div>
                    <div style="color: #999; font-size: 10px; font-weight: bold;">Time to Impact: <span id="collision-timer" style="color: #ff0000; font-size: 12px;"></span> seconds</div>
                </div>
                
                <div style="display: ${kesslerStatus.active ? 'block' : 'none'}">
                    <div style="color: #999; font-size: 11px; margin-bottom: 5px;">Collisions: <span id="collision-count" style="color: #ff6600">${kesslerStatus.collisionCount || 0}</span></div>
                    <div style="color: #999; font-size: 11px; margin-bottom: 5px;">Cascade Level: <span id="cascade-level" style="color: #ff6600">${kesslerStatus.cascadeLevel || 0}</span></div>
                    <div style="color: #999; font-size: 11px;">Debris Generated: <span id="debris-generated" style="color: #ff6600">${kesslerStatus.debrisGenerated || 0}</span></div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <div style="color: #999; font-size: 11px; margin-bottom: 10px;">SIMULATION PARAMETERS</div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">Initial Impact Velocity</label>
                    <div style="color: #ff6600; font-size: 10px; margin-top: 5px;">7.5 km/s (Realistic orbital collision)</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">Debris Model</label>
                    <div style="color: #ff6600; font-size: 10px; margin-top: 5px;">NASA Standard Breakup Model</div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="color: #999; font-size: 11px; margin-bottom: 10px; text-transform: uppercase;">Disaster Scenarios</div>
                
                <select id="scenario-selector" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,100,0,0.3); color: #ff6600; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 11px; font-family: 'Orbitron', monospace;">
                    <option value="random">RANDOM CASCADE - Two Random Satellites</option>
                    <option value="polar">POLAR IMPACT - Head-on Collision</option>
                    <option value="retrograde">RETROGRADE STRIKE - 30 km/s Impact</option>
                    <option value="starlink">STARLINK NIGHTMARE - LEO Constellation Hit</option>
                    <option value="gps">GPS DESTRUCTION - MEO Chain Reaction</option>
                    <option value="geo">GEO GRAVEYARD - High Altitude Cascade</option>
                    <option value="multi">MULTI-ALTITUDE - Cascading Across Orbits</option>
                    <option value="asat">ASAT STRIKE - Military Weapon Test</option>
                </select>
                
                <button id="trigger-scenario" style="width: 100%; background: ${kesslerStatus.active ? 'rgba(100,100,100,0.5)' : 'linear-gradient(135deg, #ff6600, #ff3300)'}; border: none; color: white; padding: 12px; border-radius: 6px; cursor: ${kesslerStatus.active ? 'not-allowed' : 'pointer'}; font-weight: bold; font-size: 12px; font-family: 'Orbitron', monospace; text-transform: uppercase;" ${kesslerStatus.active ? 'disabled' : ''}>
                    ${kesslerStatus.active ? 'CASCADE IN PROGRESS' : 'TRIGGER SCENARIO'}
                </button>
            </div>
            
            <!-- Scenario Details -->
            <div id="scenario-details" style="margin-bottom: 15px; padding: 15px; background: rgba(255,100,0,0.05); border-radius: 6px; border: 1px solid rgba(255,100,0,0.2);">
                <div style="color: #ff6600; font-size: 10px; margin-bottom: 8px; text-transform: uppercase;">Scenario Parameters</div>
                <div id="scenario-description" style="color: #999; font-size: 9px; line-height: 1.4;">
                    Select a disaster scenario above to see details
                </div>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: rgba(255,100,0,0.05); border-radius: 6px;">
                <div style="color: #ff6600; font-size: 10px; margin-bottom: 5px; text-transform: uppercase;">Warning</div>
                <div style="color: #999; font-size: 9px; line-height: 1.4;">
                    Initiating Kessler Syndrome will trigger a cascading collision event that will progressively destroy satellites and generate debris clouds. This simulates a real space disaster scenario.
                </div>
            </div>
        </div>
        
        <!-- Cascade visualization overlay -->
        <div id="cascade-overlay" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); display: ${kesslerStatus.active ? 'block' : 'none'}; background: rgba(255,0,0,0.1); border: 2px solid rgba(255,0,0,0.5); border-radius: 8px; padding: 15px; min-width: 300px; text-align: center; pointer-events: none;">
            <div style="color: #ff0000; font-size: 14px; font-weight: bold; font-family: 'Orbitron', monospace; animation: pulse 1s infinite; text-transform: uppercase; letter-spacing: 2px;">
                Kessler Cascade Active
            </div>
            <div id="cascade-message" style="color: #ff6600; font-size: 12px; margin-top: 10px;">${kesslerStatus.message || ''}</div>
        </div>
        
        <!-- Conjunction Warning Panel -->
        <div id="conjunction-panel" style="position: absolute; top: 20px; right: 20px; width: 250px; background: rgba(255,100,0,0.9); border: 2px solid #ff6600; border-radius: 8px; padding: 15px; display: none; pointer-events: none;">
            <div style="color: #ff6600; font-size: 12px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">Conjunction Warning</div>
            <div id="conjunction-list" style="color: #fff; font-size: 10px;"></div>
        </div>
        
        <!-- Collision Countdown Panel -->
        <div id="countdown-panel" style="position: absolute; top: 100px; right: 20px; width: 250px; background: rgba(255,0,0,0.9); border: 2px solid #ff0000; border-radius: 8px; padding: 15px; display: none; pointer-events: none;">
            <div style="color: #ff0000; font-size: 12px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; animation: pulse 1s infinite;">Impact Countdown</div>
            <div style="color: #fff; font-size: 24px; text-align: center; font-family: 'Orbitron', monospace;">
                <span id="impact-timer">--</span>s
            </div>
            <div style="color: #ff6600; font-size: 10px; margin-top: 10px;">
                Objects: <span id="impact-objects">--</span><br>
                Velocity: <span id="impact-velocity">--</span> km/s
            </div>
        </div>
    `;
    
    // Set up event listeners
    setupKesslerControls();
    
    // Start updating status if Kessler is active
    if (kesslerStatus.active) {
        startKesslerStatusUpdates();
    }
}

function loadSettings() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-header">
            <h2 style="color: #666; font-family: 'Orbitron', monospace; margin: 0;">SETTINGS</h2>
            <p style="color: #999; margin-top: 10px;">System configuration and preferences</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
            <div style="background: rgba(0,0,0,0.5); padding: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #999; margin-bottom: 20px;">Display Settings</h3>
                <div style="margin-bottom: 20px;">
                    <label style="color: #999; font-size: 12px;">
                        <input type="checkbox" id="show-unclass-banner"> Show UNCLASSIFIED Banner
                    </label>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: #999; font-size: 12px;">
                        <input type="checkbox" id="show-orbit-paths"> Show Orbit Paths
                    </label>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: #999; font-size: 12px;">
                        <input type="checkbox" id="show-labels" checked> Show Satellite Labels
                    </label>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: #999; font-size: 12px;">
                        <input type="checkbox" id="show-ground-stations" checked> Show Ground Stations
                    </label>
                </div>
            </div>
            <div style="background: rgba(0,0,0,0.5); padding: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #999; margin-bottom: 20px;">Performance</h3>
                <div style="margin-bottom: 20px;">
                    <label style="color: #999; font-size: 12px;">Quality Preset</label>
                    <select style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px; margin-top: 5px;">
                        <option>Low (Better Performance)</option>
                        <option selected>Medium (Balanced)</option>
                        <option>High (Best Quality)</option>
                        <option>Ultra (Maximum Quality)</option>
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: #999; font-size: 12px;">
                        <input type="checkbox" id="enable-shadows"> Enable Shadows
                    </label>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: #999; font-size: 12px;">
                        <input type="checkbox" id="enable-bloom" checked> Enable Bloom Effects
                    </label>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for banner toggle
    const bannerToggle = document.getElementById('show-unclass-banner');
    if (bannerToggle) {
        bannerToggle.addEventListener('change', (e) => {
            const banner = document.getElementById('unclass-banner');
            if (banner) {
                banner.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
}

function loadSolarScenario() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';
    mainContent.style.pointerEvents = 'none';
    
    // Update status
    const statusElement = document.querySelector('#mission-stats div:last-child div:last-child');
    if (statusElement) {
        statusElement.textContent = 'SOLAR STORM';
        statusElement.style.color = '#ffc800';
    }
}

function loadLaunchScenario() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';
    mainContent.style.pointerEvents = 'none';
    
    // Update status
    const statusElement = document.querySelector('#mission-stats div:last-child div:last-child');
    if (statusElement) {
        statusElement.textContent = 'LAUNCH ALERT';
        statusElement.style.color = '#00ff00';
    }
}

function loadTelemetry() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';
    mainContent.style.pointerEvents = 'none';
    
    // Update status
    const statusElement = document.querySelector('#mission-stats div:last-child div:last-child');
    if (statusElement) {
        statusElement.textContent = 'TELEMETRY';
        statusElement.style.color = '#00ccff';
    }
}

function loadReports() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';
    mainContent.style.pointerEvents = 'none';
    
    // Update status
    const statusElement = document.querySelector('#mission-stats div:last-child div:last-child');
    if (statusElement) {
        statusElement.textContent = 'REPORTS';
        statusElement.style.color = '#9966ff';
    }
}

let kesslerUpdateInterval = null;

// Function to update Kessler status from physics engine
function updateKesslerStatus(status) {
    if (!status) return;
    
    // Update status display
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        const messages = [
            'Initial Impact Detected',
            'Secondary Collisions Beginning',
            'Cascade Effect Accelerating',
            'Critical Mass Approaching',
            'FULL KESSLER CASCADE ACTIVE'
        ];
        const message = messages[Math.min(status.level, messages.length - 1)] || 'Monitoring...';
        statusMessage.textContent = message;
        statusMessage.style.color = status.level >= 3 ? '#ff0000' : '#ff6600';
    }
    
    // Update counters
    const collisionCount = document.getElementById('collision-count');
    if (collisionCount) collisionCount.textContent = status.collisions || 0;
    
    const cascadeLevel = document.getElementById('cascade-level');
    if (cascadeLevel) cascadeLevel.textContent = status.level || 0;
    
    const debrisGenerated = document.getElementById('debris-generated');
    if (debrisGenerated) debrisGenerated.textContent = status.debris || 0;
    
    // Update cascade message
    const cascadeMessage = document.getElementById('cascade-message');
    if (cascadeMessage) cascadeMessage.textContent = statusMessage ? statusMessage.textContent : '';
}

function startKesslerStatusUpdates() {
    // Clear any existing interval
    if (kesslerUpdateInterval) {
        clearInterval(kesslerUpdateInterval);
    }
    
    // Update every 500ms
    kesslerUpdateInterval = setInterval(() => {
        if (!window.redOrbitPhysics) return;
        
        const status = window.redOrbitPhysics.getKesslerStatus();
        
        // Update status display
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = status.message;
            statusMessage.style.color = status.criticalMass ? '#ff0000' : '#ff6600';
        }
        
        // Update counters
        const collisionCount = document.getElementById('collision-count');
        if (collisionCount) collisionCount.textContent = status.collisionCount;
        
        const cascadeLevel = document.getElementById('cascade-level');
        if (cascadeLevel) cascadeLevel.textContent = status.cascadeLevel;
        
        const debrisGenerated = document.getElementById('debris-generated');
        if (debrisGenerated) debrisGenerated.textContent = status.debrisGenerated;
        
        // Update cascade message
        const cascadeMessage = document.getElementById('cascade-message');
        if (cascadeMessage) cascadeMessage.textContent = status.message;
        
        // Stop updates if cascade is complete (very high level)
        if (status.cascadeLevel >= 10) {
            clearInterval(kesslerUpdateInterval);
            if (window.showNotification) {
                window.showNotification('KESSLER CASCADE COMPLETE - ORBIT UNUSABLE', 'error');
            }
        }
    }, 500);
}

function setupKesslerControls() {
    // Set up scenario controls
    const scenarioSelector = document.getElementById('scenario-selector');
    const scenarioDescription = document.getElementById('scenario-description');
    const triggerBtn = document.getElementById('trigger-scenario');
    
    // Scenario descriptions
    const scenarios = {
        random: {
            description: "Two random satellites collide at orbital velocity (~7.5 km/s). The most common type of space collision.",
            velocity: 7.5,
            count: 2
        },
        polar: {
            description: "Head-on collision between polar and equatorial orbits. Impact velocity: 15 km/s. Maximum debris generation.",
            velocity: 15,
            count: 2
        },
        retrograde: {
            description: "Retrograde satellite strikes prograde traffic. Combined velocity: 30 km/s. Catastrophic fragmentation.",
            velocity: 30,
            count: 1
        },
        starlink: {
            description: "Multiple impacts in LEO constellation at 550km altitude. Simulates constellation-wide cascade failure.",
            velocity: 10,
            count: 5
        },
        gps: {
            description: "MEO collision at 20,200km altitude. GPS satellites destroyed. Navigation services lost globally.",
            velocity: 3.9,
            count: 3
        },
        geo: {
            description: "GEO graveyard collision at 35,786km. Debris persists for millennia. Communications satellites at risk.",
            velocity: 3.1,
            count: 2
        },
        multi: {
            description: "Simultaneous collisions at multiple altitudes. LEO, MEO, and GEO all affected. Total orbital chaos.",
            velocity: 12,
            count: 8
        },
        asat: {
            description: "Anti-satellite weapon test. Deliberate destruction creates massive debris cloud. Based on real events.",
            velocity: 25,
            count: 1
        }
    };
    
    // Update description when scenario changes
    if (scenarioSelector) {
        scenarioSelector.addEventListener('change', (e) => {
            const scenario = scenarios[e.target.value];
            if (scenario && scenarioDescription) {
                scenarioDescription.innerHTML = `
                    ${scenario.description}<br><br>
                    <span style="color: #ff6600;">Impact Velocity:</span> ${scenario.velocity} km/s<br>
                    <span style="color: #ff6600;">Initial Collisions:</span> ${scenario.count}
                `;
            }
        });
        
        // Set initial description
        const initialScenario = scenarios[scenarioSelector.value];
        if (initialScenario && scenarioDescription) {
            scenarioDescription.innerHTML = `
                ${initialScenario.description}<br><br>
                <span style="color: #ff6600;">Impact Velocity:</span> ${initialScenario.velocity} km/s<br>
                <span style="color: #ff6600;">Initial Collisions:</span> ${initialScenario.count}
            `;
        }
    }
    
    // Set up trigger button
    if (triggerBtn) {
        triggerBtn.addEventListener('click', () => {
            const selectedScenario = scenarioSelector ? scenarioSelector.value : 'random';
            const scenario = scenarios[selectedScenario];
            
            // Trigger the scenario
            if (window.redOrbitPhysics && window.redOrbitPhysics.triggerScenario) {
                console.log(`[KESSLER] Triggering ${selectedScenario} scenario`);
                
                // Call physics engine with scenario parameters
                const result = window.redOrbitPhysics.triggerScenario(selectedScenario, scenario);
                
                if (result) {
                    // Show notification
                    if (window.showNotification) {
                        window.showNotification(`${selectedScenario.toUpperCase()} SCENARIO INITIATED!`, 'error');
                    }
                    
                    // Start status updates
                    startKesslerStatusUpdates();
                    
                    // Update button state
                    triggerBtn.disabled = true;
                    triggerBtn.textContent = 'CASCADE IN PROGRESS';
                    triggerBtn.style.background = 'rgba(100,100,100,0.5)';
                    triggerBtn.style.cursor = 'not-allowed';
                    
                    // Show overlay
                    const overlay = document.getElementById('cascade-overlay');
                    if (overlay) {
                        overlay.style.display = 'block';
                    }
                }
            } else if (window.redOrbitPhysics && window.redOrbitPhysics.triggerKesslerSyndrome) {
                // Fallback to basic trigger if scenario method doesn't exist
                window.redOrbitPhysics.triggerKesslerSyndrome().then(prediction => {
                
                if (prediction) {
                    // Display collision data in new panels
                    const countdownPanel = document.getElementById('countdown-panel');
                    if (countdownPanel) {
                        countdownPanel.style.display = 'block';
                        
                        // Update countdown panel
                        document.getElementById('impact-objects').textContent = `#${prediction.idx1} → #${prediction.idx2}`;
                        document.getElementById('impact-velocity').textContent = prediction.impactVelocity.toFixed(1);
                        
                        // Start countdown timer
                        let timeRemaining = prediction.timeToImpact;
                        const countdownInterval = setInterval(() => {
                            timeRemaining -= 0.1;
                            if (timeRemaining <= 0) {
                                clearInterval(countdownInterval);
                                document.getElementById('impact-timer').textContent = 'IMPACT';
                                
                                // Create explosion at impact location
                                if (window.gpuPhysicsEngine && window.gpuPhysicsEngine.createExplosion) {
                                    window.gpuPhysicsEngine.createExplosion(prediction.position);
                                }
                                
                                // Hide countdown after impact
                                setTimeout(() => {
                                    countdownPanel.style.display = 'none';
                                }, 3000);
                            } else {
                                document.getElementById('impact-timer').textContent = timeRemaining.toFixed(1);
                            }
                        }, 100);
                    }
                    
                    // Also update the embedded collision data
                    const collisionDataDiv = document.getElementById('collision-data');
                    if (collisionDataDiv) {
                        collisionDataDiv.style.display = 'block';
                        document.getElementById('collision-targets').textContent = `Object #${prediction.idx1} → Object #${prediction.idx2}`;
                        document.getElementById('collision-distance').textContent = prediction.distance.toFixed(0);
                        document.getElementById('collision-velocity').textContent = prediction.impactVelocity.toFixed(1);
                        document.getElementById('collision-timer').textContent = prediction.timeToImpact.toFixed(1);
                    }
                    
                    // Highlight collision objects
                    if (window.highlightCollisionTargets) {
                        window.highlightCollisionTargets(prediction.idx1, prediction.idx2);
                    }
                    
                    // Focus camera on collision point if possible
                    if (window.camera) {
                        const pos = prediction.position;
                        const babylonPos = new BABYLON.Vector3(
                            pos.x * (1/6371),
                            pos.y * (1/6371),
                            pos.z * (1/6371)
                        );
                        window.camera.setTarget(babylonPos);
                    }
                    
                    // Show notification
                    if (window.showNotification) {
                        window.showNotification(`${selectedScenario.toUpperCase()} CASCADE INITIATED!`, 'error');
                    }
                    
                    // Start status updates
                    startKesslerStatusUpdates();
                    
                    // Update button state
                    triggerBtn.disabled = true;
                    triggerBtn.textContent = 'CASCADE IN PROGRESS';
                    triggerBtn.style.background = 'rgba(100,100,100,0.5)';
                    triggerBtn.style.cursor = 'not-allowed';
                    
                    // Show overlay
                    const overlay = document.getElementById('cascade-overlay');
                    if (overlay) {
                        overlay.style.display = 'block';
                    }
                }
                });
            } else {
                console.error('Red Orbit Physics not initialized!');
                if (window.showNotification) {
                    window.showNotification('Physics system initializing, please wait...', 'warning');
                }
            }
        });
    }
}

// Import conjunction history
let conjunctionHistoryModule = null;

// Conjunction monitoring system for nominal state
async function startConjunctionMonitoring() {
    console.log('[CONJUNCTION] Starting conjunction analysis monitoring');
    
    // Load conjunction history module
    if (!conjunctionHistoryModule) {
        try {
            const module = await import('./ui/conjunction-history.js');
            conjunctionHistoryModule = module.conjunctionHistory;
        } catch (error) {
            console.warn('Failed to load conjunction history module:', error);
        }
    }
    
    // Update statistics
    const updateStats = () => {
        if (window.gpuPhysicsEngine) {
            // Get active object count from GPU physics
            const count = window.gpuPhysicsEngine.activeObjects || 0;
            const activeElement = document.getElementById('active-count');
            if (activeElement) activeElement.textContent = count.toLocaleString();
            
            // Calculate debris count based on configuration
            const debrisCount = window.gpuPhysicsEngine.debrisGenerated || 0;
            const debrisElement = document.getElementById('debris-count');
            if (debrisElement) debrisElement.textContent = debrisCount.toLocaleString();
            
            // Update risk level based on debris
            const riskLevel = document.getElementById('risk-level');
            if (riskLevel) {
                if (debrisCount > 1000) {
                    riskLevel.textContent = 'CRITICAL';
                    riskLevel.style.color = '#ff0000';
                } else if (debrisCount > 100) {
                    riskLevel.textContent = 'HIGH';
                    riskLevel.style.color = '#ff6600';
                } else if (debrisCount > 10) {
                    riskLevel.textContent = 'MODERATE';
                    riskLevel.style.color = '#ffc800';
                } else {
                    riskLevel.textContent = 'LOW';
                    riskLevel.style.color = '#00ff00';
                }
            }
        }
    };
    
    // Analyze conjunctions
    const analyzeConjunctions = async () => {
        const statusElement = document.getElementById('scan-status');
        if (!statusElement) return;
        
        if (!window.gpuPhysicsEngine || !window.gpuPhysicsEngine.analyzeConjunctions) {
            statusElement.textContent = 'GPU physics initializing...';
            return;
        }
        
        statusElement.textContent = 'Scanning for conjunctions...';
        
        try {
            // Get potential conjunctions from GPU physics
            const conjunctions = await window.gpuPhysicsEngine.analyzeConjunctions(300, 10); // 5 min horizon, 10km threshold
            
            const listElement = document.getElementById('conjunction-list');
            if (!listElement) return;
            
            if (conjunctions.length === 0) {
                // Show history if no active conjunctions
                let historyHTML = '<div style="color: #666; font-size: 10px; text-align: center; padding: 20px;">No imminent conjunctions detected</div>';
                
                if (conjunctionHistoryModule) {
                    const history = conjunctionHistoryModule.getHistory(5);
                    if (history.length > 0) {
                        historyHTML += '<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,200,255,0.2);">';
                        historyHTML += '<div style="color: #00ccff; font-size: 10px; margin-bottom: 10px;">Recent History:</div>';
                        history.forEach(h => {
                            const time = new Date(h.timestamp).toLocaleTimeString();
                            historyHTML += `<div style="color: #666; font-size: 9px; margin-bottom: 5px;">
                                ${time} - Objects ${h.object1}/${h.object2} - ${h.minDistance?.toFixed(2)}km
                            </div>`;
                        });
                        historyHTML += '</div>';
                    }
                }
                
                listElement.innerHTML = historyHTML;
                statusElement.textContent = 'Scan complete - All clear';
                const rateElement = document.getElementById('conjunction-rate');
                if (rateElement) rateElement.textContent = '0';
            } else {
                // Save conjunctions to history
                if (conjunctionHistoryModule) {
                    conjunctions.forEach(conj => {
                        conjunctionHistoryModule.addConjunction(conj);
                    });
                }
                
                // Display conjunctions
                let html = '';
                conjunctions.forEach((conj, idx) => {
                    const urgency = conj.timeToClosestApproach < 60 ? 'urgent' : 
                                  conj.timeToClosestApproach < 180 ? 'warning' : 'normal';
                    const color = urgency === 'urgent' ? '#ff0000' : 
                                urgency === 'warning' ? '#ffc800' : '#00ccff';
                    
                    html += `
                        <div style="margin-bottom: 10px; padding: 8px; background: rgba(0,200,255,0.05); border-radius: 4px; border: 1px solid ${color};">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: ${color}; font-size: 10px; font-weight: bold;">CONJUNCTION #${idx + 1}</span>
                                <span style="color: #999; font-size: 9px;">TCA: ${conj.timeToClosestApproach.toFixed(1)}s</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 9px;">
                                <div><span style="color: #666;">Objects:</span> <span style="color: #ccc;">${conj.object1}-${conj.object2}</span></div>
                                <div><span style="color: #666;">Distance:</span> <span style="color: #ccc;">${conj.minDistance.toFixed(2)} km</span></div>
                                <div><span style="color: #666;">Rel Vel:</span> <span style="color: #ccc;">${conj.relativeVelocity.toFixed(1)} km/s</span></div>
                                <div><span style="color: #666;">P(collision):</span> <span style="color: ${conj.probability > 0.5 ? '#ff0000' : '#ffc800'};">${(conj.probability * 100).toFixed(1)}%</span></div>
                            </div>
                        </div>
                    `;
                    
                    // Show near-miss alert for high probability events
                    if (conj.probability > 0.7 && conj.timeToClosestApproach < 60) {
                        showNearMissAlert(conj);
                    }
                });
                
                listElement.innerHTML = html;
                statusElement.textContent = `${conjunctions.length} potential conjunctions detected`;
                
                // Calculate conjunction rate (per hour)
                const rate = (conjunctions.length * 3600) / 300; // Scale to per hour
                const rateElement = document.getElementById('conjunction-rate');
                if (rateElement) rateElement.textContent = rate.toFixed(1);
            }
        } catch (error) {
            console.error('[CONJUNCTION] Analysis error:', error);
            statusElement.textContent = 'Analysis error';
        }
    };
    
    // Show near-miss alert
    const showNearMissAlert = (conjunction) => {
        const panel = document.getElementById('near-miss-panel');
        const details = document.getElementById('near-miss-details');
        
        if (panel && details) {
            details.innerHTML = `
                <div style="margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px;">
                    <div style="font-size: 12px; margin-bottom: 8px; color: #ffc800;">CRITICAL PROXIMITY WARNING</div>
                    <div style="font-size: 10px; line-height: 1.5;">
                        <div>Objects ${conjunction.object1} and ${conjunction.object2}</div>
                        <div>Time to approach: ${conjunction.timeToClosestApproach.toFixed(1)} seconds</div>
                        <div>Minimum distance: ${conjunction.minDistance.toFixed(2)} km</div>
                        <div>Collision probability: ${(conjunction.probability * 100).toFixed(1)}%</div>
                    </div>
                </div>
            `;
            
            panel.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                panel.style.display = 'none';
            }, 10000);
        }
    };
    
    // Set up refresh button
    const refreshBtn = document.getElementById('refresh-conjunctions');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            analyzeConjunctions();
        });
    }
    
    // Set up save button
    const saveBtn = document.getElementById('save-analysis');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (conjunctionHistoryModule) {
                conjunctionHistoryModule.saveAnalysisSnapshot();
                if (window.showNotification) {
                    window.showNotification('Analysis saved', 'success');
                }
            }
        });
    }
    
    // Set up export button
    const exportBtn = document.getElementById('export-history');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (conjunctionHistoryModule) {
                conjunctionHistoryModule.exportHistory();
                if (window.showNotification) {
                    window.showNotification('History exported', 'success');
                }
            }
        });
    }
    
    // Initial analysis
    setTimeout(analyzeConjunctions, 2000);
    
    // Update stats every second
    setInterval(updateStats, 1000);
    
    // Re-analyze every 30 seconds
    setInterval(analyzeConjunctions, 30000);
}

// Set up keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Toggle legend with L key
    if (event.key === 'l' || event.key === 'L') {
        const legend = document.getElementById('orbital-legend');
        if (legend) {
            legend.style.display = legend.style.display === 'none' ? 'block' : 'none';
        }
    }
});

// Initialization is handled by app.js, not auto-initialized here