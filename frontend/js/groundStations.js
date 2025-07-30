import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS_KM, EARTH_SCALE, EARTH_VISUAL_SURFACE_RADIUS, LOS_DEFAULT_KM, LOS_DEFAULT_BABYLON, LOS_BEAM_CONFIG, calculateHorizonDistance } from './constants.js';
import { toBabylonPosition } from './orbital-mechanics.js';
import { getSatelliteMeshes } from './satellites.js';
import { Button, TextBlock, Rectangle, Container } from '@babylonjs/gui';

/**
 * Static ground station definitions (lat, lon in degrees, alt in km)
 */
const GROUND_STATIONS = [
  { name: 'Canberra DSN Site', lat: -35.3989, lon: 148.9819, alt: 0.7 },
  { name: 'Vandenberg, CA', lat: 34.7420, lon: -120.5724, alt: 0.1 },
  { name: 'Wallops Island, VA', lat: 37.9402, lon: -75.4665, alt: 0.0 },
  { name: 'Mauna Kea Station', lat: 19.8206, lon: -155.4681, alt: 4.2 },
  { name: 'Diego Garcia', lat: -7.3135, lon: 72.4118, alt: 0.0 }
];

// Storage for station meshes and LOS beam meshes
const stationMeshes = {};
const losBeams = {}; // Store beams by "stationName_satelliteName" key

function toRadians(deg) {
  return deg * Math.PI / 180;
}

/**
 * Convert geodetic coordinates to Earth-centered Cartesian (km)
 */
function geodeticToCartesian(lat, lon, alt = 0) {
  const phi = toRadians(lat);
  const lambda = toRadians(lon); // Use original longitude - texture flip is handled in shader
  const radius = EARTH_RADIUS_KM + alt; // Use EARTH_RADIUS_KM constant + alt
  const x = radius * Math.cos(phi) * Math.cos(lambda);
  const y = radius * Math.cos(phi) * Math.sin(lambda);
  const z = radius * Math.sin(phi);
  // Return ECEF coordinates to be mapped to Babylon space
  return { x, y, z };
}

/**
 * Cleanup existing ground stations before creating new ones
 */
function cleanupGroundStations(scene) {
  Object.entries(stationMeshes).forEach(([key, stationEntry]) => {
    if (stationEntry) {
      // Clean up label observer if it exists
      if (stationEntry.mesh && stationEntry.mesh._labelContainer) {
        const labelContainer = stationEntry.mesh._labelContainer;
        if (labelContainer._labelObserver) {
          scene.onBeforeRenderObservable.remove(labelContainer._labelObserver);
        }
        labelContainer.dispose();
      }
      
      // Dispose meshes
      if (stationEntry.mesh) {
        stationEntry.mesh.dispose();
      }
      if (stationEntry.clickSphere) {
        stationEntry.clickSphere.dispose();
      }
      if (stationEntry.coverage) {
        stationEntry.coverage.dispose();
      }
    }
  });
  
  // Clear the storage
  for (const key in stationMeshes) {
    delete stationMeshes[key];
  }
}

/**
 * Create ground station meshes on the scene
 */
