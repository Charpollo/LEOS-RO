/**
 * LEOS First Orbit - Simplified Satellites Module
 * Streamlined satellite creation and animation with enhanced visibility
 */
import { 
  EARTH_RADIUS_KM,
  EARTH_DISPLAY_RADIUS, 
  ORBIT_LINE_SMOOTHNESS,
  ORBIT_DISTANCE_MULTIPLIER,
  ASSET_PATHS,
  CRTS1_COLOR,
  BULLDOG_COLOR,
  SATELLITE_INDICATOR_SIZE,
  ORBIT_LINE_WIDTH,
  ORBIT_LINE_OPACITY,
  SATELLITE_SCALE,
  CRTS1_SCALE,
  DEV_MARKER_SIZE,
  ORBIT_TRAIL_ENABLED,
  TRAIL_LENGTH,
  TRAIL_FADE_START,
  ORBIT_TRAIL_WIDTH,
  CAMERA_FOLLOW_OFFSET,
  TRAIL_MAX_PERCENTAGE,
  SATELLITE_ORBIT_SPEED_FACTOR,
  VISUALIZATION_SCALE
} from './config.js';
import { getScene, getCamera, getControls } from './scene.js';
import { logMessage, logError, logDebug } from './utils.js';

// Simplified satellite array
const satellites = [];

// Tracking which satellite is selected and if we're in follow mode
let selectedSatellite = null;
let followMode = false;
let followOffset = new THREE.Vector3(0, 0.5, 2); // Default offset for camera following

// Get satellites array
export function getSatellites() {
  return satellites;
}

// Set the currently selected satellite
export function setSelectedSatellite(satellite) {
  selectedSatellite = satellite;
  
  // When a new satellite is selected, update all satellites for visual feedback
  for (const sat of satellites) {
    // Update visual indicator to show selected state
    if (sat.indicator) {
      if (sat === selectedSatellite) {
        // Make the selected satellite's indicator larger and more intense
        sat.indicator.material.uniforms.glowColor.value.setHex(0xffffff);
        sat.indicator.material.uniforms.intensityMult.value = 2.0;
      } else {
        // Reset other satellites' indicators
        // Convert color to hex value properly, handling both string and number formats
        const colorHex = typeof sat.color === 'string' 
          ? parseInt(sat.color.replace('#', '0x'), 16) 
          : sat.color;
        
        sat.indicator.material.uniforms.glowColor.value.setHex(colorHex);
        sat.indicator.material.uniforms.intensityMult.value = 1.0;
      }
    }
  }
  
  return selectedSatellite;
}

// Toggle or set satellite follow mode
export function setFollowMode(enable) {
  const previousMode = followMode;
  followMode = enable;
  
  // If we're entering follow mode and we have a selected satellite
  if (followMode && selectedSatellite && !previousMode) {
    // Disable orbit controls when in follow mode
    const controls = getControls();
    if (controls) {
      controls.enabled = false;
    }
    
    logMessage(`Following satellite: ${selectedSatellite.name}`);
  } 
  
  // If we're exiting follow mode
  if (!followMode && previousMode) {
    // Re-enable orbit controls
    const controls = getControls();
    if (controls) {
      controls.enabled = true;
    }
    
    logMessage('Exited satellite follow mode');
  }
  
  return followMode;
}

// Toggle follow mode for a specific satellite
export function toggleFollowSatellite(satellite) {
  // If we're already following this satellite, exit follow mode
  if (followMode && selectedSatellite === satellite) {
    setFollowMode(false);
    return false;
  }
  
  // Otherwise, select the satellite and enter follow mode
  setSelectedSatellite(satellite);
  setFollowMode(true);
  return true;
}

