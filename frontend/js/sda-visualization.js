import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE, EARTH_VISUAL_SURFACE_RADIUS, EARTH_CORE_RADIUS } from './constants.js';
import { calculateSatellitePosition, toBabylonPosition } from './orbital-mechanics.js';

// SDA Visualization Module - Self-contained and modular
class SDAVisualization {
  constructor() {
    this.isVisible = false;
    this.scene = null;
    this.particleSystem = null;
    this.tleData = [];
    this.objectData = {};
    this.mesh = null;
    this.material = null;
    this.tooltip = null;
    this.updateIndex = 0; // For batched updates
    this.objectKeys = []; // Cache object keys for efficient iteration
    
    // Color coding for different orbit classes
    this.COLORS = {
      LEO: new BABYLON.Color3(0, 1, 1),       // Cyan
      MEO: new BABYLON.Color3(1, 1, 0),       // Yellow  
      GEO: new BABYLON.Color3(1, 0, 0),       // Red
      HEO: new BABYLON.Color3(0.7, 0, 1),     // Purple
      USER: new BABYLON.Color3(1, 1, 1)       // White
    };
  }

  async initialize(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // Defer heavy initialization until first activation
    this.scene = scene;
    
    // Set up UI interactions
    this.setupUI();
    
    // Initially hidden
    this.setVisible(false);
    
    return this;
  }

  async lazyInitialize() {
    if (this.isInitialized) return;
    
    console.log('Lazy initializing SDA visualization...');
    
    // Show loading indicator
    this.showLoadingIndicator();
    
    // Load TLE data first
    await this.loadTLEData();
    
    // Create the visualization system progressively
    await this.createParticleSystemProgressive();
    
    this.isInitialized = true;
    
    // Hide loading indicator
    this.hideLoadingIndicator();
  }

