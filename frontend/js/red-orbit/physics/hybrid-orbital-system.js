/**
 * Hybrid Orbital System for Red Orbit
 * Combines TLE-based orbital mechanics with Ammo.js physics
 * - Uses TLE/SGP4 for normal orbital propagation
 * - Switches to Ammo.js physics for collisions and perturbations
 * - Maintains Earth's gravity at all times
 */

import { OrbitalPhysics } from './orbital-physics.js';
import { calculateSatellitePosition, toBabylonPosition } from '../../orbital-mechanics.js';
import * as satellite from 'satellite.js';
import * as BABYLON from '@babylonjs/core';

export class HybridOrbitalSystem {
    constructor(scene) {
        this.scene = scene;
        this.orbitalPhysics = new OrbitalPhysics();
        
        // Track satellites
        this.satellites = new Map(); // satId -> satellite data
        this.physicsOverrides = new Map(); // satId -> physics controlled
        
        // Collision tracking
        this.activeCollisions = new Set();
        this.collisionDebris = new Map();
        
        this.initialized = false;
    }

    /**
     * Initialize the hybrid system
     */
    async initialize() {
        console.log('Initializing Hybrid Orbital System...');
        await this.orbitalPhysics.initialize();
        
        // Set up collision handler
        this.orbitalPhysics.onCollision = (collision) => {
            this.handleCollision(collision);
        };
        
        this.initialized = true;
        console.log('Hybrid Orbital System ready');
    }

    /**
     * Register a satellite with the hybrid system
     */
    registerSatellite(satId, satelliteData) {
        if (!this.initialized) {
            console.warn('System not initialized');
            return;
        }
        
        // Store satellite data
        this.satellites.set(satId, {
            id: satId,
            mesh: satelliteData.mesh,
            orbitalElements: satelliteData.orbitalElements,
            tle1: satelliteData.tle1,
            tle2: satelliteData.tle2,
            mass: satelliteData.mass || 1000, // kg
            radius: satelliteData.radius || 2, // meters
            usePhysics: false // Start with TLE propagation
        });
        
        console.log(`Registered satellite ${satId} in hybrid system`);
    }

    /**
     * Update all satellite positions
     * Called every frame from the main render loop
     */
    updateSatellites(currentSimTime) {
        if (!this.initialized) return;
        
        // Step physics simulation
        this.orbitalPhysics.stepSimulation(1/60);
        
        // Update each satellite
        this.satellites.forEach((satData, satId) => {
            if (this.physicsOverrides.has(satId)) {
                // This satellite is under physics control (post-collision)
                this.updatePhysicsControlledSatellite(satId, satData);
            } else {
                // Normal TLE-based propagation
                this.updateTLEControlledSatellite(satId, satData, currentSimTime);
            }
        });
        
        // Update debris
        this.updateDebris();
    }

    /**
     * Update satellite using TLE/SGP4 propagation
     */
    updateTLEControlledSatellite(satId, satData, currentSimTime) {
        try {
            const epochTime = new Date(satData.orbitalElements.epoch);
            
            // Calculate position using existing orbital mechanics
            const result = calculateSatellitePosition(
                satData.orbitalElements, 
                currentSimTime, 
                epochTime
            );
            
            // Update mesh position
            const pos = toBabylonPosition(result.position);
            satData.mesh.position.copyFrom(pos);
            
            // Create or update physics proxy for collision detection
            this.updatePhysicsProxy(satId, satData, result.position, result.velocity);
            
        } catch (error) {
            console.warn(`Error updating satellite ${satId}:`, error);
        }
    }

