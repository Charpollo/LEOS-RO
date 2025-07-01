/**
 * LEOS First Orbit - Orbital Mechanics Module
 * Real-time orbital calculations for optimal performance
 */

import * as BABYLON from '@babylonjs/core';
import { EARTH_SCALE, EARTH_VISUAL_SURFACE_RADIUS, EARTH_CORE_RADIUS, EARTH_RADIUS_KM, EARTH_MU } from './constants.js';

// Earth constants
const EARTH_ROTATION_RATE = 7.2921159e-5; // rad/s

/**
 * Calculate satellite position using orbital elements at a given time
 * @param {Object} elements - Orbital elements from TLE
 * @param {Date} currentTime - Current simulation time
 * @param {Date} epochTime - Epoch time from TLE
 * @returns {Object} Position and velocity vectors
 */
export function calculateSatellitePosition(elements, currentTime, epochTime) {
    try {
        // Time since epoch in minutes
        const timeSinceEpoch = (currentTime - epochTime) / (1000 * 60);
        // Calculate mean motion from semi-major axis (rad/min)
        const a = elements.semi_major_axis_km;
        const meanMotion = Math.sqrt(EARTH_MU / (a * a * a)) * 60; // rad/min
        // Calculate mean anomaly at current time
        const meanAnomaly = (elements.mean_anomaly_deg * Math.PI / 180) + (meanMotion * timeSinceEpoch);
        
        // Solve Kepler's equation for eccentric anomaly
        const eccentricAnomaly = solveKeplersEquation(meanAnomaly, elements.eccentricity);
        
        // Calculate true anomaly
        const trueAnomaly = 2 * Math.atan(
            Math.sqrt((1 + elements.eccentricity) / (1 - elements.eccentricity)) * 
            Math.tan(eccentricAnomaly / 2)
        );
        
        // Calculate distance from Earth center
        const aRadius = elements.semi_major_axis_km;
        const e = elements.eccentricity;
        const r = aRadius * (1 - e * Math.cos(eccentricAnomaly));
        
        // Position in orbital plane
        const cosTA = Math.cos(trueAnomaly);
        const sinTA = Math.sin(trueAnomaly);
        const xOrbital = r * cosTA;
        const yOrbital = r * sinTA;
        const zOrbital = 0;
        
        // Convert angles to radians
        const iRad = elements.inclination_deg * Math.PI / 180;
        const omegaRad = elements.argument_of_perigee_deg * Math.PI / 180;
        const OmegaRad = elements.raan_deg * Math.PI / 180;
        
        // Rotation matrices
        const cosOmega = Math.cos(omegaRad);
        const sinOmega = Math.sin(omegaRad);
        const cosI = Math.cos(iRad);
        const sinI = Math.sin(iRad);
        const cosCapOmega = Math.cos(OmegaRad);
        const sinCapOmega = Math.sin(OmegaRad);
        
        // Transform to Earth-centered inertial coordinates
        const x = (cosCapOmega * cosOmega - sinCapOmega * sinOmega * cosI) * xOrbital +
                  (-cosCapOmega * sinOmega - sinCapOmega * cosOmega * cosI) * yOrbital;
        
        const y = (sinCapOmega * cosOmega + cosCapOmega * sinOmega * cosI) * xOrbital +
                  (-sinCapOmega * sinOmega + cosCapOmega * cosOmega * cosI) * yOrbital;
        
        const z = (sinI * sinOmega) * xOrbital + (sinI * cosOmega) * yOrbital;
        
        // Calculate velocity (simplified)
        const n = Math.sqrt(EARTH_MU / (a * a * a));
        const velocityMagnitude = n * a / Math.sqrt(1 - e * e);
        
        // Velocity direction (perpendicular to position, simplified)
        const vx = -velocityMagnitude * Math.sin(trueAnomaly + omegaRad) * Math.cos(iRad);
        const vy = velocityMagnitude * Math.cos(trueAnomaly + omegaRad);
        const vz = velocityMagnitude * Math.sin(trueAnomaly + omegaRad) * Math.sin(iRad);
        
        const calculatedAltitude = Math.sqrt(x*x + y*y + z*z) - EARTH_RADIUS_KM;
        
        return {
            position: { x, y, z },
            velocity: { x: vx, y: vy, z: vz },
            altitude: calculatedAltitude,
            trueAnomaly: trueAnomaly * 180 / Math.PI
        };
        
    } catch (error) {
        console.error('Error calculating satellite position:', error);
        
        // More robust fallback position - use a stable orbit that looks reasonable
        const fallbackRadius = 7000; // km
        const fallbackAngle = (Date.now() / 10000) % (2 * Math.PI); // Gradually rotate
        
        return {
            position: { 
                x: fallbackRadius * Math.cos(fallbackAngle), 
                y: fallbackRadius * Math.sin(fallbackAngle), 
                z: 0 
            },
            velocity: { 
                x: -7.5 * Math.sin(fallbackAngle), 
                y: 7.5 * Math.cos(fallbackAngle), 
                z: 0 
            },
            altitude: fallbackRadius - EARTH_RADIUS_KM,
            trueAnomaly: fallbackAngle * 180 / Math.PI
        };
    }
}

/**
 * Solve Kepler's equation using Newton-Raphson method
 * @param {number} M - Mean anomaly (radians)
 * @param {number} e - Eccentricity
 * @returns {number} Eccentric anomaly (radians)
 */