// Create a satellite from trajectory data - simplified
export function createSatellite(name, color, trajectoryData) {
  if (!trajectoryData || trajectoryData.length === 0) {
    logError(`Cannot create satellite ${name}: No trajectory data`);
    return null;
  }
  
  logMessage(`Creating satellite ${name} with ${trajectoryData.length} trajectory points`);
  
  // Process and validate trajectory data to prevent NaN values
  const validTrajectory = preprocessTrajectoryData(trajectoryData);
  
  // Create a group for the satellite
  const satelliteGroup = new THREE.Group();
  satelliteGroup.name = name;
  
  // Add satellite group to scene
  const scene = getScene();
  scene.add(satelliteGroup);
  
  // Create the orbit trail (for showing the satellite's path over time)
  const orbitTrail = createOrbitTrail(color);
  scene.add(orbitTrail);
  
  // Create visual indicator for the satellite position
  const indicator = createSatelliteIndicator(name, color);
  satelliteGroup.add(indicator);
  
  // Create a development marker to make satellites visible
  const devMarker = createDevMarker(color);
  satelliteGroup.add(devMarker);
  
  // Load 3D model with appropriate scale based on satellite type
  const modelPath = name === "CRTS1" ? ASSET_PATHS.CRTS_SATELLITE : ASSET_PATHS.BULLDOG_SATELLITE;
  const modelScale = name === "CRTS1" ? CRTS1_SCALE : SATELLITE_SCALE;
  
  loadSatelliteModel(modelPath, (model) => {
    model.name = `${name}_Model`;
    // Scale model appropriately based on satellite type
    model.scale.set(
      modelScale, 
      modelScale, 
      modelScale
    );
    satelliteGroup.add(model);
    
    // Store the model reference
    const satIndex = satellites.findIndex(s => s.name === name);
    if (satIndex >= 0) {
      satellites[satIndex].model = model;
    }
    
    logMessage(`Satellite ${name} model loaded successfully`);
  });
  
  // Create a simple text label
  const textLabel = createSimpleLabel(name, color);
  // Move the label position upward to avoid covering the satellite
  textLabel.position.set(0, EARTH_DISPLAY_RADIUS * 0.15, 0); // Increased Y position
  satelliteGroup.add(textLabel);
  
  // Store satellite data
  const satellite = {
    name: name,
    group: satelliteGroup,
    model: null,  // Will be set when model loads
    orbitTrail: orbitTrail,
    trailPoints: [], // Array to store trail positions
    indicator: indicator,
    devMarker: devMarker,
    label: textLabel,
    trajectory: validTrajectory,
    color: color,
    currentIndex: 0,
    interpolationFactor: 0,
    previousPositions: [], // Store previous positions for trail
    totalTrailPoints: Math.floor(validTrajectory.length * TRAIL_MAX_PERCENTAGE), // Limit trail length to percentage of total
    firstUpdate: true // Flag for first update
  };
  
  // Add to satellites array
  satellites.push(satellite);
  
  return satellite;
}

// Preprocess trajectory data to ensure valid positions and no NaN values
function preprocessTrajectoryData(trajectoryData) {
  const validTrajectory = [];
  const earthRadius = EARTH_RADIUS_KM;
  
  // Check if we have valid data to begin with
  if (!trajectoryData || !Array.isArray(trajectoryData) || trajectoryData.length === 0) {
    logError("Invalid or empty trajectory data received");
    throw new Error("Invalid trajectory data: empty or malformed array");
  }
  
  for (let i = 0; i < trajectoryData.length; i++) {
    const point = trajectoryData[i];
    
    // Ensure position data exists and is valid
    if (!point.position || 
        point.position.length !== 3 || 
        point.position.some(p => isNaN(p) || !isFinite(p))) {
      
      // Skip invalid points
      logError(`Invalid trajectory point at index ${i}: ${JSON.stringify(point)}`);
      continue;
    }
    
    // Ensure time value is valid
    let time = point.time;
    if (isNaN(time) || !isFinite(time)) {
      time = i * 60; // Default time in seconds
      logError(`Invalid time value in trajectory point at index ${i}, using default time`);
    }
    
    // Create valid trajectory point
    const validPoint = {
      position: [...point.position],
      velocity: point.velocity ? [...point.velocity] : [0, 0, 0],
      time: time,
      altitude_km: point.altitude_km || calculateAltitude(point.position, earthRadius),
      velocity_kms: point.velocity_kms || 0
    };
    
    validTrajectory.push(validPoint);
  }
  
  // If no valid points, this is a critical error - we don't generate fallback data
  if (validTrajectory.length === 0) {
    logError("No valid trajectory points found after processing");
    throw new Error("No valid trajectory points found - cannot visualize satellite");
  }
  
  // Ensure time values are monotonically increasing
  for (let i = 1; i < validTrajectory.length; i++) {
    if (validTrajectory[i].time <= validTrajectory[i-1].time) {
      logError(`Non-monotonic time values at index ${i}, fixing`);
      validTrajectory[i].time = validTrajectory[i-1].time + 60; // Add 60 seconds
    }
  }
  
  logMessage(`Processed ${validTrajectory.length} valid trajectory points`);
  return validTrajectory;
}

