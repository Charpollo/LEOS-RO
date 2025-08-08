/**
 * RED ORBIT PHYSICS ENGINE
 * Pure physics simulation - no hybrid bullshit
 * Real gravity, real orbits, real collisions
 */

import * as BABYLON from '@babylonjs/core';
import { loadAmmo } from './ammo-loader.js';

export class RedOrbitPhysics {
    constructor(scene) {
        this.scene = scene;
        this.Ammo = null;
        this.world = null;
        this.bodies = new Map();
        this.debris = new Map();
        this.debrisMeshPool = []; // Mesh pooling for performance
        this.maxDebris = 10000; // Support thousands of debris
        this.telemetryData = new Map(); // Track telemetry for all objects
        
        // Real Earth parameters
        this.EARTH_RADIUS = 6371; // km
        this.EARTH_MU = 398600.4418; // km³/s² - Earth's gravitational parameter
        
        // Physics scaling: Use km directly as physics units
        // This makes the math simpler and more stable
        this.KM_TO_PHYSICS = 1.0; // 1 physics unit = 1 km
        this.PHYSICS_TO_KM = 1.0;
        this.KM_TO_BABYLON = 1/6371; // Earth radius = 1 Babylon unit
        
        
        // Performance optimization
        this.updateCounter = 0;
        this.meshUpdateFrequency = 1; // Update meshes every physics step for smooth motion
        this.physicsTimeMultiplier = 60; // 60x speed for realistic orbital visualization
        
        this.initialized = false;
    }

    async initialize() {
        console.log('RED ORBIT: Initializing physics engine...');
        
        // Load Ammo.js
        this.Ammo = await loadAmmo();
        
        // Create physics world
        const collisionConfig = new this.Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfig);
        const broadphase = new this.Ammo.btDbvtBroadphase();
        const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
        
        this.world = new this.Ammo.btDiscreteDynamicsWorld(
            dispatcher,
            broadphase,
            solver,
            collisionConfig
        );
        
        // No default gravity - we calculate it ourselves
        this.world.setGravity(new this.Ammo.btVector3(0, 0, 0));
        
        this.initialized = true;
        console.log('RED ORBIT: Physics engine ready!');
        
