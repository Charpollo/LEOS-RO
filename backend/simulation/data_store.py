"""
LEOS First Orbit - Data Store Module
In-memory data storage for satellite and simulation data.
"""
import logging
import datetime
import math
import random
from typing import Dict, List, Any, Optional, Tuple
from ..utils.helpers import calculate_memory_usage
from ..config import SATELLITES_CONFIG

logger = logging.getLogger(__name__)

# In-memory data stores
_satellites: Dict[str, Dict] = {}
_simulation_data: Dict[str, List[Dict]] = {}
_orbit_data: Dict[str, List[Dict]] = {}

def get_satellites() -> Dict[str, Dict]:
    """
    Get all satellite configuration data.
    
    Returns:
        Dictionary of satellite data
    """
    return _satellites

def get_satellite_data(sat_name: str) -> Optional[List[Dict]]:
    """
    Get orbit data for a specific satellite.
    
    Args:
        sat_name: Name of the satellite
        
    Returns:
        List of orbit data points or raises an exception if not found
    """
    # First try to get orbit trajectory data
    data = _orbit_data.get(sat_name)
    
    # If orbit data is available, return it
    if data:
        return data
    
    # Otherwise use simulation data
    data = _simulation_data.get(sat_name)
    
    # If no data is available, this is an error - don't generate fallback
    if not data:
        logger.error(f"No data found for {sat_name}")
        raise ValueError(f"No orbit data available for {sat_name}")
    
    return data

def get_latest_telemetry(sat_name: str) -> Dict:
    """
    Get the latest telemetry data for a satellite.
    
    Args:
        sat_name: Name of the satellite
        
    Returns:
        Dictionary with latest telemetry or empty dict if not found
    """
    try:
        data = _simulation_data.get(sat_name, [])
        if not data or len(data) == 0:
            logger.warning(f"No telemetry data found for {sat_name}")
            return {}
        
        # Get the last data point
        latest = data[-1]
        
        # Extract telemetry-specific fields
        return {
            "battery": latest.get("battery", 80),
            "temperature": latest.get("temperature", 20),
            "orientation": latest.get("orientation", [0, 0, 0]),
            "anomalies": latest.get("anomalies", []),
            "altitude_km": latest.get("altitude_km", 0),
            "velocity_kms": latest.get("velocity_kms", 0),
            "time": latest.get("time", datetime.datetime.now().isoformat())
        }
    except Exception as e:
        logger.error(f"Error getting telemetry for {sat_name}: {e}")
        # Don't generate fallback data - return minimal data that indicates an error
        return {
            "battery": 0,
            "temperature": 0,
            "orientation": [0, 0, 0],
            "anomalies": ["TelemetryUnavailable"],
            "altitude_km": 0,
            "velocity_kms": 0,
            "time": datetime.datetime.now().isoformat()
        }

def set_satellite_data(sat_name: str, config: Dict, sim_data: List[Dict] = None, trajectory_data: List[Dict] = None) -> None:
    """
    Set or update satellite configuration, simulation data, and orbit trajectory.
    
    Args:
        sat_name: Name of the satellite
        config: Satellite configuration data
        sim_data: Optional simulation data points
        trajectory_data: Optional orbit trajectory data
    """
    _satellites[sat_name] = config
    
    if sim_data is not None:
        _simulation_data[sat_name] = sim_data
        logger.info(f"Stored {len(sim_data)} simulation data points for {sat_name}, " +
                   f"approx size: {calculate_memory_usage(sim_data)}")
    
    if trajectory_data is not None:
        _orbit_data[sat_name] = trajectory_data
        logger.info(f"Stored {len(trajectory_data)} trajectory points for {sat_name}, " +
                   f"approx size: {calculate_memory_usage(trajectory_data)}")

def get_simulation_data() -> Dict[str, List[Dict]]:
    """
    Get all simulation data.
    
    Returns:
        Dictionary mapping satellite names to lists of data points,
        or raises an exception if no data is available
    """
    # If no simulation data exists, this is a critical error
    if not _simulation_data:
        logger.error("No simulation data available")
        raise ValueError("No simulation data available - simulation needs to be initialized")
    
    return _simulation_data

def get_orbit_data() -> Dict[str, List[Dict]]:
    """
    Get all orbit trajectory data.
    
    Returns:
        Dictionary mapping satellite names to lists of orbit trajectory points
    """
    return _orbit_data

def clear_data() -> None:
    """Clear all stored data."""
    _satellites.clear()
    _simulation_data.clear()
    _orbit_data.clear()
    logger.info("Cleared all data from data store")

def clear_simulation_data() -> None:
    """Clear simulation data but keep satellite configurations."""
    _simulation_data.clear()
    _orbit_data.clear()
    logger.info("Cleared simulation and orbit data from data store")

def get_data_status() -> Dict[str, Any]:
    """
    Get the status of stored data.
    
    Returns:
        Dictionary with data status information
    """
    return {
        "satellites": list(_satellites.keys()),
        "simulation_data_count": {sat: len(data) for sat, data in _simulation_data.items()},
        "orbit_data_count": {sat: len(data) for sat, data in _orbit_data.items()},
        "total_satellites": len(_satellites),
        "has_simulation_data": bool(_simulation_data),
        "has_orbit_data": bool(_orbit_data)
    }
