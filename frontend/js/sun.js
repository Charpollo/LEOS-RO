import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Materials/Textures/texture';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/Rendering/outlineRenderer';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import '@babylonjs/core/Particles/particleSystem';

export class Sun {
    constructor(scene, options = {}) {
        this.scene = scene;
        console.log('Sun constructor - incoming options:', options);
        console.log('Sun constructor - position from options:', options.position);
        this.options = {
            position: new BABYLON.Vector3(100000, 0, 0), // 100,000 km from origin
            radius: 696000, // Actual sun radius in km
            scale: 0.01, // Scale factor for visualization
            enableFlares: true,
            enableCorona: true,
            enableProminences: true,
            ...options
        };
        console.log('Sun constructor - final options position:', this.options.position);
        
        this.mesh = null;
        this.coronaMesh = null;
        this.glowLayer = null;
        this.flareSystem = null;
        this.prominenceSystem = null;
        this.sunLight = null;
        
        this.initialize();
    }

    initialize() {
        // Create the sun sphere with realistic scale
        this._createSunMesh();
        
        // Create corona effect (outer atmosphere)
        if (this.options.enableCorona) {
            this._createCorona();
        }
        
        // Create solar flares particle system
        if (this.options.enableFlares) {
            this._createSolarFlares();
        }
        
        // Create prominence effects
        if (this.options.enableProminences) {
            this._createProminences();
        }
        
        // Add glow effect - DISABLED for debugging
        // this._createGlowEffect();
        
        // Update existing sun light to match sun position
        this._updateSunLight();
        
        // Set position AFTER all initialization
        this.mesh.position.x = this.options.position.x;
        this.mesh.position.y = this.options.position.y;
        this.mesh.position.z = this.options.position.z;
        console.log('Sun position set after init - x:', this.mesh.position.x, 'y:', this.mesh.position.y, 'z:', this.mesh.position.z);
    }

    _createSunMesh() {
        // Create main sun sphere
        const scaledRadius = this.options.radius * this.options.scale;
        this.mesh = BABYLON.MeshBuilder.CreateSphere("sun", {
            diameter: scaledRadius * 2,
            segments: 64
        }, this.scene);
        
        // Don't set position here - we'll do it after all initialization
        
        // Create sun material with emissive properties
        const sunMaterial = new BABYLON.StandardMaterial("sunMaterial", this.scene);
        sunMaterial.emissiveColor = new BABYLON.Color3(1, 0.95, 0.8);
        sunMaterial.emissiveIntensity = 1.0; // Reduced intensity
        sunMaterial.disableLighting = true;
        
        // Add texture for surface detail (sunspots, granulation)
        if (this.options.textureUrl) {
            sunMaterial.emissiveTexture = new BABYLON.Texture(this.options.textureUrl, this.scene);
        } else {
            // Create procedural sun surface
            this._createProceduralSunTexture(sunMaterial);
        }
        
        this.mesh.material = sunMaterial;
        
        // Exclude from shadow calculations
        this.mesh.receiveShadows = false;
    }

    _createProceduralSunTexture(material) {
        // Create dynamic texture for animated sun surface
        const textureSize = 1024;
        const dynamicTexture = new BABYLON.DynamicTexture("sunTexture", textureSize, this.scene);
        const context = dynamicTexture.getContext();
        
        // Animate the texture
        this.scene.registerBeforeRender(() => {
            this._updateSunSurface(context, textureSize);
            dynamicTexture.update();
        });
        
        material.emissiveTexture = dynamicTexture;
    }

