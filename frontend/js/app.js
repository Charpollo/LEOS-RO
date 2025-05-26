import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import { calculateSatellitePosition, generateRealTimeTelemetry, toBabylonPosition, isInEclipse } from './orbital-mechanics.js';
// Import the updateSatellitePosition function for reference but we're using inline version for better integration
// import { updateSatellitePosition as updateSatellitePositionExternal } from './updateSatellitePosition.js';

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

// Orbital elements and real-time calculation data
let orbitalElements = {};
let simulationStartTime = new Date();
let sunDirection = new BABYLON.Vector3(1, 0, 0);

const EARTH_RADIUS = 6371; // km
const EARTH_SCALE = 0.001;
const MIN_LEO_ALTITUDE_KM = 160; // Minimum altitude above Earth surface for LEO
const MOON_DISTANCE = 384400 * EARTH_SCALE;
const MOON_SCALE = 0.27;

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
    
    // Create proper lighting system
    // Main directional light (sun)
    const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(1, 0, 0), scene);
    sunLight.intensity = 2.0; // Strong sunlight for a hard terminator
    sunLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.92); // Warm sunlight
    sunLight.specular = new BABYLON.Color3(1.0, 1.0, 1.0); // Strong specular for highlights
    scene.sunLight = sunLight;

    // Remove or minimize ambient light for a hard terminator
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.03; // Very low, just enough to see a hint of the night side
    ambientLight.diffuse = new BABYLON.Color3(1.0, 1.0, 1.0);
    ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);
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
    createSkybox();
    
    // Then create Earth and Moon
    await createEarth();
    await createMoon();
    
    // Finally load satellite data
    await loadSatelliteData();
}

function createSkybox() {
    // Create a proper skybox for a realistic star field background
    const skyboxSize = 5000.0;
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: skyboxSize}, scene);

    // Use a cube texture for a realistic starfield
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    try {
        const cubeTexture = new BABYLON.CubeTexture("assets/starfield/stars", scene);
        cubeTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.reflectionTexture = cubeTexture;
        cubeTexture.level = 1.2;
    } catch (e) {
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0,0,0);
        skyboxMaterial.emissiveColor = new BABYLON.Color3(0,0,0);
    }
    skyboxMaterial.specularColor = new BABYLON.Color3(0,0,0);
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;

    // Star particles: more, bigger, brighter
    const starsParticles = new BABYLON.ParticleSystem("stars", 8000, scene);
    const particleTexture = new BABYLON.Texture("assets/particle_star.png", scene);
    starsParticles.particleTexture = particleTexture;
    starsParticles.minSize = 0.18;
    starsParticles.maxSize = 0.7;
    starsParticles.minLifeTime = Number.MAX_SAFE_INTEGER;
    starsParticles.maxLifeTime = Number.MAX_SAFE_INTEGER;
    starsParticles.emitRate = 8000;
    starsParticles.addColorGradient(0, new BABYLON.Color4(1,1,1,1));
    starsParticles.addColorGradient(0.5, new BABYLON.Color4(1,1,1,0.95));
    starsParticles.addColorGradient(1, new BABYLON.Color4(1,1,1,0.9));
    const emitBoxSize = skyboxSize * 0.95;
    starsParticles.minEmitBox = new BABYLON.Vector3(-emitBoxSize, -emitBoxSize, -emitBoxSize);
    starsParticles.maxEmitBox = new BABYLON.Vector3(emitBoxSize, emitBoxSize, emitBoxSize);
    starsParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    starsParticles.addSizeGradient(0, 1.0);
    starsParticles.addSizeGradient(1.0, 1.0);
    starsParticles.start();
    starsParticles.targetStopDuration = 0.1;
}

