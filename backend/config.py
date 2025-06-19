"""
LEOS First Orbit - Configuration Module
Contains global settings and constants for the application.
"""

import os
import random

# Try to load dotenv, but don't fail if it's not available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # If dotenv is not installed, just continue without it
    print("Note: python-dotenv not found. Using environment variables directly.")

# Engine configuration
ENGINE_TYPE = os.environ.get('ENGINE_TYPE', 'default')  # 'default' or 'external'
EXTERNAL_ENGINE_URL = os.environ.get('EXTERNAL_ENGINE_URL', 'http://localhost:5001')

# Time settings - Optimized for performance
TIME_SPAN_HOURS = int(os.environ.get("SIMULATION_HOURS", "2"))  # Reduced from 24 to 2 hours for performance
TIME_STEP_SECONDS = int(os.environ.get("TIME_STEP_SECONDS", "60"))  # Increased from 5 to 60 seconds for performance
EARTH_GM = 398600.4418  # Earth's gravitational constant (km³/s²)

# Randomization ranges for satellite parameters
LEO_MIN_ALTITUDE = 400  # Minimum altitude for LEO satellite in km
LEO_MAX_ALTITUDE = 700  # Maximum altitude for LEO satellite in km
MIN_INCLINATION = 30.0  # Minimum inclination in degrees
MAX_INCLINATION = 85.0  # Maximum inclination in degrees

# Earth configuration
EARTH_RADIUS_KM = 6371  # Earth's mean radius in kilometers
COLLISION_DISTANCE_KM = 5.0  # Minimum distance to register collision (km)
ANOMALY_ALT_THRESHOLD_KM = 300.0  # Altitude below which anomaly is registered

# Function to generate random satellite parameters
def generate_random_satellite_params():
    """Generate a comprehensive set of satellites for SDA visualization"""
    satellites = {}
    
    # Core mission satellites
    satellites.update({
        "CRTS1": {
            "altitude_km": random.randint(LEO_MIN_ALTITUDE, LEO_MAX_ALTITUDE),
            "inclination_deg": random.uniform(MIN_INCLINATION, MAX_INCLINATION),
            "description": "CRTS-1 (Cosmic Ray Test Satellite)"
        },
        "BULLDOG": {
            "altitude_km": random.randint(LEO_MIN_ALTITUDE, LEO_MAX_ALTITUDE),
            "inclination_deg": random.uniform(MIN_INCLINATION, MAX_INCLINATION),
            "description": "BULLDOG (Basic Utility Low-orbit Demonstration & Operations Gateway)"
        }
    })
    
    # Generate Starlink-like constellation (LEO)
    for i in range(1, 501):  # 500 Starlink satellites
        satellites[f"STARLINK-{i}"] = {
            "altitude_km": random.randint(540, 570),  # Starlink altitude range
            "inclination_deg": random.choice([53.0, 70.0, 97.6]),  # Starlink orbital planes
            "description": f"Starlink constellation satellite {i}"
        }
    
    # Generate GPS constellation (MEO)  
    for i in range(1, 33):  # 32 GPS satellites
        satellites[f"GPS-{i}"] = {
            "altitude_km": 20200,  # GPS altitude
            "inclination_deg": 55.0,  # GPS inclination
            "description": f"GPS navigation satellite {i}"
        }
    
    # Generate geostationary satellites
    for i in range(1, 51):  # 50 GEO satellites
        satellites[f"GEO-{i}"] = {
            "altitude_km": 35786,  # GEO altitude
            "inclination_deg": random.uniform(0, 5),  # Near-equatorial
            "description": f"Geostationary satellite {i}"
        }
    
    # Generate various LEO satellites
    for i in range(1, 201):  # 200 misc LEO satellites
        satellites[f"LEO-{i}"] = {
            "altitude_km": random.randint(200, 2000),
            "inclination_deg": random.uniform(0, 180),
            "description": f"LEO satellite {i}"
        }
    
    # Generate space debris objects
    for i in range(1, 301):  # 300 debris objects
        satellites[f"DEBRIS-{i}"] = {
            "altitude_km": random.randint(300, 1500),
            "inclination_deg": random.uniform(0, 180),
            "description": f"Space debris object {i}"
        }
    
    return satellites

# Satellite configurations - initialize with fixed values but will be randomized at runtime
SATELLITES_CONFIG = {
    "CRTS1": {
        "altitude_km": 550,
        "inclination_deg": 51.6,
        "description": "CRTS-1 (Cosmic Ray Test Satellite)"
    },
    "BULLDOG": {
        "altitude_km": 530,
        "inclination_deg": 52.0,
        "description": "BULLDOG (Basic Utility Low-orbit Demonstration & Operations Gateway)"
    }
}

# Flask configuration
DEBUG_MODE = os.environ.get("DEBUG", "False").lower() == "true"
PORT = int(os.environ.get("PORT", 5000))
HOST = "0.0.0.0"  # Listen on all interfaces
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
STATIC_URL_PATH = ''