    /**
     * Update physics proxy for collision detection
     * This creates an invisible physics body that follows the TLE position
     */
    updatePhysicsProxy(satId, satData, position, velocity) {
        const proxyId = `proxy_${satId}`;
        
        if (!this.orbitalPhysics.bodies.has(proxyId)) {
            // Create physics proxy
            this.orbitalPhysics.createOrbitingBody({
                id: proxyId,
                mass: satData.mass,
                radius: satData.radius,
                position: position,
                velocity: velocity
            });
        } else {
            // Update proxy position to match TLE
            const bodyData = this.orbitalPhysics.bodies.get(proxyId);
            if (bodyData) {
                const transform = bodyData.body.getWorldTransform();
                transform.setOrigin(new this.orbitalPhysics.Ammo.btVector3(
                    position.x / this.orbitalPhysics.SCALE_FACTOR,
                    position.y / this.orbitalPhysics.SCALE_FACTOR,
                    position.z / this.orbitalPhysics.SCALE_FACTOR
                ));
                bodyData.body.setWorldTransform(transform);
                
                // Update velocity
                bodyData.body.setLinearVelocity(new this.orbitalPhysics.Ammo.btVector3(
                    velocity.x / this.orbitalPhysics.SCALE_FACTOR,
                    velocity.y / this.orbitalPhysics.SCALE_FACTOR,
                    velocity.z / this.orbitalPhysics.SCALE_FACTOR
                ));
            }
        }
    }

    /**
     * Update satellite under physics control (post-collision)
     */
    updatePhysicsControlledSatellite(satId, satData) {
        const physicsId = `physics_${satId}`;
        const state = this.orbitalPhysics.getBodyState(physicsId);
        
        if (state) {
            // Convert physics position to Babylon
            const KM_TO_BABYLON = 1 / 6371;
            satData.mesh.position.x = state.position.x * KM_TO_BABYLON;
            satData.mesh.position.y = state.position.y * KM_TO_BABYLON;
            satData.mesh.position.z = state.position.z * KM_TO_BABYLON;
            
            // Check if satellite has reentered atmosphere
            if (state.altitude < 100) { // Below 100 km
                console.log(`Satellite ${satId} has reentered atmosphere`);
                this.removeSatellite(satId);
            }
        }
    }

    /**
     * Handle collision between objects
     */
    handleCollision(collision) {
        console.log('COLLISION DETECTED!', collision);
        
        // Extract real satellite IDs from proxy IDs
        const id0 = collision.id0.replace('proxy_', '');
        const id1 = collision.id1.replace('proxy_', '');
        
        // Get satellite data
        const sat0 = this.satellites.get(id0);
        const sat1 = this.satellites.get(id1);
        
        if (!sat0 || !sat1) return;
        
        console.log(`Satellite collision: ${id0} vs ${id1} at ${collision.relativeVelocity.toFixed(2)} km/s`);
        
        // Switch both satellites to physics control
        this.switchToPhysicsControl(id0, collision.position, collision.relativeVelocity);
        this.switchToPhysicsControl(id1, collision.position, collision.relativeVelocity);
        
        // Generate debris
        this.generateDebris(collision.position, collision.relativeVelocity, sat0.mass + sat1.mass);
        
        // Mark collision as active
        this.activeCollisions.add(`${id0}_${id1}`);
        
        // Emit event for UI updates
        if (this.onCollision) {
            this.onCollision({
                satellites: [id0, id1],
                position: collision.position,
                relativeVelocity: collision.relativeVelocity
            });
        }
    }

    /**
     * Switch satellite from TLE to physics control
     */
    switchToPhysicsControl(satId, collisionPos, impactVelocity) {
        const satData = this.satellites.get(satId);
        if (!satData) return;
        
        // Mark as physics controlled
        this.physicsOverrides.set(satId, true);
        
        // Get current state from proxy
        const proxyId = `proxy_${satId}`;
        const proxyState = this.orbitalPhysics.getBodyState(proxyId);
        
        if (proxyState) {
            // Create new physics body for post-collision motion
            const physicsId = `physics_${satId}`;
            
            // Add random perturbation from collision
            const deltaV = {
                x: (Math.random() - 0.5) * impactVelocity * 0.1,
                y: (Math.random() - 0.5) * impactVelocity * 0.1,
                z: (Math.random() - 0.5) * impactVelocity * 0.1
            };
            
            this.orbitalPhysics.createOrbitingBody({
                id: physicsId,
                mass: satData.mass * 0.7, // Lost some mass in collision
                radius: satData.radius,
                position: proxyState.position,
                velocity: {
                    x: proxyState.velocity.x + deltaV.x,
                    y: proxyState.velocity.y + deltaV.y,
                    z: proxyState.velocity.z + deltaV.z
                }
            });
            
            // Remove the proxy
            this.orbitalPhysics.removeBody(proxyId);
        }
    }

