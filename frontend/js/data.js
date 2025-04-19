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
const SIMULATION_STATUS_CHECK_INTERVAL = 2000; // 2 seconds

// Simulation initialization status
let simulationInitialized = false;
let initializationInProgress = false;

/**
 * Check if the simulation data is initialized and available
 * @returns {Promise<boolean>} - True if simulation is initialized
 */
export async function checkSimulationStatus() {
  try {
    const endpoint = getApiUrl('/api/simulation/status');
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    simulationInitialized = data.initialized;
    initializationInProgress = data.in_progress;
    
    return data;
  } catch (error) {
    logError(`Error checking simulation status: ${error.message}`);
    return { initialized: false, in_progress: false, error: error.message };
  }
}

/**
 * Initialize the simulation data if not already initialized
 * @returns {Promise<boolean>} - True if initialization was triggered or already complete
 */
export async function initializeSimulation() {
  // First check current status
  const status = await checkSimulationStatus();
  
  if (status.initialized) {
    logMessage('Simulation already initialized');
    return true;
  }
  
  if (status.in_progress) {
    logMessage('Simulation initialization already in progress');
    return true;
  }
  
  try {
    // Trigger initialization
    const endpoint = getApiUrl('/init-simulation');
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    logMessage(`Simulation initialization ${data.status}: ${data.message}`);
    return true;
  } catch (error) {
    logError(`Error initializing simulation: ${error.message}`);
    return false;
  }
}

/**
 * Wait for simulation data to be ready with timeout
 * @param {number} timeoutMs - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} - True if simulation is initialized
 */
export async function waitForSimulationReady(timeoutMs = 60000) {
  const startTime = Date.now();
  
  // First attempt to initialize if not already done
  await initializeSimulation();
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await checkSimulationStatus();
    
    if (status.initialized) {
      logMessage('Simulation data is ready');
      return true;
    }
    
    if (!status.in_progress) {
      if (status.error) {
        logError(`Simulation initialization failed: ${status.error}`);
        return false;
      }
      
      // Try to initialize again if not in progress and not initialized
      await initializeSimulation();
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, SIMULATION_STATUS_CHECK_INTERVAL));
    logMessage('Waiting for simulation data...');
  }
  
  logError('Timed out waiting for simulation data');
  return false;
}

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
  
  // Ensure simulation is initialized before fetching data
  await waitForSimulationReady();
  
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
  
  // Ensure simulation is initialized before fetching data
  const simulationReady = await waitForSimulationReady();
  if (!simulationReady) {
    throw new Error(`Simulation data not ready. Please refresh the page.`);
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

// Collection of space facts to display during loading
export const SPACE_FACTS = [
  "The International Space Station orbits Earth every 90 minutes, traveling at 17,500 mph (28,000 km/h).",
  "A day on Venus is longer than a year on Venus. It takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun.",
  "If you could fly a plane to Pluto, it would take over 800 years to get there.",
  "There are more stars in the universe than grains of sand on all of Earth's beaches combined.",
  "The footprints left by the Apollo astronauts on the Moon will likely stay there for at least 100 million years.",
  "The largest volcano in our solar system, Olympus Mons on Mars, is about 3 times taller than Mount Everest.",
  "The Great Red Spot on Jupiter is a storm that has been raging for at least 400 years.",
  "The Hubble Space Telescope has made over 1.5 million observations since its launch in 1990.",
  "A neutron star is so dense that a teaspoon would weigh about a billion tons on Earth.",
  "The Sun loses 4 million tons of mass every second due to nuclear fusion reactions.",
  "Saturn's rings are made mostly of ice and are only about 10 meters thick in most places.",
  "More energy from sunlight strikes Earth in one hour than humanity uses in an entire year.",
  "There are likely more than 100 billion galaxies in the observable universe.",
  "The coldest place in the universe that we know of is the Boomerang Nebula, at -458°F (-272°C).",
  "Light from the Sun takes about 8 minutes to reach Earth.",
  "The largest known star, UY Scuti, is more than 1,700 times the size of our Sun.",
  "A single space shuttle launch required around 720,000 gallons (2.7 million liters) of rocket fuel.",
  "The Milky Way is estimated to contain 100-400 billion stars.",
  "The Moon is moving away from Earth at a rate of about 3.8 cm per year.",
  "The Voyager 1 spacecraft, launched in 1977, is the most distant human-made object from Earth.",
  "There is a planet made mostly of diamond, known as 55 Cancri e.",
  "The Andromeda Galaxy is on a collision course with the Milky Way (in about 4 billion years).",
  "Our solar system is traveling through the galaxy at about 500,000 mph (800,000 km/h).",
  "Astronauts can grow up to 2 inches (5 cm) taller in space due to the spine stretching in microgravity.",
  "The largest crater on the Moon, the South Pole-Aitken Basin, is about 1,600 miles (2,500 km) across.",
  "The first photograph of Earth from the Moon was taken by the Lunar Orbiter 1 spacecraft in 1966.",
  "The core of Jupiter is hotter than the surface of the Sun.",
  "A year on Saturn is equivalent to about 29.5 Earth years.",
  "Saturn's moon Titan has rivers, lakes, and seas made of liquid methane.",
  "A 'day' on the International Space Station consists of 16 sunrises and sunsets."
];

// Utility function to get a random fact
export function getRandomSpaceFact() {
  const randomIndex = Math.floor(Math.random() * SPACE_FACTS.length);
  return SPACE_FACTS[randomIndex];
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
  window.checkSimStatus = checkSimulationStatus;
}
