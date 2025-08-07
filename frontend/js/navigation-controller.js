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
    mainContent.style.pointerEvents = 'auto';
    mainContent.innerHTML = `
        <div style="position: absolute; bottom: 20px; right: 20px; width: 350px; background: rgba(0,0,0,0.9); border: 1px solid rgba(255,100,0,0.5); border-radius: 8px; padding: 20px; backdrop-filter: blur(10px);">
            <h3 style="color: #ff6600; font-size: 14px; margin-bottom: 15px; font-family: 'Orbitron', monospace;">KESSLER SYNDROME</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #999; font-size: 11px;">Fragment Velocity</label>
                <input type="range" id="fragment-velocity" min="1" max="15" value="7.5" style="width: 100%; margin-top: 5px;">
                <div style="display: flex; justify-content: space-between; color: #ff6600; font-size: 10px;">
                    <span>1 km/s</span>
                    <span id="velocity-value">7.5 km/s</span>
                    <span>15 km/s</span>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #999; font-size: 11px;">Debris Count</label>
                <input type="range" id="debris-count" min="10" max="100" value="50" style="width: 100%; margin-top: 5px;">
                <div style="display: flex; justify-content: space-between; color: #ff6600; font-size: 10px;">
                    <span>10</span>
                    <span id="debris-value">50</span>
                    <span>100</span>
                </div>
            </div>
            
            <button id="trigger-kessler" style="width: 100%; background: linear-gradient(135deg, #ff6600, #ff3300); border: none; color: white; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; font-family: 'Orbitron', monospace;">
                TRIGGER CASCADE
            </button>
        </div>
    `;
    
    // Set up event listeners
    setupKesslerControls();
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

function setupKesslerControls() {
    // Set up velocity slider
    const velocitySlider = document.getElementById('fragment-velocity');
    const velocityValue = document.getElementById('velocity-value');
    if (velocitySlider && velocityValue) {
        velocitySlider.addEventListener('input', (e) => {
            velocityValue.textContent = e.target.value + ' km/s';
        });
    }
    
    // Set up debris slider
    const debrisSlider = document.getElementById('debris-count');
    const debrisValue = document.getElementById('debris-value');
    if (debrisSlider && debrisValue) {
        debrisSlider.addEventListener('input', (e) => {
            debrisValue.textContent = e.target.value;
        });
    }
    
    // Set up trigger button
    const triggerBtn = document.getElementById('trigger-kessler');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', () => {
            // Trigger the Kessler scenario using PURE PHYSICS
            if (window.redOrbitPhysics && window.redOrbitPhysics.triggerKessler) {
                const velocity = parseFloat(velocitySlider?.value || 7.5);
                const debris = parseInt(debrisSlider?.value || 50);
                window.redOrbitPhysics.triggerKessler(velocity);
                if (window.showNotification) {
                    window.showNotification('KESSLER SYNDROME INITIATED!', 'error');
                }
            } else {
                console.warn('RED ORBIT physics not initialized yet');
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