import * as BABYLON from '@babylonjs/core';
import { physicsEngine } from './physics-engine.js';

/**
 * Manages debris particles for collision simulations
 * Optimized for handling thousands of debris objects
 */
export class DebrisManager {
    constructor(scene) {
        this.scene = scene;
        this.debrisParticles = [];
        this.debrisMeshes = new Map();
        this.maxDebris = 10000;
        this.debrisPool = [];
        this.activeDebris = new Set();
        this.debrisMaterial = null;
        this.glowLayer = null;
        
        this.initializeMaterials();
        this.createDebrisPool();
    }

    /**
     * Initialize materials for debris
     */
    initializeMaterials() {
        // Create glowing debris material
        this.debrisMaterial = new BABYLON.StandardMaterial("debrisMaterial", this.scene);
        this.debrisMaterial.diffuseColor = new BABYLON.Color3(1, 0.3, 0.1); // Red-orange
        this.debrisMaterial.emissiveColor = new BABYLON.Color3(1, 0.2, 0); // Glowing effect
        this.debrisMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        
        // Add glow layer for dramatic effect
        if (!this.scene.glowLayer) {
            this.glowLayer = new BABYLON.GlowLayer("redOrbitGlow", this.scene);
            this.glowLayer.intensity = 0.5;
        } else {
            this.glowLayer = this.scene.glowLayer;
        }
    }

    /**
     * Create a pool of reusable debris meshes
     */
    createDebrisPool() {
        // Creating debris pool...
        
        // Create different sizes of debris
        const sizes = [0.001, 0.002, 0.005, 0.01, 0.02]; // Different debris sizes
        
        for (let i = 0; i < 1000; i++) { // Start with 1000 pooled objects
            const size = sizes[Math.floor(Math.random() * sizes.length)];
            const debris = BABYLON.MeshBuilder.CreateSphere(
                `debris_pool_${i}`,
                { diameter: size * 2, segments: 4 }, // Low poly for performance
                this.scene
            );
            
            debris.material = this.debrisMaterial;
            debris.isVisible = false;
            debris.isPickable = false;
            
            // Enable glow
            if (this.glowLayer) {
                this.glowLayer.addIncludedOnlyMesh(debris);
            }
            
            this.debrisPool.push({
                mesh: debris,
                size: size,
                inUse: false
            });
        }
        
        // Debris pool created: ${this.debrisPool.length} objects
    }

    /**
     * Get a debris mesh from the pool
     */
    getDebrisFromPool() {
        // Find unused debris
        let debris = this.debrisPool.find(d => !d.inUse);
        
        if (!debris) {
            // Expand pool if needed
            const size = 0.01;
            const newDebris = BABYLON.MeshBuilder.CreateSphere(
                `debris_pool_${this.debrisPool.length}`,
                { diameter: size * 2, segments: 4 },
                this.scene
            );
            
            newDebris.material = this.debrisMaterial;
            newDebris.isPickable = false;
            
            if (this.glowLayer) {
                this.glowLayer.addIncludedOnlyMesh(newDebris);
            }
            
            debris = {
                mesh: newDebris,
                size: size,
                inUse: false
            };
            
            this.debrisPool.push(debris);
        }
        
        debris.inUse = true;
        debris.mesh.isVisible = true;
        this.activeDebris.add(debris);
        
        return debris;
    }

    /**
     * Return debris to pool
     */
    returnToPool(debris) {
        debris.inUse = false;
        debris.mesh.isVisible = false;
        debris.mesh.position.set(0, 0, 0);
        this.activeDebris.delete(debris);
        
        // Remove from physics
        physicsEngine.removeBody(debris.mesh.id);
    }

    /**
     * Create a test debris cloud
     */
    createTestDebrisCloud(origin, particleCount = 100, spreadRadius = 0.5) {
        // Creating test debris cloud: ${particleCount} particles
        
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const debris = this.getDebrisFromPool();
            
            // Random position around origin
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.random() * spreadRadius;
            
            debris.mesh.position.x = origin.x + r * Math.sin(phi) * Math.cos(theta);
            debris.mesh.position.y = origin.y + r * Math.sin(phi) * Math.sin(theta);
            debris.mesh.position.z = origin.z + r * Math.cos(phi);
            
            // Random velocity (simulating explosion)
            const speed = 0.001 + Math.random() * 0.005; // km/s scale
            const velocity = {
                x: speed * Math.sin(phi) * Math.cos(theta),
                y: speed * Math.sin(phi) * Math.sin(theta),
                z: speed * Math.cos(phi)
            };
            
            // Add to physics engine
            const mass = debris.size * 1000; // Simple mass calculation
            physicsEngine.addDebris(debris.mesh, velocity, mass);
            
            particles.push(debris);
        }
        
