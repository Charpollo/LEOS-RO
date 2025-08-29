/**
 * Impact Simulation Module for ALOHA ASAT
 * Simulates kinetic impact and debris generation using NASA breakup model
 * 
 * CUTTING EDGE: Real-time debris field evolution with proper physics
 * MODULAR: Works with any impact scenario, not just ASAT
 * PERFORMANCE: Optimized particle system for thousands of fragments
 */

import * as BABYLON from '@babylonjs/core';

export class ImpactSimulator {
    constructor(scene, maxDebris = 1000) {
        this.scene = scene;
        this.maxDebris = maxDebris;
        
        // NASA Breakup Model parameters
        this.breakupModel = {
            A: -0.75,              // Size distribution coefficient
            B: 0.9,                // Size distribution exponent
            velocityScale: 0.2,    // Velocity distribution scale
            minSize: 0.01,         // Minimum fragment size (10cm)
            maxSize: 1.0           // Maximum fragment size (1m)
        };
        
        // Visual effects
        this.particleSystem = null;
        this.debrisObjects = [];
        this.impactFlash = null;
        
        // State
        this.isActive = false;
        this.impactData = null;
        
        console.log('💥 Impact Simulator initialized');
    }
    
    /**
     * Simulate kinetic impact and debris generation
     * @param {Object} target - Target object being hit
     * @param {Vector3} impactPosition - Impact location
     * @param {Vector3} impactVelocity - ASAT velocity at impact
     */
    simulateImpact(target, impactPosition, impactVelocity) {
        console.log('💥 IMPACT! Simulating collision...');
        
        // Calculate impact parameters
        const impactEnergy = this.calculateImpactEnergy(target, impactVelocity);
        const debrisCount = this.calculateDebrisCount(impactEnergy, target);
        
        this.impactData = {
            position: impactPosition,
            velocity: impactVelocity,
            energy: impactEnergy,
            debrisCount: Math.min(debrisCount, this.maxDebris),
            targetMass: this.estimateTargetMass(target),
            time: Date.now()
        };
        
        // Visual effects
        this.createImpactFlash(impactPosition);
        this.createDebrisField(impactPosition, impactVelocity, this.impactData.debrisCount);
        
        // Physics effects
        if (target.physicsImpostor) {
            this.applyImpactForce(target, impactVelocity);
        }
        
        // Remove original target (destroyed)
        setTimeout(() => {
            if (target && target.dispose) {
                target.dispose();
            }
        }, 100);
        
        // Log impact event
        this.logImpact();
        
        // Dispatch impact event
        window.dispatchEvent(new CustomEvent('impact-occurred', {
            detail: this.impactData
        }));
        
        this.isActive = true;
    }
    
    /**
     * Calculate kinetic energy of impact
     * E = 0.5 * m * v²
     */
    calculateImpactEnergy(target, velocity) {
        const asatMass = 100; // kg (typical ASAT mass)
        const targetMass = this.estimateTargetMass(target);
        const relativeVelocity = velocity.length() * 6371; // Convert to m/s
        
        // Kinetic energy in Joules
        const kineticEnergy = 0.5 * asatMass * relativeVelocity * relativeVelocity;
        
        // Energy transferred to debris (not all energy creates fragments)
        const transferEfficiency = 0.4; // 40% energy transfer
        const debrisEnergy = kineticEnergy * transferEfficiency;
        
        return {
            total: kineticEnergy,
            transferred: debrisEnergy,
            velocityMagnitude: relativeVelocity
        };
    }
    
    /**
     * Estimate target mass based on size
     */
    estimateTargetMass(target) {
        if (!target.getBoundingInfo) return 500; // Default satellite mass
        
        const bounds = target.getBoundingInfo().boundingBox;
        const size = bounds.maximumWorld.subtract(bounds.minimumWorld);
        const volume = size.x * size.y * size.z;
        
        // Assume satellite density ~100 kg/m³
        const density = 100;
        const mass = volume * density * 1000000; // Convert from Babylon units
        
        return Math.max(100, Math.min(5000, mass)); // Clamp between 100-5000 kg
    }
    
