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
    // Removed double-click handler as requested
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
  console.log('📸 Improved satellite camera tracking active');
  const camera = getCamera();
  const controls = getControls();
  
  if (!camera || !controls || !satellite) return;
  
  // Get satellite position
  const satPosition = satellite.group.position.clone();
  
  // Calculate direction from Earth center to satellite (normalized)
  const dirFromEarth = satPosition.clone().normalize();
  
  // Position camera on the opposite side of the satellite from Earth
  const offsetDistance = satPosition.length() * 0.4; // Distance from satellite
  
  // Use a slightly different angle to ensure Earth is visible in background
  const upVector = new THREE.Vector3(0, 1, 0);
  
  // Create a vector that's partially towards the up direction to ensure Earth is visible
  const viewAngle = new THREE.Vector3()
    .copy(dirFromEarth)
    .multiplyScalar(0.85) // Reduce direct-away component
    .add(upVector.clone().multiplyScalar(0.2)); // Add upward component
  
  // Normalize the combined vector
  viewAngle.normalize();
  
  // Calculate camera position 
  const cameraPos = satPosition.clone().add(
    viewAngle.clone().multiplyScalar(offsetDistance)
  );
  
  // Save original camera control values
  controls.userData = {
    ...controls.userData,
    originalDampingFactor: controls.dampingFactor,
    originalMinDistance: controls.minDistance,
    originalMaxDistance: controls.maxDistance,
    originalMinZoom: controls.minZoom || 0.001,
    originalMaxZoom: controls.maxZoom || 10,
    inSatelliteView: true,
    followingSatellite: satellite,
    initialSatDistance: offsetDistance,
    userHasManuallyRotated: false,
    lastCameraPosition: camera.position.clone(),
    lastSatPosition: satPosition.clone()
  };
  
  // Clear any existing update interval
  if (window.satelliteViewUpdateInterval) {
    cancelAnimationFrame(window.satelliteViewUpdateInterval);
    window.satelliteViewUpdateInterval = null;
  }
  
  // Set camera position smoothly
  gsapCameraTransition(camera.position, cameraPos, controls, satPosition);
  
  // Set up the camera controls for better satellite viewing
  setTimeout(() => {
    // Re-enable controls after transition
    controls.enabled = true;
    
    // Set the target to the satellite position
    controls.target.copy(satPosition);
    
    // Adjusted control settings for much closer inspection
    controls.dampingFactor = 0.1; // Reduced for smoother movement
    controls.minDistance = offsetDistance * 0.01; // Allow extremely close zoom
    controls.maxDistance = offsetDistance * 2; // Limit max zoom out to keep focus on satellite
    controls.minZoom = 0.01; // Allow very close zoom
    controls.maxZoom = 10; // Increased max zoom
    
    // Set up satellite position tracking that maintains user view preferences
    function updateSatelliteView() {
      const controls = getControls();
      const camera = getCamera();
      
      if (controls && camera && controls.userData?.followingSatellite) {
        const sat = controls.userData.followingSatellite;
        const satPos = sat.group.position.clone();
        const lastSatPos = controls.userData.lastSatPosition;
        
        // Calculate the camera's relative position to the satellite
        const relativePos = camera.position.clone().sub(controls.target);
        const currentDistance = relativePos.length();
        
        // Update target to new satellite position
        controls.target.copy(satPos);
        
        // Calculate new camera position that maintains exact relative position to satellite
        const newCameraPos = satPos.clone().add(relativePos);
        
        // Update camera position immediately to stay with satellite
        camera.position.copy(newCameraPos);
        
        // Store new positions
        controls.userData.lastSatPosition = satPos.clone();
        controls.userData.lastCameraPosition = camera.position.clone();
        
        // Continue the update loop
        window.satelliteViewUpdateInterval = requestAnimationFrame(updateSatelliteView);
      }
    }
    
    // Track manual rotation
    const originalOnStart = controls.onStart || function() {};
    controls.onStart = function() {
      controls.userData.userHasManuallyRotated = true;
      originalOnStart.call(this);
    };
    
    // Start the tracking
    updateSatelliteView();
    
    // Force controls update
    controls.update();
    
    // Show instructions after camera is set up
    import('./ui.js').then(ui => {
      ui.showSatelliteViewInstructions();
    });
  }, 100);
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
  
  // Cancel any existing satellite view update loop
  if (window.satelliteViewUpdateInterval) {
    cancelAnimationFrame(window.satelliteViewUpdateInterval);
    window.satelliteViewUpdateInterval = null;
  }
  
  // Restore original control properties if we were in satellite view
  if (controls.userData && controls.userData.inSatelliteView) {
    controls.dampingFactor = controls.userData.originalDampingFactor || 0.1;
    controls.minDistance = controls.userData.originalMinDistance || 0.01;
    controls.maxDistance = controls.userData.originalMaxDistance || 100;
    
    // Important: Make sure zoom constraints are reset too
    controls.minZoom = controls.userData.originalMinZoom || 0.01;
    controls.maxZoom = controls.userData.originalMaxZoom || 10;
    
    // Reset follow satellite flag
    controls.userData.followingSatellite = null;
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
  
  // Reset target to Earth center
  controls.target.set(0, 0, 0);
  
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
  
  // Force update of controls to apply all changes immediately
  controls.update();
  
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
    // Direct recovery - no complex logic
    forceEarthViewRecovery(false);
    setSelectedSatellite(null);
    clearSatelliteInfo();
    hideFollowingMessage();
    logMessage('Exited satellite view (ESC key)');
  }
  
  // 'R' key resets camera to default view
  if (event.key === 'r' || event.key === 'R') {
    // Direct recovery with reset
    forceEarthViewRecovery(true);
    setSelectedSatellite(null);
    clearSatelliteInfo();
    hideFollowingMessage();
    logMessage('Reset camera to default view (R key)');
  }
}