export function createGroundStations(scene, advancedTexture = null) {
  // Clean up any existing ground stations first
  cleanupGroundStations(scene);
  const earthMesh = scene.getMeshByName('earth');
  GROUND_STATIONS.forEach(station => {
    // Convert geodetic to Babylon.js coordinate system - place on actual Earth mesh surface
    // Calculate position directly without using toBabylonPosition to avoid visual surface scaling
    const phi = toRadians(station.lat);
    const lambda = toRadians(station.lon);
    const stationDiameter = 0.008;
    // Position slightly above Earth mesh to avoid z-fighting/choppy appearance
    // Small offset above radius 1.0 for clean visual
    const radius = 1.0 + 0.001;
    const pos = new BABYLON.Vector3(
      radius * Math.cos(phi) * Math.cos(lambda),
      radius * Math.sin(phi), 
      radius * Math.cos(phi) * Math.sin(lambda)
    );
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      station.name.replace(/\s+/g, '_'),
      { diameter: stationDiameter }, // smaller ground station markers for better scale
      scene
    );
    mesh.position = pos;
    // Parent station to Earth for tilt and rotation alignment
    if (earthMesh) mesh.parent = earthMesh;
    mesh.isPickable = true; // Enable clicking
    const mat = new BABYLON.StandardMaterial(station.name + '_mat', scene);
    mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
    mesh.material = mat;

    // Create a larger invisible collision sphere for easier clicking
    const clickSphere = BABYLON.MeshBuilder.CreateSphere(
      station.name.replace(/\s+/g, '_') + '_click',
      { diameter: 0.025 }, // Much larger for easier clicking
      scene
    );
    clickSphere.position = pos;
    if (earthMesh) clickSphere.parent = earthMesh;
    clickSphere.isPickable = true;
    clickSphere.visibility = 0; // Make it invisible
    
    // Apply the same material for consistency (though invisible)
    const clickMat = new BABYLON.StandardMaterial(station.name + '_click_mat', scene);
    clickMat.alpha = 0; // Fully transparent
    clickSphere.material = clickMat;
    // Calculate horizon distance for this station based on its elevation
    const horizonDistanceKm = calculateHorizonDistance(station.alt);
    const horizonDistanceBabylon = horizonDistanceKm * EARTH_SCALE;
    
    // Store station info with horizon calculations
    const stationInfo = {
      ...station,
      horizonDistanceKm,
      horizonDistanceBabylon
    };
    
    // Use mesh.name as key for consistency, store both visual and click meshes with extended info
    stationMeshes[mesh.name] = { mesh, clickSphere, info: stationInfo };

    // Apply interactivity to the larger click sphere for easier interaction
    clickSphere.actionManager = new BABYLON.ActionManager(scene);
    clickSphere.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOverTrigger,
        () => { document.getElementById('renderCanvas').style.cursor = 'pointer'; }
      )
    );
    clickSphere.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOutTrigger,
        () => { document.getElementById('renderCanvas').style.cursor = 'default'; }
      )
    );
    // Click handler to dispatch event with station data
    clickSphere.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger,
        () => {
          window.dispatchEvent(new CustomEvent('groundStationSelected', { detail: station }));
        }
      )
    );

    // Also keep the visual mesh interactive as backup
    mesh.actionManager = new BABYLON.ActionManager(scene);
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOverTrigger,
        () => { document.getElementById('renderCanvas').style.cursor = 'pointer'; }
      )
    );
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOutTrigger,
        () => { document.getElementById('renderCanvas').style.cursor = 'default'; }
      )
    );
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger,
        () => {
          window.dispatchEvent(new CustomEvent('groundStationSelected', { detail: station }));
        }
      )
    );

    // Add persistent label for ground station
    if (advancedTexture) {
      addGroundStationLabel(station.name, mesh, advancedTexture);
    }
  });
}

/**
 * Add a persistent label for a ground station
 */
