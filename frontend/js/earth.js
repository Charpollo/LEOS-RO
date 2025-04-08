/**
 * LEOS First Orbit - Earth Module
 * Creates and manages Earth, clouds, atmosphere and moon objects
 */

import { 
  EARTH_ROTATION_SPEED, 
  EARTH_RADIUS, 
  EARTH_DISPLAY_RADIUS, 
  MOON_DISTANCE,
  MOON_RADIUS,
  MOON_ROTATION_SPEED
} from './config.js';

import { getScene, getCamera } from './scene.js'; // Added getCamera import
import { logMessage } from './utils.js';

// Global references
let earthGroup, earthMesh, cloudsMesh, moonObject, atmosphereMesh, nightLightsMesh;

// Export objects for other modules
export function getEarthGroup() {
  return earthGroup;
}

export function getEarthMesh() {
  return earthMesh;
}

export function getMoonObject() {
  return moonObject;
}

// Create Earth group (Earth + clouds + atmosphere)
export function createEarthGroup() {
  logMessage("Creating Earth and atmosphere");
  
  // Create a group to hold Earth-related objects
  earthGroup = new THREE.Group();
  earthGroup.name = "EarthGroup";
  
  // Add axial tilt to match Earth's natural tilt of 23.5 degrees
  earthGroup.rotation.z = 23.5 * (Math.PI / 180);
  
  // Add to scene
  const scene = getScene();
  scene.add(earthGroup);
  
  // Create Earth with high-resolution textures
  createEarth();
  
  // Create clouds layer
  createClouds();
  
  // Create night lights
  createNightLights();
  
  // Position and scale Earth 
  earthGroup.position.set(0, 0, 0);
  earthGroup.scale.set(1, 1, 1);
  
  return earthGroup;
}

