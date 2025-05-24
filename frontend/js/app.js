import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';

// Globals
let engine;
let scene;
let camera;
let earthMesh;
let moonMesh;
let satelliteMeshes = {};
let orbitLines = {};
let timeMultiplier = 0.1; // Slowed down for more appealing visualization
let lastTimeMultiplier = 0.1;
let simulationTime = new Date();
let satelliteData = {};
let telemetryData = {};
let activeSatellite = null;
let isInitialized = false;
let sceneLoaded = false;
let advancedTexture; // Define globally to fix the error

const EARTH_RADIUS = 6371; // km
const EARTH_SCALE = 0.001;
const MOON_DISTANCE = 384400 * EARTH_SCALE;
const MOON_SCALE = 0.27;

async function initApp() {
    // Initialize UI first
    initBrandUI();
    
    createScene();
    engine.runRenderLoop(() => {
        scene.render();
        if (scene.isReady() && !sceneLoaded) {
            hideLoadingScreen();
            sceneLoaded = true;
            
            // Initialize keyboard controls once the scene is loaded
            setupKeyboardControls();
            
            // Show welcome modal for first-time users
            showWelcomeModal();
        }
    });
    window.addEventListener('resize', () => engine.resize());
}

async function createScene() {
    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, { stencil: true });
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 20, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;
    camera.maxZ = 100000;
    camera.lowerRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 1.5;
    camera.upperRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 50;
    
    // Create sunlight as directional light for proper terminator line
    const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(1, 0, 0), scene);
    sunLight.intensity = 1.0;
    sunLight.diffuse = new BABYLON.Color3(1, 1, 0.9);
    
    // Add ambient light to ensure the dark side isn't completely black
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.1;
    ambientLight.diffuse = new BABYLON.Color3(0.2, 0.2, 0.4);
    ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    
    // Initialize the advanced texture for satellite labels
    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    
    createSkybox();
    await createEarth();
    await createMoon();
    await loadSatelliteData();
}

function createSkybox() {
    // Create a large skybox to contain the stars
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size:1000.0}, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
    skyboxMaterial.backFaceCulling = false;
    
    // Remove diffuse and specular to prevent shiny surfaces
    skyboxMaterial.diffuseTexture = null;
    skyboxMaterial.specularTexture = null;
    
    // Create a CubeTexture for better starfield rendering
    // This provides a more realistic wrap-around skybox effect with stars
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/starfield/stars", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    
    // Ensure maximum brightness of stars by disabling lighting effects
    skyboxMaterial.disableLighting = true;
    
    skybox.material = skyboxMaterial;
    
    // Add particle system for closer stars that move with parallax effect
    const starsParticles = new BABYLON.ParticleSystem("stars", 2000, scene);
    starsParticles.particleTexture = new BABYLON.Texture("assets/particle_star.png", scene);
    
    // Set particles properties
    starsParticles.minSize = 0.1;
    starsParticles.maxSize = 0.5;
    starsParticles.minLifeTime = Number.MAX_SAFE_INTEGER;
    starsParticles.maxLifeTime = Number.MAX_SAFE_INTEGER;
    starsParticles.emitRate = 2000;
    starsParticles.color1 = new BABYLON.Color4(0.9, 0.9, 1.0, 1.0);
    starsParticles.color2 = new BABYLON.Color4(0.8, 0.8, 1.0, 1.0);
    
    // Set emission box - stars will appear in a 500x500x500 box
    starsParticles.minEmitBox = new BABYLON.Vector3(-250, -250, -250);
    starsParticles.maxEmitBox = new BABYLON.Vector3(250, 250, 250);
    
    // Start the particle system
    starsParticles.start();
}

