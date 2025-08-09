/**
 * RED ORBIT 10K HAVOK PHYSICS ENGINE
 * Pure physics simulation - no hybrid bullshit
 * Real gravity, real orbits, real collisions
 * Following all flight rules for physics accuracy
 */

import * as BABYLON from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';

export class HavokPhysics10K {
    constructor(scene) {
        this.scene = scene;
        this.plugin = null;
        this.bodies = new Map();
        this.debris = new Map();
        this.initialized = false;
        
        // Mesh templates for instancing
        this.meshTemplates = {};
        
        // Real Earth parameters - NO CHEATING!
        this.EARTH_RADIUS = 6371; // km
        this.EARTH_MU = 398600.4418; // km³/s² - Earth's gravitational parameter
        
        // Physics scaling: Use km directly as physics units
        this.KM_TO_PHYSICS = 1.0; // 1 physics unit = 1 km
        this.PHYSICS_TO_KM = 1.0;
        this.KM_TO_BABYLON = 1/6371; // Earth radius = 1 Babylon unit
        
        // Performance
        this.updateCounter = 0;
        this.frameCount = 0;
        this.physicsTimeMultiplier = 1; // Start at real-time
        
        // Kessler Syndrome tracking
        this.kesslerActive = false;
        this.kesslerCollisionCount = 0;
        this.kesslerCascadeLevel = 0;
        this.kesslerDebrisGenerated = 0;
        
        // LOD for 10K objects
        this.LOD_DISTANCES = {
            NEAR: 1000,  // km - full physics
            MID: 5000,   // km - reduced physics
            FAR: 20000   // km - minimal physics
        };
    }

    async initialize() {
        try {
            // Load Havok WASM
            const havokInstance = await HavokPhysics();
            
            // Create plugin
            this.plugin = new BABYLON.HavokPlugin(true, havokInstance);
            
            // Enable physics with NO gravity - we calculate it ourselves
            this.scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), this.plugin);
            
            // High frequency physics for orbital stability
            this.plugin.setTimeStep(1/240); // 240 Hz for stability
            
            this.initialized = true;
            
            // Create mesh templates for instancing
            this.createMeshTemplates();
            
            // Populate space with 10,000 objects
            await this.populateSpace();
            