function addGroundStationLabel(stationName, mesh, advancedTexture) {
  // Check if label already exists to prevent duplicates
  const existingLabel = advancedTexture.getControlByName(`${stationName.replace(/\s+/g, '_')}_label_container`);
  if (existingLabel) {
    console.warn(`Label already exists for ground station: ${stationName}`);
    return;
  }

  // Create a shortened display name for cleaner labels
  const displayName = stationName.replace(/ (Station|Site|DSN)/g, '').replace(', CA', '').replace(', VA', '');
  
  // Use TextBlock instead of Button for cleaner appearance
  const labelText = new TextBlock(`${stationName.replace(/\s+/g, '_')}_label`, displayName);
  labelText.width = "140px";
  labelText.height = "24px";
  labelText.color = "#00ff64";
  labelText.fontSize = 11;
  labelText.fontWeight = "bold";
  labelText.alpha = 0.8;
  labelText.zIndex = 1500;
  labelText.textWrapping = false;
  labelText.resizeToFit = true;
  
  // Add background using a simple rectangle
  const labelBg = new Rectangle(`${stationName.replace(/\s+/g, '_')}_label_bg`);
  labelBg.width = "140px";
  labelBg.height = "24px";
  labelBg.cornerRadius = 6;
  labelBg.background = "rgba(0, 0, 0, 0.7)";
  labelBg.thickness = 1;
  labelBg.color = "#00ff64";
  labelBg.alpha = 0.8;
  labelBg.zIndex = 1499; // Behind the text
  
  // Add both background and text to a container
  const labelContainer = new Container(`${stationName.replace(/\s+/g, '_')}_label_container`);
  labelContainer.width = "140px";
  labelContainer.height = "24px";
  labelContainer.addControl(labelBg);
  labelContainer.addControl(labelText);
  
  // Hover effects
  labelContainer.onPointerEnterObservable.add(() => {
    labelBg.background = "rgba(0, 100, 200, 0.7)"; // Match satellite label hover style
    labelContainer.alpha = 1.0;
    labelText.color = "#64ff00";
    document.getElementById('renderCanvas').style.cursor = 'pointer';
  });
  
  labelContainer.onPointerOutObservable.add(() => {
    labelBg.background = "rgba(0, 0, 0, 0.7)"; // Match satellite label style
    labelContainer.alpha = 0.8;
    labelText.color = "#00ff64";
    document.getElementById('renderCanvas').style.cursor = 'default';
  });
  
  // Click handler - trigger the same event as clicking the station
  labelContainer.onPointerUpObservable.add(() => {
    const stationInfo = GROUND_STATIONS.find(s => s.name === stationName);
    if (stationInfo) {
      window.dispatchEvent(new CustomEvent('groundStationSelected', { detail: stationInfo }));
    }
    // Reset label appearance after click
    labelBg.background = "rgba(0, 20, 0, 0.8)";
    labelContainer.alpha = 0.9;
    labelText.color = "#00ff64";
  });
  
  // Link label to the ground station mesh
  advancedTexture.addControl(labelContainer);
  labelContainer.linkWithMesh(mesh);
  labelContainer.linkOffsetY = -45; // Position above the station
  labelContainer.isVisible = true;
  
  // Scale label based on camera distance and Earth horizon visibility
  const scene = mesh.getScene();
  
  // Store the observer reference for cleanup
  const labelObserver = scene.onBeforeRenderObservable.add(() => {
    const camera = scene.activeCamera;
    if (!camera) return;

    const dist = BABYLON.Vector3.Distance(camera.position, mesh.position);

    // Check if ground station is visible from camera (not behind Earth's horizon)
    const cameraPos = camera.position;
    const stationPos = mesh.absolutePosition || mesh.position;
    const earthCenter = BABYLON.Vector3.Zero();
    
    // Calculate if station is on the visible side of Earth from camera
    const cameraToEarth = earthCenter.subtract(cameraPos).normalize();
    const cameraToStation = stationPos.subtract(cameraPos).normalize();
    
    // If the angle between camera-to-earth and camera-to-station vectors is less than ~90 degrees,
    // the station is on the visible hemisphere
    const dotProduct = BABYLON.Vector3.Dot(cameraToEarth, cameraToStation);
    const isOnVisibleSide = dotProduct > -0.1; // Small buffer to prevent flickering at horizon
    
    // Additional check: make sure station isn't directly behind Earth
    const stationToCamera = cameraPos.subtract(stationPos);
    const stationToEarth = earthCenter.subtract(stationPos);
    const stationDot = BABYLON.Vector3.Dot(stationToCamera.normalize(), stationToEarth.normalize());
    const isNotBehindEarth = stationDot < 0.8; // Station should face generally toward camera
    
    // Only show label if station is on visible side and not behind Earth
    const isVisible = isOnVisibleSide && isNotBehindEarth;
    
    if (isVisible) {
      // Scale labels within defined bounds to avoid over/under sizing
      const rawScale = 2.0 / dist;
      const minScale = 0.1; // Lower bound for far-out views to keep labels small
      const maxScale = 1.0; // Prevent labels from growing above original size
      const scale = Math.min(maxScale, Math.max(minScale, rawScale));

      // Fade out when very far to reduce clutter
      if (dist > 8) {
        labelContainer.alpha = Math.max(0.2, 0.9 * (10 - dist) / 2);
      } else {
        labelContainer.alpha = 0.9;
      }

      labelContainer.scaleX = labelContainer.scaleY = scale;
      labelContainer.isVisible = true;
      
      // Show ground station mesh when visible
      mesh.isVisible = true;
      
      // Also show the click sphere
      const stationEntry = stationMeshes[mesh.name];
      if (stationEntry && stationEntry.clickSphere) {
        stationEntry.clickSphere.isVisible = true;
      }
    } else {
      // Hide label when station is not visible from camera position
      labelContainer.isVisible = false;
      
      // Hide ground station mesh when not visible
      mesh.isVisible = false;
      
      // Also hide the click sphere
      const stationEntry = stationMeshes[mesh.name];
      if (stationEntry && stationEntry.clickSphere) {
        stationEntry.clickSphere.isVisible = false;
      }
    }
  });
  
  // Store observer reference for cleanup
  labelContainer._labelObserver = labelObserver;
  mesh._labelContainer = labelContainer;
}

