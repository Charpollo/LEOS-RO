# LEOS Deployment Guide

## Manual Container Build & Deployment

Instead of using the automated deploy script, you can now build and push containers manually and then deploy them from the Google Cloud Console.

### Building and Pushing Containers

Use the new `build_containers.sh` script to build and push containers to Google Artifact Registry:

```bash
./build_containers.sh --project YOUR_PROJECT_ID [options]
```

#### Options:

- `--project PROJECT_ID` (required): Your Google Cloud project ID
- `--registry REGISTRY` (default: leos-registry): Artifact Registry name
- `--location LOCATION` (default: us-central1): Registry location
- `--tag IMAGE_TAG` (default: latest): Image tag version
- `--env ENV` (default: dev): Environment (dev or prod)
- `--clean`: Clean old images before pushing new ones
- `--help`: Show help message

#### Examples:

Build and push a development container:
```bash
./build_containers.sh --project leos-first-orbit-dev
```

Build and push a production container with a specific version tag:
```bash
./build_containers.sh --project leos-first-orbit --env prod --tag v1.2.3
```

### Deploying from Google Cloud Console

After pushing your container to Artifact Registry, you can deploy it using the Google Cloud Console:

1. Go to [Cloud Run](https://console.cloud.google.com/run)
2. Click "Create Service" or select an existing service to update
3. Select "Container image URL" and browse to your container in Artifact Registry
4. Configure service settings:
   - Service name
   - Region
   - CPU and memory allocation
   - Autoscaling settings
   - Authentication
5. Click "Create" or "Deploy" to deploy your service

### Command Line Deployment

You can also deploy your service using the gcloud command line:

```bash
gcloud run deploy SERVICE_NAME \
  --image=LOCATION-docker.pkg.dev/PROJECT_ID/REGISTRY/leos-first-orbit:TAG \
  --platform=managed \
  --region=REGION \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --allow-unauthenticated
```

Replace the capitalized values with your specific configuration.

### Important Notes

- The satellite model paths in `satellites.js` have been updated to work in both local and cloud environments
- The build process will include all necessary assets from the frontend/assets directory
- For local development, you can still use the `dev.sh` script