    /**
     * Generate debris from collision
     */
    generateDebris(position, relativeVelocity, totalMass) {
        // Number of debris pieces based on impact energy
        const debrisCount = Math.min(50, Math.floor(relativeVelocity * 5));
        
        console.log(`Generating ${debrisCount} debris pieces at position:`, position);
        
        // Calculate orbital velocity at this altitude
        const altitude = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const orbitalSpeed = Math.sqrt(this.orbitalPhysics.EARTH_MU / altitude); // km/s
        
        // Get orbital velocity direction (perpendicular to position vector)
        const posNorm = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const orbitalDir = {
            x: -position.y / posNorm,
            y: position.x / posNorm,
            z: 0
        };
        
        for (let i = 0; i < debrisCount; i++) {
            const debrisId = `debris_${Date.now()}_${i}`;
            
            // Random debris properties
            const mass = Math.random() * 10 + 1; // 1-11 kg
            const radius = Math.random() * 0.5 + 0.1; // 0.1-0.6 m
            
            // Explosion delta-V in random direction
            const explosionSpeed = relativeVelocity * 0.1; // 10% of collision velocity
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            // Base orbital velocity plus explosion delta
            const velocity = {
                x: orbitalDir.x * orbitalSpeed + explosionSpeed * Math.sin(phi) * Math.cos(theta),
                y: orbitalDir.y * orbitalSpeed + explosionSpeed * Math.sin(phi) * Math.sin(theta),
                z: orbitalDir.z * orbitalSpeed + explosionSpeed * Math.cos(phi)
            };
            
            // Create physics body for debris
            this.orbitalPhysics.createOrbitingBody({
                id: debrisId,
                mass: mass,
                radius: radius,
                position: position,
                velocity: velocity
            });
            
            // Create visual mesh - make it larger so it's visible
            const visualScale = 0.01; // Scale up for visibility (10m visual size)
            const debrisMesh = BABYLON.MeshBuilder.CreateSphere(debrisId, {
                diameter: visualScale,
                segments: 8
            }, this.scene);
            
            // Bright red-orange glowing material
            const material = new BABYLON.StandardMaterial(`${debrisId}_mat`, this.scene);
            material.diffuseColor = new BABYLON.Color3(1, 0.3, 0);
            material.emissiveColor = new BABYLON.Color3(1, 0.2, 0);
            material.specularColor = new BABYLON.Color3(1, 1, 1);
            debrisMesh.material = material;
            
            // Store debris data
            this.collisionDebris.set(debrisId, {
                mesh: debrisMesh,
                createdAt: Date.now()
            });
        }
    }

    /**
     * Update debris positions
     */
    updateDebris() {
        const now = Date.now();
        const KM_TO_BABYLON = 1 / 6371;
        
        this.collisionDebris.forEach((debris, debrisId) => {
            // Remove old debris (> 5 minutes)
            if (now - debris.createdAt > 300000) {
                this.orbitalPhysics.removeBody(debrisId);
                debris.mesh.dispose();
                this.collisionDebris.delete(debrisId);
                return;
            }
            
            // Update position from physics
            const state = this.orbitalPhysics.getBodyState(debrisId);
            if (state) {
                debris.mesh.position.x = state.position.x * KM_TO_BABYLON;
                debris.mesh.position.y = state.position.y * KM_TO_BABYLON;
                debris.mesh.position.z = state.position.z * KM_TO_BABYLON;
                
                // Remove if reentered
                if (state.altitude < 100) {
                    this.orbitalPhysics.removeBody(debrisId);
                    debris.mesh.dispose();
                    this.collisionDebris.delete(debrisId);
                }
            }
        });
    }

    /**
     * Remove a satellite
     */
    removeSatellite(satId) {
        // Remove physics bodies
        this.orbitalPhysics.removeBody(`proxy_${satId}`);
        this.orbitalPhysics.removeBody(`physics_${satId}`);
        
        // Hide mesh
        const satData = this.satellites.get(satId);
        if (satData && satData.mesh) {
            satData.mesh.isVisible = false;
        }
        
        // Clean up
        this.satellites.delete(satId);
        this.physicsOverrides.delete(satId);
    }

    /**
     * Set time multiplier
     */
    setTimeMultiplier(multiplier) {
        this.orbitalPhysics.setTimeMultiplier(multiplier);
    }