let beamGlow = null;
let currentConnections = new Set(); // Track active connections for dashboard updates

/**
 * Update LOS beams between stations and satellites each frame
 */
export function updateGroundStationsLOS(scene) {
  // LOS lines disabled - just clean up any existing beams
  Object.values(losBeams).forEach(beam => {
    if (beam) {
      // Clean up pulse observer if it exists
      if (beam.pulseObserver) {
        scene.onBeforeRenderObservable.remove(beam.pulseObserver);
      }
      beam.dispose();
    }
  });
  
  // Clear the beam storage
  for (const key in losBeams) {
    delete losBeams[key];
  }
  
  // Note: LOS visualization has been disabled as requested
  // Ground stations will still show coverage circles but no connection lines
}

/**
 * Create enhanced connection line with improved dotted effect and better visibility
 */
function createEnhancedConnectionLine(stationPos, satPos, beamKey, scene, elevation, distance) {
  // Calculate signal strength based on elevation and distance
  const elevationFactor = Math.sin(elevation); // 0 to 1
  const distanceFactor = Math.max(0.3, 1 - (distance / LOS_MAX_BABYLON)); // 0.3 to 1
  const signalStrength = elevationFactor * distanceFactor;
  
  // Debug: log line creation
  // console.log(`[DEBUG] Creating enhanced connection line: ${beamKey}, signal strength: ${signalStrength.toFixed(2)}`);
  
  // Use configuration from constants
  const config = LOS_BEAM_CONFIG.auto;
  const segmentCount = config.segmentCount || 16;
  const segmentGap = config.segmentGap || 0.3;
  const lineWidth = config.lineWidth || 3.0;
  const minVisibility = config.minVisibility || 0.4;
  
  // Create enhanced dotted line segments
  const points = [];
  const totalDistance = BABYLON.Vector3.Distance(stationPos, satPos);
  
  for (let i = 0; i <= segmentCount * 2; i++) {
    const t = i / (segmentCount * 2);
    const point = BABYLON.Vector3.Lerp(stationPos, satPos, t);
    points.push(point);
  }
  
  // Create dotted lines with better visibility
  const lines = [];
  for (let i = 0; i < segmentCount; i++) {
    const startIdx = i * 2;
    const endIdx = Math.min(startIdx + 1, points.length - 1);
    
    if (startIdx < points.length && endIdx < points.length) {
      const lineSegment = BABYLON.MeshBuilder.CreateLines(
        `${beamKey}_segment_${i}`,
        { 
          points: [points[startIdx], points[endIdx]],
          updatable: true
        },
        scene
      );
      
      // Enhanced material with improved visibility
      const baseIntensity = Math.max(minVisibility, 0.6 + (signalStrength * 0.4));
      lineSegment.color = new BABYLON.Color3(0, baseIntensity, baseIntensity * 0.3);
      
      // Set line width if supported
      if (lineSegment.material) {
        lineSegment.material.lineWidth = lineWidth;
      }
      
      // console.log(`[DEBUG] Created enhanced line segment ${i} for ${beamKey} with intensity ${baseIntensity.toFixed(2)}`);
      
      lines.push(lineSegment);
    }
  }
  
  // Create enhanced data transmission particle
  const dataParticle = createEnhancedDataParticle(stationPos, satPos, beamKey, scene, signalStrength);
  
  // Combine all elements into a connection object
  const connection = {
    lines: lines,
    dataParticle: dataParticle,
    signalStrength: signalStrength,
    config: config,
    dispose: function() {
      this.lines.forEach(line => line.dispose());
      if (this.dataParticle) this.dataParticle.dispose();
      if (this.pulseObserver) {
        scene.onBeforeRenderObservable.remove(this.pulseObserver);
      }
    }
  };
  
  // Add enhanced pulsing effect with better visibility
  connection.pulseObserver = scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * (config.pulseSpeed || 0.004);
    const basePulse = 0.7 + 0.3 * Math.sin(time + signalStrength * 8);
    const dataRate = 0.8 + 0.2 * Math.sin(time * 1.5);
    
    // Enhanced pulse effect for connection lines
    connection.lines.forEach((line, index) => {
      const phaseOffset = index * 0.2;
      const linePulse = 0.6 + 0.4 * Math.sin(time * 1.2 + phaseOffset);
      const intensity = Math.max(minVisibility, signalStrength * linePulse * basePulse);
      
      // More vibrant green coloring with cyan highlights
      line.color = new BABYLON.Color3(
        intensity * 0.1, // Very slight red for warmth
        intensity, // Full green intensity
        intensity * 0.6 // Cyan component for modern look
      );
    });
    
    // Enhanced data transmission particle animation
    if (connection.dataParticle) {
      const t = (time * dataRate * 0.8) % 1;
      const currentPos = BABYLON.Vector3.Lerp(stationPos, satPos, t);
      connection.dataParticle.position = currentPos;
      
      // Improved fade in/out effect
      const fadeDistance = 0.15;
      let alpha = 1.0;
      if (t < fadeDistance) {
        alpha = t / fadeDistance;
      } else if (t > 1 - fadeDistance) {
        alpha = (1 - t) / fadeDistance;
      }
      
      // Add pulsing to the data particle
      const particlePulse = 0.7 + 0.3 * Math.sin(time * 3);
      
      if (connection.dataParticle.material) {
        connection.dataParticle.material.alpha = alpha * signalStrength * particlePulse;
        // Add glow effect
        connection.dataParticle.material.emissiveColor = new BABYLON.Color3(
          0, 
          alpha * signalStrength * particlePulse, 
          alpha * signalStrength * particlePulse * 0.8
        );
      }
    }
  });

  // console.log(`[DEBUG] Enhanced connection line created for ${beamKey}: ${lines.length} line segments, data particle: ${!!dataParticle}`);
  
  return connection;
}

