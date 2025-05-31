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
import { startSimulationLoop, updateTimeDisplay, toggleTimeMode, getCurrentSimTime } from './simulation.js';
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
    
    // Initialize 3D model viewer panel
    initModelViewer();
    
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
        // Show mission dashboard overlay
        const dash = document.getElementById('mission-dashboard');
        if (dash) {
            dash.classList.remove('hidden');
            dash.classList.add('visible');
        }
        // Resize model viewer now that panel is visible
        if (previewEngine) {
            previewEngine.resize();
        }

        activeSatellite = event.detail.name;
        updateTelemetryUI(activeSatellite, getTelemetryData());
        // Focus camera on selected satellite
        const satMesh = getSatelliteMeshes()[activeSatellite];
        if (camera && satMesh) {
            camera.setTarget(satMesh.position);
            // compute azimuth so camera looks straight down on satellite
            const pos = satMesh.position;
            const azimuth = Math.atan2(pos.z, pos.x) + Math.PI/2;
            camera.alpha = azimuth;
            
            // Adjust camera position based on whether this is a label click
            const isLabelClick = event.detail.source === 'label';
            const minR = camera.lowerRadiusLimit;
            const currentR = camera.radius;
            let targetR;
            
            if (isLabelClick) {
                // For label clicks, use a safer distance to prevent going inside Earth
                const safeDistance = EARTH_RADIUS * EARTH_SCALE * 2.5;
                const distanceToSat = BABYLON.Vector3.Distance(BABYLON.Vector3.Zero(), satMesh.position);
                targetR = Math.max(safeDistance, distanceToSat * 1.1); // 10% farther than the satellite
                camera.beta = 0.4; // Less steep angle to see more context around the satellite
            } else {
                // For satellite mesh clicks, closer view but still safe
                camera.beta = 0.2;  // near-top-down angle
                targetR = Math.max(minR * 1.2, currentR * 0.5); // Stay at least 20% away from minimum limit
            }
            
            // Animate camera movement smoothly
            BABYLON.Animation.CreateAndStartAnimation(
                'zoomIn', camera, 'radius', 60, 30,
                currentR, targetR,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        }
    });
    // Restore free view when dashboard closes - with enhanced smooth transition
    window.addEventListener('missionDashboardClosed', () => {
        // Clear model viewer when dashboard is closed
        if (previewScene && previewMesh) {
            previewScene.meshes.slice().forEach(mesh => {
                if (mesh !== previewCamera && !(mesh instanceof BABYLON.Light)) {
                    mesh.dispose();
                }
            });
            previewMesh = null;
        }
        
        if (camera) {
            // Store current position and target
            const currentPos = camera.position.clone();
            const currentTarget = camera.target.clone();
            
            // Reset activeSatellite when dashboard closes
            activeSatellite = null;
            
            // Define a more sophisticated easing function for smoother transitions
            const easingFunction = new BABYLON.CircleEase();
            easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
            
            // Smoothly move camera target to Earth center with nicer animation timing (45 frames)
            const targetAnim = BABYLON.Animation.CreateAndStartAnimation(
                'targetToEarth', camera, 'target', 60, 45,
                currentTarget, BABYLON.Vector3.Zero(),
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            if (targetAnim) targetAnim.disposeOnEnd = true;
            targetAnim.setEasingFunction(easingFunction);
            
            // Reset alpha and beta for a nicer view of Earth
            const targetAlpha = -Math.PI/2; // Nice side view
            const targetBeta = Math.PI/3;   // Slightly elevated
            
            // Stagger animation timings for a more natural feel
            setTimeout(() => {
                // Animate rotation parameters smoothly
                const alphaAnim = BABYLON.Animation.CreateAndStartAnimation(
                    'alphaReset', camera, 'alpha', 60, 40,
                    camera.alpha, targetAlpha,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                if (alphaAnim) alphaAnim.disposeOnEnd = true;
                alphaAnim.setEasingFunction(easingFunction);
            }, 100);
            
            setTimeout(() => {
                const betaAnim = BABYLON.Animation.CreateAndStartAnimation(
                    'betaReset', camera, 'beta', 60, 35,
                    camera.beta, targetBeta,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                if (betaAnim) betaAnim.disposeOnEnd = true;
                betaAnim.setEasingFunction(easingFunction);
            }, 150);
            
            // Ensure we're at a safe distance with a slight delay
            setTimeout(() => {
                const safeRadius = EARTH_RADIUS * EARTH_SCALE * 3.5; // A comfortable viewing distance, slightly farther back
                const radiusAnim = BABYLON.Animation.CreateAndStartAnimation(
                    'radiusReset', camera, 'radius', 60, 50, // Longer animation (50 frames)
                    camera.radius, safeRadius,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                if (radiusAnim) radiusAnim.disposeOnEnd = true;
                radiusAnim.setEasingFunction(easingFunction);
            }, 50);
        }
    });
    
    // Wire up click on time display to toggle UTC/local
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.addEventListener('click', () => {
            toggleTimeMode();
            updateTimeDisplay(getCurrentSimTime());
        });
    }
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
    camera.lowerRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 1.05; // Increased safety margin to prevent going inside Earth
    camera.upperRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 100; // Allow zoom far out
    camera.useAutoRotationBehavior = false;
    camera.inertia = 0.7; // Slightly higher for smoother movement
    camera.wheelDeltaPercentage = 0.04; // Smoother zoom
    
    // Add camera boundaries to prevent going through Earth and ensure smooth motion
    camera.checkCollisions = true;
    camera.collisionRadius = new BABYLON.Vector3(0.1, 0.1, 0.1);
    
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

    // Add camera safety observer to prevent going inside Earth
    scene.onBeforeRenderObservable.add(() => {
        if (camera) {
            // Calculate distance from camera to Earth center
            const distanceToCenter = camera.position.length();
            const minSafeDistance = EARTH_RADIUS * EARTH_SCALE * 1.05; // Safe distance threshold
            
            // If camera is too close to Earth, move it out to the safe distance
            if (distanceToCenter < minSafeDistance) {
                // Normalize position vector and set to safe distance
                const direction = camera.position.normalizeToNew();
                const safePosition = direction.scale(minSafeDistance);
                camera.position = safePosition;
            }
        }
    });

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

// Preview model viewer globals
let previewEngine;
let previewScene;
let previewCamera;
let previewMesh;

async function initModelViewer() {
    // Get the canvas and ensure it exists
    const canvas = document.getElementById('modelCanvas');
    if (!canvas) {
        console.error('Model viewer canvas not found');
        return;
    }
    
    // Make sure the canvas style is set correctly
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '10'; // Make sure canvas is above any potential placeholder text
    
    // Create engine and scene for preview
    previewEngine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    previewScene = new BABYLON.Scene(previewEngine);
    previewScene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1); // Very dark blue background
    
    // Create starfield background
    const starfieldTexture = new BABYLON.Texture("assets/stars.png", previewScene);
    const starBackground = BABYLON.MeshBuilder.CreatePlane("starBackground", {
        size: 100,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, previewScene);
    starBackground.position = new BABYLON.Vector3(0, 0, -20); // Behind everything
    const starMaterial = new BABYLON.StandardMaterial("starMaterial", previewScene);
    starMaterial.emissiveTexture = starfieldTexture;
    starMaterial.disableLighting = true;
    starBackground.material = starMaterial;
    
    // Camera setup
    previewCamera = new BABYLON.ArcRotateCamera('previewCam', -Math.PI/2, Math.PI/2, 2, new BABYLON.Vector3(0,0,0), previewScene);
    previewCamera.lowerRadiusLimit = 0.5;
    previewCamera.upperRadiusLimit = 10;
    previewCamera.wheelDeltaPercentage = 0.01; // Smoother zoom
    
    // Always attach control to the modelCanvas
    previewCamera.attachControl(canvas, true);

    // Enhance lighting for better model viewing
    const hemisphericLight = new BABYLON.HemisphericLight('previewLight', new BABYLON.Vector3(0,1,0), previewScene);
    hemisphericLight.intensity = 0.7;
    hemisphericLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
    hemisphericLight.specular = new BABYLON.Color3(0.5, 0.5, 0.8);
    
    // Add subtle particle system for stars in background
    const particleSystem = new BABYLON.ParticleSystem("stars", 200, previewScene);
    particleSystem.particleTexture = new BABYLON.Texture("assets/particle_star.png", previewScene);
    particleSystem.emitter = new BABYLON.Vector3(0, 0, -15); // Position the emitter behind everything
    particleSystem.minEmitBox = new BABYLON.Vector3(-10, -10, -5); // minimum box dimensions
    particleSystem.maxEmitBox = new BABYLON.Vector3(10, 10, -5); // maximum box dimensions
    
    // Particles configuration
    particleSystem.color1 = new BABYLON.Color4(0.8, 0.8, 1.0, 0.3);
    particleSystem.color2 = new BABYLON.Color4(0.7, 0.7, 1.0, 0.3);
    particleSystem.colorDead = new BABYLON.Color4(0.5, 0.5, 0.7, 0);
    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.15;
    particleSystem.minLifeTime = 5.0;
    particleSystem.maxLifeTime = 10.0;
    particleSystem.emitRate = 10;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    particleSystem.direction1 = new BABYLON.Vector3(-0.01, -0.01, 0);
    particleSystem.direction2 = new BABYLON.Vector3(0.01, 0.01, 0);
    particleSystem.minAngularSpeed = -0.01;
    particleSystem.maxAngularSpeed = 0.01;
    particleSystem.start();
    
    // Engine render loop
    previewEngine.runRenderLoop(() => previewScene.render());
    window.addEventListener('resize', () => previewEngine.resize());

    // Load a model when a satellite is selected
    window.addEventListener('satelliteSelected', async (e) => {
        // Make sure the dashboard is fully visible before sizing the canvas
        setTimeout(() => {
            // Ensure canvas is sized to its parent tile
            const canvas = document.getElementById('modelCanvas');
            if (canvas && canvas.parentElement) {
                const rect = canvas.parentElement.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                if (previewEngine) previewEngine.resize();
                console.log('Model viewer canvas resized:', canvas.width, 'x', canvas.height);
            }
        }, 100); // Short delay to ensure dashboard is rendered and visible

        // Remove all meshes except the camera and light
        previewScene.meshes.slice().forEach(mesh => {
            if (mesh !== previewCamera && !(mesh instanceof BABYLON.Light)) {
                mesh.dispose();
            }
        });
        previewMesh = null;

        const satName = e.detail.name;
        if (!satName) return;
        // Determine model file by name
        const modelFile = satName.toUpperCase().includes('CRTS')
            ? 'assets/crts_satellite.glb'
            : 'assets/bulldog_sat.glb';
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelFile, previewScene);
            previewMesh = result.meshes[0];
            previewMesh.rotationQuaternion = null;
            
            // Adjust scale factor based on satellite type
            let scaleFactor = 0.5;
            if (satName.toUpperCase().includes('CRTS')) {
                scaleFactor = 0.35; // Smaller scale for CRTS models
                // Also adjust camera distance for CRTS models
                previewCamera.radius = 3.0;
            } else {
                // Default Bulldog satellite
                scaleFactor = 0.5;
                previewCamera.radius = 2.0;
            }
            previewMesh.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            
            // Center on origin
            const center = previewMesh.getBoundingInfo().boundingBox.center;
            previewMesh.position = center.negate();
            
            // Add auto-rotation animation for better visual appeal
            previewScene.registerBeforeRender(() => {
                if (previewMesh) {
                    previewMesh.rotation.y += 0.0015; // Much slower rotation for better viewing
                }
            });
            
            // Add a point light to highlight the model better
            const pointLight = new BABYLON.PointLight("modelSpotlight", 
                new BABYLON.Vector3(3, 2, 3), previewScene);
            pointLight.intensity = 0.7;
            pointLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
            
            console.log(`Model ${modelFile} loaded successfully for satellite ${satName}`);
        } catch (err) {
            console.error('Error loading preview model:', err);
        }
    });
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