    /**
     * Calculate number of debris fragments using NASA model
     */
    calculateDebrisCount(impactEnergy, target) {
        const mass = this.estimateTargetMass(target);
        const energy = impactEnergy.transferred;
        
        // NASA Standard Breakup Model
        // N = A * (E/m)^B where E is energy, m is mass
        const specificEnergy = energy / mass;
        const baseCount = Math.pow(specificEnergy / 1000, 0.75) * 100;
        
        // Scale by impact velocity (hypervelocity creates more fragments)
        const velocityFactor = Math.min(impactEnergy.velocityMagnitude / 7000, 3);
        
        return Math.floor(baseCount * velocityFactor);
    }
    
    /**
     * Create visual impact flash
     */
    createImpactFlash(position) {
        // Create expanding sphere for flash
        this.impactFlash = BABYLON.MeshBuilder.CreateSphere('impactFlash', {
            diameter: 0.01
        }, this.scene);
        
        this.impactFlash.position = position.clone();
        
        // Bright white emissive material
        const material = new BABYLON.StandardMaterial('flashMat', this.scene);
        material.emissiveColor = new BABYLON.Color3(1, 1, 1);
        material.disableLighting = true;
        this.impactFlash.material = material;
        
        // Animate flash
        let scale = 1;
        let alpha = 1;
        
        const flashAnimation = setInterval(() => {
            scale += 0.5;
            alpha -= 0.05;
            
            this.impactFlash.scaling = new BABYLON.Vector3(scale, scale, scale);
            this.impactFlash.material.alpha = alpha;
            
            if (alpha <= 0) {
                clearInterval(flashAnimation);
                this.impactFlash.dispose();
                this.impactFlash = null;
            }
        }, 50);
        
        // Camera shake effect
        this.cameraShake();
    }
    
    /**
     * Create debris field from impact
     */
    createDebrisField(position, impactVelocity, count) {
        console.log(`🌌 Generating ${count} debris fragments`);
        
        // Create particle system for small debris
        this.createParticleDebris(position, impactVelocity, Math.floor(count * 0.8));
        
        // Create mesh objects for larger debris
        this.createMeshDebris(position, impactVelocity, Math.floor(count * 0.2));
    }
    
    /**
     * Create particle system for small debris
     */
    createParticleDebris(position, velocity, count) {
        // Create particle system
        this.particleSystem = new BABYLON.ParticleSystem('debris', count, this.scene);
        
        // Texture
        this.particleSystem.particleTexture = new BABYLON.Texture(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            this.scene
        );
        
        // Emission
        this.particleSystem.emitter = position.clone();
        this.particleSystem.minEmitBox = new BABYLON.Vector3(-0.01, -0.01, -0.01);
        this.particleSystem.maxEmitBox = new BABYLON.Vector3(0.01, 0.01, 0.01);
        
        // Velocity distribution (based on impact)
        const baseVelocity = velocity.scale(0.1);
        this.particleSystem.minEmitPower = 0.01;
        this.particleSystem.maxEmitPower = 0.05;
        this.particleSystem.direction1 = baseVelocity.add(new BABYLON.Vector3(-0.01, -0.01, -0.01));
        this.particleSystem.direction2 = baseVelocity.add(new BABYLON.Vector3(0.01, 0.01, 0.01));
        
        // Lifetime
        this.particleSystem.minLifeTime = 100;
        this.particleSystem.maxLifeTime = 300;
        
        // Size
        this.particleSystem.minSize = 0.0001;
        this.particleSystem.maxSize = 0.001;
        
        // Color
        this.particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
        this.particleSystem.color2 = new BABYLON.Color4(0.8, 0.8, 0.8, 1);
        
        // Emission rate
        this.particleSystem.emitRate = count / 10;
        this.particleSystem.manualEmitCount = count;
        
        // Blending
        this.particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // Gravity (Earth's pull)
        this.particleSystem.gravity = new BABYLON.Vector3(0, -0.00001, 0);
        
        // Start
        this.particleSystem.start();
        
        // Stop emission after burst
        setTimeout(() => {
            this.particleSystem.stop();
        }, 1000);
    }
    