  showLoadingIndicator() {
    let loadingDiv = document.getElementById('sda-loading');
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.id = 'sda-loading';
      loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: #00cfff;
        padding: 20px;
        border-radius: 10px;
        font-family: 'Orbitron', monospace;
        font-size: 16px;
        z-index: 10000;
        border: 2px solid #00cfff;
      `;
      loadingDiv.innerHTML = `
        <div>Loading SDA Visualization...</div>
        <div id="sda-loading-progress" style="margin-top: 10px;">0 / 17000 objects</div>
      `;
      document.body.appendChild(loadingDiv);
    }
    loadingDiv.style.display = 'block';
  }

  hideLoadingIndicator() {
    const loadingDiv = document.getElementById('sda-loading');
    if (loadingDiv) {
      loadingDiv.style.display = 'none';
    }
  }

  async createParticleSystemProgressive() {
    // Clean up existing system
    if (this.mesh) {
      this.mesh.dispose();
      this.objectData = {};
    }

    if (this.tleData.length === 0) {
      console.warn('No TLE data available for visualization');
      return;
    }

    // Create parent node for all SDA objects
    this.mesh = new BABYLON.TransformNode("sdaObjects", this.scene);
    
    // Create shared materials for better performance
    this.sharedMaterials = {};
    Object.keys(this.COLORS).forEach(orbitClass => {
      const material = new BABYLON.StandardMaterial(`sdaMaterial_${orbitClass}`, this.scene);
      material.emissiveColor = this.COLORS[orbitClass];
      material.disableLighting = true;
      material.freeze(); // Freeze material for better performance
      this.sharedMaterials[orbitClass] = material;
    });
    
    // Create meshes in batches for progressive loading
    const batchSize = 500;
    const now = new Date();
    this.objectData = {};
    
    for (let batchStart = 0; batchStart < this.tleData.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, this.tleData.length);
      
      // Process batch
      for (let index = batchStart; index < batchEnd; index++) {
        const obj = this.tleData[index];
        if (!obj.tle1 || !obj.tle2) continue;

        try {
          const position = this.calculateSimpleOrbitPosition(obj.tle1, obj.tle2, now);
          if (!position) continue;

          const babylonPos = this.positionToBabylon(position);
          
          // Use instances instead of individual meshes for better performance
          const sphere = BABYLON.MeshBuilder.CreateSphere(`sda_${obj.norad || index}`, {
            diameter: 0.012,
            segments: 3 // Even fewer segments
          }, this.scene);
          
          sphere.position.set(babylonPos.x, babylonPos.y, babylonPos.z);
          sphere.parent = this.mesh;
          sphere.freezeWorldMatrix(); // Freeze for performance
          
          const orbitClass = obj.class || this.determineOrbitClass(position.altitude);
          sphere.material = this.sharedMaterials[orbitClass] || this.sharedMaterials.LEO;
          
          this.objectData[obj.norad || `obj-${index}`] = {
            mesh: sphere,
            name: obj.name || `Object ${index}`,
            noradId: obj.norad || `obj-${index}`,
            class: orbitClass,
            tle1: obj.tle1,
            tle2: obj.tle2,
            altitude: position.altitude.toFixed(0),
            inclination: position.inclination.toFixed(1)
          };
        } catch (error) {
          // Silently skip errors
        }
      }
      
      // Update progress
      const progress = document.getElementById('sda-loading-progress');
      if (progress) {
        progress.textContent = `${batchEnd} / ${this.tleData.length} objects`;
      }
      
      // Yield to browser for smooth loading
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Cache object keys for efficient batched updates
    this.objectKeys = Object.keys(this.objectData);
    this.updateIndex = 0;

    // Set up update loop
    this.scene.registerBeforeRender(() => {
      if (this.isVisible && this.isInitialized) {
        this.updateMeshes();
      }
    });
    
    // Set up mouse interaction
    this.setupMouseInteraction();
  }

  async loadTLEData() {
    // Generate comprehensive frontend satellite dataset
    this.tleData = this.generateComprehensiveSatelliteData();
  }

  generateComprehensiveSatelliteData() {
    const satellites = [];
    
    // Real satellite base templates with actual TLE data
    const realSatellites = [
      {
        name: "ISS (ZARYA)",
        norad: "25544",
        class: "LEO",
        tle1: "1 25544U 98067A   25169.18513889  .00008396  00000+0  15112-3 0  9990",
        tle2: "2 25544  51.6455  37.3238 0007076 132.8248 356.1283 15.50168983399991"
      },
      {
        name: "GOES 16",
        norad: "41866", 
        class: "GEO",
        tle1: "1 41866U 16071A   25167.74993576 -.00000290  00000+0  00000+0 0  9996",
        tle2: "2 41866   0.0448 172.2648 0000569 141.6764  94.5863  1.00271645 31488"
      },
      {
        name: "GPS IIF-7",
        norad: "40105",
        class: "MEO", 
        tle1: "1 40105U 14045A   25168.83022673  .00000022  00000+0  00000+0 0  9990",
        tle2: "2 40105  54.7416 261.5752 0048253 201.3285 158.4543  2.00566719 79944"
      }
    ];

    // Add real satellites
    satellites.push(...realSatellites);

    // Generate MASSIVE Starlink constellation (impressive scale - 4000 satellites)
    for (let i = 1; i <= 4000; i++) {
      const shells = [
        { altitude: 550, inclination: 53.0 },
        { altitude: 540, inclination: 53.2 },
        { altitude: 570, inclination: 70.0 },
        { altitude: 560, inclination: 97.6 }
      ];
      const shell = shells[i % shells.length];
      
      satellites.push({
        name: `STARLINK-${i}`,
        norad: `44${1000 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`44${1000 + i}`, 25169 + (i * 0.0001)),
        tle2: this.generateTLE2(`44${1000 + i}`, shell.inclination + (Math.random() - 0.5) * 2, 15.05 + (Math.random() - 0.5) * 0.1)
      });
    }

    // Generate OneWeb constellation (500 satellites for impressive scale)
    for (let i = 1; i <= 500; i++) {
      satellites.push({
        name: `ONEWEB-${i}`,
        norad: `48${1000 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`48${1000 + i}`, 25169 + (i * 0.0002)),
        tle2: this.generateTLE2(`48${1000 + i}`, 87.4 + (Math.random() - 0.5), 13.7 + (Math.random() - 0.5) * 0.1)
      });
    }

    // Generate Kuiper constellation (2500 satellites for impressive scale)
    for (let i = 1; i <= 2500; i++) {
      const shells = [
        { altitude: 590, inclination: 51.9 },
        { altitude: 610, inclination: 42.0 },
        { altitude: 630, inclination: 33.0 }
      ];
      const shell = shells[i % shells.length];
      
      satellites.push({
        name: `KUIPER-${i}`,
        norad: `50${1000 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`50${1000 + i}`, 25169 + (i * 0.0001)),
        tle2: this.generateTLE2(`50${1000 + i}`, shell.inclination + (Math.random() - 0.5), 14.8 + (Math.random() - 0.5) * 0.2)
      });
    }

    // Generate GPS constellation (32 satellites)
    for (let i = 1; i <= 32; i++) {
      satellites.push({
        name: `GPS-${i}`,
        norad: `37${700 + i}`,
        class: "MEO",
        tle1: this.generateTLE1(`37${700 + i}`, 25169 + (i * 0.01)),
        tle2: this.generateTLE2(`37${700 + i}`, 55.0 + (Math.random() - 0.5), 2.00 + (Math.random() - 0.5) * 0.01)
      });
    }

    // Generate Galileo constellation (30 satellites)
    for (let i = 1; i <= 30; i++) {
      satellites.push({
        name: `GALILEO-${i}`,
        norad: `37${800 + i}`,
        class: "MEO",
        tle1: this.generateTLE1(`37${800 + i}`, 25169 + (i * 0.01)),
        tle2: this.generateTLE2(`37${800 + i}`, 56.0 + (Math.random() - 0.5), 1.88 + (Math.random() - 0.5) * 0.01)
      });
    }

    // Generate GLONASS constellation (24 satellites)
    for (let i = 1; i <= 24; i++) {
      satellites.push({
        name: `GLONASS-${i}`,
        norad: `39${500 + i}`,
        class: "MEO",
        tle1: this.generateTLE1(`39${500 + i}`, 25169 + (i * 0.01)),
        tle2: this.generateTLE2(`39${500 + i}`, 64.8 + (Math.random() - 0.5), 2.13 + (Math.random() - 0.5) * 0.01)
      });
    }

    // Generate BeiDou constellation (35 satellites)
    for (let i = 1; i <= 35; i++) {
      satellites.push({
        name: `BEIDOU-${i}`,
        norad: `36${400 + i}`,
        class: "MEO",
        tle1: this.generateTLE1(`36${400 + i}`, 25169 + (i * 0.01)),
        tle2: this.generateTLE2(`36${400 + i}`, 55.5 + (Math.random() - 0.5), 1.86 + (Math.random() - 0.5) * 0.01)
      });
    }

    // Generate GEO communication satellites (200 satellites)
    for (let i = 1; i <= 200; i++) {
      satellites.push({
        name: `GEO-COMM-${i}`,
        norad: `25${100 + i}`,
        class: "GEO", 
        tle1: this.generateTLE1(`25${100 + i}`, 25169 + (i * 0.02)),
        tle2: this.generateTLE2(`25${100 + i}`, Math.random() * 5, 1.00 + (Math.random() - 0.5) * 0.001)
      });
    }

    // Generate Iridium constellation (75 satellites)
    for (let i = 1; i <= 75; i++) {
      satellites.push({
        name: `IRIDIUM-${i}`,
        norad: `43${500 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`43${500 + i}`, 25169 + (i * 0.005)),
        tle2: this.generateTLE2(`43${500 + i}`, 86.4 + (Math.random() - 0.5), 14.34 + (Math.random() - 0.5) * 0.1)
      });
    }

    // Generate Globalstar constellation (48 satellites)
    for (let i = 1; i <= 48; i++) {
      satellites.push({
        name: `GLOBALSTAR-${i}`,
        norad: `25${400 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`25${400 + i}`, 25169 + (i * 0.005)),
        tle2: this.generateTLE2(`25${400 + i}`, 52.0 + (Math.random() - 0.5), 13.1 + (Math.random() - 0.5) * 0.1)
      });
    }

    // Generate Planet Labs constellation (200+ Earth observation satellites)
    for (let i = 1; i <= 200; i++) {
      satellites.push({
        name: `PLANET-${i}`,
        norad: `41${300 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`41${300 + i}`, 25169 + (i * 0.003)),
        tle2: this.generateTLE2(`41${300 + i}`, 97.4 + (Math.random() - 0.5), 15.2 + (Math.random() - 0.5) * 0.2)
      });
    }

    // Generate Earth observation satellites (100 satellites)
    for (let i = 1; i <= 100; i++) {
      satellites.push({
        name: `EO-SAT-${i}`,
        norad: `39${600 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`39${600 + i}`, 25169 + (i * 0.004)),
        tle2: this.generateTLE2(`39${600 + i}`, 98.2 + (Math.random() - 0.5), 14.8 + (Math.random() - 0.5) * 0.3)
      });
    }

    // Generate various LEO satellites (1000 satellites)
    for (let i = 1; i <= 1000; i++) {
      const inclination = Math.random() * 180;
      const meanMotion = 12 + Math.random() * 4; // Varies with altitude
      satellites.push({
        name: `LEO-${i}`,
        norad: `45${500 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`45${500 + i}`, 25169 + (i * 0.001)),
        tle2: this.generateTLE2(`45${500 + i}`, inclination, meanMotion)
      });
    }

    // Generate space debris (8000 tracked objects for impressive scale)
    for (let i = 1; i <= 8000; i++) {
      const inclination = Math.random() * 180;
      const meanMotion = 10 + Math.random() * 6;
      satellites.push({
        name: `DEBRIS-${i}`,
        norad: `99${1000 + i}`,
        class: "LEO",
        tle1: this.generateTLE1(`99${1000 + i}`, 25169 + (i * 0.0005)),
        tle2: this.generateTLE2(`99${1000 + i}`, inclination, meanMotion)
      });
    }

    // Generate HEO satellites (50 satellites - Molniya/Tundra orbits)
    for (let i = 1; i <= 50; i++) {
      satellites.push({
        name: `HEO-${i}`,
        norad: `40${900 + i}`,
        class: "HEO",
        tle1: this.generateTLE1(`40${900 + i}`, 25169 + (i * 0.1)),
        tle2: this.generateTLE2(`40${900 + i}`, 63.4 + (Math.random() - 0.5) * 5, 2.0 + (Math.random() - 0.5) * 0.5)
      });
    }

    return satellites;
  }

  generateTLE1(noradId, epoch) {
    // Generate realistic TLE line 1
    const padded = noradId.padStart(5, '0');
    const epochStr = epoch.toFixed(8).padStart(14, '0');
    const dragTerm = (Math.random() * 0.00001).toExponential(5).replace('e', '-').padStart(10, ' ');
    
    return `1 ${padded}U 25001A   ${epochStr}  .00001234  00000+0  ${dragTerm} 0  9999`;
  }

  generateTLE2(noradId, inclination, meanMotion) {
    // Generate realistic TLE line 2
    const padded = noradId.padStart(5, '0');
    const incl = inclination.toFixed(4).padStart(8, ' ');
    const raan = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const eccentricity = (Math.random() * 0.01).toFixed(7).substring(2).padStart(7, '0');
    const argPer = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const meanAnom = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const meanMot = meanMotion.toFixed(8).padStart(11, ' ');
    const revNum = Math.floor(Math.random() * 99999).toString().padStart(5, ' ');
    
    return `2 ${padded} ${incl} ${raan} ${eccentricity} ${argPer} ${meanAnom} ${meanMot}${revNum}9`;
  }

  createParticleSystem() {
    // Clean up existing system
    if (this.mesh) {
      this.mesh.dispose();
      this.objectData = {};
    }

    if (this.tleData.length === 0) {
      console.warn('No TLE data available for visualization');
      return;
    }

    // Create parent node for all SDA objects
    this.mesh = new BABYLON.TransformNode("sdaObjects", this.scene);
    
    // Create shared materials for better performance
    this.sharedMaterials = {};
    Object.keys(this.COLORS).forEach(orbitClass => {
      const material = new BABYLON.StandardMaterial(`sdaMaterial_${orbitClass}`, this.scene);
      material.emissiveColor = this.COLORS[orbitClass];
      material.disableLighting = true;
      this.sharedMaterials[orbitClass] = material;
    });
    
    // Create individual meshes for each satellite
    const now = new Date();
    this.objectData = {};
    
    // IMPORTANT: For SDA visualization with thousands of objects,
    // we're using simple geometric shapes instead of 3D models
    // to prevent excessive asset loading and improve performance
    this.tleData.forEach((obj, index) => {
      if (!obj.tle1 || !obj.tle2) {
        console.warn(`Skipping object ${obj.name} - missing TLE data`);
        return;
      }

      try {
        // Calculate position using simple TLE-based orbital mechanics
        const position = this.calculateSimpleOrbitPosition(obj.tle1, obj.tle2, now);
        if (!position) {
          console.warn(`Failed to calculate position for ${obj.name}`);
          return;
        }

        // Convert to Babylon coordinates with proper scaling
        const babylonPos = this.positionToBabylon(position);
        
        // Create SIMPLE sphere for SDA objects - NOT 3D models
        // This ensures we don't try loading the bulldog_sat.glb model thousands of times
        const sphere = BABYLON.MeshBuilder.CreateSphere(`sda_${obj.norad || index}`, {
          diameter: 0.012, // Reduced size for more subtle SDA orbs
          segments: 4      // Minimal segments for maximum performance
        }, this.scene);
        
        sphere.position.set(babylonPos.x, babylonPos.y, babylonPos.z);
        sphere.parent = this.mesh;
        
        // Set color based on orbit class
        const orbitClass = obj.class || this.determineOrbitClass(position.altitude);
        
        // Use shared material for better performance
        sphere.material = this.sharedMaterials[orbitClass] || this.sharedMaterials.LEO;
        
        // Store object data
        this.objectData[obj.norad || `obj-${index}`] = {
          mesh: sphere,
          name: obj.name || `Object ${index}`,
          noradId: obj.norad || `obj-${index}`,
          class: orbitClass,
          tle1: obj.tle1,
          tle2: obj.tle2,
          altitude: position.altitude.toFixed(0),
          inclination: position.inclination.toFixed(1)
        };
        
      } catch (error) {
        console.warn(`Error processing object ${obj.name}:`, error);
      }
    });

    // Cache object keys for efficient batched updates
    this.objectKeys = Object.keys(this.objectData);
    this.updateIndex = 0;

    // Set up update loop
    this.scene.registerBeforeRender(() => {
      if (this.isVisible) {
        this.updateMeshes();
      }
    });
    
    // Set up mouse interaction
    this.setupMouseInteraction();
  }

  calculateSimpleOrbitPosition(tle1, tle2, time) {
    try {
      // Parse TLE data
      const inclination = parseFloat(tle2.substring(8, 16)); // degrees
      const raan = parseFloat(tle2.substring(17, 25)); // degrees
      const eccentricity = parseFloat('0.' + tle2.substring(26, 33));
      const argPerigee = parseFloat(tle2.substring(34, 42)); // degrees
      const meanAnomaly = parseFloat(tle2.substring(43, 51)); // degrees
      const meanMotion = parseFloat(tle2.substring(52, 63)); // revolutions per day
      
      // Calculate orbital period and semi-major axis
      const period = 24 * 60 / meanMotion; // minutes
      const semiMajorAxis = Math.pow((period * 60 / (2 * Math.PI)) * (period * 60 / (2 * Math.PI)) * 398600.4418, 1/3); // km
      const altitude = semiMajorAxis - 6371; // km above Earth surface
      
      // Simple circular orbit approximation for visualization
      const orbitalRadius = semiMajorAxis;
      
      // Time-based position calculation
      const currentTime = time.getTime() / 1000; // seconds since epoch
      const orbitalAngle = (currentTime * 2 * Math.PI) / (period * 60); // radians
      
      // Convert orbital angles to radians
      const inclinationRad = inclination * Math.PI / 180;
      const raanRad = raan * Math.PI / 180;
      const argPerigeeRad = argPerigee * Math.PI / 180;
      
      // Calculate position in orbital plane
      const cosAngle = Math.cos(orbitalAngle);
      const sinAngle = Math.sin(orbitalAngle);
      
      // Position in orbital coordinate system
      const xOrb = orbitalRadius * cosAngle;
      const yOrb = orbitalRadius * sinAngle;
      const zOrb = 0;
      
      // Rotate to Earth-centered coordinates
      const cosInc = Math.cos(inclinationRad);
      const sinInc = Math.sin(inclinationRad);
      const cosRaan = Math.cos(raanRad);
      const sinRaan = Math.sin(raanRad);
      const cosArg = Math.cos(argPerigeeRad);
      const sinArg = Math.sin(argPerigeeRad);
      
      // Apply rotations
      const x = (cosRaan * cosArg - sinRaan * sinArg * cosInc) * xOrb + 
                (-cosRaan * sinArg - sinRaan * cosArg * cosInc) * yOrb;
      const y = (sinRaan * cosArg + cosRaan * sinArg * cosInc) * xOrb + 
                (-sinRaan * sinArg + cosRaan * cosArg * cosInc) * yOrb;
      const z = (sinInc * sinArg) * xOrb + (sinInc * cosArg) * yOrb;
      
      return {
        x: x,
        y: y, 
        z: z,
        altitude: altitude,
        inclination: inclination
      };
      
    } catch (error) {
      console.error('Error parsing TLE:', error);
      return null;
    }
  }

  positionToBabylon(position) {
    // Convert km to Babylon units using Earth scale
    // Earth radius = 6371 km = 1 Babylon unit, so scale = 1/6371
    const scale = 1 / 6371;
    
    const babylonPos = new BABYLON.Vector3(
      position.x * scale,
      position.z * scale, // Swap Y and Z for Babylon coordinate system
      position.y * scale
    );
    
    // Apply the same satellite position scaling as in orbital-mechanics.js
    // This ensures SDA objects and satellites use consistent visual positioning
    const distanceFromCenter = babylonPos.length();
    if (distanceFromCenter > EARTH_CORE_RADIUS) {
        // Calculate how far above the mathematical Earth surface the satellite is
        const altitudeAboveCore = distanceFromCenter - EARTH_CORE_RADIUS;
        
        // Position relative to visual Earth surface
        const newDistance = EARTH_VISUAL_SURFACE_RADIUS + altitudeAboveCore;
        babylonPos.scaleInPlace(newDistance / distanceFromCenter);
    }
    
    return babylonPos;
  }

  updateMeshes() {
    if (!this.isVisible || this.objectKeys.length === 0) return;
    
    const now = new Date();
    let updatedCount = 0;
    
    // Update only a subset of objects per frame for better performance
    const batchSize = Math.min(100, this.objectKeys.length); // Update 100 objects per frame for smoother loading
    const startIndex = this.updateIndex;
    const endIndex = Math.min(startIndex + batchSize, this.objectKeys.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const noradId = this.objectKeys[i];
      const data = this.objectData[noradId];
      if (!data.tle1 || !data.tle2 || !data.mesh) continue;
      
      try {
        const position = this.calculateSimpleOrbitPosition(data.tle1, data.tle2, now);
        if (!position) continue;
        
        const babylonPos = this.positionToBabylon(position);
        data.mesh.position.set(babylonPos.x, babylonPos.y, babylonPos.z);
        
        // Update data
        data.altitude = position.altitude.toFixed(0);
        data.inclination = position.inclination.toFixed(1);
        updatedCount++;
      } catch (error) {
        // Silently handle calculation errors
      }
    }
    
    // Move to next batch, wrap around if needed
    this.updateIndex = endIndex >= this.objectKeys.length ? 0 : endIndex;
  }

  setupMouseInteraction() {
    // Set up mouse interaction for tooltips with throttling for better performance
    let lastPickTime = 0;
    const pickThrottle = 50; // Only pick every 50ms for better performance
    
    this.scene.onPointerMove = (evt) => {
      if (!this.isVisible) {
        this.tooltip.style.display = 'none';
        return;
      }

      const now = Date.now();
      if (now - lastPickTime < pickThrottle) {
        return; // Skip this pick for performance
      }
      lastPickTime = now;

      const pickResult = this.scene.pick(
        this.scene.pointerX,
        this.scene.pointerY,
        (mesh) => mesh.parent === this.mesh
      );

      if (pickResult.hit && pickResult.pickedMesh) {
        // Find object data for this mesh more efficiently
        let objectData = null;
        for (const noradId of this.objectKeys) {
          if (this.objectData[noradId].mesh === pickResult.pickedMesh) {
            objectData = this.objectData[noradId];
            break;
          }
        }

        if (objectData) {
          this.tooltip.innerHTML = `
            <h4>${objectData.name}</h4>
            <p><span style="color: ${this.getColorHex(objectData.class)}">${objectData.class}</span> | NORAD: ${objectData.noradId}</p>
            <p>Altitude: ${objectData.altitude} km</p>
            <p>Inclination: ${objectData.inclination}°</p>
          `;
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = (evt.clientX + 10) + 'px';
          this.tooltip.style.top = (evt.clientY + 10) + 'px';
          return;
        }
      }

      this.tooltip.style.display = 'none';
    };
  }

  determineOrbitClass(altitudeKm) {
    if (altitudeKm < 2000) return 'LEO';
    if (altitudeKm < 35786) return 'MEO';
    if (altitudeKm >= 35786 && altitudeKm <= 36000) return 'GEO';
    return 'HEO';
  }

  async setVisible(visible) {
    // Lazy initialize on first show
    if (visible && !this.isInitialized) {
      await this.lazyInitialize();
    }
    
    this.isVisible = visible;
    
    if (this.mesh) {
      this.mesh.setEnabled(visible);
    } else if (visible) {
      console.warn('No mesh available to set visibility');
    }
    
    // Update UI elements
    this.updateUI();
  }

  async toggle() {
    await this.setVisible(!this.isVisible);
    return this.isVisible;
  }

  updateUI() {
    // Update object count display
    const countElement = document.getElementById('sda-object-count');
    if (countElement) {
      countElement.textContent = `(${Object.keys(this.objectData).length} objects)`;
    }
    
    // Update legend visibility
    const legend = document.getElementById('sda-legend');
    if (legend) {
      legend.style.display = this.isVisible ? 'block' : 'none';
    }
    
    // Update Add TLE button visibility
    const addTleBtn = document.getElementById('add-tle-button');
    if (addTleBtn) {
      addTleBtn.style.display = this.isVisible ? 'block' : 'none';
    }
    
    // Update toggle button
    const toggleBtn = document.getElementById('sda-toggle-btn');
    if (toggleBtn) {
      toggleBtn.style.backgroundColor = this.isVisible ? 
        'rgba(0, 255, 255, 0.7)' : 'rgba(102, 217, 255, 0.7)';
    }
    
    // Show status message
    this.showStatusMessage();
    
    // Hide tooltip when not visible
    if (!this.isVisible && this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  showStatusMessage() {
    // Create or update status message
    let statusDiv = document.getElementById('sda-status-message');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'sda-status-message';
      statusDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: #00cfff;
        padding: 10px 15px;
        border-radius: 5px;
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        z-index: 5000;
        border: 1px solid #00cfff;
        display: none;
      `;
      document.body.appendChild(statusDiv);
    }

    if (this.isVisible) {
      const objectCount = Object.keys(this.objectData).length;
      const orbitCounts = this.getOrbitClassCounts();
      
      statusDiv.innerHTML = `
        <div><strong>SDA VISUALIZATION ACTIVE</strong> <span style="color: #ff6b35; font-size: 11px;">(BETA - More features coming soon!)</span></div>
        <div>Total Objects: ${objectCount}</div>
        <div>LEO: ${orbitCounts.LEO} | MEO: ${orbitCounts.MEO} | GEO: ${orbitCounts.GEO} | HEO: ${orbitCounts.HEO}</div>
        <div>Hover over objects for details</div>
      `;
      statusDiv.style.display = 'block';
    } else {
      statusDiv.style.display = 'none';
    }
  }

  setupUI() {
    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'sda-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(this.tooltip);
  }

  getColorHex(orbitClass) {
    const color = this.COLORS[orbitClass] || this.COLORS.LEO;
    return `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
  }

  addNewTLE(tle1, tle2, name) {
    try {
      const id = `USER_${Date.now()}`;
      const newObject = {
        name: name || `User Object ${this.tleData.length + 1}`,
        norad: id,
        class: 'USER',
        tle1: tle1,
        tle2: tle2,
        epoch: new Date()
      };
      
      this.tleData.push(newObject);
      
      // Rebuild visualization to include new object
      this.createParticleSystem();
      
      if (this.isVisible) {
        this.mesh.setEnabled(true);
      }
      
      console.log(`Added new TLE object: ${newObject.name}`);
      return true;
    } catch (error) {
      console.error('Error adding new TLE:', error);
      return false;
    }
  }

  getStats() {
    return {
      totalObjects: this.tleData.length,
      visibleObjects: Object.keys(this.objectData).length,
      isVisible: this.isVisible,
      orbitClasses: this.getOrbitClassCounts()
    };
  }

  getOrbitClassCounts() {
    const counts = { LEO: 0, MEO: 0, GEO: 0, HEO: 0, USER: 0 };
    Object.values(this.objectData).forEach(obj => {
      counts[obj.class] = (counts[obj.class] || 0) + 1;
    });
    return counts;
  }
}

// Global instance
let sdaVisualization = null;

/**
 * Initializes the SDA visualization system
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 */
export async function initSDAVisualization(scene) {
  console.log('Initializing SDA visualization system...');
  
  // Create and initialize the SDA visualization
  sdaVisualization = new SDAVisualization();
  await sdaVisualization.initialize(scene);
  
  console.log('SDA visualization system ready');
  
  return {
    isVisible: () => sdaVisualization.isVisible,
    setVisible: (visible) => sdaVisualization.setVisible(visible),
    toggle: () => sdaVisualization.toggle(),
    getStats: () => sdaVisualization.getStats(),
    addTLE: (tle1, tle2, name) => sdaVisualization.addNewTLE(tle1, tle2, name)
  };
}

/**
 * Creates a modal for TLE input
 */
export function createTLEInputModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'tle-input-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Add New Orbital Object</h3>
        <button class="close-button">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="object-name">Object Name (Optional)</label>
          <input type="text" id="object-name" placeholder="e.g., My Satellite">
        </div>
        <div class="form-group">
          <label for="tle-line1">TLE Line 1</label>
          <input type="text" id="tle-line1" placeholder="1 NNNNNX NNNNNAAA NNNNN.NNNNNNNN +.NNNNNNNN +NNNNN-N +NNNNN-N N NNNNN">
        </div>
        <div class="form-group">
          <label for="tle-line2">TLE Line 2</label>
          <input type="text" id="tle-line2" placeholder="2 NNNNN NNN.NNNN NNN.NNNN NNNNNNN NNN.NNNN NNN.NNNN NN.NNNNNNNNNNNNNN">
        </div>
        <div class="form-actions">
          <button id="submit-tle" class="primary-button">Add Object</button>
        </div>
      </div>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(modal);
  
  // Set up event handlers
  modal.querySelector('.close-button').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('#submit-tle').addEventListener('click', () => {
    const name = document.getElementById('object-name').value;
    const tle1 = document.getElementById('tle-line1').value;
    const tle2 = document.getElementById('tle-line2').value;
    
    if (tle1 && tle2) {
      const success = sdaVisualization ? sdaVisualization.addNewTLE(tle1, tle2, name) : false;
      if (success) {
        modal.remove();
        // Update UI to show new count
        if (sdaVisualization) {
          sdaVisualization.updateUI();
        }
      } else {
        alert('Invalid TLE data. Please check your input and try again.');
      }
    } else {
      alert('Please enter both TLE lines to add a new object.');
    }
  });
  
  return modal;
}

/**
 * Legacy function for backward compatibility
 */
export function addNewSDATle(tle1, tle2, name) {
  return sdaVisualization ? sdaVisualization.addNewTLE(tle1, tle2, name) : false;
}
