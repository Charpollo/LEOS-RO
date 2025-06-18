"""
LEOS First Orbit - Main Application
Flask application initialization and configuration.
"""

import os
import logging
import threading
import mimetypes
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from .config import DEBUG_MODE, PORT, HOST, STATIC_FOLDER, STATIC_URL_PATH
from .api.routes import api_bp
from .api.lightweight_routes import lightweight_api_bp
from .utils.helpers import setup_logging, timing_decorator
from .simulation.engine import run_simulation
from .simulation.data_store import get_simulation_data

# Add MIME type for .glb files
mimetypes.add_type('model/gltf-binary', '.glb')
mimetypes.add_type('model/gltf+json', '.gltf')

# Set up logging
setup_logging()
logger = logging.getLogger(__name__)

# Global variable to track simulation initialization status
simulation_status = {
    "initialized": False,
    "in_progress": False,
    "error": None
}

@timing_decorator
def create_app():
    """
    Create and configure the Flask application.
    
    Returns:
        Flask application instance
    """
    # Initialize Flask app
    app = Flask(__name__, 
                static_folder=STATIC_FOLDER,
                static_url_path=STATIC_URL_PATH)
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(lightweight_api_bp, url_prefix='/api')
    
    # Register error handlers
    register_error_handlers(app)
    
    # Add root route to serve index.html
    @app.route('/')
    def index():
        logger.info(f"Serving index.html from {STATIC_FOLDER}")
        return send_from_directory(STATIC_FOLDER, 'index.html')
    
    # Add debug route
    @app.route('/debug')
    def debug():
        logger.info(f"Serving debug.html from {STATIC_FOLDER}")
        return send_from_directory(STATIC_FOLDER, 'debug.html')
    
    # Add explicit route for assets with proper headers
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        logger.info(f"Serving asset: {filename}")
        assets_folder = os.path.join(STATIC_FOLDER, 'assets')
        response = send_from_directory(assets_folder, filename)
        
        # Add appropriate headers for 3D models
        if filename.endswith('.glb'):
            response.headers['Content-Type'] = 'model/gltf-binary'
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        elif filename.endswith('.gltf'):
            response.headers['Content-Type'] = 'model/gltf+json'
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        
        return response
    
    # Add route to serve static files
    @app.route('/<path:filename>')
    def serve_static(filename):
        logger.info(f"Serving static file: {filename}")
        
        # Check if file exists before trying to serve it
        file_path = os.path.join(STATIC_FOLDER, filename)
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return jsonify({"error": f"File not found: {filename}"}), 404
        
        return send_from_directory(STATIC_FOLDER, filename)
    
    # Add route to check simulation initialization status
    @app.route('/api/simulation/status')
    def get_simulation_status():
        return jsonify({
            "initialized": simulation_status["initialized"],
            "in_progress": simulation_status["in_progress"],
            "error": simulation_status["error"]
        })
    
    # Add health check endpoint for production
    @app.route('/api/health')
    def health_check():
        return jsonify({
            "status": "healthy",
            "timestamp": os.environ.get('TIMESTAMP', 'unknown')
        })
    
    # Initialize simulation data - using with_appcontext instead of before_first_request
    @app.route('/init-simulation', endpoint='init_simulation')
    def init_simulation_endpoint():
        # Start initialization in background if not already done or in progress
        if not simulation_status["initialized"] and not simulation_status["in_progress"]:
            thread = threading.Thread(target=initialize_data_async)
            thread.daemon = True
            thread.start()
            return {"status": "initializing", "message": "Started simulation data initialization"}, 202
        elif simulation_status["in_progress"]:
            return {"status": "in_progress", "message": "Simulation initialization already in progress"}, 202
        else:
            return {"status": "success", "message": "Simulation data already initialized"}, 200
    
    # Initialize data function that runs in a separate thread
    def initialize_data_async():
        global simulation_status
        simulation_status["in_progress"] = True
        simulation_status["error"] = None
        
        logger.info("Starting simulation data initialization in background thread")
        try:
            run_simulation()
            simulation_status["initialized"] = True
            logger.info("Simulation data initialized successfully")
        except Exception as e:
            simulation_status["error"] = str(e)
            logger.error(f"Error initializing simulation data: {str(e)}", exc_info=True)
        finally:
            simulation_status["in_progress"] = False
    
    logger.info(f"Application created with static folder: {STATIC_FOLDER}")
    return app

def register_error_handlers(app):
    """Register custom error handlers with the Flask app."""
    
    @app.errorhandler(404)
    def not_found(error):
        return {"error": "Resource not found"}, 404
    
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"Server error: {str(error)}", exc_info=True)
        return {"error": "Internal server error"}, 500

# Create the application instance
app = create_app()

if __name__ == "__main__":
    # Run the app if executed directly
    logger.info(f"Starting LEOS First Orbit on http://{HOST}:{PORT}")
    logger.info(f"Debug mode: {DEBUG_MODE}")
    app.run(host=HOST, port=PORT, debug=DEBUG_MODE)
