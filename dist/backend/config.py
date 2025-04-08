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

# Time settings
TIME_SPAN_HOURS = int(os.environ.get("SIMULATION_HOURS", "24"))  # Changed from 6 to 24 hours
TIME_STEP_SECONDS = int(os.environ.get("TIME_STEP_SECONDS", "5"))  # Time step for simulation
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
    return {
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
    }

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
