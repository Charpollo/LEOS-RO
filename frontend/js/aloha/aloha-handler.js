/**
 * ALOHA Trajectory Handler
 * Loads and plays ASAT trajectories through RO-Engine's systems
 * 
 * CUTTING EDGE: Real-time or accelerated playback with smooth visualization
 * MODULAR: Thin wrapper that feeds data to existing systems
 * PERFORMANCE: Dynamic trail building, configurable playback speeds
 */

import * as BABYLON from '@babylonjs/core';
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
        
        // Playback state
        this.isActive = false;
        this.startTime = null;
        this.currentTime = 0;
        this.playbackSpeed = 1; // Default real-time
        
        // Trajectory data
        this.trajectoryData = null;
        this.trajectoryPoints = [];
        this.maxTrailPoints = 200; // Smooth trail
        
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
                id: 'ASAT_001',
                type: 'trajectory',
                mesh: this.asatMesh,
                getPosition: () => this.getCurrentPosition(),
                getVelocity: () => this.getCurrentVelocity(),
                metadata: metadata
            });
            
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
     * Create ASAT missile mesh with grid sphere and direction arrow
     */
    createASATMesh() {
        // Create parent container
        this.asatMesh = new BABYLON.TransformNode('asat', this.scene);
        
        // Create wireframe sphere with grid
        const sphere = BABYLON.MeshBuilder.CreateSphere('asatSphere', {
            diameter: 0.003,  // 3km in real scale
            segments: 8
        }, this.scene);
        sphere.parent = this.asatMesh;
        
        // Create grid material
        const gridMaterial = new BABYLON.StandardMaterial('asatGridMat', this.scene);
        gridMaterial.wireframe = true;
        gridMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
        gridMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        sphere.material = gridMaterial;
        
        // Create direction arrow (cone pointing forward)
        const arrow = BABYLON.MeshBuilder.CreateCylinder('asatArrow', {
            diameterTop: 0,
            diameterBottom: 0.001,
            height: 0.002,
            tessellation: 6
        }, this.scene);
        arrow.parent = this.asatMesh;
        arrow.position.z = 0.002; // Position in front
        arrow.rotation.x = Math.PI / 2; // Point forward
        
        // Arrow material (bright red)
        const arrowMaterial = new BABYLON.StandardMaterial('asatArrowMat', this.scene);
        arrowMaterial.emissiveColor = new BABYLON.Color3(1, 0.2, 0.2);
        arrowMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        arrow.material = arrowMaterial;
        
        // Add rotation animation to sphere
        this.scene.registerBeforeRender(() => {
            if (sphere && this.isActive) {
                sphere.rotation.y += 0.01;
                sphere.rotation.x += 0.005;
            }
        });
        
        // Add glow if available
        if (this.scene.glowLayer) {
            this.scene.glowLayer.addIncludedOnlyMesh(sphere);
            this.scene.glowLayer.addIncludedOnlyMesh(arrow);
        }
        
        sphere.isVisible = false;
        arrow.isVisible = false;
        
        // Store references
        this.asatSphere = sphere;
        this.asatArrow = arrow;
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
        
        // Show ASAT components
        if (this.asatSphere) this.asatSphere.isVisible = true;
        if (this.asatArrow) this.asatArrow.isVisible = true;
        
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
            
            // Orient arrow in direction of velocity
            if (this.asatArrow && state.velocity) {
                const velocity = state.velocity.normalize();
                if (velocity.length() > 0) {
                    // Calculate rotation to align arrow with velocity
                    const forward = new BABYLON.Vector3(0, 0, 1);
                    const axis = BABYLON.Vector3.Cross(forward, velocity);
                    const angle = Math.acos(BABYLON.Vector3.Dot(forward, velocity));
                    if (axis.length() > 0) {
                        this.asatArrow.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis.normalize(), angle);
                    }
                }
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
     * Stop trajectory playback
     */
    stop() {
        this.isActive = false;
        
        // Hide ASAT components
        if (this.asatSphere) this.asatSphere.isVisible = false;
        if (this.asatArrow) this.asatArrow.isVisible = false;
        
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
        
        this.trajectoryPoints = [];
        this.translator = null;
        
        console.log('🧹 ALOHA Handler disposed');
    }
}

export default ALOHAHandler;