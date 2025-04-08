/**
 * LEOS First Orbit - Simplified Animation Module
 * Controls animation timing and updates
 */
import { ANIMATION_SPEED } from './config.js';
import { updateSatellites, getSatellites } from './satellites.js';
import { updateEarth, updateMoon } from './earth.js';
import { logMessage } from './utils.js';
import { updateStarField } from './scene.js';
import { 
  shouldAnimate, 
  getAnimationSpeed, 
  trackFrameTime,
  appState
} from './responsive.js';
import { updateCurrentSatelliteInfo, updateSatelliteLabel } from './ui.js';

// Animation state
let animationActive = false;
let lastTime = 0;
let simulationTime = 0;
let animationFrameId = null;
let frameCount = 0;
let accumulator = 0;
let stepSize = 16.67; // Base animation step size at 60fps

// Initialize animation
export function initAnimation() {
  logMessage("Initializing animation system");
  lastTime = Date.now();
  simulationTime = 0;
  stepSize = 16.67; // ~60fps equivalent time increment
  
  // Attempt to use RAF timestamp for better precision if available
  if (window.performance && window.performance.now) {
    lastTime = window.performance.now();
  }
}

// Start the animation loop - automatically called from main.js
export function startAnimation() {
  if (animationActive) return;
  
  logMessage("Starting animation");
  animationActive = true;
  
  // Use performance.now() for higher precision if available
  lastTime = window.performance && window.performance.now ? 
    window.performance.now() : Date.now();
  
  // Start the animation loop
  animate();
}

// Stop the animation loop - not needed, but kept for API compatibility
export function stopAnimation() {
  if (!animationActive) return;
  
  logMessage("Stopping animation");
  animationActive = false;
  
  // Cancel any pending animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// Calculate an optimal step size based on device performance
function calculateDynamicStepSize(deltaMs) {
  // Target a steady 60fps feel regardless of actual frame rate
  const targetFrameTime = 16.67;
  
  // Calculate a smoothed dynamic step size
  // This helps maintain consistent simulation speed across different devices
  const currentStep = deltaMs * ANIMATION_SPEED;
  
  // Apply adjustment based on device capability to ensure 
  // consistent simulation speed regardless of frame rate
  const adjustmentFactor = Math.min(deltaMs / targetFrameTime, 2.0);
  
  // Smoothly interpolate between previous step size and new step size
  stepSize = stepSize * 0.95 + (currentStep * adjustmentFactor) * 0.05;
  
  // Limit step size to reasonable bounds
  return Math.max(1.0, Math.min(stepSize, 33.3 * ANIMATION_SPEED));
}

// Main animation loop with performance optimization
function animate(timestamp) {
  if (!animationActive) return;
  
  // Request the next frame first for optimal timing
  animationFrameId = requestAnimationFrame(animate);
  
  // Use timestamp if provided by requestAnimationFrame, otherwise fall back
  const currentTime = timestamp || window.performance.now() || Date.now();
  
  // Calculate time delta
  let deltaMs = currentTime - lastTime;
  lastTime = currentTime;
  
  // Skip if tab is inactive or animations are paused
  if (!shouldAnimate()) {
    return;
  }
  
  // Track frame time for performance monitoring
  trackFrameTime();
  
  // Only update if delta is reasonable (prevents huge jumps after tab switching)
  if (deltaMs > 0 && deltaMs < 1000) {
    // Get the current animation speed factor from the responsive system
    const speedFactor = getAnimationSpeed();
    
    // Calculate a dynamic step size based on performance
    const dynamicStep = calculateDynamicStepSize(deltaMs);
    
    // Add to the accumulator - this enables fixed timestep with variable frame rate
    accumulator += deltaMs;
    
    // Use a semi-fixed timestep approach for more stable simulation
    // This provides consistency across different devices and frame rates
    while (accumulator >= stepSize) {
      // Update simulation time with dynamic speed factor
      simulationTime += dynamicStep * speedFactor;
      
      // Decrement accumulator by the fixed step
      accumulator -= stepSize;
      
      // Don't let accumulator build up too much
      if (accumulator > stepSize * 5) {
        accumulator = 0;
      }
    }
    
    // Update all animated elements
    updateAll(simulationTime);
    
    // Count frames for performance metrics
    frameCount++;
  }
}

// Update all animated elements
function updateAll(time) {
  // Update Earth rotation
  updateEarth(time);
  
  // Update Moon position
  updateMoon(time);
  
  // Update satellites
  updateSatellites(time);
  
  // Update starfield position
  updateStarField();
  
  // Update satellite information if a satellite is selected
  updateSatelliteInformation();
  
  // Add performance overlay if in debug mode
  if (frameCount % 60 === 0) {
    updatePerformanceDisplay();
  }
}

// Update real-time satellite information
function updateSatelliteInformation() {
  // Update information panel with current satellite data
  updateCurrentSatelliteInfo();
  
  // Update satellite labels for all satellites
  const satellites = getSatellites();
  for (const satellite of satellites) {
    updateSatelliteLabel(satellite);
  }
}

// Update performance display if enabled
function updatePerformanceDisplay() {
  // Add or update performance display if debug mode is enabled
  const performancePanel = document.getElementById('performancePanel');
  if (!performancePanel) {
    createPerformanceDisplay();
  } else if (performancePanel && performancePanel.classList.contains('visible')) {
    // Update the display
    updatePerformancePanel();
  }
}

// Create the performance display panel
function createPerformanceDisplay() {
  // Only create if in debug mode
  if (!window.DEBUG_MODE) return;
  
  const panel = document.createElement('div');
  panel.id = 'performancePanel';
  panel.classList.add('visible');
  
  const fpsDisplay = document.createElement('div');
  fpsDisplay.id = 'fpsDisplay';
  fpsDisplay.textContent = `FPS: ${appState.fps}`;
  
  const qualityDisplay = document.createElement('div');
  qualityDisplay.id = 'qualityDisplay';
  qualityDisplay.textContent = `Quality: ${appState.qualityLevel}`;
  
  const indicator = document.createElement('div');
  indicator.id = 'qualityIndicator';
  
  const marker = document.createElement('div');
  marker.id = 'qualityMarker';
  indicator.appendChild(marker);
  
  panel.appendChild(fpsDisplay);
  panel.appendChild(qualityDisplay);
  panel.appendChild(indicator);
  
  document.body.appendChild(panel);
  
  updatePerformancePanel();
}

// Update the performance panel content
function updatePerformancePanel() {
  const fpsDisplay = document.getElementById('fpsDisplay');
  const qualityDisplay = document.getElementById('qualityDisplay');
  const marker = document.getElementById('qualityMarker');
  
  if (fpsDisplay) {
    fpsDisplay.textContent = `FPS: ${appState.fps}`;
  }
  
  if (qualityDisplay) {
    qualityDisplay.textContent = `Quality: ${appState.qualityLevel}`;
  }
  
  if (marker) {
    // Position the marker based on performance score (0-100%)
    marker.style.left = `${appState.performanceScore * 100}%`;
  }
}

// Get current simulation time - kept for API compatibility
export function getSimulationTime() {
  return simulationTime;
}

// Check if animation is active - kept for API compatibility
export function isAnimating() {
  return animationActive;
}

// Manually set the simulation time (for debugging/testing)
export function setSimulationTime(time) {
  simulationTime = time;
}

// Reset the animation system
export function resetAnimation() {
  simulationTime = 0;
  lastTime = window.performance && window.performance.now ? 
    window.performance.now() : Date.now();
  frameCount = 0;
  accumulator = 0;
}
