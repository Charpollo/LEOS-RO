// Constants for the simulation
export const EARTH_RADIUS_KM = 6371; // km - Earth's radius
export const EARTH_MU = 398600.4418; // km^3/s^2
export const EARTH_SCALE = 1 / EARTH_RADIUS_KM; // 1 Babylon unit = 6371 km

// Visual Earth rendering constants
// The Earth mesh core radius is 1.0 Babylon units, but with atmosphere layers 
// the visual surface appears at radius ~1.025 Babylon units
export const EARTH_CORE_RADIUS = 1.0; // Babylon units (mathematical Earth surface)
export const EARTH_VISUAL_SURFACE_RADIUS = 1.025; // Babylon units (includes atmosphere rendering)
export const ORBIT_SCALE = 5.0; // Visual scaling for orbits

// Scaling for satellite positions to appear at correct visual altitude above Earth's surface
export const MIN_LEO_ALTITUDE_KM = 160; // Minimum altitude above Earth surface for LEO
export const MOON_DISTANCE = 384400 * EARTH_SCALE;
export const MOON_SCALE = 0.27;

export const TIME_ACCELERATION = 60; // 60:1 time acceleration (1 minute of real time = 1 second in simulation)

// LOS (Line of Sight) constants - CENTRALIZED CONFIGURATION
export const LOS_DEFAULT_KM = 37.8; // Default/fallback LOS distance in km
export const LOS_DEFAULT_BABYLON = LOS_DEFAULT_KM * EARTH_SCALE; // Default LOS distance in Babylon units

// Helper function to calculate horizon distance based on elevation
export function calculateHorizonDistance(elevationKm) {
  return Math.sqrt((EARTH_RADIUS_KM + elevationKm) * (EARTH_RADIUS_KM + elevationKm) - EARTH_RADIUS_KM * EARTH_RADIUS_KM);
}

// LOS Visual Configuration
export const LOS_BEAM_CONFIG = {
  // Automatic LOS beams (always visible)
  auto: {
    radius: 0.008,
    color: { r: 0, g: 1, b: 0 }, // Bright green
    alpha: 0.9,
    enabled: true,
    // Enhanced connection line settings
    dotted: true,
    segmentCount: 16, // More segments for smoother dotted effect
    segmentGap: 0.3, // Gap between segments for dotted appearance
    pulseSpeed: 0.004,
    dataTransmission: true,
    particleSize: 0.003,
    lineWidth: 3.0, // Thicker lines for better visibility
    minVisibility: 0.4 // Minimum alpha to ensure visibility
  },
  // Dashboard LOS lines (when ground station is selected)
  dashboard: {
    color: { r: 0, g: 1, b: 0 }, // Bright green  
    pulseSpeed: 0.006,
    pulseRange: { min: 0.6, max: 1.0 },
    lineWidth: 2.5,
    enabled: true
  },
  // Coverage circles on Earth surface
  coverage: {
    segments: 128,
    color: { r: 0, g: 1, b: 0 },
    enabled: true
  }
};
