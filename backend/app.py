"""
LEOS First Orbit - Main Application
Flask application initialization and configuration.
"""

import os
import logging
from flask import Flask, send_from_directory
from flask_cors import CORS

from .config import DEBUG_MODE, PORT, HOST, STATIC_FOLDER, STATIC_URL_PATH
from .api.routes import api_bp
from .utils.helpers import setup_logging, timing_decorator
from .simulation.engine import run_simulation

# Set up logging
setup_logging()
logger = logging.getLogger(__name__)

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
    
    # Register error handlers
    register_error_handlers(app)
    
    # Add root route to serve index.html
    @app.route('/')
    def index():
        logger.info(f"Serving index.html from {STATIC_FOLDER}")
        return send_from_directory(STATIC_FOLDER, 'index.html')
    
    # Add route to serve static files
    @app.route('/<path:filename>')
    def serve_static(filename):
        logger.info(f"Serving static file: {filename}")
        return send_from_directory(STATIC_FOLDER, filename)
    
    # Initialize simulation data - using with_appcontext instead of before_first_request
    @app.route('/init-simulation', endpoint='init_simulation')
    def init_simulation_endpoint():
        initialize_data()
        return {"status": "success", "message": "Simulation data initialized"}, 200
    
    # Initialize data function (now separate from the endpoint)
    def initialize_data():
        logger.info("Initializing simulation data")
        try:
            run_simulation()
            logger.info("Simulation data initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing simulation data: {str(e)}", exc_info=True)
    
    # Register a function to run after the app context is created
    # This is the modern replacement for before_first_request
    with app.app_context():
        initialize_data()
    
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