// Calculate altitude from position vector (relative to Earth center)
function calculateAltitude(position, earthRadius) {
  const [x, y, z] = position;
  const distance = Math.sqrt(x*x + y*y + z*z) / 1000; // Convert to km
  return distance - earthRadius;
}

// Create orbit trail for showing path over time
function createOrbitTrail(color) {
  // Create empty geometry for the trail
  const trailGeometry = new THREE.BufferGeometry();
  
  // Initialize with empty array - will be filled during updates
  const positions = new Float32Array(TRAIL_LENGTH * 3);
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Add color attribute for fade effect
  const colors = new Float32Array(TRAIL_LENGTH * 3);
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  // Initialize all points as invisible
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    const baseColor = new THREE.Color(color);
    colors[i * 3] = baseColor.r;
    colors[i * 3 + 1] = baseColor.g;
    colors[i * 3 + 2] = baseColor.b;
    
    // Set initial positions to origin (will be updated during animation)
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
  }
  
  // Create material with vertex colors for fade effect
  const trailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    linewidth: ORBIT_TRAIL_WIDTH,
    transparent: true,
    opacity: 0.8,
    depthTest: true,
    depthWrite: false
  });
  
  const trail = new THREE.Line(trailGeometry, trailMaterial);
  trail.name = "OrbitTrail";
  trail.renderOrder = 6; // Higher than orbit line
  trail.frustumCulled = false; // Ensure it's always rendered
  
  return trail;
}

// Create a visual indicator for the satellite
function createSatelliteIndicator(name, color) {
  // Create a bright glowing sphere for better visibility
  const geometry = new THREE.SphereGeometry(SATELLITE_INDICATOR_SIZE, 16, 16);
  
  // Create a glowing material for the indicator
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      intensityMult: { value: 1.2 } // Reduced from 2.0 for less intense glow
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensityMult;
      
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      
      void main() {
        float intensity = pow(0.6 - dot(vNormal, vPositionNormal), 1.8) * intensityMult; // Reduced power and intensity
        gl_FragColor = vec4(glowColor, 1.0) * intensity;
      }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  
  const indicator = new THREE.Mesh(geometry, material);
  indicator.name = `${name}_Indicator`;
  
  // Add a pulsing animation to the indicator during updates
  indicator.userData = {
    pulseTime: 0,
    color: color
  };
  
  return indicator;
}

// Create a simple text label for development
function createSimpleLabel(name, color) {
  // Create canvas for text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 256;
  
  // Set background
  context.fillStyle = 'rgba(0, 0, 0, 0.8)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add border
  context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.lineWidth = 8;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  
  // Set text style
  context.font = 'bold 64px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Draw text
  context.fillText(name, canvas.width / 2, 80);
  context.font = '48px Arial';
  
  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create material
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  });
  
  // Create sprite
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(EARTH_DISPLAY_RADIUS * 0.15, EARTH_DISPLAY_RADIUS * 0.075, 1);
  
  return sprite;
}

