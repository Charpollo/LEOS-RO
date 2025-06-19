import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE } from './constants.js';
import { calculateSatellitePosition, toBabylonPosition } from './orbital-mechanics.js';

// Track all visualized SDA objects
let sdaObjectsVisible = false;
let sdaPointsParent = null;   // Parent container for all SDA points
let sdaPoints = [];           // Array of point meshes
let sdaPointsData = {};       // Data associated with each point
let tleData = {};

// Particle System Color Constants
const COLORS = {
  LEO: new BABYLON.Color4(0, 1, 1, 1),       // Cyan
  MEO: new BABYLON.Color4(1, 1, 0, 1),       // Yellow
  GEO: new BABYLON.Color4(1, 0, 0, 1),       // Red
  HEO: new BABYLON.Color4(0.7, 0, 1, 1),     // Purple
  USER: new BABYLON.Color4(1, 1, 1, 1)       // White
};

/**
 * Initializes the SDA visualization system
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 */
export async function initSDAVisualization(scene) {
  // Load TLE data
  await loadTLEData();
  
  // Create particle system for SDA objects
  createSDAParticleSystem(scene);
  
  // Initially the SDA objects are hidden
  setSDAPanelVisible(false);
  
  return {
    isVisible: () => sdaObjectsVisible,
    toggle: () => toggleSDAPanelVisibility(scene),
  };
}

/**
 * Loads TLE data for orbital objects
 */
async function loadTLEData() {
  try {
    // Use a small sample for testing first
    const response = await fetch('assets/tle-sample.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    tleData = await response.json();
    console.log(`Loaded ${Object.keys(tleData).length} objects from TLE data`);
  } catch (error) {
    console.error('Error loading TLE data:', error);
    // Fall back to a minimal set of example data
    tleData = {
      "LEO_SAMPLE_1": {
        "name": "ISS (ZARYA)",
        "norad": "25544",
        "class": "LEO",
        "tle1": "1 25544U 98067A   21084.79927053  .00001366  00000-0  32305-4 0  9995",
        "tle2": "2 25544  51.6452  89.5895 0003432  99.1345 261.0539 15.48909668276917"
      },
      "GEO_SAMPLE_1": {
        "name": "GOES 13",
        "norad": "29155",
        "class": "GEO",
        "tle1": "1 29155U 06018A   21084.50945312 -.00000094  00000-0  00000-0 0  9996",
        "tle2": "2 29155   0.2488 279.2607 0001765 349.3505  69.7466  1.00269868 54059"
      },
      "MEO_SAMPLE_1": {
        "name": "GPS BIIR-9 (PRN 21)",
        "norad": "27704",
        "class": "MEO",
        "tle1": "1 27704U 03010A   21084.92552303 -.00000046  00000-0  00000-0 0  9995",
        "tle2": "2 27704  54.7432 263.6380 0111656 202.4106 157.1944  2.00561959131237"
      },
      "HEO_SAMPLE_1": {
        "name": "SIRIUS 3",
        "norad": "26626",
        "class": "HEO",
        "tle1": "1 26626U 00082A   21084.13453883 -.00000073  00000-0  00000-0 0  9996",
        "tle2": "2 26626  63.0217 114.0728 2748516 270.1789  27.8103  0.86576066 78462"
      }
    };
  }
}

/**
 * Creates the SDA points for visualizing all SDA objects
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 */
function createSDAPoints(scene) {
  // Clean up existing points if present
  if (sdaPointsParent) {
    sdaPointsParent.dispose();
    sdaPoints = [];
    sdaPointsData = {};
  }
  
  // Create a parent node for all SDA points
  sdaPointsParent = new BABYLON.TransformNode("sdaPoints", scene);
  
  // Create a custom material for the points
  const pointMaterial = new BABYLON.StandardMaterial("sdaPointMaterial", scene);
  pointMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1); // Will be overridden per point
  pointMaterial.disableLighting = true;
  pointMaterial.backFaceCulling = false;
  
  // Points are now ready for positioning
  positionSDAParticles(scene, pointMaterial);
}

