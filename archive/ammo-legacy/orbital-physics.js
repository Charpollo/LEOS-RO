/**
 * Orbital Physics Module for Red Orbit
 * Implements realistic orbital mechanics with Earth's gravity
 */

import { loadAmmo } from './ammo-loader.js';

export class OrbitalPhysics {
    constructor() {
        this.Ammo = null;
        this.world = null;
        this.bodies = new Map();
        
        // Earth parameters
        this.EARTH_RADIUS = 6371; // km
        this.EARTH_MU = 398600.4418; // km³/s² - Earth's gravitational parameter
        this.SCALE_FACTOR = 1000; // 1 unit = 1000 km for visualization
        
        // Time settings
        this.timeMultiplier = 1; // Real-time by default
        this.fixedTimeStep = 1/60;
        
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('Initializing Orbital Physics...');
            
            // Load Ammo.js
            this.Ammo = await loadAmmo();
            
            // Create collision configuration
            const collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfiguration);
            const broadphase = new this.Ammo.btDbvtBroadphase();
            const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
            
            // Create physics world
            this.world = new this.Ammo.btDiscreteDynamicsWorld(
                dispatcher,
                broadphase,
                solver,
                collisionConfiguration
            );
            
            // No default gravity - we'll apply Earth's gravity manually
            this.world.setGravity(new this.Ammo.btVector3(0, 0, 0));
            
            // Enable continuous collision detection for high-speed impacts
            this.world.getBroadphase().getOverlappingPairCache().setInternalGhostPairCallback(
                new this.Ammo.btGhostPairCallback()
            );
            
