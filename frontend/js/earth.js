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
    
    // Create a simple blank texture for specular instead of trying to load .tif/.tiff
    console.log("Creating simple specular map");
    const specularTexture = new BABYLON.Texture("assets/earth_diffuse.png", scene);
    
    // Use this dummy texture but actually handle specular in the shader based on color
    
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
        uniform sampler2D cloudShadowTexture;
        uniform vec3 lightDirection;
        uniform float time;
        uniform float cloudsShadowFactor;
        uniform vec2 cloudOffset;
        
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(-lightDirection);
            
            // Calculate lighting
            float lambert = dot(normal, lightDir);
            
            // Wider, more gradual terminator transition
            float terminator = smoothstep(-0.3, 0.3, lambert);
            
            // Sample textures
            vec3 dayColor = texture2D(dayTexture, vUV).rgb;
            vec3 nightColor = texture2D(nightTexture, vUV).rgb;
            
            // Sample cloud shadow texture (offset by animation)
            vec2 cloudUV = vUV + cloudOffset;
            cloudUV = mod(cloudUV, 1.0); // Wrap around 0-1
            float cloudShadow = texture2D(cloudShadowTexture, cloudUV).a;
            cloudShadow = mix(1.0, 1.0 - cloudShadow * cloudsShadowFactor, terminator);
            
            // Apply cloud shadows to day side only
            dayColor *= cloudShadow;
            
            // Detect water areas using color information from dayTexture
            // Water is typically darker and more blue than land
            float isWater = 0.0;
            if (dayColor.b > dayColor.r * 1.3 && dayColor.b > dayColor.g * 1.2) {
                isWater = pow(dayColor.b - max(dayColor.r, dayColor.g), 1.5) * 7.0;
                isWater = clamp(isWater, 0.0, 0.7);
            }
            
            // Calculate extremely subtle water reflections with minimal glare
            float angleFactor = max(0.0, dot(reflect(-lightDir, normal), vViewDirection));
            float waterSpecular = pow(angleFactor, 64.0) * isWater * 0.05; // Very low intensity (0.05)
            
            // Only add specular reflection when sun is at a good angle (reduces unrealistic glare)
            // and only visible on the day side of Earth
            float sunAngleIntensity = pow(max(0.0, lambert), 2.0);
            waterSpecular *= sunAngleIntensity * terminator;
            
            // Extremely subtle specular color with blue tint for more realism
            vec3 waterHighlight = vec3(0.95, 0.97, 1.0) * waterSpecular;
            dayColor += waterHighlight;
            
            // City lights - darker night side with more contrast
            vec3 cityLights = nightColor * (1.0 - terminator) * 0.15; // Reduced brightness to 0.15
            
            // Make night side darker by applying a darkening factor
            cityLights *= vec3(0.8, 0.85, 0.9); // Slightly blue tint for deep night
            
            // Day lighting
            vec3 dayLighting = dayColor * max(0.0, lambert);
            
            // Very very subtle terminator enhancement - barely visible
            float terminatorGlow = 1.0 - abs(lambert) / 0.2; // Slightly wider
            terminatorGlow = max(0.0, terminatorGlow);
            terminatorGlow = pow(terminatorGlow, 6.0); // Much more focused
            
            vec3 subtleWarmth = vec3(1.05, 1.02, 1.0); // Almost imperceptible warmth
            vec3 terminatorEnhancement = subtleWarmth * terminatorGlow * 0.02; // Extremely subtle
            
            // Enhanced night-day transition with darker night side
            vec3 finalColor = mix(cityLights, dayLighting, terminator);
            
            // Make deep night side even darker by applying an additional darkness factor to the night portions
            float deepNight = pow(1.0 - terminator, 1.5); // Stronger darkness effect further from terminator
            finalColor = mix(finalColor, finalColor * 0.6, deepNight * 0.7); // Darken night side more
            
            // Apply the terminator enhancement
            finalColor *= (1.0 + terminatorEnhancement); // Multiply instead of add for more natural look
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;
    
    // Create the shader material
    const earthMaterial = new BABYLON.ShaderMaterial('earthShader', scene, 
        { vertex: 'earth', fragment: 'earth' },
        {
            attributes: ['position', 'normal', 'uv'],
            uniforms: ['worldViewProjection', 'world', 'cameraPosition', 'lightDirection', 'time', 'cloudOffset', 'cloudsShadowFactor']
        }
    );
    
    // Set textures
    earthMaterial.setTexture('dayTexture', dayTexture);
    earthMaterial.setTexture('nightTexture', nightTexture);
    earthMaterial.setVector3('lightDirection', scene.sunLight.direction);
    earthMaterial.setFloat('time', 0.0);
    earthMaterial.setFloat('cloudsShadowFactor', 0.3); // Control shadow intensity
    earthMaterial.setVector2('cloudOffset', new BABYLON.Vector2(0, 0));
    
    // Apply material to Earth mesh
    earthMaterial.backFaceCulling = false;
    earthMesh.material = earthMaterial;
    earthMesh.receiveShadows = true;
    
    // Create clouds layer
    const cloudsMesh = BABYLON.MeshBuilder.CreateSphere('clouds', {
        segments: 32,
        diameter: 2.008 // Slightly larger than Earth
    }, scene);
    
    // Create clouds material with standard material but improved settings
    const cloudsMaterial = new BABYLON.StandardMaterial('cloudsMaterial', scene);
    const cloudsTexture = new BABYLON.Texture('assets/earth_clouds.jpg', scene);
    
    // Apply same texture correction as Earth surface
    cloudsTexture.uOffset = 1.0;
    cloudsTexture.vOffset = 0.0;
    cloudsTexture.uScale = -1.0;
    cloudsTexture.vScale = 1.0;
    cloudsTexture.wrapU = BABYLON.Texture.MIRROR_ADDRESSMODE;
    cloudsTexture.wrapV = BABYLON.Texture.MIRROR_ADDRESSMODE;
    
    cloudsMaterial.diffuseTexture = cloudsTexture;
    cloudsMaterial.opacityTexture = cloudsTexture;
    cloudsMaterial.opacityTexture.getAlphaFromRGB = true;
    
    cloudsMaterial.diffuseColor = new BABYLON.Color3(1.0, 1.0, 1.0);
    cloudsMaterial.alpha = 0.25; // Further reduced opacity for subtlety
    cloudsMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    cloudsMaterial.backFaceCulling = false;
    
    // Make clouds respond to lighting so they're darker on night side
    cloudsMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0); // No self-illumination
    
    cloudsMesh.material = cloudsMaterial;
    cloudsMesh.parent = earthMesh;
    
    // Share cloud texture with Earth shader for cloud shadows
    earthMaterial.setTexture('cloudShadowTexture', cloudsTexture);
    
    // Create enhanced atmosphere layer with two layers for more realistic scattering
    const atmosphereMesh = BABYLON.MeshBuilder.CreateSphere('atmosphere', {
        segments: 36, // Higher detail for smoother appearance
        diameter: 2.015 // Slightly larger than clouds
    }, scene);
    
    const atmosphereMaterial = new BABYLON.StandardMaterial('atmosphereMaterial', scene);
    atmosphereMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    atmosphereMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.9);
    atmosphereMaterial.alpha = 0.15;
    atmosphereMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    atmosphereMaterial.backFaceCulling = false;
    
    // Create outer atmosphere glow for more depth
    const outerAtmosphere = BABYLON.MeshBuilder.CreateSphere('outerAtmosphere', {
        segments: 24,
        diameter: 2.05 // Even larger for outer glow
    }, scene);
    
    const outerAtmMaterial = new BABYLON.StandardMaterial('outerAtmMaterial', scene);
    outerAtmMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    outerAtmMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.8);
    outerAtmMaterial.alpha = 0.05;
    outerAtmMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    outerAtmMaterial.backFaceCulling = false;
    
    // More subtle and realistic Fresnel effect for outer atmosphere
    outerAtmMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    outerAtmMaterial.emissiveFresnelParameters.bias = 0.8; // Higher bias to reduce effect
    outerAtmMaterial.emissiveFresnelParameters.power = 5.0; // Higher power for narrower effect
    outerAtmMaterial.emissiveFresnelParameters.leftColor = new BABYLON.Color3(0.15, 0.25, 0.5); // Much less intense color
    outerAtmMaterial.emissiveFresnelParameters.rightColor = BABYLON.Color3.Black();
    
    outerAtmosphere.material = outerAtmMaterial;
    outerAtmosphere.parent = earthMesh;
    
    // More subtle and realistic Fresnel effect for atmospheric rim glow
    atmosphereMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
    atmosphereMaterial.emissiveFresnelParameters.bias = 0.7; // Higher bias to reduce effect
    atmosphereMaterial.emissiveFresnelParameters.power = 4.0; // Higher power for narrower effect
    atmosphereMaterial.emissiveFresnelParameters.leftColor = new BABYLON.Color3(0.2, 0.35, 0.7); // Less intense color
    atmosphereMaterial.emissiveFresnelParameters.rightColor = BABYLON.Color3.Black();
    
    // Create a much subtler atmospheric glow instead of full volumetric scattering
    // We'll use a simple emissive material instead of post-processing to avoid the bright square
    
    atmosphereMesh.material = atmosphereMaterial;
    atmosphereMesh.parent = earthMesh;
    
    // Store references for updates
    scene.earthMaterial = earthMaterial;
    scene.cloudsMaterial = cloudsMaterial;
    scene.atmosphereMaterial = atmosphereMaterial;
    scene.outerAtmMaterial = outerAtmMaterial;

    // Enhanced day/night cycle with realistic Earth rotation
    let frameCount = 0;
    let earthRotation = 0;
    let solarTime = 0;
    let cloudOffset = new BABYLON.Vector2(0, 0);

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
        
        // Update cloud shadow offset for subtle cloud movement
        cloudOffset.x += rotationStep * 0.02;
        if (cloudOffset.x > 1) cloudOffset.x -= 1;
        earthMaterial.setVector2('cloudOffset', cloudOffset);

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
                ? new BABYLON.Color3(0.03, 0.07, 0.2) // Darker night atmosphere
                : new BABYLON.Color3(0.15, 0.35, 0.8).scale(1 + terminatorFactor * 2);
                
            // Make night side atmosphere more transparent
            const nightAtmAlpha = isNightSide ? 0.08 : atmFactor;
            atmosphereMaterial.alpha = nightAtmAlpha;
                
            // Update outer atmosphere for a more gradual fade
            scene.outerAtmMaterial.alpha = (isNightSide ? 0.03 : atmFactor * 0.5);
            scene.outerAtmMaterial.emissiveColor = isNightSide
                ? new BABYLON.Color3(0.01, 0.03, 0.1) // Darker outer night atmosphere
                : new BABYLON.Color3(0.1, 0.2, 0.5).scale(1 + terminatorFactor);
                
            // Enhanced atmospheric glow at terminator (dawn/dusk line)
            // This creates a subtle atmospheric effect without using volumetric lighting
            const enhancedGlow = Math.pow(terminatorFactor, 0.5) * 0.4;
            atmosphereMaterial.emissiveFresnelParameters.power = 1.0 + enhancedGlow;
        }
    });
    
    return earthMesh;
}
