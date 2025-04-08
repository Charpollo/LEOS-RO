#!/bin/bash

# LEOS First Orbit - Cloud Deployment Script
# Interactive deployment script for dev and production environments

# Set terminal colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration variables with defaults
PROJECT_ID="leos-first-orbit-dev"
SERVICE_NAME="leos-first-orbit-dev"
REGION="us-central1"
REGISTRY_NAME="leos-registry"
REGISTRY_LOCATION="us-central1"
OBFUSCATE=true
ENV="dev"

# Function to show banner
show_banner() {
  clear
  echo -e "${BLUE}${BOLD}"
  echo "╔═══════════════════════════════════════════╗"
  echo "║         LEOS: FIRST ORBIT DEPLOYER        ║"
  echo "╚═══════════════════════════════════════════╝"
  echo -e "${NC}"
}

# Function to show help
show_help() {
  echo -e "${BOLD}Usage:${NC} ./deploy.sh [options]"
  echo ""
  echo -e "${BOLD}Options:${NC}"
  echo "  --dev               Deploy to development environment (default)"
  echo "  --production        Deploy to production environment"
  echo "  --obfuscate         Enable code obfuscation (default)"
  echo "  --no-obfuscate      Disable code obfuscation"
  echo "  --interactive       Run in interactive mode with prompts (default if no args provided)"
  echo "  --help              Show this help message"
  echo ""
  echo -e "${BOLD}Examples:${NC}"
  echo "  ./deploy.sh --dev --no-obfuscate     # Deploy to dev without obfuscation"
  echo "  ./deploy.sh --production             # Deploy to production with obfuscation"
  echo "  ./deploy.sh --interactive            # Start interactive deployment process"
  echo ""
}

# Process command line arguments
INTERACTIVE=false
if [ $# -eq 0 ]; then
  INTERACTIVE=true
else
  while [[ "$#" -gt 0 ]]; do
    case $1 in
      --dev)
        ENV="dev"
        PROJECT_ID="leos-first-orbit-dev"
        SERVICE_NAME="leos-first-orbit-dev"
        ;;
      --production)
        ENV="prod"
        PROJECT_ID="leos-first-orbit"
        SERVICE_NAME="leos-first-orbit"
        ;;
      --obfuscate)
        OBFUSCATE=true
        ;;
      --no-obfuscate)
        OBFUSCATE=false
        ;;
      --interactive)
        INTERACTIVE=true
        ;;
      --help)
        show_banner
        show_help
        exit 0
        ;;
      *)
        echo -e "${RED}Unknown parameter: $1${NC}"
        echo "Use --help for usage information"
        exit 1
        ;;
    esac
    shift
  done
fi

