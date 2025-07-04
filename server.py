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
        # Use script location to find frontend directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_dir = os.path.join(script_dir, 'frontend')
        dist_dir = os.path.join(frontend_dir, 'dist')
        if os.path.isdir(dist_dir):
            serve_dir = dist_dir
        else:
            serve_dir = frontend_dir
            logger.warning(f"Serving unbuilt frontend from {serve_dir}")
        super().__init__(*args, directory=serve_dir, **kwargs)
    
    def end_headers(self):
        """Add cache-control headers to prevent caching during development"""
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Override to use our logger instead of stderr"""
        logger.info("%s - %s", self.address_string(), format % args)
    
    def translate_path(self, path):
        # Serve raw data files from the source frontend/data directory
        if path.startswith('/data/'):
            script_dir = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(script_dir, 'frontend', 'data')
            rel_path = path[len('/data/'):]
            return os.path.join(data_dir, rel_path)
        # Support URLs with /dist/ prefix by stripping it
        if path.startswith('/dist/'):
            # remove '/dist' to map to actual files in serve_dir
            path = path[len('/dist'):]
        # Serve raw assets not in dist from the source frontend/assets directory
        if path.startswith('/assets/'):
            script_dir = os.path.dirname(os.path.abspath(__file__))
            assets_src = os.path.join(script_dir, 'frontend', 'assets')
            rel_path = path[len('/assets/'):]
            return os.path.join(assets_src, rel_path)
        return super().translate_path(path)


def run_server(host='0.0.0.0', port=8080):
    """Start the HTTP server"""
    server_address = (host, port)
    
    # Use script location to find frontend directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(script_dir, 'frontend')
    if not os.path.isdir(frontend_dir):
        logger.error(f"Frontend directory not found: {frontend_dir}")
        sys.exit(1)
    # Choose serve directory based on build output
    dist_dir = os.path.join(frontend_dir, 'dist')
    if os.path.isdir(dist_dir):
        serve_dir = dist_dir
    else:
        serve_dir = frontend_dir
        logger.warning(f"Build output not found, serving unbuilt frontend from {serve_dir}")
    # Check for index.html
    index_file = os.path.join(serve_dir, 'index.html')
    if not os.path.exists(index_file):
        logger.warning(f"index.html not found in {serve_dir}. Make sure build is correct.")
    
    httpd = HTTPServer(server_address, LEOSHTTPRequestHandler)
    logger.info(f"Starting server at http://{host}:{port}/ serving from {serve_dir}")
    
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
