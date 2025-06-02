// Constants for the simulation
export const EARTH_RADIUS = 6371; // km
export const EARTH_SCALE = 1 / EARTH_RADIUS; // 1 Babylon unit = 6371 km
export const MIN_LEO_ALTITUDE_KM = 160; // Minimum altitude above Earth surface for LEO
export const MOON_DISTANCE = 384400 * EARTH_SCALE;
export const MOON_SCALE = 0.27;

// Simulation constants
export const TIME_ACCELERATION = 60; // 60:1 time acceleration (1 minute of real time = 1 second in simulation)

// LOS (Line of Sight) constants - CENTRALIZED CONFIGURATION
export const LOS_MAX_KM = 125; // Max LOS distance for ground station-satellite links in km
export const LOS_MAX_BABYLON = LOS_MAX_KM * EARTH_SCALE; // Max LOS distance in Babylon units

// LOS Visual Configuration
export const LOS_BEAM_CONFIG = {
  // Automatic LOS beams (always visible)
  auto: {
    radius: 0.005,
    color: { r: 0, g: 1, b: 0 }, // Green
    alpha: 0.8,
    enabled: true
  },
  // Dashboard LOS lines (when ground station is selected)
  dashboard: {
    color: { r: 0, g: 1, b: 0 }, // Green  
    pulseSpeed: 0.005,
    pulseRange: { min: 0.5, max: 1.0 },
    enabled: true
  },
  // Coverage circles on Earth surface
  coverage: {
    segments: 128,
    color: { r: 0, g: 1, b: 0 }, // Green
    enabled: true
  }
};
