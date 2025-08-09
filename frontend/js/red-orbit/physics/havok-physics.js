/**
 * RED ORBIT HAVOK PHYSICS ENGINE
 * Pure physics simulation - no hybrid bullshit
 * Real gravity, real orbits, real collisions
 * Scales to 10,000+ objects with Havok's native JavaScript performance
 */

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Physics/physicsEngineComponent'; // V1 physics for PhysicsImpostor
import HavokPhysics from '@babylonjs/havok';

export class RedOrbitHavokPhysics {
    constructor(scene) {
        this.scene = scene;
        this.plugin = null;
        this.bodies = new Map(); // Match Ammo structure
        this.debris = new Map();
        this.debrisMeshPool = [];
        this.telemetryData = new Map();
        this.debugLogged = false;
        this.frameCount = 0;
        
        // Real Earth parameters (EXACT same as Ammo version)
        this.EARTH_RADIUS = 6371; // km
        this.EARTH_MU = 398600.4418; // km³/s² - Earth's gravitational parameter
        
        // Physics scaling: Use km directly as physics units
        this.KM_TO_PHYSICS = 1.0; // 1 physics unit = 1 km
        this.PHYSICS_TO_KM = 1.0;
        this.KM_TO_BABYLON = 1/6371; // Earth radius = 1 Babylon unit
        
        // Performance optimization
        this.updateCounter = 0;
        this.meshUpdateFrequency = 1; // Update meshes every physics step
        this.physicsTimeMultiplier = 1; // Start at real-time
        this.initialized = false;
        
        // Kessler Syndrome tracking (same as Ammo)
        this.kesslerActive = false;
        this.kesslerCollisionCount = 0;
        this.kesslerCascadeLevel = 0;
        this.kesslerDebrisGenerated = 0;
        this.cascadeStartTime = null;
        
        // Enhanced tracking for 10K objects
        this.maxDebris = 10000;
        this.LOD_DISTANCES = {
            NEAR: 1000,  // Full physics every frame
            MID: 5000,   // Physics every 5 frames
            FAR: 20000   // Physics every 10 frames
        };
    }

    async initialize() {
        console.log('RED ORBIT HAVOK: Initializing physics engine...');
        
        try {
            // Initialize Havok plugin
            const havokInstance = await HavokPhysics();
            this.plugin = new BABYLON.HavokPlugin(true, havokInstance);
            
            // Enable physics with NO gravity - we calculate it ourselves
            const gravity = new BABYLON.Vector3(0, 0, 0);
            this.scene.enablePhysics(gravity, this.plugin);
            
            // Wait for physics to be ready
            if (!this.scene.getPhysicsEngine()) {
                throw new Error('Physics engine failed to initialize');
            }
            
            // High frequency physics for orbital stability
            this.plugin.setTimeStep(1/240); // 240 Hz matches Ammo config
            // Note: Havok in Babylon 6 doesn't have setSubTimeStep - it handles this internally
            
            // Initialize mesh pools for performance
            this.initializePools();
            
            this.initialized = true;
            console.log('RED ORBIT HAVOK: Physics engine ready! Can handle 10,000+ objects.');
            
            // Start populating space
            await this.populateInitialOrbits();
            
        } catch (error) {
            console.error('Failed to initialize Havok:', error);
            throw error;
        }
    }
    
    /**
     * Initialize object pools for performance
     */
    initializePools() {
        // Pre-allocate debris pool for Kessler events
        console.log('RED ORBIT HAVOK: Initializing object pools...');
        
        // We'll create debris on demand during Kessler events
        // This keeps initial load time fast
        this.debrisMeshPool = [];
    }
    
