#!/usr/bin/env python3
"""
LEOS First Orbit - Main Entry Point
Entry point for running the application locally or in Cloud Run.
"""

from backend.app import app
import os
import logging
import sys
import subprocess

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Check if frontend directory exists
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')
    if not os.path.exists(frontend_dir):
        logger.info("Creating frontend directory structure")
        os.makedirs(frontend_dir, exist_ok=True)
    
    # Make sure assets directory exists
    assets_dir = os.path.join(frontend_dir, 'assets')
    if not os.path.exists(assets_dir):
        logger.info("Creating assets directory")
        os.makedirs(assets_dir, exist_ok=True)
            
    # Cloud Run uses PORT env variable and requires binding to 0.0.0.0
    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("DEBUG", "False").lower() == "true"

    # Kill any process using the specified port (POSIX only)
    if sys.platform != "win32":
        try:
            result = subprocess.run([
                "lsof", "-ti", f":{port}"
            ], capture_output=True, text=True)
            pids = result.stdout.strip().split("\n")
            for pid in pids:
                if pid:
                    logger.info(f"Killing process on port {port}: PID {pid}")
                    subprocess.run(["kill", "-9", pid])
        except Exception as e:
            logger.warning(f"Could not kill process on port {port}: {e}")

    logger.info(f"Starting LEOS: First Orbit on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
