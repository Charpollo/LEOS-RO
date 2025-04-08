"""
LEOS First Orbit - TLE Generator Module
Functions for generating Two-Line Element sets for satellites with realistic LEO parameters.
"""

import math
import random
from datetime import datetime
import logging

from skyfield.api import utc

logger = logging.getLogger(__name__)

def compute_day_of_year_fraction(dt):
    """
    Day-of-year + fraction for TLE epoch format.
    
    Args:
        dt: Datetime with timezone info
        
    Returns:
        Float representing day of year with fraction
    """
    year_start = datetime(dt.year, 1, 1, tzinfo=dt.tzinfo)
    day_count = (dt - year_start).total_seconds() / 86400.0
    return 1.0 + day_count

def checksum_tle_line(line):
    """
    Compute TLE line checksum per standard TLE rules.
    
    Args:
        line: TLE line to compute checksum for
        
    Returns:
        String containing the checksum digit
    """
    total = 0
    for char in line[:68]:  # first 68 columns
        if char.isdigit():
            total += int(char)
        elif char == '-':
            total += 1
    return str(total % 10)

def build_tle_lines(sat_num, classification, epoch_year, epoch_day_fraction, bstar_str,
                    inclination_deg, raan_deg, eccentricity, argp_deg,
                    mean_anom_deg, mean_motion_rev_day, rev_number=1):
    """
    Creates line1 & line2 for a TLE, including checksums.
    Follows standard TLE format per NORAD specifications.
    
    Args:
        Various TLE parameters
        
    Returns:
        Tuple of (line1, line2) properly formatted
    """
    yy = epoch_year % 100
    day_str = f"{epoch_day_fraction:012.8f}"
    inc_str = f"{inclination_deg:8.4f}"
    raan_str = f"{raan_deg:8.4f}"
    # Ecc = e.g. 0.000123 => '0000123'
    ecc_str = f"{eccentricity:.7f}"[2:]
    argp_str = f"{argp_deg:8.4f}"
    man_str = f"{mean_anom_deg:8.4f}"
    mm_str = f"{mean_motion_rev_day:11.8f}"
    
    line1_body = (
        f"1 {sat_num:05d}{classification} "
        f"00{yy:02d}{day_str} "
        f"{bstar_str}  00000-0  00000-0 0  999"
    )
    c1 = checksum_tle_line(line1_body)
    line1 = line1_body + c1
    
    line2_body = (
        f"2 {sat_num:05d} {inc_str} {raan_str} {ecc_str} {argp_str} {man_str} {mm_str} {rev_number:5d}"
    )
    c2 = checksum_tle_line(line2_body)
    line2 = line2_body + c2
    
    return line1, line2

def calc_mean_motion(alt_km):
    """
    Calculate mean motion for a satellite at the given altitude using Kepler's laws.
    
    Args:
        alt_km: Altitude in kilometers
        
    Returns:
        Mean motion in revolutions per day
    """
    from ..config import EARTH_GM, EARTH_RADIUS_KM
    
    # Semi-major axis in km
    a = EARTH_RADIUS_KM + alt_km
    
    # Calculate period using Kepler's third law
    # T^2 = (4π^2 / GM) * a^3
    period_s = 2.0 * math.pi * math.sqrt(a**3 / EARTH_GM)
    
    # Convert to revolutions per day
    rev_day = 86400.0 / period_s
    
    return rev_day

def random_bstar():
    """
    Create a realistic B* drag term for LEO satellites.
    Higher values for lower orbits, lower values for higher orbits.
    
    Returns:
        String representation of BSTAR term for TLE
    """
    # LEO satellites typically have B* values in these ranges
    val = 10**random.uniform(-4, -7)
    sign = '+' if random.random() < 0.5 else '-'
    
    # Format in TLE style (e.g. 0.000012345 => "  .12345-4")
    exp = 0
    while val < 1 and exp < 9:
        val *= 10
        exp += 1
    
    return f" {val:07.5f}{sign}{exp:1d}"