# Interactive mode
if $INTERACTIVE; then
  show_banner
  
  echo -e "${BOLD}Welcome to the LEOS: First Orbit deployment tool!${NC}"
  echo "This script will help you deploy the application to Google Cloud Run."
  echo ""
  
  # Environment selection
  echo -e "${BOLD}Step 1: Select deployment environment${NC}"
  echo "1) Development (leos-first-orbit-dev)"
  echo "2) Production (leos-first-orbit)"
  echo ""
  
  ENV_SELECTED=false
  while ! $ENV_SELECTED; do
    read -p "Select environment [1-2]: " env_choice
    case $env_choice in
      1)
        ENV="dev"
        PROJECT_ID="leos-first-orbit-dev"
        SERVICE_NAME="leos-first-orbit-dev"
        ENV_SELECTED=true
        ;;
      2)
        ENV="prod"
        PROJECT_ID="leos-first-orbit"
        SERVICE_NAME="leos-first-orbit"
        ENV_SELECTED=true
        ;;
      *)
        echo -e "${RED}Invalid selection. Please choose 1 or 2.${NC}"
        ;;
    esac
  done
  
  echo -e "${GREEN}✓ Environment set to: ${BOLD}${ENV}${NC}"
  echo ""
  
  # Obfuscation selection
  echo -e "${BOLD}Step 2: Configure code obfuscation${NC}"
  echo "Obfuscation protects your source code but makes debugging harder."
  echo "Recommended: Enable for production, disable for development."
  echo ""
  
  OBFUSCATE_SELECTED=false
  while ! $OBFUSCATE_SELECTED; do
    if [ "$ENV" == "prod" ]; then
      # For production, default to Yes
      read -p "Enable code obfuscation? [Y/n]: " obfuscate_choice
      case $obfuscate_choice in
        [Nn]*)
          OBFUSCATE=false
          OBFUSCATE_SELECTED=true
          ;;
        *)
          OBFUSCATE=true
          OBFUSCATE_SELECTED=true
          ;;
      esac
    else
      # For development, default to No
      read -p "Enable code obfuscation? [y/N]: " obfuscate_choice
      case $obfuscate_choice in
        [Yy]*)
          OBFUSCATE=true
          OBFUSCATE_SELECTED=true
          ;;
        *)
          OBFUSCATE=false
          OBFUSCATE_SELECTED=true
          ;;
      esac
    fi
  done
  
  if $OBFUSCATE; then
    echo -e "${GREEN}✓ Code obfuscation: ${BOLD}Enabled${NC}"
  else
    echo -e "${GREEN}✓ Code obfuscation: ${BOLD}Disabled${NC}"
  fi
  echo ""
  
  # Region selection
  echo -e "${BOLD}Step 3: Select deployment region${NC}"
  echo "1) us-central1 (Iowa) - Default"
  echo "2) us-east1 (South Carolina)"
  echo "3) us-west1 (Oregon)"
  echo "4) europe-west1 (Belgium)"
  echo "5) asia-east1 (Taiwan)"
  echo ""
  
  read -p "Select region [1-5, default: 1]: " region_choice
  case $region_choice in
    2)
      REGION="us-east1"
      ;;
    3)
      REGION="us-west1"
      ;;
    4)
      REGION="europe-west1"
      ;;
    5)
      REGION="asia-east1"
      ;;
    *)
      REGION="us-central1"
      ;;
  esac
  
  echo -e "${GREEN}✓ Region set to: ${BOLD}${REGION}${NC}"
  echo ""
fi

# Display deployment summary
show_banner
echo -e "${BOLD}DEPLOYMENT SUMMARY${NC}"
echo "────────────────────────────────────────────"
echo -e "• Environment:    ${BLUE}${ENV^^}${NC}"
echo -e "• Project ID:     ${PROJECT_ID}"
echo -e "• Service Name:   ${SERVICE_NAME}"
echo -e "• Region:         ${REGION}"
echo -e "• Obfuscation:    $(if $OBFUSCATE; then echo -e "${GREEN}Enabled${NC}"; else echo -e "${YELLOW}Disabled${NC}"; fi)"
echo "────────────────────────────────────────────"

# Warning for production without obfuscation
if [[ "$ENV" == "prod" && "$OBFUSCATE" == "false" ]]; then
  echo ""
  echo -e "${RED}${BOLD}⚠️  WARNING: DEPLOYING TO PRODUCTION WITHOUT OBFUSCATION! ⚠️${NC}"
  echo -e "${RED}This will expose your source code and may compromise intellectual property.${NC}"
  echo ""
elif [[ "$ENV" == "prod" ]]; then
  echo ""
  echo -e "${YELLOW}${BOLD}⚠️  CAUTION: DEPLOYING TO PRODUCTION ENVIRONMENT! ⚠️${NC}"
  echo ""
fi

# Check for current gcloud configuration
echo -e "${BOLD}Current gcloud configuration:${NC}"
CURRENT_PROJECT=$(gcloud config get-value project)
echo "• Project: $CURRENT_PROJECT"