// Ultra-reliable camera recovery function that will always work
export function forceEarthViewRecovery(resetPosition = true) {
  console.log('🛟 Complete camera recovery overhaul activated');
  const camera = getCamera();
  const controls = getControls();
  const renderer = getRenderer();
  
  if (!camera || !controls) return;
  
  // Store the current camera distance from Earth center before making changes
  const originalCameraDistance = camera.position.length();
  
  // STEP 1: Kill any existing update loops
  if (window.satelliteViewUpdateInterval) {
    cancelAnimationFrame(window.satelliteViewUpdateInterval);
    window.satelliteViewUpdateInterval = null;
  }
  
  // STEP 2: Force exit follow mode
  import('./satellites.js').then(satellitesModule => {
    satellitesModule.setFollowMode(false);
  });
  
  // STEP 3: Store original camera position before we make changes
  const originalPosition = camera.position.clone();
  const originalDirection = originalPosition.clone().normalize();
  
  try {
    // First disable existing controls to prevent events during transition
    controls.enabled = false;
    
    // Force Earth center as target
    controls.target.set(0, 0, 0);
    
    // Define extremely safe camera position
    const extremelySafePosition = new THREE.Vector3(
      CAMERA_INITIAL_DISTANCE * 0.8,
      CAMERA_INITIAL_DISTANCE * 0.8,
      CAMERA_INITIAL_DISTANCE * 0.8
    );
    
    // STEP 5: Complete control parameters reset
    controls.minDistance = EARTH_DISPLAY_RADIUS * 1.5;  // Increased minimum safe distance
    controls.maxDistance = EARTH_DISPLAY_RADIUS * 25;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.8;
    
    // Store original zoom speed to restore later
    const originalZoomSpeed = controls.zoomSpeed;
    
    // CRITICAL FIX: Completely disable zoom for a brief period after reset
    controls.zoomSpeed = 0; // Disable zooming completely
    controls.enableZoom = false; // Belt and suspenders approach - both disable
    
    controls.panSpeed = 0.8;
    controls.minZoom = 0.01;
    controls.maxZoom = 10;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    
    // Clear all user data that might interfere
    controls.userData = {
      inSatelliteView: false,
      followingSatellite: null,
      userHasManuallyRotated: false,
      originalMinDistance: controls.minDistance,
      originalMaxDistance: controls.maxDistance,
      originalDampingFactor: controls.dampingFactor,
      originalMinZoom: controls.minZoom,
      originalMaxZoom: controls.maxZoom,
      originalZoomSpeed: originalZoomSpeed
    };
    
    // IMPROVEMENT: For both ESC and R, we'll try to preserve the user's preferred distance
    // Calculate a safe minimum distance
    const minSafeDistance = EARTH_DISPLAY_RADIUS * 2;
    
    // Check if the original camera distance is sensible (not inside Earth)
    // and use it if possible, otherwise use a default safe distance
    const targetDistance = (originalCameraDistance > minSafeDistance) ? 
      originalCameraDistance : minSafeDistance;
    
    if (resetPosition) {
      // For 'R' key - Use our predefined safe position but maintain distance if possible
      const newPosition = new THREE.Vector3(
        CAMERA_INITIAL_DISTANCE * 0.5,
        CAMERA_INITIAL_DISTANCE * 0.8,
        CAMERA_INITIAL_DISTANCE * 0.7
      ).normalize().multiplyScalar(targetDistance);
      
      camera.position.copy(newPosition);
      
      // Force update
      controls.update();
    } else {
      // For 'ESC' key - Try to maintain both direction AND distance
      // Calculate new position using original direction but safe distance
      const safePosition = originalDirection.clone().multiplyScalar(targetDistance);
      
      // Set camera position to this safe position
      camera.position.copy(safePosition);
      
      // Force update
      controls.update();
    }
    
    // SAFETY CHECK - if we're somehow still too close to Earth, force position
    if (camera.position.length() < EARTH_DISPLAY_RADIUS * 2) {
      console.log('⚠️ EMERGENCY OVERRIDE: Camera too close after recovery, forcing to safe position');
      camera.position.copy(extremelySafePosition);
      controls.update();
    }
    
    // Re-enable controls after everything is reset
    controls.enabled = true;
    
    // Force render to update the scene immediately
    if (renderer) renderer.render(getScene(), camera);
    
    // Final camera adjustments
    camera.updateProjectionMatrix();
    
    // Set a timer to restore zoom behavior after the user has had time to start rotating
    setTimeout(() => {
      console.log('🔍 Re-enabling zoom functionality');
      controls.zoomSpeed = originalZoomSpeed;
      controls.enableZoom = true;
    }, 1500); // Longer delay to ensure user has time to make initial rotation
    
  } catch (error) {
    console.error('Error during camera recovery:', error);
    // Last resort recovery - hard reset to initial values
    controls.target.set(0, 0, 0);
    camera.position.set(
      CAMERA_INITIAL_DISTANCE * 0.8,
      CAMERA_INITIAL_DISTANCE * 0.8, 
      CAMERA_INITIAL_DISTANCE * 0.8
    );
    controls.enabled = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;
    controls.update();
    camera.updateProjectionMatrix();
    if (renderer) renderer.render(getScene(), camera);
  }
  
  // Log success message
  const positionLength = camera.position.length();
  logMessage(`Camera recovered to safe position at distance ${positionLength.toFixed(2)} from Earth center`);
}