async function createEarth() {
    earthMesh = BABYLON.MeshBuilder.CreateSphere('earth', { 
        segments: 64, 
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE 
    }, scene);
    
    // Apply Earth's axial tilt (23.5 degrees)
    const EARTH_TILT = 23.5 * Math.PI / 180;
    earthMesh.rotation.x = EARTH_TILT;
    
    // Flip Earth vertically (rotate 180 degrees around Z-axis)
    earthMesh.rotation.z = Math.PI;
    
    // Create a PBR material for more realistic Earth rendering
    const earthMaterial = new BABYLON.PBRMaterial('earthPBRMaterial', scene);
    
    // Base albedo (day texture)
    earthMaterial.albedoTexture = new BABYLON.Texture('assets/earth_diffuse.jpg', scene);
    
    // Metallic-roughness properties
    earthMaterial.metallic = 0.0;
    earthMaterial.roughness = 0.8;
    
    // Emissive for night lights
    earthMaterial.emissiveTexture = new BABYLON.Texture('assets/earth_night.jpg', scene);
    earthMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    
    // Add Fresnel effect to enhance day-night transition
    earthMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    earthMaterial.emissiveFresnelParameters.bias = 0.2;
    earthMaterial.emissiveFresnelParameters.power = 1;
    earthMaterial.emissiveFresnelParameters.leftColor = BABYLON.Color3.White();
    earthMaterial.emissiveFresnelParameters.rightColor = BABYLON.Color3.Black();
    
    // Create a subsurface layer for atmosphere effect
    const atmosphereMaterial = new BABYLON.StandardMaterial('atmosphereMaterial', scene);
    atmosphereMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.5, 1.0);
    atmosphereMaterial.alpha = 0.15;
    
    const atmosphereMesh = BABYLON.MeshBuilder.CreateSphere('atmosphere', { 
        segments: 64, 
        diameter: EARTH_RADIUS * 2.05 * EARTH_SCALE  
    }, scene);
    atmosphereMesh.material = atmosphereMaterial;
    atmosphereMesh.parent = earthMesh;
    
    // Create cloud layer
    const cloudsMaterial = new BABYLON.StandardMaterial('cloudsMaterial', scene);
    cloudsMaterial.diffuseTexture = new BABYLON.Texture('assets/earth_clouds.jpg', scene);
    cloudsMaterial.diffuseTexture.hasAlpha = true;
    cloudsMaterial.useAlphaFromDiffuseTexture = true;
    cloudsMaterial.backFaceCulling = false;
    cloudsMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    cloudsMaterial.alpha = 0.7; // Make clouds slightly transparent
    
    const cloudsMesh = BABYLON.MeshBuilder.CreateSphere('clouds', { 
        segments: 64, 
        diameter: EARTH_RADIUS * 2.02 * EARTH_SCALE  
    }, scene);
    cloudsMesh.material = cloudsMaterial;
    
    // Apply same rotation to clouds
    cloudsMesh.rotation.x = EARTH_TILT;
    cloudsMesh.rotation.z = Math.PI;
    cloudsMesh.parent = earthMesh;
    
    earthMesh.material = earthMaterial;
    
    // Make cloud layer rotate slightly faster than Earth for effect
    // Use much slower rotation speed (real Earth rotates once per day)
    scene.registerBeforeRender(() => {
        const rotationSpeed = (0.05 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
        earthMesh.rotation.y += rotationSpeed;
        cloudsMesh.rotation.y += rotationSpeed * 1.05; // Clouds rotate slightly faster
    });
}

async function createMoon() {
    moonMesh = BABYLON.MeshBuilder.CreateSphere('moon', { 
        segments: 32, 
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE * MOON_SCALE 
    }, scene);
    
    moonMesh.position = new BABYLON.Vector3(0, 0, MOON_DISTANCE);
    
    const moonMaterial = new BABYLON.StandardMaterial('moonMaterial', scene);
    moonMaterial.diffuseTexture = new BABYLON.Texture('assets/moon_texture.jpg', scene);
    
    moonMesh.material = moonMaterial;
    
    const moonPivot = new BABYLON.TransformNode('moonPivot', scene);
    moonMesh.parent = moonPivot;
    
    scene.registerBeforeRender(() => {
        // Moon orbits approximately once every 27.3 days, slowed down for visualization
        moonPivot.rotation.y += (0.03 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
    });
}

async function loadSatelliteData() {
    try {
        const response = await fetch('/api/simulation_data');
        satelliteData = await response.json();
        await createSatellites();
        startSimulationLoop();
    } catch (error) {
        console.error('Error loading satellite data:', error);
    }
}

async function createSatellites() {
    for (const satName in satelliteMeshes) {
        if (satelliteMeshes[satName]) {
            satelliteMeshes[satName].dispose();
        }
    }
    satelliteMeshes = {};
    
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
            addSatelliteLabel(satName, satelliteMesh);
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
            satelliteMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPickTrigger,
                    () => {
                        activeSatellite = satName;
                        updateTelemetryUI();
                    }
                )
            );
            updateSatellitePosition(satName, 0);
        } catch (error) {
            console.error(`Error loading satellite model for ${satName}:`, error);
        }
    }
}

