/**
 * ADVANCED KESSLER SYNDROME SYSTEM
 * The most dramatic space debris cascade visualization ever created
 */

import * as BABYLON from '@babylonjs/core';

export class AdvancedKesslerSystem {
    constructor(scene, redOrbitPhysics) {
        this.scene = scene;
        this.physics = redOrbitPhysics;
        
        // Anomaly tracking
        this.anomalies = new Map();
        this.anomalyTypes = ['rogue_satellite', 'asat_debris', 'micrometeorite', 'defunct_stage', 'collision_fragment'];
        
        // Collision prediction system
        this.predictions = [];
        this.closeApproaches = new Map();
        this.riskMatrix = new Map();
        
        // Visual effects
        this.warningZones = new Map();
        this.collisionFlashes = [];
        this.debrisTrails = new Map();
        this.shockwaves = [];
        
        // Cascade metrics
        this.cascadeMetrics = {
            totalCollisions: 0,
            debrisGenerated: 0,
            affectedOrbits: new Set(),
            cascadeVelocity: 0, // How fast the cascade is spreading
            criticalDensity: false,
            chainReactions: [],
            peakDebrisFlux: 0
        };
        
        // Real-time tracking dashboard data
        this.dashboardData = {
            threatLevel: 'NOMINAL',
            activeAnomalies: 0,
            predictedCollisions: 0,
            debrisDensity: {},
            orbitHealth: {},
            cascadeTimeline: []
        };
        
        this.initializeVisualSystems();
    }
    
    initializeVisualSystems() {
        // Create warning zone material
        this.warningMaterial = new BABYLON.StandardMaterial('warningMat', this.scene);
        this.warningMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        this.warningMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
        this.warningMaterial.alpha = 0.2;
        this.warningMaterial.wireframe = true;
        
        // Create anomaly material (pulsing red)
        this.anomalyMaterial = new BABYLON.StandardMaterial('anomalyMat', this.scene);
        this.anomalyMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
        this.anomalyMaterial.disableLighting = true;
        
        // Initialize particle system for debris clouds
        this.initializeDebrisCloud();
    }
    
    initializeDebrisCloud() {
        // Create particle system for micro debris visualization
        const particleSystem = new BABYLON.ParticleSystem('debrisCloud', 5000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', this.scene);
        
        particleSystem.minSize = 0.001;
        particleSystem.maxSize = 0.005;
        particleSystem.minLifeTime = 10;
        particleSystem.maxLifeTime = 30;
        
        particleSystem.emitRate = 0; // Will burst on collision
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 0.2, 0, 0.5);
        
        this.debrisCloudSystem = particleSystem;
    }
    
    /**
     * Inject anomalies into the orbital environment
     */
    injectAnomalies(count = 5) {
        console.log(`🎯 Injecting ${count} orbital anomalies...`);
        
        for (let i = 0; i < count; i++) {
            const type = this.anomalyTypes[Math.floor(Math.random() * this.anomalyTypes.length)];
            const anomaly = this.createAnomaly(type);
            this.anomalies.set(anomaly.id, anomaly);
        }
        
        this.dashboardData.activeAnomalies = this.anomalies.size;
        this.updateThreatLevel();
    }
    
    createAnomaly(type) {
        const id = `anomaly_${type}_${Date.now()}_${Math.random()}`;
        
        let config = {};
        switch(type) {
            case 'rogue_satellite':
                // Uncontrolled satellite with erratic behavior
                config = {
                    altitude: 400 + Math.random() * 1600,
                    velocity: 8 + Math.random() * 2, // km/s - too fast!
                    mass: 500 + Math.random() * 2000, // kg
                    tumbling: true,
                    eccentricity: 0.3 + Math.random() * 0.4, // Highly elliptical
                    visualSize: 0.015,
                    threat: 'HIGH'
                };
                break;
                
            case 'asat_debris':
                // Anti-satellite weapon test debris field
                config = {
                    altitude: 600 + Math.random() * 800,
                    velocity: 10 + Math.random() * 5, // Very high velocity
                    mass: 10 + Math.random() * 100,
                    count: 20 + Math.floor(Math.random() * 30), // Multiple fragments
                    spread: 50, // km spread radius
                    visualSize: 0.008,
                    threat: 'CRITICAL'
                };
                break;
                
            case 'micrometeorite':
                // Natural space debris
                config = {
                    altitude: 200 + Math.random() * 35000, // Can be anywhere
                    velocity: 15 + Math.random() * 25, // Extremely fast
                    mass: 0.001 + Math.random() * 1, // Very small
                    retrograde: Math.random() > 0.5, // 50% chance of retrograde
                    visualSize: 0.004,
                    threat: 'MEDIUM'
                };
                break;
                
            case 'defunct_stage':
                // Spent rocket stage
                config = {
                    altitude: 300 + Math.random() * 2000,
                    velocity: 7 + Math.random() * 1,
                    mass: 2000 + Math.random() * 8000, // Very massive
                    tumbling: true,
                    leaking: Math.random() > 0.7, // 30% chance of fuel leak
                    visualSize: 0.02,
                    threat: 'HIGH'
                };
                break;
                
            case 'collision_fragment':
                // Fresh debris from recent collision
                config = {
                    altitude: 500 + Math.random() * 1000,
                    velocity: 7 + Math.random() * 3,
                    mass: 1 + Math.random() * 100,
                    spinning: true,
                    visualSize: 0.006,
                    threat: 'MEDIUM'
                };
                break;
        }
        
        // Create visual representation
        const mesh = this.createAnomalyMesh(id, config);
        
        // Add to physics if needed
        if (type === 'asat_debris' && config.count) {
            // Create debris field
            this.createDebrisField(config);
        } else {
            // Single anomaly
            this.physics.createSatellite({
                id: id,
                altitude: config.altitude,
                inclination: Math.random() * 180,
                eccentricity: config.eccentricity || Math.random() * 0.3,
                mesh: mesh,
                mass: config.mass,
                isAnomaly: true
            });
        }
        
        return {
            id,
            type,
            config,
            mesh,
            createdAt: Date.now(),
            collisionRisk: this.calculateCollisionRisk(config)
        };
    }
    
