"""
LEOS First Orbit - Main Entry Point
Entry point for running the application locally or in Cloud Run.
"""

from backend.app import app
import os

if __name__ == "__main__":
    # Cloud Run uses PORT env variable and requires binding to 0.0.0.0
    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    
    print(f"Starting LEOS: First Orbit on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
