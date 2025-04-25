/**
 * LEOS First Orbit - Main Entry Point
 * Initializes all components in the correct order
 */

// Add version timestamp for cache busting
const VERSION = Date.now();
console.log(`🚀 Loading LEOS First Orbit v${VERSION} - Camera Control Update`);

import { initScene } from './scene.js';
import { createEarthGroup, createMoon } from './earth.js';
import { fetchTrajectory, initializeSimulation, checkSimulationStatus, getRandomSpaceFact } from './data.js';
import { createSatellite } from './satellites.js';
import { CRTS1_COLOR, BULLDOG_COLOR } from './config.js';
import { logMessage } from './utils.js';
import { initAnimation, startAnimation } from './animation.js';
import { initResponsive, trackFrameTime, appState } from './responsive.js';
import { initUI } from './ui.js';
import { setupEventListeners } from './user-interaction.js';

// Store scene components
let sceneComponents;
// Store space fact timer
let factTimer = null;
// Current space fact index
let currentFactIndex = -1;

// Main initialization function
async function init() {
  logMessage("Initializing LEOS First Orbit application");
  
  // Initialize responsive system first to detect device capabilities
  const deviceInfo = initResponsive();
  logMessage(`Device detected: ${deviceInfo.deviceType}, orientation: ${deviceInfo.orientation}`);
  
  // Set DEBUG_MODE to false for production
  window.DEBUG_MODE = false;
  
  // Show loading overlay with initial message
  updateLoadingMessage("Initializing application...");
  
  // Start displaying space facts
  startSpaceFactsRotation();
  
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
  
  // Create Earth and Moon - these can be done immediately
  updateLoadingMessage("Loading 3D models...");
  createEarthGroup();
  createMoon(moonCamera);
  
  // Initialize animation systems
  initAnimation();
  
  // Trigger simulation initialization but don't wait for it to complete
  updateLoadingMessage("Preparing simulation data...");
  initializeSimulation();
  
  // Setup progress monitoring for simulation initialization
  monitorSimulationProgress();
  
  // Setup renderer for continuous updates (start rendering immediately)
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    
    // Use the stored scene components directly
    const { controls, renderer, scene, camera } = sceneComponents;
    
    // We still track frame times for internal performance monitoring
    // but don't display it to users in production
    trackFrameTime();
    
    // Import preventEarthCollision function from scene.js and call it
    import('./scene.js').then(sceneModule => {
      if (sceneModule.preventEarthCollision) {
        sceneModule.preventEarthCollision();
      }
    });
    
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
  
  // Start render loop immediately - don't wait for data loading
  renderLoop();
  
  logMessage("Basic initialization complete - simulation loading in background");
}

// Start rotating through space facts during loading
function startSpaceFactsRotation() {
  // Display first fact immediately
  displayNextSpaceFact();
  
  // Set up timer to rotate facts every 6 seconds
  factTimer = setInterval(displayNextSpaceFact, 6000);
}

// Display the next space fact
function displayNextSpaceFact() {
  const spaceFact = getRandomSpaceFact();
  const factElement = document.getElementById('spaceFact');
  
  if (factElement) {
    // Fade out
    factElement.style.opacity = 0;
    
    // Change text and fade in after a short delay
    setTimeout(() => {
      factElement.textContent = `"${spaceFact}"`;
      factElement.style.opacity = 1;
    }, 500);
  }
}

// Stop rotating space facts
function stopSpaceFactsRotation() {
  if (factTimer) {
    clearInterval(factTimer);
    factTimer = null;
  }
}

// Monitor simulation initialization progress
async function monitorSimulationProgress() {
  let dots = 0;
  const maxDots = 3;
  let elapsedTime = 0;
  const checkInterval = 1000; // Check every second
  
  // Keep checking until simulation is ready
  while (true) {
    const status = await checkSimulationStatus();
    
    if (status.initialized) {
      // Simulation is ready, load satellites
      updateLoadingMessage("Loading satellite data...");
      await loadSatelliteData();
      break;
    } else if (status.error) {
      // Error in simulation
      displayError(`Failed to initialize simulation: ${status.error}`);
      updateLoadingMessage("Error loading simulation data");
      break;
    } else {
      // Still initializing
      dots = (dots + 1) % (maxDots + 1);
      const dotString = '.'.repeat(dots) + ' '.repeat(maxDots - dots);
      elapsedTime += checkInterval;
      
      // Remove seconds timer, just show the message with animated dots
      updateLoadingMessage(`Preparing simulation data${dotString}`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
}

// Load satellite data after simulation is initialized
async function loadSatelliteData() {
  try {
    // Load satellite trajectories
    const crts1Data = await fetchTrajectory("CRTS1");
    const bulldogData = await fetchTrajectory("BULLDOG");
    
    // Create satellites from data
    createSatellite("CRTS1", CRTS1_COLOR, crts1Data);
    createSatellite("BULLDOG", BULLDOG_COLOR, bulldogData);
    
    logMessage("Satellite data loaded successfully");
    
    // Stop space facts rotation
    stopSpaceFactsRotation();
    
    // Hide loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
    // Start the animation automatically
    startAnimation();
    
    // Now that loading is complete, show instructions if needed
    import('./ui.js').then(ui => {
      ui.showInstructionsAfterLoading();
    });
  } catch (error) {
    logMessage(`Error loading satellite data: ${error.message}`);
    displayError("Failed to load satellite data. Please try refreshing the page.");
  }
}

// Update loading message in the UI
function updateLoadingMessage(message) {
  const loadingMessage = document.getElementById('loadingMessage');
  if (loadingMessage) {
    loadingMessage.textContent = message;
  }
}

// Display error message
function displayError(message) {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
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

// Start the application
window.addEventListener('load', init);