    /**
     * Create larger mesh debris
     */
    createMeshDebris(position, velocity, count) {
        for (let i = 0; i < count; i++) {
            // Random debris shape
            const size = this.breakupModel.minSize + Math.random() * (this.breakupModel.maxSize - this.breakupModel.minSize);
            
            let debris;
            const shapeType = Math.floor(Math.random() * 3);
            
            switch (shapeType) {
                case 0: // Box
                    debris = BABYLON.MeshBuilder.CreateBox(`debris_${i}`, {
                        size: size * 0.001
                    }, this.scene);
                    break;
                case 1: // Sphere
                    debris = BABYLON.MeshBuilder.CreateSphere(`debris_${i}`, {
                        diameter: size * 0.001
                    }, this.scene);
                    break;
                case 2: // Cylinder
                    debris = BABYLON.MeshBuilder.CreateCylinder(`debris_${i}`, {
                        height: size * 0.001,
                        diameter: size * 0.0005
                    }, this.scene);
                    break;
            }
            
            // Position at impact point
            debris.position = position.clone();
            
            // Random velocity based on NASA model
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = this.breakupModel.velocityScale * (0.5 + Math.random());
            
            const debrisVelocity = new BABYLON.Vector3(
                speed * Math.sin(phi) * Math.cos(theta),
                speed * Math.sin(phi) * Math.sin(theta),
                speed * Math.cos(phi)
            );
            
            // Add impact velocity component
            const totalVelocity = velocity.scale(0.5).add(debrisVelocity.scale(0.01));
            
            // Material
            const material = new BABYLON.StandardMaterial(`debrisMat_${i}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            debris.material = material;
            
            // Add physics impostor
            debris.physicsImpostor = new BABYLON.PhysicsImpostor(
                debris,
                BABYLON.PhysicsImpostor.BoxImpostor,
                {
                    mass: size * 0.1,
                    restitution: 0.7
                },
                this.scene
            );
            
            // Apply velocity
            debris.physicsImpostor.setLinearVelocity(totalVelocity);
            
            // Random rotation
            debris.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ));
            
            this.debrisObjects.push(debris);
            
            // Clean up debris after time
            setTimeout(() => {
                const index = this.debrisObjects.indexOf(debris);
                if (index > -1) {
                    this.debrisObjects.splice(index, 1);
                }
                debris.dispose();
            }, 60000); // Remove after 1 minute
        }
    }
    
    /**
     * Apply impact force to target
     */
    applyImpactForce(target, impactVelocity) {
        if (!target.physicsImpostor) return;
        
        // Apply impulse at impact point
        const impulse = impactVelocity.scale(10);
        target.physicsImpostor.applyImpulse(
            impulse,
            target.getAbsolutePosition()
        );
        
        // Add spin
        target.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).scale(5));
    }
    
    /**
     * Camera shake effect
     */
    cameraShake() {
        const camera = this.scene.activeCamera;
        if (!camera) return;
        
        const originalPosition = camera.position.clone();
        let shakeIntensity = 0.002;
        
        const shakeInterval = setInterval(() => {
            camera.position = originalPosition.add(new BABYLON.Vector3(
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity
            ));
            
            shakeIntensity *= 0.9;
            
            if (shakeIntensity < 0.0001) {
                clearInterval(shakeInterval);
                camera.position = originalPosition;
            }
        }, 50);
    }
    
    /**
     * Log impact event
     */
    logImpact() {
        console.log('💥 IMPACT EVENT:');
        console.log(`  Position: ${this.impactData.position}`);
        console.log(`  Velocity: ${this.impactData.velocity.length() * 6371} m/s`);
        console.log(`  Energy: ${this.impactData.energy.total / 1e9} GJ`);
        console.log(`  Debris: ${this.impactData.debrisCount} fragments`);
        console.log(`  Target Mass: ${this.impactData.targetMass} kg`);
    }
    
    /**
     * Get debris field statistics
     */
    getDebrisStatistics() {
        return {
            particleCount: this.particleSystem ? this.particleSystem.getCapacity() : 0,
            meshCount: this.debrisObjects.length,
            totalDebris: this.impactData ? this.impactData.debrisCount : 0,
            impactEnergy: this.impactData ? this.impactData.energy : null
        };
    }
    
    /**
     * Cleanup and dispose
     */
    dispose() {
        // Dispose particle system
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        
        // Dispose debris meshes
        this.debrisObjects.forEach(debris => debris.dispose());
        this.debrisObjects = [];
        
        // Dispose flash
        if (this.impactFlash) {
            this.impactFlash.dispose();
        }
        
        this.isActive = false;
        console.log('🧹 Impact simulator disposed');
    }
}

export default ImpactSimulator;