        return particles;
    }

    /**
     * Create debris from collision (NASA breakup model simplified)
     */
    createCollisionDebris(satellite1, satellite2, impactPoint) {
        // Creating collision debris from satellite impact
        
        // Calculate relative velocity
        const v1 = physicsEngine.getVelocity(satellite1.id) || { x: 0, y: 0, z: 0 };
        const v2 = physicsEngine.getVelocity(satellite2.id) || { x: 0, y: 0, z: 0 };
        
        const relativeVelocity = {
            x: v1.x - v2.x,
            y: v1.y - v2.y,
            z: v1.z - v2.z
        };
        
        const impactSpeed = Math.sqrt(
            relativeVelocity.x ** 2 + 
            relativeVelocity.y ** 2 + 
            relativeVelocity.z ** 2
        );
        
        // Simplified debris count based on impact energy
        const mass1 = 500; // kg (example satellite mass)
        const mass2 = 500;
        const totalMass = mass1 + mass2;
        const debrisCount = Math.min(
            Math.floor(100 + impactSpeed * totalMass / 10),
            1000 // Cap for performance
        );
        
        // Impact speed: ${impactSpeed.toFixed(3)} km/s, generating ${debrisCount} debris
        
        const particles = [];
        
        for (let i = 0; i < debrisCount; i++) {
            const debris = this.getDebrisFromPool();
            
            // Position near impact point with some spread
            const spread = 0.1;
            debris.mesh.position.x = impactPoint.x + (Math.random() - 0.5) * spread;
            debris.mesh.position.y = impactPoint.y + (Math.random() - 0.5) * spread;
            debris.mesh.position.z = impactPoint.z + (Math.random() - 0.5) * spread;
            
            // Debris velocity distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            // Speed distribution (Maxwell-Boltzmann-like)
            const speedMultiplier = 0.1 + Math.random() * 0.5;
            const debrisSpeed = impactSpeed * speedMultiplier;
            
            const velocity = {
                x: debrisSpeed * Math.sin(phi) * Math.cos(theta) + (v1.x + v2.x) / 2,
                y: debrisSpeed * Math.sin(phi) * Math.sin(theta) + (v1.y + v2.y) / 2,
                z: debrisSpeed * Math.cos(phi) + (v1.z + v2.z) / 2
            };
            
            // Mass distribution (power law)
            const mass = 0.001 + Math.pow(Math.random(), 2) * 10; // 1g to 10kg
            
            // Add to physics
            physicsEngine.addDebris(debris.mesh, velocity, mass);
            
            particles.push(debris);
        }
        
        // Update debris material for fresh collision
        this.debrisMaterial.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Bright orange
        
        // Fade effect over time
        setTimeout(() => {
            this.debrisMaterial.emissiveColor = new BABYLON.Color3(1, 0.2, 0);
        }, 2000);
        
        return particles;
    }

    /**
     * Update debris visualization
     */
    update(deltaTime) {
        // Could add effects like fading old debris, trails, etc.
        // For now, physics engine handles position updates
    }

    /**
     * Clear all active debris
     */
    clearAllDebris() {
        for (const debris of this.activeDebris) {
            this.returnToPool(debris);
        }
        this.activeDebris.clear();
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalPoolSize: this.debrisPool.length,
            activeDebris: this.activeDebris.size,
            availableDebris: this.debrisPool.filter(d => !d.inUse).length
        };
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearAllDebris();
        
        for (const debris of this.debrisPool) {
            debris.mesh.dispose();
        }
        
        this.debrisPool = [];
        this.debrisMaterial.dispose();
    }
}

export let debrisManager = null;

export function initDebrisManager(scene) {
    if (!debrisManager) {
        debrisManager = new DebrisManager(scene);
    }
    return debrisManager;
}