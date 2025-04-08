/**
 * LEOS First Orbit - Data Management Module
 * Handles data fetching and processing of trajectory and telemetry data
 */
import { DEBUG_MODE } from './config.js';
import { logMessage, logError, getApiUrl } from './utils.js';

// Data caches
const telemetryCache = new Map();
const simulationCache = new Map();
const trajectoriesCache = new Map();

// Cache expiration times (milliseconds)
const TELEMETRY_CACHE_DURATION = 5000;  // 5 seconds
const TRAJECTORY_CACHE_DURATION = 60000;  // 1 minute - shortened for more frequent refreshes

/**
 * Fetch satellite telemetry with caching
 * @param {string} satName - Satellite name
 * @returns {Promise<Object>} - Telemetry data
 */
export async function fetchTelemetry(satName) {
  // Check cache first
  const cacheKey = `telemetry_${satName.toLowerCase()}`;
  const cachedData = telemetryCache.get(cacheKey);
  
  if (cachedData && Date.now() - cachedData.timestamp < TELEMETRY_CACHE_DURATION) {
    return cachedData.data;
  }
  
  // If not in cache or expired, fetch from API
  const endpoint = getApiUrl(`/api/telemetry/${satName.toLowerCase()}`);
  
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store in cache with timestamp
    telemetryCache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    logError(`Error fetching telemetry for ${satName}: ${error.message}`);
    
    // If we have expired cache data, return it as fallback
    if (cachedData) {
      logMessage(`Using expired cache data for ${satName} telemetry`);
      return cachedData.data;
    }
    
    // No fallback data - force a proper error to be handled
    throw new Error(`Failed to fetch telemetry data for ${satName}`);
  }
}

/**
 * Fetch satellite trajectory data with caching
 * @param {string} satName - Satellite name
 * @returns {Promise<Array>} - Trajectory data points
 */
export async function fetchTrajectory(satName) {
  // Check cache first
  const cacheKey = `trajectory_${satName.toLowerCase()}`;
  const cachedData = trajectoriesCache.get(cacheKey);
  
  if (cachedData && Date.now() - cachedData.timestamp < TRAJECTORY_CACHE_DURATION) {
    return cachedData.data;
  }
  
  // If not in cache or expired, fetch from API
  const endpoint = getApiUrl(`/api/starpath/${satName.toLowerCase()}`);
  
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate the data
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`Invalid trajectory data for ${satName}`);
    }
    
    // Ensure all trajectory points have required fields
    const validData = data.filter(point => {
      return point && 
             Array.isArray(point.position) && 
             point.position.length === 3 &&
             !point.position.some(p => isNaN(p) || !isFinite(p));
    });
    
    if (validData.length === 0) {
      throw new Error(`No valid trajectory points for ${satName}`);
    }
    
    // Store in cache with timestamp
    trajectoriesCache.set(cacheKey, {
      data: validData,
      timestamp: Date.now()
    });
    
    logMessage(`Fetched trajectory for ${satName} with ${validData.length} points`);
    return validData;
  } catch (error) {
    logError(`Error fetching trajectory for ${satName}: ${error.message}`);
    
    // If we have expired cache data, return it as fallback
    if (cachedData) {
      logMessage(`Using expired cache data for ${satName} trajectory`);
      return cachedData.data;
    }
    
    // No fallback data - force a proper error to be handled
    throw new Error(`Failed to fetch trajectory data for ${satName}`);
  }
}

/**
 * Refresh all satellite data
 * Forces a reload of all trajectory data
 */
export function refreshAllData() {
  // Clear trajectory cache to force reload
  trajectoriesCache.clear();
  logMessage("Trajectory cache cleared - data will be refreshed on next request");
  return true;
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  telemetryCache.clear();
  simulationCache.clear();
  trajectoriesCache.clear();
  logMessage("All data caches cleared");
}

// Debug function to check cache status
if (DEBUG_MODE) {
  window.checkCacheStatus = () => {
    return {
      telemetryCache: {
        size: telemetryCache.size,
        keys: [...telemetryCache.keys()]
      },
      trajectoriesCache: {
        size: trajectoriesCache.size,
        keys: [...trajectoriesCache.keys()]
      }
    };
  };
  
  window.forceTrajectoriesRefresh = refreshAllData;
}
