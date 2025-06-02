import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE, LOS_MAX_KM, LOS_MAX_BABYLON, LOS_BEAM_CONFIG } from './constants.js';
import { toBabylonPosition } from './orbital-mechanics.js';
import { getSatelliteMeshes } from './satellites.js';
import { Button } from '@babylonjs/gui';

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
  const lambda = toRadians(lon);
  const radius = EARTH_RADIUS + alt; // Use EARTH_RADIUS constant + alt
  const x = radius * Math.cos(phi) * Math.cos(lambda);
  const y = radius * Math.cos(phi) * Math.sin(lambda);
  const z = radius * Math.sin(phi);
  // Return ECEF coordinates to be mapped to Babylon space
  return { x, y, z };
}

/**
 * Create ground station meshes on the scene
 */
export function createGroundStations(scene, advancedTexture = null) {
  const earthMesh = scene.getMeshByName('earth');
  GROUND_STATIONS.forEach(station => {
    // Convert geodetic to Babylon.js coordinate system
    const ecef = geodeticToCartesian(station.lat, station.lon, station.alt);
    const pos = toBabylonPosition(ecef, EARTH_SCALE);
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      station.name.replace(/\s+/g, '_'),
      { diameter: 0.008 }, // smaller ground station markers for better scale
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
    // Use mesh.name as key for consistency, store both visual and click meshes
    stationMeshes[mesh.name] = { mesh, clickSphere, info: station };

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
  // Create a shortened display name for cleaner labels
  const displayName = stationName.replace(/ (Station|Site|DSN)/g, '').replace(', CA', '').replace(', VA', '');
  
  const labelBtn = Button.CreateSimpleButton(`${stationName.replace(/\s+/g, '_')}_label`, displayName);
  labelBtn.width = "140px";
  labelBtn.height = "32px";
  labelBtn.cornerRadius = 6;
  labelBtn.background = "rgba(0, 20, 0, 0.8)";
  labelBtn.color = "#00ff64";
  labelBtn.fontSize = 11;
  labelBtn.fontWeight = "bold";
  labelBtn.thickness = 1;
  labelBtn.alpha = 0.9;
  labelBtn.zIndex = 1500; // Lower than satellite labels to avoid conflicts
  labelBtn.isPointerBlocker = true;
  
  // Hover effects
  labelBtn.onPointerEnterObservable.add(() => {
    labelBtn.background = "rgba(0, 100, 0, 0.9)";
    labelBtn.alpha = 1.0;
    labelBtn.color = "#64ff00";
    document.getElementById('renderCanvas').style.cursor = 'pointer';
  });
  
  labelBtn.onPointerOutObservable.add(() => {
    labelBtn.background = "rgba(0, 20, 0, 0.8)";
    labelBtn.alpha = 0.9;
    labelBtn.color = "#00ff64";
    document.getElementById('renderCanvas').style.cursor = 'default';
  });
  
  // Click handler - trigger the same event as clicking the station
  labelBtn.onPointerUpObservable.add(() => {
    const stationInfo = GROUND_STATIONS.find(s => s.name === stationName);
    if (stationInfo) {
      window.dispatchEvent(new CustomEvent('groundStationSelected', { detail: stationInfo }));
    }
    // Reset label appearance after click
    labelBtn.background = "rgba(0, 20, 0, 0.8)";
    labelBtn.alpha = 0.9;
    labelBtn.color = "#00ff64";
  });
  
  // Link label to the ground station mesh
  advancedTexture.addControl(labelBtn);
  labelBtn.linkWithMesh(mesh);
  labelBtn.linkOffsetY = -45; // Position above the station
  labelBtn.isVisible = true;
  
  // Scale label based on camera distance
  const scene = mesh.getScene();
  scene.onBeforeRenderObservable.add(() => {
    const camera = scene.activeCamera;
    if (!camera) return;
    
    const dist = BABYLON.Vector3.Distance(camera.position, mesh.position);
    
    // Ground stations are smaller and closer to Earth, so adjust scaling
    let scale = 1.0;
    if (dist > 1.5) {
      scale = Math.max(0.4, 2.0 / dist); // Scale down less aggressively than satellites
    }
    
    // Fade out when very far to reduce clutter
    if (dist > 8) {
      labelBtn.alpha = Math.max(0.2, 0.9 * (10 - dist) / 2);
    } else {
      labelBtn.alpha = 0.9;
    }
    
    labelBtn.scaleX = labelBtn.scaleY = scale;
  });
}

let beamGlow = null;

/**
 * Update LOS beams between stations and satellites each frame
 */
export function updateGroundStationsLOS(scene) {
  const sats = getSatelliteMeshes();
  
  // First, clean up all existing beams
  Object.values(losBeams).forEach(beam => {
    if (beam) {
      beam.dispose();
    }
  });
  
  // Clear the beam storage
  for (const key in losBeams) {
    delete losBeams[key];
  }
  
  // Now check each station-satellite pair for LOS
  Object.entries(stationMeshes).forEach(([stationKey, stationEntry]) => {
    const stationMesh = stationEntry.mesh;
    const stationPos = stationMesh.absolutePosition;
    
    Object.entries(sats).forEach(([satName, satMesh]) => {
      const satPos = satMesh.absolutePosition;
      const dirVec = satPos.subtract(stationPos);
      const distanceBabylon = dirVec.length();
      
      // Check distance limit (convert to proper units)
      if (distanceBabylon > LOS_MAX_BABYLON) {
        return; // Skip this satellite, too far
      }
      
      // Check elevation (satellite above horizon)
      const dir = dirVec.normalize();
      const stationUp = stationPos.normalize();
      const elevation = BABYLON.Vector3.Dot(dir, stationUp);
      
      if (elevation > 0) {
        // Satellite is in LOS, create beam
        const beamKey = `${stationKey}_${satName}`;
        const tube = BABYLON.MeshBuilder.CreateTube(beamKey, {
          path: [stationPos, satPos],
          radius: LOS_BEAM_CONFIG.auto.radius,
          updatable: false,
          sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);
        
        const mat = new BABYLON.StandardMaterial(`${beamKey}_mat`, scene);
        mat.emissiveColor = new BABYLON.Color3(
          LOS_BEAM_CONFIG.auto.color.r, 
          LOS_BEAM_CONFIG.auto.color.g, 
          LOS_BEAM_CONFIG.auto.color.b
        );
        mat.alpha = LOS_BEAM_CONFIG.auto.alpha;
        tube.material = mat;
        
        // Store the beam
        losBeams[beamKey] = tube;
      }
    });
  });
}

/**
 * Clear all automatic LOS beams (useful when switching to dashboard mode)
 */
export function clearAutoLOSBeams() {
  // Clean up all existing beams
  Object.values(losBeams).forEach(beam => {
    if (beam) {
      beam.dispose();
    }
  });
  
  // Clear the beam storage
  for (const key in losBeams) {
    delete losBeams[key];
  }
}

/**
 * Access ground station meshes
 */
export function getGroundStationMeshes() {
  return stationMeshes;
}

/**
 * Create static coverage circles on Earth's surface around each station
 * representing max line-of-sight horizon for satellites up to maxAltKm.
 * @param {BABYLON.Scene} scene
 * @param {number} maxAltKm - Maximum satellite altitude in km
 * @param {number} segments - Number of segments for circle resolution
 */
export function createCoverageCircles(scene, maxAltKm = LOS_MAX_KM, segments = 64) {
  const re = EARTH_RADIUS; // Use EARTH_RADIUS constant
  // Central angle for horizon
  const phi = Math.acos(re / (re + maxAltKm));
  GROUND_STATIONS.forEach(station => {
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
      const ecef = geodeticToCartesian(lat2 * 180 / Math.PI, lon2 * 180 / Math.PI, 0);
      const pos = toBabylonPosition(ecef, EARTH_SCALE);
      path.push(pos);
    }
    const circle = BABYLON.MeshBuilder.CreateLines(
      `${station.name.replace(/\s+/g, '_')}_coverage`,
      { points: path, updatable: false },
      scene
    );
    circle.color = new BABYLON.Color3(0, 1, 0);
    const earthMesh = scene.getMeshByName('earth');
    if (earthMesh) circle.parent = earthMesh;
    stationMeshes[station.name.replace(/\s+/g, '_')].coverage = circle;
  });
}
