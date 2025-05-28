import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE, MIN_LEO_ALTITUDE_KM } from './constants.js';
import { generateRealTimeTelemetry } from './telemetry.js';
import { calculateSatellitePosition, toBabylonPosition } from './orbital-mechanics.js';
import { TextBlock, Rectangle, Control, Button } from '@babylonjs/gui';

let satelliteMeshes = {};
let telemetryData = {};
let telemetryPanel = null;
let telemetryPanelUpdateInterval = null;

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
            // Set mesh scaling based on new Earth scale
            // Increase satellite size for better visibility
            const SATELLITE_VISUAL_SCALE = 0.005; // Increase from 0.001 to 0.005 (adjust as needed)
            satelliteMesh.scaling = new BABYLON.Vector3(SATELLITE_VISUAL_SCALE, SATELLITE_VISUAL_SCALE, SATELLITE_VISUAL_SCALE);
            // Set mesh color by satellite type
            const isCRTS = satName.toUpperCase().includes('CRTS');
            const isBulldog = satName.toUpperCase().includes('BULLDOG');
            const meshColor = isCRTS ? new BABYLON.Color3(1, 0.5, 0) : isBulldog ? new BABYLON.Color3(0, 1, 1) : new BABYLON.Color3(0.1, 0.4, 0.8);
            satelliteMesh.getChildMeshes().forEach(child => {
                if (child.material) {
                    child.material.emissiveColor = meshColor;
                }
            });
            satelliteMeshes[satName] = satelliteMesh;
            
            addSatelliteLabel(satName, satelliteMesh, advancedTexture, activeSatellite, meshColor);
            
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