        // Populate space with initial objects
        this.populateInitialOrbits();
    }
    
    /**
     * Populate space with hundreds of realistic orbiting objects
     */
    populateInitialOrbits() {
        // Scale to 750 objects for better performance and visibility
        
        // LEO satellites (200-2000 km) - most populated region
        for (let i = 0; i < 450; i++) {
            this.createRandomSatellite('LEO', i);
        }
        
        // MEO satellites (2000-20000 km) - navigation layer
        for (let i = 0; i < 150; i++) {
            this.createRandomSatellite('MEO', i);
        }
        
        // High orbit satellites (10000-15000 km)
        for (let i = 0; i < 75; i++) {
            this.createRandomSatellite('HIGH', i);
        }
        
        // Space debris in various orbits
        for (let i = 0; i < 75; i++) {
            this.createRandomDebris(i);
        }
        
        console.log(`RED ORBIT: ${this.bodies.size} objects in orbit`);
    }
    
    /**
     * Create a random satellite in specified orbit type
     */
    createRandomSatellite(orbitType, index) {
        let altitude, inclination;
        
        // Create realistic orbit types
        const orbitStyles = [
            'polar',      // 90° inclination
            'sun-sync',   // ~98° inclination (retrograde)
            'equatorial', // 0° inclination
            'molniya',    // High inclination, eccentric
            'inclined'    // Various inclinations
        ];
        
        const style = orbitStyles[Math.floor(Math.random() * orbitStyles.length)];
        
        switch(orbitType) {
            case 'LEO':
                altitude = 200 + Math.random() * 1800; // 200-2000 km
                // Set inclination based on orbit style
                if (style === 'polar') inclination = 85 + Math.random() * 10; // 85-95°
                else if (style === 'sun-sync') inclination = 96 + Math.random() * 8; // 96-104° (retrograde)
                else if (style === 'equatorial') inclination = Math.random() * 10; // 0-10°
                else if (style === 'molniya') inclination = 63.4 + Math.random() * 5; // ~63.4° (critical inclination)
                else inclination = 20 + Math.random() * 60; // 20-80° general
                break;
            case 'MEO':
                altitude = 2000 + Math.random() * 18000; // 2000-20000 km
                // MEO often used for navigation (GPS, GLONASS)
                if (Math.random() < 0.5) inclination = 55 + Math.random() * 10; // GPS-like
                else inclination = 64.8 + Math.random() * 5; // GLONASS-like
                break;
            case 'HIGH':
                altitude = 10000 + Math.random() * 5000; // 10000-15000 km
                // Mix of GEO-transfer and Molniya-type orbits
                if (Math.random() < 0.3) inclination = Math.random() * 5; // Near-equatorial
                else inclination = 40 + Math.random() * 40; // Various high inclinations
                break;
        }
        
        // Create visual mesh - GLOWING ORB STYLE
        const satId = `${orbitType}_SAT_${index}`;
        // Slightly bigger orbs for better visibility
        const diameter = orbitType === 'HIGH' ? 0.012 : (orbitType === 'MEO' ? 0.01 : 0.008);
        const mesh = BABYLON.MeshBuilder.CreateSphere(
            satId,
            { diameter: diameter, segments: 8 },
            this.scene
        );
        
        // SDA-style glowing orb materials
        const material = new BABYLON.StandardMaterial(`mat_${satId}`, this.scene);
        material.disableLighting = true; // Make it glow
        
        if (orbitType === 'LEO') {
            // Bright Cyan/Blue for LEO
            material.emissiveColor = new BABYLON.Color3(0, 1, 1);
            material.diffuseColor = new BABYLON.Color3(0, 1, 1);
        } else if (orbitType === 'MEO') {
            // Bright Green for MEO
            material.emissiveColor = new BABYLON.Color3(0, 1, 0);
            material.diffuseColor = new BABYLON.Color3(0, 1, 0);
        } else if (orbitType === 'HIGH') {
            // Bright Yellow/Gold for HIGH orbit
            material.emissiveColor = new BABYLON.Color3(1, 1, 0);
            material.diffuseColor = new BABYLON.Color3(1, 1, 0);
        } else {
            // Default bright white
            material.emissiveColor = new BABYLON.Color3(1, 1, 1);
            material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        }
        
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        material.alpha = 1.0; // Full opacity for visibility
        mesh.material = material;
        
        // Set rendering group 0 to respect depth (not render on top)
        mesh.renderingGroupId = 0;
        mesh.isPickable = true;
        mesh.visibility = 1.0;
        
        // Create satellite with physics
        this.createSatellite({
            id: satId,
            altitude: altitude,
            inclination: inclination,
            mass: 100 + Math.random() * 1000, // 100-1100 kg
            radius: 1 + Math.random() * 3, // 1-4 m
            mesh: mesh
        });
    }
    
    /**
     * Create random space debris
     */
    createRandomDebris(index) {
        const debrisId = `DEBRIS_${index}`;
        const altitude = 200 + Math.random() * 2000; // Mostly in LEO
        
        // Create visual mesh - GLOWING DEBRIS ORB
        const mesh = BABYLON.MeshBuilder.CreateSphere(
            debrisId,
            { diameter: 0.006, segments: 6 }, // Slightly bigger debris orb
            this.scene
        );
        
        // Bright Red/Orange glowing orb for debris - DANGER!
        const material = new BABYLON.StandardMaterial(`mat_${debrisId}`, this.scene);
        material.disableLighting = true; // Make it glow
        material.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Bright red-orange
        material.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        material.alpha = 1.0; // Full opacity for visibility
        mesh.material = material;
        
        // Set rendering group 0 to respect depth (not render on top)
        mesh.renderingGroupId = 0;
        mesh.isPickable = true;
        mesh.visibility = 1.0;
        
        // Create debris object
        this.createSatellite({
            id: debrisId,
            altitude: altitude,
            inclination: Math.random() * 180,
            mass: 1 + Math.random() * 100, // 1-100 kg
            radius: 0.1 + Math.random() * 1, // 0.1-1.1 m
            mesh: mesh
        });
    }

    /**
     * Create a satellite in orbit
     * @param {Object} params
     * @param {number} params.altitude - Altitude above Earth surface (km)
     * @param {number} params.inclination - Orbital inclination (degrees)
     * @param {number} params.mass - Mass (kg)
     * @param {number} params.radius - Collision radius (m)
     * @param {string} params.id - Unique ID
     * @param {BABYLON.Mesh} params.mesh - Babylon mesh
     */
    createSatellite(params) {
        const { altitude, inclination, mass = 500, radius = 2, id, mesh } = params;
        
        // Calculate orbital radius
        const orbitalRadius = this.EARTH_RADIUS + altitude;
        
        // REAL ORBITAL VELOCITY from physics: v = √(μ/r)
        // This gives ACTUAL speeds:
        // - ISS (400km): ~7.67 km/s
        // - LEO (1000km): ~7.35 km/s  
        // - MEO (20000km): ~3.87 km/s
        // - GEO (35786km): ~3.07 km/s
        const orbitalSpeed = Math.sqrt(this.EARTH_MU / orbitalRadius);
        
        // Random position on orbit
        const angle = Math.random() * Math.PI * 2;
        const incRad = (inclination || 0) * Math.PI / 180;
        
        // Position in orbit
        const position = {
            x: orbitalRadius * Math.cos(angle) * Math.cos(incRad),
            y: orbitalRadius * Math.sin(angle),
            z: orbitalRadius * Math.cos(angle) * Math.sin(incRad)
        };
        
        // Velocity perpendicular to position (circular orbit)
        // For circular orbit, v = sqrt(μ/r) in tangential direction
        // Normalize position vector
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        
        // Simple approach: velocity is perpendicular to radius in orbital plane
        // For circular orbit, cross product of orbit normal with position gives velocity direction
        
        // Orbit normal vector (determines plane of orbit)
        const orbitNormal = {
            x: Math.sin(incRad),
            y: 0,
            z: Math.cos(incRad)
        };
        
        // Velocity = orbit_normal × position_unit * speed
        // This gives us tangential velocity in the orbital plane
        const unitPos = {
            x: position.x / r,
            y: position.y / r,
            z: position.z / r
        };
        
        // For retrograde orbits (sun-sync), reverse direction
        const isRetrograde = inclination > 90 && inclination < 180;
        const direction = isRetrograde ? -1 : 1;
        
        // For a circular orbit, velocity is perpendicular to radius vector
        // In the simplest case (equatorial orbit), v_x = -y * speed/r, v_y = x * speed/r
        // For inclined orbits, we need to rotate this velocity vector
        
        // Start with velocity perpendicular to position in xy plane
        let velocity = {
            x: -position.y * orbitalSpeed / r,
            y: position.x * orbitalSpeed / r,
            z: 0
        };
        
        // Apply inclination rotation if needed
        if (Math.abs(incRad) > 0.01) {
            // Rotate velocity vector around x-axis by inclination angle
            const cosInc = Math.cos(incRad);
            const sinInc = Math.sin(incRad);
            const rotatedY = velocity.y * cosInc - velocity.z * sinInc;
            const rotatedZ = velocity.y * sinInc + velocity.z * cosInc;
            velocity.y = rotatedY;
            velocity.z = rotatedZ;
        }
        
        // Reverse for retrograde orbits
        if (isRetrograde) {
            velocity.x *= -1;
            velocity.y *= -1;
            velocity.z *= -1;
        }
        
        
        // Create physics body
        this.createPhysicsBody({
            id,
            mass,
            radius: radius / 1000, // Convert m to km
            position,
            velocity,
            mesh,
            isSatellite: true
        });
    }

    /**
     * Create a physics body
     */
    createPhysicsBody(params) {
        const { id, mass, radius, position, velocity, mesh, isSatellite = false } = params;
        
        // Create collision shape
        const shape = new this.Ammo.btSphereShape(radius * this.KM_TO_PHYSICS);
        
        // Create transform
        const transform = new this.Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new this.Ammo.btVector3(
            position.x * this.KM_TO_PHYSICS,
            position.y * this.KM_TO_PHYSICS,
            position.z * this.KM_TO_PHYSICS
        ));
        
        // Calculate inertia
        const localInertia = new this.Ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);
        
        // Create rigid body
        const motionState = new this.Ammo.btDefaultMotionState(transform);
        const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );
        
        // Set collision properties
        rbInfo.set_m_restitution(0.8); // Mostly elastic collisions in space
        rbInfo.set_m_friction(0.1);
        
        const body = new this.Ammo.btRigidBody(rbInfo);
        
        // Set initial velocity - velocity is in km/s
        const btVelocity = new this.Ammo.btVector3(
            velocity.x * this.KM_TO_PHYSICS,
            velocity.y * this.KM_TO_PHYSICS,
            velocity.z * this.KM_TO_PHYSICS
        );
        body.setLinearVelocity(btVelocity);
        
        
        // Activate the body to ensure it's not sleeping
        body.activate(true);
        
        // No damping in space - setDamping(linear, angular)
        body.setDamping(0, 0);
        
        // Add to physics world
        this.world.addRigidBody(body);
        
        // Store reference
        this.bodies.set(id, {
            body,
            mesh,
            mass,
            radius,
            isSatellite
        });
        
        return body;
    }

    /**
     * Apply Earth's gravity to all bodies
     */
    applyGravity() {
        this.bodies.forEach((data, id) => {
            const body = data.body;
            
            // Get position
            const transform = body.getWorldTransform();
            const origin = transform.getOrigin();
            
            // Position in km
            const pos = {
                x: origin.x() * this.PHYSICS_TO_KM,
                y: origin.y() * this.PHYSICS_TO_KM,
                z: origin.z() * this.PHYSICS_TO_KM
            };
            
            // Distance from Earth center
            const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            
            // Check if crashed into Earth
            if (r < this.EARTH_RADIUS) {
                // Create flash effect at crash point
                this.createCollisionFlash(pos);
                this.destroyBody(id);
                return;
            }
            
            // Gravitational acceleration magnitude
            const accel = -this.EARTH_MU / (r * r);
            
            // Direction (toward Earth center)
            const forceVector = {
                x: (pos.x / r) * accel * data.mass,
                y: (pos.y / r) * accel * data.mass,
                z: (pos.z / r) * accel * data.mass
            };
            
            // Apply force - convert to physics units
            // Force = mass * acceleration, where acceleration is in km/s²
            body.applyCentralForce(new this.Ammo.btVector3(
                forceVector.x * this.KM_TO_PHYSICS,
                forceVector.y * this.KM_TO_PHYSICS,
                forceVector.z * this.KM_TO_PHYSICS
            ));
        });
    }

    /**
     * Check for collisions
     * NOTE: Collisions are rare in nominal orbits because:
     * 1. Objects are spread across different altitudes
     * 2. Different inclinations create separation
     * 3. Random initial positions distribute objects
     * 4. Space is HUGE - even 380 objects are sparse
     */
    checkCollisions() {
        const dispatcher = this.world.getDispatcher();
        const numManifolds = dispatcher.getNumManifolds();
        
        for (let i = 0; i < numManifolds; i++) {
            const manifold = dispatcher.getManifoldByIndexInternal(i);
            const numContacts = manifold.getNumContacts();
            
            if (numContacts > 0) {
                const body0 = manifold.getBody0();
                const body1 = manifold.getBody1();
                
                // Find IDs
                let id0, id1;
                this.bodies.forEach((data, id) => {
                    if (data.body === body0) id0 = id;
                    if (data.body === body1) id1 = id;
                });
                
                if (id0 && id1) {
                    this.handleCollision(id0, id1);
                }
            }
        }
    }

    /**
     * Handle collision between two objects
     */
    handleCollision(id0, id1) {
        // Silent collision handling with visual feedback
        
        const data0 = this.bodies.get(id0);
        const data1 = this.bodies.get(id1);
        
        if (!data0 || !data1) return;
        
        // Get collision point
        const transform0 = data0.body.getWorldTransform();
        const transform1 = data1.body.getWorldTransform();
        const pos0 = transform0.getOrigin();
        const pos1 = transform1.getOrigin();
        
        const collisionPoint = {
            x: (pos0.x() + pos1.x()) * 0.5 * this.PHYSICS_TO_KM,
            y: (pos0.y() + pos1.y()) * 0.5 * this.PHYSICS_TO_KM,
            z: (pos0.z() + pos1.z()) * 0.5 * this.PHYSICS_TO_KM
        };
        
        // Get velocities
        const vel0 = data0.body.getLinearVelocity();
        const vel1 = data1.body.getLinearVelocity();
        
        const relativeVelocity = Math.sqrt(
            Math.pow(vel0.x() - vel1.x(), 2) +
            Math.pow(vel0.y() - vel1.y(), 2) +
            Math.pow(vel0.z() - vel1.z(), 2)
        ) * this.PHYSICS_TO_KM;
        
        // Create collision flash at impact point
        this.createCollisionFlash(collisionPoint, relativeVelocity);
        
        // Generate debris
        this.generateDebris(collisionPoint, relativeVelocity, data0.mass + data1.mass);
        
        // Destroy original objects if they're satellites
        if (data0.isSatellite) this.destroyBody(id0);
        if (data1.isSatellite) this.destroyBody(id1);
    }

    /**
     * Generate debris from collision using NASA Standard Breakup Model
     */
    generateDebris(position, impactVelocity, totalMass) {
        // NASA breakup model: more fragments for higher velocity impacts
        const baseFragments = Math.floor(impactVelocity * 10);
        const numFragments = Math.min(this.maxDebris - this.debris.size, baseFragments);
        
        if (numFragments <= 0) {
            return;
        }
        
        // Get orbital velocity at collision point
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const orbitalSpeed = Math.sqrt(this.EARTH_MU / r);
        
        // Perpendicular orbital velocity vector
        const orbitalVel = {
            x: -position.y / r * orbitalSpeed,
            y: position.x / r * orbitalSpeed,
            z: 0
        };
        
        // Instance mesh for performance
        const masterDebrisMesh = this.getDebrisMesh();
        
        for (let i = 0; i < numFragments; i++) {
            const debrisId = `debris_${Date.now()}_${i}`;
            
            // NASA breakup model velocity distribution
            const deltaV = this.getBreakupVelocity(impactVelocity, i / numFragments);
            
            // Random direction for explosion
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            // Add explosion velocity to orbital velocity
            const velocity = {
                x: orbitalVel.x + deltaV * Math.sin(phi) * Math.cos(theta),
                y: orbitalVel.y + deltaV * Math.sin(phi) * Math.sin(theta),
                z: orbitalVel.z + deltaV * Math.cos(phi)
            };
            
            // Create instance mesh for visual
            const debrisMesh = masterDebrisMesh.createInstance(debrisId);
            
            // Mass distribution (power law)
            const massFraction = Math.pow(Math.random(), 2); // More small pieces
            const debrisMass = (totalMass / numFragments) * massFraction;
            
            // Size based on mass
            const radius = Math.cbrt(debrisMass / 1000) * 0.001; // Realistic sizing
            
            // Create physics body
            this.createPhysicsBody({
                id: debrisId,
                mass: debrisMass,
                radius: radius,
                position,
                velocity,
                mesh: debrisMesh,
                isSatellite: false
            });
            
            // Track telemetry
            this.telemetryData.set(debrisId, {
                altitude: r - this.EARTH_RADIUS,
                velocity: Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z),
                mass: debrisMass,
                created: Date.now()
            });
            
            this.debris.set(debrisId, true);
        }
    }
    
    /**
     * Get breakup velocity using NASA model
     */
    getBreakupVelocity(impactVel, fraction) {
        // NASA Standard Breakup Model velocity distribution
        const chi = Math.log10(impactVel);
        const A = 0.2 * chi + 1.85;
        const mu = 0.9 * chi + 2.9;
        
        // Log-normal distribution
        const sigma = 0.4;
        const logV = mu + sigma * this.gaussianRandom() * A;
        
        return Math.pow(10, logV) / 1000; // Convert m/s to km/s
    }
    
    /**
     * Generate Gaussian random number
     */
    gaussianRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    
    /**
     * Create visual flash effect for collisions
     */
    createCollisionFlash(position, intensity = 1) {
        // Create a bright flash sphere that quickly fades - smaller size
        const flashMesh = BABYLON.MeshBuilder.CreateSphere(
            'flash_' + Date.now(),
            { diameter: 0.02 * intensity, segments: 8 },  // Reduced from 0.05 to 0.02
            this.scene
        );
        
        // Position in Babylon coordinates
        flashMesh.position.set(
            position.x * this.KM_TO_BABYLON,
            position.y * this.KM_TO_BABYLON,
            position.z * this.KM_TO_BABYLON
        );
        
        // Bright white/orange flash material
        const flashMat = new BABYLON.StandardMaterial('flash_mat', this.scene);
        flashMat.disableLighting = true;
        flashMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0); // Bright orange-white
        flashMat.alpha = 1;
        flashMesh.material = flashMat;
        
        // Animate the flash
        let scale = 1;
        let alpha = 1;
        
        const flashAnimation = this.scene.registerBeforeRender(() => {
            scale += 0.3; // Expand quickly
            alpha -= 0.05; // Fade out
            
            flashMesh.scaling.set(scale, scale, scale);
            flashMat.alpha = alpha;
            
            if (alpha <= 0) {
                this.scene.unregisterBeforeRender(flashAnimation);
                flashMesh.dispose();
            }
        });
    }
    
    /**
     * Get or create debris mesh from pool
     */
    getDebrisMesh() {
        if (this.debrisMeshPool.length === 0) {
            // Create master mesh - GLOWING ORB STYLE
            const masterMesh = BABYLON.MeshBuilder.CreateSphere(
                'debris_master',
                { diameter: 0.004, segments: 4 }, // Small collision debris
                this.scene
            );
            
            // Bright red glowing orb for collision debris
            const material = new BABYLON.StandardMaterial('debris_mat', this.scene);
            material.disableLighting = true; // Make it glow
            material.emissiveColor = new BABYLON.Color3(1, 0, 0); // Pure red for danger!
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            material.specularColor = new BABYLON.Color3(1, 1, 1);
            material.alpha = 1.0; // Full opacity
            material.freeze(); // Optimize material
            
            masterMesh.material = material;
            masterMesh.renderingGroupId = 0; // Respect depth
            masterMesh.isVisible = false; // Hide master
            
            this.debrisMeshPool.push(masterMesh);
            return masterMesh;
        }
        
        return this.debrisMeshPool[0];
    }

    /**
     * Destroy a body
     */
    destroyBody(id) {
        const data = this.bodies.get(id);
        if (!data) return;
        
        // Remove from physics world
        this.world.removeRigidBody(data.body);
        
        // Dispose or return mesh to pool
        if (data.mesh) {
            if (data.mesh.name.includes('debris_')) {
                data.mesh.isVisible = false; // Hide instance instead of disposing
            } else {
                data.mesh.dispose();
            }
        }
        
        // Remove from tracking
        this.bodies.delete(id);
        this.debris.delete(id);
        this.telemetryData.delete(id);
    }

    /**
     * Step the simulation with optimizations
     */
    step(deltaTime) {
        if (!this.initialized) return;
        
        
        // Use internal physics multiplier for orbital motion
        // This is separate from Earth rotation speed
        // Keep time step small for stability
        const adjustedDeltaTime = Math.min(deltaTime * this.physicsTimeMultiplier, 10.0);
        
        // Apply gravity
        this.applyGravity();
        
        
        // Step physics with time acceleration
        // Use smaller fixed timestep for better stability
        this.world.stepSimulation(adjustedDeltaTime, 10, adjustedDeltaTime/10);
        
        // Check collisions
        this.checkCollisions();
        
        // Update mesh positions every frame for smooth motion
        this.updateCounter++;
        if (this.updateCounter >= this.meshUpdateFrequency) {
            this.updateMeshes();
            this.updateCounter = 0;
            
        }
        
        // Clean up old debris periodically
        if (this.debris.size > this.maxDebris * 0.9) {
            this.cleanupOldDebris();
        }
    }

    /**
     * Update mesh positions from physics with batching
     */
    updateMeshes() {
        let debugLogged = false;
        
        // Update position for each body
        this.bodies.forEach((data, id) => {
            if (!data.mesh) return;
            
            const transform = data.body.getWorldTransform();
            const origin = transform.getOrigin();
            
            // Convert from physics to km, then to Babylon units
            const position = {
                x: origin.x() * this.PHYSICS_TO_KM * this.KM_TO_BABYLON,
                y: origin.y() * this.PHYSICS_TO_KM * this.KM_TO_BABYLON,
                z: origin.z() * this.PHYSICS_TO_KM * this.KM_TO_BABYLON
            };
            
            
            data.mesh.position.set(position.x, position.y, position.z);
        });
    }
    
    /**
     * Clean up old debris to maintain performance
     */
    cleanupOldDebris() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        let removed = 0;
        
        this.debris.forEach((_, id) => {
            const telemetry = this.telemetryData.get(id);
            if (telemetry && (now - telemetry.created) > maxAge) {
                this.destroyBody(id);
                removed++;
            }
        });
        
    }

    /**
     * Trigger Kessler Syndrome
     */
    triggerKessler(velocity = 10) {
        // Get two random satellites
        const satellites = Array.from(this.bodies.entries()).filter(([id, data]) => data.isSatellite);
        
        if (satellites.length < 2) {
            return;
        }
        
        const [id0, data0] = satellites[0];
        const [id1, data1] = satellites[1];
        
        // Slam them together
        const body0 = data0.body;
        const body1 = data1.body;
        
        body0.setLinearVelocity(new this.Ammo.btVector3(velocity, 0, 0));
        body1.setLinearVelocity(new this.Ammo.btVector3(-velocity, 0, 0));
        
        // Move them close
        const transform0 = body0.getWorldTransform();
        const transform1 = body1.getWorldTransform();
        const origin0 = transform0.getOrigin();
        
        transform1.setOrigin(new this.Ammo.btVector3(
            origin0.x() + 0.01,
            origin0.y(),
            origin0.z()
        ));
        
        body1.setWorldTransform(transform1);
    }
    
    /**
     * Get system statistics
     */
    getStats() {
        const stats = {
            satellites: 0,
            debrisCount: this.debris.size,
            totalObjects: this.bodies.size,
            averageAltitude: 0,
            highestRisk: 'LOW'
        };
        
        let altitudeSum = 0;
        let count = 0;
        
        this.bodies.forEach((data, id) => {
            if (data.isSatellite) stats.satellites++;
            
            const transform = data.body.getWorldTransform();
            const origin = transform.getOrigin();
            const r = Math.sqrt(
                origin.x() * origin.x() + 
                origin.y() * origin.y() + 
                origin.z() * origin.z()
            ) * this.PHYSICS_TO_KM;
            
            const altitude = r - this.EARTH_RADIUS;
            altitudeSum += altitude;
            count++;
        });
        
        stats.averageAltitude = count > 0 ? Math.round(altitudeSum / count) : 0;
        
        // Calculate collision risk based on debris density
        if (stats.debrisCount > 1000) stats.highestRisk = 'CRITICAL';
        else if (stats.debrisCount > 500) stats.highestRisk = 'HIGH';
        else if (stats.debrisCount > 100) stats.highestRisk = 'MEDIUM';
        else stats.highestRisk = 'LOW';
        
        return stats;
    }
    
    /**
     * Get telemetry for specific object
     */
    getObjectTelemetry(id) {
        const data = this.bodies.get(id);
        if (!data) return null;
        
        const transform = data.body.getWorldTransform();
        const origin = transform.getOrigin();
        const velocity = data.body.getLinearVelocity();
        
        const pos = {
            x: origin.x() * this.PHYSICS_TO_KM,
            y: origin.y() * this.PHYSICS_TO_KM,
            z: origin.z() * this.PHYSICS_TO_KM
        };
        
        const vel = {
            x: velocity.x() * this.PHYSICS_TO_KM,
            y: velocity.y() * this.PHYSICS_TO_KM,
            z: velocity.z() * this.PHYSICS_TO_KM
        };
        
        const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        const v = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        
        return {
            id: id,
            altitude: r - this.EARTH_RADIUS,
            velocity: v,
            position: pos,
            mass: data.mass,
            radius: data.radius,
            type: data.isSatellite ? 'satellite' : 'debris'
        };
    }
}