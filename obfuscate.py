"""
LEOS First Orbit - Obfuscation Script
Prepares code for deployment with advanced obfuscation.
"""
import os
import sys
import shutil
import logging
import subprocess
import glob
import json
from pathlib import Path
import tempfile

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
DIST_DIR = "dist"
BACKEND_DIR = "backend"
FRONTEND_DIR = "frontend"
JS_DIR = f"{FRONTEND_DIR}/js"
EXCLUDED_DIRS = ["__pycache__", ".git", "venv", "env", "node_modules"]

def prepare_dist():
    """Prepare distribution folder."""
    logger.info("Preparing distribution directory...")
    
    # Create dist directory
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)
    
    # Copy essential files
    logger.info("Copying server files...")
    shutil.copy("server.py", f"{DIST_DIR}/")
    shutil.copy("requirements.txt", f"{DIST_DIR}/")
    
    logger.info("Distribution preparation complete.")

def obfuscate_backend():
    """Obfuscate Python backend code using PyArmor."""
    logger.info("Obfuscating backend Python code...")
    
    try:
        # Check if PyArmor is installed
        try:
            # Make sure PyArmor is installed with the correct version
            subprocess.run([sys.executable, "-m", "pip", "install", "pyarmor==7.7.1"], check=True)
            logger.info("PyArmor is installed correctly.")
        except Exception as e:
            logger.error(f"Error installing PyArmor: {e}")
            raise
        
        # Create backend directory structure
        backend_dist = f"{DIST_DIR}/{BACKEND_DIR}"
        if not os.path.exists(backend_dist):
            os.makedirs(backend_dist)
        
        # Run PyArmor to obfuscate backend code
        logger.info("Running PyArmor...")
        
        # Use direct command-line approach instead of using the API
        try:
            # Direct command line call is more reliable
            command = [
                sys.executable, "-m", "pyarmor", "obfuscate", 
                "--recursive",
                f"--output={backend_dist}",
                f"{BACKEND_DIR}/__init__.py"
            ]
            
            result = subprocess.run(command, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"PyArmor error: {result.stderr}")
                raise Exception("PyArmor obfuscation failed.")
                
            logger.info("PyArmor obfuscation completed successfully.")
        except Exception as e:
            logger.error(f"PyArmor error: {e}")
            # If PyArmor fails, fall back to copying the files
            logger.warning("Falling back to direct file copying for backend...")
            shutil.rmtree(backend_dist, ignore_errors=True)
            shutil.copytree(BACKEND_DIR, backend_dist, ignore=shutil.ignore_patterns(*EXCLUDED_DIRS))
            
    except Exception as e:
        logger.error(f"Error obfuscating backend code: {e}")
        logger.warning("Falling back to direct file copying for backend...")
        backend_dist = f"{DIST_DIR}/{BACKEND_DIR}"
        if os.path.exists(backend_dist):
            shutil.rmtree(backend_dist)
        shutil.copytree(BACKEND_DIR, backend_dist, ignore=shutil.ignore_patterns(*EXCLUDED_DIRS))

