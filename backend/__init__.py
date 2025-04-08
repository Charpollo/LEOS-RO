"""
LEOS First Orbit - Backend Package
Main package containing all backend components.
"""

from .app import app, create_app
from .config import (
    TIME_SPAN_HOURS, 
    TIME_STEP_SECONDS, 
    COLLISION_DISTANCE_KM,
    ANOMALY_ALT_THRESHOLD_KM,
    SATELLITES_CONFIG,
    DEBUG_MODE,
    PORT,
    HOST
)

__version__ = '1.0.0'
