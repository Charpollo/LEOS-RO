// Optimized satellite position update function that uses real-time orbital calculations
// instead of pre-calculated backend data for much better performance

import * as BABYLON from '@babylonjs/core';
import { calculateSatellitePosition, generateRealTimeTelemetry, toBabylonPosition } from './orbital-mechanics.js';

/**
 * Update a satellite's position using real-time orbital mechanics
 * @param {string} satName - Satellite name
 * @param {Object} satelliteMeshes - Dictionary of satellite meshes
 * @param {Object} orbitalElements - Dictionary of orbital elements
 * @param {Date} simulationTime - Current simulation time
 * @param {Object} telemetryData - Dictionary to store telemetry data
 * @param {number} EARTH_SCALE - Earth scale factor
 * @param {number} EARTH_RADIUS - Earth radius in km
 * @param {Object} advancedTexture - Babylon GUI texture for labels
 */
export function updateSatellitePosition(
    satName, satelliteMeshes, orbitalElements, simulationTime, telemetryData, 
    EARTH_SCALE, EARTH_RADIUS, advancedTexture
) {
    if (!satelliteMeshes[satName] || !orbitalElements[satName]) return;
    
    try {
        // Get orbital elements for this satellite
        const elements = orbitalElements[satName].elements;
        const epochTime = new Date(orbitalElements[satName].tle.epoch);
        
        // Calculate satellite position using orbital mechanics
        const result = calculateSatellitePosition(elements, simulationTime, epochTime);
        
        // Generate telemetry data
        telemetryData[satName] = generateRealTimeTelemetry(
            result.position, 
            result.velocity, 
            elements, 
            satName
        );
        
        // Convert position to Babylon coordinates
        const babylonPos = toBabylonPosition(result.position, EARTH_SCALE);
        
        // Calculate minimum allowable altitude
        const minAltitude = EARTH_RADIUS * EARTH_SCALE * 1.1; // 10% above Earth radius
        
        // Ensure satellites aren't positioned inside or too close to the Earth
        const positionLength = babylonPos.length();
        if (positionLength < minAltitude) {
            const directionFromCenter = babylonPos.normalizeToNew();
            babylonPos.copyFrom(directionFromCenter.scale(minAltitude));
            console.log(`Adjusted position for ${satName}: too close to Earth`);
        }
        
        // Apply the calculated position to the satellite mesh
        satelliteMeshes[satName].position = babylonPos;
        
        // Update satellite orientation based on velocity vector
        const babylonVel = new BABYLON.Vector3(
            result.velocity.x * EARTH_SCALE,
            result.velocity.z * EARTH_SCALE,
            result.velocity.y * EARTH_SCALE
        );
        
        if (babylonVel.length() > 0) {
            // Normalize velocity vector to create direction vector
            babylonVel.normalize();
            
            // Calculate the direction from Earth's center to the satellite (up vector)
            const upVector = babylonPos.normalize();
            
            // Use velocity as forward direction
            const forwardVector = babylonVel;
            
            // Calculate right vector using cross product
            const rightVector = BABYLON.Vector3.Cross(forwardVector, upVector);
            rightVector.normalize();
            
            // Recalculate forward vector to ensure orthogonal basis
            const correctedForwardVector = BABYLON.Vector3.Cross(upVector, rightVector);
            correctedForwardVector.normalize();
            
            // Create rotation matrix from vectors
            const rotationMatrix = BABYLON.Matrix.FromXYZAxesToRef(
                rightVector,
                upVector,
                correctedForwardVector,
                new BABYLON.Matrix()
            );
            
            // Convert to quaternion and apply to satellite
            const quaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
            satelliteMeshes[satName].rotationQuaternion = quaternion;
        }
        
        // Update label position if needed
        const labelControl = advancedTexture.getControlByName(`${satName}_label`);
        if (labelControl) {
            // Adjust label position to be above the satellite
            labelControl.linkOffsetY = -70;
        }
        
        return babylonPos;
    } catch (error) {
        console.error(`Error updating satellite position for ${satName}:`, error);
        return null;
    }
}
