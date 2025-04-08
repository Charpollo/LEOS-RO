/**
 * LEOS First Orbit - Responsive Design Module
 * Handles device detection, performance scaling, and responsive adaptations
 */
import { logMessage, logWarning } from './utils.js';
import { getScene, getRenderer, getCamera, getControls, updateControlSensitivity } from './scene.js';

// Default quality presets
export const QUALITY_PRESETS = {
  ULTRA: {
    name: 'Ultra',
    pixelRatio: window.devicePixelRatio || 1,
    antialiasing: true,
    earthSegments: 64,
    starCount: 5000,
    trailLength: 500,
    orbitSegments: 200,
    shadowsEnabled: true,
    particleCount: 2000,
    postProcessing: true
  },
  HIGH: {
    name: 'High',
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    antialiasing: true,
    earthSegments: 48,
    starCount: 3000,
    trailLength: 400,
    orbitSegments: 150,
    shadowsEnabled: true,
    particleCount: 1200,
    postProcessing: true
  },
  MEDIUM: {
    name: 'Medium',
    pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
    antialiasing: true,
    earthSegments: 32,
    starCount: 2000,
    trailLength: 300,
    orbitSegments: 100,
    shadowsEnabled: false,
    particleCount: 800,
    postProcessing: false
  },
  LOW: {
    name: 'Low',
    pixelRatio: 1,
    antialiasing: false,
    earthSegments: 24,
    starCount: 1000,
    trailLength: 200,
    orbitSegments: 60,
    shadowsEnabled: false,
    particleCount: 500,
    postProcessing: false
  },
  MINIMAL: {
    name: 'Minimal',
    pixelRatio: 0.75,
    antialiasing: false,
    earthSegments: 16,
    starCount: 500,
    trailLength: 100,
    orbitSegments: 40,
    shadowsEnabled: false,
    particleCount: 200,
    postProcessing: false
  }
};

// Current application state
export const appState = {
  // Device type detection
  deviceType: 'desktop', // 'desktop', 'tablet', 'mobile', 'auto'
  
  // Orientation
  orientation: 'landscape', // 'landscape', 'portrait'
  
  // Performance metrics
  fps: 60,
  frameTimes: [],
  performanceScore: 1.0,
  
  // Current quality level
  qualityLevel: 'HIGH',
  qualityPreset: QUALITY_PRESETS.HIGH,
  
  // Adaptive state
  adaptiveQualityEnabled: true,
  adaptationInProgress: false,
  lastAdaptationTime: 0,
  
  // User preferences
  userQualityPreference: null,
  
  // Screen dimensions
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  aspectRatio: window.innerWidth / window.innerHeight,
  pixelRatio: window.devicePixelRatio || 1,
  
  // Animation state
  isPaused: false,
  animationSpeed: 1.0
};

// Initialize responsive system
export function initResponsive() {
  detectDevice();
  setupEventListeners();
  initPerformanceMonitoring();
  applyInitialSettings();
  
  logMessage(`Responsive system initialized: ${appState.deviceType} device detected`);
  return appState;
}

// Detect device type based on screen size and user agent
function detectDevice() {
  // Get screen width (accounting for orientation)
  const width = window.innerWidth;
  const height = window.innerHeight;
  appState.screenWidth = width;
  appState.screenHeight = height;
  appState.aspectRatio = width / height;
  
  // Set orientation
  appState.orientation = width > height ? 'landscape' : 'portrait';
  
  // Check if device has touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check for mobile user agent patterns
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Combine factors to determine device type
  if (width <= 767 || (isMobile && width <= 1024)) {
    appState.deviceType = 'mobile';
    // Set default quality for mobile
    appState.qualityLevel = 'LOW';
    appState.qualityPreset = QUALITY_PRESETS.LOW;
  } else if (width <= 1024 || (isMobile && width <= 1366)) {
    appState.deviceType = 'tablet';
    // Set default quality for tablet
    appState.qualityLevel = 'MEDIUM';
    appState.qualityPreset = QUALITY_PRESETS.MEDIUM;
  } else {
    appState.deviceType = 'desktop';
    // Set default quality for desktop based on pixel ratio
    if (window.devicePixelRatio > 2) {
      appState.qualityLevel = 'ULTRA';
      appState.qualityPreset = QUALITY_PRESETS.ULTRA;
    } else {
      appState.qualityLevel = 'HIGH';
      appState.qualityPreset = QUALITY_PRESETS.HIGH;
    }
  }
  
  // For low-powered devices like old phones, default to minimal
  if (isLowPoweredDevice()) {
    appState.qualityLevel = 'MINIMAL';
    appState.qualityPreset = QUALITY_PRESETS.MINIMAL;
  }
}

