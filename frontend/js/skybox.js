import * as BABYLON from '@babylonjs/core';

// Create a skybox with stars for the space environment
export function createSkybox(scene) {
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
    
    return { skybox, starsParticles };
}
