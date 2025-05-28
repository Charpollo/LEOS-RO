import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';

// Import UI components and manager
import './components/telemetry-card.js';
import './components/telemetry-item.js';
import { uiManager } from './ui/manager.js';
import { initBrandUI, hideLoadingScreen, showWelcomeModal } from './ui/brand-ui.js';
import { createTelemetryItem } from './ui/template-manager.js';

// Import our modular components
import { EARTH_RADIUS, EARTH_SCALE, MIN_LEO_ALTITUDE_KM, MOON_DISTANCE, MOON_SCALE } from './constants.js';
import { createSkybox } from './skybox.js';
import { createEarth } from './earth.js';
import { createMoon } from './moon.js';
import { createSatellites, getSatelliteMeshes, getTelemetryData, updateSatelliteFromOrbitalElements } from './satellites.js';
import { updateTelemetryUI } from './telemetry.js';
import { startSimulationLoop, updateTimeDisplay } from './simulation.js';
import { setupKeyboardControls } from './controls.js';

// Globals
let engine;
let scene;
let camera;
let earthMesh;
let moonMesh;
let satelliteData = {};
let activeSatellite = null;
let isInitialized = false;
let sceneLoaded = false;
let advancedTexture; 

// Use a shared state object for timeMultiplier
const simState = {
    timeMultiplier: 0.1, // Slowed down for more appealing visualization
    lastTimeMultiplier: 0.1
};

// Orbital elements and real-time calculation data
let orbitalElements = {};
let simulationStartTime = new Date();
let simulationTime = new Date();
let sunDirection = new BABYLON.Vector3(1, 0, 0);

async function initApp() {
    // Delay UI initialization until after scene is created for better startup performance
    setTimeout(() => {
        initBrandUI();
    }, 100);
    
    // Create scene with performance optimizations
    createScene();
    
    // Use a throttled render loop for better performance
    let lastRender = performance.now();
    const targetFPS = 30; // Limit to 30 FPS for better performance
    const frameTime = 1000 / targetFPS;
    
    engine.runRenderLoop(() => {
        const now = performance.now();
        const delta = now - lastRender;
        
        // Throttle rendering to target FPS
        if (delta > frameTime) {
            scene.render();
            lastRender = now - (delta % frameTime);
            
            if (scene.isReady() && !sceneLoaded) {
                hideLoadingScreen();
                sceneLoaded = true;
                // Initialize keyboard controls once the scene is loaded
                setupKeyboardControls(
                    camera,
                    (v) => { simState.lastTimeMultiplier = simState.timeMultiplier; simState.timeMultiplier = v; },
                    () => simState.timeMultiplier
                );
                
                // Show welcome modal after a slight delay
                setTimeout(() => {
                    showWelcomeModal();
                }, 500);
            }
        }
    });
    
    // Throttle resize events for better performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            engine.resize();
        }, 100);
    });
    
    // Listen for satellite selection events
    window.addEventListener('satelliteSelected', (event) => {
        activeSatellite = event.detail.name;
        updateTelemetryUI(activeSatellite, getTelemetryData());
    });
}