// Create a development marker
function createDevMarker(color) {
  // Create a simple cross marker that's visible but not too large
  const group = new THREE.Group();
  
  // Add a small cube
  const cubeSize = DEV_MARKER_SIZE;
  const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cubeMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.7,
    wireframe: true,
    wireframeLinewidth: 2
  });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  group.add(cube);
  
  // Add small crossing lines
  const linesMaterial = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 2
  });
  
  const lineSize = DEV_MARKER_SIZE * 2;
  
  // X-axis line
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-lineSize, 0, 0),
    new THREE.Vector3(lineSize, 0, 0)
  ]);
  const xLine = new THREE.Line(xGeometry, linesMaterial);
  group.add(xLine);
  
  // Y-axis line
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -lineSize, 0),
    new THREE.Vector3(0, lineSize, 0)
  ]);
  const yLine = new THREE.Line(yGeometry, linesMaterial);
  group.add(yLine);
  
  // Z-axis line
  const zGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, -lineSize),
    new THREE.Vector3(0, 0, lineSize)
  ]);
  const zLine = new THREE.Line(zGeometry, linesMaterial);
  group.add(zLine);
  
  group.renderOrder = 15; // Ensure it renders after Earth
  
  return group;
}

// Load satellite 3D model
function loadSatelliteModel(modelPath, callback) {
  const loader = new THREE.GLTFLoader();
  
  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      model.renderOrder = 25; // Ensure it renders after Earth
      callback(model);
    },
    (xhr) => {
      const percent = (xhr.loaded / xhr.total) * 100;
      logMessage(`Loading satellite model: ${percent.toFixed(0)}%`);
    },
    (error) => {
      logError(`Error loading satellite model: ${error.message}`);
    }
  );
}

// Update all satellites based on time - simplified
export function updateSatellites(time) {
  for (const satellite of satellites) {
    updateSatellitePosition(satellite, time);
    updateOrbitTrail(satellite);
  }
  
  // Update camera position if in follow mode
  if (followMode && selectedSatellite) {
    updateCameraFollow();
  }
}

// Update camera position to follow selected satellite
function updateCameraFollow() {
  if (!selectedSatellite || !followMode) return;
  
  const camera = getCamera();
  const controls = getControls();
  if (!camera || !controls) return;
  
  // Skip ALL camera control if in satellite view mode
  // This is critical - we need to let user-interaction.js handle it
  if (controls.userData && controls.userData.inSatelliteView) {
    return;
  }
  
  // Only run this code if we're NOT in satellite view mode
  // This is the normal follow mode, not the click-to-view mode
  
  // Get satellite position
  const satPosition = selectedSatellite.group.position.clone();
  
  // Calculate normalized direction from Earth center to satellite
  const direction = satPosition.clone().normalize();
  
  // Apply offset adjustments based on direction
  // This creates a camera position that follows behind and slightly above the satellite
  const offsetDistance = CAMERA_FOLLOW_OFFSET || 2.0;
  
  // Direction vector from satellite to Earth (reverse of satellite direction)
  const lookDirection = direction.clone().negate();
  
  // Up vector (perpendicular to direction)
  const up = new THREE.Vector3(0, 1, 0);
  up.sub(direction.clone().multiplyScalar(up.dot(direction))).normalize();
  
  // Calculate camera position with offset
  // Position behind and slightly above the satellite
  const cameraPosition = satPosition.clone()
    .add(lookDirection.multiplyScalar(offsetDistance * 0.6)) // Behind
    .add(up.multiplyScalar(offsetDistance * 0.4)); // Above
  
  // Update camera position with smooth transition
  camera.position.lerp(cameraPosition, 0.1);
  
  // Make camera look at the satellite
  camera.lookAt(satPosition);
  
  // Update controls target to match satellite position
  controls.target.copy(satPosition);
}

