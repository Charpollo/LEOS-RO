import * as BABYLON from '@babylonjs/core';
import { physicsEngine } from '../physics/physics-engine.js';
import { initDebrisManager } from '../physics/debris-manager.js';

/**
 * Physics test module for Red Orbit
 * Tests Ammo.js integration with collision detection
 */
export class PhysicsTest {
    constructor(scene) {
        this.scene = scene;
        this.debrisManager = null;
        this.testSatellite1 = null;
        this.testSatellite2 = null;
        this.isRunning = false;
        this.collisionOccurred = false;
    }

    /**
     * Initialize physics test
     */
    async initialize() {
        console.log('Initializing Red Orbit Physics Test...');
        
        try {
            // Initialize physics engine
            console.log('Initializing physics engine...');
            await physicsEngine.initialize();
            console.log('Physics engine initialized');
            
            // Initialize debris manager
            console.log('Initializing debris manager...');
            this.debrisManager = initDebrisManager(this.scene);
            console.log('Debris manager initialized');
            
            // Register collision callback
            physicsEngine.registerCollisionCallback('default', (mesh1, mesh2) => {
                this.handleCollision(mesh1, mesh2);
            });
            
            console.log('Physics test initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize physics test:', error);
            console.error('Error stack:', error.stack);
            return false;
        }
    }

    /**
     * Create test satellites on collision course
     */
    createTestSatellites() {
        console.log('Creating test satellites for collision...');
        
        // Create satellite 1 (moving right)
        this.testSatellite1 = BABYLON.MeshBuilder.CreateBox(
            'testSat1',
            { size: 0.02 }, // 20m satellite
            this.scene
        );
        
        const mat1 = new BABYLON.StandardMaterial('testSat1Mat', this.scene);
        mat1.diffuseColor = new BABYLON.Color3(0, 0.7, 1); // Blue
        mat1.emissiveColor = new BABYLON.Color3(0, 0.3, 0.5);
        this.testSatellite1.material = mat1;
        
        // Position on left
        this.testSatellite1.position.set(-2, 0, 0);
        
        // Create satellite 2 (moving left)
        this.testSatellite2 = BABYLON.MeshBuilder.CreateBox(
            'testSat2',
            { size: 0.02 },
            this.scene
        );
        
        const mat2 = new BABYLON.StandardMaterial('testSat2Mat', this.scene);
        mat2.diffuseColor = new BABYLON.Color3(1, 0.7, 0); // Yellow
        mat2.emissiveColor = new BABYLON.Color3(0.5, 0.3, 0);
        this.testSatellite2.material = mat2;
        
        // Position on right
        this.testSatellite2.position.set(2, 0, 0);
        
        // Add to physics with opposing velocities
        physicsEngine.addSatellite(
            this.testSatellite1,
            { x: 0.5, y: 0, z: 0 }, // Moving right at 0.5 km/s
            500 // 500 kg mass
        );
        
        physicsEngine.addSatellite(
            this.testSatellite2,
            { x: -0.5, y: 0, z: 0 }, // Moving left at 0.5 km/s
            500
        );
        
        console.log('Test satellites created and added to physics engine');
    }

    /**
     * Create a simple debris cloud test
     */
    createDebrisCloudTest() {
        console.log('Creating test debris cloud...');
        
        const origin = new BABYLON.Vector3(0, 1, 0);
        const particles = this.debrisManager.createTestDebrisCloud(
            origin,
            50, // 50 particles for initial test
            0.3 // Spread radius
        );
        
        console.log(`Created ${particles.length} debris particles`);
        
        // Add some visual feedback
        const marker = BABYLON.MeshBuilder.CreateSphere(
            'debrisOrigin',
            { diameter: 0.1, segments: 8 },
            this.scene
        );
        marker.position = origin;
        
        const markerMat = new BABYLON.StandardMaterial('markerMat', this.scene);
        markerMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        markerMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        marker.material = markerMat;
        
        // Remove marker after 2 seconds
        setTimeout(() => {
            marker.dispose();
        }, 2000);
    }

    /**
     * Handle collision between objects
     */
    handleCollision(mesh1, mesh2) {
        if (this.collisionOccurred) return; // Only handle first collision
        
        console.log(`COLLISION DETECTED between ${mesh1.name} and ${mesh2.name}`);
        
        // Check if this is our test satellites
        if ((mesh1 === this.testSatellite1 && mesh2 === this.testSatellite2) ||
            (mesh1 === this.testSatellite2 && mesh2 === this.testSatellite1)) {
            
            this.collisionOccurred = true;
            
            // Calculate impact point
            const impactPoint = BABYLON.Vector3.Center(
                mesh1.position,
                mesh2.position
            );
            
            // Create debris from collision
            const debris = this.debrisManager.createCollisionDebris(
                mesh1,
                mesh2,
                impactPoint
            );
            
            console.log(`Collision created ${debris.length} debris particles`);
            
            // Hide original satellites
            setTimeout(() => {
                mesh1.isVisible = false;
                mesh2.isVisible = false;
                physicsEngine.removeBody(mesh1.id);
                physicsEngine.removeBody(mesh2.id);
            }, 100);
        }
    }

    /**
     * Start the physics test
     */
    start() {
        if (this.isRunning) return;
        
        console.log('Starting physics test...');
        this.isRunning = true;
        
        // Create test scenarios
        this.createTestSatellites();
        this.createDebrisCloudTest();
    }

    /**
     * Stop the physics test
     */
    stop() {
        console.log('Stopping physics test...');
        this.isRunning = false;
        
        // Clean up
        if (this.testSatellite1) {
            this.testSatellite1.dispose();
            this.testSatellite1 = null;
        }
        
        if (this.testSatellite2) {
            this.testSatellite2.dispose();
            this.testSatellite2 = null;
        }
        
        this.debrisManager.clearAllDebris();
        this.collisionOccurred = false;
    }

    /**
     * Update physics simulation
     */
    update(deltaTime) {
        if (!this.isRunning) return;
        
        // Update physics engine
        physicsEngine.update(deltaTime);
        
        // Update debris manager
        this.debrisManager.update(deltaTime);
    }

    /**
     * Get test statistics
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            collisionOccurred: this.collisionOccurred,
            debrisStats: this.debrisManager ? this.debrisManager.getStats() : null,
            physicsBodyCount: physicsEngine.bodies.size
        };
    }
}

export let physicsTest = null;

export async function initPhysicsTest(scene) {
    if (!physicsTest) {
        physicsTest = new PhysicsTest(scene);
        await physicsTest.initialize();
    }
    return physicsTest;
}