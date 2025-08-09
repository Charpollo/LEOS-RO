/**
 * GPU PHYSICS CONTROLS
 * UI for controlling GPU physics engine parameters
 */

export class GPUControls {
    constructor(gpuEngine) {
        this.gpuEngine = gpuEngine;
        this.panel = null;
        this.isVisible = false;
    }
    
    createPanel() {
        // Create control panel
        this.panel = document.createElement('div');
        this.panel.id = 'gpu-controls';
        this.panel.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #ff0000;
            border-radius: 8px;
            padding: 20px;
            color: #ffffff;
            font-family: 'Orbitron', monospace;
            width: 350px;
            z-index: 1000;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
        `;
        
        this.panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #ff0000; font-size: 16px;">PHYSICS ENGINE CONTROL</h3>
                <button id="close-gpu-panel" style="background: none; border: none; color: #ff0000; font-size: 20px; cursor: pointer;">×</button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 0, 0, 0.1); border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">Current Engine:</span>
                    <span id="current-engine" style="color: #00ff00;">GPU</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">Object Count:</span>
                    <span id="object-count" style="color: #00ff00;">15,000</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">Physics FPS:</span>
                    <span id="physics-fps" style="color: #00ff00;">60</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">Frame Time:</span>
                    <span id="frame-time" style="color: #00ff00;">16ms</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #999;">Time Speed:</span>
                    <span id="time-speed" style="color: #00ff00;">1x</span>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; color: #ff0000; margin-bottom: 8px; font-size: 12px;">PHYSICS MODE</label>
                <div id="physics-modes" style="display: grid; gap: 8px;">
                    ${this.createModeButtons()}
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; color: #ff0000; margin-bottom: 8px; font-size: 12px;">
                    OBJECT COUNT: <span id="slider-value" style="color: #00ff00;">15,000</span>
                </label>
                <input type="range" id="object-slider" min="1000" max="1000000" value="15000" 
                    step="1000" style="width: 100%; accent-color: #ff0000;">
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 4px;">
                    <span>1K</span>
                    <span>100K</span>
                    <span>400K</span>
                    <span>1M</span>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="apply-settings" style="
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(45deg, #ff0000, #ff6600);
                    border: none;
                    border-radius: 4px;
                    color: #ffffff;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                ">APPLY SETTINGS</button>
            </div>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333;">
                <div style="font-size: 11px; color: #666; line-height: 1.5;">
                    <div>• <span style="color: #00ff00;">GPU ONLY</span>: WebGPU required</div>
                    <div>• <span style="color: #ffff00;">100K</span>: Recommended default</div>
                    <div>• <span style="color: #ff0000;">WARNING</span>: 400K+ requires high-end GPU</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        this.attachEventListeners();
        this.startStatsUpdate();
    }
    
    createModeButtons() {
        const configs = {
            DEMO: { count: 10000, engine: 'GPU', description: 'Standard demo' },
            KESSLER: { count: 50000, engine: 'GPU', description: 'Kessler cascade' },
            CATALOG: { count: 100000, engine: 'GPU', description: 'Full space catalog' },
            MEGA: { count: 400000, engine: 'GPU', description: 'Mega constellation' },
            MAX: { count: 1000000, engine: 'GPU', description: 'Maximum capacity' }
        };
        
        return Object.entries(configs).map(([key, config]) => `
            <button class="physics-mode-btn" data-mode="${key}" data-count="${config.count}" style="
                padding: 8px;
                background: rgba(255, 0, 0, 0.2);
                border: 1px solid #ff0000;
                border-radius: 4px;
                color: #ffffff;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.3s;
                text-align: left;
            ">
                <div style="font-weight: bold; color: #ff0000;">${key}</div>
                <div style="font-size: 10px; color: #999;">${config.count.toLocaleString()} objects</div>
                <div style="font-size: 9px; color: #666;">${config.engine}</div>
            </button>
        `).join('');
    }
    
    attachEventListeners() {
        // Close button
        document.getElementById('close-gpu-panel').addEventListener('click', () => {
            this.hide();
        });
        
        // Mode buttons
        document.querySelectorAll('.physics-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const count = parseInt(e.currentTarget.dataset.count);
                document.getElementById('object-slider').value = count;
                document.getElementById('slider-value').textContent = count.toLocaleString();
                
                // Highlight selected
                document.querySelectorAll('.physics-mode-btn').forEach(b => {
                    b.style.background = 'rgba(255, 0, 0, 0.2)';
                });
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.5)';
            });
        });
        
        
        // Slider
        const slider = document.getElementById('object-slider');
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('slider-value').textContent = value.toLocaleString();
            
            // Update slider color based on engine requirement
            if (value > 100000) {
                slider.style.accentColor = '#ff0000'; // Red for extreme
            } else if (value > 25000) {
                slider.style.accentColor = '#ffff00'; // Yellow for GPU
            } else {
                slider.style.accentColor = '#00ff00'; // Green for low count
            }
        });
        
        // Apply button
        document.getElementById('apply-settings').addEventListener('click', async () => {
            const count = parseInt(document.getElementById('object-slider').value);
            await this.applySettings(count);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'g' || e.key === 'G') {
                this.toggle();
            }
        });
    }
    
    async applySettings(objectCount) {
        const applyBtn = document.getElementById('apply-settings');
        applyBtn.textContent = 'INITIALIZING...';
        applyBtn.disabled = true;
        
        try {
            // Re-populate space with new object count
            await this.gpuEngine.populateSpace(objectCount);
            
            // Show success
            applyBtn.textContent = 'SUCCESS!';
            applyBtn.style.background = 'linear-gradient(45deg, #00ff00, #00ff88)';
            
            setTimeout(() => {
                applyBtn.textContent = 'APPLY SETTINGS';
                applyBtn.style.background = 'linear-gradient(45deg, #ff0000, #ff6600)';
                applyBtn.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('Failed to apply settings:', error);
            applyBtn.textContent = 'FAILED!';
            applyBtn.style.background = 'linear-gradient(45deg, #ff0000, #660000)';
            
            setTimeout(() => {
                applyBtn.textContent = 'APPLY SETTINGS';
                applyBtn.style.background = 'linear-gradient(45deg, #ff0000, #ff6600)';
                applyBtn.disabled = false;
            }, 2000);
        }
    }
    
    startStatsUpdate() {
        setInterval(() => {
            if (!this.isVisible) return;
            
            const stats = this.gpuEngine.getStats();
            
            // Update display
            document.getElementById('current-engine').textContent = 'GPU';
            document.getElementById('object-count').textContent = (stats.totalObjects || 0).toLocaleString();
            
            // Update time speed display from global state
            const timeMultiplier = window.getTimeMultiplier ? window.getTimeMultiplier() : 1;
            document.getElementById('time-speed').textContent = `${timeMultiplier}x`;
            
            const fps = stats.avgFrameTime > 0 ? Math.round(1000 / stats.avgFrameTime) : 0;
            document.getElementById('physics-fps').textContent = fps;
            
            const fpsElement = document.getElementById('physics-fps');
            if (fps >= 55) {
                fpsElement.style.color = '#00ff00';
            } else if (fps >= 30) {
                fpsElement.style.color = '#ffff00';
            } else {
                fpsElement.style.color = '#ff0000';
            }
            
            document.getElementById('frame-time').textContent = 
                stats.avgFrameTime ? `${stats.avgFrameTime.toFixed(1)}ms` : '0ms';
        }, 100);
    }
    
    show() {
        if (!this.panel) {
            this.createPanel();
        }
        this.panel.style.display = 'block';
        this.isVisible = true;
    }
    
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
        this.isVisible = false;
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Add info overlay
export function createGPUInfoOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'gpu-info-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 100px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ff00;
        border-radius: 4px;
        padding: 10px;
        color: #00ff00;
        font-family: monospace;
        font-size: 11px;
        width: 200px;
        z-index: 999;
    `;
    
    overlay.innerHTML = `
        <div style="margin-bottom: 8px; color: #ffffff; font-weight: bold;">GPU PHYSICS STATUS</div>
        <div id="gpu-status">Checking WebGPU...</div>
        <div id="gpu-capability" style="margin-top: 8px; color: #999;"></div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333;">
            <div style="color: #666;">Press 'G' for controls</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Check WebGPU support
    if (navigator.gpu) {
        navigator.gpu.requestAdapter().then(adapter => {
            if (adapter) {
                document.getElementById('gpu-status').innerHTML = 
                    '<span style="color: #00ff00;">✓ WebGPU Available</span>';
                document.getElementById('gpu-capability').innerHTML = 
                    '<div>Max: 1,000,000 objects</div>';
            } else {
                document.getElementById('gpu-status').innerHTML = 
                    '<span style="color: #ff0000;">✗ No GPU Adapter</span>';
                document.getElementById('gpu-capability').innerHTML = 
                    '<div>Limited to 15K objects</div>';
            }
        });
    } else {
        document.getElementById('gpu-status').innerHTML = 
            '<span style="color: #ffff00;">⚠ WebGPU Not Supported</span>';
        document.getElementById('gpu-capability').innerHTML = 
            '<div>GPU Required!</div>';
    }
}