// Exit satellite view with option to reset or maintain camera position
function exitSatelliteView(resetPosition = true) {
  console.log('🔄 exitSatelliteView called - Resetting camera settings properly');
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
  
  // Always ensure controls are enabled first
  controls.enabled = true;
  
  // Properly restore original values from before entering satellite view
  const originalDampingFactor = controls.userData?.originalDampingFactor || 0.1;
  const originalMinDistance = controls.userData?.originalMinDistance || 1.0;
  const originalMaxDistance = controls.userData?.originalMaxDistance || 100;
  const originalMinZoom = controls.userData?.originalMinZoom || 0.01;
  const originalMaxZoom = controls.userData?.originalMaxZoom || 10;
  
  // Reset all control properties to original values
  controls.dampingFactor = originalDampingFactor;
  controls.minDistance = originalMinDistance;
  controls.maxDistance = originalMaxDistance;
  controls.minZoom = originalMinZoom;
  controls.maxZoom = originalMaxZoom;
  
  // Clear userHasManuallyRotated flag and any other view-specific flags
  if (controls.userData) {
    controls.userData.userHasManuallyRotated = false;
    controls.userData.followingSatellite = null;
    controls.userData.inSatelliteView = false;
  }
  
  // GUARANTEED RECOVERY: Always ensure we're outside Earth regardless of current position
  const safeDistance = EARTH_DISPLAY_RADIUS * 3;
  
  if (resetPosition) {
    // For R key - Just use the reset view function which has its own safety checks
    resetCameraToDefaultView();
  } else {
    // For ESC key - Force camera to safe position while keeping viewing direction
    
    // Calculate normalized direction from Earth center to current camera
    const earthToCamera = camera.position.clone().normalize();
    
    // Force camera to safe distance along this direction
    const safePosition = earthToCamera.multiplyScalar(safeDistance);
    camera.position.copy(safePosition);
    
    // Reset target to Earth center (this is key to fixing orbit issues)
    controls.target.set(0, 0, 0);
    
    // Force controls update to apply changes immediately
    controls.update();
    
    // Add notification
    logMessage('Camera position adjusted to safe distance');
    import('./ui.js').then(ui => {
      ui.showTemporaryMessage('View reset to safe position', 2000);
    });
  }
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
    // IMPROVEMENT: Make labels clickable too
    if (satellite.label) clickableObjects.push(satellite.label);
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
    
    // IMPROVEMENT: Check if the object is the satellite label
    if (satellite.label === object) {
      return satellite;
    }
  }
  
  return null;
}