// Update addSatelliteLabel to accept meshColor and set label color accordingly
function addSatelliteLabel(satName, mesh, advancedTexture, activeSatellite, meshColor) {
    const labelBtn = Button.CreateSimpleButton(`${satName}_btn`, satName);
    labelBtn.width = "120px";
    labelBtn.height = "40px";
    labelBtn.cornerRadius = 8;
    labelBtn.background = "rgba(0, 0, 0, 0.7)";
    labelBtn.color = meshColor ? meshColor.toHexString() : "white";
    labelBtn.fontSize = 12; // Reduced font size for aesthetics
    labelBtn.fontWeight = "bold";
    labelBtn.thickness = 1;
    labelBtn.alpha = 0.8;
    labelBtn.zIndex = 2000;
    labelBtn.isPointerBlocker = true;
    labelBtn.onPointerEnterObservable.add(() => {
        labelBtn.background = "rgba(0, 100, 200, 0.7)";
        labelBtn.alpha = 1.0;
    });
    labelBtn.onPointerOutObservable.add(() => {
        labelBtn.background = "rgba(0, 0, 0, 0.7)";
        labelBtn.alpha = 0.8;
    });
    labelBtn.onPointerUpObservable.add(() => {
        console.log('Label button clicked:', satName); // Debug log
        showSatelliteTelemetryPanel(satName, telemetryData, advancedTexture, meshColor);
        window.dispatchEvent(new CustomEvent('satelliteSelected', { detail: { name: satName } }));
    });
    advancedTexture.addControl(labelBtn);
    labelBtn.linkWithMesh(mesh);
    labelBtn.linkOffsetY = -30;
    labelBtn.isVisible = true;
    // --- Label scaling with camera distance ---
    const scene = mesh.getScene();
    scene.onBeforeRenderObservable.add(() => {
        const camera = scene.activeCamera;
        if (!camera) return;
        const dist = BABYLON.Vector3.Distance(camera.position, mesh.position);
        // Scale label: closer = 1, far = 0.3 (tweak as needed)
        let scale = 1.0;
        if (dist > 2) scale = Math.max(0.3, 2.5 / dist); // 2.5 is a visual fudge factor
        labelBtn.scaleX = labelBtn.scaleY = scale;
    });
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
        
        // Convert position to Babylon coordinates (scaling happens here only)
        let posKm = { ...result.position };
        // Enforce minimum LEO altitude in km before scaling
        const earthRadiusKm = EARTH_RADIUS;
        // Set a very conservative minimum altitude (e.g., 1000 km above surface)
        const minVisualLEO = 1000; // km above surface for visual safety
        const minRadiusKm = earthRadiusKm + minVisualLEO;
        const positionLengthKm = Math.sqrt(posKm.x * posKm.x + posKm.y * posKm.y + posKm.z * posKm.z);
        if (positionLengthKm < minRadiusKm) {
            // Force satellite to minimum safe LEO altitude
            const directionFromCenter = {
                x: posKm.x / positionLengthKm,
                y: posKm.y / positionLengthKm,
                z: posKm.z / positionLengthKm
            };
            const safeFactor = 2.5; // Large buffer to guarantee separation
            posKm.x = directionFromCenter.x * minRadiusKm * safeFactor;
            posKm.y = directionFromCenter.y * minRadiusKm * safeFactor;
            posKm.z = directionFromCenter.z * minRadiusKm * safeFactor;
        }
        // Now scale and map axes for Babylon.js
        const babylonPos = toBabylonPosition(posKm, EARTH_SCALE);
        
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

// Add showSatelliteTelemetryPanel function
function showSatelliteTelemetryPanel(satName, telemetryData, advancedTexture, meshColor) {
    // Remove any existing panel
    if (telemetryPanel) {
        advancedTexture.removeControl(telemetryPanel);
        telemetryPanel = null;
        if (telemetryPanelUpdateInterval) {
            clearInterval(telemetryPanelUpdateInterval);
            telemetryPanelUpdateInterval = null;
        }
    }
    // Create panel
    telemetryPanel = new Rectangle();
    telemetryPanel.width = "400px";
    telemetryPanel.height = "340px";
    telemetryPanel.cornerRadius = 18;
    telemetryPanel.thickness = 2;
    telemetryPanel.background = "rgba(10, 20, 40, 0.92)";
    telemetryPanel.color = meshColor ? meshColor.toHexString() : "#00ffff";
    telemetryPanel.zIndex = 1000;
    telemetryPanel.alpha = 0;
    telemetryPanel.left = "40%";
    telemetryPanel.top = "-30%";
    telemetryPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    telemetryPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(telemetryPanel);
    // Animate in
    BABYLON.Animation.CreateAndStartAnimation("fadeInPanel", telemetryPanel, "alpha", 60, 12, 0, 1, 0);
    // Add close button
    const closeBtn = new TextBlock();
    closeBtn.text = "✕";
    closeBtn.color = "#fff";
    closeBtn.fontSize = 28;
    closeBtn.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    closeBtn.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    closeBtn.paddingRight = "18px";
    closeBtn.paddingTop = "8px";
    closeBtn.width = "40px";
    closeBtn.height = "40px";
    closeBtn.onPointerUpObservable.add(() => {
        BABYLON.Animation.CreateAndStartAnimation("fadeOutPanel", telemetryPanel, "alpha", 60, 10, 1, 0, 0, null, () => {
            advancedTexture.removeControl(telemetryPanel);
            telemetryPanel = null;
            if (telemetryPanelUpdateInterval) {
                clearInterval(telemetryPanelUpdateInterval);
                telemetryPanelUpdateInterval = null;
            }
        });
    });
    telemetryPanel.addControl(closeBtn);
    // Add content block
    const content = new TextBlock();
    content.text = "";
    content.color = meshColor ? meshColor.toHexString() : "#fff";
    content.fontSize = 20;
    content.fontFamily = "monospace";
    content.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    content.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    content.paddingLeft = "28px";
    content.paddingTop = "48px";
    content.width = "92%";
    content.height = "90%";
    content.textWrapping = true;
    telemetryPanel.addControl(content);
    // Live update function
    function updatePanel() {
        const t = telemetryData[satName];
        if (!t) {
            content.text = `🛰️  ${satName}\n\nNo telemetry data available.`;
            return;
        }
        let special = "";
        if (t.systems && t.systems.sensors) {
            special = `\nSensors:\n  Radiation: ${t.systems.sensors.radiation_detector ?? 'N/A'}\n  Magnetometer: ${t.systems.sensors.magnetometer ?? 'N/A'}\n  Star Tracker: ${t.systems.sensors.star_tracker ?? 'N/A'}`;
        } else if (t.systems && t.systems.payload) {
            special = `\nPayload:\n  Imaging: ${t.systems.payload.imaging_system ?? 'N/A'}%\n  Storage: ${t.systems.payload.storage_capacity ?? 'N/A'} GB\n  Memory: ${t.systems.payload.memory_usage ?? 'N/A'}%`;
        }
        content.text = `🛰️  ${satName}\n\n` +
            `Altitude: ${t.altitude !== undefined ? t.altitude.toFixed(1) : 'N/A'} km\n` +
            `Velocity: ${t.velocity !== undefined ? t.velocity.toFixed(2) : 'N/A'} km/s\n` +
            `Period: ${t.period !== undefined ? t.period.toFixed(1) : 'N/A'} min\n` +
            `Inclination: ${t.inclination !== undefined ? t.inclination.toFixed(2) : 'N/A'}°\n` +
            `Lat/Lon: ${t.latitude !== undefined ? t.latitude.toFixed(2) : 'N/A'}, ${t.longitude !== undefined ? t.longitude.toFixed(2) : 'N/A'}\n` +
            `\nSystems:` +
            `\n  Power: ${t.systems && t.systems.power && t.systems.power.value !== undefined ? t.systems.power.value : 'N/A'}% (${t.systems && t.systems.power && t.systems.power.status ? t.systems.power.status : 'N/A'})` +
            `\n  Thermal: ${t.systems && t.systems.thermal && (t.systems.thermal.value ?? t.systems.thermal.core_temp) !== undefined ? (t.systems.thermal.value ?? t.systems.thermal.core_temp) : 'N/A'}°C (${t.systems && t.systems.thermal && t.systems.thermal.status ? t.systems.thermal.status : 'N/A'})` +
            `\n  Comms: ${t.systems && (t.systems.communications || t.systems.comms) && ((t.systems.communications && t.systems.communications.value !== undefined) ? t.systems.communications.value : (t.systems.comms && t.systems.comms.signal_strength !== undefined ? t.systems.comms.signal_strength : 'N/A'))} (${t.systems && (t.systems.communications || t.systems.comms) && ((t.systems.communications && t.systems.communications.status) ? t.systems.communications.status : (t.systems.comms && t.systems.comms.signal_strength !== undefined ? 'NOMINAL' : 'N/A'))})` +
            special;
    }
    updatePanel();
    telemetryPanelUpdateInterval = setInterval(updatePanel, 500);
}