// Check if the device is likely low-powered
function isLowPoweredDevice() {
  // Check for factors that indicate a low-powered device
  const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;
  const hasLowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  const isOldBrowser = !window.requestAnimationFrame || !window.WebGLRenderingContext;
  
  // Simplified performance check
  let isLowPerformance = false;
  try {
    // Create a simple WebGL context to test capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Check for indicators of low-end graphics
        isLowPerformance = /Intel(R) HD Graphics|GMA|Mali-4|Adreno 3|PowerVR SGX/i.test(renderer);
      }
    }
  } catch (e) {
    // If we can't detect, assume not low-performance
    isLowPerformance = false;
  }
  
  return hasLowMemory || hasLowCores || isOldBrowser || isLowPerformance;
}

// Set up event listeners for responsive behavior
function setupEventListeners() {
  // Resize event for layout updates
  window.addEventListener('resize', handleResize);
  
  // Visibility change to pause when tab is inactive
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Device orientation change
  window.addEventListener('orientationchange', handleOrientationChange);
  
  // Fullscreen change
  document.addEventListener('fullscreenchange', handleFullscreenChange);
}

// Handle window resize events
function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Update state
  appState.screenWidth = width;
  appState.screenHeight = height;
  appState.aspectRatio = width / height;
  appState.orientation = width > height ? 'landscape' : 'portrait';
  
  // Apply responsive adjustments
  applyResponsiveAdjustments();
  
  // Log resize in console
  logMessage(`Window resized: ${width}x${height}, orientation: ${appState.orientation}`);
}

// Handle visibility change (tab switching)
function handleVisibilityChange() {
  if (document.hidden) {
    // Page is hidden, pause non-essential animations
    appState.isPaused = true;
  } else {
    // Page is visible again, resume animations
    appState.isPaused = false;
    // Reset performance monitoring on resume
    resetPerformanceMonitoring();
  }
}

// Handle orientation changes on mobile devices
function handleOrientationChange() {
  // Wait for orientation change to complete
  setTimeout(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update state
    appState.screenWidth = width;
    appState.screenHeight = height;
    appState.aspectRatio = width / height;
    appState.orientation = width > height ? 'landscape' : 'portrait';
    
    // Apply responsive adjustments specific to orientation change
    applyResponsiveAdjustments();
    
    logMessage(`Orientation changed to: ${appState.orientation}`);
  }, 300);
}

// Handle fullscreen changes
function handleFullscreenChange() {
  const isFullscreen = !!document.fullscreenElement;
  
  if (isFullscreen) {
    // Apply fullscreen-specific adjustments
    logMessage('Entered fullscreen mode');
  } else {
    // Revert from fullscreen-specific adjustments
    logMessage('Exited fullscreen mode');
  }
  
  // General responsive adjustments
  applyResponsiveAdjustments();
}

// Initialize performance monitoring
function initPerformanceMonitoring() {
  // Initialize frame time tracking
  appState.frameTimes = [];
  appState.lastFrameTime = performance.now();
  
  // Set up periodic performance monitoring
  setInterval(evaluatePerformance, 5000);
}

// Reset performance monitoring (e.g., after tab switch)
function resetPerformanceMonitoring() {
  appState.frameTimes = [];
  appState.lastFrameTime = performance.now();
}

// Track frame time for performance monitoring
export function trackFrameTime() {
  const now = performance.now();
  const frameTime = now - appState.lastFrameTime;
  appState.lastFrameTime = now;
  
  // Ignore outliers (e.g., after tab switch)
  if (frameTime < 500) {
    // Keep last 60 frames for averaging
    appState.frameTimes.push(frameTime);
    if (appState.frameTimes.length > 60) {
      appState.frameTimes.shift();
    }
    
    // Calculate current FPS
    if (appState.frameTimes.length > 0) {
      const avgFrameTime = appState.frameTimes.reduce((sum, time) => sum + time, 0) / appState.frameTimes.length;
      appState.fps = Math.round(1000 / avgFrameTime);
    }
  }
}

