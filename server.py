#!/usr/bin/env python3
"""
Simple HTTP server for LEOS First Orbit frontend
"""
import argparse
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('LEOS-Server')

class LEOSHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Custom request handler with proper MIME types"""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to frontend
        super().__init__(*args, directory=os.path.join(os.getcwd(), 'frontend'), **kwargs)
    
    def log_message(self, format, *args):
        """Override to use our logger instead of stderr"""
        logger.info("%s - %s", self.address_string(), format % args)

def run_server(host='0.0.0.0', port=8080):
    """Start the HTTP server"""
    server_address = (host, port)
    
    # Ensure we're in the right directory context
    frontend_path = os.path.join(os.getcwd(), 'frontend')
    if not os.path.isdir(frontend_path):
        logger.error(f"Frontend directory not found: {frontend_path}")
        sys.exit(1)
    
    # Check if index.html exists
    if not os.path.exists(os.path.join(frontend_path, 'index.html')):
        logger.warning("index.html not found in frontend directory. Make sure npm build completed successfully.")
    
    httpd = HTTPServer(server_address, LEOSHTTPRequestHandler)
    logger.info(f"Starting server at http://{host}:{port}/ serving from {frontend_path}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    finally:
        httpd.server_close()
        logger.info("Server closed")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LEOS First Orbit HTTP Server")
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8080, help='Port to bind to (default: 8080)')
    args = parser.parse_args()
    
    run_server(host=args.host, port=args.port)
