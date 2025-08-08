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
        this.debugLogged = false; // Track if we've logged debug info
        this.frameCount = 0; // Track frames for periodic logging
        
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
        this.physicsTimeMultiplier = 1; // Start at real-time for stability testing
        
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
        console.log('RED ORBIT: Starting to populate orbits...');
        // Scale to 750 objects for better performance and visibility
        
        // LEO satellites (200-2000 km) - most populated region
        console.log('Creating 450 LEO satellites...');
        for (let i = 0; i < 450; i++) {
            this.createRandomSatellite('LEO', i);
        }
        
        // MEO satellites (2000-20000 km) - navigation layer
        console.log('Creating 150 MEO satellites...');
        for (let i = 0; i < 150; i++) {
            this.createRandomSatellite('MEO', i);
        }
        
        // High orbit satellites (10000-15000 km)
        console.log('Creating 75 HIGH orbit satellites...');
        for (let i = 0; i < 75; i++) {
            this.createRandomSatellite('HIGH', i);
        }
        
        // Space debris in various orbits
        console.log('Creating 75 debris objects...');
        for (let i = 0; i < 75; i++) {
            this.createRandomDebris(i);
        }
        
        console.log(`RED ORBIT: Successfully created ${this.bodies.size} objects in orbit!`);
        console.log(`RED ORBIT: Physics bodies: ${this.bodies.size}, Meshes created: ${Array.from(this.bodies.values()).filter(b => b.mesh).length}`);
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
     * @param {number} params.eccentricity - Orbital eccentricity (0-1)
     * @param {number} params.mass - Mass (kg)
     * @param {number} params.radius - Collision radius (m)
     * @param {string} params.id - Unique ID
     * @param {BABYLON.Mesh} params.mesh - Babylon mesh
     */
    createSatellite(params) {
        const { altitude, inclination, eccentricity = 0, mass = 500, radius = 2, id, mesh } = params;
        
        // Calculate orbital parameters
        const orbitalRadius = this.EARTH_RADIUS + altitude;
        
        // For circular orbits (e=0), semi-major axis equals orbital radius
        // For elliptical orbits, if we're placing at average radius, a ≈ r
        // This is a simplification but prevents unrealistic velocities
        const semiMajorAxis = eccentricity > 0.01 ? orbitalRadius * (1 + eccentricity * 0.5) : orbitalRadius;
        
        // Use vis-viva equation for velocity: v² = μ(2/r - 1/a)
        // For circular orbit (a = r): v = √(μ/r)
        const orbitalSpeed = Math.sqrt(this.EARTH_MU * (2/orbitalRadius - 1/semiMajorAxis));
        
        // Debug: Log first few satellites to verify velocities
        if (this.bodies.size < 5) {
            console.log(`Satellite ${id}: alt=${altitude.toFixed(0)}km, r=${orbitalRadius.toFixed(0)}km, v=${orbitalSpeed.toFixed(2)}km/s, e=${eccentricity.toFixed(2)}`);
        }
        
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
        
        // For a circular orbit, velocity must be perpendicular to position vector
        // and have magnitude = orbitalSpeed
        
        // Create a velocity vector perpendicular to position
        // We'll use cross product of position with a reference vector
        
        // For inclined orbits, we need a proper perpendicular vector
        // Use cross product: velocity = (zAxis × position) × position, normalized and scaled
        
        // First get a vector perpendicular to position in the orbital plane
        const zAxis = { x: 0, y: 0, z: 1 };
        
        // Cross product: temp = position × zAxis
        const temp = {
            x: position.y * zAxis.z - position.z * zAxis.y,
            y: position.z * zAxis.x - position.x * zAxis.z,
            z: position.x * zAxis.y - position.y * zAxis.x
        };
        
        // If temp is too small (position nearly parallel to z), use different axis
        const tempMag = Math.sqrt(temp.x * temp.x + temp.y * temp.y + temp.z * temp.z);
        
        let velocity;
        if (tempMag < 0.01) {
            // Use x-axis for cross product instead
            const xAxis = { x: 1, y: 0, z: 0 };
            const temp2 = {
                x: position.y * xAxis.z - position.z * xAxis.y,
                y: position.z * xAxis.x - position.x * xAxis.z,
                z: position.x * xAxis.y - position.y * xAxis.x
            };
            const temp2Mag = Math.sqrt(temp2.x * temp2.x + temp2.y * temp2.y + temp2.z * temp2.z);
            velocity = {
                x: temp2.x / temp2Mag * orbitalSpeed,
                y: temp2.y / temp2Mag * orbitalSpeed,
                z: temp2.z / temp2Mag * orbitalSpeed
            };
        } else {
            // Normalize and scale temp vector
            velocity = {
                x: temp.x / tempMag * orbitalSpeed,
                y: temp.y / tempMag * orbitalSpeed,
                z: temp.z / tempMag * orbitalSpeed
            };
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
            
            // Altitude above surface
            const altitude = r - this.EARTH_RADIUS;
            
            // Atmospheric drag and burnup
            if (altitude < 100) {
                // Below 100km - atmosphere too thick, object burns up
                this.createAtmosphericBurnup(pos, data.mass);
                this.destroyBody(id);
                return;
            } else if (altitude < 200) {
                // 100-200km - significant atmospheric drag
                const velocity = body.getLinearVelocity();
                const speed = Math.sqrt(velocity.x() * velocity.x() + velocity.y() * velocity.y() + velocity.z() * velocity.z());
                
                // Simplified exponential atmosphere model
                const dragFactor = Math.exp(-(altitude - 100) / 50) * 0.001;
                const dragForce = -speed * dragFactor;
                
                // Apply drag opposite to velocity direction
                if (speed > 0.001) {
                    body.applyCentralForce(new this.Ammo.btVector3(
                        velocity.x() * dragForce,
                        velocity.y() * dragForce,
                        velocity.z() * dragForce
                    ));
                }
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
        
        // Update Kessler cascade tracking
        if (this.kesslerCascade && this.kesslerCascade.active) {
            this.kesslerCascade.collisionCount++;
            this.kesslerCascade.debrisGenerated += Math.floor(relativeVelocity * 10);
            this.updateKesslerStatus();
        }
        
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
        
        // Limit deltaTime to prevent instability
        deltaTime = Math.min(deltaTime, 1/30); // Max 30 FPS worth of time
        
        // Use internal physics multiplier for orbital motion
        // This is separate from Earth rotation speed
        // Keep time step VERY small for stability at high speeds
        const maxTimeStep = 0.1; // Maximum 0.1 seconds per physics step
        const adjustedDeltaTime = Math.min(deltaTime * this.physicsTimeMultiplier, maxTimeStep);
        
        // Apply gravity
        this.applyGravity();
        
        // Step physics with VERY small fixed timestep for stability
        // Use many substeps for accuracy
        const fixedTimeStep = 1/240; // 240 Hz physics
        const maxSubSteps = Math.ceil(adjustedDeltaTime / fixedTimeStep);
        this.world.stepSimulation(adjustedDeltaTime, maxSubSteps, fixedTimeStep);
        
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
        this.frameCount++;
        
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
            
            // Debug first satellite position every 60 frames (about once per second)
            if (this.frameCount % 60 === 0 && id === 'LEO_SAT_0') {
                const kmPos = {
                    x: origin.x() * this.PHYSICS_TO_KM,
                    y: origin.y() * this.PHYSICS_TO_KM,
                    z: origin.z() * this.PHYSICS_TO_KM
                };
                const r = Math.sqrt(kmPos.x * kmPos.x + kmPos.y * kmPos.y + kmPos.z * kmPos.z);
                const altitude = r - this.EARTH_RADIUS;
                
                // Get velocity to check orbital speed
                const velocity = data.body.getLinearVelocity();
                const speed = Math.sqrt(
                    velocity.x() * velocity.x() + 
                    velocity.y() * velocity.y() + 
                    velocity.z() * velocity.z()
                ) * this.PHYSICS_TO_KM;
                
                console.log(`LEO_SAT_0: Alt=${altitude.toFixed(0)}km, Speed=${speed.toFixed(2)}km/s, Expected=${Math.sqrt(this.EARTH_MU/r).toFixed(2)}km/s`);
                
                // Warn if altitude is dropping rapidly
                if (!data.lastAltitude) {
                    data.lastAltitude = altitude;
                } else {
                    const altChange = altitude - data.lastAltitude;
                    if (altChange < -10) { // Dropping more than 10km per second
                        console.warn(`⚠️ SATELLITE FALLING! Altitude dropped ${-altChange.toFixed(0)}km in 1 second!`);
                    }
                    data.lastAltitude = altitude;
                }
            }
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
     * Create atmospheric burnup effect
     */
    createAtmosphericBurnup(position, mass) {
        // Create a bright orange expanding fireball
        const burnupMesh = BABYLON.MeshBuilder.CreateSphere(
            'burnup_' + Date.now(),
            { diameter: 0.01 + (mass / 10000), segments: 8 },
            this.scene
        );
        
        // Position in Babylon coordinates
        burnupMesh.position.set(
            position.x * this.KM_TO_BABYLON,
            position.y * this.KM_TO_BABYLON,
            position.z * this.KM_TO_BABYLON
        );
        
        // Bright orange-red burnup material
        const burnupMat = new BABYLON.StandardMaterial('burnup_mat', this.scene);
        burnupMat.disableLighting = true;
        burnupMat.emissiveColor = new BABYLON.Color3(1, 0.3, 0); // Orange-red
        burnupMat.alpha = 1;
        burnupMesh.material = burnupMat;
        
        // Animate the burnup
        let scale = 1;
        let alpha = 1;
        
        const burnupAnimation = this.scene.registerBeforeRender(() => {
            scale += 0.1; // Expand
            alpha -= 0.02; // Fade out
            
            burnupMesh.scaling.set(scale, scale, scale);
            burnupMat.alpha = alpha;
            
            if (alpha <= 0) {
                this.scene.unregisterBeforeRender(burnupAnimation);
                burnupMesh.dispose();
            }
        });
    }
    
    /**
     * Trigger enhanced Kessler Syndrome with cascade tracking
     */
    triggerKesslerSyndrome() {
        console.log('🚨 INITIATING KESSLER SYNDROME CASCADE 🚨');
        
        // Initialize cascade tracking
        if (!this.kesslerCascade) {
            this.kesslerCascade = {
                active: false,
                startTime: Date.now(),
                collisionCount: 0,
                cascadeLevel: 0,
                debrisGenerated: 0
            };
        }
        
        this.kesslerCascade.active = true;
        this.kesslerCascade.startTime = Date.now();
        
        // Find satellites at similar altitudes for maximum cascade effect
        const satellites = Array.from(this.bodies.entries())
            .filter(([id, data]) => data.isSatellite)
            .map(([id, data]) => {
                const transform = data.body.getWorldTransform();
                const origin = transform.getOrigin();
                const r = Math.sqrt(
                    origin.x() * origin.x() + 
                    origin.y() * origin.y() + 
                    origin.z() * origin.z()
                ) * this.PHYSICS_TO_KM;
                return { id, data, altitude: r - this.EARTH_RADIUS };
            })
            .sort((a, b) => a.altitude - b.altitude);
        
        if (satellites.length < 2) {
            console.warn('Not enough satellites for Kessler cascade');
            return;
        }
        
        // Find two satellites at similar altitudes
        let bestPair = null;
        let minAltDiff = Infinity;
        
        for (let i = 0; i < satellites.length - 1; i++) {
            const altDiff = Math.abs(satellites[i].altitude - satellites[i + 1].altitude);
            if (altDiff < minAltDiff) {
                minAltDiff = altDiff;
                bestPair = [satellites[i], satellites[i + 1]];
            }
        }
        
        if (!bestPair) {
            bestPair = [satellites[0], satellites[1]];
        }
        
        const [sat0, sat1] = bestPair;
        console.log(`Initiating collision between satellites at ${sat0.altitude.toFixed(0)}km and ${sat1.altitude.toFixed(0)}km`);
        
        // Set collision course
        const body0 = sat0.data.body;
        const body1 = sat1.data.body;
        
        // Get current positions
        const transform0 = body0.getWorldTransform();
        const transform1 = body1.getWorldTransform();
        const pos0 = transform0.getOrigin();
        const pos1 = transform1.getOrigin();
        
        // Calculate collision vector
        const dx = pos1.x() - pos0.x();
        const dy = pos1.y() - pos0.y();
        const dz = pos1.z() - pos0.z();
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Set velocities toward each other at realistic collision speed (7.5 km/s each)
        const collisionSpeed = 7.5; // km/s - typical orbital collision speed
        body0.setLinearVelocity(new this.Ammo.btVector3(
            (dx / dist) * collisionSpeed,
            (dy / dist) * collisionSpeed,
            (dz / dist) * collisionSpeed
        ));
        
        body1.setLinearVelocity(new this.Ammo.btVector3(
            -(dx / dist) * collisionSpeed,
            -(dy / dist) * collisionSpeed,
            -(dz / dist) * collisionSpeed
        ));
        
        // Move them closer if far apart
        if (dist > 10) {
            const midX = (pos0.x() + pos1.x()) * 0.5;
            const midY = (pos0.y() + pos1.y()) * 0.5;
            const midZ = (pos0.z() + pos1.z()) * 0.5;
            
            transform0.setOrigin(new this.Ammo.btVector3(
                midX - (dx / dist) * 2,
                midY - (dy / dist) * 2,
                midZ - (dz / dist) * 2
            ));
            
            transform1.setOrigin(new this.Ammo.btVector3(
                midX + (dx / dist) * 2,
                midY + (dy / dist) * 2,
                midZ + (dz / dist) * 2
            ));
            
            body0.setWorldTransform(transform0);
            body1.setWorldTransform(transform1);
        }
        
        // Activate bodies
        body0.activate(true);
        body1.activate(true);
        
        // Focus camera on collision if camera controller exists
        if (window.cameraController) {
            const collisionPoint = {
                x: (pos0.x() + pos1.x()) * 0.5 * this.PHYSICS_TO_KM * this.KM_TO_BABYLON,
                y: (pos0.y() + pos1.y()) * 0.5 * this.PHYSICS_TO_KM * this.KM_TO_BABYLON,
                z: (pos0.z() + pos1.z()) * 0.5 * this.PHYSICS_TO_KM * this.KM_TO_BABYLON
            };
            window.cameraController.focusOnPosition(collisionPoint);
        }
        
        // Update Kessler status
        this.updateKesslerStatus();
    }
    
    /**
     * Update Kessler cascade status
     */
    updateKesslerStatus() {
        if (!this.kesslerCascade || !this.kesslerCascade.active) return;
        
        // Update cascade level based on collisions
        const oldLevel = this.kesslerCascade.cascadeLevel;
        this.kesslerCascade.cascadeLevel = Math.floor(this.kesslerCascade.collisionCount / 5);
        
        if (this.kesslerCascade.cascadeLevel > oldLevel) {
            console.log(`🔥 CASCADE LEVEL ${this.kesslerCascade.cascadeLevel} REACHED!`);
        }
        
        // Broadcast status if UI exists
        if (window.navigationController && window.navigationController.updateKesslerStatus) {
            window.navigationController.updateKesslerStatus({
                active: this.kesslerCascade.active,
                collisions: this.kesslerCascade.collisionCount,
                level: this.kesslerCascade.cascadeLevel,
                debris: this.debris.size
            });
        }
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