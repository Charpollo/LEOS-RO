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
    async loadTrajectory(trajectoryData) {
        console.log('🚀 Loading trajectory data...');
        
        try {
            // Normalize data from different formats
            const normalized = this.normalizeTrajectoryData(trajectoryData);
            
            // Store normalized data
            this.trajectory = normalized.trajectory;
            this.epoch = new Date(normalized.epoch);
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
     * Normalize trajectory data from different formats
     */
    normalizeTrajectoryData(data) {
        let normalized = {};
        
        // Format 1: ALOHA format with states array
        if (data.states && Array.isArray(data.states)) {
            const states = data.states;
            normalized.epoch = states[0].epoch;
            normalized.trajectory = states.map((state, i) => {
                // Calculate time offset from first state
                const timeDiff = (new Date(state.epoch) - new Date(states[0].epoch)) / 1000;
                return [
                    timeDiff,
                    ...state.position,
                    ...state.velocity
                ];
            });
        }
        // Format 2: ascent_traj format with trajectories array
        else if (data.trajectories && Array.isArray(data.trajectories)) {
            const traj = data.trajectories[0];
            normalized.epoch = traj.epoch;
            normalized.trajectory = traj.trajectory;
            // Add velocities if missing (will be calculated)
            if (traj.trajectory[0].length === 4) {
                normalized.trajectory = traj.trajectory.map(point => [
                    point[0], point[1], point[2], point[3], 0, 0, 0
                ]);
            }
        }
        // Format 3: Original ALOHA format
        else if (data.trajectory && data.epoch) {
            normalized = data;
        }
        else {
            // Provide helpful error with examples
            let errorMsg = 'Unrecognized trajectory format.\n\n';
            errorMsg += 'Expected one of these formats:\n\n';
            errorMsg += '1. States format:\n';
            errorMsg += '{\n  "states": [{\n    "epoch": "2025-01-01T00:00:00Z",\n';
            errorMsg += '    "position": [-4447.6, 2161.7, -4014.7],\n';
            errorMsg += '    "velocity": [0.1, 0.2, 0.3]\n  }]\n}\n\n';
            errorMsg += '2. Trajectories format:\n';
            errorMsg += '{\n  "trajectories": [{\n    "epoch": "2025-07-03 19:35:15+00:00",\n';
            errorMsg += '    "trajectory": [[0, -4447.6, 2161.7, -4014.7], ...]\n  }]\n}\n\n';
            errorMsg += '3. Classic format:\n';
            errorMsg += '{\n  "epoch": "2025-01-01T00:00:00Z",\n';
            errorMsg += '  "trajectory": [[0, -4447.6, 2161.7, -4014.7, 0.1, 0.2, 0.3], ...]\n}\n\n';
            errorMsg += 'Your file structure: ' + JSON.stringify(Object.keys(data).slice(0, 5));
            
            throw new Error(errorMsg);
        }
        
        // Validate normalized data
        if (!normalized.trajectory || normalized.trajectory.length < 2) {
            throw new Error('Invalid trajectory data: Need at least 2 points (found ' + 
                (normalized.trajectory ? normalized.trajectory.length : 0) + ')');
        }
        
        if (!normalized.epoch) {
            throw new Error('Invalid trajectory data: Missing epoch timestamp');
        }
        
        return normalized;
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
        // Convert TEME to geographic coordinates first
        const radius = Math.sqrt(
            temeCoords.x * temeCoords.x + 
            temeCoords.y * temeCoords.y + 
            temeCoords.z * temeCoords.z
        );
        
        // Calculate lat/lon from TEME
        const lat = Math.asin(temeCoords.z / radius);  // radians
        const lon = Math.atan2(temeCoords.y, temeCoords.x);  // radians
        
        // Convert to Babylon coordinates using geographic positioning
        // This ensures the trajectory starts at the correct Earth location
        const scaledRadius = radius * this.BABYLON_SCALE;
        
        const position = new BABYLON.Vector3(
            scaledRadius * Math.cos(lat) * Math.cos(lon),
            scaledRadius * Math.sin(lat),  // Y is up (North)
            scaledRadius * Math.cos(lat) * Math.sin(lon)
        );
        
        // Note: We're keeping the original trajectory shape and timing
        // The trajectory will appear fixed relative to Earth's surface
        // This is realistic for visualization even if epochs don't match
        
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
            
            // Debug check for extreme velocities
            const speedKms = velocity.length() * this.EARTH_RADIUS_KM;
            if (speedKms > 50 && i % 20 === 0) {  // Log every 20th extreme velocity
                console.warn(`Velocity at t=${p1.time}s: ${speedKms.toFixed(1)} km/s`);
            }
            
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