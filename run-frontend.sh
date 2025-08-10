#!/bin/bash

# run-frontend.sh - Runs the LEOS First Orbit frontend
# Usage: ./run-frontend.sh [--clean] [--port PORT] [--obfuscate]
#   --clean:     Clean build directory before building
#   --port:      Specify port (default: 8080)
#   --obfuscate: Build with production mode (minified only - obfuscation currently disabled)

set -e

# Default values
PORT=8080
CLEAN=false
OBFUSCATE=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --clean) CLEAN=true ;;
        --port) PORT="$2"; shift ;;
        --obfuscate) OBFUSCATE=true ;;
        --prod) OBFUSCATE=true ;; # Keep --prod for backwards compatibility
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Ensure we're in the project root directory
if [ ! -f "package.json" ]; then
    echo "Error: This script must be run from the project root directory."
    exit 1
fi

# Clean if requested
if [ "$CLEAN" = true ]; then
    echo "Cleaning previous build..."
    npm run clean
fi

# Build the frontend
if [ "$OBFUSCATE" = true ]; then
    echo "Building frontend with PRODUCTION mode (minified, no obfuscation)..."
    echo "Note: Obfuscation is currently disabled due to Web Worker compatibility"
    echo "This may take a moment..."
    npm run build:prod
else
    echo "Building frontend for development..."
    npm run build
fi

# Start the server (use localhost for WebGPU compatibility)
echo "Starting HTTP server on localhost:$PORT..."
echo "Access at: http://localhost:$PORT"
echo ""
echo "NOTE: For WebGPU to work, use http://localhost:$PORT not http://0.0.0.0:$PORT"
python3 server.py --host localhost --port "$PORT"
