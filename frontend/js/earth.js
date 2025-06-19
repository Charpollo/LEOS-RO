import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE, TIME_ACCELERATION } from './constants.js';

export async function createEarth(scene, getTimeMultiplier, sunDirection) {
    // Create Earth with realistic day/night terminator and city lights
    
    // Create base Earth mesh with optimized polygon count
    const earthMesh = BABYLON.MeshBuilder.CreateSphere('earth', { 
        segments: 64, // Higher detail for better lighting
        diameter: 2 // Unit sphere (radius 1)
    }, scene);
    
    // Earth's proper axial tilt (23.5 degrees)
    const EARTH_TILT = 23.5 * Math.PI / 180;
    // Fine-tune tilt to reduce rightward lean
    earthMesh.rotation.x = EARTH_TILT + 0.05; // Smaller adjustment for better alignment
    
    // Don't rotate the Earth mesh - keep ground stations at their real GPS coordinates
    // Instead, adjust texture mapping in the shader to align with ground stations
    earthMesh.rotation.y = 0; // Keep mesh at 0° so ground stations stay at real coordinates
    
    // Load day and night textures
    const dayTexture = new BABYLON.Texture('assets/earth_diffuse.png', scene, false, false,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        () => console.log("Earth day texture loaded successfully"),
        () => {
            console.log("PNG not found, trying JPG");
            const fallback = new BABYLON.Texture('assets/earth_diffuse.jpg', scene);
            return fallback;
        }
    );
    
    const nightTexture = new BABYLON.Texture('assets/earth_night.jpg', scene, false, false,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        () => console.log("Earth night texture loaded successfully")
    );
    
    // Texture orientation - flip UV in shader to fix mirrored continents
    const earthTextureUOffset = 0.0;
    const earthTextureVOffset = 0.0;
    const earthTextureUScale = 1.0;
    const earthTextureVScale = 1.0;
    
    // Note: Texture flipped in shader, position controlled by mesh rotation
    
    // Define custom shaders for realistic Earth rendering
    BABYLON.Effect.ShadersStore['earthVertexShader'] = `
        precision highp float;
        
        // Attributes
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        
        // Uniforms
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        uniform vec3 cameraPosition;
        
        // Varyings
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUV;
        varying vec3 vViewDirection;
        
        void main() {
            vec4 worldPosition = world * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            vNormal = normalize(mat3(world) * normal);
            
            // Adjust texture coordinates to align with ground station positions
            vec2 correctedUV = uv;
            correctedUV.x = 1.0 - uv.x; // Flip U coordinate to un-mirror continents
            correctedUV.x = correctedUV.x + 0.50; // Shift texture further right (about 180°) to align Wallops with East Coast
            if (correctedUV.x > 1.0) correctedUV.x -= 1.0; // Wrap around if needed
            vUV = correctedUV;
            
            vViewDirection = normalize(cameraPosition - worldPosition.xyz);
            
            gl_Position = worldViewProjection * vec4(position, 1.0);
        }
    `;
    
    BABYLON.Effect.ShadersStore['earthFragmentShader'] = `
        precision highp float;
        
        // Varyings
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUV;
        varying vec3 vViewDirection;
        
        // Uniforms
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 lightDirection;
        uniform float time;
        
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(-lightDirection);
            
            // Calculate lighting
            float lambert = dot(normal, lightDir);
            
            // Create smooth terminator transition
            float terminator = smoothstep(-0.1, 0.1, lambert);
            
            // Sample textures
            vec3 dayColor = texture2D(dayTexture, vUV).rgb;
            vec3 nightColor = texture2D(nightTexture, vUV).rgb;
            
            // City lights - much dimmer and warmer to make dark side truly dark
            vec3 cityLights = nightColor * (1.0 - terminator) * 0.8;
            
            // Make dark areas truly dark by reducing minimum lighting
            vec3 finalColor = mix(cityLights, dayColor * max(0.05, lambert), terminator);
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;
    
    // Create the shader material
    const earthMaterial = new BABYLON.ShaderMaterial('earthShader', scene, 
        { vertex: 'earth', fragment: 'earth' },
        {
            attributes: ['position', 'normal', 'uv'],
            uniforms: ['worldViewProjection', 'world', 'cameraPosition', 'lightDirection', 'time']
        }
    );
    
    // Set textures
    earthMaterial.setTexture('dayTexture', dayTexture);
    earthMaterial.setTexture('nightTexture', nightTexture);
    earthMaterial.setVector3('lightDirection', scene.sunLight.direction);
    earthMaterial.setFloat('time', 0.0);
    
    // Apply material to Earth mesh
    earthMaterial.backFaceCulling = false;
    earthMesh.material = earthMaterial;
    earthMesh.receiveShadows = true;
    
    // Create clouds layer
    const cloudsMesh = BABYLON.MeshBuilder.CreateSphere('clouds', {
        segments: 32,
        diameter: 2.008 // Slightly larger than Earth
    }, scene);
    
    // Create clouds material
    const cloudsMaterial = new BABYLON.StandardMaterial('cloudsMaterial', scene);
    const cloudsTexture = new BABYLON.Texture('assets/earth_clouds.jpg', scene);
    
    cloudsMaterial.diffuseTexture = cloudsTexture;
    // Flip clouds texture to match the Earth surface orientation
    cloudsMaterial.diffuseTexture.uOffset = 1.0; // Offset to flip
    cloudsMaterial.diffuseTexture.vOffset = 0.0;
    cloudsMaterial.diffuseTexture.uScale = -1.0; // Negative scale to flip horizontally
    cloudsMaterial.diffuseTexture.vScale = 1.0;
    cloudsMaterial.diffuseTexture.level = 1.5;
    
    cloudsMaterial.diffuseColor = new BABYLON.Color3(1.2, 1.2, 1.2);
    cloudsMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    cloudsMaterial.opacityTexture = cloudsTexture;
    cloudsMaterial.opacityTexture.getAlphaFromRGB = true;
    cloudsMaterial.alpha = 0.4;
    cloudsMaterial.backFaceCulling = false;
    cloudsMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    
    cloudsMesh.material = cloudsMaterial;
    cloudsMesh.parent = earthMesh;
    
    // Create atmosphere layer
    const atmosphereMesh = BABYLON.MeshBuilder.CreateSphere('atmosphere', {
        segments: 24,
        diameter: 2.015 // Slightly larger than clouds
    }, scene);
    
    const atmosphereMaterial = new BABYLON.StandardMaterial('atmosphereMaterial', scene);
    atmosphereMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    atmosphereMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.9);
    atmosphereMaterial.alpha = 0.15;
    atmosphereMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    atmosphereMaterial.backFaceCulling = false;
    
    // Enhanced Fresnel effect for atmospheric rim glow
    atmosphereMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    atmosphereMaterial.emissiveFresnelParameters.bias = 0.6;
    atmosphereMaterial.emissiveFresnelParameters.power = 2.0;
    atmosphereMaterial.emissiveFresnelParameters.leftColor = new BABYLON.Color3(0.35, 0.6, 1.0);
    atmosphereMaterial.emissiveFresnelParameters.rightColor = BABYLON.Color3.Black();
    
    atmosphereMesh.material = atmosphereMaterial;
    atmosphereMesh.parent = earthMesh;
    
    // Store references for updates
    scene.earthMaterial = earthMaterial;
    scene.cloudsMaterial = cloudsMaterial;
    scene.atmosphereMaterial = atmosphereMaterial;

    // Enhanced day/night cycle with realistic Earth rotation
    let frameCount = 0;
    let earthRotation = 0;
    let solarTime = 0;

    scene.registerBeforeRender(() => {
        // Only update every 2 frames for performance
        if (frameCount++ % 2 !== 0) return;
        
        // Physically accurate Earth rotation
        const timeMultiplier = getTimeMultiplier();
        const simSecondsPerFrame = timeMultiplier * TIME_ACCELERATION * (scene.getAnimationRatio() || 1);
        const earthRotationPerSecond = 2 * Math.PI / 86164; // Earth's sidereal day
        const rotationStep = earthRotationPerSecond * simSecondsPerFrame;
        
        earthMesh.rotation.y -= rotationStep;
        earthRotation += rotationStep;
        
        // Update clouds at slightly different rate
        cloudsMesh.rotation.y = earthMesh.rotation.y * 1.05;

        // Update shader uniforms
        if (scene.sunLight) {
            earthMaterial.setVector3('lightDirection', scene.sunLight.direction);
            earthMaterial.setFloat('time', frameCount * 0.01);
            
            // Update sun position for seasonal effects
            solarTime += timeMultiplier * 0.001;
            const earthOrbitAngle = solarTime * 2 * Math.PI / 365.25;
            const tilt = 23.5 * Math.PI / 180;
            
            const dayOfYear = (solarTime % 365.25) / 365.25;
            const seasonAngle = (dayOfYear * 2 * Math.PI) - Math.PI/2;
            
            const sunDir = new BABYLON.Vector3(
                Math.cos(earthOrbitAngle),
                Math.sin(tilt) * Math.sin(seasonAngle),
                Math.sin(earthOrbitAngle + Math.PI/2) * Math.cos(tilt)
            ).normalize();
            
            scene.sunLight.direction = sunDir.negate();
            
            if (sunDirection) {
                sunDirection.copyFrom(sunDir);
            }
            
            // Update atmosphere based on lighting
            const surfaceToSunDot = BABYLON.Vector3.Dot(sunDir, new BABYLON.Vector3(1, 0, 0));
            const terminatorFactor = Math.pow(1.0 - Math.abs(surfaceToSunDot), 16);
            
            const atmFactor = 0.1 + terminatorFactor * 0.3;
            atmosphereMaterial.alpha = atmFactor;
            
            const isNightSide = surfaceToSunDot < 0;
            atmosphereMaterial.emissiveColor = isNightSide
                ? new BABYLON.Color3(0.05, 0.1, 0.3)
                : new BABYLON.Color3(0.15, 0.35, 0.8).scale(1 + terminatorFactor * 2);
        }
    });
    
    return earthMesh;
}
