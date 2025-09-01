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
        this.apogeeMarker = null; // Marker at highest point
        this.timeToImpactLabel = null; // Countdown timer
        this.groundTrackLine = null; // Ground projection
        
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
        this.tooltipUpdateInterval = null;
        
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
     * Create ASAT missile mesh - loads Mica missile model
     */
    createASATMesh() {
        // Create parent container
        this.asatMesh = new BABYLON.TransformNode('asat', this.scene);
        
        // Create temporary triangle shape as fallback
        const asatOrb = new BABYLON.Mesh('asatOrb', this.scene);
        
        // Define triangle vertices (fallback)
        const positions = [
            0, 0.001, 0,    // Top vertex
            -0.0008, -0.0008, 0,  // Bottom left
            0.0008, -0.0008, 0    // Bottom right
        ];
        
        const indices = [0, 1, 2]; // Single triangle face
        
        // Create vertex data
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.applyToMesh(asatOrb);
        
        asatOrb.parent = this.asatMesh;
        
        // Make orb pickable for hover
        asatOrb.isPickable = true;
        asatOrb.enablePointerMoveEvents = true; // Ensure pointer events work
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
        
        // Red glowing material (for fallback)
        const orbMaterial = new BABYLON.StandardMaterial('asatOrbMat', this.scene);
        orbMaterial.diffuseColor = new BABYLON.Color3(0.8, 0, 0);
        orbMaterial.emissiveColor = new BABYLON.Color3(1, 0.2, 0.2);
        orbMaterial.specularColor = new BABYLON.Color3(1, 0.5, 0.5);
        asatOrb.material = orbMaterial;
        
        // Load the Mica missile model
        BABYLON.SceneLoader.LoadAssetContainer(
            "/assets/red-orbit/",
            "mica_anti_aircraft_missile_free.glb",
            this.scene,
            (container) => {
                // Remove temporary triangle
                asatOrb.dispose();
                
                // Add loaded meshes to scene
                const loadedMeshes = container.instantiateModelsToScene();
                
                // Get the root mesh
                const missileMesh = loadedMeshes.rootNodes[0];
                
                if (missileMesh) {
                    // Parent to our ASAT container
                    missileMesh.parent = this.asatMesh;
                    
                    // Scale appropriately for our scene (adjust as needed)
                    missileMesh.scaling = new BABYLON.Vector3(0.0002, 0.0002, 0.0002);
                    
                    // Rotate to point nose forward along trajectory
                    missileMesh.rotation.x = Math.PI / 2; // Point nose up
                    
                    // Store reference to the actual missile mesh
                    this.asatOrb = missileMesh;
                    
                    // Apply red glowing material to all child meshes
                    loadedMeshes.animationGroups.forEach(ag => ag.stop());
                    missileMesh.getChildMeshes().forEach(mesh => {
                        // Make pickable for hover
                        mesh.isPickable = true;
                        mesh.enablePointerMoveEvents = true;
                        mesh.actionManager = new BABYLON.ActionManager(this.scene);
                        
                        // Add hover actions
                        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                            BABYLON.ActionManager.OnPointerOverTrigger,
                            () => this.showTooltip()
                        ));
                        
                        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                            BABYLON.ActionManager.OnPointerOutTrigger,
                            () => this.hideTooltip()
                        ));
                        
                        // Apply red glowing material
                        const material = new BABYLON.StandardMaterial(`asatMat_${mesh.name}`, this.scene);
                        material.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
                        material.specularColor = new BABYLON.Color3(1, 0.2, 0.2);
                        material.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
                        material.specularPower = 64;
                        mesh.material = material;
                        
                        // Add glow if available
                        if (this.scene.glowLayer) {
                            this.scene.glowLayer.addIncludedOnlyMesh(mesh);
                        }
                    });
                }
            },
            null,
            (scene, message) => {
                console.warn("Failed to load Mica missile model:", message);
                // Keep using the triangle fallback
            }
        );
        
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
     * Ensure GUI texture is properly initialized with correct resolution
     */
    ensureGUITexture() {
        if (!this.scene._advancedTexture) {
            // Create with explicit settings for better quality
            const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("ASATUI", true, this.scene);
            
            // Force ideal size for crisp rendering
            const engine = this.scene.getEngine();
            advancedTexture.idealWidth = engine.getRenderWidth();
            advancedTexture.idealHeight = engine.getRenderHeight();
            advancedTexture.renderAtIdealSize = true;
            
            // Store reference
            this.scene._advancedTexture = advancedTexture;
            
            // Update on resize for consistent quality
            window.addEventListener('resize', () => {
                if (this.scene._advancedTexture) {
                    this.scene._advancedTexture.idealWidth = engine.getRenderWidth();
                    this.scene._advancedTexture.idealHeight = engine.getRenderHeight();
                    this.scene._advancedTexture.markAsDirty();
                }
            });
        }
        return this.scene._advancedTexture;
    }
    
    /**
     * Create persistent label for ASAT
     */
    createASATLabel() {
        // Ensure GUI texture exists with proper resolution
        const advancedTexture = this.ensureGUITexture();
        if (!advancedTexture) return;
        
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
        
        // Make label interactive for hover
        label.isPointerBlocker = true;
        label.onPointerEnterObservable.add(() => {
            label.background = "rgba(50, 0, 0, 0.9)";
            this.showTooltip();
        });
        label.onPointerOutObservable.add(() => {
            label.background = "rgba(0, 0, 0, 0.75)";
            this.hideTooltip();
        });
        
        // Link to ASAT mesh
        label.linkWithMesh(this.asatMesh);
        label.linkOffsetY = -25;
        
        // Add occlusion check for ASAT label
        this.scene.registerBeforeRender(() => {
            if (label && this.asatMesh && this.isActive) {
                // Check if ASAT is behind Earth
                const camera = this.scene.activeCamera;
                const earthCenter = BABYLON.Vector3.Zero();
                const asatPos = this.asatMesh.getAbsolutePosition();
                const cameraPos = camera.position;
                
                // Check if ASAT is on the opposite side of Earth from camera
                const toASAT = asatPos.subtract(earthCenter);
                const toCamera = cameraPos.subtract(earthCenter);
                const dot = BABYLON.Vector3.Dot(toASAT, toCamera);
                
                // Only show label if ASAT is visible and on same side as camera
                label.isVisible = this.asatLabel && this.asatLabel._shouldBeVisible && dot > 0;
            }
        });
        
        this.asatLabel = label;
        this.asatLabel._shouldBeVisible = false; // Track intended visibility
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
        
        // Make line hoverable to show trajectory info
        this.trajectoryLine.isPickable = true;
        this.trajectoryLine.enablePointerMoveEvents = true;
        this.trajectoryLine.actionManager = new BABYLON.ActionManager(this.scene);
        
        // Store trajectory metadata
        this.trajectoryLine.metadata = {
            launchName: this.asatName || 'ASAT',
            duration: this.translator.duration,
            launchLat: this.translator.getLaunchLocation()?.latitude || 0,
            launchLon: this.translator.getLaunchLocation()?.longitude || 0,
            maxAltitude: 0 // Will be calculated
        };
        
        // Calculate max altitude for metadata
        for (let t = 0; t <= this.translator.duration; t += 1) {
            const state = this.translator.getStateAtTime(t);
            if (state && state.position) {
                const altitude = (state.position.length() - 1) * 6371;
                if (altitude > this.trajectoryLine.metadata.maxAltitude) {
                    this.trajectoryLine.metadata.maxAltitude = altitude;
                }
            }
        }
        
        this.trajectoryLine.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            () => {
                this.trajectoryLine.color = new BABYLON.Color3(1, 0.5, 0.5); // Lighter when hovered
                this.trajectoryLine.alpha = 0.8;
                this.showTrajectoryTooltip();
            }
        ));
        
        this.trajectoryLine.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            () => {
                this.trajectoryLine.color = new BABYLON.Color3(1, 0, 0); // Back to red
                this.trajectoryLine.alpha = 0.5;
                this.hideTrajectoryTooltip();
            }
        ));
        
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
        this.impactCompleted = false;  // Reset impact flag
        this.startTime = Date.now();
        this.currentTime = 0;
        
        // Create full trajectory path visualization
        if (this.trajectoryLine) {
            this.trajectoryLine.dispose();
            this.trajectoryLine = null;
        }
        this.createFullTrajectoryPath();
        
        // Create visual markers and displays
        this.createLaunchMarker();
        this.createImpactMarker();  // Create impact marker at start
        this.createApogeeMarker();
        // Time to impact display removed - will be in RED WATCH
        this.createGroundTrack();
        
        // Show ASAT components
        if (this.asatOrb) this.asatOrb.isVisible = true;
        if (this.thrusterParticles) this.thrusterParticles.start();
        if (this.asatLabel) {
            this.asatLabel._shouldBeVisible = true; // Set intended visibility
            console.log('ASAT label made visible');
        }
        
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
        // Prevent updates if already completed
        if (this.impactCompleted) return;
        
        // Use global physics time multiplier from RO-Engine
        const elapsed = (Date.now() - this.startTime) / 1000;
        const globalSpeed = this.roEngine.physicsTimeMultiplier || 1;
        
        // Apply global simulation speed
        this.currentTime = elapsed * globalSpeed;
        
        // Check if complete (only trigger once)
        if (this.currentTime >= this.translator.duration && !this.impactCompleted) {
            this.impactCompleted = true;  // Prevent multiple triggers
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
            
            // Orient missile along velocity vector
            if (state.velocity && state.velocity.length() > 0.001) {
                // Get the velocity direction
                const velocityDir = state.velocity.normalize();
                
                // Calculate look-at position (point ahead in velocity direction)
                const lookAtPos = state.position.add(velocityDir.scale(0.1));
                
                // Make missile look in the direction of travel
                this.asatMesh.lookAt(lookAtPos, new BABYLON.Vector3(0, 1, 0));
                
                // Additional rotation adjustment for the missile model
                // The model might need to be rotated to align properly
                if (this.asatOrb && this.asatOrb !== this.asatMesh) {
                    // Adjust local rotation if needed (model-specific)
                    this.asatOrb.rotation.x = Math.PI / 2; // Nose up
                }
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
        
        // Keep tracks visible, only hide moving components
        setTimeout(() => {
            this.isActive = false;
            
            // Hide moving components but keep tracks
            if (this.asatOrb) this.asatOrb.isVisible = false;
            if (this.thrusterParticles) this.thrusterParticles.stop();
            if (this.asatLabel) {
                this.asatLabel._shouldBeVisible = false;
                this.asatLabel.isVisible = false;
            }
            
            // Keep tracks and labels visible
            // Trajectory line stays visible
            // Ground track stays visible
            // Launch and impact labels stay visible
            
            // Hide only the dynamic elements (keep labels visible)
            this.hideTooltip();
            if (this.impactTimerInterval) {
                clearInterval(this.impactTimerInterval);
                this.impactTimerInterval = null;
            }
            // Time to impact display removed - will be in RED WATCH
            if (this.dynamicTrailLine) {
                this.dynamicTrailLine.dispose();
                this.dynamicTrailLine = null;
            }
            this.dynamicTrailPoints = [];
            
            // Keep launch and impact labels visible
            // They should persist after impact
            
            console.log('⏹️ ASAT trajectory complete - tracks preserved');
        }, 2000);
        
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
        
        // Don't create a new impact marker if we already have one from createImpactMarker()
        // Just update its position if needed
        if (this.impactMarker) {
            // Update position to actual impact location
            this.impactMarker.position = position.clone();
            this.impactPosition = position.clone();
        } else {
            // Create impact marker only if it doesn't exist (shouldn't happen)
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
            
            this.impactPosition = position.clone();
            this.impactMarker = impactMarker;
            
            if (earthMesh) {
                impactMarker.parent = earthMesh;
            }
            
            this.impactDebris.push(impactMarker);
        }
        
        // Don't create label here - it's already created at start in createImpactMarker()
        // The label is already linked to the original impact marker
        
        console.log('💥 Persistent debris cloud created');
    }
    
    /**
     * Create impact marker and label at trajectory end position
     */
    createImpactMarker() {
        if (!this.translator.isLoaded) return;
        
        // Get impact position (end of trajectory)
        const impactState = this.translator.getStateAtTime(this.translator.duration);
        const impactPosition = impactState.position.clone();
        
        // Create red impact marker
        if (this.impactMarker) {
            this.impactMarker.dispose();
        }
        
        this.impactMarker = BABYLON.MeshBuilder.CreateSphere('impactMarker', {
            diameter: 0.003,
            segments: 12
        }, this.scene);
        
        this.impactMarker.position = impactPosition;
        this.impactPosition = impactPosition;
        
        // Red glowing material
        const material = new BABYLON.StandardMaterial('impactMat', this.scene);
        material.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.2);
        material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        this.impactMarker.material = material;
        
        // Parent to Earth
        const earthMesh = this.scene.getMeshByName('earth');
        if (earthMesh) {
            this.impactMarker.parent = earthMesh;
        }
        
        // Create impact location label immediately
        console.log('Creating impact location label at start...');
        this.showImpactLocationLabel();
        
        console.log('🔴 Impact marker created at', impactPosition);
    }
    
    /**
     * Create apogee marker at highest point
     */
    createApogeeMarker() {
        if (!this.translator.isLoaded) return;
        
        // Find highest altitude point
        let maxAltitude = -Infinity;
        let apogeeTime = 0;
        let apogeePosition = null;
        
        // Sample more frequently to find true apogee
        const sampleInterval = 0.5; // Sample every 0.5 seconds for accuracy
        
        for (let t = 0; t <= this.translator.duration; t += sampleInterval) {
            const state = this.translator.getStateAtTime(t);
            if (state.altitude > maxAltitude) {
                maxAltitude = state.altitude;
                apogeeTime = t;
                apogeePosition = state.position.clone();
            }
        }
        
        // Debug: Log trajectory profile and check if this is an ascent trajectory
        const startAlt = this.translator.getStateAtTime(0).altitude;
        const midAlt = this.translator.getStateAtTime(this.translator.duration / 2).altitude;
        const endAlt = this.translator.getStateAtTime(this.translator.duration).altitude;
        
        console.log(`📊 Trajectory profile:`);
        console.log(`  Start: ${startAlt.toFixed(1)}km`);
        console.log(`  Middle: ${midAlt.toFixed(1)}km`);
        console.log(`  End: ${endAlt.toFixed(1)}km`);
        console.log(`  Apogee: ${maxAltitude.toFixed(1)}km at T+${apogeeTime.toFixed(1)}s (${(apogeeTime/this.translator.duration*100).toFixed(1)}% through flight)`);
        
        // If this is an ascent trajectory (altitude keeps increasing), apogee at end makes sense
        const isAscentTrajectory = endAlt > midAlt && midAlt > startAlt;
        if (isAscentTrajectory) {
            console.log(`  ⚠️ This is an ASCENT trajectory - highest point at target altitude`);
        }
        
        if (apogeePosition) {
            // For ascent trajectories, we might want to mark the target altitude instead
            // or skip the apogee marker since it's just the end point
            if (!isAscentTrajectory) {
                // Only create apogee marker for ballistic trajectories
                // Create apogee marker - small white sphere
                this.apogeeMarker = BABYLON.MeshBuilder.CreateSphere('apogeeMarker', {
                    diameter: 0.002,
                    segments: 12
                }, this.scene);
                
                this.apogeeMarker.position = apogeePosition;
                
                // White glowing material
                const material = new BABYLON.StandardMaterial('apogeeMat', this.scene);
                material.emissiveColor = new BABYLON.Color3(1, 1, 1);
                material.diffuseColor = new BABYLON.Color3(1, 1, 1);
                this.apogeeMarker.material = material;
                
                // Parent to Earth
                const earthMesh = this.scene.getMeshByName('earth');
                if (earthMesh) {
                    this.apogeeMarker.parent = earthMesh;
                }
                
                // Create label for apogee
                this.createApogeeLabel(maxAltitude, apogeeTime);
                
                console.log(`⚪ Apogee marker created at ${maxAltitude.toFixed(0)}km, T+${apogeeTime}s`);
            } else {
                console.log(`📈 Ascent trajectory - target altitude ${maxAltitude.toFixed(0)}km reached at T+${apogeeTime}s`);
            }
        }
    }
    
    /**
     * Create label for apogee marker
     */
    createApogeeLabel(altitude, time) {
        const advancedTexture = this.ensureGUITexture();
        if (!advancedTexture) return;
        
        const label = new GUI.Rectangle();
        label.width = "100px";
        label.height = "40px";
        label.cornerRadius = 3;
        label.color = "white";
        label.thickness = 1;
        label.background = "rgba(0, 0, 0, 0.7)";
        label.isPointerBlocker = false; // Allow clicks to pass through
        advancedTexture.addControl(label);
        
        const text = new GUI.TextBlock();
        text.text = `Apogee\n${altitude.toFixed(0)}km`;
        text.color = "white";
        text.fontSize = 11;
        text.lineSpacing = "2px";
        label.addControl(text);
        
        label.linkWithMesh(this.apogeeMarker);
        label.linkOffsetY = -25;
        
        // Make apogee label aware of occlusion
        this.scene.registerBeforeRender(() => {
            if (label && this.apogeeMarker) {
                // Check if apogee marker is behind Earth
                const camera = this.scene.activeCamera;
                const earthCenter = BABYLON.Vector3.Zero();
                const markerPos = this.apogeeMarker.getAbsolutePosition();
                const cameraPos = camera.position;
                
                // Check if marker is on the opposite side of Earth from camera
                const toMarker = markerPos.subtract(earthCenter);
                const toCamera = cameraPos.subtract(earthCenter);
                const dot = BABYLON.Vector3.Dot(toMarker, toCamera);
                
                // Hide label if behind Earth
                label.isVisible = dot > 0;
            }
        });
        
        this.apogeeLabel = label;
    }
    
    /**
     * Create time to impact counter - REMOVED
     * Time to impact will be displayed in RED WATCH application
     */
    createTimeToImpactDisplay() {
        // Intentionally removed - time to impact will be in RED WATCH
        return;
    }
    
    /**
     * Create ground track projection on Earth surface
     */
    createGroundTrack() {
        if (!this.translator.isLoaded) return;
        
        // Build ground track points (projection of trajectory onto Earth surface)
        const groundPoints = [];
        const sampleInterval = 1; // Sample every second for more points
        
        for (let t = 0; t <= this.translator.duration; t += sampleInterval) {
            const state = this.translator.getStateAtTime(t);
            
            // Project position onto Earth surface (higher to avoid z-fighting)
            const normalized = state.position.normalize();
            const surfacePosition = normalized.scale(1.0008); // About 5km above surface
            groundPoints.push(surfacePosition);
        }
        
        if (groundPoints.length < 2) return;
        
        // Create ground track with enough points for smooth appearance at all zoom levels
        // Use direct points for consistent appearance
        this.groundTrackLine = BABYLON.MeshBuilder.CreateLines('groundTrack', {
            points: groundPoints,
            updatable: false,
            instance: null
        }, this.scene);
        
        // Solid yellow line for ground track
        this.groundTrackLine.color = new BABYLON.Color3(1, 1, 0); // Bright yellow
        this.groundTrackLine.alpha = 1.0; // Fully opaque for solid line
        
        // Use Earth's render group for proper occlusion
        this.groundTrackLine.renderingGroupId = 0; // Same as Earth
        this.groundTrackLine.isPickable = false;
        
        // Parent to Earth
        const earthMesh = this.scene.getMeshByName('earth');
        if (earthMesh) {
            this.groundTrackLine.parent = earthMesh;
        }
        
        console.log('📍 Ground track projection created');
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
        
        // Create orange sphere - slightly bigger for better hover detection
        this.launchMarker = BABYLON.MeshBuilder.CreateSphere('launchMarker', {
            diameter: 0.002, // Bigger for better hover detection
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
        
        // Create launch location label immediately (always visible)
        console.log('Creating launch location label...');
        this.showLaunchLocationLabel();
        
        console.log('🟠 Launch marker created at', launchState.position);
    }
    
    /**
     * Show launch location label on hover
     */
    showLaunchLocationLabel() {
        // Don't return early - always create the label if it doesn't exist
        
        const advancedTexture = this.ensureGUITexture();
        if (!advancedTexture) return;
        
        // Get launch coordinates
        const launchLoc = this.translator.getLaunchLocation();
        if (!launchLoc) return;
        
        // Format coordinates
        const latStr = launchLoc.latitude >= 0 ? 
            `${launchLoc.latitude.toFixed(2)}°N` : 
            `${Math.abs(launchLoc.latitude).toFixed(2)}°S`;
        const lonStr = launchLoc.longitude >= 0 ? 
            `${launchLoc.longitude.toFixed(2)}°E` : 
            `${Math.abs(launchLoc.longitude).toFixed(2)}°W`;
        
        // Determine location name based on coordinates
        const locationName = this.getGeographicalName(launchLoc.latitude, launchLoc.longitude);
        
        // Create label
        const label = new GUI.Rectangle();
        label.width = "160px";
        label.height = "50px";
        label.cornerRadius = 3;
        label.color = "orange";
        label.thickness = 1;
        label.background = "rgba(0, 0, 0, 0.8)";
        label.isPointerBlocker = false;
        advancedTexture.addControl(label);
        
        const text = new GUI.TextBlock();
        text.text = `LAUNCH SITE\n${latStr}, ${lonStr}\n${locationName}`;
        text.color = "white";
        text.fontSize = 10;
        text.lineSpacing = "2px";
        label.addControl(text);
        
        label.linkWithMesh(this.launchMarker);
        label.linkOffsetY = -30;
        
        // Make label aware of occlusion
        this.scene.registerBeforeRender(() => {
            if (label && this.launchMarker) {
                // Check if launch marker is behind Earth
                const camera = this.scene.activeCamera;
                const earthCenter = BABYLON.Vector3.Zero();
                const markerPos = this.launchMarker.getAbsolutePosition();
                const cameraPos = camera.position;
                
                // Check if marker is on the opposite side of Earth from camera
                const toMarker = markerPos.subtract(earthCenter);
                const toCamera = cameraPos.subtract(earthCenter);
                const dot = BABYLON.Vector3.Dot(toMarker, toCamera);
                
                // Show/hide label based on whether it's behind Earth
                label.isVisible = dot > 0;
                if (this.launchLocationLine) this.launchLocationLine.isVisible = dot > 0;
            }
        });
        
        this.launchLocationLabel = label;
    }
    
    /**
     * Hide launch location label
     */
    hideLaunchLocationLabel() {
        if (this.launchLocationLabel) {
            this.launchLocationLabel.isVisible = false;
        }
    }
    
    /**
     * Show impact location label on hover
     */
    showImpactLocationLabel() {
        // Don't create if already exists
        if (this.impactLocationLabel) return;
        
        const advancedTexture = this.ensureGUITexture();
        if (!advancedTexture || !this.impactPosition || !this.impactMarker) return;
        
        // Convert impact position to lat/lon
        const pos = this.impactPosition;
        const radius = pos.length() / (1 / 6371); // Convert back to km
        const lat = Math.asin(pos.y / pos.length()) * (180 / Math.PI);
        const lon = Math.atan2(pos.z, pos.x) * (180 / Math.PI);
        
        // Format coordinates
        const latStr = lat >= 0 ? 
            `${lat.toFixed(2)}°N` : 
            `${Math.abs(lat).toFixed(2)}°S`;
        const lonStr = lon >= 0 ? 
            `${lon.toFixed(2)}°E` : 
            `${Math.abs(lon).toFixed(2)}°W`;
        
        // Determine location name
        const locationName = this.getGeographicalName(lat, lon);
        
        // Create label
        const label = new GUI.Rectangle();
        label.width = "160px";
        label.height = "50px";
        label.cornerRadius = 3;
        label.color = "red";
        label.thickness = 1;
        label.background = "rgba(50, 0, 0, 0.9)";
        label.isPointerBlocker = false;
        advancedTexture.addControl(label);
        
        const text = new GUI.TextBlock();
        text.text = `IMPACT SITE\n${latStr}, ${lonStr}\n${locationName}`;
        text.color = "white";
        text.fontSize = 10;
        text.lineSpacing = "2px";
        label.addControl(text);
        
        // Link to impact marker
        label.linkWithMesh(this.impactMarker);
        label.linkOffsetY = -40; // More offset to be clearly above debris
        
        // Create leader line from debris to label
        const linePoints = [
            this.impactPosition.clone(),
            this.impactPosition.add(new BABYLON.Vector3(0, 0.015, 0))
        ];
        
        this.impactLocationLine = BABYLON.MeshBuilder.CreateLines('impactLeaderLine', {
            points: linePoints,
            updatable: false
        }, this.scene);
        
        const lineMaterial = new BABYLON.StandardMaterial('impactLineMat', this.scene);
        lineMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.2);
        this.impactLocationLine.material = lineMaterial;
        this.impactLocationLine.color = new BABYLON.Color3(0.8, 0.2, 0.2);
        this.impactLocationLine.renderingGroupId = 1;
        
        const earthMesh = this.scene.getMeshByName('earth');
        if (earthMesh) {
            this.impactLocationLine.parent = earthMesh;
        }
        
        // Make label aware of occlusion
        this.scene.registerBeforeRender(() => {
            if (label && this.impactMarker) {
                // Check if impact marker is behind Earth
                const camera = this.scene.activeCamera;
                const earthCenter = BABYLON.Vector3.Zero();
                const markerPos = this.impactMarker.getAbsolutePosition();
                const cameraPos = camera.position;
                
                // Check if marker is on the opposite side of Earth from camera
                const toMarker = markerPos.subtract(earthCenter);
                const toCamera = cameraPos.subtract(earthCenter);
                const dot = BABYLON.Vector3.Dot(toMarker, toCamera);
                
                // Show/hide label and line based on whether it's behind Earth
                label.isVisible = dot > 0;
                if (this.impactLocationLine) this.impactLocationLine.isVisible = dot > 0;
            }
        });
        
        this.impactLocationLabel = label;
    }
    
    /**
     * Hide impact location label
     */
    hideImpactLocationLabel() {
        if (this.impactLocationLabel) {
            this.impactLocationLabel.isVisible = false;
        }
    }
    
    /**
     * Get geographical name based on coordinates
     */
    getGeographicalName(lat, lon) {
        // Simple geographical regions based on coordinates
        // This is a simplified mapping - in production you'd use a proper geocoding service
        
        // Check for oceans first
        if (lat < -60) return "Southern Ocean";
        if (lat > 70) return "Arctic Region";
        
        // Atlantic Ocean
        if (lon > -80 && lon < -20) {
            if (lat > 0 && lat < 30) return "Atlantic Ocean";
        }
        
        // Pacific Ocean  
        if (lon > 120 || lon < -120) {
            if (lat > -60 && lat < 60) return "Pacific Ocean";
        }
        
        // Indian Ocean
        if (lon > 20 && lon < 120) {
            if (lat > -60 && lat < -10) return "Indian Ocean";
        }
        
        // Land regions - simplified
        if (lon >= -10 && lon <= 50) {
            if (lat >= 20 && lat <= 35) {
                if (lon >= 35 && lon <= 55) return "Saudi Arabia";
                if (lon >= 20 && lon <= 35) return "Egypt/Sudan";
                if (lon >= -10 && lon <= 20) return "North Africa";
            }
            if (lat >= 35 && lat <= 55) {
                if (lon >= -10 && lon <= 25) return "Europe";
                if (lon >= 25 && lon <= 50) return "Eastern Europe";
            }
            if (lat >= -35 && lat <= 20) {
                if (lon >= 10 && lon <= 50) return "East Africa";
                if (lon >= -20 && lon <= 10) return "West Africa";
            }
        }
        
        // Asia
        if (lon >= 50 && lon <= 150) {
            if (lat >= 20 && lat <= 50) {
                if (lon >= 50 && lon <= 75) return "Central Asia";
                if (lon >= 75 && lon <= 100) return "South Asia";
                if (lon >= 100 && lon <= 130) return "East Asia";
                if (lon >= 130 && lon <= 150) return "Japan/Korea";
            }
        }
        
        // Americas
        if (lon >= -170 && lon <= -30) {
            if (lat >= 30 && lat <= 50) return "North America";
            if (lat >= -55 && lat <= 30) {
                if (lon >= -120 && lon <= -70) return "USA/Mexico";
                if (lon >= -70 && lon <= -30) return "Central America";
            }
            if (lat <= -10) return "South America";
        }
        
        // Australia/Oceania
        if (lon >= 110 && lon <= 180) {
            if (lat >= -45 && lat <= -10) return "Australia/Oceania";
        }
        
        // Default to ocean or unknown
        return "International Waters";
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
        
        // Get advancedTexture
        const advancedTexture = this.ensureGUITexture();
        if (!advancedTexture) {
            console.warn('No advancedTexture for tooltip');
            return;
        }
        
        // Clear any existing interval first
        if (this.tooltipUpdateInterval) {
            clearInterval(this.tooltipUpdateInterval);
            this.tooltipUpdateInterval = null;
        }
        
        // Set up real-time updating
        this.tooltipUpdateInterval = setInterval(() => {
            if (this.isActive && this.asatTooltip && this.asatTooltip.isVisible) {
                this.updateTooltipText();
            }
        }, 100); // Update every 100ms for smooth real-time data
        
        // Create tooltip if not exists
        if (!this.asatTooltip) {
            const tooltip = new GUI.Rectangle();
            tooltip.width = "250px";
            tooltip.height = "140px";
            tooltip.cornerRadius = 10;
            tooltip.color = "white";
            tooltip.thickness = 2;
            tooltip.background = "rgba(0, 0, 0, 0.9)";
            advancedTexture.addControl(tooltip);
            
            const text = new GUI.TextBlock();
            text.color = "white";
            text.fontSize = 16;  // Much bigger text
            text.textWrapping = true;
            text.lineSpacing = "4px";
            tooltip.addControl(text);
            
            tooltip.linkWithMesh(this.asatMesh);
            tooltip.linkOffsetY = -70;
            
            this.asatTooltip = tooltip;
            this.asatTooltipText = text;
        }
        
        // Initial update
        this.updateTooltipText();
        this.asatTooltip.isVisible = true;
    }
    
    /**
     * Update tooltip text with current data
     */
    updateTooltipText() {
        if (!this.asatTooltipText || !this.translator) return;
        
        const state = this.translator.getStateAtTime(this.currentTime);
        const progress = (this.currentTime / this.translator.duration * 100).toFixed(1);
        const velocity = state.velocity.length() * 6371; // Convert to km/s
        
        this.asatTooltipText.text = 
            `${this.asatName}\n` +
            `Altitude: ${state.altitude.toFixed(1)} km\n` +
            `Velocity: ${velocity.toFixed(1)} km/s\n` +
            `Progress: ${progress}%\n` +
            `Time: ${this.currentTime.toFixed(0)}/${this.translator.duration}s`;
    }
    
    /**
     * Show trajectory tooltip on hover
     */
    showTrajectoryTooltip() {
        if (!this.trajectoryLine || !this.trajectoryLine.metadata) return;
        
        const advancedTexture = this.ensureGUITexture();
        if (!advancedTexture) return;
        
        // Create tooltip if not exists
        if (!this.trajectoryTooltip) {
            const tooltip = new GUI.Rectangle();
            tooltip.width = "220px";
            tooltip.height = "100px";
            tooltip.cornerRadius = 5;
            tooltip.color = "red";
            tooltip.thickness = 2;
            tooltip.background = "rgba(0, 0, 0, 0.9)";
            advancedTexture.addControl(tooltip);
            
            const text = new GUI.TextBlock();
            text.color = "white";
            text.fontSize = 12;
            text.textWrapping = true;
            tooltip.addControl(text);
            
            this.trajectoryTooltip = tooltip;
            this.trajectoryTooltipText = text;
        }
        
        // Update tooltip content
        const meta = this.trajectoryLine.metadata;
        const latStr = meta.launchLat >= 0 ? `${meta.launchLat.toFixed(1)}°N` : `${Math.abs(meta.launchLat).toFixed(1)}°S`;
        const lonStr = meta.launchLon >= 0 ? `${meta.launchLon.toFixed(1)}°E` : `${Math.abs(meta.launchLon).toFixed(1)}°W`;
        
        this.trajectoryTooltipText.text = 
            `TRAJECTORY: ${meta.launchName}\n` +
            `Duration: ${meta.duration.toFixed(0)}s\n` +
            `Max Alt: ${meta.maxAltitude.toFixed(0)} km\n` +
            `Launch: ${latStr}, ${lonStr}`;
        
        // Position near mouse
        this.trajectoryTooltip.leftInPixels = this.scene.pointerX + 20;
        this.trajectoryTooltip.topInPixels = this.scene.pointerY - 50;
        this.trajectoryTooltip.isVisible = true;
    }
    
    /**
     * Hide trajectory tooltip
     */
    hideTrajectoryTooltip() {
        if (this.trajectoryTooltip) {
            this.trajectoryTooltip.isVisible = false;
        }
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.asatTooltip) {
            this.asatTooltip.isVisible = false;
        }
        if (this.tooltipUpdateInterval) {
            clearInterval(this.tooltipUpdateInterval);
            this.tooltipUpdateInterval = null;
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
        if (this.asatLabel) {
            this.asatLabel._isVisible = false;
            this.asatLabel.isVisible = false;
        }
        
        // Hide tooltip
        this.hideTooltip();
        
        // Clear impact timer
        if (this.impactTimerInterval) {
            clearInterval(this.impactTimerInterval);
            this.impactTimerInterval = null;
        }
        
        // Time to impact display removed - will be in RED WATCH
        
        // Hide dynamic trail
        if (this.dynamicTrailLine) {
            this.dynamicTrailLine.dispose();
            this.dynamicTrailLine = null;
        }
        this.dynamicTrailPoints = [];
        
        // IMPORTANT: Keep trajectory and ground track visible even when stopped
        // These should persist throughout the session
        // DO NOT hide trajectoryLine or groundTrackLine here
        
        console.log('⏹️ ASAT simulation stopped (tracks remain visible)');
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
        
        if (this.groundTrackLine) {
            this.groundTrackLine.dispose();
            this.groundTrackLine = null;
        }
        
        if (this.launchMarker) {
            this.launchMarker.dispose();
            this.launchMarker = null;
        }
        
        if (this.launchLocationLabel) {
            this.launchLocationLabel.dispose();
            this.launchLocationLabel = null;
        }
        
        if (this.launchLocationLine) {
            this.launchLocationLine.dispose();
            this.launchLocationLine = null;
        }
        
        if (this.apogeeMarker) {
            this.apogeeMarker.dispose();
            this.apogeeMarker = null;
        }
        
        if (this.apogeeLabel) {
            this.apogeeLabel.dispose();
            this.apogeeLabel = null;
        }
        
        if (this.timeToImpactRect) {
            this.timeToImpactRect.dispose();
            this.timeToImpactRect = null;
            this.timeToImpactLabel = null;
        }
        
        if (this.asatTooltip) {
            this.asatTooltip.dispose();
            this.asatTooltip = null;
            this.asatTooltipText = null;
        }
        
        if (this.asatLabel) {
            this.asatLabel.dispose();
            this.asatLabel = null;
        }
        
        if (this.impactDebris) {
            this.impactDebris.forEach(debris => debris.dispose());
            this.impactDebris = [];
        }
        
        if (this.impactLocationLabel) {
            this.impactLocationLabel.dispose();
            this.impactLocationLabel = null;
        }
        
        if (this.impactLocationLine) {
            this.impactLocationLine.dispose();
            this.impactLocationLine = null;
        }
        
        // Clear all intervals
        if (this.tooltipUpdateInterval) {
            clearInterval(this.tooltipUpdateInterval);
            this.tooltipUpdateInterval = null;
        }
        
        if (this.impactTimerInterval) {
            clearInterval(this.impactTimerInterval);
            this.impactTimerInterval = null;
        }
        
        this.trajectoryPoints = [];
        this.translator = null;
        
        console.log('🧹 ALOHA Handler disposed');
    }
}

export default ALOHAHandler;