function solveKeplersEquation(M, e) {
    let E = M; // Initial guess
    const tolerance = 1e-6;
    const maxIterations = 10;
    
    for (let i = 0; i < maxIterations; i++) {
        const f = E - e * Math.sin(E) - M;
        const fp = 1 - e * Math.cos(E);
        const deltaE = f / fp;
        
        E -= deltaE;
        
        if (Math.abs(deltaE) < tolerance) {
            break;
        }
    }
    
    return E;
}

/**
 * Generate telemetry data based on orbital position
 * @param {Object} position - Satellite position
 * @param {Object} velocity - Satellite velocity
 * @param {Object} elements - Orbital elements
 * @param {string} satName - Satellite name
 * @returns {Object} Telemetry data
 */
export function generateRealTimeTelemetry(position, velocity, elements, satName) {
    try {
        const altitude = Math.sqrt(position.x*position.x + position.y*position.y + position.z*position.z) - EARTH_RADIUS_KM;
        const speed = Math.sqrt(velocity.x*velocity.x + velocity.y*velocity.y + velocity.z*velocity.z);
        
        // Calculate latitude and longitude
        const lat = Math.asin(position.z / Math.sqrt(position.x*position.x + position.y*position.y + position.z*position.z)) * 180 / Math.PI;
        const lon = Math.atan2(position.y, position.x) * 180 / Math.PI;
        
        // Generate realistic system status
        const baseHealth = 85 + Math.random() * 10;
    
        return {
            name: satName,
            altitude: altitude,
            latitude: lat,
            longitude: lon,
            velocity: speed,
            period: calculateOrbitalPeriod(elements.semi_major_axis_km),
            inclination: elements.inclination_deg,
            position: position,
            velocity: velocity,
            systems: {
                power: {
                    status: baseHealth > 90 ? "NOMINAL" : "DEGRADED",
                    value: Math.round(baseHealth)
                },
                thermal: {
                    status: "NOMINAL", 
                    value: Math.round(88 + Math.random() * 8)
                },
                communications: {
                    status: "NOMINAL",
                    value: Math.round(92 + Math.random() * 6)
                },
                attitude: {
                    status: "NOMINAL",
                    value: Math.round(86 + Math.random() * 10)
                }
            }
        };
    } catch (error) {
        console.error('Error generating telemetry data:', error);
        return {
            name: satName,
            altitude: 500,
            latitude: 0,
            longitude: 0,
            velocity: 7.5,
            period: elements ? calculateOrbitalPeriod(elements.semi_major_axis_km) : 95,
            inclination: elements ? elements.inclination_deg || 51.6 : 51.6,
            position: position || { x: 0, y: 0, z: 0 },
            velocity: velocity || { x: 0, y: 0, z: 0 },
            systems: {
                power: { status: "NOMINAL", value: 95 },
                thermal: { status: "NOMINAL", value: 90 },
                communications: { status: "NOMINAL", value: 92 },
                attitude: { status: "NOMINAL", value: 93 }
            }
        };
    }
}

/**
 * Convert position to Babylon.js coordinate system
 * @param {Object} position - Position in km
 * @param {number} scale - Scaling factor (default: EARTH_SCALE)
 * @returns {BABYLON.Vector3} Babylon.js position
 */
/**
 * Convert position to Babylon.js coordinate system with proper scaling
 * @param {Object} position - Position in km from Earth center
 * @param {number} scale - Scaling factor (default: EARTH_SCALE)
 * @returns {BABYLON.Vector3} Babylon.js position
 */
export function toBabylonPosition(position) {
    const positionVector = new BABYLON.Vector3(position.x, position.z, position.y);
    const distanceFromCenterKm = positionVector.length();

    const altitudeKm = distanceFromCenterKm - EARTH_RADIUS_KM;

    const visualAltitude = altitudeKm * (EARTH_VISUAL_SURFACE_RADIUS / EARTH_RADIUS_KM);

    const newDistance = EARTH_VISUAL_SURFACE_RADIUS + visualAltitude;

    const babylonPosition = positionVector.normalize().scale(newDistance);

    return babylonPosition;
}

/**
 * Calculate orbital period from semi-major axis
 * @param {number} semiMajorAxis - Semi-major axis in km
 * @returns {number} Orbital period in minutes
 */
export function calculateOrbitalPeriod(semiMajorAxis) {
    return 2 * Math.PI * Math.sqrt((semiMajorAxis * semiMajorAxis * semiMajorAxis) / EARTH_MU) / 60;
}

/**
 * Check if satellite is in Earth's shadow (eclipse)
 * @param {Object} position - Satellite position
 * @param {BABYLON.Vector3} sunDirection - Sun direction vector
 * @returns {boolean} True if in eclipse
 */
export function isInEclipse(position, sunDirection) {
    const satVector = new BABYLON.Vector3(position.x, position.y, position.z);
    const earthRadius = EARTH_RADIUS_KM;
    
    // Simplified eclipse calculation
    const distanceFromEarth = satVector.length();
    const dotProduct = BABYLON.Vector3.Dot(satVector.normalize(), sunDirection.normalize());
    
    // If satellite is on the night side and close enough to Earth's shadow
    return dotProduct < -0.1 && distanceFromEarth < earthRadius * 3;
}
