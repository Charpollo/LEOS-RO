import * as BABYLON from '@babylonjs/core';
import { EARTH_SCALE } from './constants.js';
import { generateRealTimeTelemetry } from './orbital-mechanics.js';
import { TextBlock, Rectangle, Control, Button } from '@babylonjs/gui';

let satelliteMeshes = {};
let telemetryData = {};
let staticTelemetryData = {}; // Store the detailed telemetry from Telem_example.json
let telemetryPanel = null;
let telemetryPanelUpdateInterval = null;

export function getSatelliteMeshes() {
    return satelliteMeshes;
}

export function getTelemetryData() {
    return telemetryData;
}

export async function createSatellites(scene, satelliteData, orbitalElements, activeSatellite, advancedTexture, simulationTime) {
    // Load detailed telemetry data first
    await loadDetailedTelemetryData();
    
    // Clear existing satellites and their enhanced trails
    for (const satName in satelliteMeshes) {
        if (satelliteMeshes[satName]) {
            const satellite = satelliteMeshes[satName];
            
            // Dispose of orbit trail if it exists
            if (satellite.orbitTrail) {
                satellite.orbitTrail.dispose();
            }
            
            // Dispose of glow trail if it exists
            if (satellite.glowTrail) {
                satellite.glowTrail.dispose();
            }
            
            // Remove trail scale observer if it exists
            if (satellite.trailScaleObserver) {
                scene.onBeforeRenderObservable.remove(satellite.trailScaleObserver);
            }
            
            // Dispose of the satellite mesh itself
            satellite.dispose();
        }
    }
    satelliteMeshes = {};
    
    // Create new satellites - ONLY for real satellites, not simulated debris/SDA objects
    for (const satName in satelliteData) {
        if (satName === 'metadata') continue;
        
        // Only create 3D models for actual mission satellites (CRTS and BULLDOG)
        // Skip debris and other simulated objects which should be handled by SDA visualization
        if (!satName.toUpperCase().includes('CRTS') && !satName.toUpperCase().includes('BULLDOG')) {
            continue;
        }
        
        // Handle model paths to work in both local and cloud environments
        const modelName = satName.toUpperCase().includes('CRTS') 
            ? 'crts_satellite.glb' 
            : 'bulldog_sat.glb';
        
        try {
            // Use proper parameter format for Babylon.js SceneLoader
            // First parameter: meshNames (empty string for all meshes)
            // Second parameter: root URL path for the assets
            // Third parameter: filename of the model
            // In Cloud Run deployments, we need to ensure the full path is correct
            // Modified to handle both local and cloud environments
            const result = await BABYLON.SceneLoader.ImportMeshAsync('', '/assets/', modelName, scene);
            const satelliteMesh = result.meshes[0];
            satelliteMesh.name = `${satName}_mesh`;
            // Set mesh scaling based on new Earth scale
            // Make satellites smaller for better zoom-in experience
            const isCRTS = satName.toUpperCase().includes('CRTS');
            const isBulldog = satName.toUpperCase().includes('BULLDOG');
            const SATELLITE_VISUAL_SCALE = isBulldog ? 0.0006 : 0.002; // Increased scale for better visibility
            satelliteMesh.scaling = new BABYLON.Vector3(SATELLITE_VISUAL_SCALE, SATELLITE_VISUAL_SCALE, SATELLITE_VISUAL_SCALE);
            // Set mesh color by satellite type
            const meshColor = isCRTS ? new BABYLON.Color3(0.8, 0.35, 0) : isBulldog ? new BABYLON.Color3(0, 1, 1) : new BABYLON.Color3(0.1, 0.4, 0.8);
            // Do NOT set child.material.emissiveColor here; let the model use its own appearance
            // satelliteMesh.getChildMeshes().forEach(child => {
            //     if (child.material) {
            //         child.material.emissiveColor = meshColor;
            //     }
            // });
            satelliteMeshes[satName] = satelliteMesh;
            
            addSatelliteLabel(satName, satelliteMesh, advancedTexture, activeSatellite, meshColor);
            
            satelliteMesh.isPickable = true;
            satelliteMesh.actionManager = new BABYLON.ActionManager(scene);
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOverTrigger,
                    () => {
                        document.getElementById('renderCanvas').style.cursor = 'pointer';
                        // Optionally, highlight with outline or glow instead of color
                    }
                )
            );
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOutTrigger,
                    () => {
                        document.getElementById('renderCanvas').style.cursor = 'default';
                        // Remove highlight if any
                    }
                )
            );
            
            // --- Add enhanced comet-like orbit trail with distance-adaptive scaling ---
            // Create trails AFTER positioning the satellite to avoid trails from origin
            if (!satelliteMesh.orbitTrail) {
                const trailMaterial = new BABYLON.StandardMaterial(`${satName}_trailMat`, scene);
                
                // Enhanced trail appearance for better visibility at all distances
                trailMaterial.emissiveColor = meshColor.clone().scale(1.2); // Brighter emissive only
                trailMaterial.diffuseColor = BABYLON.Color3.Black(); // No diffuse to avoid white shading
                trailMaterial.specularColor = BABYLON.Color3.Black(); // No specular highlights
                const DEFAULT_TRAIL_ALPHA = 0.6; // store default max alpha (60% visible)
                const DEFAULT_GLOW_ALPHA = 0.2; // store default glow alpha (20% visible)
                trailMaterial.alpha = 0; // initially invisible until fade-in
                trailMaterial.alphaMode = BABYLON.Engine.ALPHA_PREMULTIPLIED;
                trailMaterial.backFaceCulling = false; // Visible from all angles
                trailMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                trailMaterial.needDepthPrePass = true; // Helps with transparency ordering
                
                // Adaptive trail dimensions - longer and more visible from distance
                const TRAIL_LENGTH = 4096; // Further increased resolution for smoother curve
                const TRAIL_WIDTH = 0.8;   // Wider trail for improved visibility
                
                // Create trail without emitter to avoid initial origin cluster
                const trail = new BABYLON.TrailMesh(`${satName}_trail`, null, scene, TRAIL_WIDTH, TRAIL_LENGTH, true);
                trail.material = trailMaterial;
                trail.renderingGroupId = 1; // Render after opaque objects
                
                // Start trail invisible, will show after movement threshold and delay
                const TRAIL_DELAY = 0; // no delay, activate immediately to avoid origin cluster
                const MOVEMENT_THRESHOLD = 0; // no movement threshold
                // trail geometry exists but hidden via alpha until activation

                // Add glow trail for better distance visibility
                const glowMaterial = new BABYLON.StandardMaterial(`${satName}_glowMat`, scene);
                glowMaterial.emissiveColor = meshColor.clone().scale(0.6);
                glowMaterial.alpha = 0; // hidden until fade-in
                glowMaterial.alphaMode = BABYLON.Engine.ALPHA_PREMULTIPLIED;
                glowMaterial.backFaceCulling = false;
                glowMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                glowMaterial.needDepthPrePass = true; // Helps with transparency ordering
                
                // Create glow trail without emitter initially
                const glowTrail = new BABYLON.TrailMesh(`${satName}_glowTrail`, null, scene, TRAIL_WIDTH * 2.5, TRAIL_LENGTH * 0.8, true);
                glowTrail.material = glowMaterial;
                glowTrail.renderingGroupId = 0; // Render behind main trail
                
                glowTrail.isVisible = false;
                // glow geometry hidden via alpha until activation

                // Store trails and add dynamic fading observer via alpha
                satelliteMesh.orbitTrail = trail;
                satelliteMesh.glowTrail = glowTrail;
                satelliteMesh.trailsActive = false;
                // Track creation time and position to delay initial trail
                satelliteMesh.trailCreationTime = performance.now();
                satelliteMesh.initialPosition = satelliteMesh.position.clone();
                scene.onBeforeRenderObservable.add(() => {
                    const now = performance.now();
                    // Activate trails after delay and movement threshold
                    if (!satelliteMesh.trailsActive) {
                        const moved = BABYLON.Vector3.Distance(satelliteMesh.position, satelliteMesh.initialPosition);
                        if (now - satelliteMesh.trailCreationTime > TRAIL_DELAY && moved > MOVEMENT_THRESHOLD) {
                            satelliteMesh.trailsActive = true;
                            // Start emitter to collect from current orbit position
                            trail.emitter = satelliteMesh;
                            glowTrail.emitter = satelliteMesh;
                        }
                     }
                    // After activation, update trail alpha unless simulation is sped up
                    if (satelliteMesh.trailsActive) {
                        const tm = window.currentTimeMultiplier || 1;
                        if (tm > 1) {
                            // hide trails during speed-up
                            trailMaterial.alpha = 0;
                            glowMaterial.alpha = 0;
                        } else {
                            const camera = scene.activeCamera;
                            if (camera) {
                                const cameraDistance = BABYLON.Vector3.Distance(camera.position, BABYLON.Vector3.Zero());
                                const opacityScale = Math.max(0.6, Math.min(1.2, cameraDistance / 3.0));
                                trailMaterial.alpha = Math.min(DEFAULT_TRAIL_ALPHA, DEFAULT_TRAIL_ALPHA * opacityScale);
                                glowMaterial.alpha = Math.min(DEFAULT_GLOW_ALPHA, DEFAULT_GLOW_ALPHA * opacityScale);
                            }
                        }
                    }
                });
            }
            
            // Set active satellite when clicked
            const setActiveSatellite = () => {
                // --- Camera UX: zoom and center on satellite with enhanced animation ---
                const camera = scene.activeCamera;
                if (camera && satelliteMesh) {
                    // Store the current satellite as the active one for tracking purposes
                    window.activeSatellite = satName;
                    
                    const target = satelliteMesh.position.clone();
                    
                    // Calculate a safer offset position to avoid going inside Earth
                    const directionToEarthCenter = target.clone().normalize().scale(-1);
                    const distanceToEarthCenter = target.length();
                    const minSafeDistance = EARTH_SCALE * 1.2; // 20% margin
                    
                    // Create a safer offset in a direction away from Earth
                    const offsetDirection = new BABYLON.Vector3(0.2, 0.1, 0.2);
                    offsetDirection.addInPlace(directionToEarthCenter.scale(0.2)); // Add a component away from Earth
                    
                    // Calculate an offset position for the camera that keeps it outside Earth
                    const offset = target.add(offsetDirection.normalize().scale(Math.max(0.2, minSafeDistance * 0.2)));
                    
                    // Use easing function for smoother animation
                    const easingFunction = new BABYLON.CircleEase();
                    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
                    
                    // Animate camera movement
                    const anim = BABYLON.Animation.CreateAndStartAnimation(
                        'camMove', camera, 'position', 60, 40, // Use 40 frames for smoother animation
                        camera.position, offset, 0, easingFunction, 
                        () => {
                            // Once animation is complete, set the target
                            camera.setTarget(target);
                        }
                    );
                    if (anim) anim.disposeOnEnd = true;
                }
                window.dispatchEvent(new CustomEvent('satelliteSelected', { detail: { name: satName, source: 'mesh' } }));
            };
            
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPickTrigger,
                    setActiveSatellite
                )
            );
            
        } catch (error) {
            console.error(`Error loading satellite model for ${satName}:`, error);
        }
    }
    
    // After all satellites and labels are created, force Babylon GUI to update layout
    if (advancedTexture && typeof advancedTexture.markAsDirty === 'function') {
        if (scene && typeof scene.executeOnNextRender === 'function') {
            scene.executeOnNextRender(() => {
                advancedTexture.markAsDirty();
                if (advancedTexture._rootContainer && typeof advancedTexture._rootContainer._rebuildLayout === 'function') {
                    advancedTexture._rootContainer._rebuildLayout();
                }
                // --- Force a resize event to trigger pointer recalculation ---
                window.dispatchEvent(new Event('resize'));
            });
        } else {
            // fallback
            setTimeout(() => {
                advancedTexture.markAsDirty();
                if (advancedTexture._rootContainer && typeof advancedTexture._rootContainer._rebuildLayout === 'function') {
                    advancedTexture._rootContainer._rebuildLayout();
                }
                // --- Force a resize event to trigger pointer recalculation ---
                window.dispatchEvent(new Event('resize'));
            }, 100);
        }
    }
    return { satelliteMeshes, telemetryData };
}