    /**
     * Populate space with thousands of realistic orbiting objects
     * Using exact same distribution as Ammo version but scaled to 10K
     */
    async populateInitialOrbits() {
        console.log('RED ORBIT HAVOK: Starting to populate orbits...');
        
        // Start with 1000 objects for initial testing, then scale to 10K
        const TEST_MODE = true; // Set to false for full 10K objects
        const counts = TEST_MODE ? 
            { LEO: 600, MEO: 250, HIGH: 100, DEBRIS: 50 } :
            { LEO: 6000, MEO: 2500, HIGH: 1000, DEBRIS: 500 };
        
        // LEO satellites (200-2000 km) - most populated region
        console.log(`Creating ${counts.LEO} LEO satellites...`);
        for (let i = 0; i < counts.LEO; i++) {
            this.createRandomSatellite('LEO', i);
            // Yield periodically to prevent blocking
            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // MEO satellites (2000-20000 km) - navigation layer
        console.log(`Creating ${counts.MEO} MEO satellites...`);
        for (let i = 0; i < counts.MEO; i++) {
            this.createRandomSatellite('MEO', i);
            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // High orbit satellites (10000-15000 km)
        console.log(`Creating ${counts.HIGH} HIGH orbit satellites...`);
        for (let i = 0; i < counts.HIGH; i++) {
            this.createRandomSatellite('HIGH', i);
            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // Space debris in various orbits
        console.log(`Creating ${counts.DEBRIS} debris objects...`);
        for (let i = 0; i < counts.DEBRIS; i++) {
            this.createRandomDebris(i);
            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        console.log(`RED ORBIT HAVOK: Successfully created ${this.bodies.size} objects in orbit!`);
    }
    
    /**
     * Create a random satellite in specified orbit type
     * EXACT same logic as Ammo version for consistency
     */
    createRandomSatellite(orbitType, index) {
        let altitude, inclination, eccentricity;
        
        // Create realistic orbit types (same as Ammo)
        const orbitStyles = [
            'polar',      // 90° inclination, circular
            'sun-sync',   // ~98° inclination (retrograde), circular
            'equatorial', // 0° inclination, circular
            'molniya',    // High inclination, VERY eccentric
            'inclined',   // Various inclinations, slightly elliptical
            'gto'         // Geostationary transfer orbit, highly elliptical
        ];
        
        const style = orbitStyles[Math.floor(Math.random() * orbitStyles.length)];
        
        switch(orbitType) {
            case 'LEO':
                altitude = 200 + Math.random() * 1800; // 200-2000 km
                if (style === 'polar') {
                    inclination = 85 + Math.random() * 10; // 85-95°
                    eccentricity = Math.random() * 0.02; // Nearly circular
                } else if (style === 'sun-sync') {
                    inclination = 96 + Math.random() * 8; // 96-104° (retrograde)
                    eccentricity = Math.random() * 0.02; // Nearly circular
                } else if (style === 'equatorial') {
                    inclination = Math.random() * 10; // 0-10°
                    eccentricity = Math.random() * 0.05; // Slightly elliptical
                } else if (style === 'molniya') {
                    inclination = 63.4 + Math.random() * 5; // ~63.4° (critical inclination)
                    eccentricity = 0.6 + Math.random() * 0.15; // Highly elliptical! (0.6-0.75)
                    altitude = 600 + Math.random() * 400; // Lower perigee for Molniya
                } else if (style === 'gto') {
                    inclination = 20 + Math.random() * 10; // 20-30°
                    eccentricity = 0.3 + Math.random() * 0.2; // Elliptical (0.3-0.5)
                } else {
                    inclination = 20 + Math.random() * 60; // 20-80° general
                    eccentricity = Math.random() * 0.1; // Slightly elliptical (0-0.1)
                }
                break;
            case 'MEO':
                altitude = 2000 + Math.random() * 18000; // 2000-20000 km
                if (Math.random() < 0.5) {
                    inclination = 55 + Math.random() * 10; // GPS-like
                    eccentricity = Math.random() * 0.01; // Very circular
                } else {
                    inclination = 64.8 + Math.random() * 5; // GLONASS-like
                    eccentricity = Math.random() * 0.02; // Nearly circular
                }
                break;
            case 'HIGH':
                altitude = 10000 + Math.random() * 5000; // 10000-15000 km
                if (style === 'molniya') {
                    inclination = 63.4; // Critical inclination
                    eccentricity = 0.7 + Math.random() * 0.05; // Very eccentric
                } else if (style === 'gto') {
                    inclination = Math.random() * 30; // 0-30°
                    eccentricity = 0.4 + Math.random() * 0.3; // Highly elliptical (0.4-0.7)
                } else {
                    inclination = Math.random() * 40; // Various
                    eccentricity = Math.random() * 0.15; // Mildly elliptical
                }
                break;
        }
        
        
        // Create visual mesh - GLOWING ORB STYLE (same as Ammo)
        const satId = `${orbitType}_SAT_${index}`;
        const diameter = orbitType === 'HIGH' ? 0.012 : (orbitType === 'MEO' ? 0.01 : 0.008);
        const mesh = BABYLON.MeshBuilder.CreateSphere(
            satId,
            { diameter: diameter, segments: 8 },
            this.scene
        );
        
        // SDA-style glowing orb materials (exact same as Ammo)
        const material = new BABYLON.StandardMaterial(`mat_${satId}`, this.scene);
        material.disableLighting = true; // Make it glow
        
        if (orbitType === 'LEO') {
            material.emissiveColor = new BABYLON.Color3(0, 1, 1); // Cyan
        } else if (orbitType === 'MEO') {
            material.emissiveColor = new BABYLON.Color3(0, 1, 0); // Green
        } else if (orbitType === 'HIGH') {
            material.emissiveColor = new BABYLON.Color3(1, 1, 0); // Yellow
        }
        material.diffuseColor = material.emissiveColor;
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        material.alpha = 1.0;
        mesh.material = material;
        
        mesh.renderingGroupId = 0;
        mesh.isPickable = true;
        mesh.visibility = 1.0;
        
        // Create satellite with proper physics
        this.createSatellite({
            id: satId,
            altitude: altitude,
            inclination: inclination,
            eccentricity: eccentricity || 0,
            mass: 100 + Math.random() * 1000, // 100-1100 kg
            radius: 1 + Math.random() * 3, // 1-4 m
            mesh: mesh,
            orbitStyle: style
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
            { diameter: 0.006, segments: 6 },
            this.scene
        );
        
        // Bright Red/Orange glowing orb for debris - DANGER!
        const material = new BABYLON.StandardMaterial(`mat_${debrisId}`, this.scene);
        material.disableLighting = true;
        material.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Red-orange
        material.diffuseColor = material.emissiveColor;
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        material.alpha = 1.0;
        mesh.material = material;
        
        mesh.renderingGroupId = 0;
        mesh.isPickable = true;
        mesh.visibility = 1.0;
        
        // Create debris object
        this.createSatellite({
            id: debrisId,
            altitude: altitude,
            inclination: Math.random() * 180,
            eccentricity: Math.random() * 0.1,
            mass: 1 + Math.random() * 100, // 1-100 kg
            radius: 0.1 + Math.random() * 1, // 0.1-1.1 m
            mesh: mesh
        });
    }
    
    /**
     * Create a satellite in orbit - EXACT physics from Ammo version
     */
    createSatellite(params) {
        const { altitude, inclination, eccentricity = 0, mass = 500, radius = 2, id, mesh, orbitStyle } = params;
        
        // For elliptical orbits, 'altitude' is the periapsis altitude
        const periapsis = this.EARTH_RADIUS + altitude;
        
        // Calculate semi-major axis from periapsis and eccentricity
        const semiMajorAxis = periapsis / (1 - eccentricity);
        
        // Calculate apoapsis
        const apoapsis = semiMajorAxis * (1 + eccentricity);
        
        // Random true anomaly (position in orbit)
        const trueAnomaly = Math.random() * Math.PI * 2;
        
        // Calculate radius at this true anomaly
        const orbitalRadius = semiMajorAxis * (1 - eccentricity * eccentricity) / 
                             (1 + eccentricity * Math.cos(trueAnomaly));
        
        // Use vis-viva equation for velocity
        const orbitalSpeed = Math.sqrt(this.EARTH_MU * (2/orbitalRadius - 1/semiMajorAxis));
        
        // Debug first few satellites (same as Ammo)
        if (this.bodies.size < 5) {
            const currentAlt = orbitalRadius - this.EARTH_RADIUS;
            const periAlt = periapsis - this.EARTH_RADIUS;
            const apoAlt = apoapsis - this.EARTH_RADIUS;
            const orbitalPeriodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / this.EARTH_MU);
            const orbitalPeriodMinutes = orbitalPeriodSeconds / 60;
            const visiblePeriodAt60x = orbitalPeriodMinutes / 60;
            
            console.log(`${id} (${orbitStyle || 'unknown'}):`);
            console.log(`  Alt: ${currentAlt.toFixed(0)}km (peri=${periAlt.toFixed(0)}, apo=${apoAlt.toFixed(0)})`);
            console.log(`  Speed: ${orbitalSpeed.toFixed(2)}km/s, e=${eccentricity.toFixed(2)}`);
            console.log(`  Period: ${orbitalPeriodMinutes.toFixed(1)} min`);
            console.log(`  At 60x: ${visiblePeriodAt60x.toFixed(1)} min to watch one orbit`);
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
        
        // Calculate velocity using cross products (EXACT same as Ammo)
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        const zAxis = { x: 0, y: 0, z: 1 };
        
        // Cross product: temp = position × zAxis
        const temp = {
            x: position.y * zAxis.z - position.z * zAxis.y,
            y: position.z * zAxis.x - position.x * zAxis.z,
            z: position.x * zAxis.y - position.y * zAxis.x
        };
        
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
            velocity = {
                x: temp.x / tempMag * orbitalSpeed,
                y: temp.y / tempMag * orbitalSpeed,
                z: temp.z / tempMag * orbitalSpeed
            };
        }
        
        // For retrograde orbits (sun-sync), reverse direction
        if (inclination > 90 && inclination < 180) {
            velocity.x = -velocity.x;
            velocity.y = -velocity.y;
            velocity.z = -velocity.z;
        }
        
        // Set mesh position (convert km to Babylon units)
        mesh.position.x = position.x * this.KM_TO_BABYLON;
        mesh.position.y = position.y * this.KM_TO_BABYLON;
        mesh.position.z = position.z * this.KM_TO_BABYLON;
        
        // Create physics body using Havok
        // Check if physics engine is ready
        if (!this.scene.getPhysicsEngine()) {
            console.error('Physics engine not initialized!');
            return null;
        }
        
        // Create physics impostor
        let impostor;
        try {
            impostor = new BABYLON.PhysicsImpostor(
                mesh,
                BABYLON.PhysicsImpostor.SphereImpostor,
                {
                    mass: mass,
                    restitution: 0.5,
                    friction: 0.0 // No friction in space
                },
                this.scene
            );
        } catch (error) {
            console.error('Failed to create impostor:', error);
            // For now, store without physics until we fix this
            this.bodies.set(id, {
                mesh: mesh,
                impostor: null,
                mass: mass,
                altitude: altitude,
                velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
                position: position,
                orbitStyle: orbitStyle
            });
            return null;
        }
        
        // Set initial velocity if impostor was created
        if (impostor) {
            impostor.setLinearVelocity(new BABYLON.Vector3(
                velocity.x,
                velocity.y,
                velocity.z
            ));
            
            // Store in bodies map
            this.bodies.set(id, {
                mesh: mesh,
                impostor: impostor,
                mass: mass,
                altitude: altitude,
                velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
                position: position,
                orbitStyle: orbitStyle
            });
        }
        
        return impostor;
    }
    
    calculateOrbitalState_REMOVED(radius, inclination, eccentricity) {
        // Convert to radians
        const inc = inclination * Math.PI / 180;
        const raan = Math.random() * 2 * Math.PI; // Random ascending node
        const argPeriapsis = Math.random() * 2 * Math.PI;
        const trueAnomaly = Math.random() * 2 * Math.PI;
        
        // Calculate position in orbital plane
        const semiMajorAxis = radius / (1 - eccentricity);
        const r = semiMajorAxis * (1 - eccentricity * eccentricity) / 
                 (1 + eccentricity * Math.cos(trueAnomaly));
        
        // Position in orbital plane
        const x_orbital = r * Math.cos(trueAnomaly);
        const y_orbital = r * Math.sin(trueAnomaly);
        
        // Transform to 3D space
        const cosInc = Math.cos(inc);
        const sinInc = Math.sin(inc);
        const cosRaan = Math.cos(raan);
        const sinRaan = Math.sin(raan);
        const cosArg = Math.cos(argPeriapsis);
        const sinArg = Math.sin(argPeriapsis);
        
        // Rotation matrix elements
        const px = cosRaan * cosArg - sinRaan * sinArg * cosInc;
        const py = sinRaan * cosArg + cosRaan * sinArg * cosInc;
        const pz = sinArg * sinInc;
        
        const qx = -cosRaan * sinArg - sinRaan * cosArg * cosInc;
        const qy = -sinRaan * sinArg + cosRaan * cosArg * cosInc;
        const qz = cosArg * sinInc;
        
        // Final position
        const position = {
            x: x_orbital * px + y_orbital * qx,
            y: x_orbital * py + y_orbital * qy,
            z: x_orbital * pz + y_orbital * qz
        };
        
        // Calculate velocity using vis-viva equation
        const speed = Math.sqrt(this.EARTH_MU * (2/r - 1/semiMajorAxis));
        
        // Velocity perpendicular to radius (simplified)
        const vel_orbital = {
            x: -speed * Math.sin(trueAnomaly),
            y: speed * (eccentricity + Math.cos(trueAnomaly))
        };
        
        // Transform velocity to 3D
        const velocity = {
            x: vel_orbital.x * px + vel_orbital.y * qx,
            y: vel_orbital.x * py + vel_orbital.y * qy,
            z: vel_orbital.x * pz + vel_orbital.y * qz
        };
        
        return { position, velocity };
    }
    
    
    /**
     * Main physics step - called every frame
     */
    step(deltaTime) {
        if (!this.initialized || !this.plugin) return;
        
        this.frameCount++;
        this.updateCounter++;
        
        // Fixed timestep for stability (1/240 second)
        const fixedTimeStep = 1/240;
        const maxDeltaTime = 1/30; // Cap at 30 FPS minimum
        
        // Clamp deltaTime to prevent instability
        const clampedDelta = Math.min(deltaTime, maxDeltaTime);
        
        // Calculate substeps based on time acceleration
        const substeps = Math.ceil(clampedDelta * this.physicsTimeMultiplier / fixedTimeStep);
        const dt = clampedDelta * this.physicsTimeMultiplier / substeps;
        
        // Run physics substeps
        for (let i = 0; i < substeps; i++) {
            this.applyGravity(dt);
            
            // Havok physics step is handled automatically by Babylon
            // when we apply forces - no need to call executeStep
        }
        
        // Update LOD for performance with 10K objects
        if (this.updateCounter % 10 === 0) {
            this.updateLOD();
        }
        
        // Update mesh positions from physics
        if (this.updateCounter % this.meshUpdateFrequency === 0) {
            this.updateMeshes();
        }
    }
    
    // Alias for compatibility
    update(deltaTime) {
        this.step(deltaTime);
    }
    
    /**
     * Apply gravity to all bodies - REAL PHYSICS ONLY
     */
    applyGravity(dt) {
        // Temporary vector for gravity calculations
        const tempVec = new BABYLON.Vector3();
        
        this.bodies.forEach((bodyData, id) => {
            const impostor = bodyData.impostor;
            if (!impostor || !impostor.physicsBody) return;
            
            const mesh = bodyData.mesh;
            if (!mesh) return;
            
            // Get position in physics units (km)
            const pos = mesh.position.scale(1 / this.KM_TO_BABYLON);
            const r = pos.length();
            
            // Check for atmospheric entry
            const altitude = r - this.EARTH_RADIUS;
            if (altitude < 100) {
                // Burnup altitude
                this.handleAtmosphericEntry(id, bodyData);
                return;
            }
            
            // F = -GMm/r² in direction of position
            // But Havok uses F = ma, so we need acceleration
            // a = -GM/r² = -μ/r²
            const accelMagnitude = -this.EARTH_MU / (r * r);
            
            // Normalize position to get direction
            tempVec.copyFrom(pos);
            tempVec.normalize();
            tempVec.scaleInPlace(accelMagnitude);
            
            // Convert acceleration to force: F = ma
            tempVec.scaleInPlace(bodyData.mass);
            
            // Apply gravitational force
            impostor.applyForce(tempVec, mesh.position);
            
            // Apply atmospheric drag if in upper atmosphere (100-200 km)
            if (altitude < 200) {
                this.applyAtmosphericDrag(impostor, altitude, dt, bodyData.mass);
            }
        });
        
        // Apply gravity to debris too
        this.debris.forEach((debrisData, id) => {
            const impostor = debrisData.impostor;
            if (!impostor || !impostor.physicsBody) return;
            
            const mesh = debrisData.mesh;
            const pos = mesh.position.scale(1 / this.KM_TO_BABYLON);
            const r = pos.length();
            
            const altitude = r - this.EARTH_RADIUS;
            if (altitude < 100) {
                this.handleDebrisBurnup(id, debrisData);
                return;
            }
            
            const accelMagnitude = -this.EARTH_MU / (r * r);
            tempVec.copyFrom(pos);
            tempVec.normalize();
            tempVec.scaleInPlace(accelMagnitude * (debrisData.mass || 10));
            
            impostor.applyForce(tempVec, mesh.position);
        });
    }
    
    /**
     * Apply atmospheric drag - simplified exponential model
     */
    applyAtmosphericDrag(impostor, altitude, dt, mass) {
        const velocity = impostor.getLinearVelocity();
        const speed = velocity.length();
        
        if (speed > 0.01) {
            // Exponential atmosphere density model
            const dragFactor = Math.exp(-(altitude - 100) / 50) * 0.001;
            
            // F_drag = -v * dragFactor * v²
            const dragForce = velocity.normalize();
            dragForce.scaleInPlace(-dragFactor * speed * speed * mass);
            
            impostor.applyForce(dragForce, impostor.object.position);
        }
    }
    
    /**
     * Handle atmospheric entry and burnup
     */
    handleAtmosphericEntry(id, bodyData) {
        // Create burnup effect
        this.createAtmosphericBurnup(bodyData.mesh.position, bodyData.mass);
        
        // Remove satellite
        if (bodyData.impostor) {
            bodyData.impostor.dispose();
        }
        if (bodyData.mesh) {
            bodyData.mesh.dispose();
        }
        this.bodies.delete(id);
        
        if (this.debugLogged) {
            console.log(`Satellite ${id} burned up in atmosphere`);
        }
    }
    
    handleDebrisBurnup(id, debrisData) {
        this.createAtmosphericBurnup(debrisData.mesh.position, 10);
        
        if (debrisData.impostor) {
            debrisData.impostor.dispose();
        }
        if (debrisData.mesh) {
            debrisData.mesh.dispose();
        }
        this.debris.delete(id);
    }
    
    /**
     * Create atmospheric burnup visual effect
     */
    createAtmosphericBurnup(position, mass) {
        // Create expanding fireball
        const fireball = BABYLON.MeshBuilder.CreateSphere("burnup", {
            diameter: 0.02 * Math.sqrt(mass / 100)
        }, this.scene);
        
        fireball.position = position.clone();
        
        const mat = new BABYLON.StandardMaterial("burnupMat", this.scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Orange-red
        mat.disableLighting = true;
        fireball.material = mat;
        
        // Animate expansion and fade
        let scale = 1;
        const expandAnimation = setInterval(() => {
            scale += 0.3;
            fireball.scaling.setAll(scale);
            mat.alpha = Math.max(0, 1 - scale / 15);
            
            if (scale > 15) {
                clearInterval(expandAnimation);
                fireball.dispose();
            }
        }, 30);
    }
    
    /**
     * Update mesh positions from physics bodies
     */
    updateMeshes() {
        // Physics is already updating mesh positions via impostors
        // This is just for any additional updates needed
    }
    
    /**
     * Level of Detail system for 10K objects
     */
    updateLOD() {
        if (!this.scene.activeCamera) return;
        
        const cameraPos = this.scene.activeCamera.position.scale(1 / this.KM_TO_BABYLON);
        let nearCount = 0, midCount = 0, farCount = 0;
        
        this.bodies.forEach((bodyData) => {
            const mesh = bodyData.mesh;
            if (!mesh) return;
            
            const distance = BABYLON.Vector3.Distance(
                cameraPos,
                mesh.position.scale(1 / this.KM_TO_BABYLON)
            );
            
            // Adjust physics and rendering based on distance
            if (distance < this.LOD_DISTANCES.NEAR) {
                // Full physics and rendering
                if (bodyData.impostor && bodyData.impostor.physicsBody) {
                    bodyData.impostor.setMass(bodyData.mass); // Active
                }
                mesh.isVisible = true;
                nearCount++;
            } else if (distance < this.LOD_DISTANCES.MID) {
                // Reduced physics frequency
                if (bodyData.impostor && bodyData.impostor.physicsBody) {
                    // Update physics less frequently
                    if (this.updateCounter % 5 === 0) {
                        bodyData.impostor.setMass(bodyData.mass);
                    } else {
                        bodyData.impostor.setMass(0); // Make static temporarily
                    }
                }
                mesh.isVisible = true;
                midCount++;
            } else if (distance < this.LOD_DISTANCES.FAR) {
                // Minimal physics
                if (bodyData.impostor && bodyData.impostor.physicsBody) {
                    if (this.updateCounter % 10 === 0) {
                        bodyData.impostor.setMass(bodyData.mass);
                    } else {
                        bodyData.impostor.setMass(0);
                    }
                }
                // Reduce visibility for performance
                mesh.isVisible = (this.updateCounter % 2 === 0);
                farCount++;
            } else {
                // Too far - minimal updates
                if (bodyData.impostor && bodyData.impostor.physicsBody) {
                    bodyData.impostor.setMass(0); // Static
                }
                mesh.isVisible = false;
            }
        });
        
        // Log LOD distribution periodically
        if (this.frameCount % 600 === 0 && this.debugLogged) {
            console.log(`LOD: Near=${nearCount}, Mid=${midCount}, Far=${farCount}`);
        }
    }
    
    /**
     * Trigger enhanced Kessler Syndrome cascade
     */
    triggerKesslerSyndrome() {
        if (this.kesslerActive) {
            console.log('RED ORBIT: Kessler Syndrome already active!');
            return null;
        }
        
        console.log('RED ORBIT: INITIATING KESSLER CASCADE WITH 10,000 OBJECTS!');
        
        // Find two satellites at similar altitudes for collision
        const bodiesArray = Array.from(this.bodies.values());
        if (bodiesArray.length < 2) return null;
        
        // Find satellites in LEO for maximum cascade potential
        const leoSats = bodiesArray.filter(b => {
            const alt = b.altitude || 0;
            return alt > 200 && alt < 2000;
        });
        
        if (leoSats.length < 2) return null;
        
        // Pick two satellites at similar altitudes
        leoSats.sort((a, b) => a.altitude - b.altitude);
        const idx1 = Math.floor(leoSats.length * 0.3);
        const idx2 = Math.floor(leoSats.length * 0.3) + 1;
        
        const sat1 = leoSats[idx1];
        const sat2 = leoSats[idx2];
        
        if (!sat1.impostor || !sat2.impostor) return null;
        
        // Calculate collision vector
        const pos1 = sat1.mesh.position;
        const pos2 = sat2.mesh.position;
        const collisionPoint = pos1.add(pos2).scale(0.5);
        const collisionVector = pos2.subtract(pos1).normalize();
        
        // Set high-speed collision course (7.5 km/s)
        sat1.impostor.setLinearVelocity(collisionVector.scale(7.5));
        sat2.impostor.setLinearVelocity(collisionVector.scale(-7.5));
        
        this.kesslerActive = true;
        this.kesslerCollisionCount = 0;
        this.kesslerCascadeLevel = 0;
        this.kesslerDebrisGenerated = 0;
        this.cascadeStartTime = Date.now();
        
        // Set up collision detection
        this.setupCollisionCallbacks();
        
        console.log(`RED ORBIT: Collision initiated at altitude ${sat1.altitude.toFixed(0)}km`);
        
        return {
            position: collisionPoint,
            altitude: sat1.altitude,
            message: 'KESSLER CASCADE INITIATED',
            sat1: sat1.mesh.name,
            sat2: sat2.mesh.name
        };
    }
    
    /**
     * Set up collision detection callbacks
     */
    setupCollisionCallbacks() {
        // Havok handles collisions automatically
        // We monitor them through position changes and velocity
        // For now, we'll use proximity detection in checkCollisions
        this.collisionCheckInterval = setInterval(() => {
            if (this.kesslerActive) {
                this.checkCollisions();
            }
        }, 100); // Check every 100ms
    }
    
    /**
     * Check for collisions during Kessler cascade
     */
    checkCollisions() {
        if (!this.kesslerActive) return;
        
        const collisionThreshold = 0.005; // Babylon units (about 30km)
        const bodiesArray = Array.from(this.bodies.values());
        
        for (let i = 0; i < bodiesArray.length - 1; i++) {
            for (let j = i + 1; j < bodiesArray.length; j++) {
                const body1 = bodiesArray[i];
                const body2 = bodiesArray[j];
                
                if (!body1.mesh || !body2.mesh) continue;
                
                const distance = BABYLON.Vector3.Distance(
                    body1.mesh.position,
                    body2.mesh.position
                );
                
                if (distance < collisionThreshold) {
                    // Collision detected!
                    this.handleCollision(body1, body2);
                }
            }
        }
    }
    
    /**
     * Handle collision between two bodies
     */
    handleCollision(body1, body2) {
        this.kesslerCollisionCount++;
        this.kesslerCascadeLevel = Math.floor(this.kesslerCollisionCount / 5);
        
        // Calculate impact point
        const impactPoint = body1.mesh.position.add(body2.mesh.position).scale(0.5);
        
        // Generate debris based on cascade level
        const debrisCount = Math.min(5 + this.kesslerCascadeLevel * 2, 20);
        for (let i = 0; i < debrisCount; i++) {
            this.createDebris(impactPoint, i);
        }
        
        // Remove collided satellites
        const id1 = body1.mesh.name;
        const id2 = body2.mesh.name;
        
        if (body1.impostor) body1.impostor.dispose();
        if (body1.mesh) body1.mesh.dispose();
        this.bodies.delete(id1);
        
        if (body2.impostor) body2.impostor.dispose();
        if (body2.mesh) body2.mesh.dispose();
        this.bodies.delete(id2);
        
        this.kesslerDebrisGenerated += debrisCount;
        
        if (this.kesslerCollisionCount % 5 === 0) {
            console.log(`KESSLER CASCADE: Level ${this.kesslerCascadeLevel}, Collisions: ${this.kesslerCollisionCount}, Debris: ${this.kesslerDebrisGenerated}`);
        }
    }
    
    /**
     * Create debris from collision
     */
    createDebris(position, index) {
        if (this.debris.size >= this.maxDebris) return; // Limit debris
        
        const id = `kessler_debris_${Date.now()}_${index}`;
        
        // Create debris mesh
        const debris = BABYLON.MeshBuilder.CreateSphere(id, {
            diameter: 0.004, // Small debris
            segments: 4 // Low poly for performance
        }, this.scene);
        
        debris.position = position.clone();
        
        // Glowing orange/red debris
        const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0.3, 0); // Red-orange
        mat.disableLighting = true;
        debris.material = mat;
        
        // Create physics impostor
        const impostor = new BABYLON.PhysicsImpostor(
            debris,
            BABYLON.PhysicsImpostor.SphereImpostor,
            {
                mass: 10 + Math.random() * 50, // 10-60 kg
                restitution: 0.7,
                friction: 0
            },
            this.scene
        );
        
        // Random ejection velocity (realistic speeds)
        const speed = 1 + Math.random() * 3; // 1-4 km/s
        const velocity = new BABYLON.Vector3(
            (Math.random() - 0.5) * speed,
            (Math.random() - 0.5) * speed,
            (Math.random() - 0.5) * speed
        );
        impostor.setLinearVelocity(velocity);
        
        this.debris.set(id, { 
            mesh: debris, 
            impostor: impostor,
            mass: impostor.mass
        });
    }
    
    
    /**
     * Get Kessler Syndrome status
     */
    getKesslerStatus() {
        return {
            active: this.kesslerActive,
            collisionCount: this.kesslerCollisionCount,
            cascadeLevel: this.kesslerCascadeLevel,
            debrisGenerated: this.kesslerDebrisGenerated,
            message: this.getKesslerMessage(),
            criticalMass: this.kesslerCascadeLevel >= 5
        };
    }
    
    getKesslerMessage() {
        const messages = [
            'System Stable',
            'Initial Impact Detected',
            'Secondary Collisions Beginning',
            'Cascade Effect Accelerating',
            'Critical Mass Approaching',
            'FULL KESSLER CASCADE ACTIVE',
            'CATASTROPHIC CASCADE',
            'ORBIT UNUSABLE'
        ];
        return messages[Math.min(this.kesslerCascadeLevel, messages.length - 1)];
    }
    
    /**
     * Clean up physics engine
     */
    dispose() {
        // Clear collision check interval
        if (this.collisionCheckInterval) {
            clearInterval(this.collisionCheckInterval);
        }
        
        // Dispose all bodies
        this.bodies.forEach(body => {
            if (body.impostor) body.impostor.dispose();
            if (body.mesh) body.mesh.dispose();
        });
        
        // Dispose all debris
        this.debris.forEach(deb => {
            if (deb.impostor) deb.impostor.dispose();
            if (deb.mesh) deb.mesh.dispose();
        });
        
        // Clear maps
        this.bodies.clear();
        this.debris.clear();
        
        // Disable physics engine
        if (this.plugin) {
            this.scene.disablePhysicsEngine();
        }
        
        console.log('RED ORBIT HAVOK: Physics engine disposed');
    }
    
    /**
     * Get statistics for monitoring
     */
    getStats() {
        return {
            totalObjects: this.bodies.size + this.debris.size,
            satellites: this.bodies.size,
            debris: this.debris.size,
            kesslerActive: this.kesslerActive,
            physicsTimeMultiplier: this.physicsTimeMultiplier,
            frameCount: this.frameCount
        };
    }
}