def generate_realistic_leo_params():
    """
    Generate realistic orbital parameters for a LEO satellite.
    
    Returns:
        Dictionary with realistic LEO parameters
    """
    # LEO altitude ranges from ~160km (very low) to ~2000km (upper limit)
    # Most common LEO satellites are between 400-800km
    altitude_groups = [
        (160, 300, 0.15),   # Very low LEO (15% chance)
        (300, 500, 0.30),   # Low LEO (30% chance)
        (500, 800, 0.40),   # Medium LEO (40% chance)
        (800, 1200, 0.10),  # High LEO (10% chance)
        (1200, 2000, 0.05)  # Very high LEO (5% chance)
    ]
    
    # Choose altitude band based on probabilities
    rand = random.random()
    cumulative_prob = 0
    for min_alt, max_alt, prob in altitude_groups:
        cumulative_prob += prob
        if rand <= cumulative_prob:
            altitude_km = random.uniform(min_alt, max_alt)
            break
    
    # Popular inclinations with realistic distribution
    inclination_groups = [
        (0, 20, 0.05),      # Equatorial (5% chance)
        (20, 45, 0.15),     # Low inclination (15% chance)
        (45, 60, 0.20),     # Medium inclination (20% chance)
        (60, 80, 0.15),     # High inclination (15% chance)
        (80, 100, 0.30),    # Polar/near-polar (30% chance)
        (97, 99, 0.10),     # Sun-synchronous (~98°) (10% chance)
        (100, 120, 0.05)    # Retrograde (5% chance)
    ]
    
    # Choose inclination based on probabilities
    rand = random.random()
    cumulative_prob = 0
    for min_inc, max_inc, prob in inclination_groups:
        cumulative_prob += prob
        if rand <= cumulative_prob:
            inclination_deg = random.uniform(min_inc, max_inc)
            break
    
    # Eccentricity - LEO orbits are mostly circular but have small variations
    # Lower orbits tend to have lower eccentricity due to atmospheric drag circularizing them
    if altitude_km < 400:
        eccentricity = random.uniform(0.0001, 0.003)
    elif altitude_km < 800:
        eccentricity = random.uniform(0.0001, 0.01)
    else:
        eccentricity = random.uniform(0.0001, 0.02)
    
    # RAAN (Right Ascension of Ascending Node) - any value from 0-360°
    raan_deg = random.uniform(0, 360)
    
    # Argument of Perigee - any value from 0-360°
    argp_deg = random.uniform(0, 360)
    
    # Mean Anomaly - any value from 0-360°
    mean_anom_deg = random.uniform(0, 360)
    
    return {
        'altitude_km': altitude_km,
        'inclination_deg': inclination_deg,
        'eccentricity': eccentricity,
        'raan_deg': raan_deg,
        'argp_deg': argp_deg,
        'mean_anom_deg': mean_anom_deg
    }

def generate_tle_for_satellite(sat_name, altitude_km=None, inclination_deg=None):
    """
    Generates TLE lines for a satellite with realistic LEO parameters.
    If altitude_km and inclination_deg are not provided, generates random realistic values.
    
    Args:
        sat_name: Name of the satellite
        altitude_km: Desired altitude in kilometers (optional)
        inclination_deg: Desired inclination in degrees (optional)
        
    Returns:
        Tuple of (line1, line2, epoch) for the satellite
    """
    now = datetime.now(utc)
    epoch_year = now.year
    day_fraction = compute_day_of_year_fraction(now)
    
    # If specific parameters are not provided, generate realistic ones
    if altitude_km is None or inclination_deg is None:
        params = generate_realistic_leo_params()
        altitude_km = params['altitude_km'] if altitude_km is None else altitude_km
        inclination_deg = params['inclination_deg'] if inclination_deg is None else inclination_deg
        eccentricity = params['eccentricity']
        raan_deg = params['raan_deg']
        argp_deg = params['argp_deg']
        mean_anom_deg = params['mean_anom_deg']
    else:
        # Use provided values and randomize the rest
        eccentricity = random.uniform(0.0001, 0.01)
        raan_deg = random.uniform(0, 360)
        argp_deg = random.uniform(0, 360)
        mean_anom_deg = random.uniform(0, 360)
    
    # Calculate mean motion from altitude
    mm = calc_mean_motion(altitude_km)
    
    # International ID format: launch year + launch number + piece
    # We'll simulate a random satellite ID
    sat_num = random.randint(10000, 99999)
    classification = 'U'  # Unclassified
    
    # Generate appropriate drag coefficient based on altitude
    # Lower orbits have higher drag
    bstar_exp = -5 if altitude_km < 400 else (-6 if altitude_km < 800 else -7)
    bstar_val = 10**random.uniform(bstar_exp, bstar_exp+1)
    bstar_sign = '+' if random.random() < 0.5 else '-'
    bstar_str = random_bstar()
    
    # For simulating a somewhat "aged" satellite
    rev_number = random.randint(1, 5000)
    
    line1, line2 = build_tle_lines(
        sat_num, classification, epoch_year, day_fraction, 
        bstar_str,
        inclination_deg, raan_deg, eccentricity,
        argp_deg, mean_anom_deg, mm, rev_number=rev_number
    )
    
    logger.info(f"Generated TLE for {sat_name}: alt={altitude_km:.1f}km, inc={inclination_deg:.1f}°, ecc={eccentricity:.6f}")
    
    return line1, line2, now
