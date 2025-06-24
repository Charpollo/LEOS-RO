#!/bin/bash

# LEOS Container Builder
# This script builds and pushes Docker containers to Google Artifact Registry
# After pushing, you can deploy them from the Google Cloud Console

# Set terminal colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to show banner
show_banner() {
  echo -e "${BLUE}${BOLD}"
  echo "╔═══════════════════════════════════════════╗"
  echo "║        LEOS CONTAINER BUILDER             ║"
  echo "╚═══════════════════════════════════════════╝"
  echo -e "${NC}"
}

# Function to show help
show_help() {
  echo -e "${BOLD}Usage:${NC} ./build_containers.sh [options]"
  echo ""
  echo -e "${BOLD}Options:${NC}"
  echo "  --dev                    Use development project (leos-first-orbit-dev)"
  echo "  --prod                   Use production project (leos-first-orbit)"
  echo "  --project PROJECT_ID     Custom Google Cloud project ID (overrides --dev/--prod)"
  echo "  --registry REGISTRY      Name of the Artifact Registry (default: leos-registry)"
  echo "  --location LOCATION      Location of the Artifact Registry (default: us-central1)"
  echo "  --tag IMAGE_TAG          Tag for the image (default: latest)"
  echo "  --env ENV                Environment: dev or prod (default: dev)"
  echo "  --clean                  Delete old images before pushing new ones"
  echo "  --help                   Show this help message"
  echo ""
  echo -e "${BOLD}Examples:${NC}"
  echo "  ./build_containers.sh --dev --tag v1.2.3 --clean"
  echo "  ./build_containers.sh --prod --tag v1.0.0"
  echo "  ./build_containers.sh --project custom-project-id --tag latest"
  echo ""
}

# Default values
PROJECT_ID=""
DEV_PROJECT="leos-first-orbit-dev"
PROD_PROJECT="leos-first-orbit"
REGISTRY_NAME="leos-registry"
REGISTRY_LOCATION="us-central1"
IMAGE_TAG="latest"
ENV="dev"
CLEAN_REGISTRY=false

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_ID="$2"
      shift
      ;;
    --dev)
      PROJECT_ID=$DEV_PROJECT
      ENV="dev"
      ;;
    --prod)
      PROJECT_ID=$PROD_PROJECT
      ENV="prod"
      ;;
    --registry)
      REGISTRY_NAME="$2"
      shift
      ;;
    --location)
      REGISTRY_LOCATION="$2"
      shift
      ;;
    --tag)
      IMAGE_TAG="$2"
      shift
      ;;
    --env)
      ENV="$2"
      shift
      ;;
    --clean)
      CLEAN_REGISTRY=true
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

# Validate inputs
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: No project specified. Use --dev, --prod, or --project PROJECT_ID${NC}"
  echo "Examples:"
  echo "  ./build_containers.sh --dev    # Use development project: $DEV_PROJECT"
  echo "  ./build_containers.sh --prod   # Use production project: $PROD_PROJECT"
  echo ""
  echo "Use --help for full usage information"
  exit 1
fi

# Display banner and configuration
show_banner
echo -e "${BOLD}CONTAINER BUILD CONFIGURATION${NC}"
echo "────────────────────────────────────────────"
echo -e "• Project ID:     ${BLUE}${PROJECT_ID}${NC} $(if [[ "$PROJECT_ID" == "$DEV_PROJECT" ]]; then echo -e "${GREEN}(Development)${NC}"; elif [[ "$PROJECT_ID" == "$PROD_PROJECT" ]]; then echo -e "${YELLOW}(Production)${NC}"; else echo -e "${BLUE}(Custom)${NC}"; fi)"
echo -e "• Registry:       ${BLUE}${REGISTRY_NAME}${NC}"
echo -e "• Location:       ${BLUE}${REGISTRY_LOCATION}${NC}"
echo -e "• Image Tag:      ${BLUE}${IMAGE_TAG}${NC}"
echo -e "• Environment:    ${BLUE}${ENV^^}${NC}"
echo -e "• Clean Registry: $(if $CLEAN_REGISTRY; then echo -e "${GREEN}Yes${NC}"; else echo -e "${YELLOW}No${NC}"; fi)"
echo "────────────────────────────────────────────"
echo ""

