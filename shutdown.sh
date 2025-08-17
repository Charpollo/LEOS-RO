#!/bin/bash

# Stop all services
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
echo "LEOS-RO stopped"