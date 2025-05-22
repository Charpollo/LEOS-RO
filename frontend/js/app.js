import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { AdvancedDynamicTexture, StackPanel, TextBlock, Rectangle, Button } from '@babylonjs/gui';

// Globals
let engine;
let scene;
let camera;
let earthMesh;
let moonMesh;
let satelliteMeshes = {};
let orbitLines = {};
let timeMultiplier = 1;
let lastTimeMultiplier = 1;
let simulationTime = new Date();
let satelliteData = {};
let telemetryData = {};
let activeSatellite = null;
let isInitialized = false;
let telemetryVisible = false;
let pathsVisible = false;
let isFreeCamera = true;
let advancedTexture;
let instructionsPanel;
let sceneLoaded = false;

// Earth constants
const EARTH_RADIUS = 6371; // km
const EARTH_SCALE = 0.001; // Scale to use in Babylon.js scene (1 unit = 1000 km)
const MOON_DISTANCE = 384400 * EARTH_SCALE; // Average moon distance in scene units
const MOON_SCALE = 0.27; // Moon is about 27% the size of Earth

/**
 * Initialize the application
 */
async function initApp() {
    createScene();
    
    // Hide loading screen once scene is ready
    engine.runRenderLoop(() => {
        scene.render();
        
        // Hide loading screen when the scene is ready
        if (scene.isReady() && !sceneLoaded) {
            document.getElementById('loading-screen').style.display = 'none';
            sceneLoaded = true;
            showInstructions();
        }
    });
    
    // Bind UI events
    bindUIEvents();
    bindUIEvents();
    
    // Start the render loop
    engine.runRenderLoop(() => {
        scene.render();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        engine.resize();
    });
}

/**
 * Create the main Babylon.js scene
 */
async function createScene() {
    // Initialize the Babylon engine
    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, { stencil: true });
    
    // Create a new scene
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    scene.collisionsEnabled = false;
    
    // Create a free camera
    camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 20, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;
    camera.maxZ = 100000;
    camera.lowerRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 1.5;
    camera.upperRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 50;
    
    // Setup lighting
    const sunLight = new BABYLON.HemisphericLight('sunLight', new BABYLON.Vector3(1, 0, 0), scene);
    sunLight.intensity = 1.2;
    
    // Add a point light to simulate the sun
    const sunPointLight = new BABYLON.PointLight('sunPointLight', new BABYLON.Vector3(100, 0, 0), scene);
    sunPointLight.intensity = 0.5;
    
    // Create skybox
    createSkybox();
    
    // Create Earth
    await createEarth();
    
    // Create Moon
    await createMoon();
    
    // Create GUI
    createGUI();
}

/**
 * Create a skybox with stars
 */
