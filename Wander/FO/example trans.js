/**
 * CyberRTS Home Page Globe Animation - Babylon.js Version
 * Beautiful rotating globe with orbital mechanics visualization
 * Enhanced version with modern particle effects and lighting using Babylon.js
 */

let engine, scene, camera, canvas;
let globe, earthMaterial, dayTexture, nightTexture; // Store day and night textures for toggle
let satellites = [];
let stars;
let animationId;
let isPageVisible = true;
let isGlobeVisible = true;
let time = 0;

// Camera orbital controls
let cameraOrbitRadius = 8;
let cameraTheta = 0;
let cameraPhi = Math.PI / 2;
let targetCameraTheta = 0;
let targetCameraPhi = Math.PI / 2;
let isDragging = false;

// Performance optimization - pause animation when page is not visible
document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    
    if (isPageVisible && engine) {
        engine.runRenderLoop(animate);
    } else if (!isPageVisible && engine) {
        engine.stopRenderLoop();
    }
});

// Setup sun direction for terminator shader
let sunDirection = new BABYLON.Vector3(-1, -0.5, -0.8);

// Custom GLSL shaders for realistic day-night terminator
BABYLON.Effect.ShadersStore["earthVertexShader"] = `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vNormal;
varying vec2 vUV;
void main() {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    // Transform normal by world matrix for correct lighting as globe rotates
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vUV = uv;
}`;

BABYLON.Effect.ShadersStore["earthFragmentShader"] = `
precision highp float;
varying vec3 vNormal;
varying vec2 vUV;
uniform sampler2D textureDay;
uniform sampler2D textureNight;
uniform vec3 lightDirection;
void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightDirection);
    float lambert = dot(N, L);
    // Smooth blend instead of hard switch
    float blend = smoothstep(-0.1, 0.1, lambert);
    vec4 dayColor = texture2D(textureDay, vUV) * 0.8; // dim daytime
    vec4 nightColor = texture2D(textureNight, vUV);
    vec4 color = mix(nightColor, dayColor, blend);
    // Soft glow around terminator
    float glow = smoothstep(-0.2, 0.2, lambert) * (1.0 - abs(lambert)) * 0.3;
    color.rgb += glow;
    gl_FragColor = vec4(color.rgb, 1.0);
}`;

// Initialize the enhanced globe scene with Babylon.js
function initHomeScene() {
    canvas = document.getElementById('heroCanvas');
    
    if (!canvas) {
        console.warn('Canvas not found');
        return;
    }

    // Create Babylon.js engine with enhanced settings
    engine = new BABYLON.Engine(canvas, true, {
        antialias: true,
        stencil: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
    });

    // Create scene with fog
    scene = new BABYLON.Scene(engine);
    // Make background transparent
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.01;
    scene.fogColor = new BABYLON.Color3(0, 0, 0);

    // Create arc rotate camera for better orbital controls
    camera = new BABYLON.ArcRotateCamera(
        "Camera", 
        0, Math.PI / 2, 
        cameraOrbitRadius, 
        BABYLON.Vector3.Zero(), 
        scene
    );
    
    // Enhanced camera settings
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    camera.wheelPrecision = 50;
    camera.pinchPrecision = 200;
    camera.panningSensibility = 0;
    camera.angularSensibilityX = 1000;
    camera.angularSensibilityY = 1000;
    
    // Limit camera movement
    // camera.lowerRadiusLimit = 2.5;
    // camera.upperRadiusLimit = 15;
    camera.lowerRadiusLimit = camera.radius;
    camera.upperRadiusLimit = camera.radius;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI - 0.1;

    // Set up camera controls
    camera.setTarget(BABYLON.Vector3.Zero());
    // Enable user interaction: drag to rotate, scroll to zoom
    camera.attachControl(canvas, true);

    // Set initial canvas size
    resizeCanvas();

    // Create enhanced Earth
    createEnhancedEarth();
    
    // Create deep space stars
    createEnhancedStars();
    
    // Create orbital satellites
    createOrbitalSatellites();
    
    // Add dynamic lighting
    addDynamicLighting();

    // Add enhanced interactions
    addEnhancedInteractions();

    // Add glow effect around Earth for realistic day/night terminator glow
    const glowLayer = new BABYLON.GlowLayer("earthGlow", scene);
    glowLayer.intensity = 0.3;

    // Automatic day/night mode based on system clock
    function updateDayNight() {
        const hours = new Date().getHours();
        if (hours >= 6 && hours < 18) {
            if (dayTexture && earthMaterial.diffuseTexture !== dayTexture) {
                earthMaterial.diffuseTexture = dayTexture;
                console.log("Auto switched to Day mode");
            }
        } else {
            if (nightTexture && earthMaterial.diffuseTexture !== nightTexture) {
                earthMaterial.diffuseTexture = nightTexture;
                console.log("Auto switched to Night mode");
            }
        }
    }
    updateDayNight();
    setInterval(updateDayNight, 60000);

    // Start the render loop
    engine.runRenderLoop(animate);
}