async function createEarth() {
    // Create Earth with properly separated layers and optimized materials
    
    // Create base Earth mesh with optimized polygon count
    earthMesh = BABYLON.MeshBuilder.CreateSphere('earth', { 
        segments: 32,
        diameter: EARTH_RADIUS * 2 * EARTH_SCALE 
    }, scene);
    
    // Apply Earth's axial tilt (23.5 degrees)
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
    earthMaterial.albedoTexture.level = 1.0; // Normal intensity
    earthMaterial.albedoTexture.hasAlpha = false;
    
    // Configure proper metal/rough maps for PBR workflow
    earthMaterial.metallic = 0.0; // Earth isn't metallic
    earthMaterial.roughness = 0.8; // High roughness for natural appearance
    earthMaterial.useRoughnessFromMetallicTextureAlpha = false;
    
    // Enable ambient occlusion but keep it subtle
    earthMaterial.useAmbientOcclusionFromMetallicTextureRed = false;
    earthMaterial.ambientTextureStrength = 0.3;
    
    // Configure night side texture with proper intensity
    const nightTexture = new BABYLON.Texture('assets/earth_night.jpg', scene);
    earthMaterial.emissiveTexture = nightTexture;
    earthMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.15); // Very subtle emissive for night side
    
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
    cloudsMaterial.diffuseTexture.level = 1.5; // Brighter clouds
    
    // Make clouds appear white by setting proper diffuse color
    cloudsMaterial.diffuseColor = new BABYLON.Color3(1.1, 1.1, 1.1); // Slightly above white for pop
    cloudsMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    
    // Set up alpha for proper transparency
    cloudsMaterial.opacityTexture = cloudsTexture;
    cloudsMaterial.opacityTexture.getAlphaFromRGB = true; // Use RGB as alpha
    cloudsMaterial.useAlphaFromDiffuseTexture = false; // Don't use alpha from diffuse
    
    // Configure specular to make clouds look fluffy and bright
    cloudsMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    cloudsMaterial.specularPower = 8;
    cloudsMaterial.alpha = 0.7; // Better transparency for clouds
    
    // Set blending mode for proper transparency
    cloudsMaterial.backFaceCulling = false;
    cloudsMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    
    // Apply material to clouds mesh
    cloudsMesh.material = cloudsMaterial;
    cloudsMesh.parent = earthMesh;
    
    // Create atmospheric scattering effect with proper appearance
    const atmosphereMesh = BABYLON.MeshBuilder.CreateSphere('atmosphere', {
        segments: 24, // Fewer segments for better performance
        diameter: EARTH_RADIUS * 2.08 * EARTH_SCALE // Atmosphere is 8% larger than Earth
    }, scene);
    
    // Create atmosphere material with subtle, realistic glow
    const atmosphereMaterial = new BABYLON.StandardMaterial('atmosphereMaterial', scene);
    atmosphereMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // No diffuse
    atmosphereMaterial.emissiveColor = new BABYLON.Color3(0.18, 0.38, 0.85); // Very subtle blue glow
    atmosphereMaterial.alpha = 0.16; // Very transparent
    atmosphereMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    atmosphereMaterial.backFaceCulling = false; // Show both sides
    
    // Add subtle Fresnel effect for atmospheric rim glow
    atmosphereMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    atmosphereMaterial.emissiveFresnelParameters.bias = 0.7;
    atmosphereMaterial.emissiveFresnelParameters.power = 2.5;
    atmosphereMaterial.emissiveFresnelParameters.leftColor = new BABYLON.Color3(0.25, 0.5, 1.0);
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
        
        const rotationSpeed = (0.05 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
        earthMesh.rotation.y += rotationSpeed;
        earthRotation += rotationSpeed;
        
        // Update clouds at slightly different rate
        cloudsMesh.rotation.y = earthMesh.rotation.y * 1.1;

        // Update atmosphere appearance based on sun position (every 10 frames)
        if (scene.sunLight && frameCount % 10 === 0) {
            // Calculate sun position based on simulation time
            solarTime += timeMultiplier * 0.001;
            // Earth's orbit around the sun (annual cycle)
            const earthOrbitAngle = solarTime * 2 * Math.PI / 365.25;
            // Earth's axial tilt
            const tilt = 23.5 * Math.PI / 180;
            // Sun direction in ECI (Earth-Centered Inertial) frame
            const sunDir = new BABYLON.Vector3(
                Math.cos(earthOrbitAngle),
                Math.sin(tilt) * Math.sin(earthOrbitAngle),
                Math.sin(earthOrbitAngle + Math.PI/2) * Math.cos(tilt)
            ).normalize();
            // Update light direction
            scene.sunLight.direction = sunDir.negate();
            sunDirection = sunDir; // Store for satellite eclipse calculations
            
            // Calculate day/night transition parameters
            const nightIntensity = Math.max(0, -BABYLON.Vector3.Dot(sunDir, new BABYLON.Vector3(1, 0, 0)));
            const dawnDuskIntensity = Math.pow(Math.max(0, 1 - Math.abs(BABYLON.Vector3.Dot(sunDir, new BABYLON.Vector3(1, 0, 0)))), 2);
            
            // Update Earth's night side visibility
            scene.earthMaterial.emissiveColor = new BABYLON.Color3(
                nightIntensity * 0.15 + dawnDuskIntensity * 0.07,
                nightIntensity * 0.1 + dawnDuskIntensity * 0.05,
                nightIntensity * 0.2 + dawnDuskIntensity * 0.03
            );
            
            // Update atmosphere visibility based on sun angle
            const atmFactor = 0.12 + dawnDuskIntensity * 0.08;
            atmosphereMaterial.alpha = atmFactor;
            
            // Update sunlight color based on orbit position
            scene.sunLight.intensity = 0.8 + 0.1 * Math.sin(earthOrbitAngle);
            scene.sunLight.diffuse = new BABYLON.Color3(
                1.0,
                0.97 + 0.03 * Math.sin(earthOrbitAngle * 2),
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
    if (!satelliteMeshes[satName] || !orbitalElements[satName]) return;
    
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
        const labelControl = advancedTexture.getControlByName(`${satName}_label`);
        if (labelControl) {
            labelControl.linkOffsetY = -70;
        }
        
        // Enhanced eclipse calculation using realistic sun direction
        try {
            const satelliteToSun = sunDirection.clone();
            const satelliteToEarth = babylonPos.normalizeToNew().negate();
            
            // Calculate if satellite is in Earth's shadow
            const earthAngularRadius = Math.atan2(earthRadius, positionLength);
            const sunAngle = Math.acos(BABYLON.Vector3.Dot(satelliteToSun, satelliteToEarth));
            
            const inEclipse = sunAngle < earthAngularRadius;
            
            // Apply eclipse effects
            if (inEclipse) {
                satelliteMeshes[satName].visibility = 0.3; // Dim in shadow
                if (labelControl) {
                    labelControl.alpha = 0.5;
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
            updateSatellitePosition(satName);
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
    // Check if advanced telemetry is open and update it
    const advancedTelemetry = document.getElementById('advanced-telemetry');
    if (advancedTelemetry && advancedTelemetry.style.display === 'block') {
        showAdvancedTelemetry(); // Refresh the advanced telemetry display
        return;
    }
    
    // Fallback for basic telemetry display (if telemetry-data element exists)
    const telemetryElement = document.getElementById('telemetry-data');
    if (!telemetryElement) {
        // If no basic telemetry element, just show advanced telemetry
        if (activeSatellite) {
            showAdvancedTelemetry();
        }
        return;
    }
    
    if (!activeSatellite || !telemetryData[activeSatellite]) {
        telemetryElement.innerHTML = '<div class="no-data">No telemetry data available</div>';
        return;
    }
    
    const data = telemetryData[activeSatellite];
    let html = '';
    
    html += '<div class="telemetry-group">';
    html += '<h3>Position</h3>';
    html += createTelemetryItem('Altitude', `${data.altitude.toFixed(2)} km`);
    if (data.latitude !== undefined) html += createTelemetryItem('Latitude', `${data.latitude.toFixed(2)}°`);
    if (data.longitude !== undefined) html += createTelemetryItem('Longitude', `${data.longitude.toFixed(2)}°`);
    html += '</div>';
    
    html += '<div class="telemetry-group">';
    html += '<h3>Orbit</h3>';
    html += createTelemetryItem('Velocity', `${data.speed.toFixed(4)} km/s`);
    if (data.period !== undefined) html += createTelemetryItem('Period', `${data.period.toFixed(2)} min`);
    html += createTelemetryItem('Inclination', `${data.inclination.toFixed(2)}°`);
    html += '</div>';
    
    if (data.systems) {
        html += '<div class="telemetry-group">';
        html += '<h3>Systems</h3>';
        for (const system in data.systems) {
            html += createTelemetryItem(formatSystemName(system), `${data.systems[system].status} (${data.systems[system].value}%)`);
        }
        html += '</div>';
    }
    
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
    
    document.getElementById('dashboard-title').textContent = `${activeSatellite} - Mission Control Dashboard`;
    
    const dashboardContent = document.getElementById('dashboard-content');
    dashboardContent.innerHTML = '';
    
    if (telemetryData[activeSatellite]) {
        const telemetry = telemetryData[activeSatellite];
        
        // Create NASA-style header with mission status
        const missionHeader = document.createElement('div');
        missionHeader.className = 'mission-header';
        missionHeader.innerHTML = `
            <div class="mission-status">
                <div class="status-indicator active"></div>
                <span class="status-text">OPERATIONAL</span>
            </div>
            <div class="mission-clock">
                <span class="clock-label">MISSION TIME</span>
                <span class="clock-value" id="mission-clock">${simulationTime.toISOString().split('T')[1].split('.')[0]} UTC</span>
            </div>
        `;
        dashboardContent.appendChild(missionHeader);
        
        // Enhanced orbital parameters with real-time calculations
        const orbitalCard = document.createElement('div');
        orbitalCard.className = 'telemetry-card orbital-card';
        orbitalCard.innerHTML = `
            <div class="card-header">
                <h4>Orbital Elements</h4>
                <div class="data-quality">
                    <span class="quality-indicator good"></span>
                    <span>REAL-TIME</span>
                </div>
            </div>
            <div class="telemetry-grid">
                <div class="telemetry-item">
                    <span class="telemetry-label">Semi-Major Axis</span>
                    <span class="telemetry-value">${telemetry.semiMajorAxis.toFixed(2)} km</span>
                    <span class="telemetry-unit">KM</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Eccentricity</span>
                    <span class="telemetry-value">${telemetry.eccentricity.toFixed(6)}</span>
                    <span class="telemetry-unit">-</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Inclination</span>
                    <span class="telemetry-value">${telemetry.inclination.toFixed(3)}°</span>
                    <span class="telemetry-unit">DEG</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">RAAN</span>
                    <span class="telemetry-value">${telemetry.raan.toFixed(3)}°</span>
                    <span class="telemetry-unit">DEG</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Argument of Perigee</span>
                    <span class="telemetry-value">${telemetry.argOfPerigee.toFixed(3)}°</span>
                    <span class="telemetry-unit">DEG</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Mean Anomaly</span>
                    <span class="telemetry-value">${telemetry.meanAnomaly.toFixed(3)}°</span>
                    <span class="telemetry-unit">DEG</span>
                </div>
            </div>
        `;
        dashboardContent.appendChild(orbitalCard);
        
        // Enhanced position and attitude display
        const positionCard = document.createElement('div');
        positionCard.className = 'telemetry-card position-card';
        positionCard.innerHTML = `
            <div class="card-header">
                <h4>Position & Attitude</h4>
                <div class="coordinate-system">ECI J2000</div>
            </div>
            <div class="telemetry-grid">
                <div class="telemetry-item">
                    <span class="telemetry-label">X Position</span>
                    <span class="telemetry-value">${telemetry.position.x.toFixed(3)}</span>
                    <span class="telemetry-unit">KM</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Y Position</span>
                    <span class="telemetry-value">${telemetry.position.y.toFixed(3)}</span>
                    <span class="telemetry-unit">KM</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Z Position</span>
                    <span class="telemetry-value">${telemetry.position.z.toFixed(3)}</span>
                    <span class="telemetry-unit">KM</span>
                </div>
                <div class="telemetry-item altitude-highlight">
                    <span class="telemetry-label">Altitude</span>
                    <span class="telemetry-value">${telemetry.altitude.toFixed(3)}</span>
                    <span class="telemetry-unit">KM</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Range from Ground</span>
                    <span class="telemetry-value">${(telemetry.altitude + EARTH_RADIUS).toFixed(3)}</span>
                    <span class="telemetry-unit">KM</span>
                </div>
            </div>
        `;
        dashboardContent.appendChild(positionCard);
        
        // Enhanced velocity and dynamics
        const velocityCard = document.createElement('div');
        velocityCard.className = 'telemetry-card velocity-card';
        velocityCard.innerHTML = `
            <div class="card-header">
                <h4>Velocity & Dynamics</h4>
                <div class="reference-frame">Earth Fixed</div>
            </div>
            <div class="telemetry-grid">
                <div class="telemetry-item">
                    <span class="telemetry-label">X Velocity</span>
                    <span class="telemetry-value">${telemetry.velocity.x.toFixed(4)}</span>
                    <span class="telemetry-unit">KM/S</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Y Velocity</span>
                    <span class="telemetry-value">${telemetry.velocity.y.toFixed(4)}</span>
                    <span class="telemetry-unit">KM/S</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Z Velocity</span>
                    <span class="telemetry-value">${telemetry.velocity.z.toFixed(4)}</span>
                    <span class="telemetry-unit">KM/S</span>
                </div>
                <div class="telemetry-item speed-highlight">
                    <span class="telemetry-label">Orbital Speed</span>
                    <span class="telemetry-value">${telemetry.speed.toFixed(4)}</span>
                    <span class="telemetry-unit">KM/S</span>
                </div>
                <div class="telemetry-item">
                    <span class="telemetry-label">Orbital Period</span>
                    <span class="telemetry-value">${(2 * Math.PI * Math.sqrt(Math.pow(telemetry.semiMajorAxis, 3) / 398600.4418) / 60).toFixed(2)}</span>
                    <span class="telemetry-unit">MIN</span>
                </div>
            </div>
        `;
        dashboardContent.appendChild(velocityCard);
        
        // Mission parameters with enhanced data
        if (telemetry.missionParameters) {
            const missionCard = document.createElement('div');
            missionCard.className = 'telemetry-card mission-card';
            missionCard.innerHTML = `
                <div class="card-header">
                    <h4>Mission Parameters</h4>
                    <div class="mission-classification">OPERATIONAL</div>
                </div>
                <div class="telemetry-grid">
                    <div class="telemetry-item">
                        <span class="telemetry-label">Launch Date</span>
                        <span class="telemetry-value">${telemetry.missionParameters.launchDate}</span>
                        <span class="telemetry-unit">UTC</span>
                    </div>
                    <div class="telemetry-item">
                        <span class="telemetry-label">Mission Duration</span>
                        <span class="telemetry-value">${telemetry.missionParameters.duration}</span>
                        <span class="telemetry-unit">DAYS</span>
                    </div>
                    <div class="telemetry-item">
                        <span class="telemetry-label">Operational Status</span>
                        <span class="telemetry-value status-operational">${telemetry.missionParameters.status}</span>
                        <span class="telemetry-unit">-</span>
                    </div>
                    <div class="telemetry-item">
                        <span class="telemetry-label">Communication</span>
                        <span class="telemetry-value comm-active">ACTIVE</span>
                        <span class="telemetry-unit">-</span>
                    </div>
                </div>
            `;
            dashboardContent.appendChild(missionCard);
        }
        
        // Add real-time telemetry graph placeholder
        const graphCard = document.createElement('div');
        graphCard.className = 'telemetry-card graph-card';
        graphCard.innerHTML = `
            <div class="card-header">
                <h4>Telemetry Trends</h4>
                <div class="graph-controls">
                    <button class="graph-btn active" data-param="altitude">ALT</button>
                    <button class="graph-btn" data-param="speed">SPD</button>
                    <button class="graph-btn" data-param="position">POS</button>
                </div>
            </div>
            <div class="telemetry-graph">
                <canvas id="telemetry-canvas" width="400" height="150"></canvas>
                <div class="graph-placeholder">Real-time telemetry visualization</div>
            </div>
        `;
        dashboardContent.appendChild(graphCard);
    }
    
    document.getElementById('advanced-telemetry').style.display = 'block';
    
    // Start real-time updates
    if (window.telemetryUpdateInterval) {
        clearInterval(window.telemetryUpdateInterval);
    }
    
    window.telemetryUpdateInterval = setInterval(() => {
        const clockElement = document.getElementById('mission-clock');
        if (clockElement) {
            clockElement.textContent = simulationTime.toISOString().split('T')[1].split('.')[0] + ' UTC';
        }
        
        // Update telemetry values in real-time
        if (telemetryData[activeSatellite]) {
            const telemetry = telemetryData[activeSatellite];
            const values = document.querySelectorAll('.telemetry-value');
            // Update specific values that change frequently
            // This could be enhanced with more sophisticated real-time updates
        }
    }, 1000);
}

function hideAdvancedTelemetry() {
    document.getElementById('advanced-telemetry').style.display = 'none';
    
    // Clear real-time update interval
    if (window.telemetryUpdateInterval) {
        clearInterval(window.telemetryUpdateInterval);
        window.telemetryUpdateInterval = null;
    }
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
