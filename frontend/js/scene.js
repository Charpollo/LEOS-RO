/**
 * LEOS First Orbit - Scene Module
 * Handles 3D scene initialization and management
 */

import { 
  CAMERA_INITIAL_DISTANCE, 
  MIN_CAMERA_DISTANCE, 
  MAX_CAMERA_DISTANCE,
  DEBUG_MODE,
  EARTH_DISPLAY_RADIUS
} from './config.js';

import { getWidth, getHeight, getAspect, logMessage } from './utils.js';

// Globals
let scene, earthCamera, moonCamera, satelliteCamera, camera, renderer, controls;
let activeCamera = 'earth';
let starField;
let raycaster, mouse;
let initialDistance = CAMERA_INITIAL_DISTANCE * 1.5;

// Star texture path - updated to use your actual asset
const starTexturePath = "assets/stars.jpg";

// Export scene objects for other modules
export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function getRenderer() {
  return renderer;
}

export function getControls() {
  return controls;
}

export function setActiveCamera(cameraType, newCamera) {
  activeCamera = cameraType;
  camera = newCamera;
  controls.object = camera;
}

// Initialize the 3D scene
export function initScene() {
  logMessage("Initializing scene...");
  
  // Create main scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  // Create dedicated cameras for different views - pull back to see satellites better
  earthCamera = new THREE.PerspectiveCamera(55, getAspect(), 0.1, 10000000);
  
  // Position camera to see both Earth and the satellites in orbit
  earthCamera.position.set(
    CAMERA_INITIAL_DISTANCE * 0.2, 
    CAMERA_INITIAL_DISTANCE * 0.6, 
    CAMERA_INITIAL_DISTANCE * 0.8
  );
  earthCamera.lookAt(0, 0, 0);
  
  moonCamera = new THREE.PerspectiveCamera(45, getAspect(), 0.1, 10000000);
  
  satelliteCamera = new THREE.PerspectiveCamera(60, getAspect(), 0.1, 10000000);
  
  // Set the default active camera
  camera = earthCamera;
  activeCamera = 'earth';
  
  // Store initial distance for maximum zoom enforcement
  initialDistance = MAX_CAMERA_DISTANCE;
  
  // Improved renderer configuration
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: false,
    logarithmicDepthBuffer: true
  });
  
  renderer.setSize(getWidth(), getHeight());
  renderer.setClearColor(0x000000, 1);
  renderer.sortObjects = true;
  renderer.autoClear = false;
  
  // Add renderer to container
  const container = document.getElementById("threeContainer");
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  
  // Log container dimensions
  logMessage(`Container size: ${container.clientWidth}x${container.clientHeight}`);
  
  // Set up improved adaptive orbit controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.rotateSpeed = 0.8;
  
  // Add adaptive zoom speed based on distance
  controls.zoomSpeed = 1.2;
  
  controls.minDistance = 0.01;
  controls.maxDistance = MAX_CAMERA_DISTANCE;
  
  // Add lighting
  addLights();
  
  // Create starfield
  createStarField();
  
  // Handle window resizing
  window.addEventListener('resize', handleResize);
  
  // Log success
  logMessage("Scene initialized");
  
  return {
    scene,
    camera,
    renderer,
    controls,
    earthCamera,
    moonCamera,
    satelliteCamera
  };
}

// Add lights to the scene
function addLights() {
  // Main directional light (sun)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(1000, 500, 1000);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 10000;
  scene.add(sunLight);
  
  // Ambient light for soft global illumination
  const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
  scene.add(ambientLight);
  
  // Hemisphere light for atmospheric effect
  const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.6);
  scene.add(hemiLight);
  
  logMessage("Lighting added to the scene");
}

// Create the starfield background
function createStarField() {
  // Load the stars texture
  const starsTexture = new THREE.TextureLoader().load(
    starTexturePath,
    (texture) => {
      logMessage("Starfield texture loaded successfully");
    },
    undefined,
    (error) => {
      logMessage(`Error loading starfield texture: ${error.message}`);
    }
  );
  
  // Create a large sphere for the starfield
  const starGeometry = new THREE.SphereGeometry(MAX_CAMERA_DISTANCE * 0.95, 64, 64);
  
  // Create material with stars texture
  const starMaterial = new THREE.MeshBasicMaterial({
    map: starsTexture,
    side: THREE.BackSide,
    transparent: false,
    fog: false,
    depthWrite: false,
    depthTest: true
  });
  
  // Create and add the starfield
  starField = new THREE.Mesh(starGeometry, starMaterial);
  starField.renderOrder = -1000;
  scene.add(starField);
  
  return starField;
}

