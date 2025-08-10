/**
 * Navigation Controller for Red Orbit
 * Manages the left navigation sidebar and content switching
 */

export function initNavigationController() {
    const navSidebar = document.getElementById('nav-sidebar');
    const mainContent = document.getElementById('main-content');
    const collapseBtn = document.getElementById('nav-collapse-btn');
    const topHeader = document.getElementById('top-header');
    const dashboard = document.getElementById('red-orbit-dashboard');
    
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
                // Show labels
                document.querySelectorAll('.nav-label').forEach(label => {
                    label.style.display = '';
                });
                document.querySelectorAll('.nav-section-header').forEach(header => {
                    header.style.display = 'block';
                });
                // Adjust user profile
                const userProfile = document.querySelector('.user-profile');
                if (userProfile) {
                    userProfile.style.padding = '20px';
                    userProfile.style.justifyContent = 'flex-start';
                }
                // Adjust nav items
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.style.padding = '12px 20px';
                    item.style.justifyContent = 'flex-start';
                });
                collapseBtn.innerHTML = '◀';
                collapseBtn.style.left = '280px';
            } else {
                // Collapse
                navSidebar.classList.add('collapsed');
                navSidebar.style.width = '70px';
                navSidebar.style.overflow = 'hidden';
                mainContent.style.left = '70px';
                // Hide labels
                document.querySelectorAll('.nav-label').forEach(label => {
                    label.style.display = 'none';
                });
                document.querySelectorAll('.nav-section-header').forEach(header => {
                    header.style.display = 'none';
                });
                // Center user profile avatar
                const userProfile = document.querySelector('.user-profile');
                if (userProfile) {
                    userProfile.style.padding = '10px';
                    userProfile.style.justifyContent = 'center';
                }
                // Center nav item icons
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.style.padding = '12px 0';
                    item.style.justifyContent = 'center';
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
        item.addEventListener('click', () => {
            // Remove active from all items
            document.querySelectorAll('.nav-item').forEach(i => {
                i.classList.remove('active');
                i.style.borderLeft = '3px solid transparent';
            });
            
            // Add active to clicked item
            item.classList.add('active');
            item.style.borderLeft = '3px solid #ff0000';
            
            // Load content based on selection
            const contentId = item.dataset.content;
            loadContent(contentId);
        });
    });
    
    // Load default content
    loadContent('mission-control');
}

function loadContent(contentId) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    switch(contentId) {
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

function loadMissionControl() {
    const mainContent = document.getElementById('main-content');
    // Clear the main content area to allow Earth interaction
    mainContent.innerHTML = '';
    mainContent.style.pointerEvents = 'none';
    
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
            
            <button id="trigger-kessler" style="width: 100%; background: ${kesslerStatus.active ? 'rgba(100,100,100,0.5)' : 'linear-gradient(135deg, #ff6600, #ff3300)'}; border: none; color: white; padding: 12px; border-radius: 6px; cursor: ${kesslerStatus.active ? 'not-allowed' : 'pointer'}; font-weight: bold; font-size: 12px; font-family: 'Orbitron', monospace;" ${kesslerStatus.active ? 'disabled' : ''}>
                ${kesslerStatus.active ? 'CASCADE IN PROGRESS' : 'INITIATE CASCADE'}
            </button>
            
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
    // Set up trigger button
    const triggerBtn = document.getElementById('trigger-kessler');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', () => {
            // Trigger the enhanced Kessler Syndrome cascade
            if (window.redOrbitPhysics && window.redOrbitPhysics.triggerKesslerSyndrome) {
                const prediction = window.redOrbitPhysics.triggerKesslerSyndrome();
                
                if (prediction) {
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
                        window.showNotification('KESSLER CASCADE INITIATED!', 'error');
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
            } else {
                console.error('Red Orbit Physics not initialized!');
                if (window.showNotification) {
                    window.showNotification('Physics system initializing, please wait...', 'warning');
                }
            }
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationController);
} else {
    initNavigationController();
}