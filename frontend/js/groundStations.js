import * as BABYLON from '@babylonjs/core';
import { EARTH_SCALE } from './constants.js';
import { toBabylonPosition } from './orbital-mechanics.js';
import { getSatelliteMeshes } from './satellites.js';

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

function toRadians(deg) {
  return deg * Math.PI / 180;
}

/**
 * Convert geodetic coordinates to Earth-centered Cartesian (km)
 */
function geodeticToCartesian(lat, lon, alt = 0) {
  const phi = toRadians(lat);
  const lambda = toRadians(lon);
  const radius = 6371 + alt; // Earth radius km + alt
  const x = radius * Math.cos(phi) * Math.cos(lambda);
  const y = radius * Math.cos(phi) * Math.sin(lambda);
  const z = radius * Math.sin(phi);
  // Return ECEF coordinates to be mapped to Babylon space
  return { x, y, z };
}

/**
 * Create ground station meshes on the scene
 */
export function createGroundStations(scene) {
  const earthMesh = scene.getMeshByName('earth');
  GROUND_STATIONS.forEach(station => {
    // Convert geodetic to Babylon.js coordinate system
    const ecef = geodeticToCartesian(station.lat, station.lon, station.alt);
    const pos = toBabylonPosition(ecef, EARTH_SCALE);
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      station.name.replace(/\s+/g, '_'),
      { diameter: 0.02 },
      scene
    );
    mesh.position = pos;
    // Parent station to Earth for tilt and rotation alignment
    if (earthMesh) mesh.parent = earthMesh;
    const mat = new BABYLON.StandardMaterial(station.name + '_mat', scene);
    mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
    mesh.material = mat;
    // Use mesh.name as key for consistency
    stationMeshes[mesh.name] = { mesh, beam: null, info: station };

    // Tooltip or interactivity
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
    // Click handler to dispatch event with station data
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger,
        () => {
          window.dispatchEvent(new CustomEvent('groundStationSelected', { detail: station }));
        }
      )
    );
  });
}

/**
 * Update LOS beams between stations and satellites each frame
 */
export function updateGroundStationsLOS(scene) {
  const sats = getSatelliteMeshes();
  Object.entries(stationMeshes).forEach(([key, entry]) => {
    const mesh = entry.mesh;
    let beam = entry.beam;
    const stationInfo = entry.info;
    Object.entries(sats).forEach(([satName, satMesh]) => {
       // Calculate elevation angle (simple dot product)
       const stationPos = mesh.absolutePosition;
       const satPos = satMesh.absolutePosition;
       const dir = satPos.subtract(stationPos).normalize();
       const up = stationPos.normalize();
       const elevation = BABYLON.Vector3.Dot(dir, up);
       const inLOS = elevation > 0;
      const beamKey = `${mesh.name}_${satName}`;
      if (inLOS) {
        const points = [stationPos, satPos];
        if (!beam) {
          const line = BABYLON.MeshBuilder.CreateLines(beamKey, { points, updatable: true, instance: null }, scene);
          const glow = new BABYLON.GlowLayer('groundBeamGlow', scene);
          glow.intensity = 0.5;
          entry.beam = { line, glow };
        } else {
          // update existing line instance
          BABYLON.MeshBuilder.CreateLines(beamKey, { points, updatable: true, instance: beam.line }, scene);
        }
      } else if (beam) {
        beam.line.dispose();
        beam.glow.dispose();
        entry.beam = null;
      }
     });
   });
}

/**
 * Access ground station meshes
 */
export function getGroundStationMeshes() {
  return stationMeshes;
}
