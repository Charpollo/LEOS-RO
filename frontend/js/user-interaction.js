/**
 * LEOS First Orbit - User Interaction Module
 * Handles all user input and interaction with 3D elements
 */
import { getScene, getCamera, getRenderer, getControls } from './scene.js';
import { getSatellites, setSelectedSatellite, toggleFollowSatellite } from './satellites.js';
import { showSatelliteInfo, clearSatelliteInfo, showFollowingMessage, hideFollowingMessage } from './ui.js';
import { logMessage, logError } from './utils.js';
import { getDeviceInfo } from './responsive.js';
import { CAMERA_INITIAL_DISTANCE, EARTH_DISPLAY_RADIUS } from './config.js';

// Raycaster for object selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Touch tracking variables
let touchStartTime = 0;
let lastTapTime = 0;
let touchStartPosition = { x: 0, y: 0 };
const DOUBLE_TAP_DELAY = 300; // ms
const LONG_PRESS_DELAY = 500; // ms
let longPressTimer = null;
let touchMoved = false;
const TOUCH_MOVE_THRESHOLD = 10; // px

// Event listeners setup
export function setupEventListeners() {
  const renderer = getRenderer();
  if (!renderer) {
    logError('Cannot setup event listeners: Renderer not initialized');
    return;
  }
  
  const container = renderer.domElement;
  const deviceInfo = getDeviceInfo();
  
  // Mouse events for desktop
  if (deviceInfo.type === 'desktop') {
    container.addEventListener('click', onMouseClick, false);
    container.addEventListener('dblclick', onDoubleClick, false);
    container.addEventListener('mousemove', onMouseMove, false);
  }
  
  // Touch events for mobile/tablet
  if (deviceInfo.type === 'mobile' || deviceInfo.type === 'tablet') {
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
  } else {
    // For desktop, add touch as fallback for touch-enabled laptops
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
  }
  
  // Keyboard events - relevant for all devices that might have keyboards
  document.addEventListener('keydown', onKeyDown, false);
  
  // Handle window resize is now handled by responsive.js
  
  logMessage(`Event listeners initialized for ${deviceInfo.type} device`);
}

// Window resize handler (backup - primary handling is in responsive.js)
function onWindowResize() {
  const camera = getCamera();
  const renderer = getRenderer();
  
  if (!camera || !renderer) return;
  
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  logMessage('Window resized, viewport adjusted (from user-interaction)');
}

// Mouse click handler
function onMouseClick(event) {
  event.preventDefault();
  
  // Update mouse coordinates for raycaster
  updateMouseCoordinates(event);
  
  // Check for clicked objects
  const intersectedObject = getIntersectedObject();
  
  if (intersectedObject) {
    const satellite = getSatelliteFromObject(intersectedObject);
    
    if (satellite) {
      // Set as selected satellite
      setSelectedSatellite(satellite);
      
      // Show satellite info in UI
      showSatelliteInfo(satellite);
      
      // Position camera to follow satellite with Earth in background
      positionCameraForSatelliteView(satellite);
      
      // Show following message
      showFollowingMessage(satellite.name);
      
      logMessage(`Following satellite: ${satellite.name}`);
    } else {
      // Clicked on something else, clear selection and exit satellite view
      // but keep the camera position (ESC-like behavior)
      setSelectedSatellite(null);
      clearSatelliteInfo();
      hideFollowingMessage();
      exitSatelliteView(false); // false = don't reset position
    }
  } else {
    // Clicked on empty space, clear selection and exit satellite view
    // but keep the camera position (ESC-like behavior)
    setSelectedSatellite(null);
    clearSatelliteInfo();
    hideFollowingMessage();
    exitSatelliteView(false); // false = don't reset position
  }
}

