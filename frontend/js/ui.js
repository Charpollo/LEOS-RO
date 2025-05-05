/**
 * LEOS First Orbit - Simplified UI Module
 */
import { getCamera, getRenderer, getControls } from './scene.js';
import { logMessage, logError } from './utils.js';
import { CAMERA_INITIAL_DISTANCE } from './config.js';
import { getDeviceInfo } from './responsive.js';

// UI Elements
let satelliteInfoPanel;
let satelliteNameElement;
let satelliteAltitudeElement;
let satelliteVelocityElement;
let satellitePositionElement;
let followingMessageElement;
let instructionsOverlay;
let orbitInfoPanel;
// Track the currently displayed satellite
let currentlyDisplayedSatellite = null;

// Initialize minimal UI components
export function initUI() {
  logMessage("Initializing UI components");
  
  // Get satellite info panel elements
  satelliteInfoPanel = document.getElementById('satellite-info');
  satelliteNameElement = document.getElementById('satellite-name');
  satelliteAltitudeElement = document.getElementById('satellite-altitude');
  satelliteVelocityElement = document.getElementById('satellite-velocity');
  satellitePositionElement = document.getElementById('satellite-position');
  instructionsOverlay = document.getElementById('instructions-overlay');
  orbitInfoPanel = document.getElementById('orbit-info-panel');
  
  // Initialize instructions overlay
  initInstructionsOverlay();
  
  // Initialize orbit info panel
  initOrbitInfoPanel();
  
  // Create following message element if it doesn't exist
  if (!followingMessageElement) {
    followingMessageElement = document.createElement('div');
    followingMessageElement.id = 'following-message';
    followingMessageElement.className = 'following-message';
    followingMessageElement.style.display = 'none';
    document.body.appendChild(followingMessageElement);
  }
  
  // Add window resize handler
  window.addEventListener('resize', () => handleResize());
  
  logMessage("UI initialization complete");
}

// Initialize the orbit info panel
function initOrbitInfoPanel() {
  if (!orbitInfoPanel) return;
  
  // Get the toggle button
  const toggleButton = document.getElementById('toggle-info-panel');
  const expandButton = document.getElementById('expand-info-panel');
  
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      collapseOrbitInfoPanel();
    });
  }
  
  if (expandButton) {
    expandButton.addEventListener('click', () => {
      expandOrbitInfoPanel();
    });
  }
  
  // Start with panel visible
  showOrbitInfoPanel();
}

// Show the orbit info panel
function showOrbitInfoPanel() {
  if (!orbitInfoPanel) return;
  orbitInfoPanel.style.display = 'block';
}

// Hide the orbit info panel
function hideOrbitInfoPanel() {
  if (!orbitInfoPanel) return;
  orbitInfoPanel.style.display = 'none';
}

// Collapse the orbit info panel
function collapseOrbitInfoPanel() {
  if (!orbitInfoPanel) return;
  
  orbitInfoPanel.classList.add('collapsed');
  
  // Show the expand button
  const expandButton = document.getElementById('expand-info-panel');
  if (expandButton) {
    expandButton.style.display = 'flex';
  }
}

// Expand the orbit info panel
function expandOrbitInfoPanel() {
  if (!orbitInfoPanel) return;
  
  orbitInfoPanel.classList.remove('collapsed');
  
  // Hide the expand button
  const expandButton = document.getElementById('expand-info-panel');
  if (expandButton) {
    expandButton.style.display = 'none';
  }
}

// Toggle the orbit info panel
export function toggleOrbitInfoPanel() {
  if (!orbitInfoPanel) return;
  
  if (orbitInfoPanel.classList.contains('collapsed')) {
    expandOrbitInfoPanel();
  } else {
    collapseOrbitInfoPanel();
  }
}

