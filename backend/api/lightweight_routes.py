"""
LEOS First Orbit - Lightweight API Routes
Optimized endpoints that send minimal data for frontend real-time calculation.
"""
import logging
import traceback
from flask import Blueprint, jsonify
from datetime import datetime, timedelta
from ..simulation.data_store import get_satellites
from ..simulation.engine import initialize_satellites
from ..satellite.tle_generator import parse_tle_elements

logger = logging.getLogger(__name__)

# Create Blueprint for lightweight API routes
lightweight_api_bp = Blueprint('lightweight_api', __name__)

@lightweight_api_bp.route('/orbital_elements', methods=['GET'])
def orbital_elements():
    """
    Return minimal orbital elements for real-time frontend calculation.
    This replaces the heavy simulation_data endpoint.
    
    Returns:
        JSON containing orbital elements and basic parameters only
    """
    try:
        # Get satellites data
        satellites = get_satellites()
        
        # If no satellites exist, initialize new ones
        if not satellites:
            logger.info("No satellites found, initializing new satellites")
            satellites = initialize_satellites(force_new=True)
        
        response_data = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "epoch": datetime.now().isoformat(),
                "simulation_start": datetime.now().isoformat()
            },
            "satellites": {}
        }
        
        for sat_name, sat_data in satellites.items():
            try:
                # Parse TLE to extract orbital elements
                line1 = sat_data["line1"]
                line2 = sat_data["line2"]
                
                # Extract orbital elements from TLE
                elements = parse_tle_elements(line1, line2)
                
                response_data["satellites"][sat_name] = {
                    "tle": {
                        "line1": line1,
                        "line2": line2,
                        "epoch": sat_data.get("epoch", datetime.now().isoformat())
                    },
                    "elements": elements,
                    "config": sat_data.get("config", {})
                }
                
            except Exception as e:
                logger.error(f"Error processing satellite {sat_name}: {e}")
                continue
        
        logger.info(f"Returned orbital elements for {len(response_data['satellites'])} satellites")
        return jsonify(response_data)
        
    except Exception as e:
        error_msg = f"Error in /orbital_elements: {str(e)}"
        stack_trace = traceback.format_exc()
        logger.error(f"{error_msg}\n{stack_trace}")
        return jsonify({"error": error_msg}), 500

@lightweight_api_bp.route('/satellite_status', methods=['GET'])
def satellite_status():
    """
    Return current satellite status for telemetry display.
    Generates basic telemetry without heavy simulation.
    
    Returns:
        JSON containing current telemetry for each satellite
    """
    try:
        satellites = get_satellites()
        
        if not satellites:
            return jsonify({"error": "No satellites available"}), 404
        
        status_data = {}
        current_time = datetime.now()
        
        for sat_name, sat_data in satellites.items():
            try:
                config = sat_data.get("config", {})
                altitude_km = config.get("altitude_km", 550)
                inclination_deg = config.get("inclination_deg", 51.6)
                
                # Generate basic status data
                status_data[sat_name] = {
                    "name": sat_name,
                    "altitude_km": altitude_km,
                    "inclination_deg": inclination_deg,
                    "status": "OPERATIONAL",
                    "last_update": current_time.isoformat(),
                    "systems": {
                        "power": {"status": "NOMINAL", "value": 85},
                        "thermal": {"status": "NOMINAL", "value": 92},
                        "communications": {"status": "NOMINAL", "value": 98},
                        "attitude": {"status": "NOMINAL", "value": 89}
                    }
                }
                
            except Exception as e:
                logger.error(f"Error generating status for {sat_name}: {e}")
                continue
        
        return jsonify(status_data)
        
    except Exception as e:
        error_msg = f"Error in /satellite_status: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({"error": error_msg}), 500
