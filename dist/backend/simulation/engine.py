"""
LEOS First Orbit - Simulation Engine Module
Contains the core simulation logic for satellite orbits with realistic LEO parameters.
"""
import gc
import logging
import math
import random
import os
import json
import pickle
from datetime import datetime, timedelta
from skyfield.api import load, EarthSatellite, utc
from ..config import (
    TIME_SPAN_HOURS, TIME_STEP_SECONDS, COLLISION_DISTANCE_KM,
    ANOMALY_ALT_THRESHOLD_KM, SATELLITES_CONFIG, generate_random_satellite_params
)
from ..satellite.tle_generator import generate_tle_for_satellite, generate_realistic_leo_params
from ..satellite.orbit import check_collision, calculate_altitude, fix_altitude, generate_full_orbit_trajectory
from ..satellite.telemetry import generate_subsystem_telemetry
from .data_store import get_simulation_data, set_satellite_data, get_satellites, clear_simulation_data

logger = logging.getLogger(__name__)

# Cache directory for orbit data
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'cache')
ORBIT_CACHE_FILE = os.path.join(CACHE_DIR, 'orbit_cache.pickle')

def initialize_satellites(force_new=True):
    """
    Initialize satellites with authentic TLE data and store them.
    
    Args:
        force_new: Force generation of new satellites regardless of existing data
        
    Returns:
        Dictionary of satellite data with TLEs
    """
    # Check for cached orbit data if not forcing new generation
    if not force_new:
        cached_data = _load_cached_orbits()
        if cached_data:
            logger.info("Using cached orbit data")
            return cached_data
    
    # Clear existing simulation data if forcing new generation
    if force_new:
        clear_simulation_data()
        logger.info("Cleared existing simulation data for fresh generation")
    
    satellites = {}
    
    # Generate random satellite configurations with realistic LEO parameters
    random_configs = generate_random_satellite_params()
    
    # Create satellites with varied orbital parameters
    for sat_name, config in random_configs.items():
        # For some satellites, use the default configuration
        # For others, generate completely random realistic parameters
        if random.random() < 0.5:  # 50% chance of using completely random parameters
            leo_params = generate_realistic_leo_params()
            altitude_km = leo_params['altitude_km']
            inclination_deg = leo_params['inclination_deg']
            logger.info(f"Using fully random LEO parameters for {sat_name}")
        else:
            # Use the base config with some variation
            altitude_km = config["altitude_km"] * (0.9 + 0.2 * random.random())  # ±10% variation
            inclination_deg = config["inclination_deg"] * (0.95 + 0.1 * random.random())  # ±5% variation
            logger.info(f"Using configured parameters with variation for {sat_name}")
        
        # Log the orbit parameters
        logger.info(f"Generated orbit for {sat_name}: altitude={altitude_km:.1f}km, inclination={inclination_deg:.1f}°")
        
        # Create realistic TLE data
        line1, line2, epoch = generate_tle_for_satellite(sat_name, altitude_km, inclination_deg)
        
        satellites[sat_name] = {
            "line1": line1,
            "line2": line2,
            "epoch": epoch.isoformat(),
            "config": {
                "altitude_km": altitude_km,
                "inclination_deg": inclination_deg,
                "description": random_configs[sat_name]["description"]
            }
        }
        
        logger.info(f"Generated {sat_name} TLE: {line1}")
        logger.info(f"                         {line2}")
    
    # Store satellites in data store
    for sat_name, data in satellites.items():
        set_satellite_data(sat_name, data)
    
    # Cache the orbit data for future use
    _cache_orbits(satellites)
    
    return satellites

def _cache_orbits(satellites):
    """Cache orbit data to disk to speed up future loads"""
    try:
        # Create cache directory if it doesn't exist
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR)
            
        # Save the data to a pickle file
        with open(ORBIT_CACHE_FILE, 'wb') as f:
            pickle.dump(satellites, f)
            
        logger.info(f"Cached orbit data for {len(satellites)} satellites")
    except Exception as e:
        logger.error(f"Error caching orbit data: {e}")

def _load_cached_orbits():
    """Load orbit data from cache if available"""
    try:
        if os.path.exists(ORBIT_CACHE_FILE):
            with open(ORBIT_CACHE_FILE, 'rb') as f:
                satellites = pickle.load(f)
                
            # Store satellites in data store
            for sat_name, data in satellites.items():
                set_satellite_data(sat_name, data)
                
            logger.info(f"Loaded cached orbit data for {len(satellites)} satellites")
            return satellites
    except Exception as e:
        logger.error(f"Error loading cached orbit data: {e}")
    
    return None

