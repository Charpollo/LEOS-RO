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
let timeMultiplier = 0.1; // Slowed down for more appealing visualization
let lastTimeMultiplier = 0.1;

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
                setupKeyboardControls();
                
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
    camera.minZ = 0.5;
    camera.maxZ = 10000;
    camera.lowerRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 1.2;
    camera.upperRadiusLimit = EARTH_RADIUS * EARTH_SCALE * 50;
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
    
    // Create the skybox first (background)
    createSkybox(scene);
    
    // Then create Earth and Moon
    earthMesh = await createEarth(scene, timeMultiplier, sunDirection);
    moonMesh = await createMoon(scene, timeMultiplier);
    
    // Finally load satellite data
    await loadSatelliteData();
}

async function createEarth() {
    // Create Earth with properly separated layers and optimized materials
    
    // Create base Earth mesh with optimized polygon count
    earthMesh = BABYLON.MeshBuilder.CreateSphere('earth', { 
        segments: 32,
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE 
    }, scene);
    
    // Earth's proper axial tilt (23.5 degrees)
    const EARTH_TILT = 23.5 * Math.PI / 180;
    earthMesh.rotation.x = EARTH_TILT;
    
    // Create PBR material for better realism without overexposure
    const earthMaterial = new BABYLON.PBRMaterial('earthMaterial', scene);
    
    // Load diffuse texture - ensure it's loaded correctly with error handling
    // Try to load PNG first, fall back to JPG if needed
    const diffuseTexture = new BABYLON.Texture('assets/earth_diffuse.png', scene, false, false, 
        BABYLON.Texture.BILINEAR_SAMPLINGMODE, 
        () => console.log("Earth diffuse texture loaded successfully"),
        () => {
            console.log("PNG not found, falling back to JPG");
            return new BABYLON.Texture('assets/earth_diffuse.jpg', scene);
        }
    );
    
    // Configure diffuse texture properly
    earthMaterial.albedoTexture = diffuseTexture;
    
    // Fix texture orientation and alignment for all Earth textures
    // These values ensure perfect alignment and correct orientation for standard equirectangular maps
    const earthTextureUOffset = 0.5;
    const earthTextureVOffset = 0.0;
    const earthTextureUScale = -1;
    const earthTextureVScale = 1; // Day and clouds: vScale=1
    const nightTextureVScale = -1; // Night: vScale=-1 to flip vertically

    earthMaterial.albedoTexture.uOffset = earthTextureUOffset;
    earthMaterial.albedoTexture.vOffset = earthTextureVOffset;
    earthMaterial.albedoTexture.uScale = earthTextureUScale;
    earthMaterial.albedoTexture.vScale = earthTextureVScale;
    earthMaterial.albedoTexture.level = 1.0; // Normal intensity
    earthMaterial.albedoTexture.hasAlpha = false;
    
    // Configure proper metal/rough maps for PBR workflow - Earth needs to be very non-reflective
    earthMaterial.metallic = 0.0; // Earth isn't metallic at all
    earthMaterial.roughness = 0.98; // Maximum roughness to completely eliminate unrealistic reflections
    earthMaterial.useRoughnessFromMetallicTextureAlpha = false;
    
    // Reduce specular to absolute minimum - Earth doesn't have mirror-like reflections
    earthMaterial.specularIntensity = 0.05;
    
    // Enable ambient occlusion but keep it subtle
    earthMaterial.useAmbientOcclusionFromMetallicTextureRed = false;
    earthMaterial.ambientTextureStrength = 0.3;
    
    // Configure night side texture with proper intensity - city lights should be visible
    const nightTexture = new BABYLON.Texture('assets/earth_night.jpg', scene);
    // Apply the same transformation as the day texture, but flip vertically to match orientation
    nightTexture.uOffset = earthTextureUOffset;
    nightTexture.vOffset = earthTextureVOffset;
    nightTexture.uScale = earthTextureUScale;
    nightTexture.vScale = nightTextureVScale; // Flip vertically
    earthMaterial.emissiveTexture = nightTexture;
    earthMaterial.emissiveTexture.level = 1.2; // Higher boost for night texture intensity
    earthMaterial.emissiveColor = new BABYLON.Color3(0.35, 0.35, 0.45); // Enhanced blue-white city lights
    
    // Remove fresnel effect that might cause dark rim
    earthMaterial.emissiveFresnelParameters = null;
    
    // Configure for physically-based rendering with better lighting response
    earthMaterial.lightFalloff = true;
    earthMaterial.usePhysicalLightFalloff = false; // Disable for more forgiving lighting
    
    // Add Fresnel rim for a soft blue edge glow
    earthMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    earthMaterial.emissiveFresnelParameters.bias = 0.5;
    earthMaterial.emissiveFresnelParameters.power = 2.5;
    earthMaterial.emissiveFresnelParameters.leftColor = new BABYLON.Color3(0.15, 0.25, 0.7);
    earthMaterial.emissiveFresnelParameters.rightColor = BABYLON.Color3.Black();
    
    // Apply material to Earth mesh
    earthMesh.material = earthMaterial;
    earthMesh.receiveShadows = true;
    
    // Create properly layered and separated clouds
    const cloudsMesh = BABYLON.MeshBuilder.CreateSphere('clouds', {
        segments: 24, // Fewer segments for clouds is fine
        diameter: EARTH_RADIUS * 2.015 * EARTH_SCALE // Slightly larger than Earth
    }, scene);
    
    // Create standard material for clouds with proper white appearance
    const cloudsMaterial = new BABYLON.StandardMaterial('cloudsMaterial', scene);
    
    // Configure cloud texture with proper alpha
    const cloudsTexture = new BABYLON.Texture('assets/earth_clouds.jpg', scene);
    cloudsMaterial.diffuseTexture = cloudsTexture;
    // Apply the same texture transformation as the Earth to keep clouds aligned
    cloudsMaterial.diffuseTexture.uOffset = earthTextureUOffset;
    cloudsMaterial.diffuseTexture.vOffset = earthTextureVOffset;
    cloudsMaterial.diffuseTexture.uScale = earthTextureUScale;
    cloudsMaterial.diffuseTexture.vScale = earthTextureVScale;
    cloudsMaterial.diffuseTexture.level = 1.5; // Brighter clouds
    
    // Make clouds appear white by setting proper diffuse color
    cloudsMaterial.diffuseColor = new BABYLON.Color3(1.1, 1.1, 1.1); // Slightly above white for pop
    cloudsMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    
    // Set up alpha for proper transparency
    cloudsMaterial.opacityTexture = cloudsTexture;
    // The opacityTexture inherits the same transformations as diffuseTexture since it's the same texture object
    cloudsMaterial.opacityTexture.getAlphaFromRGB = true; // Use RGB as alpha
    cloudsMaterial.useAlphaFromDiffuseTexture = false; // Don't use alpha from diffuse
    
    // Configure specular to make clouds look fluffy and bright
    cloudsMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    cloudsMaterial.specularPower = 8;
    cloudsMaterial.alpha = 0.55; // Reduced cloud density for better Earth visibility
    
    // Set blending mode for proper transparency
    cloudsMaterial.backFaceCulling = false;
    cloudsMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    
    // Apply material to clouds mesh
    cloudsMesh.material = cloudsMaterial;
    cloudsMesh.parent = earthMesh;
    
    // Create atmospheric scattering effect with proper appearance
    const atmosphereMesh = BABYLON.MeshBuilder.CreateSphere('atmosphere', {
        segments: 24, // Fewer segments for better performance
        diameter: EARTH_RADIUS * 2.02 * EARTH_SCALE // Atmosphere is 2% larger than Earth (reduced from 3%)
    }, scene);
    
    // Create atmosphere material with enhanced, realistic glow
    const atmosphereMaterial = new BABYLON.StandardMaterial('atmosphereMaterial', scene);
    atmosphereMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // No diffuse
    atmosphereMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.9); // Enhanced blue glow
    atmosphereMaterial.alpha = 0.18; // Slightly more visible
    atmosphereMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    atmosphereMaterial.backFaceCulling = false; // Show both sides
    
    // Add enhanced Fresnel effect for more realistic atmospheric rim glow
    atmosphereMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    atmosphereMaterial.emissiveFresnelParameters.bias = 0.6; // Lower bias for wider glow
    atmosphereMaterial.emissiveFresnelParameters.power = 2.0; // Lower power for softer transition
    atmosphereMaterial.emissiveFresnelParameters.leftColor = new BABYLON.Color3(0.35, 0.6, 1.0); // Brighter, more intense blue
    atmosphereMaterial.emissiveFresnelParameters.rightColor = BABYLON.Color3.Black();
    
    // Apply atmosphere material
    atmosphereMesh.material = atmosphereMaterial;
    atmosphereMesh.parent = earthMesh;
    
    // Store references for updates
    scene.earthMaterial = earthMaterial;
    scene.cloudsMaterial = cloudsMaterial;
    scene.atmosphereMaterial = atmosphereMaterial;

    // Enhanced day/night cycle with proper transitions
    let frameCount = 0;
    let earthRotation = 0;
    let solarTime = 0;

    scene.registerBeforeRender(() => {
        // Only update every 2 frames for better performance
        if (frameCount++ % 2 !== 0) return;
        
        // Use negative rotation speed for counterclockwise rotation (west to east, correct Earth rotation)
        const rotationSpeed = (-0.05 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
        earthMesh.rotation.y += rotationSpeed;
        earthRotation += rotationSpeed;
        
        // Update clouds at slightly different rate, maintaining counterclockwise direction
        cloudsMesh.rotation.y = earthMesh.rotation.y * 1.1;

        // Update atmosphere appearance based on sun position (every 10 frames)
        if (scene.sunLight && frameCount % 10 === 0) {
            // Calculate sun position based on simulation time with improved accuracy
            solarTime += timeMultiplier * 0.001;
            // Earth's orbit around the sun (annual cycle)
            const earthOrbitAngle = solarTime * 2 * Math.PI / 365.25;
            // Earth's axial tilt
            const tilt = 23.5 * Math.PI / 180;
            
            // Calculate proper seasons based on Earth's orbit
            const dayOfYear = (solarTime % 365.25) / 365.25;
            const seasonAngle = (dayOfYear * 2 * Math.PI) - Math.PI/2; // Start at winter solstice
            
            // Sun direction in ECI (Earth-Centered Inertial) frame with proper seasonal variation
            const sunDir = new BABYLON.Vector3(
                Math.cos(earthOrbitAngle),
                Math.sin(tilt) * Math.sin(seasonAngle), // Apply tilt effect based on season
                Math.sin(earthOrbitAngle + Math.PI/2) * Math.cos(tilt)
            ).normalize();
            // Update light direction
            scene.sunLight.direction = sunDir.negate();
            sunDirection = sunDir; // Store for satellite eclipse calculations
            
            // Calculate day/night transition parameters with more dramatic sunrise/sunset
            const surfaceToSunDot = BABYLON.Vector3.Dot(sunDir, new BABYLON.Vector3(1, 0, 0));
            const isNightSide = surfaceToSunDot < 0;

            // Dramatic, sharper terminator
            const nightIntensity = Math.max(0, Math.pow(-surfaceToSunDot, 2.2)); // Sharper falloff
            const terminatorFactor = Math.pow(1.0 - Math.abs(surfaceToSunDot), 32); // Even sharper, more dramatic

            // Sunset/sunrise colors for dramatic effect
            const sunsetColor = new BABYLON.Color3(
                1.0 * terminatorFactor, // Maximum red
                0.5 * terminatorFactor, // Medium green (makes orange with red)
                0.15 * terminatorFactor // Very low blue for warmer orange
            );
            const dawnColor = new BABYLON.Color3(
                0.4 * terminatorFactor,  // Low red
                0.5 * terminatorFactor,  // Medium green
                0.9 * terminatorFactor   // Very strong blue
            );

            // Night lights color (city lights - only visible on night side)
            const nightLightsColor = new BABYLON.Color3(
                1.0 * nightIntensity, // Brighter warm yellow-white city lights
                0.85 * nightIntensity,
                0.6 * nightIntensity  // Slightly higher blue for more visible night lights
            );

            // Only show emission (city lights) on the night side, and add dramatic terminator color
            if (isNightSide) {
                scene.earthMaterial.emissiveColor = nightLightsColor.add(dawnColor.scale(0.7));
            } else if (terminatorFactor > 0.001) {
                // On the day side, only show a dramatic terminator color, no city lights
                scene.earthMaterial.emissiveColor = sunsetColor.scale(1.2);
            } else {
                // Full day: no emission
                scene.earthMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0);
            }

            // Update atmosphere visibility and color based on sun angle
            const atmFactor = 0.12 + terminatorFactor * 0.45; // More visible at terminator
            atmosphereMaterial.alpha = atmFactor;
            atmosphereMaterial.emissiveColor = isNightSide
                ? new BABYLON.Color3(0.08, 0.12, 0.4)
                : new BABYLON.Color3(0.15, 0.35, 0.8).scale(1 + terminatorFactor * 2.5);
            
            // Update sunlight parameters based on orbit position - seasonal effects
            scene.sunLight.intensity = 1.4 + 0.1 * Math.sin(earthOrbitAngle); // Slight seasonal variation
            scene.sunLight.diffuse = new BABYLON.Color3(
                1.0,
                0.97 + 0.03 * Math.sin(earthOrbitAngle * 2), // Subtle color temperature shifts
                0.92 + 0.05 * Math.cos(earthOrbitAngle)
            );
        }
    });
}