function addSatelliteLabel(satName, mesh) {
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
        activeSatellite = satName;
        updateTelemetryUI();
    });
    
    advancedTexture.addControl(rect);
    rect.linkWithMesh(mesh);
    rect.linkOffsetY = -70; // Position label higher above satellite
    rect.isVisible = true;
}

function updateSatellitePosition(satName, timeIndex) {
    if (!satelliteData[satName] || !satelliteMeshes[satName]) return;
    
    const trajectory = satelliteData[satName].trajectory;
    if (!trajectory || timeIndex >= trajectory.length) return;
    
    const point = trajectory[timeIndex];
    
    // Improved coordinate transformation between Skyfield/Python and Babylon.js
    // Skyfield uses a different coordinate system orientation than Babylon.js
    
    // Adjust scaling to ensure proper visualization
    // Skyfield returns positions in km, we need to scale them for our visualization
    const scaleFactor = EARTH_SCALE;
    
    // Apply coordinate transformation: swapping axes to match Babylon.js conventions
    // X remains the same, but Y and Z are swapped and Z is negated
    const pos = new BABYLON.Vector3(
        point.position.x * scaleFactor,
        point.position.z * scaleFactor,  // Swap Y and Z for proper orientation
        point.position.y * scaleFactor
    );
    
    // Calculate minimum allowable altitude (e.g., 500km above Earth surface)
    const minAltitude = EARTH_RADIUS * EARTH_SCALE * 1.1; // 10% above Earth radius
    
    // Ensure satellites aren't positioned inside or too close to the Earth
    const positionLength = pos.length();
    if (positionLength < minAltitude) {
        // If satellite position is too close to Earth (due to scale or data issues)
        // Normalize the direction vector and set position at minimum allowable altitude
        const directionFromCenter = pos.normalizeToNew();
        pos.copyFrom(directionFromCenter.scale(minAltitude));
        console.log(`Adjusted position for ${satName}: too close to Earth`);
    }
    
    // Apply the calculated position to the satellite mesh
    satelliteMeshes[satName].position = pos;
    
    // Update satellite orientation based on velocity vector if available
    if (point.velocity) {
        // Apply same coordinate transformation to velocity vector
        const vel = new BABYLON.Vector3(
            point.velocity.x,
            point.velocity.z,
            point.velocity.y
        );
        
        if (vel.length() > 0) {
            // Normalize velocity vector to create direction vector
            vel.normalize();
            
            // Calculate the direction from Earth's center to the satellite (up vector)
            const upVector = pos.normalize();
            
            // Use velocity as forward direction
            const forwardVector = vel;
            
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
    }
    
    // Update label position if needed
    const labelControl = advancedTexture.getControlByName(`${satName}_label`);
    if (labelControl) {
        // Adjust label position to be above the satellite
        labelControl.linkOffsetY = -70;
    }
}

function startSimulationLoop() {
    const totalTimeSteps = satelliteData.metadata ? 
        satelliteData.metadata.total_time_steps : 0;
    
    if (totalTimeSteps <= 0) return;
    
    let currentTimeStep = 0;
    const startTime = new Date(satelliteData.metadata.start_time);
    const timeStepSeconds = satelliteData.metadata.time_step_seconds || 5;
    
    // Simulation ratio: 60:1 time acceleration (1 minute of real time = 1 second in simulation)
    const TIME_ACCELERATION = 60;
    
    simulationTime = new Date(startTime);
    updateTimeDisplay();
    
    scene.registerBeforeRender(() => {
        if (scene.getFrameId() % 2 !== 0) return;
        
        // Use adjusted time multiplier for more appealing visualization
        currentTimeStep = (currentTimeStep + (timeMultiplier * TIME_ACCELERATION)) % totalTimeSteps;
        
        for (const satName in satelliteData) {
            if (satName === 'metadata') continue;
            updateSatellitePosition(satName, Math.floor(currentTimeStep));
        }
        
        simulationTime = new Date(startTime.getTime() + (currentTimeStep * timeStepSeconds * 1000));
        
        // Only update time display every 30 frames for performance
        if (scene.getFrameId() % 30 === 0) {
            updateTimeDisplay();
        }
    });
}

function updateTimeDisplay() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        // Show date and time in a clean format
        const options = { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        };
        timeElement.textContent = simulationTime.toLocaleDateString('en-US', options) + ' UTC';
    }
}