// Create the Earth with improved materials and textures
function createEarth() {
  // Load Earth textures with onProgress and onError handlers
  const textureLoader = new THREE.TextureLoader();
  
  // Load high-resolution diffuse (day) texture - using your actual asset
  const earthDiffuseTexture = textureLoader.load(
    "assets/earth_diffuse.png", 
    texture => {
      logMessage("Earth diffuse texture loaded successfully");
      texture.anisotropy = 16; // Higher anisotropy for sharper textures at angles
      
      // Apply more refined color adjustments for realistic Earth colors with better contrast
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const img = texture.image;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the original texture
      context.drawImage(img, 0, 0);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        if (brightness > 200) {
          const reductionFactor = 0.85;
          data[i] = Math.round(data[i] * reductionFactor);
          data[i+1] = Math.round(data[i+1] * reductionFactor);
          data[i+2] = Math.round(data[i+2] * reductionFactor);
        }
        
        if (data[i] > 100 && data[i+1] > 80 && data[i+2] < 120) {
          if (data[i] > data[i+1]) {
            data[i] = Math.min(240, data[i] * 1.1);
            data[i+1] = Math.min(220, data[i+1] * 1.05);
            data[i+2] = Math.min(160, data[i+2] * 1.1);
          } else if (data[i+1] > data[i]) {
            data[i+1] = Math.min(210, data[i+1] * 0.92);
            data[i] = Math.min(190, data[i] * 1.02);
          }
          
          const avgLand = (data[i] + data[i+1] + data[i+2]) / 3;
          const contrastFactor = 1.15;
          data[i] = Math.round(avgLand + (data[i] - avgLand) * contrastFactor);
          data[i+1] = Math.round(avgLand + (data[i+1] - avgLand) * contrastFactor);
          data[i+2] = Math.round(avgLand + (data[i+2] - avgLand) * contrastFactor);
          
          data[i] = Math.min(255, Math.max(0, data[i]));
          data[i+1] = Math.min(255, Math.max(0, data[i+1]));
          data[i+2] = Math.min(255, Math.max(0, data[i+2]));
        }
        
        if (data[i+2] > data[i] && data[i+2] > data[i+1]) {
          data[i+2] = Math.min(230, data[i+2] * 1.03);
          data[i] = Math.min(160, data[i] * 0.92);
          data[i+1] = Math.min(180, data[i+1] * 0.94);
          
          const avgWater = (data[i] + data[i+1] + data[i+2]) / 3;
          const waterContrastFactor = 1.2;
          data[i] = Math.round(avgWater + (data[i] - avgWater) * waterContrastFactor);
          data[i+1] = Math.round(avgWater + (data[i+1] - avgWater) * waterContrastFactor);
          data[i+2] = Math.round(avgWater + (data[i+2] - avgWater) * waterContrastFactor);
          
          data[i] = Math.min(255, Math.max(0, data[i]));
          data[i+1] = Math.min(255, Math.max(0, data[i+1]));
          data[i+2] = Math.min(255, Math.max(0, data[i+2]));
        }
      }
      
      context.putImageData(imageData, 0, 0);
      
      texture.image = canvas;
      texture.needsUpdate = true;
    },
    undefined,
    error => logMessage(`Error loading Earth diffuse texture: ${error.message}`)
  );
  
  // Create custom Earth material with enhanced color vibrancy for dayside
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: earthDiffuseTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      ambientLight: { value: 0.08 },
      nightColor: { value: new THREE.Color(0x102050) },
      colorBoost: { value: 1.2 },  // Color enhancement amount
      waterColor: { value: new THREE.Color(0x0066aa) }, // Enhanced water color
      landColor: { value: new THREE.Color(0x267F00) }   // Enhanced land color
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform vec3 sunDirection;
      uniform float ambientLight;
      uniform vec3 nightColor;
      uniform float colorBoost;
      uniform vec3 waterColor;
      uniform vec3 landColor;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        // Calculate normalized direction from center of Earth to this fragment
        vec3 normalizedPosition = normalize(vPosition);
        
        // Calculate light factor using the dot product of surface normal and sun direction
        float lightFactor = dot(normalizedPosition, normalize(sunDirection));
        
        // Create a wider/smoother day/night transition
        float dayMix = smoothstep(-0.15, 0.15, lightFactor); 
        
        // Sample day texture
        vec4 dayColor = texture2D(dayTexture, vUv);
        
        // Enhance day colors when fully lit
        vec3 enhancedDay = dayColor.rgb;
        
        // Increase contrast and vibrancy on day side
        enhancedDay = pow(enhancedDay, vec3(0.95)); // Slight gamma adjustment
        
        // Detect water vs land (blue channel higher than red for water)
        float isWater = step(enhancedDay.r, enhancedDay.b - 0.1);
        
        // Enhance water and land separately
        if (isWater > 0.5) {
          // Water enhancement - more blue, deeper
          enhancedDay += (waterColor.rgb - enhancedDay) * 0.15 * dayMix;
          enhancedDay.b *= 1.1; // Boost blue for water
        } else {
          // Land enhancement - more vibrant
          enhancedDay += (landColor.rgb - enhancedDay) * 0.08 * dayMix;
          enhancedDay.g *= 1.05; // Boost green for land
        }
        
        // Apply final color boost on day side
        enhancedDay = mix(dayColor.rgb, enhancedDay * colorBoost, dayMix * 0.7);
        
        // Create enhanced night side with deeper color tint but more subtle
        vec4 nightBaseColor = dayColor * (ambientLight * 0.8); // Reduced ambient light by 20%
        
        // Create a subtle variation in the night color based on the texture
        float textureBrightness = (dayColor.r + dayColor.g + dayColor.b) / 3.0;
        
        // More subtle night colors - deeper blues, less purple
        // Significantly toned down from previous values
        vec3 nightDeepOcean = vec3(0.03, 0.06, 0.16);  // Deeper, darker blue for oceans
        vec3 nightShallowOcean = vec3(0.04, 0.08, 0.18); // Slightly lighter blue for shallow waters
        vec3 nightLandDark = vec3(0.06, 0.04, 0.12);   // More subtle purple-blue for dark land
        vec3 nightLandLight = vec3(0.08, 0.05, 0.14);  // Slightly lighter for exposed land
        
        // Choose base night color based on water vs land
        vec3 baseNightColor = mix(
            mix(nightDeepOcean, nightShallowOcean, smoothstep(0.05, 0.2, textureBrightness)), 
            mix(nightLandDark, nightLandLight, smoothstep(0.2, 0.4, textureBrightness)),
            step(dayColor.r, dayColor.b) < 0.5 ? 0.9 : 0.1);
        
        // Add subtle variation based on land/water boundary from day texture, but toned down
        float landWaterEdge = abs(dayColor.r - dayColor.b);
        vec3 edgeGlow = vec3(0.07, 0.06, 0.12) * smoothstep(0.05, 0.2, landWaterEdge);
        
        // Mix night colors based on original texture to preserve detail, but more subtle
        vec3 detailedNight = mix(
            baseNightColor,
            mix(nightBaseColor.rgb * 1.5, baseNightColor, 0.7), // Reduced multiplier from 3.0 to 1.5
            0.2); // Reduced from 0.3
        
        // Add edge glow to bring out coastlines at night, but more subtle
        detailedNight += edgeGlow * 0.3; // Reduced from 0.5
        
        // Add variation based on texture brightness, but toned down
        float nightBrightness = smoothstep(0.1, 0.4, textureBrightness);
        detailedNight = mix(detailedNight, detailedNight * 1.15, nightBrightness * 0.3); // Reduced from 1.4 and 0.5
        
        // Ensure night side is darker overall
        vec3 finalNight = detailedNight * 0.8; // Reduced from 1.2
        
        // Add more subtle rim lighting at terminator for a more gradual sunrise/sunset
        float rim = smoothstep(-0.3, -0.05, lightFactor) * smoothstep(0.15, -0.15, lightFactor);
        float sunsetGlow = smoothstep(-0.25, -0.15, lightFactor) * smoothstep(-0.05, -0.15, lightFactor);
        
        // Further reduced orange sunset colors for an even more subtle terminator effect
        vec3 sunsetColor = vec3(0.5, 0.38, 0.25); // Significantly reduced from previous 0.7, 0.5, 0.3
        finalNight += rim * vec3(0.05, 0.03, 0.0) * 0.4; // Reduced from 0.08, 0.04, 0.0 and 0.6
        finalNight += sunsetGlow * sunsetColor * 0.15; // Reduced from 0.3
        
        // Final blend between night and enhanced day
        gl_FragColor = mix(vec4(finalNight, 1.0), vec4(enhancedDay, 1.0), dayMix);
        gl_FragColor.a = 1.0; // Ensure fully opaque
      }
    `,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide
  });
  
  const earthGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS, 128, 128);
  
  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  earthMesh.name = "Earth";
  earthMesh.renderOrder = 0; // Lower render order to ensure it's drawn first
  
  // Make Earth opaque and give it proper depth settings
  earthMesh.castShadow = false;
  earthMesh.receiveShadow = true;
  
  earthGroup.add(earthMesh);
  
  return earthMesh;
}

// Create realistic clouds layer with improved separation from Earth
function createClouds() {
  const textureLoader = new THREE.TextureLoader();
  
  const cloudsTexture = textureLoader.load(
    "assets/earth_clouds.jpg", 
    texture => {
      logMessage("Clouds texture loaded successfully");
      texture.anisotropy = 16;
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const img = texture.image;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      context.drawImage(img, 0, 0);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        
        data[i] = Math.min(255, data[i] * 1.05);
        data[i+1] = Math.min(255, data[i+1] * 1.05);
        data[i+2] = Math.min(255, data[i+2] * 1.05);
        
        if (brightness < 200) {
          data[i+3] = Math.max(0, data[i+3] * 0.5);
        } else {
          data[i+3] = Math.max(0, data[i+3] * 0.85);
        }
      }
      
      context.putImageData(imageData, 0, 0);
      
      texture.image = canvas;
      texture.needsUpdate = true;
    },
    undefined,
    error => logMessage(`Error loading clouds texture: ${error.message}`)
  );
  
  // Update cloud material to be properly transparent with correct depth testing
  const cloudsMaterial = new THREE.MeshPhysicalMaterial({
    map: cloudsTexture,
    transparent: true,
    opacity: 0.55,
    depthWrite: false, // Prevent depth-writing to avoid z-fighting
    depthTest: true,   // But still test against depth buffer
    roughness: 1.0, 
    metalness: 0.0,
    side: THREE.FrontSide, // Only render front side for better performance
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor
  });
  
  // Increase separation between Earth and clouds to prevent z-fighting
  const cloudsGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.009, 96, 96);
  
  cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
  cloudsMesh.name = "Clouds";
  cloudsMesh.renderOrder = 1; // Higher render order than Earth
  
  earthGroup.add(cloudsMesh);
  
  return cloudsMesh;
}

// Create improved atmospheric glow effect that looks good at any distance
function createAtmosphere() {
  logMessage("Creating Earth's atmospheric glow effect");
  
  // Make atmosphere size more reasonable - balanced for all zoom levels
  const atmosphereGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.25, 128, 128);
  
  // Enhanced atmospheric shader with more subtle glow
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      // More subtle blue color with less cyan (more natural blue)
      glowColor: { value: new THREE.Color(0x6695dd) },
      // Even more subtle sunset color with reduced intensity
      sunsetColor: { value: new THREE.Color(0xd9987c) }, // Less orange, more muted tone
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      cameraPosition: { value: new THREE.Vector3(0, 0, 1) },
      power: { value: 1.0 }, // Adjusted for better falloff
      intensity: { value: 1.5 }, // Reduced from 2.5
      cameraDistance: { value: 20000.0 },
      closeRangeMultiplier: { value: 1.0 }
    },
    vertexShader: `
      varying vec3 vVertexWorldPosition;
      varying vec3 vVertexNormal;
      varying vec3 vSunDir;
      
      uniform vec3 sunDirection;
      
      void main() {
        // Transform vertex to world space
        vVertexWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        
        // Get normal in world space
        vVertexNormal = normalize(normalMatrix * normal);
        
        // Transform sun direction to view space
        vSunDir = normalize(sunDirection);
        
        // Standard vertex projection
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform vec3 sunsetColor;
      uniform vec3 cameraPosition;
      uniform float power;
      uniform float intensity;
      uniform float cameraDistance;
      uniform float closeRangeMultiplier;
      
      varying vec3 vVertexWorldPosition;
      varying vec3 vVertexNormal;
      varying vec3 vSunDir;
      
      void main() {
        // Calculate view direction
        vec3 viewVector = normalize(cameraPosition - vVertexWorldPosition);
        
        // Enhanced Fresnel effect - less aggressive
        float fresnel = 1.0 - max(0.0, dot(viewVector, vVertexNormal));
        fresnel = pow(fresnel + 0.15, 1.9); // Adjusted parameters
        
        // Subtler atmosphere at the rim/edge
        float atmosphere = pow(fresnel, power) * intensity;
        
        // Calculate sun angle to create sunset/sunrise coloration
        float sunAngle = max(0.0, dot(vVertexNormal, vSunDir));
        float sunsetFactor = pow(1.0 - sunAngle, 6.0) * 0.8;
        
        // Mix colors based on sun angle (sunset effect)
        vec3 finalColor = mix(glowColor, sunsetColor, sunsetFactor);
        
        // Modified distance factor to ensure visibility at all distances
        float distanceFactor = 1.0;
        if (cameraDistance > 8000.0) {
          distanceFactor = smoothstep(8000.0, 25000.0, cameraDistance);
        } else {
          distanceFactor = 0.7 + (cameraDistance / 8000.0) * 0.3;
        }
        
        float adjustedAtmosphere = atmosphere * (0.7 + distanceFactor * 0.3);
        adjustedAtmosphere *= closeRangeMultiplier;
        
        float farDistance = smoothstep(25000.0, 60000.0, cameraDistance);
        adjustedAtmosphere = max(adjustedAtmosphere, 0.1); // Reduced from 0.15
        adjustedAtmosphere = mix(adjustedAtmosphere, adjustedAtmosphere * 2.5, farDistance); // Reduced from 3.0
        
        float alpha = min(adjustedAtmosphere, 0.7); // Reduced from 0.9
        gl_FragColor = vec4(finalColor, alpha);
        
        float darkSide = 0.5 - dot(vVertexNormal, vSunDir) * 0.5;
        darkSide = smoothstep(0.0, 0.4, darkSide);
        gl_FragColor.a *= (1.0 - darkSide * 0.2);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true
  });
  
  atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  atmosphereMesh.name = "Atmosphere";
  atmosphereMesh.renderOrder = 100;
  
  atmosphereMesh.scale.set(1.1, 1.1, 1.1); // Reduced from 1.15
  
  earthGroup.add(atmosphereMesh);
  
  return atmosphereMesh;
}

