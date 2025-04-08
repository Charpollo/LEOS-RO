/**
 * LEOS First Orbit - Data Loader Module
 * Handles loading and processing of simulation data
 */

import { getApiUrl, logMessage } from './utils.js';
import { 
  CRTS1_COLOR, 
  BULLDOG_COLOR 
} from './config.js';
import { createSatellite } from './satellites.js';
import { setTotalSteps } from './animation.js';
import { getScene } from './scene.js';

// Cache for downloaded data
let cachedData = {};

// Load simulation data for all satellites
export function loadSimulationData() {
  logMessage("Loading simulation data...");
  
  // Display loading overlay
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingStatus = document.getElementById("loadingStatus");
  
  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
  }
  
  if (loadingStatus) {
    loadingStatus.textContent = "Loading simulation data...";
  }
  
  // Start both data downloads in parallel with uppercase names
  return Promise.all([
    fetchSatelliteData("CRTS1"),
    fetchSatelliteData("BULLDOG")
  ])
  .then(([crts1Data, bulldogData]) => {
    if (loadingStatus) {
      loadingStatus.textContent = "Creating satellites...";
    }
    
    // Build satellites from the data
    return buildSatellitesFromData({
      CRTS1: crts1Data,
      BULLDOG: bulldogData
    });
  })
  .then(satellites => {
    if (loadingStatus) {
      loadingStatus.textContent = "Simulation data loaded successfully!";
    }
    
    // Hide loading overlay
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.display = "none";
      }, 1000);
    }
    
    logMessage("Simulation data loaded successfully");
    return satellites;
  })
  .catch(error => {
    logMessage(`Error loading simulation data: ${error.message}`);
    
    if (loadingStatus) {
      loadingStatus.textContent = `Error: ${error.message}`;
    }
    
    // Show error in overlay
    const errorContainer = document.getElementById("errorContainer");
    if (errorContainer) {
      errorContainer.textContent = `Failed to load simulation data: ${error.message}`;
      errorContainer.style.display = "block";
      
      // Hide error after 10 seconds
      setTimeout(() => {
        errorContainer.style.display = "none";
      }, 10000);
    }
    
    throw error;
  });
}

// Fetch data for a specific satellite
function fetchSatelliteData(satName) {
  // Use cached data if available
  if (cachedData[satName]) {
    logMessage(`Using cached data for ${satName}`);
    return Promise.resolve(cachedData[satName]);
  }
  
  const endpoint = getApiUrl(`/api/starpath/${satName}`);
  
  logMessage(`Fetching data for ${satName} from ${endpoint}`);
  
  return fetch(endpoint)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API returned ${response.status} for ${satName}`);
      }
      return response.json();
    })
    .then(data => {
      // Cache the data
      cachedData[satName] = data;
      logMessage(`Received ${data.length} data points for ${satName}`);
      return data;
    });
}

// Build satellite objects from simulation data
function buildSatellitesFromData(allData) {
  logMessage("Building satellites from simulation data");
  
  // Get scene
  const scene = getScene();
  if (!scene) {
    throw new Error("Scene not available for satellite creation");
  }
  
  // Create satellites
  const satellites = [];
  
  // Create CRTS1 satellite
  if (allData.CRTS1 && allData.CRTS1.length > 0) {
    const crts1 = createSatellite("CRTS1", CRTS1_COLOR, allData.CRTS1);
    satellites.push(crts1);
  } else {
    logMessage("No data available for CRTS1");
  }
  
  // Create BULLDOG satellite
  if (allData.BULLDOG && allData.BULLDOG.length > 0) {
    const bulldog = createSatellite("BULLDOG", BULLDOG_COLOR, allData.BULLDOG);
    satellites.push(bulldog);
  } else {
    logMessage("No data available for BULLDOG");
  }
  
  // Find maximum number of data points to determine total animation steps
  let maxDataPoints = 0;
  for (const key in allData) {
    if (allData[key] && allData[key].length > maxDataPoints) {
      maxDataPoints = allData[key].length;
    }
  }
  
  // Set total animation steps
  setTotalSteps(maxDataPoints);
  
  // Store data for reference
  window.sceneUIData = allData;
  
  return satellites;
}
