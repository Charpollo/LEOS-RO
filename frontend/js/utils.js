/**
 * LEOS First Orbit - Utilities Module
 * Utility functions used throughout the application
 */

import { DEBUG_MODE, LABEL_SCALE, DEBUG_API_REQUESTS } from './config.js';

// Debugging levels
export const DEBUG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current debugging level (default to highest in dev)
export const CURRENT_DEBUG_LEVEL = DEBUG_MODE ? DEBUG_LEVEL.DEBUG : DEBUG_LEVEL.ERROR;

// Store debug logs in memory for download
const debugLogs = [];
const MAX_DEBUG_LOGS = 1000;

// DOM utilities
export function getWidth() { 
  return document.getElementById("threeContainer").clientWidth; 
}

export function getHeight() { 
  return document.getElementById("threeContainer").clientHeight; 
}

export function getAspect() { 
  return getWidth() / getHeight(); 
}

// Enhanced logging function with levels and debug panel integration
export function logMessage(msg, level = DEBUG_LEVEL.INFO, obj = null) { 
  // Always log to console
  if (level === DEBUG_LEVEL.ERROR) {
    console.error(msg, obj || '');
  } else if (level === DEBUG_LEVEL.WARN) {
    console.warn(msg, obj || '');
  } else if (level === DEBUG_LEVEL.DEBUG) {
    console.debug(msg, obj || '');
  } else {
    console.log(msg, obj || '');
  }
  
  // Add timestamp to the message
  const timestamp = new Date().toISOString().substr(11, 12);
  const fullMsg = `${timestamp} - ${msg}`;
  
  // Store in debug logs memory
  const logEntry = {
    time: timestamp,
    message: msg,
    level: level,
    object: obj ? JSON.stringify(obj) : null
  };
  
  debugLogs.push(logEntry);
  
  // Keep log size reasonable
  if (debugLogs.length > MAX_DEBUG_LOGS) {
    debugLogs.shift();
  }
  
  // Add to debug panel
  const debugContent = document.getElementById("debugContent");
  if (debugContent) {
    const entry = document.createElement("div");
    entry.className = "debug-entry";
    
    // Add level-specific class
    if (level === DEBUG_LEVEL.ERROR) {
      entry.classList.add("debug-error");
    } else if (level === DEBUG_LEVEL.WARN) {
      entry.classList.add("debug-warn");
    } else if (level === DEBUG_LEVEL.INFO) {
      entry.classList.add("debug-info");
    }
    
    const timeSpan = document.createElement("span");
    timeSpan.className = "debug-time";
    timeSpan.textContent = timestamp;
    
    const msgSpan = document.createElement("span");
    msgSpan.textContent = msg;
    
    entry.appendChild(timeSpan);
    entry.appendChild(msgSpan);
    
    // Add object data if present
    if (obj) {
      const objPre = document.createElement("pre");
      objPre.textContent = JSON.stringify(obj, null, 2);
      objPre.style.marginTop = "4px";
      objPre.style.fontSize = "10px";
      entry.appendChild(objPre);
    }
    
    debugContent.prepend(entry);
    
    // Limit entries in the debug panel
    while (debugContent.children.length > 100) {
      debugContent.removeChild(debugContent.lastChild);
    }
  }
  
  // Also log to UI if in debug mode and it's an important message
  if (DEBUG_MODE && level <= DEBUG_LEVEL.INFO) {
    const logDiv = document.getElementById("telemetrySection");
    if (logDiv) {
      const logEntry = document.createElement("div");
      logEntry.className = "log-entry";
      
      if (level === DEBUG_LEVEL.ERROR) {
        logEntry.classList.add("error-message");
      } else if (level === DEBUG_LEVEL.WARN) {
        logEntry.classList.add("warning-message");
      }
      
      logEntry.textContent = msg;
      logDiv.prepend(logEntry);
    }
  }
}

// Error logging convenience function
export function logError(msg, obj = null) {
  logMessage(`ERROR: ${msg}`, DEBUG_LEVEL.ERROR, obj);
}

// Warning logging convenience function
export function logWarning(msg, obj = null) {
  logMessage(`WARNING: ${msg}`, DEBUG_LEVEL.WARN, obj);
}

// Debug logging convenience function
export function logDebug(msg, obj = null) {
  if (msg.includes('API Request URL') && !DEBUG_API_REQUESTS) {
    return; // Skip logging API request URLs if DEBUG_API_REQUESTS is false
  }
  logMessage(msg, DEBUG_LEVEL.DEBUG, obj);
}

// Make URLs relative to support both local and cloud deployment
export function getApiUrl(endpoint) {
  // Get the current base URL (protocol, hostname, port)
  const baseUrl = window.location.origin;
  
  // Ensure endpoint starts with a slash
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  
  // Log the constructed URL for debugging
  logDebug(`API Request URL: ${baseUrl}${endpoint}`);
  
  // Return the full URL
  return baseUrl + endpoint;
}

