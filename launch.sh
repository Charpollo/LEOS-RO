#!/bin/bash

# Kill existing processes
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Build frontend
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed"
    exit 1
fi

# Start telemetry server
cd telemetry-server
node server.js > ../telemetry-server.log 2>&1 &
cd ..

# Start simulation
echo "LEOS-RO running at http://localhost:8080"
./run-frontend.sh