            this.initialized = true;
            console.log('Orbital Physics initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Orbital Physics:', error);
            throw error;
        }
    }

    /**
     * Create an orbiting body (satellite or debris)
     * @param {Object} params - Body parameters
     * @param {number} params.mass - Mass in kg
     * @param {number} params.radius - Radius in meters
     * @param {Object} params.position - Position in km (x, y, z)
     * @param {Object} params.velocity - Velocity in km/s (x, y, z)
     * @param {string} params.id - Unique identifier
     * @returns {Object} Physics body reference
     */
    createOrbitingBody(params) {
        if (!this.initialized) {
            throw new Error('Orbital Physics not initialized');
        }
        
        const { mass, radius, position, velocity, id } = params;
        
        // Create collision shape (sphere for debris/satellites)
        const shape = new this.Ammo.btSphereShape(radius / 1000); // Convert to km
        
        // Create transform
        const transform = new this.Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new this.Ammo.btVector3(
            position.x / this.SCALE_FACTOR,
            position.y / this.SCALE_FACTOR,
            position.z / this.SCALE_FACTOR
        ));
        
        // Calculate local inertia
        const localInertia = new this.Ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);
        
        // Create motion state
        const motionState = new this.Ammo.btDefaultMotionState(transform);
        
        // Create rigid body
        const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );
        
        // Set restitution and friction for realistic collisions
        rbInfo.set_m_restitution(0.5); // Some energy loss on impact
        rbInfo.set_m_friction(0.3);
        
        const body = new this.Ammo.btRigidBody(rbInfo);
        
        // Set initial velocity
        body.setLinearVelocity(new this.Ammo.btVector3(
            velocity.x / this.SCALE_FACTOR,
            velocity.y / this.SCALE_FACTOR,
            velocity.z / this.SCALE_FACTOR
        ));
        
        // Enable CCD for high-speed objects
        const ccdRadius = radius / 1000 * 0.5;
        body.setCcdMotionThreshold(ccdRadius);
        body.setCcdSweptSphereRadius(ccdRadius);
        
        // Add to physics world
        this.world.addRigidBody(body);
        
        // Store body reference
        this.bodies.set(id, {
            body: body,
            shape: shape,
            motionState: motionState,
            rbInfo: rbInfo,
            transform: transform,
            localInertia: localInertia,
            mass: mass,
            radius: radius
        });
        
        return body;
    }

    /**
     * Apply Earth's gravity to all bodies
     * Uses Newton's law of gravitation: F = -μm/r³ * r_vector
     */
    applyEarthGravity() {
        const earthCenter = new this.Ammo.btVector3(0, 0, 0);
        const tempVec = new this.Ammo.btVector3();
        
        this.bodies.forEach((bodyData, id) => {
            const body = bodyData.body;
            if (!body.isActive()) return;
            
            // Get current position
            const transform = body.getWorldTransform();
            const origin = transform.getOrigin();
            
            // Calculate vector from body to Earth center
            tempVec.setValue(
                earthCenter.x() - origin.x(),
                earthCenter.y() - origin.y(),
                earthCenter.z() - origin.z()
            );
            
            // Calculate distance from Earth center (in km)
            const distance = Math.sqrt(
                tempVec.x() * tempVec.x() +
                tempVec.y() * tempVec.y() +
                tempVec.z() * tempVec.z()
            ) * this.SCALE_FACTOR;
            
            // Skip if too close to Earth (crashed)
            if (distance < this.EARTH_RADIUS) {
                this.handleReentry(id);
                return;
            }
            
            // Calculate gravitational acceleration magnitude
            const accelMagnitude = this.EARTH_MU / (distance * distance);
            
            // Normalize direction vector and scale by acceleration
            const factor = accelMagnitude / (distance / this.SCALE_FACTOR);
            tempVec.op_mul(factor);
            
            // Apply as force (F = ma)
            const force = new this.Ammo.btVector3(
                tempVec.x() * bodyData.mass,
                tempVec.y() * bodyData.mass,
                tempVec.z() * bodyData.mass
            );
            
            body.applyCentralForce(force);
            
            // Clean up
            this.Ammo.destroy(force);
        });
        
        // Clean up
        this.Ammo.destroy(earthCenter);
        this.Ammo.destroy(tempVec);
    }

    /**
     * Handle atmospheric reentry
     */
    handleReentry(id) {
        console.log(`Object ${id} has reentered atmosphere`);
        // Mark for removal
        const bodyData = this.bodies.get(id);
        if (bodyData) {
            bodyData.reentered = true;
        }
    }

    /**
     * Step the physics simulation
     * @param {number} deltaTime - Time step in seconds
     */
    stepSimulation(deltaTime) {
        if (!this.initialized || !this.world) return;
        
        // Apply time multiplier
        const scaledDelta = deltaTime * this.timeMultiplier;
        
        // Apply Earth's gravity before stepping
        this.applyEarthGravity();
        
        // Step physics
        this.world.stepSimulation(scaledDelta, 10, this.fixedTimeStep);
        
        // Check for collisions
        this.checkCollisions();
        
        // Remove reentered objects
        this.cleanupReenteredObjects();
    }

    /**
     * Check for collisions
     */
    checkCollisions() {
        const dispatcher = this.world.getDispatcher();
        const numManifolds = dispatcher.getNumManifolds();
        
        for (let i = 0; i < numManifolds; i++) {
            const manifold = dispatcher.getManifoldByIndexInternal(i);
            const body0 = manifold.getBody0();
            const body1 = manifold.getBody1();
            
            const numContacts = manifold.getNumContacts();
            for (let j = 0; j < numContacts; j++) {
                const pt = manifold.getContactPoint(j);
                if (pt.getDistance() < 0) {
                    // Collision detected
                    this.handleCollision(body0, body1, pt);
                }
            }
        }
    }

    /**
     * Handle collision between two bodies
     */
    handleCollision(body0, body1, contactPoint) {
        // Find body IDs
        let id0, id1;
        this.bodies.forEach((data, id) => {
            if (data.body === body0) id0 = id;
            if (data.body === body1) id1 = id;
        });
        
        if (id0 && id1) {
            console.log(`Collision detected between ${id0} and ${id1}`);
            
            // Get collision velocity
            const vel0 = body0.getLinearVelocity();
            const vel1 = body1.getLinearVelocity();
            const relativeVelocity = Math.sqrt(
                Math.pow(vel0.x() - vel1.x(), 2) +
                Math.pow(vel0.y() - vel1.y(), 2) +
                Math.pow(vel0.z() - vel1.z(), 2)
            ) * this.SCALE_FACTOR;
            
            console.log(`Relative velocity: ${relativeVelocity.toFixed(2)} km/s`);
            
            // Emit collision event
            if (this.onCollision) {
                this.onCollision({
                    id0, id1,
                    relativeVelocity,
                    position: {
                        x: contactPoint.getPositionWorldOnA().x() * this.SCALE_FACTOR,
                        y: contactPoint.getPositionWorldOnA().y() * this.SCALE_FACTOR,
                        z: contactPoint.getPositionWorldOnA().z() * this.SCALE_FACTOR
                    }
                });
            }
        }
    }

    /**
     * Remove objects that have reentered atmosphere
     */
    cleanupReenteredObjects() {
        const toRemove = [];
        this.bodies.forEach((data, id) => {
            if (data.reentered) {
                toRemove.push(id);
            }
        });
        
        toRemove.forEach(id => this.removeBody(id));
    }

    /**
     * Get current state of a body
     */
    getBodyState(id) {
        const bodyData = this.bodies.get(id);
        if (!bodyData) return null;
        
        const body = bodyData.body;
        const transform = body.getWorldTransform();
        const origin = transform.getOrigin();
        const velocity = body.getLinearVelocity();
        
        return {
            position: {
                x: origin.x() * this.SCALE_FACTOR,
                y: origin.y() * this.SCALE_FACTOR,
                z: origin.z() * this.SCALE_FACTOR
            },
            velocity: {
                x: velocity.x() * this.SCALE_FACTOR,
                y: velocity.y() * this.SCALE_FACTOR,
                z: velocity.z() * this.SCALE_FACTOR
            },
            altitude: Math.sqrt(
                origin.x() * origin.x() +
                origin.y() * origin.y() +
                origin.z() * origin.z()
            ) * this.SCALE_FACTOR - this.EARTH_RADIUS
        };
    }

    /**
     * Remove a body from the simulation
     */
    removeBody(id) {
        const bodyData = this.bodies.get(id);
        if (!bodyData) return;
        
        // Remove from physics world
        this.world.removeRigidBody(bodyData.body);
        
        // Destroy Ammo objects
        this.Ammo.destroy(bodyData.body);
        this.Ammo.destroy(bodyData.rbInfo);
        this.Ammo.destroy(bodyData.localInertia);
        this.Ammo.destroy(bodyData.motionState);
        this.Ammo.destroy(bodyData.transform);
        this.Ammo.destroy(bodyData.shape);
        
        // Remove from map
        this.bodies.delete(id);
    }

    /**
     * Set time multiplier for simulation speed
     */
    setTimeMultiplier(multiplier) {
        this.timeMultiplier = Math.max(0.1, Math.min(1000, multiplier));
    }

    /**
     * Cleanup physics world
     */
    dispose() {
        // Remove all bodies
        const ids = Array.from(this.bodies.keys());
        ids.forEach(id => this.removeBody(id));
        
        // Destroy world
        if (this.world) {
            this.Ammo.destroy(this.world);
        }
        
        this.initialized = false;
    }
}