// Evaluate performance and adapt quality if needed
function evaluatePerformance() {
  if (!appState.adaptiveQualityEnabled || appState.adaptationInProgress) {
    return;
  }
  
  // Skip if we've adapted recently (throttle)
  const now = performance.now();
  if (now - appState.lastAdaptationTime < 10000) {
    return;
  }
  
  // Calculate performance score (primarily based on FPS)
  let performanceScore = 1.0;
  
  // FPS thresholds
  if (appState.fps < 20) {
    performanceScore = 0.2; // Very poor performance
  } else if (appState.fps < 30) {
    performanceScore = 0.4; // Poor performance
  } else if (appState.fps < 45) {
    performanceScore = 0.6; // Moderate performance
  } else if (appState.fps < 55) {
    performanceScore = 0.8; // Good performance
  } else {
    performanceScore = 1.0; // Excellent performance
  }
  
  appState.performanceScore = performanceScore;
  
  // Decide if quality adaptation is needed
  if (performanceScore < 0.4 && appState.qualityLevel !== 'MINIMAL') {
    // Performance is poor, decrease quality
    decreaseQuality();
  } else if (performanceScore < 0.6 && appState.qualityLevel !== 'LOW' && 
             appState.qualityLevel !== 'MINIMAL') {
    // Performance is moderate, consider decreasing quality
    decreaseQuality();
  } else if (performanceScore > 0.9 && appState.qualityLevel !== 'ULTRA' &&
             appState.qualityLevel !== 'HIGH') {
    // Performance is excellent, consider increasing quality
    increaseQuality();
  }
}

// Decrease quality settings
function decreaseQuality() {
  let newQualityLevel;
  
  switch (appState.qualityLevel) {
    case 'ULTRA':
      newQualityLevel = 'HIGH';
      break;
    case 'HIGH':
      newQualityLevel = 'MEDIUM';
      break;
    case 'MEDIUM':
      newQualityLevel = 'LOW';
      break;
    case 'LOW':
      newQualityLevel = 'MINIMAL';
      break;
    default:
      return; // Already at minimal
  }
  
  // Apply new quality
  setQualityLevel(newQualityLevel);
  logMessage(`Performance adaptation: decreased quality to ${newQualityLevel} (FPS: ${appState.fps})`);
}

// Increase quality settings
function increaseQuality() {
  let newQualityLevel;
  
  switch (appState.qualityLevel) {
    case 'MINIMAL':
      newQualityLevel = 'LOW';
      break;
    case 'LOW':
      newQualityLevel = 'MEDIUM';
      break;
    case 'MEDIUM':
      newQualityLevel = 'HIGH';
      break;
    case 'HIGH':
      newQualityLevel = 'ULTRA';
      break;
    default:
      return; // Already at ultra
  }
  
  // Apply new quality
  setQualityLevel(newQualityLevel);
  logMessage(`Performance adaptation: increased quality to ${newQualityLevel} (FPS: ${appState.fps})`);
}

// Set specific quality level
export function setQualityLevel(level) {
  if (!QUALITY_PRESETS[level]) {
    logWarning(`Invalid quality level: ${level}`);
    return;
  }
  
  appState.qualityLevel = level;
  appState.qualityPreset = QUALITY_PRESETS[level];
  appState.lastAdaptationTime = performance.now();
  appState.adaptationInProgress = true;
  
  // Apply the quality settings
  applyQualitySettings();
  
  // Clear adaptation flag after a delay to prevent rapid changes
  setTimeout(() => {
    appState.adaptationInProgress = false;
  }, 5000);
}

// Apply current quality settings
function applyQualitySettings() {
  const renderer = getRenderer();
  const preset = appState.qualityPreset;
  
  if (renderer) {
    // Update renderer settings
    renderer.setPixelRatio(preset.pixelRatio);
    
    // Apply other renderer settings
    renderer.shadowMap.enabled = preset.shadowsEnabled;
    
    // Force a rendering update
    renderer.clear();
  }
  
  // Apply responsive adjustments
  applyResponsiveAdjustments();
  
  logMessage(`Applied quality settings: ${preset.name}`);
}

// Apply initial settings based on device detection
function applyInitialSettings() {
  // Apply quality settings
  applyQualitySettings();
  
  // Apply responsive adjustments for current device
  applyResponsiveAdjustments();
}

