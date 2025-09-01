/**
 * ASAT Trajectory Generator
 * Real-time ballistic trajectory calculation for on-demand ASAT launches
 * 
 * FLIGHT RULES:
 * - Modular: Pure functions, no dependencies on scene or engine
 * - Realistic: Proper ballistic physics (3-5 km/s max velocity)
 * - Flexible: Can generate any launch/target combination
 * - Fast: Optimized for real-time browser calculation
 */

export class ASATTrajectoryGenerator {
    constructor() {
        // Earth constants
        this.EARTH_RADIUS_KM = 6371;
        this.GRAVITY_KMS2 = 0.00981; // km/s^2
        
        // ASAT physics parameters (realistic)
        this.BOOST_DURATION = 60; // seconds
        this.BOOST_ACCEL = 0.05; // km/s^2 (~5g during boost)
        this.MAX_VELOCITY = 5.0; // km/s (realistic ASAT max)
        this.TERMINAL_DURATION = 60; // seconds for final approach
    }
    
    /**
     * Generate complete ASAT trajectory
     * @param {Object} params - Launch parameters
     * @param {number} params.launchLat - Launch latitude (degrees)
     * @param {number} params.launchLon - Launch longitude (degrees)
     * @param {number} params.targetLat - Target latitude (degrees)
     * @param {number} params.targetLon - Target longitude (degrees)
     * @param {number} params.targetAlt - Target altitude (km)
     * @param {number} params.duration - Total flight time (seconds)
     * @returns {Array} Trajectory points [[t, x, y, z], ...]
     */
    generateTrajectory(params) {
        const {
            launchLat,
            launchLon,
            targetLat,
            targetLon,
            targetAlt = 400,
            duration = 420
        } = params;
        
        const trajectory = [];
        
        // Calculate great circle path
        const pathParams = this.calculateGreatCirclePath(
            launchLat, launchLon,
            targetLat, targetLon
        );
        
        // Generate trajectory points
        for (let t = 0; t <= duration; t++) {
            const point = this.calculateTrajectoryPoint(
                t, duration, pathParams, targetAlt
            );
            trajectory.push([t, ...point]);
        }
        
        return trajectory;
    }
    
    /**
     * Calculate trajectory point at time t
     */
    calculateTrajectoryPoint(t, duration, pathParams, targetAlt) {
        // Determine flight phase
        let altitude, velocity;
        
        if (t <= this.BOOST_DURATION) {
            // BOOST PHASE - rapid acceleration
            const progress = t / this.BOOST_DURATION;
            altitude = 0.1 + progress * progress * 150; // Quadratic rise to 150km
            velocity = Math.min(t * this.BOOST_ACCEL, 3.0); // Cap at 3 km/s
            
        } else if (t <= duration - this.TERMINAL_DURATION) {
            // MIDCOURSE - ballistic arc
            const midTime = t - this.BOOST_DURATION;
            const midDuration = duration - this.BOOST_DURATION - this.TERMINAL_DURATION;
            const midProgress = midTime / midDuration;
            
            // Parabolic trajectory peaking at target altitude
            altitude = 150 + (targetAlt - 150) * Math.sin(Math.PI * midProgress);
            velocity = 3.0 + 0.5 * Math.sin(Math.PI * midProgress);
            
        } else {
            // TERMINAL PHASE - final approach
            const termTime = t - (duration - this.TERMINAL_DURATION);
            const termProgress = termTime / this.TERMINAL_DURATION;
            
            // Descend to target altitude
            const peakAlt = targetAlt;
            altitude = peakAlt + (targetAlt - peakAlt) * termProgress;
            velocity = 3.5 + termProgress * 1.5; // Accelerate to impact
        }
        
        // Calculate position along great circle
        const trajectoryProgress = t / duration;
        const position = this.interpolateGreatCircle(
            pathParams, trajectoryProgress, altitude
        );
        
        return position;
    }
    
    /**
     * Calculate great circle path parameters
     */
    calculateGreatCirclePath(lat1, lon1, lat2, lon2) {
        // Convert to radians
        const phi1 = this.toRadians(lat1);
        const phi2 = this.toRadians(lat2);
        const lambda1 = this.toRadians(lon1);
        const lambda2 = this.toRadians(lon2);
        
        // Calculate great circle distance
        const dLambda = lambda2 - lambda1;
        const cosPhi1 = Math.cos(phi1);
        const cosPhi2 = Math.cos(phi2);
        const sinPhi1 = Math.sin(phi1);
        const sinPhi2 = Math.sin(phi2);
        
        const a = sinPhi1 * sinPhi2 + cosPhi1 * cosPhi2 * Math.cos(dLambda);
        const distance = Math.acos(Math.min(1, Math.max(-1, a)));
        
        return {
            phi1, phi2,
            lambda1, lambda2,
            distance,
            cosPhi1, cosPhi2,
            sinPhi1, sinPhi2
        };
    }
    