function updateTelemetryUI() {
    const telemetryElement = document.getElementById('telemetry-data');
    
    if (!activeSatellite || !telemetryData[activeSatellite]) {
        telemetryElement.innerHTML = '<div class="no-data">No telemetry data available</div>';
        return;
    }
    
    const data = telemetryData[activeSatellite];
    let html = '';
    
    html += '<div class="telemetry-group">';
    html += '<h3>Position</h3>';
    html += createTelemetryItem('Altitude', `${data.altitude.toFixed(2)} km`);
    html += createTelemetryItem('Latitude', `${data.latitude.toFixed(2)}°`);
    html += createTelemetryItem('Longitude', `${data.longitude.toFixed(2)}°`);
    html += '</div>';
    
    html += '<div class="telemetry-group">';
    html += '<h3>Orbit</h3>';
    html += createTelemetryItem('Velocity', `${data.velocity.toFixed(2)} km/s`);
    html += createTelemetryItem('Period', `${data.period.toFixed(2)} min`);
    html += createTelemetryItem('Inclination', `${data.inclination.toFixed(2)}°`);
    html += '</div>';
    
    html += '<div class="telemetry-group">';
    html += '<h3>Systems</h3>';
    for (const system in data.systems) {
        html += createTelemetryItem(formatSystemName(system), `${data.systems[system].status} (${data.systems[system].value}%)`);
    }
    html += '</div>';
    
    telemetryElement.innerHTML = html;
}

function createTelemetryItem(label, value) {
    return `<div class="telemetry-item">
        <span class="telemetry-label">${label}:</span>
        <span class="telemetry-value">${value}</span>
    </div>`;
}

function formatSystemName(name) {
    return name.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
}

function showAdvancedTelemetry() {
    if (!activeSatellite) {
        updateStatus('Select a satellite first');
        return;
    }
    
    document.getElementById('dashboard-title').textContent = `${activeSatellite} Telemetry`;
    
    const dashboardContent = document.getElementById('dashboard-content');
    dashboardContent.innerHTML = '';
    
    if (telemetryData[activeSatellite]) {
        const telemetry = telemetryData[activeSatellite];
        
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
    
    document.getElementById('advanced-telemetry').style.display = 'block';
}

function hideAdvancedTelemetry() {
    document.getElementById('advanced-telemetry').style.display = 'none';
}

// Add keyboard controls
function setupKeyboardControls() {
    // Track simulation paused state
    let isPaused = false;
    let previousTimeMultiplier = timeMultiplier;
    
    // Set up key handlers
    scene.onKeyboardObservable.add((kbInfo) => {
        // Only react to key down events
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            switch (kbInfo.event.key) {
                case 'r':
                case 'R':
                    // Reset camera to default position
                    camera.alpha = -Math.PI / 2;
                    camera.beta = Math.PI / 2;
                    camera.radius = EARTH_RADIUS * EARTH_SCALE * 3;
                    break;
                
                case ' ':
                    // Space key toggles pause/resume
                    isPaused = !isPaused;
                    if (isPaused) {
                        previousTimeMultiplier = timeMultiplier;
                        timeMultiplier = 0;
                        updateStatus("Simulation paused");
                    } else {
                        timeMultiplier = previousTimeMultiplier;
                        updateStatus("Simulation resumed");
                    }
                    break;
                
                case '+':
                case '=':
                    // Speed up simulation
                    timeMultiplier = Math.min(timeMultiplier * 2, 10);
                    updateStatus(`Simulation speed: ${timeMultiplier.toFixed(1)}x`);
                    break;
                
                case '-':
                case '_':
                    // Slow down simulation
                    timeMultiplier = Math.max(timeMultiplier / 2, 0.1);
                    updateStatus(`Simulation speed: ${timeMultiplier.toFixed(1)}x`);
                    break;
                
                case 'Escape':
                    // Close any open overlays
                    hideInstructions();
                    hideAdvancedTelemetry();
                    break;
                
                case 'h':
                case 'H':
                case '?':
                    // Show instructions
                    showInstructions();
                    break;
            }
        }
    });
}

// Add a status update function
function updateStatus(message, duration = 2000) {
    // Create status element if it doesn't exist
    let statusElement = document.getElementById('status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'status-message';
        statusElement.className = 'status-message';
        document.getElementById('renderCanvas-container').appendChild(statusElement);
    }
    
    // Set message and make visible
    statusElement.textContent = message;
    statusElement.classList.add('visible');
    
    // Auto-hide after duration
    setTimeout(() => {
        statusElement.classList.remove('visible');
    }, duration);
}