// Create night lights with improved visibility against darker Earth
function createNightLights() {
  const textureLoader = new THREE.TextureLoader();
  
  const nightLightsTexture = textureLoader.load(
    "assets/earth_night.jpg", 
    texture => {
      logMessage("Night lights texture loaded successfully");
      texture.anisotropy = 16;
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const img = texture.image;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      context.drawImage(img, 0, 0);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        
        if (brightness > 20) {
          const brightnessFactor = 1.1;  // Reduced from 1.4
          data[i] = Math.min(255, data[i] * brightnessFactor);
          data[i+1] = Math.min(255, data[i+1] * brightnessFactor);
          data[i+2] = Math.min(255, data[i+2] * brightnessFactor);
          
          if (data[i] > 0 || data[i+1] > 0) {
            data[i] = Math.min(255, data[i] * 1.1);      // Reduced from 1.2
            data[i+1] = Math.min(255, data[i+1] * 1.05); // Reduced from 1.1
          }
        }
      }
      
      context.putImageData(imageData, 0, 0);
      
      texture.image = canvas;
      texture.needsUpdate = true;
    },
    undefined,
    error => logMessage(`Error loading night lights texture: ${error.message}`)
  );
  
  const nightLightsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      lightSide: { value: new THREE.Vector3(1, 0, 0) },
      nightTexture: { value: nightLightsTexture },
      glowIntensity: { value: 0.75 } // Reduced from 1.0 to make lights less bright
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 lightSide;
      uniform sampler2D nightTexture;
      uniform float glowIntensity;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vec3 normalizedPosition = normalize(vPosition);
        float lightFactor = dot(normalizedPosition, normalize(lightSide));
        float darkFactor = 1.0 - smoothstep(-0.08, 0.08, lightFactor);
        float terminator = smoothstep(-0.15, -0.05, lightFactor);
        float enhancedGlow = glowIntensity * (1.0 + terminator * 0.2); // Reduced from 0.3
        vec4 nightColor = texture2D(nightTexture, vUv);
        float threshold = 0.15; // Increased from 0.12 to filter out dimmer lights
        float brightness = max(max(nightColor.r, nightColor.g), nightColor.b);
        float visibility = smoothstep(threshold, threshold + 0.1, brightness);
        
        // Make lights less intense
        nightColor.rgb = pow(nightColor.rgb, vec3(0.7)); // Increased gamma to reduce brightness
        
        // Cooler light color (less orange/yellow)
        vec3 tintedLights = mix(nightColor.rgb, vec3(0.85, 0.75, 0.5), 0.15); // Reduced warmth
        
        // Overall dimmer lights
        gl_FragColor = vec4(tintedLights, nightColor.a * visibility) * darkFactor * enhancedGlow * 0.7; // Reduced from 0.9
        
        if (gl_FragColor.a < 0.01) discard;
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });
  
  const nightLightsGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.003, 96, 96);
  
  nightLightsMesh = new THREE.Mesh(nightLightsGeometry, nightLightsMaterial);
  nightLightsMesh.name = "NightLights";
  nightLightsMesh.renderOrder = 2;
  
  earthGroup.add(nightLightsMesh);
  
  return nightLightsMesh;
}