// Initialize the instructions overlay
function initInstructionsOverlay() {
  if (!instructionsOverlay) return;
  
  // Get the dismiss button and add click event
  const dismissButton = document.getElementById('dismiss-instructions');
  if (dismissButton) {
    dismissButton.addEventListener('click', () => {
      hideInstructions();
      // Use session storage instead of local storage
      // This will make instructions appear for each new browser session
      sessionStorage.setItem('instructionsShown', 'true');
    });
  }
  
  // Always hide instructions initially during loading
  hideInstructions();
  
  // Add a "Show Instructions" button in the corner
  createInstructionButton();
}

// Check if instructions should be shown after loading
export function showInstructionsAfterLoading() {
  const instructionsShown = sessionStorage.getItem('instructionsShown') === 'true';
  if (!instructionsShown) {
    showInstructions();
  }
}

// Create a button to show instructions
function createInstructionButton() {
  // Create button element if it doesn't exist
  let instructionButton = document.getElementById('show-instructions-button');
  if (!instructionButton) {
    instructionButton = document.createElement('button');
    instructionButton.id = 'show-instructions-button';
    instructionButton.innerHTML = '<span class="info-icon">ⓘ</span>';
    instructionButton.title = "Show Instructions";
    
    // Add click event
    instructionButton.addEventListener('click', () => {
      showInstructions();
    });
    
    // Append to body
    document.body.appendChild(instructionButton);
  }
}

// Show the instructions overlay
export function showInstructions() {
  if (!instructionsOverlay) return;
  instructionsOverlay.style.display = 'flex';
}

// Hide the instructions overlay
export function hideInstructions() {
  if (!instructionsOverlay) return;
  instructionsOverlay.style.display = 'none';
}

