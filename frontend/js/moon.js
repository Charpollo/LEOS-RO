import * as BABYLON from '@babylonjs/core';
import { EARTH_CORE_RADIUS, MOON_DISTANCE, MOON_SCALE } from './constants.js';

export async function createMoon(scene, getTimeMultiplier) {
    // Create Moon with balanced polygon count
    const moonMesh = BABYLON.MeshBuilder.CreateSphere('moon', { 
        segments: 24, // Reduced from 32 for better performance
        diameter: EARTH_CORE_RADIUS * 2 * MOON_SCALE
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
        // Moon orbits Earth once every 27.3 days (655.2 hours)
        // At 60x speed, that's 655.2 minutes to complete orbit
        // Get current simulation time for accurate orbital position
        const currentSimTime = window.getCurrentSimTime ? window.getCurrentSimTime() : new Date();
        
        // Calculate Moon's position based on time
        // Moon orbital period: 27.3 days = 2,358,720 seconds
        const moonOrbitalPeriod = 27.3 * 24 * 60 * 60; // seconds
        const totalSeconds = currentSimTime.getTime() / 1000; // Convert to seconds
        
        // Calculate orbital angle (radians)
        const moonOrbitAngle = (totalSeconds / moonOrbitalPeriod) * 2 * Math.PI;
        
        // Set Moon's orbital position
        moonPivot.rotation.y = moonOrbitAngle;
        
        // Moon is tidally locked - same face always points to Earth
        // So it rotates once per orbit
        moonMesh.rotation.y = -moonOrbitAngle;
    });
    
    return moonMesh;
}