async function createMoon() {
    // Create Moon with balanced polygon count
    moonMesh = BABYLON.MeshBuilder.CreateSphere('moon', { 
        segments: 24, // Reduced from 32 for better performance
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE * MOON_SCALE 
    }, scene);
    
    // Position moon properly in orbit
    moonMesh.position = new BABYLON.Vector3(0, 0, MOON_DISTANCE);
    
    // Create optimized PBR material for realistic Moon appearance
    const moonMaterial = new BABYLON.PBRMaterial('moonMaterial', scene);
    
    // Load and configure diffuse texture with proper error handling
    const moonTexture = new BABYLON.Texture(
        'assets/moon_texture.jpg', 
        scene, 
        false, false, 
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        () => console.log("Moon texture loaded successfully"),
        (err) => console.error("Failed to load Moon texture:", err)
    );
    
    // Configure Moon texture properties for realistic appearance
    moonMaterial.albedoTexture = moonTexture;
    moonMaterial.albedoTexture.hasAlpha = false;
    
    // Configure Moon material properties for realistic appearance
    moonMaterial.metallic = 0.0;
    moonMaterial.roughness = 0.9;  // Moon surface is very rough
    moonMaterial.ambientColor = new BABYLON.Color3(0.03, 0.03, 0.03); // Very dark ambient
    
    // Add subtle Fresnel effect for rim lighting
    moonMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    moonMaterial.emissiveFresnelParameters.bias = 0.8;
    moonMaterial.emissiveFresnelParameters.power = 4;
    moonMaterial.emissiveFresnelParameters.leftColor = BABYLON.Color3.White().scale(0.15);
    moonMaterial.emissiveFresnelParameters.rightColor = BABYLON.Color3.Black();
    
    // Apply material and set up moon surface
    moonMesh.material = moonMaterial;
    moonMesh.receiveShadows = true;
    
    // Create pivot node for Moon orbit
    const moonPivot = new BABYLON.TransformNode('moonPivot', scene);
    moonMesh.parent = moonPivot;
    
    // Register Moon orbit animation
    scene.registerBeforeRender(() => {
        // Moon orbits approximately once every 27.3 days, slowed down for visualization
        const orbitSpeed = (0.03 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
        moonPivot.rotation.y += orbitSpeed;
        
        // Add slow Moon rotation around its axis (tidally locked to Earth)
        moonMesh.rotation.y += orbitSpeed * 0.01;
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
        simulationTime = startSimulationLoop(scene, satelliteData, orbitalElements, simulationStartTime, timeMultiplier, advancedTexture, activeSatellite, getTelemetryData());
    } catch (error) {
        console.error('Error loading satellite data:', error);
    }
}

// All satellite related functions have been moved to satellites.js

function startSimulationLoop() {
    // Simulation ratio: 60:1 time acceleration (1 minute of real time = 1 second in simulation)
    const TIME_ACCELERATION = 60;
    
    // Initialize simulation time from start time or use current time
    simulationTime = simulationStartTime || new Date();
    updateTimeDisplay();
    
    // Frame counter for performance optimizations
    let frameCounter = 0;
    let activeSatelliteList = [];
    
    // Pre-filter the satellite list for better performance
    for (const satName in orbitalElements) {
        if (satName !== 'metadata') {
            activeSatelliteList.push(satName);
        }
    }
    
    // Use a less frequent update for better performance
    scene.registerBeforeRender(() => {
        // Run only every 3 frames to reduce CPU load
        if (frameCounter++ % 3 !== 0) {
            return;
        }
        
        // Calculate time increment based on time multiplier
        const timeIncrement = timeMultiplier * TIME_ACCELERATION * 1000 * 3; // Adjust for the frame skip
        
        // Advance simulation time
        simulationTime = new Date(simulationTime.getTime() + timeIncrement);
        
        // Only process visible satellites or limit to 5 at a time for smoother loading
        const visibleSats = frameCounter < 120 ? 
            activeSatelliteList.slice(0, Math.min(Math.floor(frameCounter/12), activeSatelliteList.length)) : 
            activeSatelliteList;
        
        // Update positions
        for (const satName of visibleSats) {
            updateSatelliteFromOrbitalElements(satName, simulationTime);
        }
        
        // Only update time display every 30 frames for performance
        if (frameCounter % 30 === 0) {
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
    if (!activeSatellite || !telemetryData[activeSatellite]) {
        uiManager.updateBasicTelemetry(null);
        return;
    }
    uiManager.updateTelemetry(telemetryData[activeSatellite]);
}

// Removed all Brand UI functions since they've been moved

window.addEventListener('DOMContentLoaded', initApp);