// Update addSatelliteLabel to accept meshColor and set label color accordingly
function addSatelliteLabel(satName, mesh, advancedTexture, activeSatellite, meshColor) {
    const labelBtn = Button.CreateSimpleButton(`${satName}_label`, satName); // Use unique name for getControlByName
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
        showSatelliteTelemetryPanel(satName, telemetryData, advancedTexture, meshColor);
        window.dispatchEvent(new CustomEvent('satelliteSelected', { detail: { name: satName }, source: 'label' }));
        // --- Remove highlight from label after click (in case it stays highlighted) ---
        labelBtn.background = "rgba(0, 0, 0, 0.7)";
        labelBtn.alpha = 0.8;
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

// Add showSatelliteTelemetryPanel function
function showSatelliteTelemetryPanel(satName, telemetryData, advancedTexture, meshColor) {
    // Set globally accessible active satellite
    window.activeSatellite = satName;
    
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
    telemetryPanel.width = "420px";
    telemetryPanel.height = "500px";
    telemetryPanel.cornerRadius = 18;
    telemetryPanel.thickness = 2;
    telemetryPanel.background = "rgba(10, 20, 40, 0.92)";
    telemetryPanel.color = meshColor ? meshColor.toHexString() : "#00ffff";
    telemetryPanel.zIndex = 1000;
    telemetryPanel.alpha = 0;
    telemetryPanel.left = "40%";
    telemetryPanel.top = "-20%";
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
            
            // Reset active satellite and trigger a dashboard closed event to reset camera view
            window.activeSatellite = null;
            window.dispatchEvent(new CustomEvent('missionDashboardClosed'));
            
            // --- Remove highlight from label when panel is closed ---
            const labelControl = advancedTexture.getControlByName(`${satName}_label`);
            if (labelControl) {
                labelControl.background = "rgba(0, 0, 0, 0.7)";
                labelControl.alpha = 0.8;
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
            content.text = `  ${satName}\n\nNo telemetry data available.`;
            content.icon = '/assets/sat.svg';
            return;
        }
        
        // Calculate velocity magnitude if velocity is an array
        let velocityValue = 'N/A';
        if (t.velocity !== undefined) {
            if (Array.isArray(t.velocity)) {
                // Calculate magnitude of velocity vector
                velocityValue = Math.sqrt(t.velocity[0]**2 + t.velocity[1]**2 + t.velocity[2]**2).toFixed(2);
            } else if (typeof t.velocity === 'number') {
                velocityValue = t.velocity.toFixed(2);
            }
        }
        
        // Basic orbital data
        let displayText = `  ${satName}\n\n`;
        content.icon = '/assets/sat.svg';
        displayText += `Altitude: ${t.altitude !== undefined ? t.altitude.toFixed(1) : 'N/A'} km\n`;
        displayText += `Velocity: ${velocityValue} km/s\n`;
        displayText += `Period: ${t.period !== undefined ? t.period.toFixed(1) : 'N/A'} min\n`;
        displayText += `Inclination: ${t.inclination !== undefined ? t.inclination.toFixed(2) : 'N/A'}°\n`;
        displayText += `Lat/Lon: ${t.latitude !== undefined ? t.latitude.toFixed(2) : 'N/A'}, ${t.longitude !== undefined ? t.longitude.toFixed(2) : 'N/A'}\n`;
        
        // Systems status - merge real-time and detailed data
        displayText += `\nSystems Status:\n`;
        
        // Power system
        if (t.systems && t.systems.power) {
            const power = t.systems.power;
            const powerValue = power.battery_level || power.value || 'N/A';
            const powerStatus = power.status || 'N/A';
            displayText += `  Power: ${powerValue}${typeof powerValue === 'number' ? '%' : ''} (${powerStatus})\n`;
            if (power.solar_panels) displayText += `    Solar: ${power.solar_panels}\n`;
            if (power.voltage) displayText += `    Voltage: ${power.voltage}V\n`;
        }
        
        // Thermal system
        if (t.systems && t.systems.thermal) {
            const thermal = t.systems.thermal;
            const tempValue = thermal.core_temp || thermal.value || 'N/A';
            const tempStatus = thermal.status || 'N/A';
            displayText += `  Thermal: ${tempValue}${typeof tempValue === 'number' ? '°C' : ''} (${tempStatus})\n`;
            if (thermal.battery_temp) displayText += `    Battery: ${thermal.battery_temp}°C\n`;
            if (thermal.payload_temp) displayText += `    Payload: ${thermal.payload_temp}°C\n`;
        }
        
        // Communications system
        if (t.systems && (t.systems.communications || t.systems.comms)) {
            const comms = t.systems.communications || t.systems.comms;
            const signalValue = comms.signal_strength || comms.value || 'N/A';
            const commsStatus = comms.status || (signalValue !== 'N/A' ? 'NOMINAL' : 'N/A');
            displayText += `  Comms: ${signalValue}${typeof signalValue === 'number' ? 'dBm' : ''} (${commsStatus})\n`;
            if (comms.data_rate) displayText += `    Data Rate: ${comms.data_rate}\n`;
            if (comms.frequency) displayText += `    Frequency: ${comms.frequency}\n`;
        }
        
        // Attitude system (if available)
        if (t.systems && t.systems.attitude) {
            const attitude = t.systems.attitude;
            displayText += `  Attitude: ${attitude.status || 'N/A'}\n`;
            if (attitude.roll !== undefined) displayText += `    Roll: ${attitude.roll.toFixed(1)}°\n`;
            if (attitude.pitch !== undefined) displayText += `    Pitch: ${attitude.pitch.toFixed(1)}°\n`;
            if (attitude.yaw !== undefined) displayText += `    Yaw: ${attitude.yaw.toFixed(1)}°\n`;
        }
        
        // Sensor systems (CRTS specific)
        if (t.systems && t.systems.sensors) {
            const sensors = t.systems.sensors;
            displayText += `\nSensors:\n`;
            if (sensors.radiation_detector) displayText += `  Radiation: ${sensors.radiation_detector}\n`;
            if (sensors.magnetometer) displayText += `  Magnetometer: ${sensors.magnetometer}\n`;
            if (sensors.star_tracker) displayText += `  Star Tracker: ${sensors.star_tracker}\n`;
            if (sensors.gps) displayText += `  GPS: ${sensors.gps}\n`;
        }
        
        // Payload systems (Bulldog specific)
        if (t.systems && t.systems.payload) {
            const payload = t.systems.payload;
            displayText += `\nPayload:\n`;
            if (payload.imaging_system !== undefined) displayText += `  Imaging: ${payload.imaging_system}%\n`;
            if (payload.storage_capacity !== undefined) displayText += `  Storage: ${payload.storage_capacity} GB\n`;
            if (payload.memory_usage !== undefined) displayText += `  Memory: ${payload.memory_usage}%\n`;
            if (payload.data_collected !== undefined) displayText += `  Data: ${payload.data_collected} MB\n`;
        }
        
        // Propulsion system (if available)
        if (t.systems && t.systems.propulsion) {
            const propulsion = t.systems.propulsion;
            displayText += `\nPropulsion:\n`;
            if (propulsion.fuel_level !== undefined) displayText += `  Fuel: ${propulsion.fuel_level}%\n`;
            if (propulsion.thruster_status) displayText += `  Thrusters: ${propulsion.thruster_status}\n`;
            if (propulsion.delta_v !== undefined) displayText += `  Delta-V: ${propulsion.delta_v} m/s\n`;
        }
        
        content.text = displayText;
    }
    updatePanel();
    telemetryPanelUpdateInterval = setInterval(updatePanel, 500);
}