// Apply responsive adjustments based on device type and screen size
function applyResponsiveAdjustments() {
  const renderer = getRenderer();
  const camera = getCamera();
  const controls = getControls();
  
  if (!renderer || !camera) {
    return;
  }
  
  // Update renderer size
  renderer.setSize(appState.screenWidth, appState.screenHeight);
  
  // Update camera aspect ratio
  camera.aspect = appState.aspectRatio;
  camera.updateProjectionMatrix();
  
  // Update control sensitivity based on device type
  if (controls) {
    if (appState.deviceType === 'mobile') {
      // For mobile: increase touch rotation speed, decrease zoom speed
      controls.rotateSpeed = 1.5;
      controls.zoomSpeed = 0.8;
      controls.dampingFactor = 0.1;
    } else if (appState.deviceType === 'tablet') {
      // For tablet: balanced settings
      controls.rotateSpeed = 1.2;
      controls.zoomSpeed = 1.0;
      controls.dampingFactor = 0.15;
    } else {
      // For desktop: try to use dynamic adjustment if available, otherwise use defaults
      try {
        if (typeof updateControlSensitivity === 'function') {
          updateControlSensitivity();
        } else {
          // Apply desktop defaults if the function is not available
          controls.rotateSpeed = 0.8;
          controls.zoomSpeed = 1.0;
          controls.dampingFactor = 0.15;
        }
      } catch (e) {
        // Apply desktop defaults if there's an error
        controls.rotateSpeed = 0.8;
        controls.zoomSpeed = 1.0;
        controls.dampingFactor = 0.15;
      }
    }
  }
  
  // Apply device-specific DOM adjustments
  applyDeviceSpecificLayout();
}

// Apply device-specific layout adjustments to DOM elements
function applyDeviceSpecificLayout() {
  const container = document.getElementById('threeContainer');
  if (!container) return;
  
  // Mobile-specific adjustments
  if (appState.deviceType === 'mobile') {
    // Adjust UI for small screens
    document.body.classList.add('mobile-device');
    document.body.classList.remove('tablet-device', 'desktop-device');
    
    // Adjust any UI element scales/positions for mobile
    const satelliteInfo = document.getElementById('satellite-info');
    if (satelliteInfo) {
      if (appState.orientation === 'portrait') {
        satelliteInfo.style.fontSize = '10px';
        satelliteInfo.style.bottom = '10px';
        satelliteInfo.style.right = '10px';
      } else {
        satelliteInfo.style.fontSize = '12px';
        satelliteInfo.style.bottom = '10px';
        satelliteInfo.style.right = '10px';
      }
    }
  } 
  // Tablet-specific adjustments
  else if (appState.deviceType === 'tablet') {
    document.body.classList.add('tablet-device');
    document.body.classList.remove('mobile-device', 'desktop-device');
    
    // Adjust any UI element scales/positions for tablet
    const satelliteInfo = document.getElementById('satellite-info');
    if (satelliteInfo) {
      satelliteInfo.style.fontSize = '14px';
    }
  } 
  // Desktop-specific adjustments
  else {
    document.body.classList.add('desktop-device');
    document.body.classList.remove('mobile-device', 'tablet-device');
    
    // Reset any UI element scales/positions to defaults
    const satelliteInfo = document.getElementById('satellite-info');
    if (satelliteInfo) {
      satelliteInfo.style.fontSize = '16px';
      satelliteInfo.style.bottom = '20px';
      satelliteInfo.style.right = '20px';
    }
  }
}

// Public API for getting current device properties
export function getDeviceInfo() {
  return {
    type: appState.deviceType,
    orientation: appState.orientation,
    width: appState.screenWidth,
    height: appState.screenHeight,
    aspectRatio: appState.aspectRatio,
    pixelRatio: appState.pixelRatio
  };
}

// Public API for getting current performance metrics
export function getPerformanceInfo() {
  return {
    fps: appState.fps,
    qualityLevel: appState.qualityLevel,
    performanceScore: appState.performanceScore
  };
}

// Enable/disable adaptive quality
export function setAdaptiveQuality(enabled) {
  appState.adaptiveQualityEnabled = enabled;
  logMessage(`Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
}

// Manually set animation speed (used by animation.js)
export function setAnimationSpeed(speed) {
  appState.animationSpeed = Math.max(0.1, Math.min(3.0, speed));
  return appState.animationSpeed;
}

// Get current animation speed factor
export function getAnimationSpeed() {
  return appState.isPaused ? 0 : appState.animationSpeed;
}

// Check if animations should run
export function shouldAnimate() {
  return !appState.isPaused && document.visibilityState !== 'hidden';
}