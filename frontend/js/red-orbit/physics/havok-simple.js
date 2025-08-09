/**
 * Simplified Havok Physics for RED ORBIT
 * Minimal implementation to get working first
 */

import * as BABYLON from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';

export class SimpleHavokPhysics {
    constructor(scene) {
        this.scene = scene;
        this.plugin = null;
        this.objects = [];
        this.bodies = new Map(); // Add bodies map for compatibility
        this.initialized = false;
        
        // Earth parameters
        this.EARTH_RADIUS = 6371; // km
        this.EARTH_MU = 398600.4418; // km³/s²
        this.KM_TO_BABYLON = 1/6371;
        
        this.physicsTimeMultiplier = 1;
    }

    async initialize() {
        console.log('SIMPLE HAVOK: Initializing...');
        
        try {
            // Load Havok WASM
            const havokInstance = await HavokPhysics();
            
            // Create plugin
            this.plugin = new BABYLON.HavokPlugin(true, havokInstance);
            
            // Enable physics on scene
            this.scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), this.plugin);
            
            // Set timestep
            this.plugin.setTimeStep(1/60); // 60 Hz for simplicity
            
            this.initialized = true;
            console.log('SIMPLE HAVOK: Ready!');
            
            // Create a few test objects
            this.createTestObjects();
            
        } catch (error) {
            console.error('SIMPLE HAVOK: Failed to initialize:', error);
            throw error;
        }
    }
    
    createTestObjects() {
        console.log('SIMPLE HAVOK: Creating 100 test objects...');
        
        for (let i = 0; i < 100; i++) {
            // Create mesh
            const mesh = BABYLON.MeshBuilder.CreateSphere(`test_${i}`, {
                diameter: 0.01,
                segments: 8
            }, this.scene);
            
            // Random position in orbit
            const angle = Math.random() * Math.PI * 2;
            const altitude = 400 + Math.random() * 1000; // 400-1400 km
            const radius = (this.EARTH_RADIUS + altitude) * this.KM_TO_BABYLON;
            
            mesh.position.x = radius * Math.cos(angle);
            mesh.position.y = radius * Math.sin(angle);
            mesh.position.z = (Math.random() - 0.5) * radius * 0.2;
            
            // Simple material
            const mat = new BABYLON.StandardMaterial(`mat_${i}`, this.scene);
            mat.emissiveColor = new BABYLON.Color3(0, 1, 1); // Cyan
            mat.disableLighting = true;
            mesh.material = mat;
            
            // Store object
            const obj = {
                mesh: mesh,
                altitude: altitude,
                angle: angle
            };
            this.objects.push(obj);
            
            // Also store in bodies map for compatibility
            this.bodies.set(`test_${i}`, obj);
        }
        
        console.log('SIMPLE HAVOK: Created 100 visual objects');
    }
    
    step(deltaTime) {
        if (!this.initialized) return;
        
        // Simple orbital motion (no physics, just rotation)
        const dt = deltaTime * this.physicsTimeMultiplier;
        
        this.objects.forEach(obj => {
            // Simple circular orbit
            const orbitalPeriod = 90 * 60; // 90 minutes in seconds
            const angularVelocity = (2 * Math.PI) / orbitalPeriod;
            
            obj.angle += angularVelocity * dt;
            
            const radius = (this.EARTH_RADIUS + obj.altitude) * this.KM_TO_BABYLON;
            obj.mesh.position.x = radius * Math.cos(obj.angle);
            obj.mesh.position.y = radius * Math.sin(obj.angle);
        });
    }
    
    // Compatibility methods
    update(deltaTime) {
        this.step(deltaTime);
    }
    
    triggerKesslerSyndrome() {
        console.log('SIMPLE HAVOK: Kessler not implemented in simple version');
        return null;
    }
    
    getKesslerStatus() {
        return {
            active: false,
            collisionCount: 0,
            cascadeLevel: 0,
            debrisGenerated: 0,
            message: 'Simple mode - no collisions',
            criticalMass: false
        };
    }
    
    getStats() {
        return {
            totalObjects: this.objects.length,
            satellites: this.objects.length,
            debris: 0,
            kesslerActive: false,
            physicsTimeMultiplier: this.physicsTimeMultiplier,
            frameCount: 0
        };
    }
    
    dispose() {
        this.objects.forEach(obj => {
            if (obj.mesh) obj.mesh.dispose();
        });
        this.objects = [];
        
        if (this.plugin) {
            this.scene.disablePhysicsEngine();
        }
    }
}