/**
 * ALOHA Trajectory Handler
 * Loads and plays ASAT trajectories through RO-Engine's systems
 * 
 * CUTTING EDGE: Real-time or accelerated playback with smooth visualization
 * MODULAR: Thin wrapper that feeds data to existing systems
 * PERFORMANCE: Dynamic trail building, configurable playback speeds
 */

import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import ALOHATranslator from './aloha-translator.js';

export class ALOHAHandler {
    constructor(roEngine) {
        this.roEngine = roEngine;
        this.scene = roEngine.scene;
        
        // Core translator
        this.translator = new ALOHATranslator();
        
        // ASAT mesh
        this.asatMesh = null;
        this.trajectoryLine = null;
        this.dynamicTrailLine = null; // Dynamic trail that follows ASAT
        this.launchMarker = null; // Orange sphere at launch
        this.impactDebris = null; // Persistent debris at impact
        
        // Playback state
        this.isActive = false;
        this.startTime = null;
        this.currentTime = 0;
        this.playbackSpeed = 1; // Default real-time
        
        // Trajectory data
        this.trajectoryData = null;
        this.trajectoryPoints = [];
        this.dynamicTrailPoints = []; // Points for dynamic trail
        this.maxTrailPoints = 200; // Smooth trail
        
        // Trail mode (toggle with M key)
        this.showFullPath = true; // true = show full path, false = dynamic trail
        
        // ASAT info
        this.asatName = 'ASAT'; // Will be set from data
        this.asatLabel = null;
        this.asatTooltip = null;
        
        // Configuration
        this.config = {
            showConjunctions: true,
            autoTarget: true,
            playbackSpeed: 1
        };
        
        // Use RO-Engine's systems
        this.conjunctionSystem = null; // Will be set by RO-Engine
        this.impactSystem = null;      // Will be set by RO-Engine
        
        console.log('🎯 ALOHA Handler initialized with real-time playback');
    }
    
    /**
     * Load ASAT trajectory data with configuration
     */
    async loadTrajectory(config) {
        try {
            // Extract data and settings
            const alohaData = config.data || config;
            this.config = {
                showConjunctions: config.showConjunctions !== false,
                autoTarget: config.autoTarget !== false,
                playbackSpeed: config.playbackSpeed || 1
            };
            this.playbackSpeed = this.config.playbackSpeed;
            
            // Store trajectory data
            this.trajectoryData = alohaData;
            
            // Extract ASAT name from data
            this.asatName = alohaData.id || alohaData.name || 'ASAT_001';
            
            // Load into translator
            const metadata = await this.translator.loadTrajectory(alohaData);
            
            // Create ASAT mesh
            this.createASATMesh();
            
            // Initialize trajectory visualization
            this.trajectoryPoints = [];
            if (this.trajectoryLine) {
                this.trajectoryLine.dispose();
                this.trajectoryLine = null;
            }
            
            // Register with RO-Engine as a tracked object
            this.roEngine.registerTrajectoryObject({
                id: this.asatName,
                type: 'trajectory',
                mesh: this.asatMesh,
                getPosition: () => this.getCurrentPosition(),
                getVelocity: () => this.getCurrentVelocity(),
                metadata: metadata
            });
            
            // Set up keyboard handler for M key
            this.setupKeyboardHandler();
            
            console.log('✅ ALOHA trajectory loaded');
            console.log(`   Playback speed: ${this.playbackSpeed}x`);
            console.log(`   Duration: ${metadata.duration}s`);
            console.log(`   Playback time: ${metadata.duration / this.playbackSpeed}s`);
            
            return metadata;
            
        } catch (error) {
            console.error('❌ Failed to load ALOHA:', error);
            throw error;
        }
    }
    
