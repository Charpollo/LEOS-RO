/**
 * ALOHA Trajectory Handler
 * Loads and plays ASAT trajectories through RO-Engine's systems
 * 
 * CUTTING EDGE: Just a translator - leverages RO-Engine's full capabilities
 * MODULAR: Thin wrapper that feeds data to existing systems
 * PERFORMANCE: No duplicate systems - uses RO-Engine's conjunction detection
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
        
        // State
        this.isActive = false;
        this.startTime = null;
        this.currentTime = 0;
        
        // Use RO-Engine's systems
        this.conjunctionSystem = null; // Will be set by RO-Engine
        this.impactSystem = null;      // Will be set by RO-Engine
        
        console.log('🎯 ALOHA Handler initialized');
    }
    
    /**
     * Load ASAT trajectory data
     */
    async loadTrajectory(alohaData) {
        try {
            // Load into translator
            const metadata = await this.translator.loadTrajectory(alohaData);
            
            // Create ASAT mesh
            this.createASATMesh();
            
            // Create trajectory visualization
            this.createTrajectoryLine();
            
            // Register with RO-Engine as a tracked object
            this.roEngine.registerTrajectoryObject({
                id: 'ASAT_001',
                type: 'trajectory',
                mesh: this.asatMesh,
                getPosition: () => this.getCurrentPosition(),
                getVelocity: () => this.getCurrentVelocity(),
                metadata: metadata
            });
            
            console.log('✅ ALOHA trajectory loaded and registered');
            return metadata;
            
        } catch (error) {
            console.error('❌ Failed to load ALOHA:', error);
            throw error;
        }
    }
    
    /**
     * Create ASAT missile mesh
     */
    createASATMesh() {
        // Simple cone for ASAT
        this.asatMesh = BABYLON.MeshBuilder.CreateCylinder('asat', {
            diameterTop: 0,
            diameterBottom: 0.002,
            height: 0.005,
            tessellation: 8
        }, this.scene);
        
        // Red glowing material
        const material = new BABYLON.StandardMaterial('asatMat', this.scene);
        material.emissiveColor = new BABYLON.Color3(1, 0, 0);
        material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        this.asatMesh.material = material;
        
        // Add glow
        if (this.scene.glowLayer) {
            this.scene.glowLayer.addIncludedOnlyMesh(this.asatMesh);
        }
        
        this.asatMesh.isVisible = false;
    }
    
    /**
     * Create trajectory path line
     */
    createTrajectoryLine() {
        const points = [];
        const sampleRate = Math.max(1, Math.floor(this.translator.trajectory.length / 100));
        
        for (let i = 0; i < this.translator.babylonPositions.length; i += sampleRate) {
            points.push(this.translator.babylonPositions[i].position);
        }
        
        this.trajectoryLine = BABYLON.MeshBuilder.CreateLines('asatPath', {
            points: points
        }, this.scene);
        
        this.trajectoryLine.color = new BABYLON.Color3(1, 1, 1);
        this.trajectoryLine.alpha = 0.3;
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
        
        // Show ASAT
        if (this.asatMesh) {
            this.asatMesh.isVisible = true;
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
        
        console.log('🚀 ASAT trajectory started');
        
        // Notify system
        window.dispatchEvent(new CustomEvent('asat-launched', {
            detail: {
                duration: this.translator.duration,
                launchLocation: this.translator.getLaunchLocation()
            }
        }));
    }
    
    /**
     * Update ASAT position
     */
    update() {
        // Calculate trajectory time
        const elapsed = (Date.now() - this.startTime) / 1000;
        this.currentTime = elapsed * (this.roEngine.physicsTimeMultiplier || 1);
        
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
            
            // Orient along velocity
            if (state.velocity.length() > 0) {
                const direction = state.velocity.normalize();
                this.asatMesh.lookAt(this.asatMesh.position.add(direction));
            }
        }
        
        // Let RO-Engine's conjunction system handle detection
        if (this.conjunctionSystem) {
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
     * Handle impact at end of trajectory
     */
    onImpact() {
        console.log('💥 ASAT impact!');
        
        const finalState = this.translator.getStateAtTime(this.translator.duration);
        
        // Find closest target
        const target = this.findClosestTarget(finalState.position);
        
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
        
        // Stop playback
        this.stop();
        
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
     * Find closest object at position
     */
    findClosestTarget(position) {
        const objects = this.roEngine.getAllObjects();
        let closest = null;
        let minDistance = Infinity;
        
        objects.forEach(obj => {
            if (obj.id === 'ASAT_001') return; // Skip self
            
            const objPos = obj.mesh?.position || obj.position;
            if (!objPos) return;
            
            const distance = BABYLON.Vector3.Distance(position, objPos);
            
            if (distance < minDistance && distance < 0.01) { // Within 10m
                minDistance = distance;
                closest = obj;
            }
        });
        
        return closest;
    }
    
    /**
     * Get current position for conjunction checks
     */
    getCurrentPosition() {
        if (!this.isActive) return BABYLON.Vector3.Zero();
        
        const state = this.translator.getStateAtTime(this.currentTime);
        return state.position;
    }
    
    /**
     * Get current velocity for conjunction checks
     */
    getCurrentVelocity() {
        if (!this.isActive) return BABYLON.Vector3.Zero();
        
        const state = this.translator.getStateAtTime(this.currentTime);
        return state.velocity;
    }
    
    /**
     * Stop trajectory playback
     */
    stop() {
        this.isActive = false;
        
        if (this.asatMesh) {
            this.asatMesh.isVisible = false;
        }
        
        console.log('⏹️ ASAT trajectory stopped');
    }
    
    /**
     * Cleanup
     */
    dispose() {
        this.stop();
        
        if (this.asatMesh) this.asatMesh.dispose();
        if (this.trajectoryLine) this.trajectoryLine.dispose();
        
        console.log('🧹 ALOHA handler disposed');
    }
}