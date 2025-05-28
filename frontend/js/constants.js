// Constants for the simulation
export const EARTH_RADIUS = 6371; // km
export const EARTH_SCALE = 1 / EARTH_RADIUS; // 1 Babylon unit = 6371 km
export const MIN_LEO_ALTITUDE_KM = 160; // Minimum altitude above Earth surface for LEO
export const MOON_DISTANCE = 384400 * EARTH_SCALE;
export const MOON_SCALE = 0.27;

// Simulation constants
export const TIME_ACCELERATION = 60; // 60:1 time acceleration (1 minute of real time = 1 second in simulation)
