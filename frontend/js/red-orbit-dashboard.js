/**
 * Red Orbit Dashboard Controller
 * Manages the new dashboard interface for disaster simulations
 */

export function initRedOrbitDashboard() {
    // Initialize collapsible panels
    initCollapsiblePanels();
    
    // Initialize navigation tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            navTabs.forEach(t => {
                t.classList.remove('active');
                t.style.color = '#666';
                t.style.borderBottom = '2px solid transparent';
            });
            tab.classList.add('active');
            tab.style.color = '#ff0000';
            tab.style.borderBottom = '2px solid #ff0000';
            
            // Handle tab switching
            const scenario = tab.dataset.scenario;
            handleScenarioChange(scenario);
        });
    });
    
    // Initialize trigger button
    const triggerBtn = document.getElementById('trigger-cascade');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', () => {
            triggerKesslerCascade();
        });
    }
    
    // Initialize sliders
    const velocitySlider = document.getElementById('fragment-velocity');
    const debrisSlider = document.getElementById('debris-count');
    
    if (velocitySlider) {
        velocitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('velocity-value').textContent = `${value} km/s`;
        });
    }
    
    if (debrisSlider) {
        debrisSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('debris-value').textContent = `${value} pieces`;
        });
    }
    
    // Initialize play/pause button
    const playPauseBtn = document.getElementById('play-pause');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            const isPaused = playPauseBtn.textContent.includes('▶');
            if (isPaused) {
                playPauseBtn.innerHTML = '⏸';
                playPauseBtn.style.background = '#ff6600';
                startSimulation();
            } else {
                playPauseBtn.innerHTML = '▶';
                playPauseBtn.style.background = '#ff0000';
                pauseSimulation();
            }
        });
    }
    
    // Initialize speed control
    const speedControl = document.getElementById('speed-control');
    if (speedControl) {
        speedControl.addEventListener('change', (e) => {
            const speed = parseInt(e.target.value);
            updateSimulationSpeed(speed);
        });
    }
    
    // Update stats periodically
    setInterval(updateLiveStats, 1000);
    
    // Add event to log
    addEventToLog('System initialized');
}

function handleScenarioChange(scenario) {
    console.log(`Switching to scenario: ${scenario}`);
    
    // Update left sidebar content based on scenario
    switch(scenario) {
        case 'kessler':
            showKesslerControls();
            break;
        case 'solar':
            showSolarControls();
            break;
        case 'overview':
            showOverviewControls();
            break;
        case 'settings':
            showSettingsControls();
            break;
        default:
            // Handle other tabs
            break;
    }
}

function triggerKesslerCascade() {
    const velocity = document.getElementById('fragment-velocity').value;
    const debrisCount = document.getElementById('debris-count').value;
    const altitude = document.getElementById('orbital-altitude').value;
    
    console.log(`Triggering Kessler cascade: ${debrisCount} fragments at ${velocity} km/s, altitude ${altitude} km`);
    
    // Dispatch collision event
    const event = new CustomEvent('redOrbitCollision', {
        detail: {
            velocity: parseFloat(velocity),
            debrisCount: parseInt(debrisCount),
            altitude: parseInt(altitude)
        }
    });
    window.dispatchEvent(event);
    
    // Update button state
    const btn = document.getElementById('trigger-cascade');
    btn.textContent = 'CASCADE ACTIVE';
    btn.style.background = '#ff0000';
    btn.disabled = true;
    
    // Add event to log
    addEventToLog(`Kessler cascade triggered: ${debrisCount} fragments`);
    
    // Re-enable after 5 seconds
    setTimeout(() => {
        btn.textContent = 'TRIGGER EVENT';
        btn.style.background = 'linear-gradient(135deg, #ff6600, #ff3300)';
        btn.disabled = false;
    }, 5000);
}

function updateLiveStats() {
    // Update active debris count
    const activeDebris = document.getElementById('active-debris');
    const currentDebris = parseInt(activeDebris.textContent) || 0;
    
    // Update collision risk based on debris
    const riskLevel = document.getElementById('collision-risk-level');
    if (currentDebris > 100) {
        riskLevel.textContent = 'CRITICAL';
        riskLevel.style.color = '#ff0000';
    } else if (currentDebris > 50) {
        riskLevel.textContent = 'HIGH';
        riskLevel.style.color = '#ff6600';
    } else if (currentDebris > 20) {
        riskLevel.textContent = 'MEDIUM';
        riskLevel.style.color = '#ffc800';
    } else {
        riskLevel.textContent = 'LOW';
        riskLevel.style.color = '#00ff00';
    }
    
    // Update timeline
    const timeline = document.getElementById('timeline-slider');
    if (timeline && !window.simulationPaused) {
        const currentValue = parseInt(timeline.value) || 0;
        if (currentValue < 100) {
            timeline.value = currentValue + 0.1;
        }
    }
}