function createEnhancedEarth() {
    // Create Earth sphere with high detail
    globe = BABYLON.MeshBuilder.CreateSphere("earth", {
        diameter: 3.6,
        segments: 64
    }, scene);
    globe.rotation.y = Math.PI / 4; // 45 degrees counterclockwise
    globe.rotation.x = Math.PI; // Earth's tilt
    globe.rotation.z = BABYLON.Tools.ToRadians(23.5);

    // Create enhanced Earth material with custom shader
    earthMaterial = new BABYLON.StandardMaterial("earthMaterial", scene);
    
    // Load Earth textures with enhanced error handling
    const assetsManager = new BABYLON.AssetsManager(scene);
    
    // Day texture
    const dayTextureTask = assetsManager.addTextureTask("dayTexture", "assets/earth_diffuse.png");
    dayTextureTask.onSuccess = (task) => {
        dayTexture = task.texture;
        // Initial placeholder, will be replaced by shader
        earthMaterial.diffuseTexture = task.texture;
        updateEarthShader();
    };
    dayTextureTask.onError = (task, message, exception) => {
        console.error('Error loading Earth day texture:', message, exception);
        // Fallback to procedural earth
        createProceduralEarth();
    };

    // Night texture (optional)
    const nightTextureTask = assetsManager.addTextureTask("nightTexture", "assets/earth_night.jpg");
    nightTextureTask.onSuccess = (task) => {
        nightTexture = task.texture;
        updateEarthShader();
    };
    nightTextureTask.onError = (task, message, exception) => {
        console.warn('Night texture not loaded, using fallback');
    };

    // Load textures
    assetsManager.load();

    // Helper to swap to terminator shader material once both textures are available
    function updateEarthShader() {
        if (dayTexture && nightTexture && globe) {
            const shaderMat = new BABYLON.ShaderMaterial("earthShader", scene, {
                vertex: "earth",
                fragment: "earth",
            }, {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldViewProjection", "lightDirection"]
            });
            shaderMat.setTexture("textureDay", dayTexture);
            shaderMat.setTexture("textureNight", nightTexture);
            shaderMat.setVector3("lightDirection", sunDirection);
            globe.material = shaderMat;
            earthMaterial = shaderMat;
        }
    }

    // Day texture task
    dayTextureTask.onSuccess = (task) => {
        dayTexture = task.texture;
        // Initial placeholder, will be replaced by shader
        earthMaterial.diffuseTexture = task.texture;
        updateEarthShader();
    };

    // Night texture task
    nightTextureTask.onSuccess = (task) => {
        nightTexture = task.texture;
        updateEarthShader();
    };

    // Enhanced material properties for high fidelity Earth
    earthMaterial.roughness = 0.9;
    earthMaterial.metallicFactor = 0.0;
    earthMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    // Apply material to globe
    globe.material = earthMaterial;
    globe.receiveShadows = true;

    // Enable click interaction on Earth
    globe.actionManager = new BABYLON.ActionManager(scene);
    globe.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => { console.log('Earth clicked!'); }
        )
    );

    // Add continental markers only (no clouds or atmosphere)
    // Removed green continental markers
}