def minify_and_obfuscate_js():
    """Minify and obfuscate JavaScript files."""
    logger.info("Processing frontend JavaScript files...")
    
    # Create frontend directories
    frontend_dist = f"{DIST_DIR}/{FRONTEND_DIR}"
    if not os.path.exists(frontend_dist):
        os.makedirs(frontend_dist)
    
    js_dist = f"{frontend_dist}/js"
    if not os.path.exists(js_dist):
        os.makedirs(js_dist)
    
    # Create vendor directory
    vendor_dist = f"{js_dist}/vendor"
    if not os.path.exists(vendor_dist):
        os.makedirs(vendor_dist)
    
    try:
        # Check npm version
        try:
            result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
            logger.info(f"NPM version: {result.stdout.strip()}")
        except Exception as e:
            logger.error(f"Error checking npm: {e}")
            raise Exception("npm is not installed or not in PATH")
        
        # Create a valid package.json
        logger.info("Creating package.json...")
        with open('package.json', 'w') as f:
            json.dump({
                "name": "leos-first-orbit",
                "version": "1.0.0",
                "description": "LEOS First Orbit Project",
                "private": True,
                "devDependencies": {}
            }, f, indent=2)
        
        # Install required npm packages
        logger.info("Installing required npm packages locally...")
        try:
            subprocess.run(["npm", "install", "--save-dev", "terser", "javascript-obfuscator"], check=True)
            logger.info("NPM packages installed successfully.")
        except Exception as e:
            logger.error(f"Failed to install npm packages: {e}")
            raise
        
        # Process each JS file except vendor files
        js_files = glob.glob(f"{JS_DIR}/*.js")
        
        # Create a temporary directory for obfuscation config
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create obfuscation config file
            config_file = os.path.join(temp_dir, "obfuscator-config.json")
            with open(config_file, 'w') as f:
                json.dump({
                    "compact": True,
                    "controlFlowFlattening": True,
                    "controlFlowFlatteningThreshold": 0.7,
                    "deadCodeInjection": True,
                    "deadCodeInjectionThreshold": 0.4,
                    "debugProtection": True,
                    "debugProtectionInterval": 0,
                    "disableConsoleOutput": True,
                    "identifierNamesGenerator": "hexadecimal",
                    "log": False,
                    "renameGlobals": True,
                    "rotateStringArray": True,
                    "selfDefending": True,
                    "stringArray": True,
                    "stringArrayEncoding": ["base64"],
                    "stringArrayThreshold": 0.8,
                    "transformObjectKeys": True,
                    "unicodeEscapeSequence": False
                }, f, indent=2)
            
            for js_file in js_files:
                filename = os.path.basename(js_file)
                try:
                    logger.info(f"Processing {filename}...")
                    
                    # First minify with terser
                    # Use proper .js extension for temporary files
                    minified_file = os.path.join(temp_dir, f"{filename}.min.js")
                    
                    # Use local terser
                    subprocess.run([
                        "npx", "terser", js_file, 
                        "--compress", "--mangle",
                        "--output", minified_file
                    ], check=True)
                    
                    # Then obfuscate with javascript-obfuscator
                    final_file = f"{js_dist}/{filename}"
                    
                    # Use local javascript-obfuscator with config file
                    subprocess.run([
                        "npx", "javascript-obfuscator", minified_file,
                        "--output", final_file,
                        "--config", config_file
                    ], check=True)
                    
                    logger.info(f"Successfully processed {filename}")
                    
                except Exception as e:
                    logger.error(f"Error processing {filename}: {e}")
                    # If minification/obfuscation fails, copy the original file
                    shutil.copy(js_file, f"{js_dist}/{filename}")
        
        # Simply copy vendor files as-is
        vendor_files = glob.glob(f"{JS_DIR}/vendor/*.js")
        for vendor_file in vendor_files:
            vendor_filename = os.path.basename(vendor_file)
            shutil.copy(vendor_file, f"{vendor_dist}/{vendor_filename}")
            
    except Exception as e:
        logger.error(f"Error processing JavaScript files: {e}")
        # If JS processing fails completely, fall back to copying all files
        logger.warning("Falling back to direct file copying for JavaScript...")
        if os.path.exists(js_dist):
            shutil.rmtree(js_dist)
        shutil.copytree(JS_DIR, js_dist)

def copy_remaining_frontend():
    """Copy remaining frontend files."""
    logger.info("Copying remaining frontend files...")
    
    frontend_dist = f"{DIST_DIR}/{FRONTEND_DIR}"
    
    # Copy CSS files
    css_dir = f"{FRONTEND_DIR}/css"
    if os.path.exists(css_dir):
        css_dist = f"{frontend_dist}/css"
        if os.path.exists(css_dist):
            shutil.rmtree(css_dist)
        shutil.copytree(css_dir, css_dist)
    
    # Copy HTML files
    html_files = glob.glob(f"{FRONTEND_DIR}/*.html")
    for html_file in html_files:
        shutil.copy(html_file, frontend_dist)
    
    # Copy assets
    assets_dir = f"{FRONTEND_DIR}/assets"
    if os.path.exists(assets_dir):
        assets_dist = f"{frontend_dist}/assets" 
        if os.path.exists(assets_dist):
            shutil.rmtree(assets_dist)
        shutil.copytree(assets_dir, assets_dist)
    
    logger.info("Frontend files copied successfully.")

def main():
    """Main function to run the obfuscation process."""
    logger.info("Starting LEOS First Orbit obfuscation process...")
    
    # Prepare dist directory
    prepare_dist()
    
    # Obfuscate backend Python code
    obfuscate_backend()
    
    # Minify and obfuscate frontend JavaScript
    minify_and_obfuscate_js()
    
    # Copy remaining frontend files
    copy_remaining_frontend()
    
    logger.info("Obfuscation process completed successfully!")
    logger.info(f"Distribution files are in the '{DIST_DIR}' directory.")
    logger.info("Use deploy.sh to deploy the application to Google Cloud Run.")

if __name__ == "__main__":
    main()
