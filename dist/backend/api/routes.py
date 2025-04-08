"""
LEOS First Orbit - API Routes Module
Defines Flask API endpoints for the application.
"""
import logging
import traceback
from flask import Blueprint, jsonify, send_from_directory, request
from datetime import datetime
from ..simulation.data_store import get_satellites, get_simulation_data, get_satellite_data, get_latest_telemetry, get_data_status
from ..simulation.engine import run_simulation, initialize_satellites
from ..config import STATIC_FOLDER, SATELLITES_CONFIG

logger = logging.getLogger(__name__)

# Create Blueprint for API routes
api_bp = Blueprint('api', __name__)

@api_bp.route('/simulation_data', methods=['GET'])
def simulation_data():
    """
    Return the entire simulation scenario for all satellites.
    
    Returns:
        JSON containing all simulation data
    """
    try:
        # Try to get existing simulation data
        try:
            data = get_simulation_data()
        except ValueError:
            # No simulation data available, run the simulation
            logger.info("No simulation data available, running new simulation")
            data = run_simulation()
        
        return jsonify(data)
    except Exception as e:
        error_msg = f"Error in /simulation_data: {str(e)}"
        stack_trace = traceback.format_exc()
        logger.error(f"{error_msg}\n{stack_trace}")
        return jsonify({"error": error_msg}), 500

@api_bp.route('/tle', methods=['GET'])
def tle_data():
    """
    Return the TLE lines for all satellites.
    
    Returns:
        JSON containing TLE data for each satellite
    """
    try:
        satellites = get_satellites()
        
        # If no satellites exist, initialize new ones
        if not satellites:
            logger.info("No satellites found, initializing new satellites")
            satellites = initialize_satellites(force_new=True)
        
        out = {}
        for sat_name, info in satellites.items():
            out[sat_name] = {
                "line1": info.get("line1", ""),
                "line2": info.get("line2", ""),
                "epoch": info.get("epoch", datetime.now().isoformat()),
                "altitude_km": info.get("config", {}).get("altitude_km", 0),
                "inclination_deg": info.get("config", {}).get("inclination_deg", 0)
            }
        
        return jsonify(out)
    except Exception as e:
        error_msg = f"Error in /tle: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({"error": error_msg}), 500

@api_bp.route('/telemetry', methods=['GET'])
def all_telemetry():
    """
    Return the current telemetry data for all satellites.
    
    Returns:
        JSON containing current telemetry for each satellite
    """
    try:
        satellites = get_satellites()
        
        # If no satellites exist, initialize new ones
        if not satellites:
            logger.info("No satellites found, initializing new satellites")
            satellites = initialize_satellites(force_new=True)
            # Run the simulation to generate telemetry
            run_simulation()
        
        out = {}
        for sat_name in satellites:
            out[sat_name] = get_latest_telemetry(sat_name)
        
        return jsonify(out)
    except Exception as e:
        error_msg = f"Error in /telemetry: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({"error": error_msg}), 500

@api_bp.route('/telemetry/<sat_name>', methods=['GET'])
def satellite_telemetry(sat_name):
    """
    Return the current telemetry data for a specific satellite.
    
    Args:
        sat_name: Name of the satellite (case-insensitive)
        
    Returns:
        JSON containing current telemetry for the satellite
    """
    try:
        # Make case-insensitive lookup
        satellites = get_satellites()
        
        # Convert to uppercase for consistent handling
        sat_name_upper = sat_name.upper()
        
        # Check if satellite exists in our database
        sat_found = False
        for name in satellites:
            if name.upper() == sat_name_upper:
                sat_found = True
                return jsonify(get_latest_telemetry(name))
        
        # If not found but in config, initialize satellites and run simulation
        if sat_name_upper in SATELLITES_CONFIG and not sat_found:
            logger.info(f"Satellite {sat_name} not found in data store but exists in config, initializing satellites")
            satellites = initialize_satellites(force_new=True)
            run_simulation()
            
            # Now try to get the telemetry again
            for name in satellites:
                if name.upper() == sat_name_upper:
                    return jsonify(get_latest_telemetry(name))
        
        # If still not found, return 404
        return jsonify({"error": f"Satellite {sat_name} not found"}), 404
    except Exception as e:
        error_msg = f"Error in /telemetry/{sat_name}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({"error": error_msg}), 500

@api_bp.route('/starpath/<sat_name>', methods=['GET'])
def starpath(sat_name):
    """
    Return the orbit path data for a specific satellite.
    
    Args:
        sat_name: Name of the satellite (case-insensitive)
        
    Returns:
        JSON containing orbit data for the satellite
    """
    try:
        # Convert to uppercase to match SATELLITES_CONFIG
        sat_name_upper = sat_name.upper()
        
        # Check if satellite exists in our configuration
        if sat_name_upper not in SATELLITES_CONFIG:
            logger.warning(f"Satellite {sat_name} not found in config")
            return jsonify({"error": f"Satellite {sat_name} not found in configuration"}), 404
        
        # Try to get existing satellite data
        try:
            satellite_data = None
            # Check case-insensitive
            satellites = get_satellites()
            for name in satellites:
                if name.upper() == sat_name_upper:
                    try:
                        satellite_data = get_satellite_data(name)
                        break
                    except ValueError:
                        # Data not found for this satellite
                        pass
            
            # If no satellite data found, we need to initialize and run the simulation
            if satellite_data is None:
                logger.info(f"No orbit data found for {sat_name}, initializing satellites and running simulation")
                initialize_satellites(force_new=True)
                run_simulation()
                
                # Now try again to get the data
                for name in get_satellites():
                    if name.upper() == sat_name_upper:
                        satellite_data = get_satellite_data(name)
                        break
            
            # If we still don't have data, this is a critical error
            if satellite_data is None:
                raise ValueError(f"Failed to generate orbit data for {sat_name}")
            
            # Log data size for debugging
            logger.info(f"Returning {len(satellite_data)} data points for {sat_name_upper}")
            
            return jsonify(satellite_data)
            
        except ValueError as ve:
            # No data for this satellite, need to run simulation
            logger.error(f"Error getting orbit data for {sat_name}: {ve}")
            return jsonify({"error": f"No orbit data available for {sat_name}"}), 500
        
    except Exception as e:
        error_msg = f"Error in /starpath/{sat_name}: {str(e)}"
        stack_trace = traceback.format_exc()
        logger.error(f"{error_msg}\n{stack_trace}")
        return jsonify({"error": error_msg}), 500

@api_bp.route('/status', methods=['GET'])
def status():
    """
    Get system status information.
    
    Returns:
        JSON containing system status
    """
    try:
        # Get data status
        data_status = get_data_status()
        
        # Build status response
        status_data = {
            "status": "online",
            "time": datetime.now().isoformat(),
            "data": data_status,
            "satellites": list(SATELLITES_CONFIG.keys())
        }
        
        return jsonify(status_data)
    except Exception as e:
        error_msg = f"Error in /status: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({"error": error_msg, "status": "error"}), 500

# Static file routes
@api_bp.route('/')
def index():
    """Serve the main application HTML."""
    return send_from_directory(STATIC_FOLDER, 'index.html')

@api_bp.route('/<path:filename>')
def serve_static(filename):
    """Serve static files."""
    return send_from_directory(STATIC_FOLDER, filename)