function createProceduralEarth() {
    // Fallback procedural Earth material - no emissive colors
    earthMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
    earthMaterial.specularColor = new BABYLON.Color3(0.1, 0.2, 0.4);
    // Remove emissive color to eliminate glow
    // earthMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.15);
    console.log('Using procedural Earth material as fallback');
}

function createOrbitalSatellites() {
    satellites = [];
    // Use Afterburner Blue and Aerospace Orange for SDA-level NORAD points
    const afterburnerBlue = new BABYLON.Color3(0.02, 0.63, 0.77); // #04a1c4
    const aerospaceOrange = new BABYLON.Color3(0.92, 0.57, 0.05); // #eb920d
    const microSatGeometry = { diameter: 0.012, segments: 6 };
    // Simulate a large number of NORAD data points (e.g., 2000+)
    const totalNORAD = 2000;
    for (let i = 0; i < totalNORAD; i++) {
        const color = i % 2 === 0 ? afterburnerBlue : aerospaceOrange;
        const mat = new BABYLON.StandardMaterial(`noradMat_${i}`, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color;
        mat.disableLighting = true;
        // Randomize orbital parameters for realism
        const angle = (i / totalNORAD) * Math.PI * 2 + Math.random() * 0.1;
        const radius = 2.2 + Math.random() * 4.0; // LEO to GEO
        const inclination = (Math.random() - 0.5) * 2.5;
        const satellite = BABYLON.MeshBuilder.CreateSphere(`norad_${i}`, microSatGeometry, scene);
        satellite.material = mat;
        satellite.position.x = Math.cos(angle) * radius;
        satellite.position.z = Math.sin(angle) * radius;
        satellite.position.y = inclination;
        satellite.metadata = {
            orbitRadius: radius,
            orbitSpeed: -(0.0005 + Math.random() * 0.001), // Slower
            angle: angle,
            type: 'NORAD',
            baseY: inclination
        };
        satellites.push(satellite);
    }
    console.log(`Created ${satellites.length} NORAD data point satellites (SDA-level)`);
}

function createEnhancedStars() {
    // Create particle system for stars
    const starSystem = new BABYLON.ParticleSystem("stars", 2000, scene);
    
    // Create a texture for star particles
    starSystem.particleTexture = new BABYLON.Texture("assets/stars.png", scene, false, false, 
        BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
        () => console.log('Star texture loaded'),
        () => {
            console.warn('Star texture not found, using default');
            // Create a simple white circle texture
            const dynamicTexture = new BABYLON.DynamicTexture("starTexture", 64, scene);
            const context = dynamicTexture.getContext();
            context.fillStyle = "white";
            context.beginPath();
            context.arc(32, 32, 30, 0, 2 * Math.PI);
            context.fill();
            dynamicTexture.update();
            starSystem.particleTexture = dynamicTexture;
        }
    );

    // Star emitter configuration
    starSystem.emitter = BABYLON.Vector3.Zero();
    starSystem.minEmitBox = new BABYLON.Vector3(-80, -80, -80);
    starSystem.maxEmitBox = new BABYLON.Vector3(80, 80, 80);

    // Particle properties
    starSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
    starSystem.color2 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0);
    starSystem.colorDead = new BABYLON.Color4(0.0, 0.0, 0.0, 0.0);

    starSystem.minSize = 0.1;
    starSystem.maxSize = 0.5;
    starSystem.minLifeTime = Number.MAX_SAFE_INTEGER;
    starSystem.maxLifeTime = Number.MAX_SAFE_INTEGER;

    starSystem.emitRate = 2000;
    starSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    starSystem.gravity = BABYLON.Vector3.Zero();
    starSystem.direction1 = BABYLON.Vector3.Zero();
    starSystem.direction2 = BABYLON.Vector3.Zero();
    starSystem.minAngularSpeed = 0;
    starSystem.maxAngularSpeed = 0;
    starSystem.minInitialRotation = 0;
    starSystem.maxInitialRotation = 0;

    starSystem.start();
    stars = starSystem;
}