/**
 * Positions all SDA particles based on the TLE data
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 */
function positionSDAParticles(scene) {
  // Clear existing particles
  sdaParticleSystem.reset();
  
  // Create a particle for each object in the TLE data
  const objects = Object.values(tleData);
  const now = new Date();
  
  // Limit the initial number for performance
  const maxInitialObjects = 5000;
  const objectsToShow = objects.slice(0, Math.min(objects.length, maxInitialObjects));
  
  // Create individual particles based on orbital parameters
  objectsToShow.forEach((obj) => {
    try {
      // Skip objects without proper TLE data
      if (!obj.tle1 || !obj.tle2) return;
      
      // Calculate position from TLE
      const position = calculateSatellitePosition(obj.tle1, obj.tle2, now);
      if (!position) return;
      
      // Convert to Babylon coordinates
      const babylonPos = toBabylonPosition(position, EARTH_SCALE);
      
      // Set orbit class for color
      const orbitClass = obj.class || determineOrbitClass(position.altitude);
      
      // Create a particle
      sdaParticleSystem.addParticle(
        new BABYLON.Vector3(babylonPos.x, babylonPos.y, babylonPos.z),
        10  // Initial velocity (we'll override this every frame)
      );
      
      // Store reference for updates
      const particleIndex = sdaParticleSystem.particles.length - 1;
      
      // Set color based on orbit class
      const color = COLORS[orbitClass] || COLORS.LEO;
      sdaParticleSystem.particles[particleIndex].color = color;
      
      // Add metadata for hover/interaction
      sdaMeshes[obj.norad] = {
        particleIndex,
        name: obj.name,
        noradId: obj.norad,
        class: orbitClass,
        tle1: obj.tle1,
        tle2: obj.tle2,
        altitude: position.altitude.toFixed(0),
        inclination: position.inclination.toFixed(1)
      };
    } catch (error) {
      console.error(`Error creating SDA particle for ${obj.name || 'unknown'}:`, error);
    }
  });
  
  console.log(`Created ${sdaParticleSystem.particles.length} SDA particles`);
  
  // Create tooltip for object hovering
  const tooltip = document.createElement('div');
  tooltip.className = 'sda-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);
  
  // Setup interaction with particles
  scene.onPointerMove = (evt) => {
    if (!sdaObjectsVisible) {
      tooltip.style.display = 'none';
      return;
    }
    
    // Use picking ray to detect particles
    const pickResult = scene.pick(
      scene.pointerX, 
      scene.pointerY, 
      (mesh) => false, // Skip mesh picking - we'll handle particles manually
      false,
      scene.activeCamera
    );
    
    if (pickResult.hit) {
      const ray = pickResult.ray;
      let closestDistance = Infinity;
      let closestObject = null;
      
      // Check ray against particles
      for (const noradId in sdaMeshes) {
        const obj = sdaMeshes[noradId];
        const particle = sdaParticleSystem.particles[obj.particleIndex];
        if (!particle) continue;
        
        // Calculate distance between ray and particle
        const distance = BABYLON.Vector3.Distance(
          ray.origin.add(ray.direction.scale(
            BABYLON.Vector3.Dot(
              particle.position.subtract(ray.origin),
              ray.direction
            )
          )),
          particle.position
        );
        
        // If close enough to ray and closer than previous closest
        if (distance < 0.05 && distance < closestDistance) {
          closestDistance = distance;
          closestObject = obj;
        }
      }
      
      // Display tooltip for closest object
      if (closestObject) {
        tooltip.innerHTML = `
          <h4>${closestObject.name}</h4>
          <p><span class="orbit-class ${closestObject.class.toLowerCase()}">${closestObject.class}</span> NORAD: ${closestObject.noradId}</p>
          <p>Altitude: ${closestObject.altitude} km</p>
          <p>Inclination: ${closestObject.inclination}°</p>
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = (evt.clientX + 10) + 'px';
        tooltip.style.top = (evt.clientY + 10) + 'px';
        return;
      }
    }
    
    // Hide tooltip if no hit
    tooltip.style.display = 'none';
  };
  
  console.log(`Created ${sdaParticleSystem.particles.length} SDA particles`);
  
  // Set up update loop for particle positions
  scene.registerBeforeRender(() => {
    if (!sdaObjectsVisible) return;
    updateSDAPanelAndPositions(scene);
  });
}

/**
 * Updates the positions of all SDA particles based on current time
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 */
function updateSDAPanelAndPositions(scene) {
  // Only update every few frames for performance
  if (scene.getFrameId() % 30 !== 0) return;
  
  // Try to get simulation time from global state if available
  const simulationTime = window.getCurrentSimTime ? window.getCurrentSimTime() : new Date();
  
  // Count visible particles by orbit class for stats
  const stats = {
    LEO: 0,
    MEO: 0,
    GEO: 0,
    HEO: 0,
    USER: 0,
    total: 0
  };
  
  // Update each tracked object
  Object.values(sdaMeshes).forEach(obj => {
    try {
      if (!obj.tle1 || !obj.tle2 || obj.particleIndex >= sdaParticleSystem.particles.length) return;
      
      // Calculate new position for this time
      const position = calculateSatellitePosition(obj.tle1, obj.tle2, simulationTime);
      if (!position) return;
      
      // Update particle position
      const babylonPos = toBabylonPosition(position, EARTH_SCALE);
      const particle = sdaParticleSystem.particles[obj.particleIndex];
      
      // Only update if particle exists
      if (particle) {
        particle.position.x = babylonPos.x;
        particle.position.y = babylonPos.y;
        particle.position.z = babylonPos.z;
        
        // Reset age to prevent dying
        particle.age = 0;
        
        // Update object metadata with new position
        obj.altitude = position.altitude.toFixed(0);
        obj.inclination = position.inclination.toFixed(1);
        
        // Update stats
        stats.total++;
        if (stats[obj.class]) stats[obj.class]++;
      }
    } catch (error) {
      // Skip problematic particles
    }
  });
  
  // Update the legend with the stats (optional)
  updateStats(stats);
}

// Updates the legend with stats about visible objects
function updateStats(stats) {
  // This could update a counter in the legend to show how many
  // objects of each type are being tracked
  const legend = document.getElementById('sda-legend');
  if (legend && legend.classList.contains('visible')) {
    // Update only if legend is visible
    const legendTitle = legend.querySelector('h4');
    if (legendTitle) {
      legendTitle.textContent = `Space Objects (${stats.total})`;
    }
    
    // Update each orbit class count
    for (const orbitClass in stats) {
      if (orbitClass === 'total') continue;
      const item = legend.querySelector(`.sda-legend-item:nth-child(${Object.keys(COLORS).indexOf(orbitClass) + 1})`);
      if (item) {
        const text = item.querySelector('span');
        const orbitName = {
          'LEO': 'LEO (160-2,000 km)',
          'MEO': 'MEO (2,000-35,786 km)',
          'GEO': 'GEO (~35,786 km)',
          'HEO': 'HEO (Highly Elliptical)',
          'USER': 'User-Added Objects'
        }[orbitClass] || orbitClass;
        if (text) text.textContent = `${orbitName}: ${stats[orbitClass]}`;
      }
    }
  }
}

/**
 * Determines the orbit class based on altitude
 * @param {number} altitudeKm - The altitude in kilometers
 * @returns {string} - The orbit class (LEO, MEO, GEO, HEO)
 */
function determineOrbitClass(altitudeKm) {
  if (altitudeKm < 2000) return 'LEO';
  if (altitudeKm < 35786) return 'MEO';
  if (altitudeKm >= 35786 && altitudeKm <= 36000) return 'GEO';
  return 'HEO';
}

/**
 * Sets the visibility of the SDA visualization panel
 * @param {boolean} visible - Whether the panel should be visible
 */
function setSDAPanelVisible(visible) {
  sdaObjectsVisible = visible;
  
  // Show/hide the particle system
  if (sdaParticleSystem) {
    if (visible) {
      sdaParticleSystem.start();
      // Initialize particles if this is the first time showing them
      if (sdaParticleSystem.particles.length === 0) {
        positionSDAParticles(sdaParticleSystem.getScene());
      }
    } else {
      sdaParticleSystem.stop();
      // Hide tooltip if it exists
      const tooltip = document.querySelector('.sda-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }
  }
  
  // Update button appearance based on state
  const sdaToggleBtn = document.getElementById('sda-toggle-btn');
  if (sdaToggleBtn) {
    sdaToggleBtn.style.backgroundColor = visible ? 
      'rgba(0, 255, 255, 0.7)' : 'rgba(102, 217, 255, 0.7)';
  }
}

/**
 * Toggles the visibility of the SDA visualization
 */
function toggleSDAPanelVisibility(scene) {
  setSDAPanelVisible(!sdaObjectsVisible);
  
  // Dispatch toggle event for UI updates
  window.dispatchEvent(new CustomEvent('sda-visibility-changed', { 
    detail: { visible: sdaObjectsVisible } 
  }));
  
  return sdaObjectsVisible;
}

/**
 * Adds a new orbital object from TLE data
 * @param {string} tle1 - First line of TLE
 * @param {string} tle2 - Second line of TLE
 * @param {string} name - Object name
 */
export function addNewSDATle(tle1, tle2, name) {
  try {
    // Create a unique ID for this object
    const id = `USER_${Date.now()}`;
    
    // Add to TLE data
    tleData[id] = {
      name: name || `User Object ${Object.keys(tleData).length + 1}`,
      norad: id,
      class: 'USER',
      tle1: tle1,
      tle2: tle2
    };
    
    // If visualization is active, recreate particle system to include the new object
    if (sdaObjectsVisible && sdaParticleSystem) {
      createSDAParticleSystem(sdaParticleSystem.getScene());
    }
    
    return true;
  } catch (error) {
    console.error('Error adding new TLE data:', error);
    return false;
  }
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
      const success = addNewSDATle(tle1, tle2, name);
      if (success) {
        modal.remove();
      } else {
        alert('Invalid TLE data. Please check your input and try again.');
      }
    } else {
      alert('Please enter both TLE lines to add a new object.');
    }
  });
  
  return modal;
}