def generate_orbit_data(satellites):
    """
    Generate realistic orbit trajectory data for all satellites.
    
    Args:
        satellites: Dictionary of satellite data with TLEs
        
    Returns:
        Dictionary of satellite orbit data
    """
    logger.info("Generating high-fidelity orbit data for all satellites")
    
    orbit_data = {}
    
    # Load timescale for astronomical calculations
    ts = load.timescale()
    
    for sat_name, data in satellites.items():
        try:
            line1 = data["line1"]
            line2 = data["line2"]
            
            # Parse epoch from the satellite data
            if "epoch" in data:
                epoch = datetime.fromisoformat(data["epoch"])
            else:
                # Default to current time if epoch not stored
                epoch = datetime.now(utc)
            
            # Generate a complete orbital trajectory
            logger.info(f"Generating orbit trajectory for {sat_name}")
            trajectory = generate_full_orbit_trajectory(line1, line2, epoch, points_per_orbit=500)
            
            # Convert the orbit data to the format expected by the frontend
            processed_trajectory = []
            for point in trajectory:
                # Calculate any derived values
                velocity_magnitude = point.get("velocity_kms", 0)
                altitude = point.get("altitude_km", 0)
                
                processed_trajectory.append({
                    "position": point["position"],
                    "velocity": point["velocity"],
                    "altitude_km": altitude,
                    "velocity_kms": velocity_magnitude,
                    "time": point["time_from_start"]
                })
            
            orbit_data[sat_name] = processed_trajectory
            logger.info(f"Generated {len(processed_trajectory)} trajectory points for {sat_name}")
            
        except Exception as e:
            logger.error(f"Error generating orbit data for {sat_name}: {e}", exc_info=True)
            raise RuntimeError(f"Failed to generate orbit for {sat_name}: {str(e)}")
    
    return orbit_data

