import { loadAmmo, getAmmo } from './ammo-loader.js';

/**
 * Physics engine wrapper for Red Orbit collision detection and debris simulation
 * Uses Ammo.js (Bullet Physics) for accurate space physics
 */
export class PhysicsEngine {
    constructor() {
        this.world = null;
        this.bodies = new Map(); // Map of mesh.id to physics body
        this.debugMode = false;
        this.collisionCallbacks = new Map();
        this.isInitialized = false;
        this.tempTransform = null;
        this.collisionConfiguration = null;
        this.dispatcher = null;
        this.broadphase = null;
        this.solver = null;
        this.Ammo = null; // Store Ammo instance
    }

    /**
     * Initialize the physics world
     */
    async initialize() {
        try {
            // Load Ammo.js
            this.Ammo = await loadAmmo();
            
            // Create collision configuration
            this.collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
            
            // Create collision dispatcher
            this.dispatcher = new this.Ammo.btCollisionDispatcher(this.collisionConfiguration);
            
            // Create broadphase
            this.broadphase = new this.Ammo.btDbvtBroadphase();
            
            // Create constraint solver
            this.solver = new this.Ammo.btSequentialImpulseConstraintSolver();
            
            // Create physics world
            this.world = new this.Ammo.btDiscreteDynamicsWorld(
                this.dispatcher,
                this.broadphase,
                this.solver,
                this.collisionConfiguration
            );
            
            // No gravity in space
            this.world.setGravity(new this.Ammo.btVector3(0, 0, 0));
            
            // Store temp transform for reuse
            this.tempTransform = new this.Ammo.btTransform();
            
            this.isInitialized = true;
            console.log('Red Orbit Physics Engine initialized');
            
        } catch (error) {
            console.error('Failed to initialize physics engine:', error);
            throw error;
        }
    }

    /**
     * Add a satellite to the physics world
     */
    addSatellite(mesh, velocity = { x: 0, y: 0, z: 0 }, mass = 500) {
        if (!this.isInitialized) {
            console.warn('Physics engine not initialized');
            return null;
        }

        // Create collision shape (box for satellites)
        const size = mesh.getBoundingInfo().boundingBox.extendSize;
        const shape = new this.Ammo.btBoxShape(
            new this.Ammo.btVector3(size.x, size.y, size.z)
        );

        // Create transform
        const transform = new this.Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new this.Ammo.btVector3(
            mesh.position.x,
            mesh.position.y,
            mesh.position.z
        ));

        // Create motion state
        const motionState = new this.Ammo.btDefaultMotionState(transform);
        