    createAnomalyMesh(id, config) {
        const mesh = BABYLON.MeshBuilder.CreateSphere(
            id,
            { diameter: config.visualSize, segments: 12 },
            this.scene
        );
        
        // Pulsing red material for anomalies
        const material = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
        material.emissiveColor = new BABYLON.Color3(1, 0, 0);
        material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        material.disableLighting = true;
        
        // Add pulsing animation
        let pulsePhase = 0;
        this.scene.registerBeforeRender(() => {
            pulsePhase += 0.05;
            const pulse = 0.7 + Math.sin(pulsePhase) * 0.3;
            material.emissiveColor = new BABYLON.Color3(pulse, 0, 0);
            
            // Tumbling effect
            if (config.tumbling) {
                mesh.rotation.x += 0.02;
                mesh.rotation.y += 0.03;
            }
            
            // Spinning effect
            if (config.spinning) {
                mesh.rotation.z += 0.05;
            }
        });
        
        mesh.material = material;
        
        // Add warning zone around high-threat anomalies
        if (config.threat === 'HIGH' || config.threat === 'CRITICAL') {
            this.createWarningZone(mesh, config.visualSize * 10);
        }
        
        return mesh;
    }
    
    createWarningZone(centerMesh, radius) {
        const zone = BABYLON.MeshBuilder.CreateSphere(
            `warning_${centerMesh.id}`,
            { diameter: radius, segments: 16 },
            this.scene
        );
        
        zone.material = this.warningMaterial;
        zone.parent = centerMesh;
        zone.isPickable = false;
        
        this.warningZones.set(centerMesh.id, zone);
    }
    
    createDebrisField(config) {
        const center = {
            altitude: config.altitude,
            inclination: Math.random() * 180
        };
        
        // Create multiple debris pieces in a cloud
        for (let i = 0; i < config.count; i++) {
            const debrisId = `debris_field_${Date.now()}_${i}`;
            
            const mesh = BABYLON.MeshBuilder.CreateSphere(
                debrisId,
                { diameter: 0.004 + Math.random() * 0.004, segments: 6 },
                this.scene
            );
            
            // Orange glowing debris
            const material = new BABYLON.StandardMaterial(`mat_${debrisId}`, this.scene);
            material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
            material.disableLighting = true;
            mesh.material = material;
            
            // Spread debris around center point
            const spreadAngle = Math.random() * Math.PI * 2;
            const spreadDistance = Math.random() * config.spread;
            
            this.physics.createSatellite({
                id: debrisId,
                altitude: center.altitude + (Math.random() - 0.5) * 100,
                inclination: center.inclination + (Math.random() - 0.5) * 10,
                eccentricity: Math.random() * 0.2,
                mesh: mesh,
                mass: config.mass / config.count,
                isDebris: true
            });
        }
    }
    
