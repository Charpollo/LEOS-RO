/**
 * Satellite Physics Integration for Red Orbit
 * Adds Ammo.js physics to existing LEOS First Orbit satellites
 */

import { OrbitalPhysics } from './orbital-physics.js';
import * as satellite from 'satellite.js';

export class SatellitePhysicsIntegration {
    constructor(scene) {
        this.scene = scene;
        this.orbitalPhysics = new OrbitalPhysics();
        this.satellitePhysicsBodies = new Map();
        this.initialized = false;
        
        // Conversion factors
        this.KM_TO_BABYLON = 1 / 6371; // Earth radius = 1 Babylon unit
    }

    /**
     * Initialize physics system
     */
    async initialize() {
        try {
            console.log('Initializing Satellite Physics Integration...');
            await this.orbitalPhysics.initialize();
            this.initialized = true;
            console.log('Satellite Physics Integration ready');
            
            // Set up collision callback
            this.orbitalPhysics.onCollision = (collision) => {
                this.handleSatelliteCollision(collision);
            };
            
        } catch (error) {
            console.error('Failed to initialize satellite physics:', error);
            throw error;
        }
    }

    /**
     * Add physics to an existing satellite mesh
     * @param {Object} satelliteMesh - Babylon.js mesh
     * @param {Object} satelliteData - Satellite data with TLE, mass, etc
     */
    addPhysicsToSatellite(satelliteMesh, satelliteData) {
        if (!this.initialized) {
            console.warn('Physics not initialized, skipping satellite physics');
            return;
        }
        
        const satId = satelliteData.id || satelliteMesh.name;
        
        // Get current orbital state from TLE
        const orbitalState = this.getOrbitalStateFromTLE(satelliteData);
        if (!orbitalState) {
            console.warn(`Could not calculate orbital state for satellite ${satId}`);
            return;
        }
        
        // Default satellite parameters if not provided
        const mass = satelliteData.mass || 1000; // kg
        const radius = satelliteData.radius || 2; // meters
        
        // Create physics body
        const physicsBody = this.orbitalPhysics.createOrbitingBody({
            id: satId,
            mass: mass,
            radius: radius,
            position: orbitalState.position,
            velocity: orbitalState.velocity
        });
        
        // Store mapping
        this.satellitePhysicsBodies.set(satId, {
            mesh: satelliteMesh,
            body: physicsBody,
            data: satelliteData
        });
        
        console.log(`Added physics to satellite ${satId} at altitude ${orbitalState.altitude.toFixed(0)} km`);
    }

    /**
     * Calculate orbital state from TLE data
     */
    getOrbitalStateFromTLE(satelliteData) {
        if (!satelliteData.tle1 || !satelliteData.tle2) {
            return null;
        }
        
        try {
            // Parse TLE
            const satrec = satellite.twoline2satrec(satelliteData.tle1, satelliteData.tle2);
            
            // Get current time
            const now = new Date();
            
            // Propagate to current time
            const positionAndVelocity = satellite.propagate(satrec, now);
            
            if (positionAndVelocity.error) {
                console.error('TLE propagation error:', positionAndVelocity.message);
                return null;
            }
            
            // Extract ECI coordinates (km and km/s)
            const position = positionAndVelocity.position;
            const velocity = positionAndVelocity.velocity;
            
            if (!position || !velocity) {
                return null;
            }
            
            // Calculate altitude
            const altitude = Math.sqrt(
                position.x * position.x +
                position.y * position.y +
                position.z * position.z
            ) - 6371; // Earth radius
            
            return {
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                velocity: {
                    x: velocity.x,
                    y: velocity.y,
                    z: velocity.z
                },
                altitude: altitude
            };
            
        } catch (error) {
            console.error('Error calculating orbital state:', error);
            return null;
        }
    }

    /**
     * Update satellite positions from physics
     * Called every frame
     */
    updateSatellitePositions(deltaTime) {
        if (!this.initialized) return;
        
        // Step physics simulation
        this.orbitalPhysics.stepSimulation(deltaTime);
        
        // Update mesh positions from physics bodies
        this.satellitePhysicsBodies.forEach((satData, satId) => {
            const state = this.orbitalPhysics.getBodyState(satId);
            if (state) {
                // Convert physics position to Babylon coordinates
                satData.mesh.position.x = state.position.x * this.KM_TO_BABYLON;
                satData.mesh.position.y = state.position.y * this.KM_TO_BABYLON;
                satData.mesh.position.z = state.position.z * this.KM_TO_BABYLON;
                
                // Update telemetry if needed
                if (satData.data.updateTelemetry) {
                    satData.data.altitude = state.altitude;
                    satData.data.velocity = Math.sqrt(
                        state.velocity.x * state.velocity.x +
                        state.velocity.y * state.velocity.y +
                        state.velocity.z * state.velocity.z
                    );
                }
            }
        });
    }

    /**
     * Handle collision between satellites
     */
    handleSatelliteCollision(collision) {
        console.log('SATELLITE COLLISION DETECTED!', collision);
        
        // Find satellite data
        const sat1 = this.satellitePhysicsBodies.get(collision.id0);
        const sat2 = this.satellitePhysicsBodies.get(collision.id1);
        
        if (sat1 && sat2) {
            console.log(`Collision: ${sat1.data.name || collision.id0} vs ${sat2.data.name || collision.id1}`);
            console.log(`Impact velocity: ${collision.relativeVelocity.toFixed(2)} km/s`);
            
            // Emit event for Red Orbit to handle debris generation
            if (this.onCollision) {
                this.onCollision({
                    satellite1: sat1,
                    satellite2: sat2,
                    relativeVelocity: collision.relativeVelocity,
                    position: collision.position
                });
            }
        }
    }

    /**
     * Set simulation time multiplier
     */
    setTimeMultiplier(multiplier) {
        this.orbitalPhysics.setTimeMultiplier(multiplier);
    }

    /**
     * Add physics to all existing satellites in the scene
     */
    async addPhysicsToAllSatellites(satelliteMeshes, telemetryData) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        let addedCount = 0;
        
        Object.entries(satelliteMeshes).forEach(([satId, mesh]) => {
            const satData = telemetryData[satId];
            if (satData) {
                this.addPhysicsToSatellite(mesh, satData);
                addedCount++;
            }
        });
        
        console.log(`Added physics to ${addedCount} satellites`);
    }

    /**
     * Remove physics from a satellite
     */
    removePhysicsFromSatellite(satId) {
        if (this.satellitePhysicsBodies.has(satId)) {
            this.orbitalPhysics.removeBody(satId);
            this.satellitePhysicsBodies.delete(satId);
        }
    }

    /**
     * Get physics statistics
     */
    getStats() {
        return {
            initialized: this.initialized,
            satelliteCount: this.satellitePhysicsBodies.size,
            timeMultiplier: this.orbitalPhysics.timeMultiplier
        };
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.orbitalPhysics) {
            this.orbitalPhysics.dispose();
        }
        this.satellitePhysicsBodies.clear();
        this.initialized = false;
    }
}