// Create and position the Moon
export function createMoon(moonCamera) {
  logMessage("Creating Moon object");
  
  const moonGroup = new THREE.Group();
  moonGroup.name = "MoonGroup";
  
  const scene = getScene();
  scene.add(moonGroup);
  
  const textureLoader = new THREE.TextureLoader();
  
  const moonTexture = textureLoader.load(
    "assets/moon_texture.jpg", 
    texture => {
      logMessage("Moon texture loaded successfully");
      texture.anisotropy = 16;
    },
    undefined,
    error => logMessage(`Error loading moon texture: ${error.message}`)
  );
  
  const moonMaterial = new THREE.MeshStandardMaterial({
    map: moonTexture,
    roughness: 0.9,
    metalness: 0.0,
    color: 0xffffff,
    transparent: false,
    depthTest: true,
    depthWrite: true
  });
  
  const moonGeometry = new THREE.SphereGeometry(MOON_RADIUS, 96, 96);
  
  moonObject = new THREE.Mesh(moonGeometry, moonMaterial);
  moonObject.name = "Moon";
  moonObject.renderOrder = 10; // Higher than Earth but still respects depth test
  
  moonObject.position.set(MOON_DISTANCE, 0, 0);
  
  moonGroup.add(moonObject);
  
  if (moonCamera) {
    const moonPos = moonObject.position.clone();
    moonCamera.position.set(
      moonPos.x + MOON_RADIUS * 10,
      moonPos.y + MOON_RADIUS * 5,
      moonPos.z + MOON_RADIUS * 10
    );
    moonCamera.lookAt(moonPos);
  }
  
  return moonObject;
}