    calculateCollisionRisk(config) {
        // Calculate collision probability based on orbital parameters
        let risk = 0;
        
        // High velocity increases risk
        if (config.velocity > 10) risk += 30;
        else if (config.velocity > 8) risk += 20;
        else risk += 10;
        
        // Mass affects damage potential
        if (config.mass > 1000) risk += 25;
        else if (config.mass > 100) risk += 15;
        else risk += 5;
        
        // Altitude in busy zones
        if (config.altitude >= 400 && config.altitude <= 1200) risk += 20; // LEO congestion
        else if (config.altitude >= 19000 && config.altitude <= 21000) risk += 15; // MEO/GPS
        
        // Eccentricity crosses multiple altitudes
        if (config.eccentricity > 0.3) risk += 15;
        
        // Retrograde orbits
        if (config.retrograde) risk += 20;
        
        return Math.min(risk, 100); // Cap at 100%
    }
    
    /**
     * Advanced collision prediction system
     */
    predictCollisions(timeHorizon = 300) { // seconds
        this.predictions = [];
        const bodies = this.physics.bodies;
        
        bodies.forEach((data1, id1) => {
            bodies.forEach((data2, id2) => {
                if (id1 >= id2) return; // Avoid duplicates
                
                const prediction = this.calculateClosestApproach(data1, data2, timeHorizon);
                if (prediction && prediction.distance < 0.1) { // Within 100m
                    this.predictions.push({
                        objects: [id1, id2],
                        time: prediction.time,
                        distance: prediction.distance,
                        probability: this.calculateCollisionProbability(prediction),
                        impact: this.calculateImpactSeverity(data1, data2)
                    });
                }
            });
        });
        
        // Sort by time
        this.predictions.sort((a, b) => a.time - b.time);
        this.dashboardData.predictedCollisions = this.predictions.length;
        
        return this.predictions;
    }
    
    calculateClosestApproach(data1, data2, timeHorizon) {
        // Simplified closest approach calculation
        const pos1 = data1.body.getWorldTransform().getOrigin();
        const pos2 = data2.body.getWorldTransform().getOrigin();
        
        const vel1 = data1.body.getLinearVelocity();
        const vel2 = data2.body.getLinearVelocity();
        
        // Relative position and velocity
        const relPos = {
            x: pos2.x() - pos1.x(),
            y: pos2.y() - pos1.y(),
            z: pos2.z() - pos1.z()
        };
        
        const relVel = {
            x: vel2.x() - vel1.x(),
            y: vel2.y() - vel1.y(),
            z: vel2.z() - vel1.z()
        };
        
        // Time of closest approach
        const velMag = relVel.x * relVel.x + relVel.y * relVel.y + relVel.z * relVel.z;
        if (velMag < 0.0001) return null; // Not approaching
        
        const t = -(relPos.x * relVel.x + relPos.y * relVel.y + relPos.z * relVel.z) / velMag;
        
        if (t < 0 || t > timeHorizon) return null; // Outside time window
        
        // Position at closest approach
        const closestDist = Math.sqrt(
            Math.pow(relPos.x + relVel.x * t, 2) +
            Math.pow(relPos.y + relVel.y * t, 2) +
            Math.pow(relPos.z + relVel.z * t, 2)
        );
        
        return {
            time: t,
            distance: closestDist
        };
    }
    
    calculateCollisionProbability(prediction) {
        // Based on distance, relative velocity, and object sizes
        const baseProbability = Math.exp(-prediction.distance * 10); // Exponential decay
        return Math.min(baseProbability * 100, 100);
    }
    
    calculateImpactSeverity(data1, data2) {
        const mass1 = data1.mass || 100;
        const mass2 = data2.mass || 100;
        const vel1 = data1.body.getLinearVelocity();
        const vel2 = data2.body.getLinearVelocity();
        
        const relVel = Math.sqrt(
            Math.pow(vel2.x() - vel1.x(), 2) +
            Math.pow(vel2.y() - vel1.y(), 2) +
            Math.pow(vel2.z() - vel1.z(), 2)
        );
        
        // Kinetic energy of impact
        const kineticEnergy = 0.5 * (mass1 * mass2) / (mass1 + mass2) * relVel * relVel;
        
        // Severity scale 1-10
        if (kineticEnergy > 1000000) return 10;
        if (kineticEnergy > 100000) return 8;
        if (kineticEnergy > 10000) return 6;
        if (kineticEnergy > 1000) return 4;
        return 2;
    }
    
    /**
     * Update threat assessment
     */
    updateThreatLevel() {
        const anomalyCount = this.anomalies.size;
        const criticalAnomalies = Array.from(this.anomalies.values())
            .filter(a => a.config.threat === 'CRITICAL').length;
        const collisionCount = this.cascadeMetrics.totalCollisions;
        const debrisCount = this.physics.debris.size;
        
        let threatLevel = 'NOMINAL';
        
        if (criticalAnomalies > 0 || collisionCount > 20 || debrisCount > 500) {
            threatLevel = 'CRITICAL';
        } else if (anomalyCount > 10 || collisionCount > 10 || debrisCount > 200) {
            threatLevel = 'SEVERE';
        } else if (anomalyCount > 5 || collisionCount > 5 || debrisCount > 100) {
            threatLevel = 'ELEVATED';
        } else if (anomalyCount > 2 || collisionCount > 0 || debrisCount > 50) {
            threatLevel = 'CAUTION';
        }
        
        this.dashboardData.threatLevel = threatLevel;
        
        // Update UI if available
        this.updateDashboard();
    }
    
