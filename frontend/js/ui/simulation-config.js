/**
 * SIMULATION CONFIGURATION MODULE
 * Handles simulation environment setup and presets
 * Flight Rules: Modular, <1000 lines, clean interfaces
 */

export class SimulationConfig {
    constructor() {
        // Configuration state
        this.currentConfig = {
            totalObjects: 100000,
            distribution: {
                satellites: 0.8,
                debris: 0.2
            },
            orbitalDistribution: {
                LEO: 0.6,
                MEO: 0.25,
                GEO: 0.10,
                HEO: 0.05
            },
            features: {
                collisions: true,
                debrisGeneration: false,
                orbitalDecay: false
            }
        };
        
        // Preset configurations
        this.presets = {
            starlink: {
                name: 'Starlink Constellation',
                totalObjects: 4425,
                distribution: { satellites: 1.0, debris: 0 },
                orbitalDistribution: { LEO: 1.0, MEO: 0, GEO: 0, HEO: 0 },
                features: { collisions: true, debrisGeneration: false, orbitalDecay: false }
            },
            blueorigin: {
                name: 'Blue Origin Kuiper',
                totalObjects: 3236,
                distribution: { satellites: 1.0, debris: 0 },
                orbitalDistribution: { LEO: 1.0, MEO: 0, GEO: 0, HEO: 0 },
                features: { collisions: true, debrisGeneration: false, orbitalDecay: false }
            },
            kessler15: {
                name: 'Kessler Syndrome (15 Year Projection)',
                totalObjects: 100000,
                distribution: { satellites: 0.3, debris: 0.7 },
                orbitalDistribution: { LEO: 0.8, MEO: 0.15, GEO: 0.04, HEO: 0.01 },
                features: { collisions: true, debrisGeneration: true, orbitalDecay: true }
            },
            anomaly: {
                name: 'Anomaly Orbit Configuration',
                totalObjects: 50000,
                distribution: { satellites: 0.6, debris: 0.4 },
                orbitalDistribution: { LEO: 0.4, MEO: 0.3, GEO: 0.2, HEO: 0.1 },
                features: { collisions: true, debrisGeneration: true, orbitalDecay: false }
            },
            debris: {
                name: 'Debris Field',
                totalObjects: 50000,
                distribution: { satellites: 0.05, debris: 0.95 },
                orbitalDistribution: { LEO: 0.7, MEO: 0.2, GEO: 0.08, HEO: 0.02 },
                features: { collisions: true, debrisGeneration: false, orbitalDecay: true }
            },
            current: {
                name: 'Current Tracked Catalog',
                totalObjects: 27000,
                distribution: { satellites: 0.3, debris: 0.7 },
                orbitalDistribution: { LEO: 0.65, MEO: 0.20, GEO: 0.12, HEO: 0.03 },
                features: { collisions: true, debrisGeneration: false, orbitalDecay: false }
            }
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize the configuration panel
     */
    initialize() {
        if (this.initialized) return;
        
        this.attachEventListeners();
        this.updateDisplay();
        this.initialized = true;
        
        console.log('Simulation configuration panel initialized');
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetName = btn.dataset.preset;
                this.loadPreset(presetName);
            });
        });
        
        // Scale buttons
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const count = parseInt(btn.dataset.count);
                this.setObjectCount(count);
                
                // Update active state
                document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Sliders
        const totalSlider = document.getElementById('total-objects-slider');
        if (totalSlider) {
            totalSlider.addEventListener('input', (e) => {
                this.currentConfig.totalObjects = parseInt(e.target.value);
                this.updateDisplay();
            });
        }
        
        // Distribution sliders
        const satPercent = document.getElementById('sat-percent');
        const debrisPercent = document.getElementById('debris-percent');
        
        if (satPercent) {
            satPercent.addEventListener('input', (e) => {
                const satVal = parseInt(e.target.value);
                const debrisVal = 100 - satVal;
                
                this.currentConfig.distribution.satellites = satVal / 100;
                this.currentConfig.distribution.debris = debrisVal / 100;
                
                if (debrisPercent) {
                    debrisPercent.value = debrisVal;
                }
                
                this.updateDisplay();
            });
        }
        
        if (debrisPercent) {
            debrisPercent.addEventListener('input', (e) => {
                const debrisVal = parseInt(e.target.value);
                const satVal = 100 - debrisVal;
                
                this.currentConfig.distribution.debris = debrisVal / 100;
                this.currentConfig.distribution.satellites = satVal / 100;
                
                if (satPercent) {
                    satPercent.value = satVal;
                }
                
                this.updateDisplay();
            });
        }
        
        // Orbital distribution sliders
        const orbitalSliders = ['leo', 'meo', 'geo', 'heo'];
        orbitalSliders.forEach(orbit => {
            const slider = document.getElementById(`${orbit}-percent`);
            if (slider) {
                slider.addEventListener('input', () => this.updateOrbitalDistribution());
            }
        });
        
        // Feature checkboxes
        const collisionCheck = document.getElementById('enable-collisions');
        if (collisionCheck) {
            collisionCheck.addEventListener('change', (e) => {
                this.currentConfig.features.collisions = e.target.checked;
            });
        }
        
        const debrisGenCheck = document.getElementById('enable-debris-gen');
        if (debrisGenCheck) {
            debrisGenCheck.addEventListener('change', (e) => {
                this.currentConfig.features.debrisGeneration = e.target.checked;
            });
        }
        
        const decayCheck = document.getElementById('enable-decay');
        if (decayCheck) {
            decayCheck.addEventListener('change', (e) => {
                this.currentConfig.features.orbitalDecay = e.target.checked;
            });
        }
        
        // Build button
        const buildBtn = document.getElementById('build-simulation-btn');
        if (buildBtn) {
            buildBtn.addEventListener('click', () => this.buildSimulation());
        }
        
        // Reset button
        const resetBtn = document.getElementById('reset-config-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
    }
    
    /**
     * Load a preset configuration
     */
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.warn(`Unknown preset: ${presetName}`);
            return;
        }
        
        // Apply preset to current config
        this.currentConfig = {
            totalObjects: preset.totalObjects,
            distribution: { ...preset.distribution },
            orbitalDistribution: { ...preset.orbitalDistribution },
            features: { ...preset.features }
        };
        
        // Update UI
        this.updateUIFromConfig();
        this.updateDisplay();
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(`Loaded preset: ${preset.name}`, 'info');
        }
        
        console.log(`Loaded preset: ${preset.name}`, this.currentConfig);
    }
    
    /**
     * Set object count
     */
    setObjectCount(count) {
        this.currentConfig.totalObjects = count;
        
        // Update slider
        const slider = document.getElementById('total-objects-slider');
        if (slider) {
            slider.value = count;
        }
        
        this.updateDisplay();
    }
    
    /**
     * Update orbital distribution from sliders
     */
    updateOrbitalDistribution() {
        const leo = parseInt(document.getElementById('leo-percent')?.value || 60);
        const meo = parseInt(document.getElementById('meo-percent')?.value || 25);
        const geo = parseInt(document.getElementById('geo-percent')?.value || 10);
        const heo = parseInt(document.getElementById('heo-percent')?.value || 5);
        
        const total = leo + meo + geo + heo;
        
        // Normalize to 100%
        if (total > 0) {
            this.currentConfig.orbitalDistribution.LEO = leo / total;
            this.currentConfig.orbitalDistribution.MEO = meo / total;
            this.currentConfig.orbitalDistribution.GEO = geo / total;
            this.currentConfig.orbitalDistribution.HEO = heo / total;
        }
        
        // Update display
        document.querySelectorAll('.orbit-item .orbit-value').forEach((elem, idx) => {
            const values = [
                this.currentConfig.orbitalDistribution.LEO,
                this.currentConfig.orbitalDistribution.MEO,
                this.currentConfig.orbitalDistribution.GEO,
                this.currentConfig.orbitalDistribution.HEO
            ];
            elem.textContent = `${Math.round(values[idx] * 100)}%`;
        });
        
        const totalElem = document.getElementById('orbit-total');
        if (totalElem) {
            totalElem.textContent = `${Math.round(total)}%`;
            totalElem.style.color = total === 100 ? '#00ff00' : '#ff0000';
        }
        
        this.updateDisplay();
    }
    
    /**
     * Update UI from current config
     */
    updateUIFromConfig() {
        // Update total objects
        const totalSlider = document.getElementById('total-objects-slider');
        if (totalSlider) {
            totalSlider.value = this.currentConfig.totalObjects;
        }
        
        // Update distribution
        const satPercent = document.getElementById('sat-percent');
        const debrisPercent = document.getElementById('debris-percent');
        if (satPercent) {
            satPercent.value = this.currentConfig.distribution.satellites * 100;
        }
        if (debrisPercent) {
            debrisPercent.value = this.currentConfig.distribution.debris * 100;
        }
        
        // Update orbital distribution
        document.getElementById('leo-percent').value = this.currentConfig.orbitalDistribution.LEO * 100;
        document.getElementById('meo-percent').value = this.currentConfig.orbitalDistribution.MEO * 100;
        document.getElementById('geo-percent').value = this.currentConfig.orbitalDistribution.GEO * 100;
        document.getElementById('heo-percent').value = this.currentConfig.orbitalDistribution.HEO * 100;
        
        // Update features
        document.getElementById('enable-collisions').checked = this.currentConfig.features.collisions;
        document.getElementById('enable-debris-gen').checked = this.currentConfig.features.debrisGeneration;
        document.getElementById('enable-decay').checked = this.currentConfig.features.orbitalDecay;
    }
    
    /**
     * Update display values
     */
    updateDisplay() {
        // Update total objects display
        const totalValue = document.getElementById('total-objects-value');
        if (totalValue) {
            totalValue.textContent = this.currentConfig.totalObjects.toLocaleString();
        }
        
        // Update distribution percentages
        const satValue = document.querySelector('#sat-percent + .dist-value');
        const debrisValue = document.querySelector('#debris-percent + .dist-value');
        if (satValue) {
            satValue.textContent = `${Math.round(this.currentConfig.distribution.satellites * 100)}%`;
        }
        if (debrisValue) {
            debrisValue.textContent = `${Math.round(this.currentConfig.distribution.debris * 100)}%`;
        }
        
        // Update summary
        const summaryTotal = document.getElementById('summary-total');
        const summarySats = document.getElementById('summary-sats');
        const summaryDebris = document.getElementById('summary-debris');
        
        if (summaryTotal) {
            summaryTotal.textContent = this.currentConfig.totalObjects.toLocaleString();
        }
        if (summarySats) {
            const satCount = Math.round(this.currentConfig.totalObjects * this.currentConfig.distribution.satellites);
            summarySats.textContent = satCount.toLocaleString();
        }
        if (summaryDebris) {
            const debrisCount = Math.round(this.currentConfig.totalObjects * this.currentConfig.distribution.debris);
            summaryDebris.textContent = debrisCount.toLocaleString();
        }
    }
    
    /**
     * Build simulation with current configuration
     */
    async buildSimulation() {
        console.log('Building simulation with config:', this.currentConfig);
        
        // Show loading state
        const buildBtn = document.getElementById('build-simulation-btn');
        if (buildBtn) {
            buildBtn.textContent = 'BUILDING...';
            buildBtn.disabled = true;
        }
        
        try {
            // Apply configuration to physics engine
            if (window.gpuPhysicsEngine) {
                await window.gpuPhysicsEngine.populateSpace(
                    this.currentConfig.totalObjects,
                    this.currentConfig
                );
                
                // Switch to mission control view
                const missionControlTab = document.querySelector('.nav-item[data-content="mission-control"]');
                if (missionControlTab) {
                    missionControlTab.click();
                }
                
                // Show success notification
                if (window.showNotification) {
                    window.showNotification(
                        `Simulation built: ${this.currentConfig.totalObjects.toLocaleString()} objects`,
                        'success'
                    );
                }
            } else {
                throw new Error('Physics engine not initialized');
            }
        } catch (error) {
            console.error('Failed to build simulation:', error);
            if (window.showNotification) {
                window.showNotification('Failed to build simulation', 'error');
            }
        } finally {
            // Reset button state
            if (buildBtn) {
                buildBtn.textContent = 'BUILD SIMULATION';
                buildBtn.disabled = false;
            }
        }
    }
    
    /**
     * Reset to default configuration
     */
    resetToDefaults() {
        this.currentConfig = {
            totalObjects: 100000,
            distribution: {
                satellites: 0.8,
                debris: 0.2
            },
            orbitalDistribution: {
                LEO: 0.6,
                MEO: 0.25,
                GEO: 0.10,
                HEO: 0.05
            },
            features: {
                collisions: true,
                debrisGeneration: false,
                orbitalDecay: false
            }
        };
        
        this.updateUIFromConfig();
        this.updateDisplay();
        
        if (window.showNotification) {
            window.showNotification('Configuration reset to defaults', 'info');
        }
    }
    
    /**
     * Get current configuration
     */
    getConfiguration() {
        return { ...this.currentConfig };
    }
}

// Export singleton instance
export const simulationConfig = new SimulationConfig();