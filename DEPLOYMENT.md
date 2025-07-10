# LEOS First Orbit - Deployment Guide

## Local Development

### Standard Development (No Obfuscation)
```bash
./run-frontend.sh
```

### Testing with Obfuscation Locally
```bash
# Test the production build with obfuscation before deploying
./run-frontend.sh --obfuscate

# With clean build
./run-frontend.sh --clean --obfuscate

# On custom port
./run-frontend.sh --obfuscate --port 8001
```

## Production Deployment (Netlify)

### Automatic Deployment
The project is configured to automatically deploy to Netlify when you push to your main branch. The build process will:

1. Install dependencies: `npm install`
2. Build with production configuration: `npm run build:prod`
3. Apply minimal obfuscation to protect the code
4. Deploy the `frontend/dist` directory

### Manual Deployment
If you need to deploy manually:

```bash
# Build production version locally
npm run build:prod

# Deploy using Netlify CLI
netlify deploy --prod --dir=frontend/dist
```

## Build Configurations

### Development Build (webpack.config.js)
- No obfuscation
- Source maps enabled
- Fast builds
- Console logs preserved

### Production Build (webpack.config.prod.js)
- **Obfuscation currently DISABLED** due to Web Worker compatibility issues
- Minified and compressed with Terser
- Console logs removed
- No source maps
- Optimized for performance
- Gzip and Brotli compression

## Obfuscation Status

**Currently Disabled**: JavaScript obfuscation has been disabled in production builds because it was breaking Web Workers used by Babylon.js. The code is still protected by:
- Minification (variable/function name shortening)
- Removal of console logs and comments
- No source maps in production
- Standard webpack bundling

## Troubleshooting

### If you get "undefined reference" errors after deployment:
1. Test locally with `./run-frontend.sh --obfuscate`
2. Check browser console for specific error messages
3. The obfuscation settings have been minimized to prevent these errors

### To disable obfuscation completely:
Edit `webpack.config.prod.js` and comment out the `JavaScriptObfuscator` plugin.

## Environment Variables

- `NODE_ENV=production` - Set automatically by Netlify
- `NODE_VERSION=18` - Specified in netlify.toml