// Update Earth rotation and features with enhanced atmosphere
export function updateEarth(time) {
  if (!earthGroup) return;
  
  const earthRotation = EARTH_ROTATION_SPEED * time;
  
  if (earthMesh) {
    earthMesh.rotation.y = earthRotation;
    
    const sunDirection = new THREE.Vector3(1, 0, 0);
    sunDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -earthRotation);
    
    if (earthMesh.material && earthMesh.material.uniforms) {
      earthMesh.material.uniforms.sunDirection.value = sunDirection;
    }
    
    if (atmosphereMesh && atmosphereMesh.material && atmosphereMesh.material.uniforms) {
      atmosphereMesh.material.uniforms.sunDirection.value = sunDirection;
    }
  }
  
  if (cloudsMesh) {
    cloudsMesh.rotation.y = earthRotation * 1.4;
  }
  
  if (nightLightsMesh) {
    nightLightsMesh.rotation.y = earthRotation;
    
    if (nightLightsMesh.material && nightLightsMesh.material.uniforms) {
      const lightDirection = new THREE.Vector3(1, 0, 0);
      lightDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -earthRotation);
      nightLightsMesh.material.uniforms.lightSide.value = lightDirection;
    }
  }
  
  if (atmosphereMesh && atmosphereMesh.material && atmosphereMesh.material.uniforms) {
    const camera = THREE.Cache.get('mainCamera') || getCamera();
    if (camera) {
      atmosphereMesh.visible = true;
      atmosphereMesh.material.uniforms.cameraPosition.value = camera.position;
      const distance = camera.position.length();
      atmosphereMesh.material.uniforms.cameraDistance.value = distance;
      
      if (distance < 12000) {
        atmosphereMesh.material.uniforms.intensity.value = 0.8; // Reduced from 1.2
        atmosphereMesh.material.uniforms.power.value = 1.1;
        atmosphereMesh.material.uniforms.closeRangeMultiplier.value = 
          1.5 - (distance / 12000.0); // Reduced from 2.0
      } else if (distance < 30000) {
        atmosphereMesh.material.uniforms.intensity.value = 1.3; // Reduced from 2.0
        atmosphereMesh.material.uniforms.power.value = 1.0;
        atmosphereMesh.material.uniforms.closeRangeMultiplier.value = 1.0;
      } else {
        atmosphereMesh.material.uniforms.intensity.value = 1.8; // Reduced from 3.0
        atmosphereMesh.material.uniforms.power.value = 0.8;
        atmosphereMesh.material.uniforms.closeRangeMultiplier.value = 1.0;
      }
      
      const minIntensity = 0.7; // Reduced from 1.0
      if (atmosphereMesh.material.uniforms.intensity.value < minIntensity) {
        atmosphereMesh.material.uniforms.intensity.value = minIntensity;
      }
    }
  }
}

// Update Moon position
export function updateMoon(time) {
  if (!moonObject) return;
  
  const angle = time * MOON_ROTATION_SPEED;
  moonObject.position.x = Math.cos(angle) * MOON_DISTANCE;
  moonObject.position.z = Math.sin(angle) * MOON_DISTANCE;
  
  moonObject.rotation.y += MOON_ROTATION_SPEED * 0.01;
}
