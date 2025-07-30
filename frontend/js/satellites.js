import * as BABYLON from '@babylonjs/core';
import { EARTH_SCALE } from './constants.js';
import { generateRealTimeTelemetry, toBabylonPosition } from './orbital-mechanics.js';
import { TextBlock, Rectangle, Control, Button } from '@babylonjs/gui';

let satelliteMeshes = {};
let telemetryData = {};
let staticTelemetryData = {}; // Store the detailed telemetry from Telem_example.json

// Make satellite meshes accessible globally for settings
window.satelliteMeshes = satelliteMeshes;
let telemetryPanel = null;
let telemetryPanelUpdateInterval = null;

// Orbit display state: 0 = solid lines, 1 = comet trails, 2 = off
let orbitDisplayMode = 0;
let cometTrails = {}; // Store comet trail data for each satellite

// Make comet trails accessible globally for settings
window.cometTrails = cometTrails;

/**
 * Create comprehensive manual animations when GLB doesn't contain animations
 * Exported for use in both main scene and preview panel
 */
export function createManualSolarPanelAnimation(satelliteMesh, satName, scene) {
    console.log(`Creating manual solar panel animation for ${satName}`);
    
    // Get all meshes recursively
    const allMeshes = [];
    function collectMeshes(node) {
        if (node && node.name) {
            allMeshes.push(node);
        }
        if (node.getChildren) {
            node.getChildren().forEach(child => collectMeshes(child));
        }
    }
    collectMeshes(satelliteMesh);
    
    console.log(`Found ${allMeshes.length} total meshes:`, allMeshes.map(m => m.name));
    
    // Look for meshes that might be solar panels, antennas, or moving parts
    const panelMeshes = [];
    const antennaMeshes = [];
    const thrusterMeshes = [];
    
    allMeshes.forEach(mesh => {
        if (mesh.name) {
            const name = mesh.name.toLowerCase();
            if (name.includes('panel') || name.includes('solar') || name.includes('wing') || name.includes('array')) {
                panelMeshes.push(mesh);
                console.log(`Found solar panel mesh: ${mesh.name}`);
            } else if (name.includes('antenna') || name.includes('dish') || name.includes('comm')) {
                antennaMeshes.push(mesh);
                console.log(`Found antenna mesh: ${mesh.name}`);
            } else if (name.includes('thruster') || name.includes('engine') || name.includes('nozzle')) {
                thrusterMeshes.push(mesh);
                console.log(`Found thruster mesh: ${mesh.name}`);
            }
        }
    });
    
    // Store animation references for cleanup
    if (!satelliteMesh.manualAnimations) {
        satelliteMesh.manualAnimations = [];
    }
    
    // Create solar panel animations
    if (panelMeshes.length > 0) {
        console.log(`Creating solar panel animations for ${panelMeshes.length} panels`);
        
        panelMeshes.forEach((panel, index) => {
            // Create solar panel deploy/retract animation
            const deployAnim = new BABYLON.Animation(
                `${satName}_panel_${index}_deploy`,
                'rotation.z',
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const deployKeys = [
                { frame: 0, value: 0 },
                { frame: 120, value: Math.PI / 6 }, // Deploy 30 degrees
                { frame: 240, value: 0 }, // Retract
                { frame: 360, value: -Math.PI / 6 }, // Deploy other way
                { frame: 480, value: 0 } // Return to center
            ];
            
            deployAnim.setKeys(deployKeys);
            panel.animations = [deployAnim];
            
            // Create cyclic animation with pause
            const startPanelCycle = () => {
                const animatable = scene.beginAnimation(panel, 0, 480, false, 0.3);
                satelliteMesh.manualAnimations.push(animatable);
                
                // Set up pause and restart after animation completes
                animatable.onAnimationEndObservable.addOnce(() => {
                    // Wait 5 seconds, then restart
                    setTimeout(() => {
                        startPanelCycle(); // Restart the cycle
                    }, 5000);
                });
            };
            
            startPanelCycle();
            
            console.log(`Started solar panel animation for: ${panel.name}`);
        });
    }
    
    // Create antenna tracking animations
    if (antennaMeshes.length > 0) {
        console.log(`Creating antenna animations for ${antennaMeshes.length} antennas`);
        
        antennaMeshes.forEach((antenna, index) => {
            // Create antenna tracking animation
            const trackAnim = new BABYLON.Animation(
                `${satName}_antenna_${index}_track`,
                'rotation.y',
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const trackKeys = [
                { frame: 0, value: 0 },
                { frame: 180, value: Math.PI / 4 }, // Track 45 degrees
                { frame: 360, value: 0 },
                { frame: 540, value: -Math.PI / 4 }, // Track other way
                { frame: 720, value: 0 }
            ];
            
            trackAnim.setKeys(trackKeys);
            antenna.animations = [trackAnim];
            
            // Create cyclic animation with pause
            const startAntennaCycle = () => {
                const animatable = scene.beginAnimation(antenna, 0, 720, false, 0.2);
                satelliteMesh.manualAnimations.push(animatable);
                
                // Set up pause and restart after animation completes
                animatable.onAnimationEndObservable.addOnce(() => {
                    // Wait 5 seconds, then restart
                    setTimeout(() => {
                        startAntennaCycle(); // Restart the cycle
                    }, 5000);
                });
            };
            
            startAntennaCycle();
            
            console.log(`Started antenna animation for: ${antenna.name}`);
        });
    }
    
    // Create thruster gimbal animations
    if (thrusterMeshes.length > 0) {
        console.log(`Creating thruster animations for ${thrusterMeshes.length} thrusters`);
        
        thrusterMeshes.forEach((thruster, index) => {
            // Create thruster gimbal animation
            const gimbalAnim = new BABYLON.Animation(
                `${satName}_thruster_${index}_gimbal`,
                'rotation.x',
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const gimbalKeys = [
                { frame: 0, value: 0 },
                { frame: 90, value: Math.PI / 12 }, // Small gimbal movement
                { frame: 180, value: 0 },
                { frame: 270, value: -Math.PI / 12 },
                { frame: 360, value: 0 }
            ];
            
            gimbalAnim.setKeys(gimbalKeys);
            thruster.animations = [gimbalAnim];
            
            // Create cyclic animation with pause
            const startThrusterCycle = () => {
                const animatable = scene.beginAnimation(thruster, 0, 360, false, 0.5);
                satelliteMesh.manualAnimations.push(animatable);
                
                // Set up pause and restart after animation completes
                animatable.onAnimationEndObservable.addOnce(() => {
                    // Wait 5 seconds, then restart
                    setTimeout(() => {
                        startThrusterCycle(); // Restart the cycle
                    }, 5000);
                });
            };
            
            startThrusterCycle();
            
            console.log(`Started thruster animation for: ${thruster.name}`);
        });
    }
    
    // If no specific parts found, create a gentle satellite rotation
    if (panelMeshes.length === 0 && antennaMeshes.length === 0 && thrusterMeshes.length === 0) {
        console.log(`No animated parts found for ${satName} - creating gentle body rotation`);
        
        const bodyRotationAnim = new BABYLON.Animation(
            `${satName}_body_rotation`,
            'rotation.y',
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const bodyKeys = [
            { frame: 0, value: 0 },
            { frame: 1800, value: 2 * Math.PI } // Slow 60-second rotation
        ];
        
        bodyRotationAnim.setKeys(bodyKeys);
        satelliteMesh.animations = [bodyRotationAnim];
        
        // Create cyclic animation with pause
        const startBodyCycle = () => {
            const animatable = scene.beginAnimation(satelliteMesh, 0, 1800, false, 0.1);
            satelliteMesh.manualAnimations = [animatable];
            
            // Set up pause and restart after animation completes
            animatable.onAnimationEndObservable.addOnce(() => {
                // Wait 5 seconds, then restart
                setTimeout(() => {
                    startBodyCycle(); // Restart the cycle
                }, 5000);
            });
        };
        
        startBodyCycle();
        
        console.log(`Started gentle body rotation for ${satName}`);
    }
    
    console.log(`Manual animation setup complete for ${satName}`);
}

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
            
            // Stop all running animations before disposing
            if (scene.animatables) {
                const meshAnimatables = scene.animatables.filter(animatable => 
                    animatable.target === satellite || 
                    (satellite.getChildren && satellite.getChildren().includes(animatable.target))
                );
                meshAnimatables.forEach(animatable => {
                    animatable.stop();
                    scene.removeAnimatable(animatable);
                });
            }
            
            // Stop manual animations if they exist
            if (satellite.manualAnimations && satellite.manualAnimations.length > 0) {
                satellite.manualAnimations.forEach(animatable => {
                    if (animatable && animatable.stop) {
                        animatable.stop();
                    }
                });
                satellite.manualAnimations = [];
            }
            
            // Also stop any animation groups attached to the satellite
            if (satellite.animationGroups && satellite.animationGroups.length > 0) {
                satellite.animationGroups.forEach(group => {
                    group.stop();
                    group.dispose();
                });
                satellite.animationGroups = [];
            }
            
            // Dispose of orbit trail if it exists
            if (satellite.orbitTrail) {
                satellite.orbitTrail.dispose();
            }
            
            // Dispose of glow trail if it exists
            if (satellite.glowTrail) {
                satellite.glowTrail.dispose();
            }
            
            // Dispose of comet trail if it exists
            if (satellite.cometTrail) {
                satellite.cometTrail.dispose();
            }
            
            // Remove trail scale observer if it exists
            if (satellite.trailScaleObserver) {
                scene.onBeforeRenderObservable.remove(satellite.trailScaleObserver);
            }
            
            // Stop camera animation if it exists
            if (satellite._cameraAnimation) {
                satellite._cameraAnimation.stop();
                satellite._cameraAnimation = null;
            }
            
            // Dispose of action manager to prevent memory leaks
            if (satellite.actionManager) {
                satellite.actionManager.dispose();
                satellite.actionManager = null;
            }
            
            // Dispose of all child meshes first to prevent floating pieces
            if (satellite.getChildren) {
                satellite.getChildren().forEach(child => {
                    if (child.dispose) {
                        child.dispose();
                    }
                });
            }
            
            // Dispose of the satellite mesh itself
            satellite.dispose();
        }
    }
    
    // Clear comet trail data
    clearAllCometTrails();
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
        // Use mobile version of Bulldog for better performance
        const modelName = satName.toUpperCase().includes('CRTS') 
            ? 'crts_satellite.glb' 
            : 'bulldog_sat_mobile.glb';
        
        try {
            // Use proper parameter format for Babylon.js SceneLoader
            // First parameter: meshNames (empty string for all meshes)
            // Second parameter: root URL path for the assets
            // Third parameter: filename of the model
            // In Cloud Run deployments, we need to ensure the full path is correct
            // Modified to handle both local and cloud environments
            const result = await BABYLON.SceneLoader.ImportMeshAsync('', '/assets/', modelName, scene);
            
            // Find the proper root mesh - be more careful about hierarchy preservation
            let satelliteMesh;
            
            // First try to find __root__ node
            const rootNode = result.meshes.find(mesh => mesh.name === '__root__');
            if (rootNode) {
                satelliteMesh = rootNode;
                console.log(`Using __root__ node as satellite mesh for ${satName}`);
            } else {
                // Look for the mesh with the most children (likely the main body)
                let bestMesh = result.meshes[0];
                let maxChildren = 0;
                
                result.meshes.forEach(mesh => {
                    const childCount = mesh.getChildren ? mesh.getChildren().length : 0;
                    if (childCount > maxChildren) {
                        maxChildren = childCount;
                        bestMesh = mesh;
                    }
                });
                
                satelliteMesh = bestMesh;
                console.log(`Using mesh '${bestMesh.name}' as satellite mesh (${maxChildren} children)`);
            }
            
            satelliteMesh.name = `${satName}_mesh`;
            
            console.log(`Loaded ${result.meshes.length} meshes for ${satName}:`);
            result.meshes.forEach((mesh, i) => {
                const children = mesh.getChildren ? mesh.getChildren().length : 0;
                console.log(`  ${i}: ${mesh.name} (${children} children, parent: ${mesh.parent?.name || 'none'})`);
            });
            console.log(`Animation groups found: ${result.animationGroups?.length || 0}`);
            
            // Debug: Check each animation group in detail
            if (result.animationGroups && result.animationGroups.length > 0) {
                result.animationGroups.forEach((group, i) => {
                    console.log(`  Animation ${i}: '${group.name}' from ${group.from} to ${group.to}`);
                    console.log(`    Target animations: ${group.targetedAnimations?.length || 0}`);
                    if (group.targetedAnimations) {
                        group.targetedAnimations.forEach((ta, j) => {
                            console.log(`      Target ${j}: ${ta.target?.name || 'unnamed'} - property: ${ta.animation?.property}`);
                        });
                    }
                });
            }
            
            // IMPORTANT: Ensure model starts in default position before any transformations
            // Reset position, rotation, and then apply scaling
            satelliteMesh.position = BABYLON.Vector3.Zero();
            satelliteMesh.rotation = BABYLON.Vector3.Zero();
            
            // Set mesh scaling BEFORE starting animations to avoid breaking them
            const isCRTS = satName.toUpperCase().includes('CRTS');
            const isBulldog = satName.toUpperCase().includes('BULLDOG');
            // Smaller scale for mobile version of Bulldog
            const SATELLITE_VISUAL_SCALE = isBulldog ? 0.0004 : 0.0015; // Reduced scale for better performance
            satelliteMesh.scaling = new BABYLON.Vector3(SATELLITE_VISUAL_SCALE, SATELLITE_VISUAL_SCALE, SATELLITE_VISUAL_SCALE);
            
            // Apply different rotations based on satellite type
            // to ensure antennas and sensors are pointing correctly
            if (isCRTS) {
                // CRTS: Rotate 270 degrees around Y-axis (180 + 90)
                satelliteMesh.rotation.y = Math.PI * 1.5; // 270 degrees in radians
            } else if (isBulldog) {
                // Bulldog: Rotate to point dish down at Earth
                satelliteMesh.rotation.x = -Math.PI / 2; // 90 degrees up (negative = up)
                satelliteMesh.rotation.y = Math.PI; // 180 degrees around Y
            }
            
            // Wait one frame for the mesh to be properly positioned before starting animations
            const animationSetupCallback = () => {
                scene.onAfterRenderObservable.removeCallback(animationSetupCallback);
                console.log(`Model positioning complete for ${satName}, starting animations...`);
            
                // Start any built-in animations AFTER scaling and positioning
                if (result.animationGroups && result.animationGroups.length > 0) {
                    console.log(`Starting ${result.animationGroups.length} built-in animations for ${satName}`);
                    result.animationGroups.forEach((animationGroup, index) => {
                        // Ensure animation group has unique name for this satellite
                        animationGroup.name = `${satName}_animation_${index}`;
                        // Reset to start position
                        animationGroup.reset();
                        
                        // For better visual stability, reset animation to start position
                        animationGroup.goToFrame(0);
                        
                        // Create a repeating animation cycle with pause
                        const startAnimationCycle = () => {
                            // Reset to start position before playing
                            animationGroup.goToFrame(0);
                            
                            // Play animation once (not looping)
                            animationGroup.start(false, 1.0, animationGroup.from, animationGroup.to, false);
                            
                            // Set up pause and restart after animation completes
                            animationGroup.onAnimationGroupEndObservable.addOnce(() => {
                                // Reset to start position during pause to avoid floating parts
                                animationGroup.goToFrame(0);
                                
                                // Wait 5 seconds, then restart
                                setTimeout(() => {
                                    startAnimationCycle(); // Restart the cycle
                                }, 5000);
                            });
                        };
                        
                        // Start the first cycle
                        startAnimationCycle();
                        
                        console.log(`Started cyclic animation '${animationGroup.name}' for ${satName} (play once, pause 5s, repeat)`);
                        // Store reference for cleanup
                        satelliteMesh.animationGroups = satelliteMesh.animationGroups || [];
                        satelliteMesh.animationGroups.push(animationGroup);
                    });
                } else {
                    console.log(`No built-in animations found for ${satName} - creating manual solar panel animation`);
                    // Create manual solar panel animation if no built-in animations exist
                    createManualSolarPanelAnimation(satelliteMesh, satName, scene);
                }
            };
            scene.registerAfterRender(animationSetupCallback);
            // Set mesh color by satellite type
            const meshColor = isCRTS ? new BABYLON.Color3(0.8, 0.35, 0) : isBulldog ? new BABYLON.Color3(0, 1, 1) : new BABYLON.Color3(0.1, 0.4, 0.8);
            // Do NOT set child.material.emissiveColor here; let the model use its own appearance
            // This preserves the original model materials and textures
            
            satelliteMeshes[satName] = satelliteMesh;
            
            addSatelliteLabel(satName, satelliteMesh, advancedTexture, activeSatellite, meshColor);
            
            // Draw static full orbit path as a closed loop using orbitalElements
            const elements = orbitalElements[satName];
            if (elements) {
                const ORBIT_SAMPLES = 180;
                const orbitPoints = [];
                const deg2rad = Math.PI / 180;
                const e = elements.eccentricity;
                const a = elements.semi_major_axis_km;
                const iRad = elements.inclination_deg * deg2rad;
                const omegaRad = elements.argument_of_perigee_deg * deg2rad;
                const OmegaRad = elements.raan_deg * deg2rad;
                const cosI = Math.cos(iRad), sinI = Math.sin(iRad);
                const cosOmega = Math.cos(omegaRad), sinOmega = Math.sin(omegaRad);
                const cosCapOmega = Math.cos(OmegaRad), sinCapOmega = Math.sin(OmegaRad);
                for (let j = 0; j <= ORBIT_SAMPLES; j++) {
                    const TA = 2 * Math.PI * j / ORBIT_SAMPLES;
                    const r = a * (1 - e * e) / (1 + e * Math.cos(TA));
                    const xOrb = r * Math.cos(TA);
                    const yOrb = r * Math.sin(TA);
                    const x = (cosCapOmega * cosOmega - sinCapOmega * sinOmega * cosI) * xOrb +
                              (-cosCapOmega * sinOmega - sinCapOmega * cosOmega * cosI) * yOrb;
                    const y = (sinCapOmega * cosOmega + cosCapOmega * sinOmega * cosI) * xOrb +
                              (-sinCapOmega * sinOmega + cosCapOmega * cosOmega * cosI) * yOrb;
                    const z = (sinI * sinOmega) * xOrb + (sinI * cosOmega) * yOrb;
                    // Convert ECI (km) into Babylon coords
                    orbitPoints.push(toBabylonPosition({ x, y, z }));
                }
                const orbitPath = BABYLON.MeshBuilder.CreateLines(
                    `${satName}_orbitPath`,
                    { points: orbitPoints, close: true, updatable: false },
                    scene
                );
                orbitPath.color = meshColor.clone().scale(0.6);
                // Attach to mesh for toggling
                satelliteMesh.orbitPath = orbitPath;
            }
            
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
                    if (anim) {
                        anim.disposeOnEnd = true;
                        // Store reference for cleanup if needed
                        satelliteMesh._cameraAnimation = anim;
                    }
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
            console.error(`  Model file: ${modelName}`);
            console.error(`  Error details:`, {
                message: error.message,
                stack: error.stack,
                satelliteName: satName
            });
            
            // Provide user-friendly error message
            console.warn(`Failed to load 3D model for ${satName}. This may be due to:`);
            console.warn(`  - Missing or corrupted GLB file: ${modelName}`);
            console.warn(`  - Network connection issues`);
            console.warn(`  - Model file optimization removing required data`);
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
    // Lift label above satellite model
    labelBtn.linkOffsetY = -60;
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

// Earth-relative historical 3D comet trail system
function initializeCometTrail(satName, satelliteMesh, scene) {
    const maxHistoryMinutes = 180; // 3 hours of orbital history for multiple complete orbits
    cometTrails[satName] = {
        historicalPositions: [], // Array of {eciPosition: Vector3, earthRotation: number, timestamp: Date}
        maxHistoryLength: maxHistoryMinutes * 60, // Convert to seconds
        lastUpdateTime: new Date(),
        trailMesh: null,
        scene: scene,
        satelliteMesh: satelliteMesh,
        samplingIntervalSeconds: 2, // Sample every 2 seconds for smooth curves
        lastSampleTime: 0,
        isInitialized: true,
        earthRotationAtStart: 0 // Track Earth's rotation reference point
    };
    
    console.log(`Initialized Earth-relative comet trail for ${satName}`);
}

// Convert satellite position to latitude/longitude for ground track detection
function satelliteToLatLon(position) {
    const distance = position.length();
    const lat = Math.asin(position.y / distance) * 180 / Math.PI;
    const lon = Math.atan2(position.z, position.x) * 180 / Math.PI;
    return { lat, lon };
}

// Check if we've started a new orbit (longitude wrapped around)
function detectNewOrbit(currentLon, lastLon) {
    if (lastLon === null) return false;
    // Detect when longitude wraps around significantly (crossing 180/-180 boundary)
    const lonDiff = Math.abs(currentLon - lastLon);
    return lonDiff > 300; // Large jump indicates orbit completion
}

function updateCometTrail(satName, satelliteMesh) {
    if (!cometTrails[satName] || !cometTrails[satName].isInitialized) return;
    
    const trail = cometTrails[satName];
    const currentTime = window.getCurrentSimTime ? window.getCurrentSimTime() : new Date();
    const currentPosition = satelliteMesh.position.clone();
    
    // Adaptive sampling based on simulation speed for optimal performance and realism
    const timeMultiplier = window.currentTimeMultiplier || 1;
    const adaptiveSamplingInterval = Math.max(1, trail.samplingIntervalSeconds / Math.sqrt(timeMultiplier));
    const timeSinceLastSample = (currentTime.getTime() - trail.lastSampleTime) / 1000; // Convert to seconds
    
    if (timeSinceLastSample >= adaptiveSamplingInterval) {
        // Calculate Earth's rotation angle based on SIMULATION time (not real time)
        // Earth rotates 360° in 24 hours = 15°/hour = 0.25°/minute = 0.004167°/second
        const earthRotationRate = 0.004167; // degrees per simulation second
        const simulationTimeSeconds = currentTime.getTime() / 1000;
        const earthRotationAngle = simulationTimeSeconds * earthRotationRate;
        
        // Store position in Earth-Centered Inertial (ECI) coordinates with Earth rotation reference
        trail.historicalPositions.push({
            eciPosition: currentPosition.clone(), // Position in space-fixed coordinates
            earthRotation: earthRotationAngle, // Earth's rotation at this time
            timestamp: new Date(currentTime)
        });
        
        trail.lastSampleTime = currentTime.getTime();
        
        // Remove old positions beyond our history window
        const cutoffTime = currentTime.getTime() - (trail.maxHistoryLength * 1000);
        trail.historicalPositions = trail.historicalPositions.filter(
            entry => entry.timestamp.getTime() > cutoffTime
        );
        
        // Update trail mesh to show Earth rotation effect
        updateRealisticTrailMesh(satName);
        
        // Reduce console logging frequency for performance
        if (trail.historicalPositions.length % 20 === 0) {
            console.log(`${satName}: Updated trail with ${trail.historicalPositions.length} historical positions spanning ${Math.round((currentTime.getTime() - (trail.historicalPositions[0]?.timestamp.getTime() || currentTime.getTime())) / 60000)} minutes`);
        }
    } else if (trail.historicalPositions.length > 2) {
        // Even when not adding new points, update the trail mesh periodically to show Earth rotation effect
        // Update more frequently when simulation is faster to keep trails smooth
        const updateInterval = Math.max(1, 5 / timeMultiplier); // Update more often at high speeds
        const simulationSeconds = Math.floor(currentTime.getTime() / 1000);
        if (simulationSeconds % Math.ceil(updateInterval) === 0) {
            updateRealisticTrailMesh(satName);
        }
    }
}


function updateRealisticTrailMesh(satName) {
    const trail = cometTrails[satName];
    
    if (trail.historicalPositions.length < 2) {
        return; // Need at least 2 points to create a line
    }
    
    try {
        const scene = trail.scene;
        const currentTime = window.getCurrentSimTime ? window.getCurrentSimTime() : new Date();
        
        // Dispose of old trail mesh
        if (trail.trailMesh && !trail.trailMesh.isDisposed()) {
            trail.trailMesh.dispose();
        }
        
        // Calculate current Earth rotation based on SIMULATION time
        const earthRotationRate = 0.004167; // degrees per simulation second
        const simulationTimeSeconds = currentTime.getTime() / 1000;
        const currentEarthRotation = simulationTimeSeconds * earthRotationRate;
        
        // Convert historical ECI positions to current Earth-relative coordinates
        const trailPoints = trail.historicalPositions.map(entry => {
            // Calculate how much Earth has rotated since this position was recorded
            const rotationDifference = currentEarthRotation - entry.earthRotation;
            const rotationRadians = (rotationDifference * Math.PI) / 180;
            
            // Rotate the historical position to show where it would be relative to current Earth orientation
            const x = entry.eciPosition.x * Math.cos(rotationRadians) - entry.eciPosition.z * Math.sin(rotationRadians);
            const y = entry.eciPosition.y; // Y axis (north-south) doesn't change with Earth rotation
            const z = entry.eciPosition.x * Math.sin(rotationRadians) + entry.eciPosition.z * Math.cos(rotationRadians);
            
            return new BABYLON.Vector3(x, y, z);
        });
        
        // Create smooth, continuous trail mesh
        const trailMesh = BABYLON.MeshBuilder.CreateLines(
            `${satName}_historicalTrail`,
            { 
                points: trailPoints,
                updatable: false // For better performance since we recreate when needed
            },
            scene
        );
        
        // Set trail appearance based on satellite
        const isCRTS = satName.toUpperCase().includes('CRTS');
        const isBulldog = satName.toUpperCase().includes('BULLDOG');
        
        if (isCRTS) {
            trailMesh.color = new BABYLON.Color3(1.0, 0.5, 0.1); // Bright orange for CRTS
        } else if (isBulldog) {
            trailMesh.color = new BABYLON.Color3(0.1, 0.8, 1.0); // Bright cyan for Bulldog
        } else {
            trailMesh.color = new BABYLON.Color3(0.3, 0.7, 1.0); // Blue for others
        }
        
        // Make trail slightly transparent and glowing
        trailMesh.alpha = 0.8;
        trailMesh.isVisible = true;
        
        // Optional: Add gradient effect (newer parts brighter)
        // This could be enhanced with a custom shader for even better effects
        
        trail.trailMesh = trailMesh;
        trail.satelliteMesh.cometTrail = trailMesh;
        
        // Only log mesh creation occasionally to reduce console spam
        if (trailPoints.length % 50 === 0) {
            const timeMultiplier = window.currentTimeMultiplier || 1;
            console.log(`Created realistic trail mesh for ${satName} with ${trailPoints.length} points, Earth rotation: ${currentEarthRotation.toFixed(2)}°, speed: ${timeMultiplier}x`);
        }
        
    } catch (error) {
        console.error(`Error creating realistic trail mesh for ${satName}:`, error);
    }
}

function clearCometTrail(satName) {
    if (cometTrails[satName]) {
        // Dispose historical trail mesh
        if (cometTrails[satName].trailMesh && !cometTrails[satName].trailMesh.isDisposed()) {
            cometTrails[satName].trailMesh.dispose();
        }
        
        // Clear all historical data
        cometTrails[satName].historicalPositions = [];
        
        delete cometTrails[satName];
        console.log(`Cleared comet trail for ${satName}`);
    }
}

function clearAllCometTrails() {
    Object.keys(cometTrails).forEach(satName => {
        clearCometTrail(satName);
    });
}

function setOrbitDisplayMode(mode) {
    orbitDisplayMode = mode;
    
    Object.entries(satelliteMeshes).forEach(([satName, mesh]) => {
        switch (mode) {
            case 0: // Solid lines
                // Show static orbit paths
                if (mesh.orbitPath) {
                    mesh.orbitPath.isVisible = true;
                }
                // Hide comet trails when switching to solid lines
                if (cometTrails[satName] && cometTrails[satName].trailMesh) {
                    cometTrails[satName].trailMesh.isVisible = false;
                }
                break;
                
            case 1: // Historical 3D comet trails
                // Hide static orbit paths
                if (mesh.orbitPath) {
                    mesh.orbitPath.isVisible = false;
                }
                // Initialize comet trail if it doesn't exist
                if (!cometTrails[satName] || !cometTrails[satName].isInitialized) {
                    initializeCometTrail(satName, mesh, mesh.getScene());
                }
                // Show comet trails
                if (cometTrails[satName] && cometTrails[satName].trailMesh) {
                    cometTrails[satName].trailMesh.isVisible = true;
                }
                break;
                
            case 2: // Off
                // Hide both static orbit paths and comet trails
                if (mesh.orbitPath) {
                    mesh.orbitPath.isVisible = false;
                }
                if (cometTrails[satName] && cometTrails[satName].trailMesh) {
                    cometTrails[satName].trailMesh.isVisible = false;
                }
                break;
        }
    });
}

// Export function to update comet trails from simulation loop
export function updateCometTrails() {
    if (orbitDisplayMode === 1) { // Only update when in comet trail mode
        console.log(`DEBUG: updateCometTrails called, mode=${orbitDisplayMode}, satellites=${Object.keys(satelliteMeshes).length}`);
        Object.entries(satelliteMeshes).forEach(([satName, mesh]) => {
            updateCometTrail(satName, mesh);
        });
    }
}

// Three-state toggle for orbit display with the 'O' key
window.addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') {
        // Cycle through states: 0 -> 1 -> 2 -> 0
        orbitDisplayMode = (orbitDisplayMode + 1) % 3;
        console.log(`DEBUG: Switching to mode ${orbitDisplayMode}, satelliteMeshes count: ${Object.keys(satelliteMeshes).length}`);
        setOrbitDisplayMode(orbitDisplayMode);
        
        // Optional: Show a brief status message
        const modeNames = ['Solid Orbit Lines', 'Historical 3D Trails', 'Off'];
        console.log(`Orbit Display: ${modeNames[orbitDisplayMode]}`);
    }
});
