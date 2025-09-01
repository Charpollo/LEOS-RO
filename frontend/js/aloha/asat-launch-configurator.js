/**
 * ASAT Launch Configurator
 * UI component for on-demand ASAT trajectory creation
 * 
 * FLIGHT RULES:
 * - Modular: Self-contained UI component
 * - User-friendly: Click on map or enter coordinates
 * - Real-time: Instant trajectory preview
 */

import ASATTrajectoryGenerator from './asat-trajectory-generator.js';

export class ASATLaunchConfigurator {
    constructor(scene, alohaHandler) {
        this.scene = scene;
        this.alohaHandler = alohaHandler;
        this.generator = new ASATTrajectoryGenerator();
        
        this.isConfiguring = false;
        this.launchPoint = null;
        this.targetPoint = null;
        
        // Default parameters
        this.config = {
            launchLat: 39.7294,  // Default: Aurora, Colorado
            launchLon: -104.8319,
            targetLat: 35.0,
            targetLon: -140.0,
            targetAlt: 400,
            duration: 420
        };
    }
    
    /**
     * Show configuration UI
     */
    showConfigUI() {
        // Create configuration popup
        const popup = document.createElement('div');
        popup.className = 'asat-config-popup';
        popup.innerHTML = `
            <div class="popup-content" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #ff0000;
                border-radius: 10px;
                padding: 30px;
                z-index: 10000;
                min-width: 500px;
                color: white;
                font-family: monospace;
            ">
                <button class="popup-close" onclick="this.parentElement.parentElement.remove()" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: transparent;
                    border: none;
                    color: #ff0000;
                    font-size: 24px;
                    cursor: pointer;
                ">×</button>
                
                <h2 style="color: #ff0000; margin-top: 0;">Custom ASAT Launch Configuration</h2>
                
                <div class="config-section" style="margin: 20px 0;">
                    <h3 style="color: #ff6666;">Launch Site</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; color: #999; font-size: 12px;">Latitude</label>
                            <input type="number" id="launch-lat" value="${this.config.launchLat}" 
                                min="-90" max="90" step="0.01"
                                style="width: 100%; padding: 5px; background: #111; border: 1px solid #333; color: white;">
                        </div>
                        <div>
                            <label style="display: block; color: #999; font-size: 12px;">Longitude</label>
                            <input type="number" id="launch-lon" value="${this.config.launchLon}"
                                min="-180" max="180" step="0.01"
                                style="width: 100%; padding: 5px; background: #111; border: 1px solid #333; color: white;">
                        </div>
                    </div>
                </div>
                
                <div class="config-section" style="margin: 20px 0;">
                    <h3 style="color: #ff6666;">Target</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; color: #999; font-size: 12px;">Latitude</label>
                            <input type="number" id="target-lat" value="${this.config.targetLat}"
                                min="-90" max="90" step="0.01"
                                style="width: 100%; padding: 5px; background: #111; border: 1px solid #333; color: white;">
                        </div>
                        <div>
                            <label style="display: block; color: #999; font-size: 12px;">Longitude</label>
                            <input type="number" id="target-lon" value="${this.config.targetLon}"
                                min="-180" max="180" step="0.01"
                                style="width: 100%; padding: 5px; background: #111; border: 1px solid #333; color: white;">
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="display: block; color: #999; font-size: 12px;">Target Altitude (km)</label>
                        <input type="number" id="target-alt" value="${this.config.targetAlt}"
                            min="200" max="1000" step="10"
                            style="width: 100%; padding: 5px; background: #111; border: 1px solid #333; color: white;">
                    </div>
                </div>
                
                <div class="config-section" style="margin: 20px 0;">
                    <h3 style="color: #ff6666;">Flight Parameters</h3>
                    <div>
                        <label style="display: block; color: #999; font-size: 12px;">Duration (seconds)</label>
                        <input type="range" id="duration" min="300" max="600" value="${this.config.duration}"
                            style="width: 100%;">
                        <span id="duration-value" style="color: #ff6666;">${this.config.duration}s</span>
                    </div>
                </div>
                
                <div class="preset-buttons" style="margin: 20px 0;">
                    <h4 style="color: #999;">Quick Presets:</h4>
                    <button onclick="window.asatConfig.loadPreset('colorado-russia')" style="
                        padding: 5px 10px;
                        margin: 5px;
                        background: #333;
                        border: 1px solid #666;
                        color: white;
                        cursor: pointer;
                    ">Colorado → Russia</button>
                    <button onclick="window.asatConfig.loadPreset('china-usa')" style="
                        padding: 5px 10px;
                        margin: 5px;
                        background: #333;
                        border: 1px solid #666;
                        color: white;
                        cursor: pointer;
                    ">China → USA</button>
                    <button onclick="window.asatConfig.loadPreset('india-leo')" style="
                        padding: 5px 10px;
                        margin: 5px;
                        background: #333;
                        border: 1px solid #666;
                        color: white;
                        cursor: pointer;
                    ">India → LEO Target</button>
                </div>
                
                <div class="save-section" style="margin: 20px 0; padding: 15px; background: rgba(0, 100, 255, 0.1); border: 1px solid rgba(0, 100, 255, 0.3); border-radius: 5px;">
                    <h4 style="color: #0099ff; margin-top: 0;">Save Scenario</h4>
                    <input type="text" id="scenario-name" placeholder="Enter scenario name..." style="
                        width: 100%;
                        padding: 8px;
                        background: #111;
                        border: 1px solid #333;
                        color: white;
                        margin-bottom: 10px;
                    ">
                    <button id="save-scenario" style="
                        padding: 8px 20px;
                        background: #0066cc;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 13px;
                    ">Save Scenario</button>
                    <button id="delete-scenarios" style="
                        padding: 8px 20px;
                        margin-left: 10px;
                        background: #660000;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 13px;
                    ">Clear All Saved</button>
                </div>
                
                <div class="action-buttons" style="margin-top: 30px; text-align: center;">
                    <button id="preview-trajectory" style="
                        padding: 10px 30px;
                        margin: 0 10px;
                        background: #444;
                        border: 1px solid #666;
                        color: white;
                        cursor: pointer;
                        font-size: 14px;
                    ">Preview Trajectory</button>
                    <button id="launch-asat" style="
                        padding: 10px 30px;
                        margin: 0 10px;
                        background: #ff0000;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                    ">LAUNCH ASAT</button>
                </div>
                
                <div id="validation-message" style="
                    margin-top: 20px;
                    padding: 10px;
                    background: rgba(255, 255, 0, 0.1);
                    border: 1px solid rgba(255, 255, 0, 0.3);
                    color: #ffff00;
                    font-size: 12px;
                    display: none;
                "></div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Store reference for event handlers
        window.asatConfig = this;
        
        // Setup event handlers
        this.setupEventHandlers(popup);
    }
    
    /**
     * Setup UI event handlers
     */
    setupEventHandlers(popup) {
        // Duration slider
        const durationSlider = popup.querySelector('#duration');
        const durationValue = popup.querySelector('#duration-value');
        durationSlider.addEventListener('input', (e) => {
            this.config.duration = parseInt(e.target.value);
            durationValue.textContent = `${this.config.duration}s`;
        });
        
        // Save scenario button
        popup.querySelector('#save-scenario').addEventListener('click', () => {
            this.updateConfigFromUI(popup);
            const name = popup.querySelector('#scenario-name').value;
            if (name) {
                this.saveScenario(name);
                this.showNotification('Scenario saved!', 'success');
            } else {
                this.showNotification('Please enter a scenario name', 'error');
            }
        });
        
        // Delete all scenarios button
        popup.querySelector('#delete-scenarios').addEventListener('click', () => {
            if (confirm('Delete all saved scenarios?')) {
                localStorage.removeItem('asat_scenarios');
                this.showNotification('All scenarios deleted', 'info');
            }
        });
        
        // Preview button
        popup.querySelector('#preview-trajectory').addEventListener('click', () => {
            this.updateConfigFromUI(popup);
            this.previewTrajectory();
        });
        
        // Launch button
        popup.querySelector('#launch-asat').addEventListener('click', () => {
            this.updateConfigFromUI(popup);
            this.launchASAT();
            popup.remove();
        });
    }
    
    /**
     * Update config from UI inputs
     */
    updateConfigFromUI(popup) {
        this.config.launchLat = parseFloat(popup.querySelector('#launch-lat').value);
        this.config.launchLon = parseFloat(popup.querySelector('#launch-lon').value);
        this.config.targetLat = parseFloat(popup.querySelector('#target-lat').value);
        this.config.targetLon = parseFloat(popup.querySelector('#target-lon').value);
        this.config.targetAlt = parseFloat(popup.querySelector('#target-alt').value);
        this.config.duration = parseInt(popup.querySelector('#duration').value);
    }
    
    /**
     * Load preset configurations
     */
    loadPreset(preset) {
        const presets = {
            'colorado-russia': {
                launchLat: 39.7294,
                launchLon: -104.8319,
                targetLat: 56.3287,
                targetLon: 40.8689,
                targetAlt: 400,
                duration: 480
            },
            'china-usa': {
                launchLat: 41.1445,
                launchLon: 100.1314,
                targetLat: 38.8977,
                targetLon: -77.0365,
                targetAlt: 500,
                duration: 450
            },
            'india-leo': {
                launchLat: 13.7341,
                launchLon: 80.1548,
                targetLat: 0,
                targetLon: 90,
                targetAlt: 550,
                duration: 360
            }
        };
        
        if (presets[preset]) {
            Object.assign(this.config, presets[preset]);
            // Update UI
            document.querySelector('#launch-lat').value = this.config.launchLat;
            document.querySelector('#launch-lon').value = this.config.launchLon;
            document.querySelector('#target-lat').value = this.config.targetLat;
            document.querySelector('#target-lon').value = this.config.targetLon;
            document.querySelector('#target-alt').value = this.config.targetAlt;
            document.querySelector('#duration').value = this.config.duration;
            document.querySelector('#duration-value').textContent = `${this.config.duration}s`;
        }
    }
    
    /**
     * Preview trajectory (show path only)
     */
    previewTrajectory() {
        const trajectory = this.generator.generateTrajectory(this.config);
        
        // Validate physics
        const validation = this.generator.validateTrajectory(trajectory);
        
        const msgDiv = document.querySelector('#validation-message');
        if (validation.valid) {
            msgDiv.style.display = 'block';
            msgDiv.style.background = 'rgba(0, 255, 0, 0.1)';
            msgDiv.style.borderColor = 'rgba(0, 255, 0, 0.3)';
            msgDiv.style.color = '#00ff00';
            msgDiv.textContent = `✓ Trajectory valid. Max velocity: ${validation.maxVelocity.toFixed(1)} km/s`;
        } else {
            msgDiv.style.display = 'block';
            msgDiv.style.background = 'rgba(255, 0, 0, 0.1)';
            msgDiv.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            msgDiv.style.color = '#ff0000';
            msgDiv.textContent = `✗ Warning: ${validation.issues[0]}`;
        }
        
        // Could add visual preview here
        console.log('Preview trajectory:', trajectory.length, 'points');
    }
    
    /**
     * Save scenario to localStorage
     */
    saveScenario(name) {
        // Generate trajectory
        const trajectory = this.generator.generateTrajectory(this.config);
        
        // Generate metadata
        const data = this.generator.generateMetadata(this.config, trajectory);
        data.name = name;
        data.id = `scenario_${Date.now()}`;
        
        // Get existing scenarios
        let scenarios = [];
        try {
            const saved = localStorage.getItem('asat_scenarios');
            scenarios = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading scenarios:', e);
        }
        
        // Add new scenario
        scenarios.push(data);
        
        // Save to localStorage
        localStorage.setItem('asat_scenarios', JSON.stringify(scenarios));
        
        console.log('Scenario saved:', name);
    }
    
    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        const msgDiv = document.querySelector('#validation-message');
        if (msgDiv) {
            msgDiv.style.display = 'block';
            
            if (type === 'success') {
                msgDiv.style.background = 'rgba(0, 255, 0, 0.1)';
                msgDiv.style.borderColor = 'rgba(0, 255, 0, 0.3)';
                msgDiv.style.color = '#00ff00';
            } else if (type === 'error') {
                msgDiv.style.background = 'rgba(255, 0, 0, 0.1)';
                msgDiv.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                msgDiv.style.color = '#ff0000';
            } else {
                msgDiv.style.background = 'rgba(255, 255, 0, 0.1)';
                msgDiv.style.borderColor = 'rgba(255, 255, 0, 0.3)';
                msgDiv.style.color = '#ffff00';
            }
            
            msgDiv.textContent = message;
            
            setTimeout(() => {
                msgDiv.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * Launch ASAT with generated trajectory
     */
    async launchASAT() {
        // Generate trajectory
        const trajectory = this.generator.generateTrajectory(this.config);
        
        // Generate metadata
        const data = this.generator.generateMetadata(this.config, trajectory);
        
        // Load into ALOHA handler
        await this.alohaHandler.loadTrajectory({
            data: data,
            showConjunctions: true,
            autoTarget: true,
            playbackSpeed: 1
        });
        
        // Start playback
        this.alohaHandler.startPlayback();
        
        console.log('Custom ASAT launched!', data.launch_site, '->', data.target);
    }
}

export default ASATLaunchConfigurator;