// Handle window resize
function handleResize() {
  const camera = getCamera();
  const renderer = getRenderer();
  
  if (!camera || !renderer) return;
  
  // Update camera aspect ratio
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // Update renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Show satellite information in the info panel
export function showSatelliteInfo(satellite) {
  if (!satelliteInfoPanel) return;
  
  try {
    // Store the satellite reference for real-time updates
    currentlyDisplayedSatellite = satellite;
    
    // Initial update of the satellite info
    updateSatelliteInfoDisplay(satellite);
    
    // Show the panel
    satelliteInfoPanel.style.display = 'block';
  } catch (error) {
    logError('Error showing satellite info: ' + error.message);
  }
}

// Update satellite information display with latest data
export function updateSatelliteInfoDisplay(satellite) {
  if (!satellite) return;
  
  // Update satellite info elements with satellite data
  if (satelliteNameElement) {
    satelliteNameElement.textContent = satellite.name || 'Unknown Satellite';
  }
  
  if (satelliteAltitudeElement) {
    satelliteAltitudeElement.textContent = satellite.altitude ? 
      `Altitude: ${satellite.altitude.toFixed(2)} km` : 'Unknown';
  }
  
  if (satelliteVelocityElement) {
    satelliteVelocityElement.textContent = satellite.velocity ? 
      `Velocity: ${satellite.velocity.toFixed(2)} km/s` : 'Unknown';
  }
  
  if (satellitePositionElement) {
    // Replace position coordinates with organized subsystem telemetry
    // Group related values and use better formatting
    const batteryLevel = Math.floor(75 + 15 * Math.sin(Date.now() / 10000)); // 60-90% range
    const solarPanelOutput = Math.floor(28 + 7 * Math.sin(Date.now() / 12000)); // 21-35W range
    const tempC = Math.floor(20 + 5 * Math.sin(Date.now() / 15000)); // 15-25°C range
    
    // Organize subsystems by category with improved formatting
    satellitePositionElement.textContent = 
      `System Status:\n` +
      `• Power: ${batteryLevel}% (Batt), ${solarPanelOutput}W (Solar)\n` +
      `• Thermal: ${tempC}°C`;
  }
}

// Update currently displayed satellite info (called from animation loop)
export function updateCurrentSatelliteInfo() {
  if (currentlyDisplayedSatellite && satelliteInfoPanel.style.display === 'block') {
    updateSatelliteInfoDisplay(currentlyDisplayedSatellite);
  }
}

// Clear satellite information panel
export function clearSatelliteInfo() {
  if (!satelliteInfoPanel) return;
  
  // Clear the current satellite reference
  currentlyDisplayedSatellite = null;
  
  // Hide the panel
  satelliteInfoPanel.style.display = 'none';
}

// Show a message indicating we're following a satellite
export function showFollowingMessage(satelliteName) {
  if (!followingMessageElement) return;
  
  // Update message text with device-appropriate instructions
  const deviceInfo = getDeviceInfo ? getDeviceInfo() : { type: 'desktop' };
  
  if (deviceInfo.type === 'mobile' || deviceInfo.type === 'tablet') {
    followingMessageElement.textContent = `Following ${satelliteName}`;
    // Create mobile control buttons if they don't exist yet
    createMobileControlButtons();
  } else {
    followingMessageElement.textContent = `Following ${satelliteName} - Press ESC to exit`;
  }
  
  followingMessageElement.style.display = 'block';
}

// Hide the following message
export function hideFollowingMessage() {
  if (!followingMessageElement) return;
  
  followingMessageElement.style.display = 'none';
  
  // Hide mobile control buttons if they exist
  hideMobileControlButtons();
}

// Update satellite label with live data
export function updateSatelliteLabel(satellite) {
  if (!satellite || !satellite.label || !satellite.label.material || !satellite.label.material.map) return;
  
  // Get the canvas context from the sprite's texture
  const texture = satellite.label.material.map;
  const canvas = texture.image;
  const context = canvas.getContext('2d');
  
  if (!context) return;
  
  // Clear the canvas completely - transparent background
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Convert color to string format if needed
  const colorStr = typeof satellite.color === 'string' 
    ? satellite.color 
    : `#${satellite.color.toString(16).padStart(6, '0')}`;
  
  // Create clearer text with better visibility
  // Use a larger, bolder font
  context.font = 'bold 54px Arial, sans-serif'; 
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Add dark outline for better contrast
  context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  context.lineWidth = 4;
  context.strokeText(satellite.name, canvas.width / 2, canvas.height / 2);
  
  // Add minimal glow effect - reduced blur for sharper text
  context.shadowColor = colorStr;
  context.shadowBlur = 5; // Reduced blur for sharper text
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  
  // Fill text with full opacity white
  context.fillStyle = 'rgba(255, 255, 255, 1.0)';
  context.fillText(satellite.name, canvas.width / 2, canvas.height / 2);
  
  // Make sure texture updates
  texture.needsUpdate = true;
  
  // Disable mipmapping for text sharpness if not already set
  if (texture.generateMipmaps) {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }
}

// Show temporary message overlay
export function showTemporaryMessage(message, duration = 3000) {
  // Create temporary message element if it doesn't exist
  let tempMessage = document.getElementById('temp-message');
  
  if (!tempMessage) {
    tempMessage = document.createElement('div');
    tempMessage.id = 'temp-message';
    tempMessage.className = 'temp-message';
    document.body.appendChild(tempMessage);
  }
  
  // Set message content
  tempMessage.textContent = message;
  
  // Show the message
  tempMessage.style.display = 'block';
  tempMessage.style.opacity = '1';
  
  // Hide after duration
  setTimeout(() => {
    tempMessage.style.opacity = '0';
    setTimeout(() => {
      tempMessage.style.display = 'none';
    }, 500); // Fade out transition time
  }, duration);
}

// Show satellite view control instructions
export function showSatelliteViewInstructions() {
  // Detect device type for tailored instructions
  const deviceInfo = getDeviceInfo ? getDeviceInfo() : { type: 'desktop' };
  const isMobile = deviceInfo.type === 'mobile' || deviceInfo.type === 'tablet';
  
  // Create satellite controls overlay if it doesn't exist
  let satControlsOverlay = document.getElementById('satellite-controls-overlay');
  
  if (!satControlsOverlay) {
    satControlsOverlay = document.createElement('div');
    satControlsOverlay.id = 'satellite-controls-overlay';
    satControlsOverlay.className = 'satellite-controls-overlay';
    
    // Create content with device-appropriate controls
    let controlsContent = `
      <div class="controls-panel">
        <h3>Satellite View Controls</h3>
        <div class="control-group">
    `;
    
    if (isMobile) {
      // Mobile-specific instructions
      controlsContent += `
          <div class="control-item">
            <span class="key-combo">Touch + Drag</span>
            <span class="action">Orbit around satellite</span>
          </div>
          <div class="control-item">
            <span class="key-combo">Pinch</span>
            <span class="action">Zoom in/out</span>
          </div>
          <div class="control-item">
            <span class="key-combo">Exit Button</span>
            <span class="action">Exit satellite view</span>
          </div>
          <div class="control-item">
            <span class="key-combo">Reset Button</span>
            <span class="action">Reset to Earth view</span>
          </div>
          <div class="mobile-buttons-info">
            <p>Use the blue buttons in the bottom-right corner</p>
          </div>
      `;
    } else {
      // Desktop instructions
      controlsContent += `
          <div class="control-item">
            <span class="key-combo">Click + Drag</span>
            <span class="action">Orbit around satellite</span>
          </div>
          <div class="control-item">
            <span class="key-combo">Scroll</span>
            <span class="action">Zoom in/out</span>
          </div>
          <div class="control-item">
            <span class="key-combo">ESC</span>
            <span class="action">Exit satellite view</span>
          </div>
          <div class="control-item">
            <span class="key-combo">R</span>
            <span class="action">Reset to Earth view</span>
          </div>
      `;
    }
    
    // Complete the HTML structure
    controlsContent += `
        </div>
        <button id="dismiss-sat-controls">Got it</button>
      </div>
    `;
    
    satControlsOverlay.innerHTML = controlsContent;
    document.body.appendChild(satControlsOverlay);
    
    // Add event listener to dismiss button
    const dismissButton = document.getElementById('dismiss-sat-controls');
    if (dismissButton) {
      dismissButton.addEventListener('click', () => {
        hideSatelliteViewInstructions();
        // Remember that instructions were shown in this session
        sessionStorage.setItem('satControlsShown', 'true');
      });
    }
  }
  
  // Only show instructions if they haven't been shown this session
  const controlsShown = sessionStorage.getItem('satControlsShown') === 'true';
  if (!controlsShown) {
    satControlsOverlay.style.display = 'flex';
    
    // Auto-hide after 10 seconds even if not dismissed
    setTimeout(() => {
      hideSatelliteViewInstructions();
    }, 10000);
  } else {
    // Show a brief reminder message based on device type
    if (isMobile) {
      showTemporaryMessage('Use the blue buttons to exit or reset view', 3000);
    } else {
      showTemporaryMessage('Satellite View: ESC to exit, R to reset, drag to orbit', 3000);
    }
  }
}

// Hide satellite view instructions
export function hideSatelliteViewInstructions() {
  const satControlsOverlay = document.getElementById('satellite-controls-overlay');
  if (satControlsOverlay) {
    satControlsOverlay.style.display = 'none';
  }
}

// Add CSS for satellite controls overlay
function addSatelliteControlsCSS() {
  // Only add if it doesn't exist already
  if (!document.getElementById('satellite-controls-css')) {
    const style = document.createElement('style');
    style.id = 'satellite-controls-css';
    style.textContent = `
      .satellite-controls-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        transition: opacity 0.5s ease;
      }
      
      .controls-panel {
        background-color: rgba(20, 20, 40, 0.9);
        border: 2px solid #03cafc;
        border-radius: 10px;
        padding: 20px;
        max-width: 400px;
        color: white;
        box-shadow: 0 0 20px rgba(3, 202, 252, 0.5);
      }
      
      .controls-panel h3 {
        margin-top: 0;
        color: #03cafc;
        text-align: center;
        font-size: 1.2em;
      }
      
      .control-group {
        margin: 15px 0;
      }
      
      .control-item {
        display: flex;
        justify-content: space-between;
        margin: 10px 0;
        align-items: center;
      }
      
      .key-combo {
        background-color: #1e3a50;
        padding: 5px 10px;
        border-radius: 4px;
        font-family: monospace;
        margin-right: 10px;
        min-width: 100px;
        text-align: center;
      }
      
      .action {
        flex-grow: 1;
        text-align: left;
      }
      
      #dismiss-sat-controls {
        display: block;
        margin: 0 auto;
        background-color: #03cafc;
        color: #000;
        border: none;
        padding: 8px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }
      
      #dismiss-sat-controls:hover {
        background-color: #0099cc;
      }
      
      .temp-message {
        position: fixed;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        transition: opacity 0.5s ease;
        display: none;
        font-weight: bold;
        border: 1px solid #03cafc;
        box-shadow: 0 0 10px rgba(3, 202, 252, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
}

// Create mobile control buttons for satellite view
function createMobileControlButtons() {
  // Check if buttons already exist
  if (document.getElementById('mobile-controls')) {
    showMobileControlButtons();
    return;
  }
  
  // Create container for mobile control buttons
  const mobileControls = document.createElement('div');
  mobileControls.id = 'mobile-controls';
  mobileControls.className = 'mobile-controls';
  
  // Create exit button (equivalent to ESC key)
  const exitButton = document.createElement('button');
  exitButton.id = 'mobile-exit-button';
  exitButton.innerHTML = '<span>Exit</span>';
  exitButton.title = 'Exit satellite view';
  exitButton.addEventListener('click', () => {
    import('./user-interaction.js').then(interaction => {
      // Call the same function that ESC key triggers
      interaction.exitSatelliteView ? 
        interaction.exitSatelliteView(false) : 
        interaction.forceEarthViewRecovery(false);
      
      // Clear selection and info
      import('./satellites.js').then(sat => {
        sat.setSelectedSatellite(null);
      });
      clearSatelliteInfo();
      hideFollowingMessage();
      showTemporaryMessage('Exited satellite view', 2000);
    });
  });
  
  // Create reset button (equivalent to R key)
  const resetButton = document.createElement('button');
  resetButton.id = 'mobile-reset-button';
  resetButton.innerHTML = '<span>Reset</span>';
  resetButton.title = 'Reset to Earth view';
  resetButton.addEventListener('click', () => {
    import('./user-interaction.js').then(interaction => {
      // Call the same function that R key triggers
      interaction.resetCameraToDefaultView ? 
        interaction.resetCameraToDefaultView() : 
        interaction.forceEarthViewRecovery(true);
      
      // Clear selection and info
      import('./satellites.js').then(sat => {
        sat.setSelectedSatellite(null);
      });
      clearSatelliteInfo();
      hideFollowingMessage();
      showTemporaryMessage('Reset to Earth view', 2000);
    });
  });
  
  // Add buttons to container
  mobileControls.appendChild(exitButton);
  mobileControls.appendChild(resetButton);
  
  // Add container to body
  document.body.appendChild(mobileControls);
}

// Hide mobile control buttons
function hideMobileControlButtons() {
  const mobileControls = document.getElementById('mobile-controls');
  if (mobileControls) {
    mobileControls.style.display = 'none';
  }
}

// Show mobile control buttons
function showMobileControlButtons() {
  const mobileControls = document.getElementById('mobile-controls');
  if (mobileControls) {
    mobileControls.style.display = 'flex';
  } else {
    createMobileControlButtons();
  }
}

// The following are kept to maintain compatibility with other modules
export function addLogEntry() {} // Empty placeholder
export function updateTelemetryPanel() {} // Empty placeholder
export function focusOnSatellite() {} // Empty placeholder
export function resetGlobalView() {} // Empty placeholder
export function toggleControlBar() {} // Empty placeholder
export function toggleDebugPanel() {} // Empty placeholder
