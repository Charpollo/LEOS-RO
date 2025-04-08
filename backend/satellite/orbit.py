"""
LEOS First Orbit - Orbit Calculations Module
Functions for calculating orbital parameters and positions with high fidelity.
"""
import math
import logging
from datetime import datetime, timedelta
import numpy as np
from skyfield.api import load, EarthSatellite, utc
from ..config import EARTH_RADIUS_KM

logger = logging.getLogger(__name__)

def calculate_altitude(position_vector):
    """
    Calculate altitude from position vector.
    
    Args:
        position_vector: [x, y, z] coordinates in km
        
    Returns:
        Altitude in km above Earth's surface
    """
    px, py, pz = position_vector
    r = math.sqrt(px**2 + py**2 + pz**2)
    alt = r - EARTH_RADIUS_KM
    return alt

def calculate_velocity_magnitude(velocity_vector):
    """
    Calculate velocity magnitude from velocity vector.
    
    Args:
        velocity_vector: [vx, vy, vz] velocity components in km/s
        
    Returns:
        Velocity magnitude in km/s
    """
    vx, vy, vz = velocity_vector
    return math.sqrt(vx**2 + vy**2 + vz**2)

def check_collision(position_a, position_b, threshold_km):
    """
    Check if two satellites are within collision distance.
    
    Args:
        position_a: Position vector [x, y, z] for satellite A
        position_b: Position vector [x, y, z] for satellite B
        threshold_km: Collision threshold distance in km
        
    Returns:
        Distance if collision detected, None otherwise
    """
    dx = position_a[0] - position_b[0]
    dy = position_a[1] - position_b[1]
    dz = position_a[2] - position_b[2]
    dist = math.sqrt(dx*dx + dy*dy + dz*dz)
    
    if dist < threshold_km:
        return dist
    return None

def fix_altitude(position, target_altitude_km):
    """
    Fix a position vector to have the desired altitude.
    
    Args:
        position: Position vector [x, y, z]
        target_altitude_km: Desired altitude in km
        
    Returns:
        Adjusted position vector with correct altitude
    """
    px, py, pz = position
    r = math.sqrt(px**2 + py**2 + pz**2)
    target_r = EARTH_RADIUS_KM + target_altitude_km
    
    # Scale the position vector to reach the target radius
    if r > 0:
        scale = target_r / r
        adjusted_position = [px * scale, py * scale, pz * scale]
        
        # Verify the correction worked
        new_alt = calculate_altitude(adjusted_position)
        logger.debug(f"Fixed altitude from {r - EARTH_RADIUS_KM:.1f}km to {new_alt:.1f}km " +
                    f"(target: {target_altitude_km:.1f}km)")
        
        return adjusted_position
    else:
        logger.error("Cannot fix altitude: position vector has zero magnitude")
        return position

def propagate_satellite(satellite_obj, timescale, time_point):
    """
    Calculate satellite position at a specific time point with enhanced precision.
    
    Args:
        satellite_obj: Skyfield EarthSatellite object
        timescale: Skyfield timescale
        time_point: Datetime object
        
    Returns:
        dict: Position and velocity data with additional parameters
    """
    st = timescale.from_datetime(time_point)
    geocentric = satellite_obj.at(st)
    
    # Get position and velocity vectors
    pos = geocentric.position.km
    vel = geocentric.velocity.km_per_s
    
    # Calculate additional orbital parameters
    altitude_km = calculate_altitude(pos)
    velocity_kms = calculate_velocity_magnitude(vel)
    
    # Get subpoint (latitude, longitude) for ground track
    subpoint = geocentric.subpoint()
    latitude = subpoint.latitude.degrees
    longitude = subpoint.longitude.degrees
    
    # Calculate Unix timestamp for consistent time handling
    unix_time = time_point.timestamp()
    
    return {
        "position": pos.tolist(),
        "velocity": vel.tolist(),
        "altitude_km": altitude_km,
        "velocity_kms": velocity_kms,
        "latitude": latitude,
        "longitude": longitude,
        "time": unix_time
    }

def generate_orbit_points(satellite_obj, timescale, start_time, end_time, step_seconds, min_points=100, max_points=2000):
    """
    Generate a series of orbit points for a satellite with adaptive sampling.
    
    Args:
        satellite_obj: Skyfield EarthSatellite object
        timescale: Skyfield timescale
        start_time: Datetime start of simulation
        end_time: Datetime end of simulation
        step_seconds: Base time step between points
        min_points: Minimum number of points to generate
        max_points: Maximum number of points to generate
        
    Returns:
        list: List of orbit points with enhanced data
    """
    # Calculate how many samples we need for a complete orbit
    orbital_period = 86400.0 / satellite_obj.model.no  # seconds per orbit
    
    # Adjust step size to ensure we get enough points for smooth visualization
    # but not too many that would impact performance
    duration = (end_time - start_time).total_seconds()
    num_points = duration / step_seconds
    
    # Adjust step size if we have too few or too many points
    if num_points < min_points:
        step_seconds = duration / min_points
    elif num_points > max_points:
        step_seconds = duration / max_points
    
    # Ensure we have enough points for a smooth orbit (at least one point every 2-3 degrees)
    points_per_orbit = orbital_period / step_seconds
    if points_per_orbit < 180:  # Increased from 120 to 180 for smoother orbits
        step_seconds = orbital_period / 180
    
    logger.info(f"Generating orbit with step size: {step_seconds:.2f}s " +
                f"({orbital_period/step_seconds:.1f} points per orbit)")
    
    points = []
    current_time = start_time
    step = timedelta(seconds=step_seconds)
    
    # Generate points at regular intervals
    while current_time <= end_time:
        point_data = propagate_satellite(satellite_obj, timescale, current_time)
        
        # Add time in seconds from simulation start (for frontend animation)
        point_data["time_from_start"] = (current_time - start_time).total_seconds()
        
        points.append(point_data)
        current_time += step
    
    logger.info(f"Generated {len(points)} orbit points spanning {duration/3600:.1f} hours")
    
    return points

def generate_full_orbit_trajectory(tle_line1, tle_line2, epoch, points_per_orbit=500):
    """
    Generate a complete orbital trajectory from TLE data.
    
    Args:
        tle_line1: First line of TLE
        tle_line2: Second line of TLE
        epoch: Epoch datetime
        points_per_orbit: Number of points per orbit
        
    Returns:
        list: List of orbit points for a complete orbit
    """
    # Load timescale for astronomical calculations
    ts = load.timescale()
    
    # Create satellite object from TLE
    satellite = EarthSatellite(tle_line1, tle_line2, name="LEOSat", ts=ts)
    
    # Calculate orbital period in seconds
    period_minutes = 1440.0 / satellite.model.no  # minutes per orbit
    period_seconds = period_minutes * 60
    
    # Generate points for exactly one orbit
    start_time = epoch
    end_time = epoch + timedelta(seconds=period_seconds)
    step_seconds = period_seconds / points_per_orbit
    
    # Generate the trajectory
    trajectory = generate_orbit_points(
        satellite, ts, start_time, end_time, step_seconds,
        min_points=points_per_orbit, max_points=points_per_orbit
    )
    
    return trajectory
