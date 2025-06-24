#!/bin/bash

# LEOS Assets Copy Script
# This script ensures that all necessary assets are correctly copied to the dist directory

echo "Ensuring assets are correctly copied for deployment..."

# Create dist directory if it doesn't exist
if [ ! -d "dist" ]; then
  mkdir -p dist
fi

# Create assets directory inside dist if it doesn't exist 
if [ ! -d "dist/frontend/assets" ]; then
  mkdir -p dist/frontend/assets
fi

# Copy all assets to the dist directory
echo "Copying 3D models and texture assets..."
cp -r frontend/assets/* dist/frontend/assets/

# Verify that critical assets exist
if [ -f "dist/frontend/assets/crts_satellite.glb" ] && [ -f "dist/frontend/assets/bulldog_sat.glb" ]; then
  echo "✅ Satellite models verified in dist directory"
else
  echo "❌ WARNING: Satellite model files may be missing from the dist directory!"
  echo "Please check if assets/crts_satellite.glb and assets/bulldog_sat.glb exist in your source directory."
fi

echo "Assets copy completed."
