/**
 * LEOS First Orbit - Simplified UI Module
 */
import { getCamera, getRenderer, getControls } from './scene.js';
import { logMessage, logError } from './utils.js';
import { CAMERA_INITIAL_DISTANCE } from './config.js';

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
  
  followingMessageElement.textContent = `Following ${satelliteName} - Press ESC to exit`;
  followingMessageElement.style.display = 'block';
}

// Hide the following message
export function hideFollowingMessage() {
  if (!followingMessageElement) return;
  
  followingMessageElement.style.display = 'none';
}

// Update satellite label with live data
export function updateSatelliteLabel(satellite) {
  if (!satellite || !satellite.label || !satellite.label.material || !satellite.label.material.map) return;
  
  // Only update if this is the selected satellite or a specified update interval has passed
  const shouldUpdateLabel = currentlyDisplayedSatellite === satellite;
  
  if (shouldUpdateLabel) {
    // Get the canvas context from the sprite's texture
    const texture = satellite.label.material.map;
    const canvas = texture.image;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border - convert color to string format if needed
    const colorStr = typeof satellite.color === 'string' 
      ? satellite.color 
      : `#${satellite.color.toString(16).padStart(6, '0')}`;
      
    context.strokeStyle = colorStr;
    context.lineWidth = 8;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    // Set text style for title
    context.font = 'bold 64px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    
    // Draw title
    context.fillText(satellite.name, canvas.width / 2, 20);
    
    // Set text style for info
    context.font = '32px Arial';
    context.textAlign = 'left';
    context.fillStyle = '#03cafc'; // Light blue for data
    
    // Draw dynamic satellite information
    if (satellite.altitude) {
      context.fillText(`Alt: ${satellite.altitude.toFixed(1)} km`, 20, 100);
    }
    
    if (satellite.velocity) {
      context.fillText(`Vel: ${satellite.velocity.toFixed(1)} km/s`, 20, 140);
    }
    
    // Replace position coordinates with subsystem telemetry
    // Use different timing functions to make the values vary independently
    const batteryLevel = Math.floor(75 + 15 * Math.sin(Date.now() / 10000)); // 60-90% range
    const solarPanelOutput = Math.floor(28 + 7 * Math.sin(Date.now() / 12000)); // 21-35W range
    const tempC = Math.floor(20 + 5 * Math.sin(Date.now() / 15000)); // 15-25°C range
    
    context.fillText(`Batt: ${batteryLevel}%`, 20, 180);
    context.fillText(`Solar: ${solarPanelOutput}W`, 20, 220);
    context.fillText(`Temp: ${tempC}°C`, 20, 260);
    
    // Update the texture
    texture.needsUpdate = true;
  }
}

// The following are kept to maintain compatibility with other modules
export function addLogEntry() {} // Empty placeholder
export function updateTelemetryPanel() {} // Empty placeholder
export function focusOnSatellite() {} // Empty placeholder
export function resetGlobalView() {} // Empty placeholder
export function toggleControlBar() {} // Empty placeholder
export function toggleDebugPanel() {} // Empty placeholder