    _updateSunSurface(context, size) {
        // Create animated sun surface with granulation and sunspots
        const time = Date.now() * 0.0001;
        
        // Base color gradient
        const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, '#FFFEF0');
        gradient.addColorStop(0.5, '#FFF8DC');
        gradient.addColorStop(0.8, '#FFE4B5');
        gradient.addColorStop(1, '#FFD700');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        // Add granulation pattern
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 10 + 5;
            const brightness = Math.random() * 0.3 + 0.7;
            
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = `rgba(255, 255, 224, ${brightness})`;
            context.fill();
        }
        
        // Add sunspots
        const sunspotCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < sunspotCount; i++) {
            const x = size/2 + Math.cos(time + i) * size * 0.3;
            const y = size/2 + Math.sin(time + i) * size * 0.3;
            const radius = Math.random() * 20 + 10;
            
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = 'rgba(50, 25, 0, 0.5)';
            context.fill();
        }
    }

    _createCorona() {
        // Create corona mesh (larger, semi-transparent sphere)
        const scaledRadius = this.options.radius * this.options.scale;
        this.coronaMesh = BABYLON.MeshBuilder.CreateSphere("sunCorona", {
            diameter: scaledRadius * 2.5,
            segments: 32
        }, this.scene);
        
        this.coronaMesh.position = this.options.position;
        this.coronaMesh.parent = this.mesh;
        
        // Create corona material
        const coronaMaterial = new BABYLON.StandardMaterial("coronaMaterial", this.scene);
        coronaMaterial.emissiveColor = new BABYLON.Color3(1, 0.9, 0.7);
        coronaMaterial.alpha = 0.1;
        coronaMaterial.disableLighting = true;
        coronaMaterial.backFaceCulling = false;
        
        this.coronaMesh.material = coronaMaterial;
    }

    _createSolarFlares() {
        // Create particle system for solar flares
        const scaledRadius = this.options.radius * this.options.scale;
        const particleCount = 500;
        
        this.flareSystem = new BABYLON.ParticleSystem("solarFlares", particleCount, this.scene);
        // Create procedural flare texture
        const flareTexture = new BABYLON.DynamicTexture("flareTexture", 64, this.scene);
        const ctx = flareTexture.getContext();
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        flareTexture.update();
        this.flareSystem.particleTexture = flareTexture;
        
        // Emitter is the sun mesh
        this.flareSystem.emitter = this.mesh;
        this.flareSystem.minEmitBox = new BABYLON.Vector3(-scaledRadius, -scaledRadius, -scaledRadius);
        this.flareSystem.maxEmitBox = new BABYLON.Vector3(scaledRadius, scaledRadius, scaledRadius);
        
        // Flare properties
        this.flareSystem.color1 = new BABYLON.Color4(1, 0.9, 0.5, 1);
        this.flareSystem.color2 = new BABYLON.Color4(1, 0.7, 0.3, 0.5);
        this.flareSystem.colorDead = new BABYLON.Color4(1, 0.5, 0.2, 0);
        
        this.flareSystem.minSize = scaledRadius * 0.01;
        this.flareSystem.maxSize = scaledRadius * 0.05;
        
        this.flareSystem.minLifeTime = 2;
        this.flareSystem.maxLifeTime = 5;
        
        this.flareSystem.emitRate = 20;
        
        // Flare movement
        this.flareSystem.direction1 = new BABYLON.Vector3(-1, -1, -1);
        this.flareSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
        this.flareSystem.minEmitPower = scaledRadius * 0.1;
        this.flareSystem.maxEmitPower = scaledRadius * 0.3;
        
        this.flareSystem.gravity = new BABYLON.Vector3(0, -scaledRadius * 0.01, 0);
        
        // Blend mode for glowing effect
        this.flareSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        this.flareSystem.start();
    }

    _createProminences() {
        // Create particle system for solar prominences (loops of plasma)
        const scaledRadius = this.options.radius * this.options.scale;
        const particleCount = 200;
        
        this.prominenceSystem = new BABYLON.ParticleSystem("prominences", particleCount, this.scene);
        // Reuse flare texture for prominences
        this.prominenceSystem.particleTexture = this.flareSystem.particleTexture;
        
        // Custom emitter function for prominence loops
        this.prominenceSystem.emitter = this.mesh;
        this.prominenceSystem.startPositionFunction = (worldMatrix, positionToUpdate) => {
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * scaledRadius * 0.3;
            const radius = scaledRadius * 1.05;
            
            positionToUpdate.x = Math.cos(angle) * radius;
            positionToUpdate.y = height;
            positionToUpdate.z = Math.sin(angle) * radius;
        };
        
        // Prominence properties
        this.prominenceSystem.color1 = new BABYLON.Color4(1, 0.3, 0.1, 1);
        this.prominenceSystem.color2 = new BABYLON.Color4(1, 0.1, 0.05, 0.5);
        
        this.prominenceSystem.minSize = scaledRadius * 0.005;
        this.prominenceSystem.maxSize = scaledRadius * 0.02;
        
        this.prominenceSystem.minLifeTime = 5;
        this.prominenceSystem.maxLifeTime = 10;
        
        this.prominenceSystem.emitRate = 10;
        
        // Prominence movement (following magnetic field lines)
        this.prominenceSystem.updateFunction = (particles) => {
            particles.forEach(particle => {
                // Create looping motion
                const angle = particle.age * 0.5;
                particle.position.y += Math.sin(angle) * scaledRadius * 0.001;
            });
        };
        
        this.prominenceSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        this.prominenceSystem.start();
    }

    _createGlowEffect() {
        // Add glow layer for sun
        if (!this.scene.glowLayer) {
            this.glowLayer = new GlowLayer("sunGlow", this.scene);
            this.glowLayer.intensity = 0.2; // Reduced intensity
            this.glowLayer.blurKernelSize = 32; // Smaller blur
        } else {
            this.glowLayer = this.scene.glowLayer;
        }
        
        // Make sun glow
        this.glowLayer.addIncludedOnlyMesh(this.mesh);
        if (this.coronaMesh) {
            this.glowLayer.addIncludedOnlyMesh(this.coronaMesh);
        }
    }

    _updateSunLight() {
        // Update the existing directional light to match sun position
        const sunLight = this.scene.getLightByName("sunLight");
        if (sunLight && sunLight instanceof BABYLON.DirectionalLight) {
            // Calculate light direction from sun position
            const direction = this.mesh.position.normalize().scale(-1);
            sunLight.direction = direction;
            
            // Update light color to match sun
            sunLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.92);
            sunLight.specular = new BABYLON.Color3(1.0, 0.95, 0.85);
            
            this.sunLight = sunLight;
        }
    }

    update(deltaTime) {
        // Rotate sun slowly (25 day rotation period at equator)
        const rotationSpeed = (2 * Math.PI) / (25 * 24 * 60 * 60); // radians per second
        this.mesh.rotation.y += rotationSpeed * deltaTime;
        
        // Update light direction if sun moves
        if (this.sunLight) {
            const direction = this.mesh.position.normalize().scale(-1);
            this.sunLight.direction = direction;
        }
    }

    setPosition(position) {
        this.mesh.position = position;
        this._updateSunLight();
    }

    dispose() {
        if (this.flareSystem) {
            this.flareSystem.dispose();
        }
        if (this.prominenceSystem) {
            this.prominenceSystem.dispose();
        }
        if (this.coronaMesh) {
            this.coronaMesh.dispose();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
}