        // Calculate inertia
        const localInertia = new this.Ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);

        // Create rigid body
        const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );

        const body = new this.Ammo.btRigidBody(rbInfo);
        
        // Set velocity
        body.setLinearVelocity(new this.Ammo.btVector3(velocity.x, velocity.y, velocity.z));
        
        // Enable continuous collision detection for fast moving objects
        body.setCcdMotionThreshold(0.1);
        body.setCcdSweptSphereRadius(0.2);

        // Add to physics world
        this.world.addRigidBody(body);
        
        // Store reference
        this.bodies.set(mesh.id, {
            body: body,
            mesh: mesh,
            type: 'satellite'
        });

        // Clean up temporary objects (but not shape, transform, motionState as they're used by the body)
        this.Ammo.destroy(localInertia);
        this.Ammo.destroy(rbInfo);

        return body;
    }

    /**
     * Add debris particle to the physics world
     */
    addDebris(mesh, velocity = { x: 0, y: 0, z: 0 }, mass = 0.1) {
        if (!this.isInitialized) return null;

        // Use sphere shape for debris
        const radius = mesh.scaling.x;
        const shape = new this.Ammo.btSphereShape(radius);

        // Create transform
        const transform = new this.Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new this.Ammo.btVector3(
            mesh.position.x,
            mesh.position.y,
            mesh.position.z
        ));

        // Create motion state
        const motionState = new this.Ammo.btDefaultMotionState(transform);
        
        // Calculate inertia
        const localInertia = new this.Ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);

        // Create rigid body
        const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );

        const body = new this.Ammo.btRigidBody(rbInfo);
        
        // Set velocity
        body.setLinearVelocity(new this.Ammo.btVector3(velocity.x, velocity.y, velocity.z));
        
        // Add to physics world
        this.world.addRigidBody(body);
        
        // Store reference
        this.bodies.set(mesh.id, {
            body: body,
            mesh: mesh,
            type: 'debris'
        });

        // Clean up temporary objects (but not shape, transform, motionState as they're used by the body)
        this.Ammo.destroy(localInertia);
        this.Ammo.destroy(rbInfo);

        return body;
    }

    /**
     * Update physics simulation
     */
    update(deltaTime) {
        if (!this.isInitialized || !this.world) return;

        try {
            // Step simulation with safety checks
            const fixedTimeStep = 1/60; // 60 FPS
            const maxSubSteps = 3;
            
            // Clamp deltaTime to prevent instability
            const clampedDelta = Math.min(deltaTime, fixedTimeStep * maxSubSteps);
            
            this.world.stepSimulation(clampedDelta, maxSubSteps, fixedTimeStep);

            // Update mesh positions from physics bodies
            for (const [id, data] of this.bodies) {
                if (data.body && data.mesh) {
                    const motionState = data.body.getMotionState();
                    if (motionState) {
                        motionState.getWorldTransform(this.tempTransform);
                        const origin = this.tempTransform.getOrigin();
                        const rotation = this.tempTransform.getRotation();
                        
                        // Update mesh position
                        data.mesh.position.set(origin.x(), origin.y(), origin.z());
                        
                        // Update mesh rotation (quaternion)
                        if (!data.mesh.rotationQuaternion) {
                            data.mesh.rotationQuaternion = new BABYLON.Quaternion();
                        }
                        data.mesh.rotationQuaternion.set(
                            rotation.x(),
                            rotation.y(),
                            rotation.z(),
                            rotation.w()
                        );
                    }
                }
            }

            // Check for collisions
            this.checkCollisions();
        } catch (error) {
            console.error('Physics update error:', error);
            // Don't crash the whole app if physics fails
        }
    }

    /**
     * Check for collisions between objects
     */
    checkCollisions() {
        const numManifolds = this.dispatcher.getNumManifolds();
        
        for (let i = 0; i < numManifolds; i++) {
            const contactManifold = this.dispatcher.getManifoldByIndexInternal(i);
            const numContacts = contactManifold.getNumContacts();
            
            if (numContacts > 0) {
                const body0 = this.Ammo.castObject(contactManifold.getBody0(), this.Ammo.btRigidBody);
                const body1 = this.Ammo.castObject(contactManifold.getBody1(), this.Ammo.btRigidBody);
                
                // Find meshes for these bodies
                let mesh0 = null;
                let mesh1 = null;
                
                for (const [id, data] of this.bodies) {
                    if (data.body === body0) mesh0 = data.mesh;
                    if (data.body === body1) mesh1 = data.mesh;
                }
                
                if (mesh0 && mesh1) {
                    // Trigger collision callbacks
                    this.onCollision(mesh0, mesh1);
                }
            }
        }
    }

    /**
     * Handle collision between two objects
     */
    onCollision(mesh1, mesh2) {
        const callback = this.collisionCallbacks.get('default');
        if (callback) {
            callback(mesh1, mesh2);
        }
    }

    /**
     * Register a collision callback
     */
    registerCollisionCallback(name, callback) {
        this.collisionCallbacks.set(name, callback);
    }

    /**
     * Remove a body from the physics world
     */
    removeBody(meshId) {
        const data = this.bodies.get(meshId);
        if (data && data.body) {
            this.world.removeRigidBody(data.body);
            this.Ammo.destroy(data.body);
            this.bodies.delete(meshId);
        }
    }

    /**
     * Get velocity of a body
     */
    getVelocity(meshId) {
        const data = this.bodies.get(meshId);
        if (data && data.body) {
            const velocity = data.body.getLinearVelocity();
            return {
                x: velocity.x(),
                y: velocity.y(),
                z: velocity.z()
            };
        }
        return { x: 0, y: 0, z: 0 };
    }

    /**
     * Set velocity of a body
     */
    setVelocity(meshId, velocity) {
        const data = this.bodies.get(meshId);
        if (data && data.body) {
            data.body.setLinearVelocity(
                new this.Ammo.btVector3(velocity.x, velocity.y, velocity.z)
            );
        }
    }

    /**
     * Enable/disable debug visualization
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        // Debug rendering would be implemented with Babylon.js debug meshes
    }

    /**
     * Clean up physics world
     */
    dispose() {
        // Remove all bodies
        for (const [id, data] of this.bodies) {
            if (data.body) {
                this.world.removeRigidBody(data.body);
                this.Ammo.destroy(data.body);
            }
        }
        this.bodies.clear();

        // Destroy world
        if (this.world) {
            this.Ammo.destroy(this.world);
        }
        if (this.solver) {
            this.Ammo.destroy(this.solver);
        }
        if (this.broadphase) {
            this.Ammo.destroy(this.broadphase);
        }
        if (this.dispatcher) {
            this.Ammo.destroy(this.dispatcher);
        }
        if (this.collisionConfiguration) {
            this.Ammo.destroy(this.collisionConfiguration);
        }
        if (this.tempTransform) {
            this.Ammo.destroy(this.tempTransform);
        }

        this.isInitialized = false;
    }
}

// Export singleton instance (will be created when needed)
let physicsEngineInstance = null;

export function getPhysicsEngine() {
    if (!physicsEngineInstance) {
        physicsEngineInstance = new PhysicsEngine();
    }
    return physicsEngineInstance;
}

export const physicsEngine = {
    initialize: async () => {
        const engine = getPhysicsEngine();
        return engine.initialize();
    },
    addSatellite: (...args) => {
        const engine = getPhysicsEngine();
        return engine.addSatellite(...args);
    },
    addDebris: (...args) => {
        const engine = getPhysicsEngine();
        return engine.addDebris(...args);
    },
    update: (...args) => {
        const engine = getPhysicsEngine();
        return engine.update(...args);
    },
    removeBody: (...args) => {
        const engine = getPhysicsEngine();
        return engine.removeBody(...args);
    },
    getVelocity: (...args) => {
        const engine = getPhysicsEngine();
        return engine.getVelocity(...args);
    },
    setVelocity: (...args) => {
        const engine = getPhysicsEngine();
        return engine.setVelocity(...args);
    },
    registerCollisionCallback: (...args) => {
        const engine = getPhysicsEngine();
        return engine.registerCollisionCallback(...args);
    },
    get bodies() {
        const engine = getPhysicsEngine();
        return engine.bodies || new Map();
    }
};