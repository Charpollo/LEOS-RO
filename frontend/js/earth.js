import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE } from './constants.js';

export async function createEarth(scene, timeMultiplier, sunDirection) {
    // Create Earth with properly separated layers and optimized materials
    
    // Create base Earth mesh with optimized polygon count
    const earthMesh = BABYLON.MeshBuilder.CreateSphere('earth', { 
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
            
            // Store for satellite eclipse calculations
            if (sunDirection) {
                sunDirection.copyFrom(sunDir);
            }
            
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
    
    return earthMesh;
}