// Handle window resize
function handleResize() {
  if (!renderer || !camera) return;
  
  // Update renderer size
  renderer.setSize(getWidth(), getHeight());
  
  // Update all cameras' aspect ratios
  earthCamera.aspect = getAspect();
  earthCamera.updateProjectionMatrix();
  
  moonCamera.aspect = getAspect();
  moonCamera.updateProjectionMatrix();
  
  satelliteCamera.aspect = getAspect();
  satelliteCamera.updateProjectionMatrix();
  
  // Log resize event in debug mode
  if (DEBUG_MODE) {
    logMessage(`Window resized: ${getWidth()}x${getHeight()}`);
  }
}

// Canvas click handler - for object selection
function onCanvasClick(event) {
  // Implemented in user-interaction.js
  // This is just a placeholder to register the event
}

// Prevent camera from going through Earth with improved handling
function preventEarthCollision() {
  // Skip this check if we're in satellite view
  if (controls.userData && controls.userData.inSatelliteView) {
    return; // Don't override camera settings in satellite view
  }
  
  // Get current distance from camera to Earth center
  const distanceToCenter = camera.position.length();
  
  // Define minimum safe distance from Earth's surface with some margin
  const minSafeDistance = EARTH_DISPLAY_RADIUS * 1.2; // 20% margin
  
  // If camera is too close to Earth, move it outward
  if (distanceToCenter < minSafeDistance) {
    // Calculate direction from Earth center to camera (normalized)
    const direction = camera.position.clone().normalize();
    
    // Move camera outward along this direction to minimum safe distance
    const newPosition = direction.multiplyScalar(minSafeDistance);
    
    // Use smooth transition for better user experience
    camera.position.lerp(newPosition, 0.3); // 30% step for smooth movement
    
    // Ensure controls knows the camera has moved
    controls.update();
  }
  
  // REMOVED: The maximum distance constraint that was causing the camera to snap back
  // This allows users to freely move around after zooming in without being pulled back
}

// Update starfield position to follow camera
export function updateStarField() {
  if (starField && camera) {
    starField.position.copy(camera.position);
  }
}

// Check and log rendering status
export function checkRenderingStatus() {
  const container = document.getElementById("threeContainer");
  console.log({
    containerSize: `${container.clientWidth}x${container.clientHeight}`,
    rendererSize: `${renderer.domElement.width}x${renderer.domElement.height}`,
    cameraPosition: camera.position,
    cameraAspect: camera.aspect,
    activeCamera: activeCamera
  });
}

// Toggle camera controls
export function toggleCameraControls(enable) {
  const controls = getControls();
  if (controls) {
    controls.enabled = enable;
  }
}

// Add this export for the updateControlSensitivity function
export function updateControlSensitivity() {
  if (!controls || !camera) return;
  
  // Skip sensitivity adjustments if we're in satellite view mode
  if (controls.userData && controls.userData.inSatelliteView) {
    return; // Don't override camera settings in satellite view
  }
  
  // Get current distance from camera to target
  const distanceToTarget = camera.position.distanceTo(controls.target);
  
  // Calculate normalized distance factor (0-1)
  const range = controls.maxDistance - controls.minDistance;
  const normalizedDistance = (distanceToTarget - controls.minDistance) / range;
  
  // Clamp normalized distance between 0.1 and 1 to avoid extreme sensitivity
  const clampedDistance = Math.max(0.1, Math.min(1, normalizedDistance));
  
  // When zoomed in (closer), we want more precise/slower controls
  // When zoomed out (farther), we want faster controls
  
  // For rotation: slower when zoomed in, faster when zoomed out
  controls.rotateSpeed = 0.5 + (clampedDistance * 0.5);
  
  // We invert the relationship for zoom speed
  controls.zoomSpeed = 0.8 + ((1 - clampedDistance) * 0.6);
  
  // For pan: slower when zoomed in (for precision), faster when zoomed out
  controls.panSpeed = 0.5 + (clampedDistance * 0.8);
  
  // If extremely zoomed in, increase damping for smoother movement
  if (normalizedDistance < 0.2) {
    controls.dampingFactor = 0.22;  // Higher damping when zoomed in
  } else {
    controls.dampingFactor = 0.15;  // Normal damping when zoomed out
  }
}

// Make debugging functions available globally
if (DEBUG_MODE) {
  window.checkRenderingStatus = checkRenderingStatus;
}