# Final confirmation
echo ""
read -p "Continue with deployment? [y/N]: " final_confirmation
if [[ ! $final_confirmation =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  exit 0
fi

# If current project is different from target, ask to switch
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
  echo ""
  echo -e "${YELLOW}Your current gcloud project ($CURRENT_PROJECT) doesn't match the target ($PROJECT_ID).${NC}"
  read -p "Switch to target project? [Y/n]: " switch_project
  
  if [[ ! $switch_project =~ ^[Nn]$ ]]; then
    echo "Switching to project: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
  else
    echo -e "${YELLOW}Warning: Continuing with current project. This might cause errors.${NC}"
  fi
fi

echo ""
echo -e "${BLUE}${BOLD}Starting deployment process...${NC}"

# Check for Python command
if command -v python3 &> /dev/null; then
  PYTHON_CMD=python3
elif command -v python &> /dev/null; then
  PYTHON_CMD=python
else
  echo -e "${RED}Error: Python is not installed or not in PATH${NC}"
  exit 1
fi

# 1. Prepare code (with or without obfuscation)
if $OBFUSCATE; then
  echo -e "${BOLD}Step 1: Obfuscating Python and frontend code...${NC}"
  $PYTHON_CMD obfuscate.py
  
  # Check if obfuscation was successful
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Code obfuscation failed. Check the logs above.${NC}"
    read -p "Continue without obfuscation? [y/N]: " continue_without_obfuscation
    if [[ ! $continue_without_obfuscation =~ ^[Yy]$ ]]; then
      echo -e "${YELLOW}Deployment aborted.${NC}"
      exit 1
    else
      echo -e "${YELLOW}Continuing without obfuscation.${NC}"
      # Create a simple dist directory without obfuscation
      if [ -d "dist" ]; then
        rm -rf dist
      fi
      mkdir -p dist
      cp -r backend dist/
      cp -r frontend dist/
      cp server.py dist/
      cp requirements.txt dist/
    fi
  fi
else
  echo -e "${BOLD}Step 1: Preparing code without obfuscation...${NC}"
  # Create a simple dist directory without obfuscation
  if [ -d "dist" ]; then
    rm -rf dist
  fi
  mkdir -p dist
  cp -r backend dist/
  cp -r frontend dist/
  cp server.py dist/
  cp requirements.txt dist/
fi

# 2. Set up Artifact Registry (faster than Container Registry)
echo -e "${BOLD}Step 2: Setting up Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe $REGISTRY_NAME \
  --location=$REGISTRY_LOCATION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create $REGISTRY_NAME \
    --repository-format=docker \
    --location=$REGISTRY_LOCATION \
    --project=$PROJECT_ID
fi

# 3. Build and push Docker image
echo -e "${BOLD}Step 3: Building and pushing Docker image...${NC}"
IMAGE_NAME="$REGISTRY_LOCATION-docker.pkg.dev/$PROJECT_ID/$REGISTRY_NAME/$SERVICE_NAME:latest"

# Use appropriate Dockerfile based on environment
if [[ "$ENV" == "prod" ]]; then
  echo "Using production Dockerfile (Dockerfile.prod)..."
  cp Dockerfile.prod dist/Dockerfile
else
  echo "Using development Dockerfile..."
  cp Dockerfile dist/Dockerfile
fi

# Use optimized build command with machine options for faster build
echo "Building Docker image (this may take a few minutes)..."
gcloud builds submit dist/ --tag $IMAGE_NAME \
  --machine-type=e2-highcpu-8 \
  --timeout=15m

# 4. Deploy to Cloud Run with optimal settings
echo -e "${BOLD}Step 4: Deploying to Cloud Run...${NC}"

# Different settings for dev vs prod
if [[ "$ENV" == "prod" ]]; then
  # Production settings: more resources, autoscaling
  gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --concurrency 80 \
    --allow-unauthenticated
else
  # Development settings: fewer resources
  gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 5 \
    --concurrency 40 \
    --allow-unauthenticated
fi

# Show success message with service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format "value(status.url)")

# Final success message
echo ""
echo -e "${GREEN}${BOLD}✅ Deployment complete!${NC}"
echo -e "${BOLD}Your application is now available at:${NC}"
echo -e "${BLUE}${BOLD}$SERVICE_URL${NC}"
echo ""
if [[ "$ENV" == "dev" ]]; then
  echo -e "You deployed to the ${BLUE}DEVELOPMENT${NC} environment."
else
  echo -e "You deployed to the ${YELLOW}PRODUCTION${NC} environment."
fi
echo -e "Deployed version: $(date +"%Y-%m-%d %H:%M:%S")"
echo ""
echo -e "${BOLD}Would you like to:${NC}"
echo "1) Open the application in your browser"
echo "2) View deployment logs"
echo "3) Exit"
read -p "Select an option [1-3]: " final_option

case $final_option in
  1)
    echo "Opening application in browser..."
    if command -v open &> /dev/null; then
      open $SERVICE_URL
    elif command -v xdg-open &> /dev/null; then
      xdg-open $SERVICE_URL
    else
      echo -e "${YELLOW}Unable to open browser automatically. Please visit:${NC}"
      echo $SERVICE_URL
    fi
    ;;
  2)
    echo "Fetching logs for $SERVICE_NAME..."
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" --limit 20 --format "value(textPayload)"
    ;;
  3)
    echo "Exiting deployment script."
    ;;
esac