// Position camera to look at satellite with Earth in background
function positionCameraForSatelliteView(satellite) {
  const camera = getCamera();
  const controls = getControls();
  
  if (!camera || !controls || !satellite) return;
  
  // Get satellite position
  const satPosition = satellite.group.position.clone();
  
  // Calculate direction from Earth center to satellite (normalized)
  const dirFromEarth = satPosition.clone().normalize();
  
  // Position camera on the opposite side of the satellite from Earth
  // This will make the camera look down at the satellite with Earth in the background
  const offsetDistance = satPosition.length() * 0.4; // Distance from satellite (reduced for better view)
  
  // Use a slightly different angle to ensure Earth is visible in background
  // By adding a slight "up" component, we ensure we're not directly on the Earth-satellite line
  const upVector = new THREE.Vector3(0, 1, 0);
  
  // Create a vector that's partially towards the up direction to ensure Earth is visible
  const viewAngle = new THREE.Vector3()
    .copy(dirFromEarth)
    .multiplyScalar(0.85) // Reduce direct-away component
    .add(upVector.clone().multiplyScalar(0.2)); // Add upward component
    
  // Normalize the combined vector
  viewAngle.normalize();
  
  // Calculate camera position by going further out along this adjusted angle
  const cameraPos = satPosition.clone().add(
    viewAngle.clone().multiplyScalar(offsetDistance)
  );
  
  // Set camera position smoothly
  gsapCameraTransition(camera.position, cameraPos, controls, satPosition);
  
  // Clear any existing satellite view interval to prevent multiple intervals
  if (window.satelliteViewUpdateInterval) {
    clearInterval(window.satelliteViewUpdateInterval);
    window.satelliteViewUpdateInterval = null;
  }
  
  // Important: Enable controls but modify them for satellite view
  setTimeout(() => {
    // Enable controls so user can rotate around the satellite
    controls.enabled = true;
    
    // Set the target to the satellite position
    controls.target.copy(satPosition);
    
    // Constrain rotation to keep Earth in view
    // We don't completely restrict but make it slower to go out of "Earth view"
    const originalDampingFactor = controls.dampingFactor;
    controls.dampingFactor = 0.25; // Higher damping for smoother rotation
    
    // Set minimum distance to allow zooming much closer to the satellite
    const originalMinDistance = controls.minDistance;
    controls.minDistance = 0.05; // Allow very close zoom for detailed inspection
    
    // Set maximum distance to prevent getting too far from satellite
    const originalMaxDistance = controls.maxDistance;
    controls.maxDistance = offsetDistance * 3;
    
    // Store original values to be restored when exiting satellite view
    controls.userData = {
      originalDampingFactor,
      originalMinDistance,
      originalMaxDistance,
      inSatelliteView: true,
      followingSatellite: satellite // Store reference to the satellite we're following
    };
    
    // Set an animation loop that updates the target position
    // This ensures the camera stays focused on the moving satellite
    // Use requestAnimationFrame for smoother updates than setInterval
    function updateSatelliteView() {
      const controls = getControls();
      if (controls && controls.userData && controls.userData.followingSatellite) {
        // Update target to current satellite position
        const sat = controls.userData.followingSatellite;
        controls.target.copy(sat.group.position);
        
        // Request next frame
        window.satelliteViewUpdateInterval = requestAnimationFrame(updateSatelliteView);
      }
    }
    
    // Start the animation frame loop
    window.satelliteViewUpdateInterval = requestAnimationFrame(updateSatelliteView);
  }, 1100); // Slight delay to let the camera transition complete
}

// Helper function for smooth camera transition using GSAP-like approach
function gsapCameraTransition(startPos, endPos, controls, lookAtTarget) {
  // Duration in milliseconds
  const duration = 1000;
  const startTime = Date.now();
  
  // Starting positions
  const startX = startPos.x;
  const startY = startPos.y;
  const startZ = startPos.z;
  
  // Target positions
  const endX = endPos.x;
  const endY = endPos.y;
  const endZ = endPos.z;
  
  // Starting control target
  const startTargetX = controls.target.x;
  const startTargetY = controls.target.y;
  const startTargetZ = controls.target.z;
  
  // Save controls state
  const wasControlsEnabled = controls.enabled;
  controls.enabled = false;
  
  // Animation function
  function animateCamera() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease function (ease-out-cubic)
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // Update camera position
    startPos.x = startX + (endX - startX) * easeProgress;
    startPos.y = startY + (endY - startY) * easeProgress;
    startPos.z = startZ + (endZ - startZ) * easeProgress;
    
    // Update controls target
    controls.target.x = startTargetX + (lookAtTarget.x - startTargetX) * easeProgress;
    controls.target.y = startTargetY + (lookAtTarget.y - startTargetY) * easeProgress;
    controls.target.z = startTargetZ + (lookAtTarget.z - startTargetZ) * easeProgress;
    
    // Continue if not complete
    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      // Re-enable controls when animation completes
      controls.enabled = wasControlsEnabled;
    }
  }
  
  // Start animation
  animateCamera();
}

