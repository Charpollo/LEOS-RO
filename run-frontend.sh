#!/bin/bash

# run-frontend.sh - Runs the LEOS First Orbit frontend
# Usage: ./run-frontend.sh [--clean] [--port PORT]

set -e

# Default values
PORT=8080
CLEAN=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --clean) CLEAN=true ;;
        --port) PORT="$2"; shift ;;
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
echo "Building frontend..."
npm run build

# Start the server
echo "Starting HTTP server on port $PORT..."
python3 server.py --port "$PORT"