function addEventToLog(message) {
    const eventLog = document.getElementById('event-log');
    if (!eventLog) return;
    
    const time = new Date();
    const timestamp = `[${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}]`;
    
    const eventDiv = document.createElement('div');
    eventDiv.style.cssText = 'padding: 5px 0; border-bottom: 1px solid rgba(255,0,0,0.1);';
    eventDiv.innerHTML = `<span style="color: #666; margin-right: 5px;">${timestamp}</span>${message}`;
    
    // Insert at the top
    eventLog.insertBefore(eventDiv, eventLog.firstChild);
    
    // Keep only last 20 events
    while (eventLog.children.length > 20) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

function startSimulation() {
    window.simulationPaused = false;
    if (window.simState) {
        window.simState.paused = false;
    }
    addEventToLog('Simulation resumed');
}

function pauseSimulation() {
    window.simulationPaused = true;
    if (window.simState) {
        window.simState.paused = true;
    }
    addEventToLog('Simulation paused');
}

function updateSimulationSpeed(speed) {
    if (window.simState) {
        window.simState.timeMultiplier = speed;
    }
    addEventToLog(`Simulation speed set to ${speed}x`);
}

function showKesslerControls() {
    // Already showing Kessler controls by default
}

function showSolarControls() {
    const leftSidebar = document.getElementById('left-sidebar');
    if (leftSidebar) {
        const scenarioSection = leftSidebar.querySelector('.scenario-section');
        scenarioSection.innerHTML = `
            <h3 style="color: #ffc800; font-size: 14px; margin-bottom: 15px; font-family: 'Orbitron', monospace;">SOLAR STORM</h3>
            <div class="scenario-card" style="background: rgba(255,200,0,0.1); border: 1px solid rgba(255,200,0,0.3); padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="color: #ffc800; font-size: 13px; margin-bottom: 10px; font-family: 'Orbitron', monospace;">Coronal Mass Ejection</h4>
                <p style="color: #999; font-size: 11px; margin-bottom: 15px;">Simulate a massive solar storm impacting satellite electronics.</p>
                <button disabled style="width: 100%; background: #333; border: none; color: #666; padding: 10px; border-radius: 4px; cursor: not-allowed;">COMING SOON</button>
            </div>
        `;
    }
}

function showOverviewControls() {
    const leftSidebar = document.getElementById('left-sidebar');
    if (leftSidebar) {
        const scenarioSection = leftSidebar.querySelector('.scenario-section');
        scenarioSection.innerHTML = `
            <h3 style="color: #ff6666; font-size: 14px; margin-bottom: 15px; font-family: 'Orbitron', monospace;">SYSTEM OVERVIEW</h3>
            <div style="color: #999; font-size: 12px; line-height: 1.6;">
                <p style="margin-bottom: 15px;">Welcome to RED ORBIT - a space disaster simulation platform.</p>
                <p style="margin-bottom: 15px;">Select a scenario from the tabs above to begin simulating catastrophic orbital events.</p>
                <div style="background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); padding: 10px; border-radius: 4px;">
                    <h4 style="color: #ff6666; font-size: 11px; margin-bottom: 5px;">Available Scenarios:</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Kessler Syndrome - Active</li>
                        <li>Solar Storm - Coming Soon</li>
                        <li>Unexpected Launch - Coming Soon</li>
                    </ul>
                </div>
            </div>
        `;
    }
}

function showSettingsControls() {
    const leftSidebar = document.getElementById('left-sidebar');
    const rightSidebar = document.getElementById('right-sidebar');
    
    if (leftSidebar) {
        leftSidebar.innerHTML = `
            <h3 style="color: #ff6666; font-size: 14px; margin-bottom: 15px; font-family: 'Orbitron', monospace;">SIMULATION SETTINGS</h3>
            
            <div class="settings-section" style="margin-bottom: 20px;">
                <h4 style="color: #ff9933; font-size: 12px; margin-bottom: 10px;">Time Controls</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">Simulation Speed</label>
                    <select id="time-multiplier" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,0,0,0.3); color: #fff; padding: 8px; font-size: 11px; border-radius: 4px; margin-top: 5px;">
                        <option value="1">Real Time (1x)</option>
                        <option value="10">10x Speed</option>
                        <option value="100" selected>100x Speed</option>
                        <option value="1000">1000x Speed</option>
                        <option value="10000">10,000x Speed</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">
                        <input type="checkbox" id="auto-pause-collision" checked> Auto-pause on collision
                    </label>
                </div>
            </div>
            
            <div class="settings-section" style="margin-bottom: 20px;">
                <h4 style="color: #ff9933; font-size: 12px; margin-bottom: 10px;">Visual Settings</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">
                        <input type="checkbox" id="show-orbit-paths" checked> Show orbit paths
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">
                        <input type="checkbox" id="show-satellite-labels" checked> Show satellite labels
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">
                        <input type="checkbox" id="show-debris-trails" checked> Show debris trails
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">Satellite Scale</label>
                    <input type="range" id="satellite-scale" min="0.5" max="3" step="0.1" value="1" style="width: 100%; margin-top: 5px;">
                    <div style="display: flex; justify-content: space-between; color: #ff6666; font-size: 10px;">
                        <span>0.5x</span>
                        <span id="scale-value">1.0x</span>
                        <span>3.0x</span>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4 style="color: #ff9933; font-size: 12px; margin-bottom: 10px;">Performance</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">Quality Preset</label>
                    <select id="quality-preset" style="width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,0,0,0.3); color: #fff; padding: 8px; font-size: 11px; border-radius: 4px; margin-top: 5px;">
                        <option value="low">Low (Better Performance)</option>
                        <option value="medium" selected>Medium (Balanced)</option>
                        <option value="high">High (Best Quality)</option>
                        <option value="ultra">Ultra (Maximum Quality)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">
                        <input type="checkbox" id="enable-shadows"> Enable shadows
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="color: #999; font-size: 11px;">
                        <input type="checkbox" id="enable-bloom" checked> Enable bloom effects
                    </label>
                </div>
            </div>
        `;
        
        // Add event listeners for settings
        const scaleSlider = document.getElementById('satellite-scale');
        if (scaleSlider) {
            scaleSlider.addEventListener('input', (e) => {
                document.getElementById('scale-value').textContent = `${e.target.value}x`;
            });
        }
    }
    
    if (rightSidebar) {
        rightSidebar.innerHTML = `
            <h3 style="color: #ff6666; font-size: 14px; margin-bottom: 15px; font-family: 'Orbitron', monospace;">SYSTEM INFO</h3>
            
            <div class="stat-card" style="background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                <div style="color: #999; font-size: 10px;">Frame Rate</div>
                <div style="color: #ff6666; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;" id="fps-counter">60 FPS</div>
            </div>
            
            <div class="stat-card" style="background: rgba(255,100,0,0.1); border: 1px solid rgba(255,100,0,0.3); padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                <div style="color: #999; font-size: 10px;">Memory Usage</div>
                <div style="color: #ff9933; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;" id="memory-usage">128 MB</div>
            </div>
            
            <div class="stat-card" style="background: rgba(255,200,0,0.1); border: 1px solid rgba(255,200,0,0.3); padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                <div style="color: #999; font-size: 10px;">Physics Objects</div>
                <div style="color: #ffc800; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;" id="physics-objects">0</div>
            </div>
            
            <h4 style="color: #ff6666; font-size: 12px; margin-top: 25px; margin-bottom: 10px; font-family: 'Orbitron', monospace;">KEYBINDINGS</h4>
            <div style="font-size: 10px; color: #999; line-height: 1.8;">
                <div><span style="color: #ff6666;">SPACE</span> - Pause/Resume</div>
                <div><span style="color: #ff6666;">O</span> - Toggle Orbits</div>
                <div><span style="color: #ff6666;">L</span> - Toggle Labels</div>
                <div><span style="color: #ff6666;">G</span> - Toggle Grid</div>
                <div><span style="color: #ff6666;">1-5</span> - Time Speed</div>
                <div><span style="color: #ff6666;">ESC</span> - Reset Camera</div>
                <div><span style="color: #ff6666;">F</span> - Fullscreen</div>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,0,0,0.2);">
                <button id="reset-settings" style="width: 100%; background: rgba(255,0,0,0.2); border: 1px solid #ff0000; color: #ff6666; padding: 10px; border-radius: 4px; cursor: pointer; font-family: 'Orbitron', monospace;">
                    RESET TO DEFAULTS
                </button>
            </div>
        `;
    }
}

function initCollapsiblePanels() {
    const leftSidebar = document.getElementById('left-sidebar');
    const rightSidebar = document.getElementById('right-sidebar');
    const toggleLeftBtn = document.getElementById('toggle-left-panel');
    const toggleRightBtn = document.getElementById('toggle-right-panel');
    
    if (toggleLeftBtn && leftSidebar) {
        toggleLeftBtn.addEventListener('click', () => {
            const isCollapsed = leftSidebar.style.left === '-260px';
            if (isCollapsed) {
                leftSidebar.style.left = '0';
                toggleLeftBtn.innerHTML = '◀';
            } else {
                leftSidebar.style.left = '-260px';
                toggleLeftBtn.innerHTML = '▶';
            }
        });
    }
    
    if (toggleRightBtn && rightSidebar) {
        toggleRightBtn.addEventListener('click', () => {
            const isCollapsed = rightSidebar.style.right === '-260px';
            if (isCollapsed) {
                rightSidebar.style.right = '0';
                toggleRightBtn.innerHTML = '▶';
            } else {
                rightSidebar.style.right = '-260px';
                toggleRightBtn.innerHTML = '◀';
            }
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRedOrbitDashboard);
} else {
    initRedOrbitDashboard();
}