// Reset camera controls and re-enable orbit controls
function resetCameraControls() {
  const controls = getControls();
  if (!controls) return;
  
  controls.enabled = true;
}

// Reset camera to default view (for double-click on empty space or Earth)
export function resetCameraToDefaultView() {
  const camera = getCamera();
  const controls = getControls();
  
  if (!camera || !controls) return;
  
  // First, exit follow mode if active
  import('./satellites.js').then(satellitesModule => {
    satellitesModule.setFollowMode(false);
  });
  
  // Restore original control properties if we were in satellite view
  if (controls.userData && controls.userData.inSatelliteView) {
    controls.dampingFactor = controls.userData.originalDampingFactor || 0.1;
    controls.minDistance = controls.userData.originalMinDistance || 0.01;
    controls.maxDistance = controls.userData.originalMaxDistance || 100;
    controls.userData.inSatelliteView = false;
  }
  
  // Force a safe camera position outside of Earth
  const minSafeDistance = EARTH_DISPLAY_RADIUS * 2.5; // Increased for safety
  
  // Define default view position - keep camera outside Earth
  // Use an angle that shows Earth nicely with satellites visible
  const defaultPosition = new THREE.Vector3(
    CAMERA_INITIAL_DISTANCE * 0.5,  // Increase x component 
    CAMERA_INITIAL_DISTANCE * 0.8,  // Higher up for better view
    CAMERA_INITIAL_DISTANCE * 0.7   // Further back
  );
  
  // Always ensure we're a safe distance from Earth center
  const distanceFromOrigin = defaultPosition.length();
  if (distanceFromOrigin < minSafeDistance) {
    // Scale the position to ensure we're well outside Earth
    const scaleFactor = minSafeDistance / distanceFromOrigin;
    defaultPosition.multiplyScalar(scaleFactor);
  }
  
  // Force the default position without transitions if camera is inside Earth
  const currentDist = camera.position.length();
  if (currentDist < EARTH_DISPLAY_RADIUS * 1.2) {
    camera.position.copy(defaultPosition);
    controls.target.set(0, 0, 0);
    logMessage('Camera was inside Earth, forced immediate reset');
  } else {
    // Use smooth transition for normal situations
    gsapCameraTransition(camera.position, defaultPosition, controls, new THREE.Vector3(0, 0, 0));
  }
  
  // Ensure controls are enabled
  controls.enabled = true;
  
  logMessage('Camera reset to default view');
}

// Double-click handler with improved Earth detection and view reset
function onDoubleClick(event) {
  event.preventDefault();
  
  // Update mouse coordinates for raycaster
  updateMouseCoordinates(event);
  
  // Check for double-clicked objects
  const intersectedObject = getIntersectedObject();
  
  if (intersectedObject) {
    const satellite = getSatelliteFromObject(intersectedObject);
    
    if (satellite) {
      // For double-click, use satellite view instead of follow mode
      // This allows for more controlled rotation around the satellite
      setSelectedSatellite(satellite);
      
      // Show satellite info in UI
      showSatelliteInfo(satellite);
      
      // Position camera to look at satellite with Earth in background
      positionCameraForSatelliteView(satellite);
      
      logMessage(`Selected satellite view: ${satellite.name}`);
    } else {
      // Double-clicked on Earth or other object, reset view
      resetCameraToDefaultView();
    }
  } else {
    // Double-clicked on empty space, reset view
    resetCameraToDefaultView();
  }
}

// Handle a double tap (equivalent to double click)
function handleDoubleTap(event) {
  // Check for tapped objects
  const intersectedObject = getIntersectedObject();
  
  if (intersectedObject) {
    const satellite = getSatelliteFromObject(intersectedObject);
    
    if (satellite) {
      // Toggle follow mode for this satellite
      const isFollowing = toggleFollowSatellite(satellite);
      
      // Update UI to show following status
      if (isFollowing) {
        showFollowingMessage(satellite.name);
      } else {
        hideFollowingMessage();
      }
      
      logMessage(`${isFollowing ? 'Now following' : 'Stopped following'} satellite: ${satellite.name} (double tap)`);
    } else {
      // Double-tapped on Earth or empty space, reset view
      resetCameraToDefaultView();
    }
  } else {
    // Double-tapped on empty space, reset view
    resetCameraToDefaultView();
  }
}

