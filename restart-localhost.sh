#!/bin/bash

# Kill any existing server on port 8080
echo "Stopping any existing servers on port 8080..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Small delay
sleep 1

# Start with localhost
echo "Starting RED ORBIT on localhost:8080..."
echo ""
echo "============================================"
echo "🚀 RED ORBIT - GPU Physics (1 MILLION objects)"
echo "============================================"
echo ""
echo "Access at: http://localhost:8080"
echo ""
echo "WebGPU Test: http://localhost:8080/webgpu-test.html"
echo ""
echo "NOTE: DO NOT use http://0.0.0.0:8080 - WebGPU requires localhost!"
echo ""

# Run the frontend with localhost
./run-frontend.sh