    /**
     * Update dashboard with real-time data
     */
    updateDashboard() {
        // Calculate debris density by altitude
        const altitudeBins = {};
        this.physics.bodies.forEach((data) => {
            const altitude = Math.floor(data.altitude / 100) * 100; // 100km bins
            altitudeBins[altitude] = (altitudeBins[altitude] || 0) + 1;
        });
        
        this.dashboardData.debrisDensity = altitudeBins;
        
        // Emit event for UI
        if (window.redOrbitApp) {
            window.redOrbitApp.onKesslerUpdate?.(this.dashboardData);
        }
    }
    
    /**
     * Trigger enhanced Kessler cascade with multiple scenarios
     */
    triggerAdvancedKessler(scenario = 'collision') {
        console.log(`🚨 INITIATING ADVANCED KESSLER CASCADE - SCENARIO: ${scenario} 🚨`);
        
        // Inject anomalies first
        this.injectAnomalies(3);
        
        switch(scenario) {
            case 'asat':
                // Anti-satellite weapon test
                this.triggerASATScenario();
                break;
                
            case 'cascade':
                // Multi-point cascade
                this.triggerMultiPointCascade();
                break;
                
            case 'swarm':
                // Debris swarm encounter
                this.triggerDebrisSwarm();
                break;
                
            default:
                // Standard collision - use physics engine's trigger
                if (this.physics.triggerKessler) {
                    this.physics.triggerKessler();
                }
        }
        
        // Start prediction system
        this.startPredictionLoop();
        
        // Update metrics
        this.cascadeMetrics.totalCollisions++;
        this.updateThreatLevel();
    }
    
    triggerASATScenario() {
        console.log("💥 ASAT WEAPON DETONATION DETECTED!");
        
        // Find a target satellite in LEO
        const targets = Array.from(this.physics.bodies.entries())
            .filter(([id, data]) => data.altitude > 400 && data.altitude < 1000);
        
        if (targets.length > 0) {
            const [targetId, targetData] = targets[Math.floor(Math.random() * targets.length)];
            
            // Generate ASAT debris field
            this.createDebrisField({
                altitude: targetData.altitude,
                velocity: 12,
                mass: 50,
                count: 50,
                spread: 100,
                threat: 'CRITICAL'
            });
            
            // Destroy original target
            this.physics.destroyBody(targetId);
        }
    }
    
    triggerMultiPointCascade() {
        console.log("🌟 MULTI-POINT CASCADE INITIATED!");
        
        // Trigger collisions at multiple altitudes
        const altitudes = [600, 900, 1200];
        altitudes.forEach((alt, index) => {
            setTimeout(() => {
                const satellites = Array.from(this.physics.bodies.entries())
                    .filter(([id, data]) => Math.abs(data.altitude - alt) < 100);
                
                if (satellites.length >= 2) {
                    // Force collision between two satellites
                    if (this.physics.triggerKessler) {
                        this.physics.triggerKessler();
                    }
                }
            }, index * 2000); // Stagger by 2 seconds
        });
    }
    
    triggerDebrisSwarm() {
        console.log("☄️ DEBRIS SWARM ENCOUNTER!");
        
        // Create a fast-moving debris field
        this.createDebrisField({
            altitude: 800,
            velocity: 15,
            mass: 10,
            count: 100,
            spread: 200,
            threat: 'CRITICAL'
        });
    }
    
    startPredictionLoop() {
        // Update predictions every second
        setInterval(() => {
            this.predictCollisions();
            
            // Check for imminent collisions
            if (this.predictions.length > 0 && this.predictions[0].time < 5) {
                console.warn(`⚠️ COLLISION IMMINENT IN ${this.predictions[0].time.toFixed(1)}s!`);
            }
        }, 1000);
    }
    
    /**
     * Get current cascade status for display
     */
    getStatus() {
        return {
            ...this.dashboardData,
            cascadeMetrics: this.cascadeMetrics,
            predictions: this.predictions.slice(0, 5), // Top 5 predictions
            anomalies: Array.from(this.anomalies.values()).map(a => ({
                type: a.type,
                threat: a.config.threat,
                altitude: a.config.altitude,
                risk: a.collisionRisk
            }))
        };
    }
}

// Export for use in main app
window.AdvancedKesslerSystem = AdvancedKesslerSystem;