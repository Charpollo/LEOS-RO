#!/bin/bash

# This script builds the frontend using webpack

# Check if node and npm are installed
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Error: Node.js and npm are required but not installed."
    exit 1
fi

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "${SCRIPT_DIR}"

# Make sure dependencies are installed
if [ ! -d "./node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Ensure the 'frontend/dist' directory exists
if [ ! -d "./frontend/dist" ]; then
    mkdir -p ./frontend/dist
fi

# Build the frontend using webpack
echo "Building frontend..."
npx webpack --config webpack.config.js

echo "Frontend build complete!"