async function createScene() {
    const canvas = document.getElementById('renderCanvas');
    
    // Configure engine for better performance and visual quality
    engine = new BABYLON.Engine(canvas, true, { 
        stencil: true,
        deterministicLockstep: false,
        lockstepMaxSteps: 4,
        adaptToDeviceRatio: true, // Enable for proper scaling with device DPI
        antialias: true // Enable antialiasing for better visual quality
    });
    
    // Keep canvas at native resolution for proper texture rendering
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Create scene with optimized parameters
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Pure black background
    scene.skipPointerMovePicking = true; // Skip pointer move picking for better performance
    scene.autoClear = true; // Enable auto clear to prevent dark artifacts
    scene.autoClearDepthAndStencil = true;
    
    // Create camera with optimized settings first (before any rendering pipelines)
    camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 20, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.01;
    camera.maxZ = 10000;
    camera.lowerRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 0.95; // Allow zoom just above surface
    camera.upperRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 100; // Allow zoom far out
    camera.useAutoRotationBehavior = false;
    camera.inertia = 0.7; // Slightly higher for smoother movement
    camera.wheelDeltaPercentage = 0.04; // Smoother zoom
    
    // Set initial camera position for better Earth view
    camera.setPosition(new BABYLON.Vector3(
        EARTH_RADIUS * EARTH_SCALE * 3,
        EARTH_RADIUS * EARTH_SCALE * 2,
        EARTH_RADIUS * EARTH_SCALE * 3
    ));
    
    // Create proper lighting system - Realistic directional sunlight
    // Main directional light (sun) - single light source as in real life
    const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(1, 0, 0), scene);
    sunLight.intensity = 1.4; // Moderate intensity to prevent overexposure
    sunLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.92); // Warm sunlight color
    sunLight.specular = new BABYLON.Color3(0.3, 0.3, 0.3); // Very low specular to avoid unrealistic shiny appearance
    scene.sunLight = sunLight;

    // Almost entirely eliminate ambient light for a realistic hard terminator
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.01; // Extremely low - just enough to avoid complete black
    ambientLight.diffuse = new BABYLON.Color3(0.2, 0.2, 0.4); // Slight blue tint for space-scattered light
    ambientLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    scene.ambientLight = ambientLight;
    
    // Disable glow layer to prevent unwanted shadow effects
    // const glowLayer = new BABYLON.GlowLayer('atmosphericGlow', scene);
    
    // Only now create the rendering pipeline to ensure camera is properly initialized
    const renderingPipeline = new BABYLON.DefaultRenderingPipeline(
        "renderingPipeline", 
        true,  // HDR not needed for our visualization
        scene,
        [camera] // Pass initialized camera
    );
    
    // Disable bloom and tone mapping to prevent color shifts and blur
    renderingPipeline.bloomEnabled = false;
    
    // Disable image processing to prevent tone mapping artifacts
    renderingPipeline.imageProcessingEnabled = false;
    
    // Disable chroma shift to prevent edge artifacts
    renderingPipeline.chromaticAberrationEnabled = false;
    
    // Disable grain for cleaner image
    renderingPipeline.grainEnabled = false;

    // Disable depth of field to prevent blur
    renderingPipeline.depthOfFieldEnabled = false;
    
    // Initialize the advanced texture for satellite labels
    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    advancedTexture.renderScale = 1;
    
    // Create the skybox first (background)
    createSkybox(scene);
    
    // Then create Earth and Moon
    earthMesh = await createEarth(scene, () => simState.timeMultiplier, sunDirection);
    moonMesh = await createMoon(scene, () => simState.timeMultiplier);
    
    // Finally load satellite data
    await loadSatelliteData();
}

async function loadSatelliteData() {
    try {
        // Use the optimized lightweight API endpoint instead of heavy simulation_data
        const response = await fetch('/api/orbital_elements');
        const data = await response.json();
        
        // Store orbital elements for real-time calculation
        orbitalElements = data.satellites;
        
        // Initialize simulation start time
        if (data.metadata && data.metadata.simulation_start) {
            simulationStartTime = new Date(data.metadata.simulation_start);
        } else {
            simulationStartTime = new Date();
        }
        
        // Create a lightweight version of satelliteData for compatibility
        satelliteData = {
            metadata: {
                start_time: simulationStartTime.toISOString(),
                time_step_seconds: 5,
                total_time_steps: 17280 // For compatibility with UI
            }
        };
        
        // Add initial trajectory point for each satellite
        Object.keys(orbitalElements).forEach(satName => {
            satelliteData[satName] = {
                trajectory: [{ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }]
            };
        });
        
        // Create satellites using the imported module
        await createSatellites(scene, satelliteData, orbitalElements, activeSatellite, advancedTexture, simulationTime);
        
        // Start the simulation loop using the imported module
        simulationTime = startSimulationLoop(scene, satelliteData, orbitalElements, simulationStartTime, () => simState.timeMultiplier, advancedTexture, activeSatellite, getTelemetryData());
    } catch (error) {
        console.error('Error loading satellite data:', error);
    }
}

// All satellite related functions have been moved to satellites.js

// Removed all Brand UI functions since they've been moved

window.addEventListener('DOMContentLoaded', initApp);