    /**
     * Trigger Kessler Syndrome cascade event
     */
    triggerKesslerSyndrome(velocity = 7.5, debrisCount = 50) {
        console.log(`Triggering Kessler Syndrome! Velocity: ${velocity} km/s, Debris: ${debrisCount}`);
        
        // Find two satellites to collide
        const satellites = Array.from(this.satellites.entries());
        if (satellites.length < 2) {
            console.warn('Not enough satellites for collision');
            // Create some test satellites if none exist
            this.createTestSatellites();
            return;
        }
        
        // Pick two different satellites
        const satIndex1 = Math.floor(Math.random() * satellites.length);
        let satIndex2 = Math.floor(Math.random() * satellites.length);
        while (satIndex2 === satIndex1 && satellites.length > 1) {
            satIndex2 = Math.floor(Math.random() * satellites.length);
        }
        
        const [satId1, satData1] = satellites[satIndex1];
        const [satId2, satData2] = satellites[satIndex2];
        
        console.log(`Colliding ${satId1} with ${satId2}`);
        
        // Get current positions
        const pos1 = satData1.mesh.position.clone();
        const pos2 = satData2.mesh.position.clone();
        
        // Move satellites closer to force collision
        const midPoint = BABYLON.Vector3.Lerp(pos1, pos2, 0.5);
        
        // Convert to physics coordinates
        const physicsPos = {
            x: midPoint.x * 6371, // Convert from Babylon to km
            y: midPoint.y * 6371,
            z: midPoint.z * 6371
        };
        
        // Force physics bodies to collide by moving them to same position
        const proxyId1 = `proxy_${satId1}`;
        const proxyId2 = `proxy_${satId2}`;
        
        // Move physics proxies to collision point
        if (this.orbitalPhysics.bodies.has(proxyId1) && this.orbitalPhysics.bodies.has(proxyId2)) {
            const body1 = this.orbitalPhysics.bodies.get(proxyId1).body;
            const body2 = this.orbitalPhysics.bodies.get(proxyId2).body;
            
            // Set collision velocities
            const collisionVel = velocity * 1000; // km/s to m/s
            body1.setLinearVelocity(new this.orbitalPhysics.Ammo.btVector3(
                collisionVel, 0, 0
            ));
            body2.setLinearVelocity(new this.orbitalPhysics.Ammo.btVector3(
                -collisionVel, 0, 0
            ));
            
            // Move bodies to collision point
            const transform1 = body1.getWorldTransform();
            const transform2 = body2.getWorldTransform();
            
            transform1.setOrigin(new this.orbitalPhysics.Ammo.btVector3(
                physicsPos.x / 100,
                physicsPos.y / 100,
                physicsPos.z / 100
            ));
            
            transform2.setOrigin(new this.orbitalPhysics.Ammo.btVector3(
                (physicsPos.x + 0.01) / 100, // Slight offset to ensure collision
                physicsPos.y / 100,
                physicsPos.z / 100
            ));
            
            body1.setWorldTransform(transform1);
            body2.setWorldTransform(transform2);
            
            // Activate bodies
            body1.activate(true);
            body2.activate(true);
        }
        
        // Create collision event
        const collision = {
            object0: { id: satId1 },
            object1: { id: satId2 },
            position: physicsPos,
            relativeVelocity: velocity * 1000
        };
        
        // Handle the collision
        this.handleCollision(collision);
        
        // Notify UI
        if (window.showNotification) {
            window.showNotification('KESSLER SYNDROME INITIATED', 'error');
        }
    }
    
    /**
     * Create test satellites if none exist
     */
    createTestSatellites() {
        console.log('Creating test satellites for collision demo...');
        // This would need to be implemented to create satellites dynamically
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            satelliteCount: this.satellites.size,
            physicsControlled: this.physicsOverrides.size,
            debrisCount: this.collisionDebris.size,
            activeCollisions: this.activeCollisions.size
        };
    }

    /**
     * Cleanup
     */
    dispose() {
        // Clean up all debris
        this.collisionDebris.forEach((debris, id) => {
            debris.mesh.dispose();
        });
        
        // Dispose physics
        this.orbitalPhysics.dispose();
        
        // Clear maps
        this.satellites.clear();
        this.physicsOverrides.clear();
        this.collisionDebris.clear();
        this.activeCollisions.clear();
    }
}