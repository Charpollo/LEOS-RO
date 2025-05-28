import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE, MIN_LEO_ALTITUDE_KM } from './constants.js';
import { generateRealTimeTelemetry } from './telemetry.js';
import { calculateSatellitePosition, toBabylonPosition } from './orbital-mechanics.js';
import { TextBlock, Rectangle } from '@babylonjs/gui';

let satelliteMeshes = {};
let telemetryData = {};

export function getSatelliteMeshes() {
    return satelliteMeshes;
}

export function getTelemetryData() {
    return telemetryData;
}

export async function createSatellites(scene, satelliteData, orbitalElements, activeSatellite, advancedTexture, simulationTime) {
    // Clear existing satellites
    for (const satName in satelliteMeshes) {
        if (satelliteMeshes[satName]) {
            satelliteMeshes[satName].dispose();
        }
    }
    satelliteMeshes = {};
    
    // Create new satellites
    for (const satName in satelliteData) {
        if (satName === 'metadata') continue;
        
        const modelFile = satName.toUpperCase().includes('CRTS') 
            ? 'assets/crts_satellite.glb' 
            : 'assets/bulldog_sat.glb';
        
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelFile, scene);
            const satelliteMesh = result.meshes[0];
            satelliteMesh.name = `${satName}_mesh`;
            satelliteMesh.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            satelliteMeshes[satName] = satelliteMesh;
            
            addSatelliteLabel(satName, satelliteMesh, advancedTexture, activeSatellite);
            
            satelliteMesh.isPickable = true;
            satelliteMesh.actionManager = new BABYLON.ActionManager(scene);
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOverTrigger,
                    () => {
                        document.getElementById('renderCanvas').style.cursor = 'pointer';
                        satelliteMesh.getChildMeshes().forEach(child => {
                            if (child.material) {
                                child.material.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.8);
                            }
                        });
                    }
                )
            );
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOutTrigger,
                    () => {
                        document.getElementById('renderCanvas').style.cursor = 'default';
                        satelliteMesh.getChildMeshes().forEach(child => {
                            if (child.material) {
                                child.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                            }
                        });
                    }
                )
            );
            
            // Set active satellite when clicked
            const setActiveSatellite = () => {
                window.dispatchEvent(new CustomEvent('satelliteSelected', { detail: { name: satName } }));
            };
            
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPickTrigger,
                    setActiveSatellite
                )
            );
            
            updateSatellitePosition(satName, 0, orbitalElements, simulationTime, scene, advancedTexture);
        } catch (error) {
            console.error(`Error loading satellite model for ${satName}:`, error);
        }
    }
    
    return { satelliteMeshes, telemetryData };
}

function addSatelliteLabel(satName, mesh, advancedTexture, activeSatellite) {
    const label = new TextBlock();
    label.text = satName;
    label.color = "white";
    label.fontSize = 14;
    label.fontWeight = "bold";
    label.resizeToFit = true;
    label.outlineWidth = 3;
    label.outlineColor = "black";
    
    const rect = new Rectangle();
    rect.name = `${satName}_label`; // Add name for selection later
    rect.width = "120px";
    rect.height = "40px";
    rect.cornerRadius = 8;
    rect.background = "rgba(0, 0, 0, 0.7)";
    rect.thickness = 1;
    rect.alpha = 0.8;
    rect.addControl(label);
    
    // Make labels interactive
    rect.isPointerBlocker = true;
    rect.onPointerEnterObservable.add(() => {
        rect.background = "rgba(0, 100, 200, 0.7)";
        rect.alpha = 1.0;
    });
    rect.onPointerOutObservable.add(() => {
        rect.background = "rgba(0, 0, 0, 0.7)";
        rect.alpha = 0.8;
    });
    rect.onPointerUpObservable.add(() => {
        window.dispatchEvent(new CustomEvent('satelliteSelected', { detail: { name: satName } }));
    });
    
    advancedTexture.addControl(rect);
    rect.linkWithMesh(mesh);
    rect.linkOffsetY = -70; // Position label higher above satellite
    rect.isVisible = true;
}

export function updateSatellitePosition(satName, timeIndex, orbitalElements, simulationTime, scene, advancedTexture) {
    if (!satelliteMeshes[satName] || !orbitalElements[satName]) return null;
    
    try {
        // Get orbital elements for this satellite
        const elements = orbitalElements[satName].elements;
        const epochTime = new Date(orbitalElements[satName].tle.epoch);
        
        // Calculate satellite position using orbital mechanics
        const result = calculateSatellitePosition(elements, simulationTime, epochTime);
        
        // Generate enhanced telemetry data
        telemetryData[satName] = generateRealTimeTelemetry(
            result.position, 
            result.velocity, 
            elements, 
            satName
        );
        
        // Convert position to Babylon coordinates
        const babylonPos = toBabylonPosition(result.position, EARTH_SCALE);
        
        // More aggressive altitude enforcement to prevent satellites from appearing inside Earth
        const earthRadius = EARTH_RADIUS * EARTH_SCALE;
        const minRadius = earthRadius + (MIN_LEO_ALTITUDE_KM * EARTH_SCALE);
        const positionLength = babylonPos.length();
        
        if (positionLength < minRadius) {
            // Force satellite to minimum safe LEO altitude
            const directionFromCenter = babylonPos.normalizeToNew();
            const safeFactor = 1.2; // Add 20% safety buffer
            babylonPos.copyFrom(directionFromCenter.scale(minRadius * safeFactor));
            
            // Log altitude correction 
            console.log(`Satellite ${satName} altitude corrected to ${MIN_LEO_ALTITUDE_KM * safeFactor}km`);
        }
        
        // Add extra buffer zone around Earth's atmosphere for satellites
        const atmosphereRadius = earthRadius * 1.12; // Add even more margin
        if (positionLength < atmosphereRadius) {
            const directionFromCenter = babylonPos.normalizeToNew();
            babylonPos.copyFrom(directionFromCenter.scale(atmosphereRadius * 1.15));
        }
    
        // Apply the calculated position to the satellite mesh
        satelliteMeshes[satName].position = babylonPos;
        
        // Enhanced satellite orientation based on velocity vector
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
        
        // Update label position to stay above satellite
        if (advancedTexture) {
            const labelControl = advancedTexture.getControlByName(`${satName}_label`);
            if (labelControl) {
                labelControl.linkOffsetY = -70;
            }
        }
        
        // Enhanced eclipse calculation using realistic sun direction
        try {
            const sunDirection = scene.sunLight.direction.negate();
            const satelliteToSun = sunDirection.clone();
            const satelliteToEarth = babylonPos.normalizeToNew().negate();
            
            // Calculate if satellite is in Earth's shadow
            const earthAngularRadius = Math.atan2(earthRadius, positionLength);
            const sunAngle = Math.acos(BABYLON.Vector3.Dot(satelliteToSun, satelliteToEarth));
            
            const inEclipse = sunAngle < earthAngularRadius;
            
            // Apply eclipse effects
            if (inEclipse) {
                satelliteMeshes[satName].visibility = 0.3;
                if (labelControl) {
                    labelControl.alpha = 0.3;
                }
            } else {
                satelliteMeshes[satName].visibility = 1.0;
                if (labelControl) {
                    labelControl.alpha = 0.8;
                }
            }
        } catch(e) {
            // Fallback - keep satellite visible if eclipse calculation fails
            satelliteMeshes[satName].visibility = 1.0;
        }
        
        return babylonPos;
    } catch (error) {
        console.error(`Error updating satellite position for ${satName}:`, error);
        return null;
    }
}