// Download debug logs as a JSON file
export function downloadDebugLogs() {
  const dataStr = JSON.stringify(debugLogs, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportName = `leos-debug-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportName);
  linkElement.click();
}

// Clear debug logs
export function clearDebugLogs() {
  debugLogs.length = 0;
  const debugContent = document.getElementById("debugContent");
  if (debugContent) {
    debugContent.innerHTML = '';
  }
}

// Run system diagnostics
export function runSystemDiagnostics() {
  logMessage("Running system diagnostics...", DEBUG_LEVEL.INFO);
  
  // Check WebGL compatibility
  checkWebGLCompatibility();
  
  // Check if all required assets exist
  checkRequiredAssets();
  
  // Get system capabilities
  getSystemCapabilities();
  
  // Check if API endpoints are reachable
  checkApiEndpoints();
  
  logMessage("System diagnostics complete", DEBUG_LEVEL.INFO);
}

// Check WebGL compatibility
function checkWebGLCompatibility() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      logError("WebGL not supported by browser");
      return false;
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let vendorInfo = "Unknown";
    let rendererInfo = "Unknown";
    
    if (debugInfo) {
      vendorInfo = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      rendererInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    
    logMessage(`WebGL supported - Vendor: ${vendorInfo}, Renderer: ${rendererInfo}`, DEBUG_LEVEL.INFO);
    
    // Check WebGL extensions
    const extensions = gl.getSupportedExtensions();
    logDebug("WebGL extensions:", extensions);
    
    return true;
  } catch (error) {
    logError("Error checking WebGL compatibility", error);
    return false;
  }
}

// Check if all required assets exist
function checkRequiredAssets() {
  const requiredAssets = [
    "assets/earth_diffuse.png",
    "assets/earth_clouds.jpg",
    "assets/stars.jpg",
    "assets/moon_texture.jpg",
    "assets/leos_logo.png"
  ];
  
  requiredAssets.forEach(asset => {
    fetch(asset)
      .then(response => {
        if (response.ok) {
          logDebug(`Asset check: ${asset} - OK`);
        } else {
          logWarning(`Asset check: ${asset} - NOT FOUND (${response.status})`);
        }
      })
      .catch(error => {
        logError(`Asset check: ${asset} - ERROR`, error);
      });
  });
}

// Get system capabilities
function getSystemCapabilities() {
  const capabilities = {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    touchSupport: ('ontouchstart' in window),
    connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
    language: navigator.language,
    platform: navigator.platform,
    cookies: navigator.cookieEnabled
  };
  
  logMessage("System capabilities:", DEBUG_LEVEL.INFO, capabilities);
}

// Check if API endpoints are reachable
function checkApiEndpoints() {
  const endpoints = [
    "/api/simulation_data",
    "/api/tle",
    "/api/telemetry",
    "/api/starpath/CRTS1",
    "/api/starpath/BULLDOG",
    "/api/scene_ui_data"
  ];
  
  endpoints.forEach(endpoint => {
    fetch(getApiUrl(endpoint))
      .then(response => {
        const status = response.ok ? 'OK' : 'ERROR';
        const msg = `API check: ${endpoint} - ${status} (${response.status})`;
        if (response.ok) {
          logDebug(msg);
          // For data endpoints, let's check what data we're getting back
          if (endpoint.includes('starpath')) {
            response.json()
              .then(data => {
                logDebug(`API data for ${endpoint}:`, data ? {dataPoints: data.length, sample: data.slice(0, 1)} : null);
              })
              .catch(error => {
                logError(`Failed to parse JSON for ${endpoint}`, error);
              });
          }
        } else {
          logWarning(msg);
        }
      })
      .catch(error => {
        logError(`API check: ${endpoint} - NETWORK ERROR`, error);
      });
  });
}

// Text sprite utilities
export function createTextSprite(message, fontSize=32) {
  const texture = makeLabelCanvas(message, fontSize);
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    opacity: 0.9
  });
  
  const sprite = new THREE.Sprite(material);
  // Scale based on canvas size
  const width = texture.image.width;
  const height = texture.image.height;
  sprite.scale.set(width * 0.7 * LABEL_SCALE, height * 0.7 * LABEL_SCALE, 1);
  
  return sprite;
}

export function makeLabelCanvas(txt, fontSize=24) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `${fontSize}px Arial`;
  
  // Calculate size needed for text
  const lines = txt.split("\n");
  let maxWidth = 0;
  
  lines.forEach(line => {
    const metrics = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, metrics.width);
  });
  
  const lineHeight = fontSize + 10;
  canvas.width = Math.ceil(maxWidth + 20);
  canvas.height = Math.ceil(lines.length * lineHeight + 10);
  
  // Render text
  const ctx2 = canvas.getContext("2d");
  ctx2.font = `${fontSize}px Arial`;
  ctx2.fillStyle = "rgba(0,0,0,0.6)";
  ctx2.fillRect(0, 0, canvas.width, canvas.height);
  ctx2.fillStyle = "#fff";
  
  lines.forEach((line, i) => {
    ctx2.fillText(line, 10, (i + 1) * lineHeight - 5);
  });
  
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Date formatting for logs
export function formatDate(date) {
  return date.toISOString().substr(11, 8); // Extract just the time HH:MM:SS
}
