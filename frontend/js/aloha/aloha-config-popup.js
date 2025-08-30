import * as BABYLON from '@babylonjs/core';

export class ALOHAConfigPopup {
    constructor() {
        this.popup = null;
        this.data = null;
        this.onConfirmCallback = null;
    }

    show(onConfirm) {
        this.onConfirmCallback = onConfirm;
        this.createPopup();
    }

    createPopup() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'aloha-config-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'aloha-config-popup';
        popup.style.cssText = `
            background: linear-gradient(135deg, rgba(20, 0, 0, 0.95), rgba(40, 0, 0, 0.95));
            border: 2px solid #ff0000;
            border-radius: 10px;
            padding: 30px;
            width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
        `;

        popup.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h2 style="color: #ff0000; margin: 0 0 10px 0; font-family: 'Orbitron', monospace; letter-spacing: 2px;">
                    ALOHA CONFIGURATION
                </h2>
                <div style="color: #999; font-size: 12px;">
                    Trajectory Analysis and Simulation System
                </div>
            </div>

            <div id="trajectory-data" style="display: none; margin-bottom: 20px;">
                <div style="background: rgba(0, 255, 0, 0.1); border: 1px solid rgba(0, 255, 0, 0.3); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h3 style="color: #00ff00; font-size: 14px; margin: 0 0 10px 0; font-family: 'Orbitron', monospace;">
                        TRAJECTORY ANALYSIS
                    </h3>
                    <div id="analysis-content" style="font-family: monospace; font-size: 12px; color: #0f0; line-height: 1.6;"></div>
                </div>

                <div style="background: rgba(255, 255, 0, 0.1); border: 1px solid rgba(255, 255, 0, 0.3); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h3 style="color: #ffcc00; font-size: 14px; margin: 0 0 10px 0; font-family: 'Orbitron', monospace;">
                        MISSION PARAMETERS
                    </h3>
                    <div id="mission-params" style="font-family: monospace; font-size: 12px; color: #ffa; line-height: 1.6;"></div>
                </div>

                <div style="background: rgba(0, 150, 255, 0.1); border: 1px solid rgba(0, 150, 255, 0.3); padding: 15px; border-radius: 5px;">
                    <h3 style="color: #0099ff; font-size: 14px; margin: 0 0 10px 0; font-family: 'Orbitron', monospace;">
                        SIMULATION OPTIONS
                    </h3>
                    <div style="margin: 15px 0;">
                        <label style="color: #0099ff; font-size: 12px;">
                            <input type="checkbox" id="show-conjunctions" checked style="margin-right: 5px;">
                            Show Conjunction Warnings
                        </label>
                    </div>
                    <div style="margin: 15px 0;">
                        <label style="color: #0099ff; font-size: 12px;">
                            <input type="checkbox" id="auto-target" checked style="margin-right: 5px;">
                            Auto-detect Target
                        </label>
                    </div>
                    <div style="margin: 15px 0; color: #666; font-size: 11px; font-style: italic;">
                        Note: Use the global simulation time controls (1x/60x) to adjust playback speed
                    </div>
                </div>
            </div>

            <div id="file-upload" style="margin-bottom: 20px;">
                <div style="background: rgba(255, 0, 0, 0.1); border: 2px dashed rgba(255, 0, 0, 0.5); padding: 30px; text-align: center; border-radius: 5px; cursor: pointer; transition: all 0.3s;"
                     id="drop-zone">
                    <div style="color: #ff0000; font-size: 48px; margin-bottom: 10px;">📁</div>
                    <div style="color: #ff0000; font-size: 14px; margin-bottom: 10px;">
                        Drop ALOHA trajectory file here
                    </div>
                    <div style="color: #999; font-size: 12px;">
                        or click to browse
                    </div>
                    <input type="file" id="aloha-file-input" accept=".json" style="display: none;">
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <button id="cancel-btn" style="padding: 10px 30px; background: rgba(100, 100, 100, 0.2); border: 1px solid #666; color: #999; cursor: pointer; font-family: 'Orbitron', monospace; transition: all 0.3s;">
                    CANCEL
                </button>
                <button id="launch-btn" style="padding: 10px 30px; background: rgba(255, 0, 0, 0.2); border: 1px solid #ff0000; color: #ff0000; cursor: pointer; font-family: 'Orbitron', monospace; transition: all 0.3s; display: none;">
                    LAUNCH SIMULATION
                </button>
            </div>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        this.popup = overlay;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('aloha-file-input');
        const cancelBtn = document.getElementById('cancel-btn');
        const launchBtn = document.getElementById('launch-btn');