// Update satellite position based on time with realistic orbital mechanics
function updateSatellitePosition(satellite, time) {
  if (!satellite.trajectory || satellite.trajectory.length < 2) return;
  
  // Calculate proper orbital position with the trajectory points
  const trajectory = satellite.trajectory;
  const totalTime = trajectory[trajectory.length - 1].time;
  
  // Apply the orbit speed factor to slow down the satellite orbits
  // to match realistic LEO time compared to Earth rotation
  const scaledTime = time * SATELLITE_ORBIT_SPEED_FACTOR;
  
  // Create a normalized time value between 0 and 1 that loops
  const normalizedTime = (scaledTime / totalTime) % 1.0;
  
  // Convert to index in trajectory array (0 to length-1)
  const exactIndex = normalizedTime * (trajectory.length - 1);
  
  // Get the two closest indices for interpolation
  const index1 = Math.floor(exactIndex);
  const index2 = (index1 + 1) % trajectory.length;
  
  // Calculate interpolation factor (0-1) between the two points
  const factor = exactIndex - index1;
  
  // Retrieve the two positions to interpolate between
  const pos1 = new THREE.Vector3(
    trajectory[index1].position[0] * ORBIT_DISTANCE_MULTIPLIER, 
    trajectory[index1].position[1] * ORBIT_DISTANCE_MULTIPLIER, 
    trajectory[index1].position[2] * ORBIT_DISTANCE_MULTIPLIER
  );
  
  const pos2 = new THREE.Vector3(
    trajectory[index2].position[0] * ORBIT_DISTANCE_MULTIPLIER, 
    trajectory[index2].position[1] * ORBIT_DISTANCE_MULTIPLIER, 
    trajectory[index2].position[2] * ORBIT_DISTANCE_MULTIPLIER
  );
  
  // Log position data on first update to help debugging
  if (satellite.firstUpdate) {
    logDebug(`Satellite ${satellite.name} initial position: index=${index1}, factor=${factor.toFixed(3)}`);
    logDebug(`  Pos1: ${pos1.x.toFixed(2)}, ${pos1.y.toFixed(2)}, ${pos1.z.toFixed(2)}`);
    logDebug(`  Pos2: ${pos2.x.toFixed(2)}, ${pos2.y.toFixed(2)}, ${pos2.z.toFixed(2)}`);
    satellite.firstUpdate = false;
  }
  
  // Calculate velocity vector for orientation
  const velocity = new THREE.Vector3().subVectors(pos2, pos1).normalize();
  
  // Use smooth interpolation between the two positions
  const position = new THREE.Vector3();
  
  // Instead of linear interpolation, use spherical interpolation for orbital motion
  // This prevents the satellite from cutting through the Earth
  if (pos1.length() > 0 && pos2.length() > 0) {
    // Get the angle between the two positions
    const angle = pos1.angleTo(pos2);
    
    // If the angle is very small, just use linear interpolation
    if (angle < 0.01) {
      position.lerpVectors(pos1, pos2, factor);
    } else {
      // Otherwise use spherical interpolation to follow the orbit arc
      const radius1 = pos1.length();
      const radius2 = pos2.length();
      
      // Interpolate the radius
      const radius = radius1 * (1 - factor) + radius2 * factor;
      
      // Normalize both positions
      const dir1 = pos1.clone().normalize();
      const dir2 = pos2.clone().normalize();
      
      // Spherical interpolation between directions
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(dir1, dir2);
      
      // Scale the rotation by the interpolation factor
      const slerpQuaternion = new THREE.Quaternion();
      slerpQuaternion.slerp(quaternion, factor);
      
      // Apply the rotation to the first direction
      const interpolatedDirection = dir1.clone().applyQuaternion(slerpQuaternion);
      
      // Scale by the interpolated radius
      position.copy(interpolatedDirection.multiplyScalar(radius));
    }
  } else {
    // Fallback to linear interpolation if positions are invalid
    position.lerpVectors(pos1, pos2, factor);
  }
  
  // Update satellite position
  satellite.group.position.copy(position);
  
  // Store for orbit trail
  if (satellite.previousPositions.length === 0 || 
      position.distanceTo(satellite.previousPositions[satellite.previousPositions.length-1]) > 0.01) {
    
    // Add new position to the trail
    satellite.previousPositions.push(position.clone());
    
    // Keep trail length within the specified percentage of orbit
    if (satellite.previousPositions.length > satellite.totalTrailPoints) {
      satellite.previousPositions.shift();
    }
  }
  
  // Update object visibility based on position (hide when behind Earth)
  updateObjectVisibility(satellite, position);
  
  // Store the current trajectory indices for reference
  satellite.currentIndex = index1;
  satellite.interpolationFactor = factor;
  
  // Calculate and store altitude and velocity
  // Convert to km for altitude
  const positionLengthKm = position.length() / VISUALIZATION_SCALE;
  satellite.altitude = positionLengthKm - EARTH_RADIUS_KM;
  
  // Calculate instantaneous velocity (use trajectory velocity if available)
  const vel1 = trajectory[index1].velocity_kms || 0;
  const vel2 = trajectory[index2].velocity_kms || 0;
  satellite.velocity = vel1 * (1 - factor) + vel2 * factor;
  
  // Store the position for label positioning
  satellite.position = position.clone();
}

