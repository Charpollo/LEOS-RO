"""
LEOS First Orbit - Telemetry Generator Module
Functions for generating realistic satellite telemetry.
"""

import math
import random
import logging
from datetime import datetime

from ..config import TIME_STEP_SECONDS

logger = logging.getLogger(__name__)

def generate_subsystem_telemetry(sat_name, altitude_km, current_time, time_index, state):
    """
    Generate realistic telemetry data that maintains state between calls.
    
    Args:
        sat_name: Name of satellite
        altitude_km: Current altitude in km
        current_time: Current datetime
        time_index: Index in the simulation (0 to total_steps)
        state: Dict containing previous telemetry state
    
    Returns:
        Tuple of (battery, temperature, orientation, anomalies, new_state)
    """
    # Extract previous state
    battery = state["battery"]
    temperature = state["temperature"]
    orbit_phase = state["orbit_phase"]
    in_eclipse = state["in_eclipse"]

    # Calculate orbit period (~ 90-105 min for LEO)
    base_period_seconds = 90 * 60  # 90 minutes base
    nominal_altitude = 550 if sat_name == "CRTS1" else 530
    altitude_factor = (altitude_km - nominal_altitude) / 100  # Difference from nominal altitude
    orbit_period = base_period_seconds + (altitude_factor * 2 * 60)  # ±2 min per 100km

    # Update orbit phase
    phase_increment = (2 * math.pi) / (orbit_period / TIME_STEP_SECONDS)
    orbit_phase = (orbit_phase + phase_increment) % (2 * math.pi)

    # Determine if satellite is in eclipse
    eclipse_start = 0.7 * math.pi
    eclipse_end = 1.3 * math.pi
    prev_eclipse = in_eclipse
    in_eclipse = eclipse_start <= orbit_phase <= eclipse_end

    # Battery drain
    hours_per_step = TIME_STEP_SECONDS / 3600.0
    if in_eclipse:
        battery_change = -2.5 * hours_per_step
    else:
        battery_change = -0.8 * hours_per_step

    battery = max(5.0, min(100.0, battery + battery_change))

    # Temperature changes
    target_temp = -20.0 if in_eclipse else 35.0
    target_temp += random.uniform(-2.0, 2.0)
    temp_change_rate = 0.01 * hours_per_step * 60
    temperature = temperature + (target_temp - temperature) * temp_change_rate

    # Log eclipse transitions
    eclipse_change = prev_eclipse != in_eclipse
    if eclipse_change:
        state["last_eclipse_change"] = time_index

    # Orientation
    stability_factor = min(1.0, battery / 40.0)
    orientation = {
        "yaw_deg": round(random.uniform(-2, 2) / stability_factor, 1),
        "pitch_deg": round(random.uniform(-1, 1) / stability_factor, 1),
        "roll_deg": round(random.uniform(-1, 1) / stability_factor, 1)
    }

    # Anomalies
    anomalies = []
    if battery < 20.0:
        anomalies.append("LowBattery")
    if battery < 10.0:
        anomalies.append("CriticalBattery")
    if temperature > 50:
        anomalies.append("Overheat")
    if temperature < -40:
        anomalies.append("Overcool")
    if abs(orientation["pitch_deg"]) > 5 or abs(orientation["roll_deg"]) > 5:
        anomalies.append("AttitudeError")

    # Save state
    new_state = {
        "battery": battery,
        "temperature": temperature,
        "orbit_phase": orbit_phase,
        "in_eclipse": in_eclipse,
        "last_eclipse_change": state["last_eclipse_change"] if not eclipse_change else time_index
    }

    return (
        round(battery, 1), 
        round(temperature, 1), 
        orientation, 
        anomalies,
        new_state
    )