function createSkybox() {
    const skybox = BABYLON.MeshBuilder.CreateBox('skybox', { size: 10000 }, scene);
    const skyMaterial = new BABYLON.StandardMaterial('skyMaterial', scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.reflectionTexture = new BABYLON.CubeTexture('assets/stars.jpg', scene);
    skyMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyMaterial;
    skybox.infiniteDistance = true;
}

/**
 * Create the Earth with realistic textures
 */
async function createEarth() {
    // Create Earth sphere
    earthMesh = BABYLON.MeshBuilder.CreateSphere('earth', { 
        segments: 64, 
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE 
    }, scene);
    
    // Create Earth material
    const earthMaterial = new BABYLON.StandardMaterial('earthMaterial', scene);
    
    // Load Earth textures
    earthMaterial.diffuseTexture = new BABYLON.Texture('assets/earth_diffuse.jpg', scene);
    earthMaterial.specularTexture = new BABYLON.Texture('assets/earth_specular.tif', scene);
    earthMaterial.emissiveTexture = new BABYLON.Texture('assets/earth_night.jpg', scene);
    
    // Create clouds layer
    const cloudsMaterial = new BABYLON.StandardMaterial('cloudsMaterial', scene);
    cloudsMaterial.diffuseTexture = new BABYLON.Texture('assets/earth_clouds.jpg', scene);
    cloudsMaterial.diffuseTexture.hasAlpha = true;
    cloudsMaterial.useAlphaFromDiffuseTexture = true;
    cloudsMaterial.backFaceCulling = false;
    cloudsMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    
    const cloudsMesh = BABYLON.MeshBuilder.CreateSphere('clouds', { 
        segments: 64, 
        diameter: EARTH_RADIUS * 2.02 * EARTH_SCALE  // Slightly larger than Earth
    }, scene);
    cloudsMesh.material = cloudsMaterial;
    cloudsMesh.parent = earthMesh;
    
    // Apply material
    earthMesh.material = earthMaterial;
    
    // Add rotation to Earth
    scene.registerBeforeRender(() => {
        // Earth rotates at approximately 15 degrees per hour
        earthMesh.rotation.y += (0.25 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
    });
}

/**
 * Create the Moon with texture
 */
async function createMoon() {
    // Create Moon sphere
    moonMesh = BABYLON.MeshBuilder.CreateSphere('moon', { 
        segments: 32, 
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE * MOON_SCALE 
    }, scene);
    
    // Position the moon
    moonMesh.position = new BABYLON.Vector3(0, 0, MOON_DISTANCE);
    
    // Create Moon material
    const moonMaterial = new BABYLON.StandardMaterial('moonMaterial', scene);
    moonMaterial.diffuseTexture = new BABYLON.Texture('assets/moon_texture.jpg', scene);
    
    // Apply material
    moonMesh.material = moonMaterial;
    
    // Create Moon pivot for orbit
    const moonPivot = new BABYLON.TransformNode('moonPivot', scene);
    moonMesh.parent = moonPivot;
    
    // Add rotation to Moon orbit
    scene.registerBeforeRender(() => {
        // Moon orbits Earth approximately every 27.3 days
        moonPivot.rotation.y += (13.2 * Math.PI / 180 / 24) * timeMultiplier * (scene.getAnimationRatio() || 1);
    });
}

/**
 * Create the UI elements
 */
function createGUI() {
    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    
    // Create satellite labels
    // Will be populated when satellites are loaded
}

/**
 * Bind UI event handlers
 */
function bindUIEvents() {
    // Initialize simulation button
    document.getElementById('init-simulation').addEventListener('click', initializeSimulation);
    
    // Toggle telemetry panel
    document.getElementById('toggle-telemetry').addEventListener('click', toggleTelemetry);
    
    // Toggle orbital paths
    document.getElementById('toggle-paths').addEventListener('click', toggleOrbitalPaths);
    
    // Switch camera mode
    document.getElementById('toggle-camera').addEventListener('click', toggleCamera);
    
    // Time controls
    document.getElementById('time-speed-up').addEventListener('click', increaseTimeSpeed);
    document.getElementById('time-speed-down').addEventListener('click', decreaseTimeSpeed);
    
    // Instructions
    document.getElementById('show-instructions').addEventListener('click', showInstructions);
    document.getElementById('close-instructions').addEventListener('click', hideInstructions);
    
    // Earth rotation controls
    document.getElementById('rotate-left').addEventListener('click', rotateEarthLeft);
    document.getElementById('rotate-right').addEventListener('click', rotateEarthRight);
    
    // Telemetry panel close button
    document.getElementById('close-telemetry').addEventListener('click', () => {
        document.getElementById('telemetry-panel').classList.add('hidden');
        telemetryVisible = false;
    });
    
    // Advanced telemetry dashboard
    document.getElementById('show-advanced-telemetry').addEventListener('click', showAdvancedTelemetry);
    document.querySelector('.close-dashboard').addEventListener('click', hideAdvancedTelemetry);
    
    // Keyboard controls
    window.addEventListener('keydown', (event) => {
        if (event.key === 'r' || event.key === 'R') {
            resetCamera();
        } else if (event.key === ' ') {
            // Toggle time multiplier between 0 (paused) and previous value
            if (timeMultiplier === 0) {
                timeMultiplier = lastTimeMultiplier || 1;
            } else {
                lastTimeMultiplier = timeMultiplier;
                timeMultiplier = 0;
            }
            document.getElementById('time-speed').textContent = timeMultiplier + 'x';
        }
    });
}

/**
 * Initialize the simulation by fetching data from the backend
 */
async function initializeSimulation() {
    if (isInitialized) return;
    
    updateStatus('Initializing simulation...');
    
    try {
        // Call backend to initialize simulation
        const response = await fetch('/init-simulation');
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'initializing') {
            checkInitializationStatus();
        } else {
            throw new Error('Failed to initialize simulation');
        }
    } catch (error) {
        console.error('Error initializing simulation:', error);
        updateStatus('Error initializing simulation');
    }
}

/**
 * Check initialization status periodically
 */
function checkInitializationStatus() {
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/simulation/status');
            const data = await response.json();
            
            if (data.initialized) {
                clearInterval(checkInterval);
                isInitialized = true;
                loadSatelliteData();
            } else if (data.error) {
                clearInterval(checkInterval);
                updateStatus(`Initialization error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error checking initialization status:', error);
        }
    }, 1000);
}

/**
 * Load satellite data from the backend
 */
async function loadSatelliteData() {
    updateStatus('Loading satellite data...');
    
    try {
        // Fetch satellite data
        const response = await fetch('/api/simulation_data');
        satelliteData = await response.json();
        
        // Load satellite telemetry
        await loadTelemetry();
        
        // Create satellite meshes
        await createSatellites();
        
        // Create orbital paths
        if (pathsVisible) {
            createOrbitalPaths();
        }
        
        // Start the simulation update loop
        startSimulationLoop();
        
        updateStatus('Simulation running');
    } catch (error) {
        console.error('Error loading satellite data:', error);
        updateStatus('Error loading satellite data');
    }
}

/**
 * Load telemetry data for satellites
 */
async function loadTelemetry() {
    try {
        const response = await fetch('/api/telemetry');
        telemetryData = await response.json();
        
        // Update telemetry UI
        updateTelemetryUI();
        
        // Create satellite selector
        createSatelliteSelector();
    } catch (error) {
        console.error('Error loading telemetry:', error);
    }
}

/**
 * Create satellite meshes from loaded models
 */
async function createSatellites() {
    // First clear any existing satellites
    for (const satName in satelliteMeshes) {
        if (satelliteMeshes[satName]) {
            satelliteMeshes[satName].dispose();
        }
    }
    satelliteMeshes = {};
    
    // Load satellite models for each satellite in the data
    for (const satName in satelliteData) {
        if (satName === 'metadata') continue;
        
        // Determine which model to use
        const modelFile = satName.toUpperCase().includes('CRTS') 
            ? 'assets/crts_satellite.glb' 
            : 'assets/bulldog_sat.glb';
        
        try {
            // Load the satellite model
            const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelFile, scene);
            
            // Get the main mesh
            const satelliteMesh = result.meshes[0];
            satelliteMesh.name = `${satName}_mesh`;
            
            // Scale and position the satellite
            satelliteMesh.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            // Store the satellite mesh
            satelliteMeshes[satName] = satelliteMesh;
            
            // Add label to the satellite
            addSatelliteLabel(satName, satelliteMesh);
            
            // Make satellite clickable
            satelliteMesh.isPickable = true;
            
            // Add action manager for interaction
            satelliteMesh.actionManager = new BABYLON.ActionManager(scene);
            
            // Add hover effect
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOverTrigger,
                    () => {
                        // Change cursor to pointer
                        document.getElementById('renderCanvas').style.cursor = 'pointer';
                        
                        // Highlight effect
                        satelliteMesh.getChildMeshes().forEach(child => {
                            if (child.material) {
                                child.material.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.8);
                            }
                        });
                    }
                )
            );
            
            // Remove hover effect
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOutTrigger,
                    () => {
                        // Reset cursor
                        document.getElementById('renderCanvas').style.cursor = 'default';
                        
                        // Remove highlight
                        satelliteMesh.getChildMeshes().forEach(child => {
                            if (child.material) {
                                child.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                            }
                        });
                    }
                )
            );
            
            // Click action
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPickTrigger,
                    () => {
                        // Set as active satellite
                        activeSatellite = satName;
                        
                        // Show telemetry panel if not visible
                        if (!telemetryVisible) {
                            toggleTelemetry();
                        }
                        
                        // Update satellite selector
                        document.querySelectorAll('.sat-button').forEach(btn => {
                            btn.classList.remove('active');
                            if (btn.textContent === satName) {
                                btn.classList.add('active');
                            }
                        });
                        
                        // Update telemetry display
                        updateTelemetryUI();
                        
                        // Focus camera on satellite if in follow mode
                        if (!isFreeCamera) {
                            focusCameraOnSatellite(satName);
                        }
                    }
                )
            );
            
            // Start at initial position
            updateSatellitePosition(satName, 0);
        } catch (error) {
            console.error(`Error loading satellite model for ${satName}:`, error);
        }
    }
}

/**
 * Add a label to a satellite
 */
function addSatelliteLabel(satName, mesh) {
    const label = new TextBlock();
    label.text = satName;
    label.color = "white";
    label.fontSize = 12;
    label.resizeToFit = true;
    label.outlineWidth = 2;
    label.outlineColor = "black";
    
    const rect = new Rectangle();
    rect.width = "100px";
    rect.height = "30px";
    rect.cornerRadius = 5;
    rect.background = "black";
    rect.alpha = 0.5;
    rect.addControl(label);
    
    advancedTexture.addControl(rect);
    
    // Link the label to follow the satellite mesh
    rect.linkWithMesh(mesh);
    rect.linkOffsetY = -30;
}

/**
 * Update a satellite's position based on simulation data
 */
function updateSatellitePosition(satName, timeIndex) {
    if (!satelliteData[satName] || !satelliteMeshes[satName]) return;
    
    const trajectory = satelliteData[satName].trajectory;
    if (!trajectory || timeIndex >= trajectory.length) return;
    
    const point = trajectory[timeIndex];
    
    // Position the satellite (convert from km to scene units)
    const pos = new BABYLON.Vector3(
        point.position.x * EARTH_SCALE,
        point.position.z * EARTH_SCALE, // Swap Y and Z for Babylon.js coordinate system
        point.position.y * EARTH_SCALE
    );
    satelliteMeshes[satName].position = pos;
    
    // Calculate rotation based on velocity vector to make satellite orient in the direction of travel
    if (point.velocity) {
        const vel = new BABYLON.Vector3(
            point.velocity.x,
            point.velocity.z, // Swap Y and Z for Babylon.js
            point.velocity.y
        );
        
        if (vel.length() > 0) {
            vel.normalize();
            
            // Create rotation quaternion
            const upVector = pos.normalize();
            const forwardVector = vel;
            
            // Calculate right vector as the cross product of forward and up
            const rightVector = BABYLON.Vector3.Cross(forwardVector, upVector);
            rightVector.normalize();
            
            // Recalculate the forward vector to ensure orthogonality
            const correctedForwardVector = BABYLON.Vector3.Cross(upVector, rightVector);
            correctedForwardVector.normalize();
            
            // Create rotation matrix from the orthogonal vectors
            const rotationMatrix = BABYLON.Matrix.FromXYZAxesToRef(
                rightVector,
                upVector,
                correctedForwardVector,
                new BABYLON.Matrix()
            );
            
            // Convert to quaternion and apply
            const quaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
            satelliteMeshes[satName].rotationQuaternion = quaternion;
        }
    }
}

/**
 * Create visual paths for satellite orbits
 */
function createOrbitalPaths() {
    // Clear existing paths
    for (const satName in orbitLines) {
        if (orbitLines[satName]) {
            orbitLines[satName].dispose();
        }
    }
    orbitLines = {};
    
    // Create orbit lines for each satellite
    for (const satName in satelliteData) {
        if (satName === 'metadata') continue;
        
        const trajectory = satelliteData[satName].trajectory;
        if (!trajectory || trajectory.length === 0) continue;
        
        // Create points for the path
        const pathPoints = [];
        
        // Use a subset of points for performance (e.g., every 10th point)
        for (let i = 0; i < trajectory.length; i += 10) {
            const point = trajectory[i];
            // Convert from km to scene units
            pathPoints.push(new BABYLON.Vector3(
                point.position.x * EARTH_SCALE,
                point.position.z * EARTH_SCALE, // Swap Y and Z for Babylon.js
                point.position.y * EARTH_SCALE
            ));
        }
        
        // Close the loop
        if (pathPoints.length > 0) {
            pathPoints.push(pathPoints[0]);
        }
        
        // Create the orbit line
        const orbitLine = BABYLON.MeshBuilder.CreateLines(`${satName}_path`, {
            points: pathPoints,
            updatable: true
        }, scene);
        
        // Set color based on satellite
        if (satName.toUpperCase().includes('CRTS')) {
            orbitLine.color = BABYLON.Color3.Blue();
        } else {
            orbitLine.color = BABYLON.Color3.Green();
        }
        
        // Store the line
        orbitLines[satName] = orbitLine;
    }
}

/**
 * Start the simulation loop to update satellite positions
 */
function startSimulationLoop() {
    // Get total number of time steps from metadata
    const totalTimeSteps = satelliteData.metadata ? 
        satelliteData.metadata.total_time_steps : 0;
    
    if (totalTimeSteps <= 0) return;
    
    let currentTimeStep = 0;
    const startTime = new Date(satelliteData.metadata.start_time);
    const timeStepSeconds = satelliteData.metadata.time_step_seconds || 5;
    
    // Update simulation time display
    simulationTime = new Date(startTime);
    updateTimeDisplay();
    
    // Set up the update loop
    scene.registerBeforeRender(() => {
        // Only update on certain frames for performance
        if (scene.getFrameId() % 2 !== 0) return;
        
        // Move time forward
        currentTimeStep = (currentTimeStep + timeMultiplier) % totalTimeSteps;
        
        // Update satellite positions
        for (const satName in satelliteData) {
            if (satName === 'metadata') continue;
            updateSatellitePosition(satName, Math.floor(currentTimeStep));
        }
        
        // Update simulation time
        simulationTime = new Date(startTime.getTime() + (currentTimeStep * timeStepSeconds * 1000));
        updateTimeDisplay();
        
        // Periodically update telemetry
        if (Math.floor(currentTimeStep) % 20 === 0 && telemetryVisible) {
            loadTelemetry();
        }
    });
}

/**
 * Update the displayed simulation time
 */
function updateTimeDisplay() {
    const timeElement = document.getElementById('current-time');
    timeElement.textContent = simulationTime.toISOString().substring(11, 19); // Show HH:MM:SS
}

/**
 * Create the satellite selector UI
 */
function createSatelliteSelector() {
    const selectorElement = document.getElementById('satellite-selector');
    selectorElement.innerHTML = '';
    
    for (const satName in telemetryData) {
        const button = document.createElement('div');
        button.classList.add('sat-button');
        if (satName === activeSatellite) {
            button.classList.add('active');
        }
        button.textContent = satName;
        button.addEventListener('click', () => {
            // Set as active satellite
            activeSatellite = satName;
            
            // Update UI
            document.querySelectorAll('.sat-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Update telemetry display
            updateTelemetryUI();
            
            // Focus camera on satellite
            if (!isFreeCamera && satelliteMeshes[satName]) {
                focusCameraOnSatellite(satName);
            }
        });
        
        selectorElement.appendChild(button);
    }
    
    // Set first satellite as active if none selected
    if (!activeSatellite && Object.keys(telemetryData).length > 0) {
        activeSatellite = Object.keys(telemetryData)[0];
        const firstButton = selectorElement.querySelector('.sat-button');
        if (firstButton) {
            firstButton.classList.add('active');
        }
        updateTelemetryUI();
    }
}

/**
 * Update the telemetry panel with current data
 */
function updateTelemetryUI() {
    const telemetryElement = document.getElementById('telemetry-data');
    
    if (!activeSatellite || !telemetryData[activeSatellite]) {
        telemetryElement.innerHTML = '<div class="no-data">No telemetry data available</div>';
        return;
    }
    
    const data = telemetryData[activeSatellite];
    let html = '';
    
    // Position group
    html += '<div class="telemetry-group">';
    html += '<h3>Position</h3>';
    html += createTelemetryItem('Altitude', `${data.altitude.toFixed(2)} km`);
    html += createTelemetryItem('Latitude', `${data.latitude.toFixed(2)}°`);
    html += createTelemetryItem('Longitude', `${data.longitude.toFixed(2)}°`);
    html += '</div>';
    
    // Orbit group
    html += '<div class="telemetry-group">';
    html += '<h3>Orbit</h3>';
    html += createTelemetryItem('Velocity', `${data.velocity.toFixed(2)} km/s`);
    html += createTelemetryItem('Period', `${data.period.toFixed(2)} min`);
    html += createTelemetryItem('Inclination', `${data.inclination.toFixed(2)}°`);
    html += '</div>';
    
    // Systems group
    html += '<div class="telemetry-group">';
    html += '<h3>Systems</h3>';
    for (const system in data.systems) {
        html += createTelemetryItem(formatSystemName(system), `${data.systems[system].status} (${data.systems[system].value}%)`);
    }
    html += '</div>';
    
    telemetryElement.innerHTML = html;
}

/**
 * Create a single telemetry item display
 */
function createTelemetryItem(label, value) {
    return `<div class="telemetry-item">
        <span class="telemetry-label">${label}:</span>
        <span class="telemetry-value">${value}</span>
    </div>`;
}

/**
 * Format system name for display
 */
function formatSystemName(name) {
    return name.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Focus the camera on a specific satellite
 */
function focusCameraOnSatellite(satName) {
    if (!satelliteMeshes[satName]) return;
    
    // Display a notification
    updateStatus(`Following ${satName}`);
    
    // Switch to follow camera
    if (camera.getClassName() !== 'FollowCamera') {
        // Remove the current camera
        camera.dispose();
        
        // Create a follow camera
        camera = new BABYLON.FollowCamera('followCamera', new BABYLON.Vector3(0, 0, 0), scene);
        camera.radius = 0.8; // Distance from the target
        camera.heightOffset = 0.2; // Height above the target
        camera.rotationOffset = 180; // View from behind
        camera.cameraAcceleration = 0.05; // How fast to move the camera
        camera.maxCameraSpeed = 10; // Maximum speed of the camera
        
        // Set the target
        camera.lockedTarget = satelliteMeshes[satName];
        
        // Add a small animation to indicate the camera change
        satelliteMeshes[satName].scaling = new BABYLON.Vector3(0.015, 0.015, 0.015); // Slightly enlarge
        
        // Return to normal size after a moment
        setTimeout(() => {
            if (satelliteMeshes[satName]) {
                satelliteMeshes[satName].scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            }
        }, 1000);
    } else {
        // Update the target
        camera.lockedTarget = satelliteMeshes[satName];
    }
}

/**
 * Toggle the telemetry panel visibility
 */
function toggleTelemetry() {
    const panel = document.getElementById('telemetry-panel');
    telemetryVisible = !telemetryVisible;
    
    if (telemetryVisible) {
        panel.classList.remove('hidden');
        loadTelemetry(); // Refresh data
        
        // Update button text
        document.getElementById('toggle-telemetry').textContent = 'Hide Telemetry';
    } else {
        panel.classList.add('hidden');
        
        // Update button text
        document.getElementById('toggle-telemetry').textContent = 'Telemetry';
    }
}

/**
 * Toggle orbital path visibility
 */
function toggleOrbitalPaths() {
    pathsVisible = !pathsVisible;
    
    if (pathsVisible) {
        createOrbitalPaths();
        // Update button text
        document.getElementById('toggle-paths').textContent = 'Hide Orbits';
    } else {
        // Hide paths
        for (const satName in orbitLines) {
            if (orbitLines[satName]) {
                orbitLines[satName].dispose();
            }
        }
        orbitLines = {};
        // Update button text
        document.getElementById('toggle-paths').textContent = 'Orbits';
    }
}

/**
 * Toggle between free camera and satellite-focused camera
 */
function toggleCamera() {
    isFreeCamera = !isFreeCamera;
    
    if (isFreeCamera) {
        // Switch to arc rotate camera
        camera.dispose();
        camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 20, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(document.getElementById('renderCanvas'), true);
        camera.minZ = 0.1;
        camera.maxZ = 100000;
        camera.lowerRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 1.5;
        camera.upperRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 50;
        
        // Update button text
        document.getElementById('toggle-camera').textContent = 'Follow Mode';
    } else if (activeSatellite) {
        // Focus on active satellite
        focusCameraOnSatellite(activeSatellite);
        
        // Update button text
        document.getElementById('toggle-camera').textContent = 'Free Camera';
    }
}

/**
 * Increase simulation speed
 */
function increaseTimeSpeed() {
    if (timeMultiplier < 100) {
        timeMultiplier = timeMultiplier * 2;
        document.getElementById('time-speed').textContent = `${timeMultiplier}x`;
        updateStatus(`Simulation speed: ${timeMultiplier}x`);
        
        // Visual feedback
        document.getElementById('time-speed').style.color = '#0ea5e9';
        setTimeout(() => {
            document.getElementById('time-speed').style.color = '';
        }, 500);
    } else {
        updateStatus('Maximum simulation speed reached');
    }
}

/**
 * Decrease simulation speed
 */
function decreaseTimeSpeed() {
    if (timeMultiplier > 0.5) {
        timeMultiplier = timeMultiplier / 2;
        document.getElementById('time-speed').textContent = `${timeMultiplier}x`;
        updateStatus(`Simulation speed: ${timeMultiplier}x`);
        
        // Visual feedback
        document.getElementById('time-speed').style.color = '#0ea5e9';
        setTimeout(() => {
            document.getElementById('time-speed').style.color = '';
        }, 500);
    } else {
        updateStatus('Minimum simulation speed reached');
    }
}

/**
 * Update status message
 */
function updateStatus(message) {
    document.getElementById('status-message').textContent = message;
}

/**
 * Show the instructions overlay
 */
function showInstructions() {
    document.getElementById('instructions-overlay').style.display = 'block';
}

/**
 * Hide the instructions overlay
 */
function hideInstructions() {
    document.getElementById('instructions-overlay').style.display = 'none';
}

/**
 * Show the advanced telemetry dashboard
 */
function showAdvancedTelemetry() {
    // Only show if we have an active satellite
    if (!activeSatellite) {
        updateStatus('Select a satellite first');
        return;
    }
    
    // Set the title
    document.getElementById('dashboard-title').textContent = `${activeSatellite} Telemetry`;
    
    // Build the dashboard content
    const dashboardContent = document.getElementById('dashboard-content');
    dashboardContent.innerHTML = '';
    
    if (telemetryData[activeSatellite]) {
        const telemetry = telemetryData[activeSatellite];
        
        // Create orbital parameters card
        const orbitalCard = document.createElement('div');
        orbitalCard.className = 'telemetry-card';
        orbitalCard.innerHTML = `
            <h4>Orbital Parameters</h4>
            <div class="telemetry-item">
                <span class="telemetry-label">Semi-Major Axis:</span>
                <span>${telemetry.semiMajorAxis.toFixed(2)} km</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Eccentricity:</span>
                <span>${telemetry.eccentricity.toFixed(6)}</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Inclination:</span>
                <span>${telemetry.inclination.toFixed(2)}°</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">RAAN:</span>
                <span>${telemetry.raan.toFixed(2)}°</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Argument of Perigee:</span>
                <span>${telemetry.argOfPerigee.toFixed(2)}°</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Mean Anomaly:</span>
                <span>${telemetry.meanAnomaly.toFixed(2)}°</span>
            </div>
        `;
        dashboardContent.appendChild(orbitalCard);
        
        // Create position card
        const positionCard = document.createElement('div');
        positionCard.className = 'telemetry-card';
        positionCard.innerHTML = `
            <h4>Position</h4>
            <div class="telemetry-item">
                <span class="telemetry-label">X:</span>
                <span>${telemetry.position.x.toFixed(2)} km</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Y:</span>
                <span>${telemetry.position.y.toFixed(2)} km</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Z:</span>
                <span>${telemetry.position.z.toFixed(2)} km</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Altitude:</span>
                <span>${telemetry.altitude.toFixed(2)} km</span>
            </div>
        `;
        dashboardContent.appendChild(positionCard);
        
        // Create velocity card
        const velocityCard = document.createElement('div');
        velocityCard.className = 'telemetry-card';
        velocityCard.innerHTML = `
            <h4>Velocity</h4>
            <div class="telemetry-item">
                <span class="telemetry-label">X:</span>
                <span>${telemetry.velocity.x.toFixed(2)} km/s</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Y:</span>
                <span>${telemetry.velocity.y.toFixed(2)} km/s</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Z:</span>
                <span>${telemetry.velocity.z.toFixed(2)} km/s</span>
            </div>
            <div class="telemetry-item">
                <span class="telemetry-label">Speed:</span>
                <span>${telemetry.speed.toFixed(2)} km/s</span>
            </div>
        `;
        dashboardContent.appendChild(velocityCard);
        
        // Create mission parameters card (if available)
        if (telemetry.missionParameters) {
            const missionCard = document.createElement('div');
            missionCard.className = 'telemetry-card';
            missionCard.innerHTML = `
                <h4>Mission Parameters</h4>
                <div class="telemetry-item">
                    <span class="telemetry-label">Launch Date:</span>
                    <span>${telemetry.missionParameters.launchDate}</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Mission Duration:</span>
                    <span>${telemetry.missionParameters.duration} days</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Status:</span>
                    <span>${telemetry.missionParameters.status}</span>
                </div>
            `;
            dashboardContent.appendChild(missionCard);
        }
    }
    
    // Show the dashboard
    document.querySelector('.telemetry-dashboard').classList.add('visible');
}

/**
 * Hide the advanced telemetry dashboard
 */
function hideAdvancedTelemetry() {
    document.querySelector('.telemetry-dashboard').classList.remove('visible');
}

/**
 * Reset the camera position
 */
function resetCamera() {
    camera.position = new BABYLON.Vector3(0, 0, 20);
    camera.setTarget(BABYLON.Vector3.Zero());
}

/**
 * Manually rotate the Earth left
 */
function rotateEarthLeft() {
    if (earthMesh) {
        earthMesh.rotation.y -= 0.1;
    }
}

/**
 * Manually rotate the Earth right
 */
function rotateEarthRight() {
    if (earthMesh) {
        earthMesh.rotation.y += 0.1;
    }
}

// Initialize the application when the window loads
window.addEventListener('DOMContentLoaded', initApp);

// Export any functions that need to be accessed globally
window.initializeSimulation = initializeSimulation;
window.toggleTelemetry = toggleTelemetry;
window.toggleOrbitalPaths = toggleOrbitalPaths;
window.toggleCamera = toggleCamera;
