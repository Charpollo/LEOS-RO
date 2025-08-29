/**
 * ALOHA Trajectory Translator
 * Converts ASAT trajectory data from TEME coordinates to Babylon.js simulation
 * 
 * CUTTING EDGE: Uses modern ES6+ features, WebAssembly-ready architecture
 * MODULAR: Completely standalone, can be used by any system
 * PERFORMANCE: Pre-calculates all transformations for 240Hz physics
 */

import * as BABYLON from '@babylonjs/core';

export class ALOHATranslator {
    constructor() {
        // Earth constants
        this.EARTH_RADIUS_KM = 6371;
        this.EARTH_ROTATION_RATE = 7.2921159e-5; // rad/s
        this.BABYLON_SCALE = 1 / this.EARTH_RADIUS_KM; // Earth = 1 Babylon unit
        
        // Trajectory data
        this.trajectory = null;
        this.epoch = null;
        this.duration = 0;
        
        // Pre-computed positions for performance
        this.babylonPositions = [];
        this.velocities = [];
        this.accelerations = [];
        
        // State
        this.isLoaded = false;
    }
    
    /**
     * Load and process ALOHA trajectory data
     * @param {Object} alohaData - Raw ALOHA JSON data
     * @returns {Promise<void>}
     */
    async loadTrajectory(alohaData) {
        console.log('🚀 ALOHA: Loading trajectory data...');
        
        try {
            // Validate data structure
            this.validateALOHAData(alohaData);
            
            // Store raw data
            this.trajectory = alohaData.trajectory;
            this.epoch = new Date(alohaData.epoch);
            this.duration = this.trajectory[this.trajectory.length - 1][0];
            
            // Pre-process all positions for performance
            await this.preprocessTrajectory();
            
            // Calculate derived data
            this.calculateVelocities();
            this.calculateAccelerations();
            
            this.isLoaded = true;
            console.log(`✅ ALOHA: Loaded ${this.trajectory.length} points, ${this.duration}s duration`);
            
            // Return trajectory metadata
            return {
                points: this.trajectory.length,
                duration: this.duration,
                launchAltitude: this.getLaunchAltitude(),
                terminalAltitude: this.getTerminalAltitude(),
                maxVelocity: Math.max(...this.velocities.map(v => v.length()))
            };
            
        } catch (error) {
            console.error('❌ ALOHA: Failed to load trajectory:', error);
            throw error;
        }
    }
    
    /**
     * Validate ALOHA data structure
     */
    validateALOHAData(data) {
        if (!data.trajectory || !Array.isArray(data.trajectory)) {
            throw new Error('Invalid ALOHA data: missing trajectory array');
        }
        
        if (!data.epoch) {
            throw new Error('Invalid ALOHA data: missing epoch timestamp');
        }
        
        if (!data.frame || data.frame !== 'TEME') {
            console.warn('⚠️ ALOHA: Expected TEME frame, got:', data.frame);
        }
        
        // Validate trajectory points
        const firstPoint = data.trajectory[0];
        if (!firstPoint || firstPoint.length !== 4) {
            throw new Error('Invalid trajectory point format');
        }
    }
    
    /**
     * Pre-process all trajectory points to Babylon coordinates
     * This runs once on load for maximum runtime performance
     */
    async preprocessTrajectory() {
        this.babylonPositions = [];
        
        for (const point of this.trajectory) {
            const [time, x, y, z] = point;
            
            // Convert TEME to Babylon coordinates
            const babylonPos = this.temeTobabylon(
                { x, y, z },
                time
            );
            
            this.babylonPositions.push({
                time,
                position: babylonPos,
                altitude: this.calculateAltitude({ x, y, z })
            });
        }
    }
    
    /**
     * Convert TEME coordinates to Babylon.js world coordinates
     * @param {Object} temeCoords - {x, y, z} in kilometers
     * @param {Number} elapsedTime - Seconds since epoch
     * @returns {BABYLON.Vector3}
     */
    temeTobabylon(temeCoords, elapsedTime) {
        // Scale to Babylon units (Earth = 1 unit radius)
        let position = new BABYLON.Vector3(
            temeCoords.x * this.BABYLON_SCALE,
            temeCoords.z * this.BABYLON_SCALE, // Z becomes Y in Babylon
            -temeCoords.y * this.BABYLON_SCALE // Y becomes -Z in Babylon
        );
        
        // Account for Earth's rotation since epoch
        const earthRotation = this.EARTH_ROTATION_RATE * elapsedTime;
        
        // Rotate around Y axis (Earth's rotation axis in Babylon)
        const cosRot = Math.cos(earthRotation);
        const sinRot = Math.sin(earthRotation);
        
        const rotatedX = position.x * cosRot - position.z * sinRot;
        const rotatedZ = position.x * sinRot + position.z * cosRot;
        
        position.x = rotatedX;
        position.z = rotatedZ;
        
        return position;
    }
    
    /**
     * Calculate altitude from TEME coordinates
     * @param {Object} temeCoords - {x, y, z} in kilometers
     * @returns {Number} Altitude in kilometers
     */
    calculateAltitude(temeCoords) {
        const radius = Math.sqrt(
            temeCoords.x * temeCoords.x +
            temeCoords.y * temeCoords.y +
            temeCoords.z * temeCoords.z
        );
        return radius - this.EARTH_RADIUS_KM;
    }
    