        // File drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.background = 'rgba(255, 0, 0, 0.2)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.background = 'rgba(255, 0, 0, 0.1)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.background = 'rgba(255, 0, 0, 0.1)';
            const file = e.dataTransfer.files[0];
            if (file) this.loadFile(file);
        });

        // Click to browse
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadFile(file);
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        // Launch button
        launchBtn.addEventListener('click', () => {
            this.launch();
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }

    async loadFile(file) {
        try {
            const text = await file.text();
            this.data = JSON.parse(text);
            
            // Analyze trajectory
            this.analyzeTrajectory();
            
            // Show analysis and options
            document.getElementById('file-upload').style.display = 'none';
            document.getElementById('trajectory-data').style.display = 'block';
            document.getElementById('launch-btn').style.display = 'block';
            
        } catch (error) {
            console.error('Error loading trajectory file:', error);
            
            // Show detailed error in popup
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid rgba(255, 0, 0, 0.5);
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                color: #ff6666;
                font-family: monospace;
                font-size: 11px;
                white-space: pre-wrap;
                max-height: 300px;
                overflow-y: auto;
            `;
            errorDiv.textContent = error.message;
            
            const fileUpload = document.getElementById('file-upload');
            fileUpload.appendChild(errorDiv);
            
            // Remove error after 10 seconds
            setTimeout(() => errorDiv.remove(), 10000);
        }
    }

    analyzeTrajectory() {
        if (!this.data || !this.data.states || this.data.states.length === 0) return;

        const states = this.data.states;
        const firstState = states[0];
        const lastState = states[states.length - 1];

        // Calculate trajectory metrics
        const startTime = new Date(firstState.epoch);
        const endTime = new Date(lastState.epoch);
        const duration = (endTime - startTime) / 1000; // seconds

        // Calculate altitudes
        const startAlt = Math.sqrt(firstState.position[0]**2 + firstState.position[1]**2 + firstState.position[2]**2) - 6371;
        
        // Find max altitude
        let maxAlt = 0;
        let maxAltTime = 0;
        states.forEach((state, i) => {
            const alt = Math.sqrt(state.position[0]**2 + state.position[1]**2 + state.position[2]**2) - 6371;
            if (alt > maxAlt) {
                maxAlt = alt;
                maxAltTime = i * (duration / states.length);
            }
        });

        // Calculate velocities
        const startVel = Math.sqrt(firstState.velocity[0]**2 + firstState.velocity[1]**2 + firstState.velocity[2]**2);
        const maxVel = Math.max(...states.map(s => Math.sqrt(s.velocity[0]**2 + s.velocity[1]**2 + s.velocity[2]**2)));

        // Update analysis display
        document.getElementById('analysis-content').innerHTML = `
            <div>Trajectory Type: <span style="color: #ff0000;">DIRECT ASCENT ASAT</span></div>
            <div>Launch Time: ${startTime.toISOString()}</div>
            <div>Flight Duration: ${duration.toFixed(1)} seconds</div>
            <div>Max Altitude: ${maxAlt.toFixed(1)} km</div>
            <div>Time to Apogee: ${maxAltTime.toFixed(1)} seconds</div>
            <div>Launch Velocity: ${startVel.toFixed(2)} km/s</div>
            <div>Max Velocity: ${maxVel.toFixed(2)} km/s</div>
            <div>Data Points: ${states.length}</div>
        `;

        // Update mission parameters
        document.getElementById('mission-params').innerHTML = `
            <div>Launch Location: <span style="color: #ff0000;">SAUDI ARABIA</span></div>
            <div>Coordinates: 21.2°N, 46.7°E</div>
            <div>Target Type: LEO Satellite</div>
            <div>Target Altitude: ~400 km</div>
            <div>Intercept Method: Kinetic Impact</div>
            <div>Debris Model: NASA Standard Breakup</div>
        `;
    }

    launch() {
        const config = {
            data: this.data,
            playbackSpeed: 1, // Always use real-time, let global controls handle speed
            showConjunctions: document.getElementById('show-conjunctions').checked,
            autoTarget: document.getElementById('auto-target').checked
        };

        if (this.onConfirmCallback) {
            this.onConfirmCallback(config);
        }

        this.close();
    }

    close() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
    }
}