function addDynamicLighting() {
    // Enhanced ambient light
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.4;
    ambientLight.diffuse = new BABYLON.Color3(0.1, 0.1, 0.2);

    // Primary directional light (sun)
    const primaryLight = new BABYLON.DirectionalLight("primaryLight", new BABYLON.Vector3(-1, -0.5, -0.8), scene);
    primaryLight.intensity = 1.8;
    primaryLight.diffuse = new BABYLON.Color3(1, 1, 1);
    primaryLight.shadowMinZ = 0.5;
    primaryLight.shadowMaxZ = 50;
    
    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, primaryLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    
    // Add satellites to shadow casters
    satellites.forEach(satellite => {
        if (satellite.metadata.type === 'GEO-CommSat') {
            shadowGenerator.addShadowCaster(satellite);
        }
    });

    // Secondary fill light
    const fillLight = new BABYLON.PointLight("fillLight", new BABYLON.Vector3(-8, -4, -6), scene);
    fillLight.intensity = 0.6;
    fillLight.diffuse = new BABYLON.Color3(0.3, 0.6, 0.9);
    fillLight.range = 20;

    // Rim light for atmosphere effect
    const rimLight = new BABYLON.SpotLight("rimLight", 
        new BABYLON.Vector3(-6, 3, 5),
        new BABYLON.Vector3(1, -0.5, -0.8),
        Math.PI / 4, 2, scene);
    rimLight.intensity = 1.0;
    rimLight.diffuse = new BABYLON.Color3(0, 0.8, 1);
    rimLight.range = 20;
    
    // Warm accent light
    const warmLight = new BABYLON.PointLight("warmLight", new BABYLON.Vector3(5, -2, 3), scene);
    warmLight.intensity = 0.5;
    warmLight.diffuse = new BABYLON.Color3(1, 0.7, 0.3);
    warmLight.range = 15;
}

function addEnhancedInteractions() {
    // Enhanced visual feedback for canvas
    function updateCanvasStyle(state) {
        switch(state) {
            case 'hover':
                canvas.style.cursor = 'grab';
                canvas.style.filter = 'brightness(1.05)';
                break;
            case 'dragging':
                canvas.style.cursor = 'grabbing';
                canvas.style.filter = 'brightness(1.15) saturate(1.1)';
                break;
            case 'normal':
                canvas.style.cursor = 'grab';
                canvas.style.filter = 'brightness(1.0)';
                break;
        }
    }
    
    // Keyboard preset controls
    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            const key = kbInfo.event.key.toLowerCase();
            // Day/Night toggle
            if (key === 'n' && nightTexture) {
                earthMaterial.diffuseTexture = nightTexture;
                console.log('Switched to night mode');
            }
            if (key === 'd' && dayTexture) {
                earthMaterial.diffuseTexture = dayTexture;
                console.log('Switched to day mode');
            }
            switch (key) {
                case '1': // Equatorial view
                    camera.setTarget(BABYLON.Vector3.Zero());
                    camera.alpha = 0;
                    camera.beta = Math.PI / 2;
                    camera.radius = 6;
                    break;
                case '2': // Polar view
                    camera.setTarget(BABYLON.Vector3.Zero());
                    camera.alpha = 0;
                    camera.beta = 0.1;
                    camera.radius = 7;
                    break;
                case '3': // Orbital view
                    camera.setTarget(BABYLON.Vector3.Zero());
                    camera.alpha = Math.PI / 4;
                    camera.beta = Math.PI / 3;
                    camera.radius = 9;
                    break;
                case '4': // Wide constellation view
                    camera.setTarget(BABYLON.Vector3.Zero());
                    camera.alpha = Math.PI / 6;
                    camera.beta = Math.PI / 2.5;
                    camera.radius = 14;
                    break;
                case 'r':
                case 'R': // Reset view
                    camera.setTarget(BABYLON.Vector3.Zero());
                    camera.alpha = 0;
                    camera.beta = Math.PI / 2;
                    camera.radius = 8;
                    break;
            }
        }
    });
    
    // Mouse enter/leave events
    canvas.addEventListener('mouseenter', () => {
        updateCanvasStyle('hover');
    });
    
    canvas.addEventListener('mouseleave', () => {
        updateCanvasStyle('normal');
    });
    
    canvas.addEventListener('mousedown', () => {
        updateCanvasStyle('dragging');
    });
    
    canvas.addEventListener('mouseup', () => {
        updateCanvasStyle('hover');
    });
    
    // Initial styling
    updateCanvasStyle('normal');
}

