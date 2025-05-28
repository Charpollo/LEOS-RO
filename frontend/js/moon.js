import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE, MOON_DISTANCE, MOON_SCALE } from './constants.js';

export async function createMoon(scene, getTimeMultiplier) {
    // Create Moon with balanced polygon count
    const moonMesh = BABYLON.MeshBuilder.CreateSphere('moon', { 
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
        const timeMultiplier = getTimeMultiplier();
        const orbitSpeed = (0.03 * Math.PI / 180) * timeMultiplier * (scene.getAnimationRatio() || 1);
        moonPivot.rotation.y += orbitSpeed;
        
        // Add slow Moon rotation around its axis (tidally locked to Earth)
        moonMesh.rotation.y += orbitSpeed * 0.01;
    });
    
    return moonMesh;
}