// Get detailed telemetry data for a specific satellite
function getDetailedTelemetryForSatellite(satName) {
    // Map satellite names to the keys in the telemetry data
    let telemetryKey = null;
    
    if (satName.toUpperCase().includes('CRTS')) {
        telemetryKey = 'CRTS1';
    } else if (satName.toUpperCase().includes('BULLDOG')) {
        telemetryKey = 'Bulldog';
    }
    
    if (telemetryKey && staticTelemetryData[telemetryKey]) {
        // Merge the detailed telemetry data with our existing structure
        const detailedData = staticTelemetryData[telemetryKey];
        return {
            // Keep existing systems structure but merge with detailed data
            systems: {
                power: detailedData.power || {},
                thermal: detailedData.thermal || {},
                communications: detailedData.communications || detailedData.comms || {},
                sensors: detailedData.sensors || {},
                payload: detailedData.payload || {},
                attitude: detailedData.attitude || {},
                propulsion: detailedData.propulsion || {}
            },
            // Add any additional top-level properties
            ...detailedData
        };
    }
    
    return { systems: {} };
}

// Load detailed telemetry data from the example file
async function loadDetailedTelemetryData() {
    try {
        const response = await fetch('/data/Telem_example.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        staticTelemetryData = await response.json();
        console.log('Detailed telemetry data loaded:', staticTelemetryData);
    } catch (error) {
        console.error('Error loading detailed telemetry data:', error);
        // Fallback to empty object if loading fails
        staticTelemetryData = {};
    }
}

export { getDetailedTelemetryForSatellite };