# Check Google Cloud CLI is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: Google Cloud SDK is not installed or not in PATH${NC}"
  echo "Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
  echo "Please install Docker from: https://docs.docker.com/get-docker/"
  exit 1
fi

# Check if Docker buildx is available for multi-platform builds
if ! docker buildx version &> /dev/null; then
  echo -e "${RED}Error: Docker buildx is not available${NC}"
  echo "Docker buildx is required for building cross-platform images"
  echo "For Docker Desktop users, make sure experimental features are enabled"
  echo "For others, see: https://docs.docker.com/buildx/working-with-buildx/"
  exit 1
fi

# Ensure we have a builder that supports multi-platform builds
if ! docker buildx ls | grep -q "linux/amd64"; then
  echo -e "${YELLOW}Creating a new buildx builder with multi-platform support...${NC}"
  docker buildx create --name multiplatform --platform linux/amd64,linux/arm64 --use
fi

# Check current Google Cloud project
CURRENT_PROJECT=$(gcloud config get-value project)
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
  echo -e "${YELLOW}Warning: Your current gcloud project ($CURRENT_PROJECT) doesn't match the target ($PROJECT_ID).${NC}"
  read -p "Switch to target project? [Y/n]: " switch_project
  
  if [[ ! $switch_project =~ ^[Nn]$ ]]; then
    echo "Switching to project: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
  else
    echo -e "${YELLOW}Warning: Continuing with current project. This might cause errors.${NC}"
  fi
fi

# Step 1: Set up Artifact Registry if it doesn't exist
echo -e "${BOLD}Step 1: Setting up Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe $REGISTRY_NAME \
  --location=$REGISTRY_LOCATION \
  --project=$PROJECT_ID &>/dev/null; then
  echo "Creating Artifact Registry repository..."
  gcloud artifacts repositories create $REGISTRY_NAME \
    --repository-format=docker \
    --location=$REGISTRY_LOCATION \
    --project=$PROJECT_ID
fi

# Clean registry if requested
if $CLEAN_REGISTRY; then
  echo -e "${BOLD}Step 2: Cleaning registry of old images...${NC}"
  
  # This will only clean images with the same name but different tags
  IMAGE_NAME="$REGISTRY_LOCATION-docker.pkg.dev/$PROJECT_ID/$REGISTRY_NAME/leos-first-orbit"
  
  echo "Listing existing images to clean..."
  gcloud artifacts docker images list "$IMAGE_NAME" \
    --include-tags \
    --format="value(package,version)" \
    | grep -v "$IMAGE_TAG" | while read -r image_info; do
      if [[ ! -z "$image_info" ]]; then
        echo "Deleting old image: $image_info"
        gcloud artifacts docker images delete "$image_info" --quiet
      fi
    done
  
  echo "Registry cleaned."
fi

# Step 3: Prepare build directory
echo -e "${BOLD}Step 3: Preparing build directory...${NC}"

# Create a temporary build directory
BUILD_DIR="build_tmp"
if [ -d "$BUILD_DIR" ]; then
  rm -rf "$BUILD_DIR"
fi
mkdir -p "$BUILD_DIR"

# Copy required files
echo "Copying files to build directory..."
cp -r backend "$BUILD_DIR/"
cp -r frontend "$BUILD_DIR/"
cp server.py "$BUILD_DIR/"
cp requirements.txt "$BUILD_DIR/"
cp package.json "$BUILD_DIR/"
cp package-lock.json "$BUILD_DIR/" 2>/dev/null || true  # Copy if exists
cp webpack.config.js "$BUILD_DIR/"

# Use appropriate Dockerfile based on environment
if [[ "$ENV" == "prod" ]]; then
  echo "Using production Dockerfile..."
  if [ -f "Dockerfile.prod" ]; then
    cp Dockerfile.prod "$BUILD_DIR/Dockerfile"
  else
    echo -e "${YELLOW}Warning: Dockerfile.prod not found, using default Dockerfile${NC}"
    cp Dockerfile "$BUILD_DIR/Dockerfile"
  fi
else
  echo "Using development Dockerfile..."
  cp Dockerfile "$BUILD_DIR/Dockerfile"
fi

# Step 4: Build Docker image
echo -e "${BOLD}Step 4: Building Docker image locally...${NC}"

