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
import argparse
import time
import glob

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def needs_webpack_rebuild():
    """
    Check if webpack needs to be rebuilt based on file modification times.
    Returns True if js files are newer than bundle.js
    """
    try:
        # Point to the actual webpack output location
        bundle_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist', 'js', 'bundle.js')
        
        # If bundle.js doesn't exist, definitely need to rebuild
        if not os.path.exists(bundle_path):
            return True
            
        bundle_mtime = os.path.getmtime(bundle_path)
        js_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'js')
        
        # Check all js files in the js directory
        for js_file in glob.glob(os.path.join(js_dir, '**', '*.js'), recursive=True):
            if os.path.getmtime(js_file) > bundle_mtime:
                logger.info(f"Detected changes in {js_file}")
                return True
                
        return False
    except Exception as e:
        logger.warning(f"Error checking for webpack rebuild: {e}")
        return False

def rebuild_webpack():
    """
    Rebuild webpack bundle
    """
    try:
        logger.info("Rebuilding webpack bundle...")
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_frontend.sh')
        
        if os.path.exists(script_path):
            result = subprocess.run(['bash', script_path], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("Webpack rebuild successful")
                return True
            else:
                logger.error(f"Webpack rebuild failed: {result.stderr}")
                return False
        else:
            logger.error(f"Build script not found at {script_path}")
            return False
    except Exception as e:
        logger.error(f"Error rebuilding webpack: {e}")
        return False

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='LEOS First Orbit Server')
    parser.add_argument('--port', type=int, default=int(os.environ.get("PORT", 8080)),
                        help='Port to run the server on (default: 8080)')
    parser.add_argument('--host', type=str, default=os.environ.get("HOST", "0.0.0.0"),
                        help='Host to bind the server to (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', default=os.environ.get("DEBUG", "False").lower() == "true",
                        help='Run in debug mode')
    parser.add_argument('--watch', action='store_true',
                        help='Watch for JS changes and auto-rebuild (development only)')
    parser.add_argument('--no-rebuild', action='store_true',
                        help='Skip webpack rebuild check')
    args = parser.parse_args()
    
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
            
    # Kill any process using the specified port (POSIX only)
    if sys.platform != "win32":
        try:
            result = subprocess.run([
                "lsof", "-ti", f":{args.port}"
            ], capture_output=True, text=True)
            pids = result.stdout.strip().split("\n")
            for pid in pids:
                if pid:
                    logger.info(f"Killing process on port {args.port}: PID {pid}")
                    subprocess.run(["kill", "-9", pid])
        except Exception as e:
            logger.warning(f"Could not kill process on port {args.port}: {e}")

    # Check if we need to rebuild webpack
    if not args.no_rebuild and needs_webpack_rebuild():
        rebuild_webpack()
    
    # Start webpack in watch mode if requested
    webpack_watch_process = None
    if args.watch:
        try:
            logger.info("Starting webpack in watch mode...")
            webpack_watch_process = subprocess.Popen(
                ["npx", "webpack", "--config", "webpack.config.js", "--watch"],
                cwd=os.path.dirname(os.path.abspath(__file__))
            )
        except Exception as e:
            logger.error(f"Failed to start webpack watch mode: {e}")

    logger.info(f"Starting LEOS: First Orbit on http://{args.host}:{args.port}")
    
    try:
        app.run(host=args.host, port=args.port, debug=args.debug)
    finally:
        # Clean up webpack watch process if it exists
        if webpack_watch_process:
            logger.info("Stopping webpack watch process...")
            webpack_watch_process.terminate()
            try:
                webpack_watch_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                webpack_watch_process.kill()