/**
 * Create enhanced data transmission effect with improved visibility
 */
function createEnhancedDataParticle(stationPos, satPos, beamKey, scene, signalStrength) {
  const config = LOS_BEAM_CONFIG.auto;
  const particleSize = config.particleSize || 0.003;
  
  const particle = BABYLON.MeshBuilder.CreateSphere(
    `${beamKey}_data`,
    { diameter: particleSize * 2 }, // Larger particle for better visibility
    scene
  );
  
  const mat = new BABYLON.StandardMaterial(`${beamKey}_data_mat`, scene);
  
  // Enhanced cyan color with emissive properties
  mat.emissiveColor = new BABYLON.Color3(0, 0.9, 1); // Bright cyan
  mat.diffuseColor = new BABYLON.Color3(0, 0.7, 0.9); // Cyan diffuse
  mat.specularColor = new BABYLON.Color3(0.8, 0.8, 1); // White-cyan specular
  
  // Make it glow
  mat.alpha = Math.max(0.7, signalStrength);
  mat.disableLighting = false; // Enable lighting for better depth perception
  
  particle.material = mat;
  
  // console.log(`[DEBUG] Created enhanced data transmission particle for ${beamKey} with alpha ${mat.alpha.toFixed(2)}`);
  
  return particle;
}