function setupIntersectionObserver() {
    const globeContainer = document.querySelector('.globe-container');
    if (!globeContainer) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isGlobeVisible = entry.isIntersecting;
        });
    }, {
        threshold: 0.1
    });
    
    observer.observe(globeContainer);
}

// Enhanced animation loop with Babylon.js
function animate() {
    if (!isPageVisible || !isGlobeVisible || !scene) {
        return;
    }
    
    time += 0.01;

    if (globe) {
        // Simple rotation without auto-rotation
        globe.rotation.y -= 0.001; // slightly faster rotation
        
        // Remove pulsing animation for continental markers
        // Globe can rotate but markers stay static
    }
    
    // Animate orbital satellites with simplified behaviors (no pulsing)
    satellites.forEach(satellite => {
        const data = satellite.metadata;
        data.angle -= data.orbitSpeed * 0.75; // slightly faster satellite orbits
        
        // Update orbital position
        satellite.position.x = Math.cos(data.angle) * data.orbitRadius;
        satellite.position.z = Math.sin(data.angle) * data.orbitRadius;
        satellite.position.y = data.baseY + Math.sin(time * 1.5 + data.angle) * 0.02;
        
        // Simple rotation without pulsing
        satellite.rotation.y -= 0.02;
        satellite.rotation.x -= 0.015;
        
        // Distance-based visibility (no pulsing effects)
        const distanceToCamera = BABYLON.Vector3.Distance(satellite.position, camera.position);
        const visibility = Math.max(0.5, Math.min(1.0, 8.0 / distanceToCamera));
        if (satellite.material && satellite.material.alpha !== undefined) {
            satellite.material.alpha = visibility;
        }
    });
    
    // Log tracking information periodically
    if (Math.floor(time * 10) % 100 === 0 && satellites.length > 0) {
        console.log(`Babylon.js Tracking Update (${Math.floor(time)}s): ${satellites.length} objects tracked`);
    }
    
    // Render the scene
    scene.render();
}

// Resize handler
function resizeCanvas() {
    if (!engine || !canvas) return;
    
    // Set canvas size to match container
    const container = canvas.parentElement;
    if (container) {
        canvas.width = 700;
        canvas.height = 700;
        engine.resize();
    }
}

// Initialize and configure the scene on window load
window.addEventListener('load', () => {
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (event) => event.preventDefault());
    
    // Initialize the home scene
    initHomeScene();
});

// Handle window resize events
window.addEventListener('resize', resizeCanvas);

// Animated Statistics Counter (keep the existing functionality)
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-target'));
        const increment = target / 200;
        let current = 0;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                if (current > target) current = target;
                
                if (target >= 1000) {
                    counter.textContent = Math.floor(current).toLocaleString();
                } else if (target === 99.9) {
                    counter.textContent = current.toFixed(1);
                } else {
                    counter.textContent = Math.floor(current);
                }
                
                requestAnimationFrame(updateCounter);
            }
        };
        
        updateCounter();
    };
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                const counter = entry.target.querySelector('.stat-number');
                if (counter && !counter.classList.contains('animated')) {
                    counter.classList.add('animated');
                    setTimeout(() => animateCounter(counter), 300);
                }
            }
        });
    }, {
        threshold: 0.3
    });
    
    document.querySelectorAll('.stat-item').forEach(item => {
        statsObserver.observe(item);
    });
}

// Initialize counters when DOM is ready
document.addEventListener('DOMContentLoaded', animateCounters);