// Mouse move handler for hover effects
function onMouseMove(event) {
  // Update mouse coordinates for raycaster
  updateMouseCoordinates(event);
  
  // Optional: Add hover effects for satellites
  // This could include highlighting the satellite under the cursor
  // or showing a tooltip with the satellite name
}

// Touch start handler
function onTouchStart(event) {
  // Prevent default to avoid both touch and mouse events
  event.preventDefault();
  
  // Record start time for detecting long presses
  touchStartTime = Date.now();
  
  // Record start position to detect movement
  if (event.touches.length === 1) {
    touchStartPosition.x = event.touches[0].clientX;
    touchStartPosition.y = event.touches[0].clientY;
    touchMoved = false;
    
    // Set up long press timer
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      // Only trigger if touch hasn't moved significantly
      if (!touchMoved) {
        handleLongPress(event);
      }
    }, LONG_PRESS_DELAY);
  }
}

// Touch move handler
function onTouchMove(event) {
  // Prevent default to avoid scrolling while interacting with the 3D scene
  event.preventDefault();
  
  // Detect if touch has moved more than threshold
  if (event.touches.length === 1) {
    const dx = event.touches[0].clientX - touchStartPosition.x;
    const dy = event.touches[0].clientY - touchStartPosition.y;
    
    // If moved more than threshold, mark as moved
    if (Math.sqrt(dx * dx + dy * dy) > TOUCH_MOVE_THRESHOLD) {
      touchMoved = true;
      
      // Clear long press timer if touch moved
      clearTimeout(longPressTimer);
    }
  }
}

// Touch end handler
function onTouchEnd(event) {
  // Prevent default to avoid both touch and mouse events
  event.preventDefault();
  
  // Clear long press timer
  clearTimeout(longPressTimer);
  
  // Get current time for double tap detection
  const currentTime = Date.now();
  
  // Handle taps only if the touch hasn't moved significantly
  if (!touchMoved) {
    // Simulate coordinates based on the last touch position
    if (event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      
      // Use touch position to update raycaster
      updateTouchCoordinates(touch);
      
      // Check if this is a double tap
      if (currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
        handleDoubleTap(event);
      } else {
        // Single tap
        handleTap(event);
      }
      
      // Update last tap time
      lastTapTime = currentTime;
    }
  }
}

// Handle a single tap (equivalent to click)
function handleTap(event) {
  // Check for tapped objects
  const intersectedObject = getIntersectedObject();
  
  if (intersectedObject) {
    const satellite = getSatelliteFromObject(intersectedObject);
    
    if (satellite) {
      // Set as selected satellite
      setSelectedSatellite(satellite);
      
      // Show satellite info in UI
      showSatelliteInfo(satellite);
      
      // Position camera to look at satellite with Earth in background
      positionCameraForSatelliteView(satellite);
      
      logMessage(`Selected satellite: ${satellite.name} (tap)`);
    } else {
      // Tapped on something else, clear selection
      setSelectedSatellite(null);
      clearSatelliteInfo();
      resetCameraControls();
    }
  } else {
    // Tapped on empty space, clear selection
    setSelectedSatellite(null);
    clearSatelliteInfo();
    resetCameraControls();
  }
}

// Handle a long press (additional functionality for touch devices)
function handleLongPress(event) {
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    updateTouchCoordinates(touch);
    
    // Check for pressed objects
    const intersectedObject = getIntersectedObject();
    
    if (intersectedObject) {
      const satellite = getSatelliteFromObject(intersectedObject);
      
      if (satellite) {
        // For long press, toggle follow mode (similar to double tap)
        const isFollowing = toggleFollowSatellite(satellite);
        
        // Update UI to show following status
        if (isFollowing) {
          showFollowingMessage(satellite.name);
        } else {
          hideFollowingMessage();
        }
        
        // Provide haptic feedback if available (iOS only)
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
        
        logMessage(`${isFollowing ? 'Now following' : 'Stopped following'} satellite: ${satellite.name} (long press)`);
      } else {
        // Long press on Earth or empty space, reset view
        resetCameraToDefaultView();
      }
    } else {
      // Long press on empty space, reset view
      resetCameraToDefaultView();
    }
  }
}

