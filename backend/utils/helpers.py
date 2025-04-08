"""
LEOS First Orbit - Helper Functions
General utility functions used across the application.
"""

import time
import logging
from functools import wraps

logger = logging.getLogger(__name__)

def setup_logging():
    """Configure application logging."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Reduce verbosity of third-party libraries
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('skyfield').setLevel(logging.WARNING)
    
    logger.info("Logging configured")

def timing_decorator(func):
    """
    Decorator to log execution time of functions.
    
    Args:
        func: Function to time
    
    Returns:
        Wrapped function that logs execution time
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        logger.info(f"Function {func.__name__} executed in {end_time - start_time:.2f} seconds")
        return result
    return wrapper

def format_bytes(size):
    """
    Format byte size to a human-readable string.
    
    Args:
        size: Size in bytes
        
    Returns:
        String representation of size (e.g., "1.23 MB")
    """
    power = 2**10
    n = 0
    labels = {0: 'B', 1: 'KB', 2: 'MB', 3: 'GB', 4: 'TB'}
    
    while size > power:
        size /= power
        n += 1
    
    return f"{size:.2f} {labels[n]}"

def validate_satellite_name(name):
    """
    Validate satellite name against the expected satellites.
    
    Args:
        name: Satellite name to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    valid_satellites = ['CRTS1', 'BULLDOG']
    return name.upper() in valid_satellites

def calculate_memory_usage(data):
    """
    Estimate memory usage of a data structure.
    
    Args:
        data: Data structure to measure
        
    Returns:
        String: Human-readable memory usage
    """
    import sys
    
    # Get size in bytes
    size = sys.getsizeof(data)
    
    # For dictionaries and lists, add the size of their contents
    if isinstance(data, dict):
        size += sum(sys.getsizeof(k) + sys.getsizeof(v) for k, v in data.items())
    elif isinstance(data, list):
        size += sum(sys.getsizeof(i) for i in data)
    
    return format_bytes(size)