// Update the orbit trail visualization
function updateOrbitTrail(satellite) {
  if (!satellite.orbitTrail || !satellite.previousPositions || satellite.previousPositions.length < 2) return;
  
  const positions = satellite.orbitTrail.geometry.getAttribute('position');
  const colors = satellite.orbitTrail.geometry.getAttribute('color');
  const baseColor = new THREE.Color(satellite.color);
  
  // Only display trails if we have positions
  const numPoints = satellite.previousPositions.length;
  
  // Fill the position buffer with the trail positions
  for (let i = 0; i < numPoints; i++) {
    const pos = satellite.previousPositions[i];
    positions.setXYZ(i, pos.x, pos.y, pos.z);
    
    // Apply gradient to trail - fade out as we get closer to the end
    let alpha = 1.0;
    
    // Calculate fade - newer points are more visible
    alpha = i / numPoints; // Linear fade based on position in trail
    
    // Set color with alpha
    colors.setXYZ(
      i, 
      baseColor.r * alpha, 
      baseColor.g * alpha, 
      baseColor.b * alpha
    );
  }
  
  // If not enough points to fill buffer, set the rest invisible
  for (let i = numPoints; i < TRAIL_LENGTH; i++) {
    positions.setXYZ(i, 0, 0, 0);
    colors.setXYZ(i, 0, 0, 0); // Invisible
  }
  
  // Flag attributes for update
  positions.needsUpdate = true;
  colors.needsUpdate = true;
  
  // Update how many points to actually render
  satellite.orbitTrail.geometry.setDrawRange(0, numPoints);
}

// Function to determine if a satellite is behind Earth from camera view
function updateObjectVisibility(satellite, position) {
  const camera = getCamera();
  if (!camera) return;
  
  // Vector from Earth center to satellite
  const earthToSat = position.clone();
  const earthToSatDistance = earthToSat.length();
  
  // Vector from Earth center to camera
  const earthToCam = camera.position.clone();
  const earthToCamDistance = earthToCam.length();
  
  // Direction vectors (normalized)
  const earthToSatDir = earthToSat.clone().normalize();
  const earthToCamDir = earthToCam.clone().normalize();
  
  // Calculate dot product between the two direction vectors
  const dotProduct = earthToSatDir.dot(earthToCamDir);
  
  // Calculate if satellite is on far side of Earth from camera
  const isBehind = dotProduct < 0;
  
  // Calculate the projection of satellite position onto the camera-Earth line
  const projectionLength = dotProduct * earthToSatDistance;
  
  // Calculate closest approach of the satellite to the Earth-camera line
  const closestApproachSq = earthToSatDistance * earthToSatDistance - projectionLength * projectionLength;
  
  // If projection is negative (satellite behind Earth from camera) AND
  // the closest approach is less than Earth radius, satellite is occluded
  const isOccluded = isBehind && closestApproachSq < EARTH_DISPLAY_RADIUS * EARTH_DISPLAY_RADIUS;
  
  // Apply visibility to all satellite components
  satellite.group.visible = !isOccluded;
}