# Full image name with tag
IMAGE_NAME="$REGISTRY_LOCATION-docker.pkg.dev/$PROJECT_ID/$REGISTRY_NAME/leos-first-orbit:$IMAGE_TAG"

echo "Building Docker image: $IMAGE_NAME"
echo "This may take a few minutes..."

# Build the image specifically for linux/amd64 platform (required for Google Cloud Run)
# This ensures compatibility regardless of local machine architecture (e.g., Apple Silicon M1/M2)
echo "Building for linux/amd64 platform to ensure Google Cloud Run compatibility..."
docker buildx build --platform linux/amd64 --output type=docker -t "$IMAGE_NAME" "$BUILD_DIR"

# Check if build was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Docker build failed. See error messages above.${NC}"
  exit 1
fi

# Step 5: Configure Docker for Google Artifact Registry
echo -e "${BOLD}Step 5: Configuring Docker for Google Artifact Registry...${NC}"
gcloud auth configure-docker "$REGISTRY_LOCATION-docker.pkg.dev" --quiet

# Step 6: Push Docker image to Artifact Registry
echo -e "${BOLD}Step 6: Pushing Docker image to Artifact Registry...${NC}"
echo "Pushing $IMAGE_NAME..."
docker push "$IMAGE_NAME"

# Check if push was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to push image to Artifact Registry. See error messages above.${NC}"
  exit 1
fi

# Cleanup build directory
echo "Cleaning up build directory..."
rm -rf "$BUILD_DIR"

# Success message
echo ""
echo -e "${GREEN}${BOLD}✅ Container built and pushed successfully!${NC}"
echo -e "Image is now available at: ${BLUE}${BOLD}$IMAGE_NAME${NC}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "1. Go to the Google Cloud Console: https://console.cloud.google.com/run"
echo "2. Deploy a new service or update an existing one using this image"
echo "3. Configure service settings (memory, CPU, autoscaling, etc.) as needed"
echo ""

# Ask if the user wants to deploy directly to Cloud Run
echo -e "${BOLD}Would you like to deploy this image to Cloud Run now?${NC}"
read -p "Deploy to Cloud Run? [y/N]: " deploy_choice

if [[ $deploy_choice =~ ^[Yy]$ ]]; then
  echo -e "${BOLD}Step 7: Deploying to Google Cloud Run...${NC}"
  
  # Ask for service name with appropriate default based on environment
  read -p "Service name [default: leos-first-orbit${ENV == "prod" ? "" : "-dev"}]: " service_name
  service_name=${service_name:-"leos-first-orbit${ENV == "prod" ? "" : "-dev"}"}
  
  # Ask for region with default from registry location
  read -p "Region [default: $REGISTRY_LOCATION]: " region
  region=${region:-$REGISTRY_LOCATION}
  
  echo "Deploying service: $service_name to region: $region..."
  
  # Set platform allowed traffic based on environment
  if [[ "$ENV" == "prod" ]]; then
    # For production, we want to be careful about allowing unauthenticated access
    read -p "Allow unauthenticated access? [y/N]: " allow_unauth
    if [[ $allow_unauth =~ ^[Yy]$ ]]; then
      auth_flag="--allow-unauthenticated"
    else
      auth_flag=""
    fi
  else
    # For dev, default to allowing unauthenticated access
    auth_flag="--allow-unauthenticated"
  fi
  
  # Deploy using gcloud run deploy
  gcloud run deploy "$service_name" \
    --image="$IMAGE_NAME" \
    --platform=managed \
    --region="$region" \
    --project="$PROJECT_ID" \
    $auth_flag
  
  # If deployment was successful, show the URL
  if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}${BOLD}✅ Deployment successful!${NC}"
    
    # Get the service URL
    service_url=$(gcloud run services describe "$service_name" \
      --region="$region" \
      --project="$PROJECT_ID" \
      --format="value(status.url)")
    
    echo -e "Your application is available at: ${BLUE}${BOLD}$service_url${NC}"
  else
    echo -e "${RED}Error: Deployment failed. Please check the error messages above.${NC}"
  fi
else
  echo -e "You can also deploy using the gcloud command line:"
  echo -e "${YELLOW}gcloud run deploy SERVICE_NAME --image=$IMAGE_NAME --platform=managed --region=$REGISTRY_LOCATION${NC}"
fi

echo ""
