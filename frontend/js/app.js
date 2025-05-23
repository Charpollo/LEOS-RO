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
let timeMultiplier = 1;
let lastTimeMultiplier = 1;
let simulationTime = new Date();
let satelliteData = {};
let telemetryData = {};
let activeSatellite = null;
let isInitialized = false;
let sceneLoaded = false;

const EARTH_RADIUS = 6371; // km
const EARTH_SCALE = 0.001;
const MOON_DISTANCE = 384400 * EARTH_SCALE;
const MOON_SCALE = 0.27;

async function initApp() {
    createScene();
    engine.runRenderLoop(() => {
        scene.render();
        if (scene.isReady() && !sceneLoaded) {
            document.getElementById('loading-screen').style.display = 'none';
            sceneLoaded = true;
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
    new BABYLON.HemisphericLight('sunLight', new BABYLON.Vector3(1, 0, 0), scene);
    new BABYLON.PointLight('sunPointLight', new BABYLON.Vector3(100, 0, 0), scene);
    createSkybox();
    await createEarth();
    await createMoon();
    await loadSatelliteData();
}

function createSkybox() {
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size:1000.0}, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.diffuseTexture = null;
    skyboxMaterial.specularTexture = null;
    skyboxMaterial.reflectionTexture = new BABYLON.Texture("assets/stars.png", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.FIXED_EQUIRECTANGULAR_MODE;
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
}

async function createEarth() {
    earthMesh = BABYLON.MeshBuilder.CreateSphere('earth', { 
        segments: 64, 
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE 
    }, scene);
    
    const earthMaterial = new BABYLON.StandardMaterial('earthMaterial', scene);
    earthMaterial.diffuseTexture = new BABYLON.Texture('assets/earth_diffuse.jpg', scene);
    earthMaterial.specularTexture = new BABYLON.Texture('assets/earth_specular.tif', scene);
    earthMaterial.emissiveTexture = new BABYLON.Texture('assets/earth_night.jpg', scene);
    
    const cloudsMaterial = new BABYLON.StandardMaterial('cloudsMaterial', scene);
    cloudsMaterial.diffuseTexture = new BABYLON.Texture('assets/earth_clouds.jpg', scene);
    cloudsMaterial.diffuseTexture.hasAlpha = true;
    cloudsMaterial.useAlphaFromDiffuseTexture = true;
    cloudsMaterial.backFaceCulling = false;
    cloudsMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    
    const cloudsMesh = BABYLON.MeshBuilder.CreateSphere('clouds', { 
        segments: 64, 
        diameter: EARTH_RADIUS * 2.02 * EARTH_SCALE  
    }, scene);
    cloudsMesh.material = cloudsMaterial;
    cloudsMesh.parent = earthMesh;
    
    earthMesh.material = earthMaterial;
    
    scene.registerBeforeRender(() => {
        earthMesh.rotation.y += (0.25 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
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
        moonPivot.rotation.y += (13.2 * Math.PI / 180 / 24) * timeMultiplier * (scene.getAnimationRatio() || 1);
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
    rect.linkWithMesh(mesh);
    rect.linkOffsetY = -30;
}

function updateSatellitePosition(satName, timeIndex) {
    if (!satelliteData[satName] || !satelliteMeshes[satName]) return;
    
    const trajectory = satelliteData[satName].trajectory;
    if (!trajectory || timeIndex >= trajectory.length) return;
    
    const point = trajectory[timeIndex];
    const pos = new BABYLON.Vector3(
        point.position.x * EARTH_SCALE,
        point.position.z * EARTH_SCALE,
        point.position.y * EARTH_SCALE
    );
    satelliteMeshes[satName].position = pos;
    
    if (point.velocity) {
        const vel = new BABYLON.Vector3(
            point.velocity.x,
            point.velocity.z,
            point.velocity.y
        );
        
        if (vel.length() > 0) {
            vel.normalize();
            const upVector = pos.normalize();
            const forwardVector = vel;
            const rightVector = BABYLON.Vector3.Cross(forwardVector, upVector);
            rightVector.normalize();
            const correctedForwardVector = BABYLON.Vector3.Cross(upVector, rightVector);
            correctedForwardVector.normalize();
            const rotationMatrix = BABYLON.Matrix.FromXYZAxesToRef(
                rightVector,
                upVector,
                correctedForwardVector,
                new BABYLON.Matrix()
            );
            const quaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
            satelliteMeshes[satName].rotationQuaternion = quaternion;
        }
    }
}

function startSimulationLoop() {
    const totalTimeSteps = satelliteData.metadata ? 
        satelliteData.metadata.total_time_steps : 0;
    
    if (totalTimeSteps <= 0) return;
    
    let currentTimeStep = 0;
    const startTime = new Date(satelliteData.metadata.start_time);
    const timeStepSeconds = satelliteData.metadata.time_step_seconds || 5;
    
    simulationTime = new Date(startTime);
    updateTimeDisplay();
    
    scene.registerBeforeRender(() => {
        if (scene.getFrameId() % 2 !== 0) return;
        
        currentTimeStep = (currentTimeStep + timeMultiplier) % totalTimeSteps;
        
        for (const satName in satelliteData) {
            if (satName === 'metadata') continue;
            updateSatellitePosition(satName, Math.floor(currentTimeStep));
        }
        
        simulationTime = new Date(startTime.getTime() + (currentTimeStep * timeStepSeconds * 1000));
        updateTimeDisplay();
    });
}

function updateTimeDisplay() {
    const timeElement = document.getElementById('current-time');
    timeElement.textContent = simulationTime.toISOString().substring(11, 19);
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

function showInstructions() {
    document.getElementById('instructions-overlay').style.display = 'block';
}

function hideInstructions() {
    document.getElementById('instructions-overlay').style.display = 'none';
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
    
    document.querySelector('.telemetry-dashboard').classList.add('visible');
}

function hideAdvancedTelemetry() {
    document.querySelector('.telemetry-dashboard').classList.remove('visible');
}

window.addEventListener('DOMContentLoaded', initApp);