// Keyboard event handler
function onKeyDown(event) {
  // ESC key to exit satellite view but maintain camera position
  if (event.key === 'Escape') {
    exitSatelliteView(false); // false = don't reset position
    setSelectedSatellite(null);
    clearSatelliteInfo();
    hideFollowingMessage();
    logMessage('Exited satellite view (ESC key)');
  }
  
  // 'R' key resets camera to default view
  if (event.key === 'r' || event.key === 'R') {
    exitSatelliteView(true); // true = reset position
    setSelectedSatellite(null);
    clearSatelliteInfo();
    hideFollowingMessage();
    logMessage('Reset camera to default view (R key)');
  }
}

// Exit satellite view with option to reset or maintain camera position
function exitSatelliteView(resetPosition = true) {
  const camera = getCamera();
  const controls = getControls();
  
  if (!camera || !controls) return;
  
  // Cancel any existing satellite view update loop
  if (window.satelliteViewUpdateInterval) {
    cancelAnimationFrame(window.satelliteViewUpdateInterval);
    window.satelliteViewUpdateInterval = null;
  }
  
  // Exit follow mode
  import('./satellites.js').then(satellitesModule => {
    satellitesModule.setFollowMode(false);
  });
  
  // Restore original control properties if we were in satellite view
  if (controls.userData && controls.userData.inSatelliteView) {
    controls.dampingFactor = controls.userData.originalDampingFactor || 0.1;
    controls.minDistance = controls.userData.originalMinDistance || 0.01;
    controls.maxDistance = controls.userData.originalMaxDistance || 100;
    controls.userData.followingSatellite = null;
    controls.userData.inSatelliteView = false;
    
    // If we're resetting position (R key), go back to initial view
    if (resetPosition) {
      resetCameraToDefaultView();
    } else {
      // Otherwise (ESC key or click elsewhere), just reset target to Earth center
      // but maintain current camera position
      controls.target.set(0, 0, 0);
    }
  }
  
  // Always ensure controls are enabled
  controls.enabled = true;
}

// Helper function to update mouse coordinates for raycaster
function updateMouseCoordinates(event) {
  const renderer = getRenderer();
  if (!renderer) return;
  
  const rect = renderer.domElement.getBoundingClientRect();
  
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// Helper function to update touch coordinates for raycaster
function updateTouchCoordinates(touch) {
  const renderer = getRenderer();
  if (!renderer) return;
  
  const rect = renderer.domElement.getBoundingClientRect();
  
  // Calculate touch position in normalized device coordinates (-1 to +1)
  mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1; // Fixed: was using clientX instead of clientY
}

// Helper function to get intersected object from raycaster
function getIntersectedObject() {
  const scene = getScene();
  const camera = getCamera();
  
  if (!scene || !camera) return null;
  
  // Update the raycaster
  raycaster.setFromCamera(mouse, camera);
  
  // Get all satellites
  const satellites = getSatellites();
  
  // Create a list of all objects that can be clicked
  const clickableObjects = [];
  
  // Add satellite models and indicators to the list
  for (const satellite of satellites) {
    if (satellite.model) clickableObjects.push(satellite.model);
    if (satellite.indicator) clickableObjects.push(satellite.indicator);
    if (satellite.devMarker) clickableObjects.push(satellite.devMarker);
  }
  
  // Add Earth to clickable objects for reset view on double-click
  const earth = scene.getObjectByName("Earth");
  if (earth) clickableObjects.push(earth);
  
  // Calculate objects intersecting the raycaster
  const intersects = raycaster.intersectObjects(clickableObjects, true);
  
  if (intersects.length > 0) {
    return intersects[0].object;
  }
  
  return null;
}

// Helper function to get satellite from intersected object
function getSatelliteFromObject(object) {
  const satellites = getSatellites();
  
  // Find which satellite this object belongs to
  for (const satellite of satellites) {
    // Check if the object is the satellite model or a child of it
    if (satellite.model === object || (satellite.model && satellite.model.getObjectById(object.id))) {
      return satellite;
    }
    
    // Check if the object is the satellite indicator or a child of it
    if (satellite.indicator === object || (satellite.indicator && satellite.indicator.getObjectById(object.id))) {
      return satellite;
    }
    
    // Check if the object is the satellite dev marker or a child of it
    if (satellite.devMarker === object || (satellite.devMarker && satellite.devMarker.getObjectById(object.id))) {
      return satellite;
    }
  }
  
  return null;
}