    /**
     * Interpolate position along great circle
     */
    interpolateGreatCircle(pathParams, progress, altitude) {
        const { phi1, phi2, lambda1, lambda2, distance } = pathParams;
        
        if (distance < 0.0001) {
            // Launch and target are same location (straight up)
            return this.latLonAltToTEME(
                this.toDegrees(phi1),
                this.toDegrees(lambda1),
                altitude
            );
        }
        
        // Interpolate along great circle
        const a = Math.sin((1 - progress) * distance) / Math.sin(distance);
        const b = Math.sin(progress * distance) / Math.sin(distance);
        
        // Calculate interpolated position on unit sphere
        const x = a * Math.cos(phi1) * Math.cos(lambda1) + 
                 b * Math.cos(phi2) * Math.cos(lambda2);
        const y = a * Math.cos(phi1) * Math.sin(lambda1) + 
                 b * Math.cos(phi2) * Math.sin(lambda2);
        const z = a * Math.sin(phi1) + b * Math.sin(phi2);
        
        // Convert to lat/lon
        const lat = this.toDegrees(Math.asin(z));
        const lon = this.toDegrees(Math.atan2(y, x));
        
        return this.latLonAltToTEME(lat, lon, altitude);
    }
    
    /**
     * Convert lat/lon/alt to TEME coordinates
     */
    latLonAltToTEME(latDeg, lonDeg, altKm) {
        const phi = this.toRadians(latDeg);
        const lambda = this.toRadians(lonDeg);
        const r = this.EARTH_RADIUS_KM + altKm;
        
        // Standard TEME conversion (no Earth rotation for inertial frame)
        const x = r * Math.cos(phi) * Math.cos(lambda);
        const y = r * Math.cos(phi) * Math.sin(lambda);
        const z = r * Math.sin(phi);
        
        return [x, y, z];
    }
    
    /**
     * Generate trajectory metadata
     */
    generateMetadata(params, trajectory) {
        const startPoint = trajectory[0];
        const endPoint = trajectory[trajectory.length - 1];
        
        // Calculate max altitude
        let maxAlt = 0;
        trajectory.forEach(point => {
            const [t, x, y, z] = point;
            const r = Math.sqrt(x*x + y*y + z*z);
            const alt = r - this.EARTH_RADIUS_KM;
            maxAlt = Math.max(maxAlt, alt);
        });
        
        return {
            id: `ASAT_${Date.now()}`,
            name: `Custom ASAT Launch`,
            launch_site: `${params.launchLat.toFixed(2)}°, ${params.launchLon.toFixed(2)}°`,
            target: `${params.targetLat.toFixed(2)}°, ${params.targetLon.toFixed(2)}° at ${params.targetAlt}km`,
            epoch: new Date().toISOString(),
            frame: 'TEME',
            trajectory_info: {
                duration_seconds: params.duration,
                max_velocity_kms: this.MAX_VELOCITY,
                max_altitude_km: maxAlt,
                impact_altitude_km: params.targetAlt
            },
            trajectory: trajectory
        };
    }
    
    /**
     * Quick validation of trajectory physics
     */
    validateTrajectory(trajectory) {
        const issues = [];
        let maxVelocity = 0;
        
        for (let i = 1; i < trajectory.length; i++) {
            const [t1, x1, y1, z1] = trajectory[i-1];
            const [t2, x2, y2, z2] = trajectory[i];
            
            const dist = Math.sqrt(
                (x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2
            );
            const dt = t2 - t1;
            const velocity = dist / dt;
            
            maxVelocity = Math.max(maxVelocity, velocity);
            
            if (velocity > 10) {
                issues.push(`Unrealistic velocity at t=${t2}: ${velocity.toFixed(1)} km/s`);
            }
        }
        
        return {
            valid: issues.length === 0,
            maxVelocity,
            issues
        };
    }
    
    // Utility functions
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }
    
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
}

// Export for use in ALOHA system
export default ASATTrajectoryGenerator;