/**
 * Utility function to compare sets
 */
function setsEqual(set1, set2) {
  if (set1.size !== set2.size) return false;
  for (let item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
}

/**
 * Update active dashboard with current connections
 */
function updateActiveDashboard() {
  // Dispatch event to trigger dashboard refresh
  window.dispatchEvent(new CustomEvent('groundStationConnectionsChanged', {
    detail: { activeConnections: Array.from(currentConnections) }
  }));
}

/**
 * Get current active connections for external access
 */
export function getCurrentConnections() {
  return Array.from(currentConnections);
}

/**
 * Clear all automatic LOS beams (useful when switching to dashboard mode)
 */
export function clearAutoLOSBeams() {
  // Clean up all existing beams with enhanced disposal
  Object.values(losBeams).forEach(beam => {
    if (beam) {
      if (typeof beam.dispose === 'function') {
        beam.dispose(); // For enhanced connections
      } else {
        beam.dispose(); // For legacy beams
      }
    }
  });
  
  // Clear the beam storage
  for (const key in losBeams) {
    delete losBeams[key];
  }
  
  // Clear connection tracking
  currentConnections.clear();
}

/**
 * Access ground station meshes
 */
export function getGroundStationMeshes() {
  return stationMeshes;
}

/**
 * Get ground station definitions
 */
export function getGroundStationDefinitions() {
  return GROUND_STATIONS;
}

/**
 * Create static coverage circles on Earth's surface around each station
 * representing max line-of-sight horizon based on each station's elevation.
 * @param {BABYLON.Scene} scene
 * @param {number} maxSatAltKm - Maximum satellite altitude in km (for optional limit)
 * @param {number} segments - Number of segments for circle resolution
 */
export function createCoverageCircles(scene, maxSatAltKm = 2000, segments = 64) {
  const re = EARTH_RADIUS_KM; // Use EARTH_RADIUS_KM constant
  
  GROUND_STATIONS.forEach(station => {
    // Calculate horizon distance for this specific station based on its elevation
    let stationHorizonKm = calculateHorizonDistance(station.alt);
    // If station at sea level or missing elevation, ensure a minimum coverage radius
    if (stationHorizonKm <= 0) {
      stationHorizonKm = LOS_DEFAULT_KM;
    }
    // Use the smaller of station horizon or max satellite communications range
    const effectiveRangeKm = Math.min(stationHorizonKm, maxSatAltKm);
    
    // Central angle for this station's coverage
    const phi = Math.acos(re / (re + effectiveRangeKm));
    
    const lat0 = station.lat * Math.PI / 180;
    const lon0 = station.lon * Math.PI / 180;
    const path = [];
    for (let i = 0; i <= segments; i++) {
      const theta = 2 * Math.PI * i / segments;
      const lat2 = Math.asin(Math.sin(lat0) * Math.cos(phi) + Math.cos(lat0) * Math.sin(phi) * Math.cos(theta));
      const lon2 = lon0 + Math.atan2(
        Math.sin(theta) * Math.sin(phi) * Math.cos(lat0),
        Math.cos(phi) - Math.sin(lat0) * Math.sin(lat2)
      );
      // Place circle slightly above Earth mesh surface to avoid z-fighting
      const circleRadius = 1.0 + 0.001; // Higher elevation to prevent flickering
      const circlePos = new BABYLON.Vector3(
        circleRadius * Math.cos(lat2) * Math.cos(lon2),
        circleRadius * Math.sin(lat2),
        circleRadius * Math.cos(lat2) * Math.sin(lon2)
      );
      path.push(circlePos);
    }
    const circle = BABYLON.MeshBuilder.CreateLines(
      `${station.name.replace(/\s+/g, '_')}_coverage`,
      { points: path, updatable: false },
      scene
    );
    circle.color = new BABYLON.Color3(0, 1, 0);
    circle.alpha = 0.7; // Make slightly transparent for better appearance
    // Render circles above Earth surface to avoid z-fighting
    circle.renderingGroupId = 1; // Render after Earth to prevent flickering
    circle.material = new BABYLON.StandardMaterial(`${station.name.replace(/\s+/g, '_')}_coverage_mat`, scene);
    circle.material.emissiveColor = new BABYLON.Color3(0, 1, 0);
    circle.material.disableLighting = true;
    circle.material.alpha = 0.7;
    const earthMesh = scene.getMeshByName('earth');
    if (earthMesh) circle.parent = earthMesh;
    // toggle coverage circle visibility based on camera hemisphere
    scene.onBeforeRenderObservable.add(() => {
      const cam = scene.activeCamera;
      if (!cam) return;
      // Normalize vectors from Earth center
      const camDir = cam.position.normalize();
      const stationPos = stationMeshes[station.name.replace(/\s+/g, '_')].mesh.absolutePosition;
      const stationDir = stationPos.normalize();
      // Show circle only when station faces the camera
      circle.isVisible = BABYLON.Vector3.Dot(camDir, stationDir) > 0;
    });
    stationMeshes[station.name.replace(/\s+/g, '_')].coverage = circle;
  });
}

/**
 * Create a simple test connection line for debugging
 */
function createTestConnectionLine(scene) {
  // Get first ground station and first satellite for testing
  const stationEntries = Object.entries(stationMeshes);
  const satEntries = Object.entries(getSatelliteMeshes());
  
  if (stationEntries.length === 0 || satEntries.length === 0) {
    // console.log('[DEBUG] No stations or satellites available for test');
    return;
  }
  
  const [stationKey, stationEntry] = stationEntries[0];
  const [satName, satMesh] = satEntries[0];
  
  const stationPos = stationEntry.mesh.absolutePosition;
  const satPos = satMesh.absolutePosition;
  
  // console.log(`[DEBUG] Creating test connection between ${stationKey} and ${satName}`);
  // console.log(`[DEBUG] Station pos: ${stationPos.x.toFixed(3)}, ${stationPos.y.toFixed(3)}, ${stationPos.z.toFixed(3)}`);
  // console.log(`[DEBUG] Satellite pos: ${satPos.x.toFixed(3)}, ${satPos.y.toFixed(3)}, ${satPos.z.toFixed(3)}`);
  
  // Create a simple bright line for testing
  const testLine = BABYLON.MeshBuilder.CreateLines(
    'test_connection',
    { points: [stationPos, satPos] },
    scene
  );
  testLine.color = new BABYLON.Color3(1, 1, 0); // Bright yellow for visibility
  
  // Make it pulse for easy identification
  const observer = scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.005;
    const intensity = 0.5 + 0.5 * Math.sin(time);
    testLine.color = new BABYLON.Color3(intensity, intensity, 0);
  });
  
  // Store for cleanup
  testLine.testObserver = observer;
  
  // console.log('[DEBUG] Test connection line created');
  
  // Clean up after 10 seconds
  setTimeout(() => {
    scene.onBeforeRenderObservable.remove(observer);
    testLine.dispose();
    // console.log('[DEBUG] Test connection line cleaned up');
  }, 10000);
}

/**
 * Add test connection functionality
 */
export function createTestConnection(scene) {
  // Wait a bit for everything to load, then create test connection
  setTimeout(() => {
    createTestConnectionLine(scene);
  }, 3000);
}