// =========================================== //
// BRAND UI FUNCTIONS                          //
// =========================================== //

// Space facts for loading screen
const spaceFacts = [
    "Did you know? There are over 34,000 objects larger than 10cm currently orbiting Earth.",
    "The International Space Station travels at approximately 28,000 km/h around Earth.",
    "Low Earth Orbit extends from about 160km to 2,000km above Earth's surface.",
    "Satellites in geostationary orbit complete one revolution in exactly 24 hours.",
    "The first artificial satellite, Sputnik 1, was launched on October 4, 1957.",
    "Space debris is tracked by global surveillance networks to prevent collisions.",
    "The Kessler Syndrome describes a cascade effect of space debris collisions.",
    "CubeSats are standardized miniature satellites used for space research."
];

// Initialize brand UI components
function initBrandUI() {
    // Set random space fact
    const spaceFactElement = document.getElementById('space-fact');
    if (spaceFactElement) {
        const randomFact = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
        spaceFactElement.querySelector('p').textContent = randomFact;
    }
    
    // Initialize panel toggle
    initPanelToggle();
    
    // Initialize welcome modal
    initWelcomeModal();
    
    // Initialize info panel
    initInfoPanel();
    
    // Initialize time display
    initTimeDisplay();
    
    // Initialize telemetry dashboard
    initTelemetryDashboard();
}

// Panel toggle functionality
function initPanelToggle() {
    const panelToggle = document.getElementById('panel-toggle');
    const infoPanel = document.getElementById('info-panel');
    
    if (panelToggle && infoPanel) {
        panelToggle.addEventListener('click', () => {
            const isVisible = infoPanel.classList.contains('visible');
            
            if (isVisible) {
                infoPanel.classList.remove('visible');
                panelToggle.classList.remove('active');
            } else {
                infoPanel.classList.add('visible');
                panelToggle.classList.add('active');
            }
        });
    }
}

// Welcome modal functionality
function initWelcomeModal() {
    const gotItBtn = document.getElementById('got-it-btn');
    const welcomeModal = document.getElementById('welcome-modal');
    
    if (gotItBtn && welcomeModal) {
        gotItBtn.addEventListener('click', () => {
            welcomeModal.style.display = 'none';
            sessionStorage.setItem('welcomeModalShown', 'true');
        });
    }
}

// Info panel functionality
function initInfoPanel() {
    const closePanel = document.getElementById('close-panel');
    const showTutorial = document.getElementById('show-tutorial');
    const infoPanel = document.getElementById('info-panel');
    const welcomeModal = document.getElementById('welcome-modal');
    const panelToggle = document.getElementById('panel-toggle');
    
    if (closePanel && infoPanel && panelToggle) {
        closePanel.addEventListener('click', () => {
            infoPanel.classList.remove('visible');
            panelToggle.classList.remove('active');
        });
    }
    
    if (showTutorial && welcomeModal) {
        showTutorial.addEventListener('click', () => {
            welcomeModal.style.display = 'flex';
        });
    }
}

// Time display functionality
function initTimeDisplay() {
    const timeDisplay = document.getElementById('current-time');
    
    function updateTime() {
        if (timeDisplay) {
            const now = new Date();
            const utcTime = now.toUTCString().split(' ')[4]; // Extract time part
            timeDisplay.textContent = `${utcTime} UTC`;
        }
    }
    
    // Update time immediately and then every second
    updateTime();
    setInterval(updateTime, 1000);
}

// Telemetry dashboard functionality
function initTelemetryDashboard() {
    const closeDashboard = document.querySelector('.close-dashboard');
    const telemetryDashboard = document.getElementById('advanced-telemetry');
    
    if (closeDashboard && telemetryDashboard) {
        closeDashboard.addEventListener('click', () => {
            hideAdvancedTelemetry();
        });
    }
}

// Hide loading screen with smooth transition
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Show welcome modal for first-time users
function showWelcomeModal() {
    const welcomeModalShown = sessionStorage.getItem('welcomeModalShown') === 'true';
    const welcomeModal = document.getElementById('welcome-modal');
    
    if (!welcomeModalShown && welcomeModal) {
        // Show modal after a brief delay
        setTimeout(() => {
            welcomeModal.style.display = 'flex';
        }, 1000);
    }
}

window.addEventListener('DOMContentLoaded', initApp);