def run_simulation():
    """
    Run the simulation for all satellites and generate telemetry data.
    
    Returns:
        Dictionary of simulation data for all satellites
    """
    logger.info(f"Building simulation with time span: {TIME_SPAN_HOURS}h and step: {TIME_STEP_SECONDS}s")
    
    # Get satellites data or initialize new ones
    satellites = get_satellites()
    if not satellites:
        # First try to load cached data (false = don't force new)
        satellites = initialize_satellites(force_new=False)
    
    # Generate orbital trajectory data
    try:
        orbit_data = generate_orbit_data(satellites)
    except Exception as e:
        logger.error(f"Error generating orbit data: {e}", exc_info=True)
        # Force reinitialize satellites and try again
        satellites = initialize_satellites(force_new=True)
        orbit_data = generate_orbit_data(satellites)
    
    # 1) Build time array
    now = datetime.now(utc)  # Use timezone-aware datetime for consistency
    end = now + timedelta(hours=TIME_SPAN_HOURS)
    timescale = load.timescale()
    time_list = []
    cur = now
    step = timedelta(seconds=TIME_STEP_SECONDS)
    while cur <= end:
        time_list.append(cur)
        cur += step
    
    # Initialize telemetry state tracking for each satellite
    telemetry_state = {}
    for sn in satellites:
        telemetry_state[sn] = {
            "battery": 80.0,
            "in_eclipse": False,
            "last_eclipse_change": 0,
            "temperature": 20.0,
            "orbit_phase": 0.0,
        }
    
    # Build EarthSatellite objects
    sat_objs = {}
    for sn, satinfo in satellites.items():
        try:
            line1 = satinfo["line1"]
            line2 = satinfo["line2"]
            satellite = EarthSatellite(line1, line2, sn, timescale)
            sat_objs[sn] = satellite
        except Exception as e:
            logger.error(f"Error creating EarthSatellite object for {sn}: {e}")
            raise RuntimeError(f"Failed to create satellite object for {sn}: {str(e)}")
    
    # Initialize simulation data for each satellite
    sim_data = {sn: [] for sn in satellites}
    
    # Log the first position to verify altitude
    for sn in sat_objs:
        try:
            t0 = timescale.from_datetime(time_list[0])
            geocentric = sat_objs[sn].at(t0)
            pos = geocentric.position.km
            vel = geocentric.velocity.km_per_s
            
            # Calculate speed
            speed = math.sqrt(vel[0]**2 + vel[1]**2 + vel[2]**2)
            
            # Use the specific satellite configuration data
            expected_alt = satellites[sn]["config"]["altitude_km"]
            actual_alt = calculate_altitude(pos)
            
            logger.info(f"{sn} at start: altitude={actual_alt:.1f}km (expected {expected_alt:.1f}km)")
            logger.info(f"  Position: [{pos[0]:.1f}, {pos[1]:.1f}, {pos[2]:.1f}] km")
            logger.info(f"  Velocity: {speed:.1f} km/s")
            
            # Verify altitude is reasonable
            if abs(actual_alt - expected_alt) > 50:
                logger.warning(f"WARNING: {sn} altitude differs from expected: {actual_alt:.1f}km vs {expected_alt:.1f}km")
            
            if actual_alt < 150:
                logger.error(f"ERROR: {sn} altitude is too low: {actual_alt:.1f}km")
                raise ValueError(f"Satellite {sn} has invalid altitude ({actual_alt:.1f}km)")
        except Exception as e:
            logger.error(f"Error calculating initial position for {sn}: {e}")
            raise RuntimeError(f"Failed to calculate position for {sn}: {str(e)}")
    
    # Run simulation loop
    for i, t in enumerate(time_list):
        st = timescale.from_datetime(t)
        snapshot = {}
        velocities = {}
        
        for sn in sat_objs:
            try:
                geocentric = sat_objs[sn].at(st)
                pos = geocentric.position.km
                vel = geocentric.velocity.km_per_s
                
                snapshot[sn] = pos
                velocities[sn] = vel
                
                # Use the specific satellite configuration data
                expected_alt = satellites[sn]["config"]["altitude_km"]
                alt = calculate_altitude(pos)
                
                # Correct altitude if it drifts significantly (due to numerical issues)
                if abs(alt - expected_alt) > 50:
                    corrected_pos = fix_altitude(pos, expected_alt)
                    snapshot[sn] = corrected_pos
                    alt = calculate_altitude(corrected_pos)
                    logger.debug(f"Corrected altitude for {sn}: {alt:.1f}km")
            except Exception as e:
                logger.error(f"Error during position calculation for {sn} at time {t}: {e}")
                raise RuntimeError(f"Failed to calculate position for {sn} at time {t}: {str(e)}")
        
        # Check for collisions
        collisions_list = []
        sat_keys = list(snapshot.keys())
        for a in range(len(sat_keys)):
            for b in range(a + 1, len(sat_keys)):
                try:
                    nameA = sat_keys[a]
                    nameB = sat_keys[b]
                    pA = snapshot[nameA]
                    pB = snapshot[nameB]
                    dist = check_collision(pA, pB, COLLISION_DISTANCE_KM)
                    if dist is not None:
                        collisions_list.append((nameA, nameB, dist))
                except Exception as e:
                    logger.error(f"Error during collision check between {nameA} and {nameB}: {e}")
        
        # Generate telemetry data
        for sn in sat_objs:
            try:
                px, py, pz = snapshot[sn]
                vx, vy, vz = velocities[sn]
                
                alt = calculate_altitude([px, py, pz])
                vel_magnitude = math.sqrt(vx**2 + vy**2 + vz**2)
                
                battery, temperature, orientation, telem_anomalies, telemetry_state[sn] = generate_subsystem_telemetry(
                    sn, alt, t, i, telemetry_state[sn]
                )
                
                sat_collisions = []
                for (sA, sB, d) in collisions_list:
                    if sA == sn or sB == sn:
                        other = sB if sA == sn else sA
                        sat_collisions.append(f"Collision with {other} Dist={d:.2f}km")
                
                if alt < ANOMALY_ALT_THRESHOLD_KM:
                    telem_anomalies.append(f"LowAltitude<{ANOMALY_ALT_THRESHOLD_KM}")
                
                sim_data[sn].append({
                    "time": t.isoformat(),
                    "position": [px, py, pz],
                    "velocity": [vx, vy, vz],
                    "altitude_km": alt,
                    "velocity_kms": vel_magnitude,
                    "collisions": sat_collisions,
                    "battery": battery,
                    "temperature": temperature,
                    "orientation": orientation,
                    "anomalies": telem_anomalies
                })
            except Exception as e:
                logger.error(f"Error generating telemetry for {sn} at time {t}: {e}")
    
    # Store simulation data and orbit data
    for sn, data in sim_data.items():
        try:
            # Store both simulation data and orbit trajectories
            set_satellite_data(sn, satellites[sn], data, orbit_data.get(sn, []))
        except Exception as e:
            logger.error(f"Error storing simulation data for {sn}: {e}")
            raise RuntimeError(f"Failed to store data for {sn}: {str(e)}")
    
    # Force garbage collection to free memory after building the data
    gc.collect()
    
    # Print stats after build
    total_points = sum(len(data) for data in sim_data.values())
    logger.info(f"Built simulation data: {total_points} total data points")
    
    return sim_data