    /**
     * Calculate velocities between trajectory points
     */
    calculateVelocities() {
        this.velocities = [];
        
        for (let i = 0; i < this.babylonPositions.length - 1; i++) {
            const p1 = this.babylonPositions[i];
            const p2 = this.babylonPositions[i + 1];
            const dt = p2.time - p1.time;
            
            if (dt === 0) {
                this.velocities.push(BABYLON.Vector3.Zero());
                continue;
            }
            
            const velocity = p2.position.subtract(p1.position).scale(1 / dt);
            this.velocities.push(velocity);
        }
        
        // Last point has same velocity as previous
        if (this.velocities.length > 0) {
            this.velocities.push(this.velocities[this.velocities.length - 1].clone());
        }
    }
    
    /**
     * Calculate accelerations for trajectory analysis
     */
    calculateAccelerations() {
        this.accelerations = [];
        
        for (let i = 0; i < this.velocities.length - 1; i++) {
            const v1 = this.velocities[i];
            const v2 = this.velocities[i + 1];
            const dt = this.babylonPositions[i + 1].time - this.babylonPositions[i].time;
            
            if (dt === 0) {
                this.accelerations.push(BABYLON.Vector3.Zero());
                continue;
            }
            
            const acceleration = v2.subtract(v1).scale(1 / dt);
            this.accelerations.push(acceleration);
        }
        
        // Last point has zero acceleration
        this.accelerations.push(BABYLON.Vector3.Zero());
    }
    
    /**
     * Get interpolated position at any time
     * @param {Number} simulationTime - Current simulation time in seconds
     * @returns {Object} Position, velocity, altitude at given time
     */
    getStateAtTime(simulationTime) {
        if (!this.isLoaded) {
            throw new Error('ALOHA trajectory not loaded');
        }
        
        // Handle out of bounds
        if (simulationTime <= 0) {
            return this.getStateAtIndex(0);
        }
        
        if (simulationTime >= this.duration) {
            return this.getStateAtIndex(this.babylonPositions.length - 1);
        }
        
        // Find surrounding points for interpolation
        let lowIndex = 0;
        let highIndex = this.babylonPositions.length - 1;
        
        // Binary search for efficiency
        while (highIndex - lowIndex > 1) {
            const midIndex = Math.floor((lowIndex + highIndex) / 2);
            const midTime = this.babylonPositions[midIndex].time;
            
            if (simulationTime < midTime) {
                highIndex = midIndex;
            } else {
                lowIndex = midIndex;
            }
        }
        
        // Interpolate between points
        const p1 = this.babylonPositions[lowIndex];
        const p2 = this.babylonPositions[highIndex];
        
        const dt = p2.time - p1.time;
        const t = (simulationTime - p1.time) / dt;
        
        // Smooth interpolation using cubic Hermite spline
        const position = BABYLON.Vector3.Hermite(
            p1.position,
            this.velocities[lowIndex].scale(dt),
            p2.position,
            this.velocities[highIndex].scale(dt),
            t
        );
        
        const velocity = BABYLON.Vector3.Lerp(
            this.velocities[lowIndex],
            this.velocities[highIndex],
            t
        );
        
        const altitude = p1.altitude + (p2.altitude - p1.altitude) * t;
        
        return {
            position,
            velocity,
            altitude,
            time: simulationTime,
            progress: simulationTime / this.duration
        };
    }
    
    /**
     * Get state at specific trajectory index
     */
    getStateAtIndex(index) {
        return {
            position: this.babylonPositions[index].position.clone(),
            velocity: this.velocities[index].clone(),
            altitude: this.babylonPositions[index].altitude,
            time: this.babylonPositions[index].time,
            progress: this.babylonPositions[index].time / this.duration
        };
    }
    
    /**
     * Get launch altitude
     */
    getLaunchAltitude() {
        return this.babylonPositions[0]?.altitude || 0;
    }
    
    /**
     * Get terminal altitude
     */
    getTerminalAltitude() {
        const lastIndex = this.babylonPositions.length - 1;
        return this.babylonPositions[lastIndex]?.altitude || 0;
    }
    
    /**
     * Get launch location in lat/lon
     */
    getLaunchLocation() {
        if (!this.trajectory || this.trajectory.length === 0) {
            return null;
        }
        
        const [time, x, y, z] = this.trajectory[0];
        const radius = Math.sqrt(x * x + y * y + z * z);
        
        const lat = Math.asin(z / radius) * (180 / Math.PI);
        const lon = Math.atan2(y, x) * (180 / Math.PI);
        
        return {
            latitude: lat,
            longitude: lon,
            altitude: radius - this.EARTH_RADIUS_KM
        };
    }
    
    /**
     * Export processed data for analysis
     */
    exportProcessedData() {
        return {
            epoch: this.epoch,
            duration: this.duration,
            points: this.babylonPositions.length,
            launchLocation: this.getLaunchLocation(),
            maxAltitude: Math.max(...this.babylonPositions.map(p => p.altitude)),
            maxVelocity: Math.max(...this.velocities.map(v => v.length())),
            positions: this.babylonPositions,
            velocities: this.velocities,
            accelerations: this.accelerations
        };
    }
}

// Export for module use
export default ALOHATranslator;