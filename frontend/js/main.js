/**
 * LEOS First Orbit - Main Entry Point
 * Initializes all components in the correct order
 */

import { initScene } from './scene.js';
import { createEarthGroup, createMoon } from './earth.js';
import { fetchTrajectory } from './data.js';
import { createSatellite } from './satellites.js';
import { CRTS1_COLOR, BULLDOG_COLOR } from './config.js';
import { logMessage } from './utils.js';
import { initAnimation, startAnimation } from './animation.js';
import { initResponsive, trackFrameTime, appState } from './responsive.js';
import { initUI } from './ui.js';
import { setupEventListeners } from './user-interaction.js';

// Store scene components
let sceneComponents;

// Main initialization function
async function init() {
  logMessage("Initializing LEOS First Orbit application");
  
  // Initialize responsive system first to detect device capabilities
  const deviceInfo = initResponsive();
  logMessage(`Device detected: ${deviceInfo.deviceType}, orientation: ${deviceInfo.orientation}`);
  
  // Set DEBUG_MODE to false for production
  window.DEBUG_MODE = false;
  
  // Initialize the 3D scene and store all returned components
  sceneComponents = initScene();
  const { earthCamera, moonCamera } = sceneComponents;
  
  // Store cameras on document for easy access
  document.earthCamera = earthCamera;
  document.moonCamera = moonCamera;
  
  // Initialize UI components
  initUI();
  
  // Setup user interaction event listeners
  setupEventListeners();
  
  // Create Earth and Moon
  createEarthGroup();
  createMoon(moonCamera);
  
  // Initialize animation systems
  initAnimation();
  
  // Load satellite trajectories
  try {
    const crts1Data = await fetchTrajectory("CRTS1");
    const bulldogData = await fetchTrajectory("BULLDOG");
    
    // Create satellites from data
    createSatellite("CRTS1", CRTS1_COLOR, crts1Data);
    createSatellite("BULLDOG", BULLDOG_COLOR, bulldogData);
    
    logMessage("Satellite data loaded successfully");
    
    // Hide loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
    // Start the animation automatically
    startAnimation();
  } catch (error) {
    logMessage(`Error loading satellite data: ${error.message}`);
    displayError("Failed to load satellite data. Please try refreshing the page.");
  }
  
  // Setup renderer for continuous updates
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    
    // Use the stored scene components directly
    const { controls, renderer, scene, camera } = sceneComponents;
    
    // We still track frame times for internal performance monitoring
    // but don't display it to users in production
    trackFrameTime();
    
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
  
  // Start render loop
  renderLoop();
  
  // Performance overlay is no longer created in production
  logMessage("Initialization complete - simulation starting automatically");
}

// Create a simple performance overlay - this function is no longer called
// in production, but kept for development purposes
function createPerformanceOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'performancePanel';
  overlay.className = 'visible';
  
  const fpsText = document.createElement('div');
  fpsText.id = 'fpsDisplay';
  fpsText.textContent = 'FPS: --';
  
  const qualityText = document.createElement('div');
  qualityText.id = 'qualityDisplay';
  qualityText.textContent = `Quality: ${appState.qualityLevel}`;
  
  const indicator = document.createElement('div');
  indicator.id = 'qualityIndicator';
  
  const marker = document.createElement('div');
  marker.id = 'qualityMarker';
  marker.style.left = '50%';
  
  indicator.appendChild(marker);
  overlay.appendChild(fpsText);
  overlay.appendChild(qualityText);
  overlay.appendChild(indicator);
  
  document.body.appendChild(overlay);
}

// Display error message
function displayError(message) {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

// Start the application
window.addEventListener('load', init);
