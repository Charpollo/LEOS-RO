#!/bin/bash
# LEOS First Orbit - Development Script
# A helper script for local development that provides various commands

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Banner for the script
show_banner() {
    echo -e "${BLUE}${BOLD}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║         LEOS DEVELOPMENT HELPER           ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Help information
show_help() {
    echo -e "${BOLD}LEOS Development Helper${NC}"
    echo
    echo -e "Usage: ${BOLD}./dev.sh <command>${NC}"
    echo
    echo -e "Commands:"
    echo -e "  ${BOLD}start${NC}        Start the server (default port 8080)"
    echo -e "  ${BOLD}dev${NC}          Start with auto-rebuilding and debug mode"
    echo -e "  ${BOLD}watch${NC}        Start webpack in watch mode only"
    echo -e "  ${BOLD}build${NC}        Build the frontend with webpack"
    echo -e "  ${BOLD}clean${NC}        Clean build artifacts and caches"
    echo -e "  ${BOLD}port <number>${NC} Specify a custom port (default: 8080)"
    echo -e "  ${BOLD}help${NC}         Show this help message"
    echo
    echo -e "Examples:"
    echo -e "  ${BOLD}./dev.sh dev${NC}               # Start in development mode"
    echo -e "  ${BOLD}./dev.sh port 8081${NC}         # Start on port 8081"
    echo -e "  ${BOLD}./dev.sh clean build start${NC} # Clean, build, then start"
    echo
}

# Check dependencies and install if needed
check_dependencies() {
    # Check Python is installed
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Error: Python 3 is required but not installed.${NC}"
        exit 1
    fi
    
    # Check Node.js is installed
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: Node.js and npm are required but not installed.${NC}"
        exit 1
    fi
    
    # Install Python dependencies if requirements.txt exists
    if [ -f "requirements.txt" ] && [ ! -d "venv" ]; then
        echo -e "${YELLOW}Python dependencies not installed. Install now? (y/n)${NC}"
        read -r install_deps
        if [[ $install_deps =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Installing Python dependencies...${NC}"
            python3 -m pip install -r requirements.txt
        fi
    fi
    
    # Install Node dependencies if package.json exists and node_modules doesn't
    if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Node.js dependencies not installed. Install now? (y/n)${NC}"
        read -r install_deps
        if [[ $install_deps =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Installing Node.js dependencies...${NC}"
            npm install
        fi
    fi
}

# Build the frontend
build_frontend() {
    echo -e "${BLUE}Building frontend with webpack...${NC}"
    if [ -f "build_frontend.sh" ]; then
        chmod +x ./build_frontend.sh
        ./build_frontend.sh
    else
        npm run build
    fi
    echo -e "${GREEN}Frontend build complete!${NC}"
}

# Start webpack in watch mode
watch_frontend() {
    echo -e "${BLUE}Starting webpack in watch mode...${NC}"
    npm run watch
}

# Start the server
start_server() {
    local port=${1:-8080}
    echo -e "${BLUE}Starting LEOS: First Orbit on http://localhost:${port}${NC}"
    python3 server.py --port "$port"
}

# Start in development mode
start_dev() {
    local port=${1:-8080}
    echo -e "${BLUE}Starting LEOS: First Orbit in development mode on http://localhost:${port}${NC}"
    python3 server.py --port "$port" --watch --debug
}

# Clean build artifacts
clean() {
    echo -e "${BLUE}Cleaning build artifacts...${NC}"
    
    # Remove frontend bundles
    if [ -f "frontend/bundle.js" ]; then
        rm -f frontend/bundle.js*
        echo -e "  ${GREEN}✓${NC} Removed bundle.js"
    fi
    
    # Remove Python cache files
    find . -type d -name "__pycache__" -exec rm -rf {} +
    find . -name "*.pyc" -delete
    echo -e "  ${GREEN}✓${NC} Removed Python cache files"
    
    # Remove cache directory
    if [ -d "cache" ]; then
        rm -rf cache/*
        echo -e "  ${GREEN}✓${NC} Cleared cache directory"
    fi
    
    echo -e "${GREEN}Clean completed!${NC}"
}

# Main logic
PORT=8080

if [[ $# -eq 0 ]]; then
    show_banner
    show_help
    exit 0
fi

# Process all arguments in sequence
while [[ $# -gt 0 ]]; do
    case "$1" in
        help)
            show_banner
            show_help
            exit 0
            ;;
        build)
            check_dependencies
            build_frontend
            ;;
        watch)
            check_dependencies
            watch_frontend
            ;;
        clean)
            clean
            ;;
        start)
            check_dependencies
            start_server "$PORT"
            ;;
        dev)
            check_dependencies
            start_dev "$PORT"
            ;;
        port)
            shift
            if [[ $1 =~ ^[0-9]+$ ]]; then
                PORT=$1
            else
                echo -e "${RED}Error: Invalid port number '$1'${NC}"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$1'${NC}"
            show_help
            exit 1
            ;;
    esac
    shift
done