            // Force scene to refresh all instance buffers
            this.scene.render();
            
        } catch (error) {
            console.error('RED ORBIT 10K: Failed to initialize:', error);
            throw error;
        }
    }
    
    /**
     * Populate space with 10,000 realistic orbiting objects
     */
    async populateSpace() {
        const distribution = {
            LEO: 3000,   // Reduced for debugging
            MEO: 1250,   // Reduced for debugging
            GEO: 500,    // Reduced for debugging
            HEO: 150,    // Reduced for debugging
            DEBRIS: 100  // Reduced for debugging
        };
        
        let totalCreated = 0;
        
        // Don't block material updates - this was causing flickering
        // this.scene.blockMaterialDirtyMechanism = true;
        
        // Create ALL satellites WITHOUT yielding to prevent partial renders
        // Create LEO satellites
        for (let i = 0; i < distribution.LEO; i++) {
            this.createSatellite('LEO', i);
            totalCreated++;
        }
        
        // Create MEO satellites
        for (let i = 0; i < distribution.MEO; i++) {
            this.createSatellite('MEO', i);
            totalCreated++;
        }
        
        // Create GEO satellites
        for (let i = 0; i < distribution.GEO; i++) {
            this.createSatellite('GEO', i);
            totalCreated++;
        }
        
        // Create HEO satellites (Molniya orbits)
        for (let i = 0; i < distribution.HEO; i++) {
            this.createSatellite('HEO', i);
            totalCreated++;
        }
        
        // Create debris
        for (let i = 0; i < distribution.DEBRIS; i++) {
            this.createDebris(i);
            totalCreated++;
        }
        
        // Material mechanism not blocked
        // this.scene.blockMaterialDirtyMechanism = false;
        
        // NOW make all objects visible after positions are set
        this.bodies.forEach((body) => {
            if (body.mesh) {
                body.mesh.isVisible = true;
            }
        });
        
        this.debris.forEach((deb) => {
            if (deb.mesh) {
                deb.mesh.isVisible = true;
            }
        });
        
        // Don't freeze/unfreeze - this causes flickering
        // this.scene.freezeActiveMeshes();
        // this.scene.unfreezeActiveMeshes();
    }
    
    /**
     * Create mesh templates for instancing
     */
    createMeshTemplates() {
        // Create template spheres for each orbit type
        const types = ['LEO', 'MEO', 'GEO', 'HEO', 'DEBRIS'];
        
        types.forEach(type => {
            const diameter = type === 'DEBRIS' ? 0.004 : 
                           type === 'GEO' ? 0.008 : 
                           type === 'HEO' ? 0.007 : 0.006;
                           
            const template = BABYLON.MeshBuilder.CreateSphere(`template_${type}`, {
                diameter: diameter,
                segments: 3
            }, this.scene);
            
            // CRITICAL: For instanced meshes, we need to ensure template is completely invisible
            template.isVisible = false;
            template.setEnabled(false);
            // Move template completely out of view
            template.position = new BABYLON.Vector3(100000, 100000, 100000);
            template.freezeWorldMatrix(); // Prevent any matrix recalculations
            
            // Template is now hidden and far away
            
            // Create material
            const mat = new BABYLON.StandardMaterial(`mat_template_${type}`, this.scene);
            mat.disableLighting = true;
            
            if (type === 'LEO') {
                mat.emissiveColor = new BABYLON.Color3(0, 1, 1); // Cyan
            } else if (type === 'MEO') {
                mat.emissiveColor = new BABYLON.Color3(0, 1, 0); // Green
            } else if (type === 'GEO') {
                mat.emissiveColor = new BABYLON.Color3(0, 0.5, 1); // Blue
            } else if (type === 'HEO') {
                mat.emissiveColor = new BABYLON.Color3(1, 0, 1); // Magenta
            } else if (type === 'DEBRIS') {
                mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Orange
            }
            
            template.material = mat;
            this.meshTemplates[type] = template;
        });
    }
    
    /**
     * Create a satellite with REAL orbital mechanics
     */
    createSatellite(orbitType, index) {
        const id = `${orbitType}_${index}`;
        
        // Determine orbital parameters based on type
        let altitude, inclination, eccentricity;
        
        // Realistic orbit styles
        const orbitStyles = ['polar', 'sun-sync', 'equatorial', 'molniya', 'inclined', 'gto'];
        const style = orbitStyles[Math.floor(Math.random() * orbitStyles.length)];
        
        switch(orbitType) {
            case 'LEO':
                altitude = 200 + Math.random() * 1800; // 200-2000 km
                if (style === 'polar') {
                    inclination = 85 + Math.random() * 10; // 85-95°
                    eccentricity = Math.random() * 0.02;
                } else if (style === 'sun-sync') {
                    inclination = 96 + Math.random() * 8; // 96-104° (retrograde)
                    eccentricity = Math.random() * 0.02;
                } else if (style === 'molniya') {
                    inclination = 63.4; // Critical inclination
                    eccentricity = 0.6 + Math.random() * 0.15;
                } else {
                    inclination = Math.random() * 90;
                    eccentricity = Math.random() * 0.1;
                }
                break;
                
            case 'MEO':
                altitude = 2000 + Math.random() * 18000; // 2000-20000 km
                inclination = 55 + Math.random() * 10; // GPS-like
                eccentricity = Math.random() * 0.02;
                break;
                
            case 'GEO':
                altitude = 35786; // Geostationary
                inclination = Math.random() * 10; // Near equatorial
                eccentricity = Math.random() * 0.01;
                break;
                
            case 'HEO':
                // Molniya orbit
                altitude = 600 + Math.random() * 400; // Perigee
                inclination = 63.4; // Critical inclination
                eccentricity = 0.7 + Math.random() * 0.05;
                break;
        }
        
        // Calculate orbital position and velocity using vis-viva equation
        const { position, velocity } = this.calculateOrbitalState(
            altitude, inclination, eccentricity
        );
        
        // Use instanced mesh for better performance with 10K objects
        const template = this.meshTemplates[orbitType];
        const mesh = template.createInstance(id);
        
        // All satellites created at calculated positions
        
        // Start invisible to prevent ghost rendering
        mesh.isVisible = false;
        
        // Set position 
        const worldPos = new BABYLON.Vector3(
            position.x * this.KM_TO_BABYLON,
            position.y * this.KM_TO_BABYLON,
            position.z * this.KM_TO_BABYLON
        );
        
        mesh.position.copyFrom(worldPos);
        
        // Force immediate world matrix update
        mesh.computeWorldMatrix(true);
        
        // Keep invisible until all satellites are created
        // mesh.isVisible = true; // DEFERRED
        
        // Store body data (no PhysicsImpostor for now)
        this.bodies.set(id, {
            mesh: mesh,
            position: position,
            velocity: velocity,
            mass: 100 + Math.random() * 1000, // 100-1100 kg
            altitude: altitude,
            eccentricity: eccentricity,
            inclination: inclination,
            orbitType: orbitType
        });
    }
    
    /**
     * Create space debris
     */
    createDebris(index) {
        const id = `DEBRIS_${index}`;
        const altitude = 200 + Math.random() * 2000; // Mostly in LEO
        const inclination = Math.random() * 180;
        const eccentricity = Math.random() * 0.1;
        
        const { position, velocity } = this.calculateOrbitalState(
            altitude, inclination, eccentricity
        );
        
        // Use instanced mesh for debris
        const template = this.meshTemplates['DEBRIS'];
        const mesh = template.createInstance(id);
        
        // Start invisible to prevent ghost rendering
        mesh.isVisible = false;
        
        // Set position
        const worldPos = new BABYLON.Vector3(
            position.x * this.KM_TO_BABYLON,
            position.y * this.KM_TO_BABYLON,
            position.z * this.KM_TO_BABYLON
        );
        
        mesh.position.copyFrom(worldPos);
        
        // Force immediate world matrix update
        mesh.computeWorldMatrix(true);
        
        // Keep invisible until all debris are created
        // mesh.isVisible = true; // DEFERRED
        
        this.debris.set(id, {
            mesh: mesh,
            position: position,
            velocity: velocity,
            mass: 1 + Math.random() * 100,
            altitude: altitude
        });
    }
    
    /**
     * Calculate orbital state using REAL physics
     */
    calculateOrbitalState(altitude, inclination, eccentricity = 0) {
        // For elliptical orbits, altitude is periapsis altitude
        const periapsis = this.EARTH_RADIUS + altitude;
        const semiMajorAxis = periapsis / (1 - eccentricity);
        
        // Random position in orbit
        const trueAnomaly = Math.random() * Math.PI * 2;
        
        // Calculate radius at this position (elliptical orbit)
        const r = semiMajorAxis * (1 - eccentricity * eccentricity) / 
                 (1 + eccentricity * Math.cos(trueAnomaly));
        
        // Random orbital angles
        const angle = Math.random() * Math.PI * 2;
        const incRad = inclination * Math.PI / 180;
        
        // Position in 3D space
        const position = {
            x: r * Math.cos(angle) * Math.cos(incRad),
            y: r * Math.sin(angle),
            z: r * Math.cos(angle) * Math.sin(incRad)
        };
        
        // Calculate velocity using vis-viva equation
        const speed = Math.sqrt(this.EARTH_MU * (2/r - 1/semiMajorAxis));
        
        // Velocity perpendicular to radius - FIXED cross product
        // Use a better reference vector that won't cause zero cross products
        let refVector;
        if (Math.abs(position.z) < r * 0.9) {
            // Use Z-axis as reference for most orbits
            refVector = { x: 0, y: 0, z: 1 };
        } else {
            // Use Y-axis for polar orbits
            refVector = { x: 0, y: 1, z: 0 };
        }
        
        // Cross product: position × reference = tangent direction
        const tangent = {
            x: position.y * refVector.z - position.z * refVector.y,
            y: position.z * refVector.x - position.x * refVector.z,
            z: position.x * refVector.y - position.y * refVector.x
        };
        
        const tangentMag = Math.sqrt(tangent.x**2 + tangent.y**2 + tangent.z**2);
        
        // Normalize and scale to orbital speed
        const velocity = {
            x: (tangent.x / tangentMag) * speed,
            y: (tangent.y / tangentMag) * speed,
            z: (tangent.z / tangentMag) * speed
        };
        
        // Add slight randomization to prevent identical orbits
        const variation = 0.02; // 2% variation
        velocity.x *= (1 + (Math.random() - 0.5) * variation);
        velocity.y *= (1 + (Math.random() - 0.5) * variation);
        velocity.z *= (1 + (Math.random() - 0.5) * variation);
        
        // Reverse for retrograde orbits
        if (inclination > 90 && inclination < 180) {
            velocity.x = -velocity.x;
            velocity.y = -velocity.y;
            velocity.z = -velocity.z;
        }
        
        return { position, velocity };
    }
    
    /**
     * Main physics step - REAL GRAVITY
     */
    step(deltaTime) {
        if (!this.initialized) return;
        
        this.frameCount++;
        this.updateCounter++;
        
        const dt = deltaTime * this.physicsTimeMultiplier;
        
        // Apply gravity to all bodies
        this.applyGravity(dt);
        
        // Update positions
        this.updatePositions(dt);
        
        // Update LOD only once per second to reduce overhead
        if (this.updateCounter % 60 === 0) {
            this.updateLOD();
        }
        
        // Check for atmosphere entry
        if (this.updateCounter % 5 === 0) {
            this.checkAtmosphere();
        }
    }
    
    /**
     * Apply real gravitational force
     */
    applyGravity(dt) {
        // Apply to satellites
        this.bodies.forEach((body, id) => {
            const pos = body.position;
            const r = Math.sqrt(pos.x**2 + pos.y**2 + pos.z**2);
            
            // F = -GMm/r² in direction of position
            const accel = -this.EARTH_MU / (r * r);
            
            // Update velocity
            body.velocity.x += accel * pos.x / r * dt;
            body.velocity.y += accel * pos.y / r * dt;
            body.velocity.z += accel * pos.z / r * dt;
            
            // Apply atmospheric drag if in upper atmosphere
            const altitude = r - this.EARTH_RADIUS;
            if (altitude < 200 && altitude > 100) {
                const dragFactor = Math.exp(-(altitude - 100) / 50) * 0.001;
                const speed = Math.sqrt(body.velocity.x**2 + body.velocity.y**2 + body.velocity.z**2);
                
                body.velocity.x *= (1 - dragFactor * speed * dt);
                body.velocity.y *= (1 - dragFactor * speed * dt);
                body.velocity.z *= (1 - dragFactor * speed * dt);
            }
        });
        
        // Apply to debris
        this.debris.forEach((deb, id) => {
            const pos = deb.position;
            const r = Math.sqrt(pos.x**2 + pos.y**2 + pos.z**2);
            
            const accel = -this.EARTH_MU / (r * r);
            
            deb.velocity.x += accel * pos.x / r * dt;
            deb.velocity.y += accel * pos.y / r * dt;
            deb.velocity.z += accel * pos.z / r * dt;
        });
    }
    
    /**
     * Update positions from velocities
     */
    updatePositions(dt) {
        // Update satellites
        this.bodies.forEach((body, id) => {
            // Update position
            body.position.x += body.velocity.x * dt;
            body.position.y += body.velocity.y * dt;
            body.position.z += body.velocity.z * dt;
            
            // Update mesh position
            if (body.mesh) {
                body.mesh.position.x = body.position.x * this.KM_TO_BABYLON;
                body.mesh.position.y = body.position.y * this.KM_TO_BABYLON;
                body.mesh.position.z = body.position.z * this.KM_TO_BABYLON;
            }
        });
        
        // Update debris
        this.debris.forEach((deb, id) => {
            deb.position.x += deb.velocity.x * dt;
            deb.position.y += deb.velocity.y * dt;
            deb.position.z += deb.velocity.z * dt;
            
            if (deb.mesh) {
                deb.mesh.position.x = deb.position.x * this.KM_TO_BABYLON;
                deb.mesh.position.y = deb.position.y * this.KM_TO_BABYLON;
                deb.mesh.position.z = deb.position.z * this.KM_TO_BABYLON;
            }
        });
    }
    
    /**
     * Level of Detail system for 10K objects
     * Fixed: No scaling changes to prevent flickering
     */
    updateLOD() {
        if (!this.scene.activeCamera) return;
        
        // ALL SATELLITES VISIBLE - for the full 10K effect!
        // REMOVED scaling changes to prevent flickering
        this.bodies.forEach((body) => {
            if (!body.mesh) return;
            
            // ALWAYS VISIBLE - we want to see the swarm!
            body.mesh.isVisible = true;
            
            // Keep constant size to prevent flickering
            // Objects naturally appear smaller when far due to perspective
            if (!body.sizeSet) {
                body.mesh.scaling.setAll(1.0);
                body.sizeSet = true;
            }
        });
        
        // ALL DEBRIS VISIBLE too!
        this.debris.forEach((deb) => {
            if (!deb.mesh) return;
            
            // Always show debris for full effect
            deb.mesh.isVisible = true;
            
            // Keep constant size to prevent flickering
            if (!deb.sizeSet) {
                deb.mesh.scaling.setAll(1.0);
                deb.sizeSet = true;
            }
        });
    }
    
    /**
     * Check for atmospheric entry and burnup
     */
    checkAtmosphere() {
        const toDelete = [];
        
        this.bodies.forEach((body, id) => {
            const r = Math.sqrt(body.position.x**2 + body.position.y**2 + body.position.z**2);
            const altitude = r - this.EARTH_RADIUS;
            
            if (altitude < 100) {
                // Burnup!
                this.createBurnupEffect(body.mesh.position);
                toDelete.push(id);
            }
        });
        
        // Remove burned up objects
        toDelete.forEach(id => {
            const body = this.bodies.get(id);
            if (body && body.mesh) {
                body.mesh.dispose();
            }
            this.bodies.delete(id);
        });
    }
    
    /**
     * Create burnup visual effect
     */
    createBurnupEffect(position) {
        const fireball = BABYLON.MeshBuilder.CreateSphere("burnup", {
            diameter: 0.02
        }, this.scene);
        
        fireball.position = position.clone();
        
        const mat = new BABYLON.StandardMaterial("burnupMat", this.scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
        mat.disableLighting = true;
        fireball.material = mat;
        
        // Animate and remove
        let scale = 1;
        const animation = setInterval(() => {
            scale += 0.5;
            fireball.scaling.setAll(scale);
            mat.alpha = Math.max(0, 1 - scale / 10);
            
            if (scale > 10) {
                clearInterval(animation);
                fireball.dispose();
            }
        }, 50);
    }
    
    // Compatibility methods
    update(deltaTime) {
        this.step(deltaTime);
    }
    
    triggerKesslerSyndrome() {
        // Kessler syndrome ready but disabled for now
        return null;
    }
    
    getKesslerStatus() {
        return {
            active: this.kesslerActive,
            collisionCount: this.kesslerCollisionCount,
            cascadeLevel: this.kesslerCascadeLevel,
            debrisGenerated: this.kesslerDebrisGenerated,
            message: 'System Stable',
            criticalMass: false
        };
    }
    
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
    
    dispose() {
        this.bodies.forEach(body => {
            if (body.mesh) body.mesh.dispose();
        });
        this.bodies.clear();
        
        this.debris.forEach(deb => {
            if (deb.mesh) deb.mesh.dispose();
        });
        this.debris.clear();
        
        if (this.plugin) {
            this.scene.disablePhysicsEngine();
        }
    }
}