    /**
     * Create ASAT missile mesh - simple red glowing orb
     */
    createASATMesh() {
        // Create parent container
        this.asatMesh = new BABYLON.TransformNode('asat', this.scene);
        
        // Create simple red orb - MUCH SMALLER
        const asatOrb = BABYLON.MeshBuilder.CreateSphere('asatOrb', {
            diameter: 0.001,  // Much smaller
            segments: 16
        }, this.scene);
        asatOrb.parent = this.asatMesh;
        
        // Make orb pickable for hover
        asatOrb.isPickable = true;
        asatOrb.actionManager = new BABYLON.ActionManager(this.scene);
        
        // Add hover actions
        asatOrb.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            () => this.showTooltip()
        ));
        
        asatOrb.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            () => this.hideTooltip()
        ));
        
        // Red glowing material
        const orbMaterial = new BABYLON.StandardMaterial('asatOrbMat', this.scene);
        orbMaterial.diffuseColor = new BABYLON.Color3(0.8, 0, 0);
        orbMaterial.emissiveColor = new BABYLON.Color3(1, 0.2, 0.2);
        orbMaterial.specularColor = new BABYLON.Color3(1, 0.5, 0.5);
        asatOrb.material = orbMaterial;
        
        // Create thruster particles
        let thrusterParticles = new BABYLON.ParticleSystem('thruster', 20, this.scene);
        if (BABYLON.GPUParticleSystem.IsSupported) {
            thrusterParticles = new BABYLON.GPUParticleSystem('thruster', 20, this.scene);
        }
        thrusterParticles.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", this.scene);
        thrusterParticles.emitter = this.asatMesh;
        thrusterParticles.minEmitBox = new BABYLON.Vector3(0, 0, -0.001);
        thrusterParticles.maxEmitBox = new BABYLON.Vector3(0, 0, -0.001);
        thrusterParticles.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
        thrusterParticles.color2 = new BABYLON.Color4(1, 0.2, 0, 0.5);
        thrusterParticles.minSize = 0.0001;
        thrusterParticles.maxSize = 0.0003;
        thrusterParticles.minLifeTime = 0.1;
        thrusterParticles.maxLifeTime = 0.3;
        thrusterParticles.emitRate = 30;
        thrusterParticles.direction1 = new BABYLON.Vector3(0, 0, -1);
        thrusterParticles.direction2 = new BABYLON.Vector3(0, 0, -1);
        thrusterParticles.minEmitPower = 0.01;
        thrusterParticles.maxEmitPower = 0.02;
        
        // Simple subtle pulse animation
        let pulsePhase = 0;
        this.scene.registerBeforeRender(() => {
            if (this.isActive) {
                // Gentle pulse effect
                pulsePhase += 0.05;
                const intensity = 0.2 + Math.sin(pulsePhase) * 0.1;
                orbMaterial.emissiveColor = new BABYLON.Color3(1, intensity, intensity);
            }
        });
        
        // Add glow if available
        if (this.scene.glowLayer) {
            this.scene.glowLayer.addIncludedOnlyMesh(asatOrb);
        }
        
        asatOrb.isVisible = false;
        
        // Store references
        this.asatOrb = asatOrb;
        this.thrusterParticles = thrusterParticles;
        
        // Create label that follows ASAT
        this.createASATLabel();
    }
    
    /**
     * Create persistent label for ASAT
     */
    createASATLabel() {
        // Try to get existing advancedTexture from scene
        let advancedTexture = this.scene._advancedTexture;
        
        if (!advancedTexture) {
            // Create new advancedTexture
            advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("ASATUI");
            this.scene._advancedTexture = advancedTexture;
        }
        
        // Create label rectangle - SMALLER, CLEANER
        const label = new GUI.Rectangle();
        label.width = "110px";
        label.height = "26px";
        label.cornerRadius = 3;
        label.color = "red";
        label.thickness = 1;
        label.background = "rgba(0, 0, 0, 0.75)";
        advancedTexture.addControl(label);
        
        // Create text block - EVEN SMALLER
        const text = new GUI.TextBlock();
        text.text = this.asatName;
        text.color = "white";
        text.fontSize = 10;  // 20% smaller (was 12)
        text.fontWeight = "600";
        label.addControl(text);
        
        // Add hover interaction to label
        label.isPointerBlocker = true;
        label.onPointerEnterObservable.add(() => this.showTooltip());
        label.onPointerOutObservable.add(() => this.hideTooltip());
        
        // Link to ASAT mesh
        label.linkWithMesh(this.asatMesh);
        label.linkOffsetY = -25;
        
        this.asatLabel = label;
        this.asatLabel.isVisible = false; // Start hidden
    }
    
    /**
     * Create full trajectory path visualization
     */
    createFullTrajectoryPath() {
        if (!this.translator.isLoaded) return;
        
        // Build full path from pre-processed positions
        const fullPath = [];
        
        // Sample the trajectory at regular intervals
        const sampleInterval = 1; // Every second
        for (let t = 0; t <= this.translator.duration; t += sampleInterval) {
            const state = this.translator.getStateAtTime(t);
            if (state && state.position) {
                fullPath.push(state.position.clone());
            }
        }
        
        if (fullPath.length < 2) return;
        
        // Create smooth path using spline
        const curve = BABYLON.Curve3.CreateCatmullRomSpline(
            fullPath, 
            Math.min(100, fullPath.length), 
            false
        );
        
        // Create the full trajectory line
        this.trajectoryLine = BABYLON.MeshBuilder.CreateLines('asatFullPath', {
            points: curve.getPoints(),
            updatable: false
        }, this.scene);
        
        this.trajectoryLine.color = new BABYLON.Color3(1, 0, 0); // Red
        this.trajectoryLine.alpha = 0.5; // Semi-transparent to show it's the path
        
        // Parent to Earth so trajectory rotates with planet
        const earthMesh = this.scene.getMeshByName('earth');
        if (earthMesh) {
            this.trajectoryLine.parent = earthMesh;
        }
    }
    
    /**
     * Start trajectory playback
     */
    start() {
        if (!this.translator.isLoaded) {
            console.error('❌ Trajectory not loaded');
            return;
        }
        
        this.isActive = true;
        this.startTime = Date.now();
        this.currentTime = 0;
        
        // Create full trajectory path visualization
        if (this.trajectoryLine) {
            this.trajectoryLine.dispose();
            this.trajectoryLine = null;
        }
        this.createFullTrajectoryPath();
        
        // Create orange launch marker
        this.createLaunchMarker();
        
        // Show ASAT components
        if (this.asatOrb) this.asatOrb.isVisible = true;
        if (this.thrusterParticles) this.thrusterParticles.start();
        if (this.asatLabel) this.asatLabel.isVisible = true;
        
        // Set trajectory visibility based on mode
        if (this.trajectoryLine) {
            this.trajectoryLine.isVisible = this.showFullPath;
        }
        
        // Get conjunction system from RO-Engine
        if (!this.conjunctionSystem && this.roEngine.conjunctionSystem) {
            this.conjunctionSystem = this.roEngine.conjunctionSystem;
        }
        
        // Register update with scene
        this.scene.registerBeforeRender(() => {
            if (this.isActive) {
                this.update();
            }
        });
        
        const playbackMode = this.playbackSpeed === 0 ? 'instant' : 
                            this.playbackSpeed === 1 ? 'real-time' : 
                            `${this.playbackSpeed}x speed`;
        
        console.log(`🚀 ASAT trajectory started (${playbackMode})`);
        
        // Notify system
        window.dispatchEvent(new CustomEvent('asat-launched', {
            detail: {
                duration: this.translator.duration,
                playbackSpeed: this.playbackSpeed,
                launchLocation: this.translator.getLaunchLocation()
            }
        }));
    }
    
    /**
     * Update ASAT position using global simulation time
     */
    update() {
        // Use global physics time multiplier from RO-Engine
        const elapsed = (Date.now() - this.startTime) / 1000;
        const globalSpeed = this.roEngine.physicsTimeMultiplier || 1;
        
        // Apply global simulation speed
        this.currentTime = elapsed * globalSpeed;
        
        // Check if complete
        if (this.currentTime >= this.translator.duration) {
            this.onImpact();
            return;
        }
        
        // Get current state
        const state = this.translator.getStateAtTime(this.currentTime);
        
        // Update mesh position
        if (this.asatMesh) {
            this.asatMesh.position = state.position;
            
            // Parent to Earth if not already
            const earthMesh = this.scene.getMeshByName('earth');
            if (earthMesh && !this.asatMesh.parent) {
                this.asatMesh.parent = earthMesh;
            }
            
            // Update dynamic trail if in dynamic mode
            if (!this.showFullPath) {
                this.updateDynamicTrail(state.position);
            }
        }
        
        // Check conjunctions if enabled
        if (this.config.showConjunctions && this.conjunctionSystem) {
            const conjunctions = this.conjunctionSystem.checkObjectConjunctions(
                { id: 'ASAT_001', mesh: this.asatMesh },
                state.position,
                state.velocity
            );
            
            // Log critical events
            conjunctions.forEach(conj => {
                if (conj.severity === 'CRITICAL' || conj.severity === 'WARNING') {
                    console.warn(`⚠️ ASAT Conjunction: ${conj.distance.toFixed(1)}km from ${conj.target}`);
                }
            });
        }
    }
    
    /**
     * Get current position
     */
    getCurrentPosition() {
        if (!this.asatMesh) return new BABYLON.Vector3.Zero();
        return this.asatMesh.position.clone();
    }
    
    /**
     * Get current velocity
     */
    getCurrentVelocity() {
        if (!this.translator.isLoaded) return new BABYLON.Vector3.Zero();
        const state = this.translator.getStateAtTime(this.currentTime);
        return state ? state.velocity : new BABYLON.Vector3.Zero();
    }
    
    /**
     * Handle impact at end of trajectory
     */
    onImpact() {
        console.log('💥 ASAT impact!');
        
        const finalState = this.translator.getStateAtTime(this.translator.duration);
        
        // Create explosion animation
        this.createExplosion(finalState.position);
        
        // Find closest target if auto-target enabled
        let target = null;
        if (this.config.autoTarget) {
            target = this.findClosestTarget(finalState.position);
            
            if (target) {
                // Use RO-Engine's impact system if available
                if (this.roEngine.triggerImpact) {
                    this.roEngine.triggerImpact(
                        target,
                        finalState.position,
                        finalState.velocity
                    );
                }
                
                console.log(`💥 Hit target: ${target.id || 'unknown'}`);
            }
        }
        
        // Stop playback after a delay to see explosion
        setTimeout(() => this.stop(), 2000);
        
        // Notify system
        window.dispatchEvent(new CustomEvent('asat-impact', {
            detail: {
                position: finalState.position,
                velocity: finalState.velocity,
                target: target?.id
            }
        }));
    }
    
    /**
     * Create explosion animation
     */
    createExplosion(position) {
        // Create persistent debris cloud first
        this.createPersistentDebris(position);
        
        // Create expanding sphere for explosion
        const explosion = BABYLON.MeshBuilder.CreateSphere('explosion', {
            diameter: 0.01
        }, this.scene);
        
        explosion.position = position.clone();
        
        // Parent to Earth so explosion stays at correct location
        const earthMesh = this.scene.getMeshByName('earth');
        if (earthMesh) {
            explosion.parent = earthMesh;
        }
        
        // Bright orange/yellow material
        const material = new BABYLON.StandardMaterial('explosionMat', this.scene);
        material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
        material.diffuseColor = new BABYLON.Color3(1, 0.3, 0);
        explosion.material = material;
        
        // Animate expansion and fade
        let scale = 1;
        let alpha = 1;
        const animationInterval = setInterval(() => {
            scale += 0.3;
            alpha -= 0.05;
            
            explosion.scaling = new BABYLON.Vector3(scale, scale, scale);
            material.alpha = Math.max(0, alpha);
            
            if (alpha <= 0) {
                clearInterval(animationInterval);
                explosion.dispose();
            }
        }, 50);
        
        // Create flash effect
        const flash = BABYLON.MeshBuilder.CreateSphere('flash', {
            diameter: 0.02
        }, this.scene);
        
        flash.position = position.clone();
        
        // Parent flash to Earth as well
        if (earthMesh) {
            flash.parent = earthMesh;
        }
        const flashMat = new BABYLON.StandardMaterial('flashMat', this.scene);
        flashMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        flash.material = flashMat;
        
        // Quick flash
        setTimeout(() => flash.dispose(), 100);
        
        // Add debris particles if available
        if (this.scene.particleSystem) {
            this.createDebrisParticles(position);
        }
    }
    
    /**
     * Create debris particle effect
     */
    createDebrisParticles(position) {
        // Particle system for debris
        const particleSystem = new BABYLON.ParticleSystem('debris', 50, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture('/textures/flare.png', this.scene);
        
        // Create an emitter mesh parented to Earth
        const emitterMesh = new BABYLON.TransformNode('debrisEmitter', this.scene);
        emitterMesh.position = position.clone();
        
        const earthMesh = this.scene.getMeshByName('earth');
        if (earthMesh) {
            emitterMesh.parent = earthMesh;
        }
        
        particleSystem.emitter = emitterMesh;
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.001, -0.001, -0.001);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.001, 0.001, 0.001);
        
        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 0, 0, 1);
        particleSystem.colorDead = new BABYLON.Color4(0.5, 0, 0, 0);
        
        particleSystem.minSize = 0.0001;
        particleSystem.maxSize = 0.0005;
        
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 2;
        
        particleSystem.emitRate = 100;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-1, -1, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
        
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;
        
        particleSystem.minEmitPower = 0.01;
        particleSystem.maxEmitPower = 0.05;
        particleSystem.updateSpeed = 0.01;
        
        particleSystem.start();
        
        // Stop after brief burst
        setTimeout(() => particleSystem.stop(), 500);
        setTimeout(() => particleSystem.dispose(), 3000);
    }
    
    /**
     * Find closest target satellite
     */
    findClosestTarget(position) {
        const allObjects = this.roEngine.getAllObjects();
        let closest = null;
        let minDistance = Infinity;
        
        allObjects.forEach(obj => {
            if (obj.mesh && obj.mesh !== this.asatMesh) {
                const distance = BABYLON.Vector3.Distance(position, obj.mesh.position);
                if (distance < minDistance && distance < 0.01) { // Within 10km
                    minDistance = distance;
                    closest = obj;
                }
            }
        });
        
        return closest;
    }
    
    /**
     * Create persistent debris cloud at impact location
     */
    createPersistentDebris(position) {
        // Clean up any existing debris
        if (this.impactDebris) {
            this.impactDebris.forEach(debris => debris.dispose());
            this.impactDebris = [];
        }
        
        this.impactDebris = [];
        const earthMesh = this.scene.getMeshByName('earth');
        
        // Create multiple small debris pieces
        const debrisCount = 8;
        for (let i = 0; i < debrisCount; i++) {
            const debris = BABYLON.MeshBuilder.CreateSphere(`debris_${i}`, {
                diameter: 0.002,
                segments: 4
            }, this.scene);
            
            // Position with slight random offset
            const offset = new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            );
            debris.position = position.add(offset);
            
            // Grey/dark material for debris
            const material = new BABYLON.StandardMaterial(`debrisMat_${i}`, this.scene);
            material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            material.alpha = 0.8;
            debris.material = material;
            
            // Parent to Earth
            if (earthMesh) {
                debris.parent = earthMesh;
            }
            
            this.impactDebris.push(debris);
        }
        
        // Create a glowing impact marker
        const impactMarker = BABYLON.MeshBuilder.CreateSphere('impactMarker', {
            diameter: 0.005,
            segments: 8
        }, this.scene);
        
        impactMarker.position = position.clone();
        
        // Glowing red material
        const markerMat = new BABYLON.StandardMaterial('impactMarkerMat', this.scene);
        markerMat.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.2);
        markerMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        impactMarker.material = markerMat;
        
        if (earthMesh) {
            impactMarker.parent = earthMesh;
        }
        
        this.impactDebris.push(impactMarker);
        
        console.log('💥 Persistent debris cloud created');
    }
    
    /**
     * Create orange launch marker at start position
     */
    createLaunchMarker() {
        if (this.launchMarker) {
            this.launchMarker.dispose();
        }
        
        // Get launch position
        const launchState = this.translator.getStateAtTime(0);
        
        // Create orange sphere - 50% SMALLER
        this.launchMarker = BABYLON.MeshBuilder.CreateSphere('launchMarker', {
            diameter: 0.001, // 50% smaller than before
            segments: 12
        }, this.scene);
        
        this.launchMarker.position = launchState.position.clone();
        
        // Orange material
        const material = new BABYLON.StandardMaterial('launchMat', this.scene);
        material.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Orange
        material.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        this.launchMarker.material = material;
        
        // Parent to Earth
        const earthMesh = this.scene.getMeshByName('earth');
        if (earthMesh) {
            this.launchMarker.parent = earthMesh;
        }
        
        console.log('🟠 Launch marker created at', launchState.position);
    }
    
    /**
     * Update dynamic trail that follows ASAT
     */
    updateDynamicTrail(position) {
        // Add current position to trail
        this.dynamicTrailPoints.push(position.clone());
        
        // Limit trail length
        if (this.dynamicTrailPoints.length > this.maxTrailPoints) {
            this.dynamicTrailPoints.shift();
        }
        
        // Update or create trail line
        if (this.dynamicTrailPoints.length > 1) {
            if (this.dynamicTrailLine) {
                this.dynamicTrailLine.dispose();
            }
            
            this.dynamicTrailLine = BABYLON.MeshBuilder.CreateLines('dynamicTrail', {
                points: this.dynamicTrailPoints,
                updatable: false
            }, this.scene);
            
            this.dynamicTrailLine.color = new BABYLON.Color3(1, 0, 0); // Red
            this.dynamicTrailLine.alpha = 0.8;
            
            // Parent to Earth
            const earthMesh = this.scene.getMeshByName('earth');
            if (earthMesh) {
                this.dynamicTrailLine.parent = earthMesh;
            }
        }
    }
    
    /**
     * Setup keyboard handler for trail mode toggle
     */
    setupKeyboardHandler() {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'm' || event.key === 'M') {
                this.toggleTrailMode();
            }
        });
    }
    
    /**
     * Toggle between full path and dynamic trail
     */
    toggleTrailMode() {
        this.showFullPath = !this.showFullPath;
        
        // Update visibility
        if (this.trajectoryLine) {
            this.trajectoryLine.isVisible = this.showFullPath;
        }
        
        if (!this.showFullPath) {
            // Clear dynamic trail to start fresh
            this.dynamicTrailPoints = [];
            if (this.dynamicTrailLine) {
                this.dynamicTrailLine.dispose();
                this.dynamicTrailLine = null;
            }
        } else {
            // Clear dynamic trail when switching to full path
            if (this.dynamicTrailLine) {
                this.dynamicTrailLine.dispose();
                this.dynamicTrailLine = null;
            }
        }
        
        console.log(`Trail mode: ${this.showFullPath ? 'Full Path' : 'Dynamic Trail'}`);
    }
    
    /**
     * Show tooltip with ASAT details
     */
    showTooltip() {
        if (!this.isActive) return;
        
        const state = this.translator.getStateAtTime(this.currentTime);
        
        // Get advancedTexture
        let advancedTexture = this.scene._advancedTexture;
        if (!advancedTexture) {
            console.warn('No advancedTexture for tooltip');
            return;
        }
        
        // Create tooltip if not exists
        if (!this.asatTooltip) {
            const tooltip = new GUI.Rectangle();
            tooltip.width = "200px";
            tooltip.height = "100px";
            tooltip.cornerRadius = 10;
            tooltip.color = "white";
            tooltip.thickness = 2;
            tooltip.background = "rgba(0, 0, 0, 0.9)";
            advancedTexture.addControl(tooltip);
            
            const text = new GUI.TextBlock();
            text.color = "white";
            text.fontSize = 12;
            text.textWrapping = true;
            tooltip.addControl(text);
            
            tooltip.linkWithMesh(this.asatMesh);
            tooltip.linkOffsetY = -70;
            
            this.asatTooltip = tooltip;
            this.asatTooltipText = text;
        }
        
        // Update tooltip text
        const progress = (this.currentTime / this.translator.duration * 100).toFixed(1);
        const velocity = state.velocity.length() * 6371; // Convert to km/s
        
        this.asatTooltipText.text = 
            `${this.asatName}\n` +
            `Altitude: ${state.altitude.toFixed(1)} km\n` +
            `Velocity: ${velocity.toFixed(1)} km/s\n` +
            `Progress: ${progress}%\n` +
            `Time: ${this.currentTime.toFixed(0)}/${this.translator.duration}s`;
        
        this.asatTooltip.isVisible = true;
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.asatTooltip) {
            this.asatTooltip.isVisible = false;
        }
    }
    
    /**
     * Stop trajectory playback
     */
    stop() {
        this.isActive = false;
        
        // Hide ASAT components
        if (this.asatOrb) this.asatOrb.isVisible = false;
        if (this.thrusterParticles) this.thrusterParticles.stop();
        if (this.asatLabel) this.asatLabel.isVisible = false;
        
        // Hide dynamic trail
        if (this.dynamicTrailLine) {
            this.dynamicTrailLine.dispose();
            this.dynamicTrailLine = null;
        }
        this.dynamicTrailPoints = [];
        
        console.log('⏹️ ASAT simulation stopped');
    }
    
    /**
     * Cleanup resources
     */
    dispose() {
        this.stop();
        
        if (this.asatMesh) {
            this.asatMesh.dispose();
            this.asatMesh = null;
        }
        
        if (this.trajectoryLine) {
            this.trajectoryLine.dispose();
            this.trajectoryLine = null;
        }
        
        if (this.launchMarker) {
            this.launchMarker.dispose();
            this.launchMarker = null;
        }
        
        if (this.impactDebris) {
            this.impactDebris.forEach(debris => debris.dispose());
            this.impactDebris = [];
        }
        
        this.trajectoryPoints = [];
        this.translator = null;
        
        console.log('🧹 ALOHA Handler disposed');
    }
}

export default ALOHAHandler;