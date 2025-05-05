/**
 * LEOS First Orbit - Configuration Module
 * Contains all configuration constants used across the application
 */

// Animation and timing constants
export const ANIMATION_SPEED = 0.5; // Slowed down by 4x (was 2)
export const INTERPOLATION_STEPS = 240;
export const ANIMATION_SMOOTHING = 0.15; 
export const ORBIT_LINE_SMOOTHNESS = 200; // Reduced from 1440 for smoother rendering
export const MAX_LOG_ENTRIES = 1000;
export const LABEL_SCALE = 1.0;

// Earth and space constants
export const EARTH_ROTATION_SPEED = 0.00002; // Slowed down by 10x (was 0.0002)
export const CLOUD_ROTATION_SPEED = 0.000028; // Clouds 40% faster than Earth (was 20% faster)

// Satellite orbit timing constants
// In reality, LEO satellites orbit Earth in ~90 minutes while Earth rotates in 24 hours (16 orbits per day)
// We'll scale satellite speed to match this relationship with our slowed Earth rotation
export const SATELLITE_ORBIT_SPEED_FACTOR = 0.010; // Adjusted to match realistic LEO to Earth rotation ratio

// Real Earth radius in kilometers
export const EARTH_RADIUS_KM = 6378;

// Scale factor for visualization - used to scale everything consistently
export const VISUALIZATION_SCALE = 0.001; // 1 unit = 1000 km

// Earth display radius in scene units
export const EARTH_RADIUS = EARTH_RADIUS_KM * VISUALIZATION_SCALE;
export const EARTH_DISPLAY_RADIUS = EARTH_RADIUS;

// Camera settings scaled appropriately
export const CAMERA_INITIAL_DISTANCE = EARTH_RADIUS * 3.5;
export const MIN_CAMERA_DISTANCE = EARTH_DISPLAY_RADIUS * 1.1;
export const MAX_CAMERA_DISTANCE = EARTH_DISPLAY_RADIUS * 20;
export const LABEL_SIZE = 0.1;
export const CAMERA_FOLLOW_OFFSET = 4.0; // Distance behind satellite when following

// Debugging options
export const DEBUG_MODE = false;
export const DEBUG_API_REQUESTS = false;

// Orbit distance multiplier
export const ORBIT_DISTANCE_MULTIPLIER = VISUALIZATION_SCALE; // Use the same scale factor for consistency
export const FORCE_CORRECT_ALTITUDE = true;

// Development visualization options - significantly reduced sizes
export const SATELLITE_INDICATOR_SIZE = 0.04; // Reduced from previous value
export const ORBIT_LINE_WIDTH = 1.5; // Thinner orbit lines for better appearance
export const ORBIT_LINE_OPACITY = 0.5; // More transparent orbit lines
export const SATELLITE_SCALE = 0.015; // Further reduced from 0.03 for much smaller satellite models
export const CRTS1_SCALE = 0.008; // Further reduced from 0.015 for even smaller CRTS1 model
export const DEV_MARKER_SIZE = 0.025; // Reduced from previous value

// Trail effect configuration
export const ORBIT_TRAIL_ENABLED = true;
export const TRAIL_LENGTH = 500; // Number of points in the trail
export const TRAIL_FADE_START = 0.8; // Position in the trail where fade starts (0-1)
export const ORBIT_TRAIL_WIDTH = 2.5; // Width of the trail
export const TRAIL_MAX_PERCENTAGE = 0.8; // Only show up to 80% of the orbit path

// Moon constants - scaled appropriately
export const MOON_DISTANCE = 384400 * VISUALIZATION_SCALE;
export const MOON_RADIUS = 1737.4 * VISUALIZATION_SCALE;
export const MOON_ROTATION_SPEED = 0.0000007; // Proportionally slowed down
export const MOON_SCALE = 1.0;

// UI constants
export const LABEL_OFFSET = new THREE.Vector3(0, EARTH_RADIUS * 0.03, 0);
export const PARTIAL_TAIL_FRACTION = 0.2;

// Satellite colors
export const CRTS1_COLOR = 0xffa500; // Orange
export const BULLDOG_COLOR = 0x03cafc; // Cyan/Blue

// Camera follow settings
export const FOLLOW_OFFSET = new THREE.Vector3(0, EARTH_RADIUS * 0.02, EARTH_RADIUS * 0.05);

// Asset paths
export const ASSET_PATHS = {
  CRTS_SATELLITE: "assets/crts_satellite.glb",
  BULLDOG_SATELLITE: "assets/bulldog_sat.glb",
  EARTH_DIFFUSE: "assets/earth_diffuse.jpg",
  EARTH_CLOUDS: "assets/earth_clouds.jpg",
  EARTH_NIGHT: "assets/earth_night.jpg",
  EARTH_SPECULAR: "assets/earth_specular.tif",
  MOON_TEXTURE: "assets/moon_texture.jpg",
  STARS: "assets/stars.jpg",
  SUN: "assets/sun.jpg"
}
