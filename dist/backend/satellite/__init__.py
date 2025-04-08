"""
LEOS First Orbit - Satellite Package
Contains modules for satellite orbit, telemetry, and TLE generation.
"""

from .tle_generator import generate_tle_for_satellite
from .orbit import (
    calculate_altitude, 
    check_collision, 
    fix_altitude,
    propagate_satellite,
    generate_orbit_points
)
from .telemetry import generate_subsystem_telemetry
