import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';

// Import UI components and manager
import './components/telemetry-card.js';
import './components/telemetry-item.js';
import { uiManager } from './ui/manager.js';
import { initBrandUI, hideLoadingScreen, showHelpButton } from './ui/brand-ui.js';
import { createTelemetryItem } from './ui/template-manager.js';

// Import frontend-only data loader
import { dataLoader } from './data-loader.js';

// Import navigation controller
import { initNavigationController } from './navigation-controller.js';

// Import our modular components
import { EARTH_RADIUS_KM, EARTH_SCALE, MIN_LEO_ALTITUDE_KM, MOON_DISTANCE, MOON_SCALE, LOS_DEFAULT_KM, LOS_DEFAULT_BABYLON, calculateHorizonDistance } from './constants.js';
import { createSkybox } from './skybox.js';
import { createEarth } from './earth.js';
import { createMoon } from './moon.js';
import { Sun } from './sun.js';
import { createSatellites, getSatelliteMeshes, getTelemetryData, getDetailedTelemetryForSatellite, createManualSolarPanelAnimation } from './satellites.js';
import { updateTelemetryUI } from './telemetry.js';
import { startSimulationLoop, updateTimeDisplay, getCurrentSimTime } from './simulation.js';
import { setupKeyboardControls } from './controls.js';
// Ground stations removed for Red Orbit
// import { createGroundStations, updateGroundStationsLOS, createCoverageCircles, getGroundStationMeshes, clearAutoLOSBeams, getGroundStationDefinitions } from './groundStations.js';
import { initAuroraBackground, cleanupAuroraBackground } from './aurora-background.js';

// Import orbital mechanics functions
import { calculateSatellitePosition, toBabylonPosition, generateRealTimeTelemetry } from './orbital-mechanics.js';

// Import Red Orbit physics - PURE PHYSICS ENGINE
import { createPhysicsEngine, PHYSICS_CONFIG } from './red-orbit/physics/physics-launcher.js';
import { AdvancedKesslerSystem } from './red-orbit/kessler-advanced.js';
import { KesslerUI } from './red-orbit/kessler-ui.js';

// Globals
let engine;
let scene;
let camera;
let earthMesh;
let moonMesh;
let sun; // Sun instance
let satelliteData = {};
let activeSatellite = null;
let isInitialized = false;
let sceneLoaded = false;
let advancedTexture; 
let sdaController; // SDA visualization controller
let redOrbitPhysics = null; // Red Orbit PURE physics system

// Use a shared state object for timeMultiplier
const simState = {
    timeMultiplier: 1.0, // Start at 1x real-time (NO CHEATING!)
    lastTimeMultiplier: 1.0
};

// Expose globally for UI controls
window.simState = simState;

// Expose time multiplier globally for physics engine
window.getTimeMultiplier = () => simState.timeMultiplier;

// Orbital elements and real-time calculation data
let orbitalElements = {};
let simulationStartTime = new Date();
let simulationTime = new Date();
let sunDirection = new BABYLON.Vector3(1, 0, 0);

// Ground station dashboard state
let groundStationDashboardOpen = false;

// Export sun instance for other modules
export function getSun() {
    return sun;
}

export async function initApp() {
    // Delay UI initialization until after scene is created for better startup performance
    setTimeout(() => {
        initBrandUI();
    }, 100);
    
    // Delay aurora background further to not compete with critical loading
    setTimeout(() => {
        initAuroraBackground();
    }, 300);
    
    // Initialize 3D model viewer panel
    initModelViewer();
    
    // Dashboard is initialized after scene loads
    
    // Set up listener for LEOS dial buttons
    window.addEventListener('leos-dial-action', (event) => {
        const action = event.detail.action;
        handleDialAction(action);
    });
    
    // Create scene with performance optimizations and wait until ready
    await createScene();
    // Note: Ground stations and coverage circles are already created in createScene()
    
    // HTML telemetry panel for ground stations
    let groundDash = document.getElementById('ground-dashboard');
    // Store LOS lines to clear and animate
    let currentLOS = [];
    if (!groundDash) {
      groundDash = document.createElement('div');
      groundDash.id = 'ground-dashboard';
      // Use telemetry-dashboard style for a compact tile
      groundDash.className = 'telemetry-dashboard hidden';
      document.body.appendChild(groundDash);
    }
    window.addEventListener('groundStationSelected', (event) => {
     // Set flag to disable automatic LOS beams
     groundStationDashboardOpen = true;
     
     // Ground stations removed for Red Orbit
     // clearAutoLOSBeams();
     
     // clear previous LOS lines
     currentLOS.forEach(line => {
       scene.onBeforeRenderObservable.remove(line.pulseObserver);
       line.dispose();
     });
     currentLOS = [];
      const station = event.detail;
      
      // Get station info including pre-calculated horizon distance
      const stationKey = station.name.replace(/\s+/g, '_');
      // Ground stations removed for Red Orbit
      const groundStationMeshes = {}; // getGroundStationMeshes();
      const stationEntry = groundStationMeshes[stationKey];
      if (!stationEntry) {
        console.warn('Ground station mesh not found for key:', stationKey, 'Available keys:', Object.keys(groundStationMeshes));
      }
      const stationInfo = stationEntry?.info || station;
      
      // Use pre-calculated horizon distance or calculate if not available
      // Patch: If alt is 0 or missing, use a minimum elevation of 0.1 km (100 meters, like Vandenberg)
      const minElevationKm = 0.1;
      const stationAlt = (typeof station.alt === 'number' && station.alt > 0) ? station.alt : minElevationKm;
      const horizonKm = stationInfo.horizonDistanceKm || 
        Math.sqrt((EARTH_RADIUS_KM + stationAlt) * (EARTH_RADIUS_KM + stationAlt) - EARTH_RADIUS_KM * EARTH_RADIUS_KM);
      
      // Get current simulation time for calculations
      const currentTime = getCurrentSimTime();
      
      // Get station position for calculations
      const stationPos = stationEntry?.mesh.absolutePosition;
      
      // Calculate distances to satellites and collect detailed info
      const satelliteDetails = [];
      let totalSatsInRange = 0;
      let totalSatsVisible = 0;
      
      const satelliteMeshes = getSatelliteMeshes();
      const inView = Object.entries(satelliteMeshes)
         .filter(([satName, mesh]) => {
           // Determine satellite absolute position
           const satPos = mesh.absolutePosition || mesh.position;
           const dirVec = satPos.subtract(stationPos);
           const distanceBabylon = dirVec.length();
           const distanceKm = distanceBabylon / EARTH_SCALE;
           
           // Debug: Log LOS calculation for Wallops and Diego Garcia
           if (station.name.includes('Wallops') || station.name.includes('Diego Garcia')) {
             console.log('[LOS DEBUG]', station.name, 'StationPos:', stationPos?.toString(), 'Sat:', satName, 'SatPos:', satPos?.toString(), 'DirVec:', dirVec?.toString(), 'DistKm:', distanceKm);
           }
           totalSatsInRange++;
           // Use station-specific horizon distance instead of global constant
           // const stationLosMaxBabylon = stationInfo.horizonDistanceBabylon || (horizonKm * EARTH_SCALE);
           // if (distanceBabylon > stationLosMaxBabylon) {
           //   if (station.name.includes('Wallops') || station.name.includes('Diego Garcia')) {
           //     console.log('[LOS DEBUG]', station.name, satName, 'filtered out: beyond horizon', distanceBabylon, '>', stationLosMaxBabylon);
           //   }
           //   return false; // Only allow LOS within station's horizon (disabled for satellites)
           // }
           const dirNorm = dirVec.normalize();
            // Quick horizon check
            const elevation = BABYLON.Vector3.Dot(dirNorm, stationPos.normalize());
            if (station.name.includes('Wallops') || station.name.includes('Diego Garcia')) {
              console.log('[LOS DEBUG]', station.name, satName, 'elevation:', elevation);
            }
            if (elevation <= 0) {
              if (station.name.includes('Wallops') || station.name.includes('Diego Garcia')) {
                console.log('[LOS DEBUG]', station.name, satName, 'filtered out: elevation <= 0');
              }
              return false;
            }
            // Convert elevation to degrees
            const elevationDeg = Math.asin(elevation) * 180 / Math.PI;
            // Calculate azimuth
            const stationUp = stationPos.normalize();
            const east = new BABYLON.Vector3(-stationPos.z, 0, stationPos.x).normalize();
            const north = BABYLON.Vector3.Cross(stationUp, east);
            const azimuthRad = Math.atan2(BABYLON.Vector3.Dot(dirNorm, east), BABYLON.Vector3.Dot(dirNorm, north));
            let azimuthDeg = azimuthRad * 180 / Math.PI;
            if (azimuthDeg < 0) azimuthDeg += 360;
            // Raycast and detect any mesh hit before satellite
            const ray = new BABYLON.Ray(stationPos, dirNorm, distanceBabylon);
            const pickInfo = scene.pickWithRay(ray);
            const isVisible = !(pickInfo.hit && pickInfo.distance < distanceBabylon - 1e-3);
            if (station.name.includes('Wallops') || station.name.includes('Diego Garcia')) {
              console.log('[LOS DEBUG]', station.name, satName, 'raycast hit:', pickInfo.hit, 'pickDist:', pickInfo.distance, 'satDist:', distanceBabylon, 'isVisible:', isVisible);
            }
            if (isVisible) {
              totalSatsVisible++;
              satelliteDetails.push({
                name: satName,
                distance: distanceKm,
                elevation: elevationDeg,
                azimuth: azimuthDeg
              });
            }
            return isVisible;
         })
         .map(([name]) => name);
         
      // Sort satellite details by elevation (highest first)
      satelliteDetails.sort((a, b) => b.elevation - a.elevation);
      // build enhanced telemetry-card HTML with comprehensive ground station data
      const card = document.createElement('telemetry-card');
      card.setAttribute('title', station.name);
      card.setAttribute('classification', 'GROUND STATION');
      
      // Format coordinates with cardinal directions
      const latDir = station.lat >= 0 ? 'N' : 'S';
      const lonDir = station.lon >= 0 ? 'E' : 'W';
      const formattedLat = `${Math.abs(station.lat).toFixed(4)}° ${latDir}`;
      const formattedLon = `${Math.abs(station.lon).toFixed(4)}° ${lonDir}`;
      
      // Calculate coverage area
      const coverageAreaKm2 = Math.PI * horizonKm * horizonKm;
      
      // Determine station type/purpose based on name
      let stationType = 'Deep Space Network';
      if (station.name.includes('Vandenberg') || station.name.includes('Wallops')) {
        stationType = 'Launch Range';
      } else if (station.name.includes('Mauna Kea')) {
        stationType = 'Observatory/Tracking';
      } else if (station.name.includes('Diego Garcia')) {
        stationType = 'Military/Strategic';
      }
      
      let content = `
        <div class="station-header">
          <div><strong>Location:</strong> ${formattedLat}, ${formattedLon}</div>
          <div><strong>Elevation:</strong> ${stationAlt.toFixed(1)} km AMSL</div>
          <div><strong>Type:</strong> ${stationType}</div>
        </div>
        <hr>
        <div class="station-coverage">
          <div><strong>Horizon Range:</strong> ${horizonKm.toFixed(1)} km</div>
          <div><strong>Coverage Area:</strong> ${(coverageAreaKm2/1000).toFixed(0)}k km²</div>
          <div><strong>Max LOS Distance:</strong> ${horizonKm.toFixed(1)} km</div>
        </div>
        <hr>
        <div class="station-status">
          <div><strong>Satellites Tracked:</strong> ${totalSatsVisible}/${totalSatsInRange}</div>
          <div><strong>Status:</strong> <span style="color: #00ff00;">OPERATIONAL</span></div>
          <div><strong>Last Update:</strong> ${currentTime.toLocaleTimeString()}</div>
        </div>
      `;
      
      if (satelliteDetails.length > 0) {
        content += `
          <hr>
          <div><strong>Active Satellite Communications:</strong></div>
          <div class="satellite-list">
        `;
        satelliteDetails.forEach(sat => {
          const signalStrength = Math.max(0, Math.min(100, 100 - (sat.distance / horizonKm) * 50 + sat.elevation));
          const telemetry = getTelemetryData()[sat.name];
          
          // Calculate data rate based on signal strength and elevation
          const baseDataRate = 2.048; // Mbps base rate
          const dataRate = (baseDataRate * (signalStrength / 100) * (1 + sat.elevation / 90)).toFixed(2);
          
          // Calculate contact time (simplified estimation)
          const contactDuration = Math.floor(Math.random() * 8) + 2; // 2-10 minutes typical pass
          const contactRemaining = Math.floor(Math.random() * contactDuration);
          
          // Get satellite type for specialized info
          let satType = 'Unknown';
          let specialData = '';
          if (sat.name.includes('CRTS')) {
            satType = 'Science/Research';
            specialData = `<div class="sat-mission">Mission: Space Weather Monitoring</div>`;
          } else if (sat.name.includes('BULLDOG')) {
            satType = 'Earth Observation';
            specialData = `<div class="sat-mission">Mission: Earth Imaging</div>`;
          }
          
          content += `
            <div class="satellite-item">
              <div class="sat-header">
                <div><strong>${sat.name}</strong> <span class="sat-type">[${satType}]</span></div>
                <div class="contact-status">
                  <span class="status-dot" style="background: ${signalStrength > 70 ? '#00ff00' : signalStrength > 40 ? '#ffff00' : '#ff8800'}"></span>
                  Contact: ${contactRemaining}m of ${contactDuration}m
                </div>
              </div>
              ${specialData}
              <div class="sat-tracking">
                <div class="tracking-row">
                  <span>Range: ${sat.distance.toFixed(0)} km</span>
                  <span>Elevation: ${sat.elevation.toFixed(1)}°</span>
                  <span>Azimuth: ${sat.azimuth.toFixed(0)}°</span>
                </div>
                <div class="tracking-row">
                  <span>Data Rate: ${dataRate} Mbps</span>
                  <span>Signal: ${signalStrength.toFixed(0)}%</span>
                  ${telemetry ? `<span>Alt: ${telemetry.altitude?.toFixed(0) || 'N/A'} km</span>` : '<span>No TLM</span>'}
                </div>
              </div>
              <div class="signal-strength">
                <div class="signal-bar">
                  <div class="signal-fill" style="width: ${signalStrength}%; background: ${signalStrength > 70 ? '#00ff00' : signalStrength > 40 ? '#ffff00' : '#ff8800'}"></div>
                </div>
                <div class="link-quality">Link Quality: ${signalStrength > 80 ? 'EXCELLENT' : signalStrength > 60 ? 'GOOD' : signalStrength > 40 ? 'FAIR' : 'POOR'}</div>
              </div>
            </div>
          `;
        });
        content += `</div>`;
      } else {
        content += `
          <hr>
          <div><strong>No satellites currently in view</strong></div>
          <div style="color: #888; font-size: 0.9em;">Check back as satellites orbit overhead</div>
        `;
      }
      const slot = document.createElement('div');
      slot.innerHTML = content;
      card.appendChild(slot);
      groundDash.innerHTML = '';
      groundDash.appendChild(card);
      
      // Store current station for real-time updates
      groundDash.dataset.currentStation = station.name;
      
      // Show panel
      groundDash.classList.remove('hidden');
      groundDash.classList.add('visible');
      
      // Start auto-refresh for real-time updates (unless this is a silent refresh)
      if (!station.silentRefresh) {
        startDashboardAutoRefresh();
      }
      
      // disable satellite picking to prevent conflicts when ground-station UI is open
      const satMeshes = getSatelliteMeshes();
      Object.values(satMeshes).forEach(mesh => mesh.isPickable = false);
      // add close button to panel
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-dashboard';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => {
        groundStationDashboardOpen = false; // Re-enable automatic LOS beams
        stopDashboardAutoRefresh(); // Stop auto-refresh
        groundDash.classList.remove('visible');
        groundDash.classList.add('hidden');
        Object.values(getSatelliteMeshes()).forEach(mesh => mesh.isPickable = true);
        // Clear dashboard LOS lines
        currentLOS.forEach(line => {
          scene.onBeforeRenderObservable.remove(line.pulseObserver);
          line.dispose();
        });
        currentLOS = [];
      });
      groundDash.appendChild(closeBtn);
    });
    // close ground dashboard on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && groundDash.classList.contains('visible')) {
        groundStationDashboardOpen = false; // Re-enable automatic LOS beams
        stopDashboardAutoRefresh(); // Stop auto-refresh
        Object.values(getSatelliteMeshes()).forEach(mesh => mesh.isPickable = true);
        groundDash.classList.remove('visible');
        groundDash.classList.add('hidden');
        // Clear dashboard LOS lines
        currentLOS.forEach(line => {
          scene.onBeforeRenderObservable.remove(line.pulseObserver);
          line.dispose();
        });
        currentLOS = [];
      }
    });

    // Listen for ground station connection changes for real-time dashboard updates
    window.addEventListener('groundStationConnectionsChanged', (event) => {
        // Only update if ground station dashboard is currently open
        if (groundStationDashboardOpen && groundDash.classList.contains('visible')) {
            // Get the currently selected station from the dashboard
            const currentStationName = groundDash.dataset.currentStation;
            if (currentStationName) {
                // Find the station info and refresh the dashboard
                const station = getGroundStationDefinitions().find(s => s.name === currentStationName);
                if (station) {
                    // Trigger a refresh by dispatching the selection event again
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('groundStationSelected', { detail: station }));
                    }, 100);
                }
            }
        }
    });

    // Auto-refresh dashboard every 5 seconds when open
    let dashboardRefreshInterval = null;
    
    function startDashboardAutoRefresh() {
        if (dashboardRefreshInterval) {
            clearInterval(dashboardRefreshInterval);
        }
        
        dashboardRefreshInterval = setInterval(() => {
            if (groundStationDashboardOpen && groundDash.classList.contains('visible')) {
                const currentStationName = groundDash.dataset.currentStation;
                if (currentStationName) {
                    const station = getGroundStationDefinitions().find(s => s.name === currentStationName);
                    if (station) {
                        // Silently refresh the dashboard
                        window.dispatchEvent(new CustomEvent('groundStationSelected', { 
                            detail: { ...station, silentRefresh: true } 
                        }));
                    }
                }
            }
        }, 5000); // Refresh every 5 seconds
    }
    
    function stopDashboardAutoRefresh() {
        if (dashboardRefreshInterval) {
            clearInterval(dashboardRefreshInterval);
            dashboardRefreshInterval = null;
        }
    }

    // Use unlimited render loop for smooth LOS visualization
    let lastFrameTime = 0;
    const maxFPS = 45; // Reduced FPS during loading for better overall performance
    engine.runRenderLoop(() => {
        const now = performance.now();
        if (now - lastFrameTime < 1000 / maxFPS) return;
        const deltaTime = (now - lastFrameTime) / 1000; // Convert to seconds
        lastFrameTime = now;
        
        // Update Red Orbit physics if running
        if (redOrbitPhysics && redOrbitPhysics.initialized) {
            redOrbitPhysics.step(deltaTime);
        }
        
        scene.render();
        
        if (scene.isReady() && !sceneLoaded) {
            // Hide loading screen IMMEDIATELY when scene is ready
            hideLoadingScreen();
            
            sceneLoaded = true;
            // Show help button now that simulation is loaded
            showHelpButton();
            // Initialize keyboard controls once the scene is loaded
            setupKeyboardControls(
                camera,
                (v) => { simState.lastTimeMultiplier = simState.timeMultiplier; simState.timeMultiplier = v; },
                () => simState.timeMultiplier
            );
            
            
            // Red Orbit UI removed - using collision controls instead
            
            // Red Orbit keyboard shortcuts and UI updates removed
            // Physics is always active, controlled via Red Orbit modal
            
            // Red Orbit physics initialized after satellites are loaded
            
            
            // Initialize Navigation Controller
            initNavigationController();
            
            // Add event listener for the Add TLE button
            const addTleBtn = document.getElementById('add-tle-button');
            if (addTleBtn) {
                addTleBtn.addEventListener('click', () => {
                    showNotification('Coming Soon! TLE import functionality will be available in a future update.');
                });
            }
            
            // Add event listener for the Simulation Settings button
            const simulationSettingsBtn = document.getElementById('simulation-settings-btn');
            if (simulationSettingsBtn) {
                simulationSettingsBtn.addEventListener('click', () => {
                    showSimulationSettingsModal();
                });
            }
        }
        // Ground stations removed for Red Orbit
        // if (!groundStationDashboardOpen) {
        //     updateGroundStationsLOS(scene);
        // }
    });
    
    // Throttle resize events for better performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            engine.resize();
        }, 100);
    });
    
    // Listen for satellite selection events
    window.addEventListener('satelliteSelected', (event) => {
        // Show mission dashboard overlay with a smooth fade-in effect
        const dash = document.getElementById('mission-dashboard');
        if (dash) {
            // First make it visible but with opacity 0
            dash.style.opacity = '0';
            dash.classList.remove('hidden');
            dash.classList.add('visible');
            
            // Then animate the fade-in
            setTimeout(() => {
                dash.style.transition = 'opacity 0.4s ease-in-out';
                dash.style.opacity = '1';
            }, 10);
        }
        
        // Resize model viewer now that panel is visible
        if (previewEngine) {
            previewEngine.resize();
        }

        activeSatellite = event.detail.name;
        updateTelemetryUI(activeSatellite, getTelemetryData());
        
        // Restore any previously minimized panels when reopening satellite viewer
        restoreAllMinimizedPanels();
        
        // Setup panel minimize functionality
        setupPanelMinimizeControls();
        // Focus camera on selected satellite
        const satMesh = getSatelliteMeshes()[activeSatellite];
        if (camera && satMesh) {
            // Allow very close zoom to satellite
            camera.lowerRadiusLimit = 0.0001; // Very close zoom
            camera.setTarget(satMesh.position);
            // compute azimuth so camera looks straight down on satellite
            const pos = satMesh.position;
            const azimuth = Math.atan2(pos.z, pos.x) + Math.PI/2;
            camera.alpha = azimuth;
            
            // Adjust camera position based on whether this is a label click
            const isLabelClick = event.detail.source === 'label';
            const currentR = camera.radius;
            let targetR;
            
            if (isLabelClick) {
                // For label clicks, use a safer distance to prevent going inside Earth
                const safeDistance = EARTH_RADIUS_KM * EARTH_SCALE * 2.5;
                const distanceToSat = BABYLON.Vector3.Distance(BABYLON.Vector3.Zero(), satMesh.position);
                targetR = Math.max(safeDistance, distanceToSat * 1.1); // 10% farther than the satellite
                camera.beta = 0.4; // Less steep angle to see more context around the satellite
            } else {
                // For satellite mesh clicks, allow extremely close view
                camera.beta = 0.2;  // near-top-down angle
                // Get extremely close to the satellite
                const distanceToSat = BABYLON.Vector3.Distance(BABYLON.Vector3.Zero(), satMesh.position);
                // Zoom in extremely close - right up to the satellite
                const isBulldog = activeSatellite.toUpperCase().includes('BULLDOG');
                const satelliteSize = isBulldog ? 0.0004 : 0.0015;
                targetR = distanceToSat - satelliteSize * 2; // Get within 2x the satellite size
            }
            
            // Animate camera movement smoothly
            try {
                const zoomAnim = BABYLON.Animation.CreateAndStartAnimation(
                    'zoomIn', camera, 'radius', 60, 30,
                    currentR, targetR,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                // Apply easing if animation was created successfully
                if (zoomAnim && typeof zoomAnim.setEasingFunction === 'function') {
                    const easingFunction = new BABYLON.CircleEase();
                    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
                    zoomAnim.setEasingFunction(easingFunction);
                }
            } catch (err) {
                console.warn("Error creating zoom animation:", err);
                // Fall back to direct property setting if animation fails
                camera.radius = targetR;
            }
        }
    });
    // Restore free view when dashboard closes - with enhanced smooth transition
    window.addEventListener('missionDashboardClosed', () => {
        // Clear model viewer when dashboard is closed
        if (previewScene && previewMesh) {
            previewScene.meshes.slice().forEach(mesh => {
                if (mesh !== previewCamera && !(mesh instanceof BABYLON.Light)) {
                    mesh.dispose();
                }
            });
            previewMesh = null;
        }
        
        // Clean up minimized tabs when dashboard closes
        cleanupMinimizedTabs();
        
        if (camera) {
            // Store current position and target
            const currentPos = camera.position.clone();
            const currentTarget = camera.target.clone();
            
            // Reset activeSatellite when dashboard closes
            activeSatellite = null;
            
            // Define a more sophisticated easing function for smoother transitions
            const easingFunction = new BABYLON.CircleEase();
            easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
            
            try {
                // Smoothly move camera target to Earth center with nicer animation timing (45 frames)
                const targetAnim = BABYLON.Animation.CreateAndStartAnimation(
                    'targetToEarth', camera, 'target', 60, 45,
                    currentTarget, BABYLON.Vector3.Zero(),
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                
                // Sometimes animations may not be created successfully
                if (targetAnim) {
                    targetAnim.disposeOnEnd = true;
                    // Only set easing function if animation was created and has this method
                    if (typeof targetAnim.setEasingFunction === 'function') {
                        targetAnim.setEasingFunction(easingFunction);
                    }
                }
            } catch (err) {
                console.warn("Error creating target animation:", err);
            }
            
            // Reset alpha and beta for a nicer view of Earth
            const targetAlpha = -Math.PI/2; // Nice side view
            const targetBeta = Math.PI/3;   // Slightly elevated
            
            // Stagger animation timings for a more natural feel
            setTimeout(() => {
                try {
                    // Animate rotation parameters smoothly
                    const alphaAnim = BABYLON.Animation.CreateAndStartAnimation(
                        'alphaReset', camera, 'alpha', 60, 40,
                        camera.alpha, targetAlpha,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    if (alphaAnim) {
                        alphaAnim.disposeOnEnd = true;
                        if (typeof alphaAnim.setEasingFunction === 'function') {
                            alphaAnim.setEasingFunction(easingFunction);
                        }
                    }
                } catch (err) {
                    console.warn("Error creating alpha animation:", err);
                }
            }, 100);
            
            setTimeout(() => {
                try {
                    const betaAnim = BABYLON.Animation.CreateAndStartAnimation(
                        'betaReset', camera, 'beta', 60, 35,
                        camera.beta, targetBeta,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    if (betaAnim) {
                        betaAnim.disposeOnEnd = true;
                        if (typeof betaAnim.setEasingFunction === 'function') {
                            betaAnim.setEasingFunction(easingFunction);
                        }
                    }
                } catch (err) {
                    console.warn("Error creating beta animation:", err);
                }
            }, 150);
            
            // Ensure we're at a safe distance with a slight delay
            setTimeout(() => {
                try {
                    const safeRadius = EARTH_RADIUS_KM * EARTH_SCALE * 3.5; // A comfortable viewing distance, slightly farther back
                    const radiusAnim = BABYLON.Animation.CreateAndStartAnimation(
                        'radiusReset', camera, 'radius', 60, 50, // Longer animation (50 frames)
                        camera.radius, safeRadius,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                    if (radiusAnim) {
                        radiusAnim.disposeOnEnd = true;
                        if (typeof radiusAnim.setEasingFunction === 'function') {
                            radiusAnim.setEasingFunction(easingFunction);
                        }
                    }
                } catch (err) {
                    console.warn("Error creating radius animation:", err);
                }
            }, 50);
        }
    });
    
    // Wire up click on time display to toggle UTC/local
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.addEventListener('click', () => {
            updateTimeDisplay(getCurrentSimTime());
        });
    }
}

// --- Time Controls UI ---
function setupTimeControls() {
    const timeDisplay = document.getElementById('time-display');
    const controlsPanel = document.getElementById('time-controls');
    const speedBtns = Array.from(document.querySelectorAll('.time-btn.speed-btn'));

    let controlsVisible = false;
    function updateSpeedBtns() {
        speedBtns.forEach(btn => {
            const mult = parseFloat(btn.getAttribute('data-mult'));
            if (Math.abs(simState.timeMultiplier - mult) < 0.001) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    function updatePanelPosition() {
        // Center the controls panel below the time display
        controlsPanel.style.left = '50%';
        controlsPanel.style.transform = 'translateX(-50%)';
    }
    // Show/hide controls panel on time display click
    timeDisplay.addEventListener('click', (e) => {
        if (e.target.classList.contains('time-btn')) return;
        controlsVisible = !controlsVisible;
        controlsPanel.classList.toggle('hidden', !controlsVisible);
        updateSpeedBtns();
        updatePanelPosition();
    });
    // Speed button clicks
    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mult = parseFloat(btn.getAttribute('data-mult'));
            if (simState.timeMultiplier !== mult) {
                simState.timeMultiplier = mult;
                simState.lastTimeMultiplier = mult;
            }
            updateSpeedBtns();
        });
    });
    // Hide controls if clicking outside
    document.addEventListener('mousedown', (e) => {
        if (controlsVisible && !timeDisplay.contains(e.target) && !controlsPanel.contains(e.target)) {
            controlsPanel.classList.add('hidden');
            controlsVisible = false;
        }
    });
    
    // Speed mode toggle buttons (1x vs 60x)
    const realtimeBtn = document.getElementById('realtime-mode');
    const fastBtn = document.getElementById('fast-mode');
    
    if (realtimeBtn && fastBtn) {
        realtimeBtn.addEventListener('click', () => {
            simState.timeMultiplier = 1;
            simState.lastTimeMultiplier = 1;
            
            // Update physics if it exists
            if (window.redOrbitPhysics) {
                window.redOrbitPhysics.physicsTimeMultiplier = 1;
            }
            
            // Update button styles
            realtimeBtn.style.background = 'rgba(255,0,0,0.8)';
            realtimeBtn.style.color = '#ffffff';
            fastBtn.style.background = 'rgba(255,0,0,0.2)';
            fastBtn.style.color = '#ff0000';
            
            console.log('Switched to REAL-TIME mode (1x)');
        });
        
        fastBtn.addEventListener('click', () => {
            simState.timeMultiplier = 60;
            simState.lastTimeMultiplier = 60;
            
            // Update physics if it exists
            if (window.redOrbitPhysics) {
                window.redOrbitPhysics.physicsTimeMultiplier = 60;
            }
            
            // Update button styles
            fastBtn.style.background = 'rgba(255,0,0,0.8)';
            fastBtn.style.color = '#ffffff';
            realtimeBtn.style.background = 'rgba(255,0,0,0.2)';
            realtimeBtn.style.color = '#ff0000';
            
            console.log('Switched to FAST mode (60x)');
        });
        
        // Keyboard shortcuts for speed modes
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                realtimeBtn.click();
            } else if (e.key === 'f' || e.key === 'F') {
                fastBtn.click();
            }
        });
    }
    
    // Initial highlight
    updateSpeedBtns();
}

async function createScene() {
    const canvas = document.getElementById('renderCanvas');
    
    // Configure engine for better performance and visual quality
    engine = new BABYLON.Engine(canvas, true, { 
        stencil: true,
        deterministicLockstep: false,
        lockstepMaxSteps: 4,
        useHighPrecisionFloats: true, // Better precision for large scenes
        adaptToDeviceRatio: true, // Enable for proper scaling with device DPI
        antialias: true // Enable antialiasing for better visual quality
    });
    
    // Keep canvas at native resolution for proper texture rendering
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Create scene with optimized parameters
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1); // Cinematic deep blue background
    scene.skipPointerMovePicking = true; // Skip pointer move picking for better performance
    scene.autoClear = true; // Enable auto clear to prevent dark artifacts
    scene.autoClearDepthAndStencil = true;
    
    // Make scene and engine globally accessible for FPS counter and settings
    window.scene = scene;
    window.engine = engine;
    
    // Create orbital zones visualization (Van Allen belts, orbital regions)
    createOrbitalZones(scene);
    
    // Create camera with optimized settings first (before any rendering pipelines)
    camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 20, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.001; // Slightly larger to improve precision
    camera.maxZ = 100000; // Much larger far plane for distant viewing
    camera.useLogarithmicDepth = true; // Better depth precision for large scale differences
    // Set lower radius limit to allow VERY close zoom to satellites
    // CRTS1 and Bulldog are at ~800km altitude (1.125 Babylon units from center)
    // Allow camera to get extremely close to satellites for detailed view
    camera.lowerRadiusLimit = 0.00001; // Allow extremely close zoom
    camera.upperRadiusLimit = EARTH_RADIUS_KM * EARTH_SCALE * 100; // Allow zoom far out
    camera.useAutoRotationBehavior = false;
    camera.inertia = 0.7; // Slightly higher for smoother movement
    camera.wheelDeltaPercentage = 0.02; // Finer zoom control for close-up satellite views
    
    // Add camera boundaries to prevent going through Earth and ensure smooth motion
    camera.checkCollisions = true;
    camera.collisionRadius = new BABYLON.Vector3(0.1, 0.1, 0.1);
    
    // Set initial camera position for better Earth view
    camera.setPosition(new BABYLON.Vector3(
        EARTH_RADIUS_KM * EARTH_SCALE * 3,
        EARTH_RADIUS_KM * EARTH_SCALE * 2,
        EARTH_RADIUS_KM * EARTH_SCALE * 3
    ));
    
    // Create proper lighting system - Realistic directional sunlight
    // Main directional light (sun) - single light source as in real life
    const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(1, 0, 0), scene);
    sunLight.intensity = 1.4; // Moderate intensity to prevent overexposure
    sunLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.92); // Warm sunlight color
    sunLight.specular = new BABYLON.Color3(0.3, 0.3, 0.3); // Very low specular to avoid unrealistic shiny appearance
    scene.sunLight = sunLight;

    // Add camera safety observer to prevent going inside Earth
    scene.onBeforeRenderObservable.add(() => {
        if (camera) {
            // Calculate distance from camera to Earth center
            const distanceToCenter = camera.position.length();
            const minSafeDistance = EARTH_RADIUS_KM * EARTH_SCALE * 1.01; // Reduced safe distance to match lowerRadiusLimit
            
            // If camera is too close to Earth, move it out to the safe distance
            if (distanceToCenter < minSafeDistance) {
                // Normalize position vector and set to safe distance
                const direction = camera.position.normalizeToNew();
                const safePosition = direction.scale(minSafeDistance);
                camera.position = safePosition;
            }
        }
    });

    // Almost entirely eliminate ambient light for a realistic hard terminator
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.15; // Increased ambient for brighter scene
    ambientLight.diffuse = new BABYLON.Color3(0.2, 0.2, 0.4); // Slight blue tint for space-scattered light
    ambientLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    scene.ambientLight = ambientLight;
    
    // Disable glow layer to prevent unwanted shadow effects
    // const glowLayer = new BABYLON.GlowLayer('atmosphericGlow', scene);
    
    // Only now create the rendering pipeline to ensure camera is properly initialized
    const renderingPipeline = new BABYLON.DefaultRenderingPipeline(
        "renderingPipeline", 
        true,  // HDR not needed for our visualization
        scene,
        [camera] // Pass initialized camera
    );
    
    // Enable bloom and tone mapping for cinematic glow
    renderingPipeline.bloomEnabled = true;
    renderingPipeline.bloomThreshold = 0.8;
    renderingPipeline.bloomWeight = 0.3;
    renderingPipeline.bloomKernel = 64;
    renderingPipeline.bloomScale = 0.5;
    renderingPipeline.imageProcessingEnabled = true;
    renderingPipeline.imageProcessing.toneMappingEnabled = true;
    renderingPipeline.imageProcessing.exposure = 1.2;
    
    // Keep chromatic aberration and grain off for clarity
     renderingPipeline.chromaticAberrationEnabled = false;
     renderingPipeline.grainEnabled = false;
     renderingPipeline.depthOfFieldEnabled = false;
    
    // Initialize the advanced texture for satellite labels
    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    advancedTexture.renderScale = 1;
    
    // Create the skybox first (background)
    createSkybox(scene);
    
    // Create the Sun - simple approach that worked
    const sunMesh = BABYLON.MeshBuilder.CreateSphere('sun', { 
        segments: 32,
        diameter: 3  // 3 Babylon units diameter (1.5x Earth size)
    }, scene);
    
    // Position sun far away - exactly like moon does it
    sunMesh.position = new BABYLON.Vector3(500, 0, 0);
    
    // Sharp, bright material - no atmosphere in space
    const sunMaterial = new BABYLON.StandardMaterial("sunMaterial", scene);
    sunMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0.95); // Bright white-yellow
    sunMaterial.emissiveIntensity = 1.5; // Bright
    sunMaterial.disableLighting = true;
    sunMaterial.backFaceCulling = true;
    sunMesh.material = sunMaterial;
    
    // Add glow effect - DISABLED to fix rendering through objects
    // const glowLayer = new GlowLayer("sunGlow", scene);
    // glowLayer.intensity = 0.5;
    // glowLayer.addIncludedOnlyMesh(sunMesh);
    
    // No corona - sharp ball in space
    
    // Add slow rotation to sun
    scene.registerBeforeRender(() => {
        sunMesh.rotation.y += 0.0001;
    });
    
    // Update directional light to come from sun
    const directionalLight = scene.getLightByName("sunLight");
    if (directionalLight && directionalLight instanceof BABYLON.DirectionalLight) {
        // Calculate direction from sun to origin (Earth)
        const sunToEarth = BABYLON.Vector3.Zero().subtract(sunMesh.position);
        directionalLight.direction = sunToEarth.normalize();
    }
    
    // Store reference for later use
    sun = { mesh: sunMesh };
    
    console.log('Simple sun created at position:', sunMesh.position);
    console.log('Sun position x:', sunMesh.position.x);
    
    // Then create Earth and Moon
    earthMesh = await createEarth(scene, () => simState.timeMultiplier, sunDirection);
    moonMesh = await createMoon(scene, () => simState.timeMultiplier);
    // Ground stations removed for Red Orbit
    // createGroundStations(scene, advancedTexture);
    // createCoverageCircles(scene, LOS_DEFAULT_KM, 128); // Use default LOS distance for fallback
    
    // Finally load satellite data
    await loadSatelliteData();
}

// Preview model viewer globals
let previewEngine;
let previewScene;
let previewCamera;
let previewMesh;

async function initModelViewer() {
    // Get the canvas and ensure it exists
    const canvas = document.getElementById('modelCanvas');
    if (!canvas) {
        console.error('Model viewer canvas not found');
        return;
    }
    
    // Make sure the canvas style is set correctly
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '10'; // Make sure canvas is above any potential placeholder text
    
    // Create engine and scene for preview with optimized settings
    previewEngine = new BABYLON.Engine(canvas, true, { 
        preserveDrawingBuffer: true, 
        stencil: true, 
        alpha: true,
        antialias: true, // Enable antialiasing for smoother rendering
        powerPreference: "high-performance", // Use high performance GPU if available
        depth: true, // Ensure depth buffer is properly configured
        premultipliedAlpha: false // Better alpha handling
    });
    previewEngine.setHardwareScalingLevel(1); // Full resolution rendering
    previewEngine.enableOfflineSupport = false; // Disable for better performance
    
    previewScene = new BABYLON.Scene(previewEngine);
    previewScene.collisionsEnabled = true;
    previewScene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 0.3);
    
    // Enable scene optimizations and fix depth precision
    previewScene.freezeActiveMeshes(); // Will unfreeze when loading new models
    previewScene.setRenderingAutoClearDepthStencil(0, true, true, true); // Optimize rendering
    previewScene.getEngine().setDepthFunction(BABYLON.Engine.LEQUAL); // Better depth testing
    previewScene.useLogarithmicDepth = false; // Disable logarithmic depth to prevent flickering at close range
    
    // Create simplified starfield background that won't interfere
    try {
        const starfieldTexture = new BABYLON.Texture("assets/stars.png", previewScene);
        starfieldTexture.onLoadObservable?.add(() => {
            console.log("Starfield texture loaded successfully");
        });
        if (starfieldTexture.onErrorObservable) {
            starfieldTexture.onErrorObservable.add(() => {
                console.warn("Starfield texture failed to load, using fallback");
            });
        }
        
        const starBackground = BABYLON.MeshBuilder.CreateSphere("starBackground", {
            diameter: 200,
            sideOrientation: BABYLON.Mesh.BACKSIDE // Show inside of sphere
        }, previewScene);
        starBackground.position = new BABYLON.Vector3(0, 0, 0);
        starBackground.infiniteDistance = true; // Always render behind everything
        
        const starMaterial = new BABYLON.StandardMaterial("starMaterial", previewScene);
        starMaterial.diffuseTexture = starfieldTexture;
        starMaterial.disableLighting = true;
        starMaterial.backFaceCulling = false;
        starBackground.material = starMaterial;
    } catch (error) {
        console.warn("Starfield setup failed, using simple background:", error);
        // Fallback to just the clear color if starfield fails
    }
    
    // Camera setup with improved settings for smooth interaction
    previewCamera = new BABYLON.ArcRotateCamera('previewCam', -Math.PI/2, Math.PI/3, 3, new BABYLON.Vector3(0,0,0), previewScene);
    previewCamera.lowerRadiusLimit = 0.5; // Prevent getting too close to avoid z-fighting
    previewCamera.upperRadiusLimit = 15; // Allow more zoom out
    previewCamera.minZ = 0.01; // Increased near clipping plane to prevent flickering
    previewCamera.maxZ = 1000; // Far clipping plane
    
    // Smooth camera controls
    previewCamera.wheelDeltaPercentage = 0.005; // Much smoother zoom
    previewCamera.pinchDeltaPercentage = 0.005; // Smooth pinch zoom
    previewCamera.panningSensibility = 50; // Smooth panning
    previewCamera.angularSensibilityX = 1000; // Smooth rotation
    previewCamera.angularSensibilityY = 1000; // Smooth rotation
    
    // Collision settings
    previewCamera.checkCollisions = true;
    previewCamera.collisionRadius = new BABYLON.Vector3(0.3, 0.3, 0.3);
    
    // Always attach control to the modelCanvas
    previewCamera.attachControl(canvas, true);

    // Enhance lighting for better model viewing with reduced reflections
    const hemisphericLight = new BABYLON.HemisphericLight('previewLight', new BABYLON.Vector3(0,1,0), previewScene);
    hemisphericLight.intensity = 1.0; // Balanced intensity
    hemisphericLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
    hemisphericLight.specular = new BABYLON.Color3(0.05, 0.05, 0.05); // Minimal specular to eliminate flickering
    hemisphericLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3); // Soft ground color
    
    // Add subtle particle system for stars in background
    const particleSystem = new BABYLON.ParticleSystem("stars", 200, previewScene);
    particleSystem.particleTexture = new BABYLON.Texture("assets/particle_star.png", previewScene);
    particleSystem.emitter = new BABYLON.Vector3(0, 0, -15); // Position the emitter behind everything
    particleSystem.minEmitBox = new BABYLON.Vector3(-10, -10, -5); // minimum box dimensions
    particleSystem.maxEmitBox = new BABYLON.Vector3(10, 10, -5); // maximum box dimensions
    
    // Particles configuration
    particleSystem.color1 = new BABYLON.Color4(0.8, 0.8, 1.0, 0.3);
    particleSystem.color2 = new BABYLON.Color4(0.7, 0.7, 1.0, 0.3);
    particleSystem.colorDead = new BABYLON.Color4(0.5, 0.5, 0.7, 0);
    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.15;
    particleSystem.minLifeTime = 5.0;
    particleSystem.maxLifeTime = 10.0;
    particleSystem.emitRate = 10;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    particleSystem.direction1 = new BABYLON.Vector3(-0.01, -0.01, 0);
    particleSystem.direction2 = new BABYLON.Vector3(0.01, 0.01, 0);
    particleSystem.minAngularSpeed = -0.01;
    particleSystem.maxAngularSpeed = 0.01;
    particleSystem.start();
    
    // Optimized engine render loop with frame rate control
    previewEngine.runRenderLoop(() => {
        if (previewScene && previewScene.activeCamera) {
            previewScene.render();
        }
    });
    
    // Handle resize with debouncing for better performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (previewEngine) {
                previewEngine.resize();
            }
        }, 100);
    });

    // Load a model when a satellite is selected
    window.addEventListener('satelliteSelected', async (e) => {
        // Make sure the dashboard is fully visible before sizing the canvas and loading model
        // Use a slightly longer delay to match the CSS transition time
        setTimeout(() => {
            // Ensure canvas is sized to its parent tile
            const canvas = document.getElementById('modelCanvas');
            if (canvas && canvas.parentElement) {
                const rect = canvas.parentElement.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                if (previewEngine) {
                    previewEngine.resize();
                    console.log('Model viewer canvas resized:', canvas.width, 'x', canvas.height);
                    
                    // Fade in the scene with a nice effect
                    const startingClearColor = previewScene.clearColor.clone();
                    previewScene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Start with black
                    
                    // Animate the background color back to normal
                    let colorStep = 0;
                    const colorAnimation = setInterval(() => {
                        colorStep += 0.05;
                        if (colorStep >= 1) {
                            previewScene.clearColor = startingClearColor;
                            clearInterval(colorAnimation);
                        } else {
                            previewScene.clearColor = BABYLON.Color4.Lerp(
                                new BABYLON.Color4(0, 0, 0, 1),
                                startingClearColor,
                                colorStep
                            );
                        }
                    }, 30);
                }
            }
        }, 250); // Longer delay to ensure dashboard animation is mostly complete

        // Properly clean up previous scene resources
        try {
            // Stop and dispose of any running animations from previous models
            if (previewScene.animationGroups && previewScene.animationGroups.length > 0) {
                console.log(`Cleaning up ${previewScene.animationGroups.length} previous animations`);
                previewScene.animationGroups.slice().forEach(animationGroup => {
                    animationGroup.stop();
                    animationGroup.dispose();
                });
            }
            
            // More selective mesh cleanup - preserve GLB hierarchy
            const meshesToRemove = [];
            previewScene.meshes.forEach(mesh => {
                // Keep camera, starfield background, and particle system meshes
                // Remove any imported model meshes (they'll have materials or be part of GLB)
                if (mesh !== previewCamera && 
                    !mesh.name.includes("star") && 
                    !mesh.name.includes("particle") &&
                    !mesh.name.includes("Background") &&
                    mesh.name !== "starBackground") {
                    
                    // Check if this mesh is from a loaded model (has material or geometry)
                    if (mesh.material || mesh.geometry || mesh.name.includes("satellite") || mesh.name === "__root__") {
                        meshesToRemove.push(mesh);
                    }
                }
            });
            
            // Clean up satellite meshes and their observers
            meshesToRemove.forEach(mesh => {
                // Clean up any stored observers
                if (mesh.userData && mesh.userData.rotationObserver) {
                    previewScene.onBeforeRenderObservable.remove(mesh.userData.rotationObserver);
                }
                mesh.dispose();
            });
            
            // Clean up any leftover transform nodes from previous loads
            previewScene.transformNodes.slice().forEach(node => {
                if (node.name !== "previewCam" && !node.name.includes("star") && !node.name.includes("particle")) {
                    node.dispose();
                }
            });
            
            // Clean up lights (except the main hemispheric light)
            previewScene.lights.slice().forEach(light => {
                if (light.name === "previewLight") return; // keep the main hemispheric light
                light.dispose();
            });
            
            // Clear any existing observers that might be tied to the old mesh
            previewScene.onBeforeRenderObservable.clear();
            
            // Unfreeze meshes for new model loading
            previewScene.unfreezeActiveMeshes();
            
            previewMesh = null;
            
            // Force a garbage collection hint and clear caches
            if (previewEngine) {
                previewEngine.wipeCaches(true);
            }
        } catch (err) {
            console.warn("Error cleaning up previous model resources:", err);
        }

        const satName = e.detail.name;
        if (!satName) return;
        // Determine model file by name
        const modelFile = satName.toUpperCase().includes('CRTS')
            ? 'assets/crts_satellite.glb'
            : 'assets/bulldog_sat_mobile.glb';
        try {
            // Unfreeze active meshes before loading new model
            previewScene.unfreezeActiveMeshes();
            
            const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelFile, previewScene);
            
            // Find the root mesh or create a reference to all imported meshes
            // Don't disrupt the original GLB hierarchy - it knows how to position its parts
            const rootMesh = result.meshes.find(mesh => mesh.name === "__root__") || result.meshes[0];
            previewMesh = rootMesh;
            
            // Clear rotation quaternion only on the root to allow manual rotation
            if (previewMesh.rotationQuaternion) {
                previewMesh.rotationQuaternion = null;
            }
            
            // Ensure complete isolation from main scene
            result.meshes.forEach(mesh => {
                mesh.doNotSyncBoundingInfo = true;
                mesh.alwaysSelectAsActiveMesh = false;
            });
            
            // Check for and start any built-in animations (solar panels, thrusters, etc.)
            console.log(`Checking for animations in ${modelFile}...`);
            console.log(`Animation groups found:`, result.animationGroups ? result.animationGroups.length : 0);
            console.log(`Scene animation groups total:`, previewScene.animationGroups.length);
            
            // For the model viewer, we want a static display - no animations
            // Set all animation groups to a specific state (fully deployed or clean resting state)
            if (result.animationGroups && result.animationGroups.length > 0) {
                result.animationGroups.forEach((animationGroup, index) => {
                    // Rename for uniqueness
                    animationGroup.name = `preview_${satName}_animation_${index}`;
                    
                    // Set to the start state to avoid floating parts
                    // This shows the satellite in its resting configuration
                    animationGroup.reset();
                    animationGroup.goToFrame(animationGroup.from); // Jump to the start state
                    
                    console.log(`Set animation '${animationGroup.name}' to deployed state (frame ${animationGroup.to})`);
                });
                console.log(`Model viewer showing fully deployed state for ${satName}`);
            } else {
                console.log(`No built-in animations found for ${satName} - showing default state`);
            }
            
            // Don't reparent individual meshes - let GLB maintain its own hierarchy
            console.log(`Loaded ${result.meshes.length} meshes for ${satName}:`, result.meshes.map(m => m.name));
            
            // Reset mesh hierarchy to fix any "stuck parts" issue (same as main scene)
            function resetPreviewMeshHierarchy(mesh) {
                if (mesh.getChildren) {
                    mesh.getChildren().forEach(child => {
                        // Only reset if the mesh seems to have been transformed abnormally
                        if (child.position && child.position.length() > 1000) {
                            console.warn(`Preview: Resetting abnormal position for ${child.name}:`, child.position);
                            child.position = BABYLON.Vector3.Zero();
                        }
                        if (child.rotation && (Math.abs(child.rotation.x) > Math.PI || Math.abs(child.rotation.y) > Math.PI || Math.abs(child.rotation.z) > Math.PI)) {
                            console.warn(`Preview: Resetting abnormal rotation for ${child.name}:`, child.rotation);
                            child.rotation = BABYLON.Vector3.Zero();
                        }
                        // Recursively check children
                        resetPreviewMeshHierarchy(child);
                    });
                }
            }
            
            // Reset mesh positions before scaling
            previewMesh.position = BABYLON.Vector3.Zero();
            previewMesh.rotation = BABYLON.Vector3.Zero();
            resetPreviewMeshHierarchy(previewMesh);
            
            // Adjust scale factor and positioning based on satellite type
            let scaleFactor = 0.5;
            if (satName.toUpperCase().includes('CRTS')) {
                scaleFactor = 0.75; // Much larger scale for CRTS models for better visibility
                previewCamera.radius = 2.5; // Closer viewing distance for CRTS
                previewCamera.beta = Math.PI/3; // Better initial angle for CRTS viewing
                // CRTS models stay in default orientation
            } else {
                // BULLDOG satellite - keep in default orientation (no rotation to prevent floating pieces)
                scaleFactor = 0.5;
                previewCamera.radius = 3.0; // Optimal viewing distance for BULLDOG
                previewCamera.beta = Math.PI/3; // Better initial angle for viewing
                previewCamera.lowerRadiusLimit = 1.0; // Prevent getting too close to Bulldog model
                // Removed the 180-degree rotation that was causing floating pieces
            }
            previewMesh.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            
            console.log(`Preview model hierarchy reset and scaled for ${satName}`);
            
            // Center the model on origin with better positioning
            const boundingInfo = previewMesh.getBoundingInfo();
            const center = boundingInfo.boundingBox.center;
            // Adjust the Y position to center the satellite better in view
            const adjustedCenter = center.clone();
            if (satName.toUpperCase().includes('CRTS')) {
                adjustedCenter.y += 0.4; // Move CRTS more down for better centering
            }
            previewMesh.position = adjustedCenter.negate();
            
            // Apply different rotations based on satellite type
            // to ensure antennas and sensors are pointing correctly
            if (satName.toUpperCase().includes('CRTS')) {
                // CRTS: Rotate 270 degrees around Y-axis (180 + 90)
                previewMesh.rotation.y = Math.PI * 1.5; // 270 degrees in radians
            } else if (satName.toUpperCase().includes('BULLDOG')) {
                // Bulldog: Rotate to point dish down at Earth
                previewMesh.rotation.x = -Math.PI / 2; // 90 degrees up (negative = up)
                previewMesh.rotation.y = Math.PI; // 180 degrees around Y
            }
            
            // Add smooth auto-rotation animation with proper cleanup
            const rotationObserver = previewScene.onBeforeRenderObservable.add(() => {
                if (previewMesh && previewMesh.rotation) {
                    previewMesh.rotation.y += 0.002; // Much slower rotation for better viewing
                }
            });
            
            // Store the observer for cleanup
            previewMesh.userData = { rotationObserver };
            
            // Adjust materials on Bulldog model to reduce flickering
            if (satName.toUpperCase().includes('BULLDOG')) {
                previewScene.meshes.forEach(mesh => {
                    if (mesh.material) {
                        // Reduce specular on all materials to prevent flickering
                        if (mesh.material.specularColor) {
                            mesh.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                        }
                        if (mesh.material.specularPower) {
                            mesh.material.specularPower = 10; // Lower specular power
                        }
                        // Ensure material uses standard rendering
                        mesh.material.backFaceCulling = true;
                        mesh.material.separateCullingPass = false;
                    }
                });
            }
            
            // Add enhanced lighting for better model visibility with reduced reflections
            const pointLight = new BABYLON.PointLight("modelSpotlight", 
                new BABYLON.Vector3(4, 3, 4), previewScene);
            pointLight.intensity = satName.toUpperCase().includes('CRTS') ? 2.5 : 0.8; // Reduced intensity for Bulldog to prevent overexposure
            pointLight.diffuse = new BABYLON.Color3(1.0, 1.0, 1.0);
            pointLight.specular = new BABYLON.Color3(0.1, 0.1, 0.1); // Very low specular to eliminate flickering
            
            // Add softer rim lighting for better definition without harsh reflections
            const rimLight = new BABYLON.DirectionalLight("rimLight", 
                new BABYLON.Vector3(-1, -1, -1), previewScene);
            rimLight.intensity = satName.toUpperCase().includes('CRTS') ? 1.0 : 0.4; // Much enhanced rim lighting for CRTS
            rimLight.diffuse = new BABYLON.Color3(0.8, 0.8, 1.0);
            rimLight.specular = new BABYLON.Color3(0.1, 0.1, 0.2); // Very low specular to prevent reflective artifacts
            
            // Add additional fill light specifically for CRTS to brighten it up
            if (satName.toUpperCase().includes('CRTS')) {
                const fillLight = new BABYLON.PointLight("fillLight", 
                    new BABYLON.Vector3(-3, 2, -2), previewScene);
                fillLight.intensity = 1.2; // Increased intensity
                fillLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
                fillLight.specular = new BABYLON.Color3(0.1, 0.1, 0.1); // Minimal specular
                
                // Add a secondary fill light from the opposite side
                const fillLight2 = new BABYLON.PointLight("fillLight2", 
                    new BABYLON.Vector3(3, -1, 2), previewScene);
                fillLight2.intensity = 0.8;
                fillLight2.diffuse = new BABYLON.Color3(1.0, 0.9, 0.8);
                fillLight2.specular = new BABYLON.Color3(0.05, 0.05, 0.05);
                
                // Add an additional ambient boost for CRTS
                const crtsAmbientLight = new BABYLON.HemisphericLight('crtsAmbient', 
                    new BABYLON.Vector3(0, 1, 0), previewScene);
                crtsAmbientLight.intensity = 0.5; // Increased ambient intensity
                crtsAmbientLight.diffuse = new BABYLON.Color3(0.9, 0.9,  1.0);
            }
            
            // Freeze meshes again for performance after loading
            setTimeout(() => {
                previewScene.freezeActiveMeshes();
            }, 100);
            
            console.log(`Model ${modelFile} loaded successfully for satellite ${satName}`);
        } catch (err) {
            console.error('Error loading preview model:', err);
        }
    });
}

/**
 * Sets up the panel minimize/restore functionality
 */
function setupPanelMinimizeControls() {
    console.log('Setting up panel minimize controls...');
    
    // Check if mission dashboard is visible
    const dashboard = document.getElementById('mission-dashboard');
    console.log('Dashboard element:', dashboard);
    console.log('Dashboard classes:', dashboard?.className);
    
    // Check if buttons exist in DOM
    const minimizeTelemetryBtn = document.getElementById('minimize-telemetry');
    const minimizeModelBtn = document.getElementById('minimize-model');
    
    console.log('Telemetry minimize button:', minimizeTelemetryBtn);
    console.log('Model minimize button:', minimizeModelBtn);
    
    if (minimizeTelemetryBtn) {
        console.log('Telemetry button styles:', getComputedStyle(minimizeTelemetryBtn));
        console.log('Telemetry button parent:', minimizeTelemetryBtn.parentElement);
        minimizeTelemetryBtn.replaceWith(minimizeTelemetryBtn.cloneNode(true));
    } else {
        console.log('Telemetry button not found in DOM');
    }
    
    if (minimizeModelBtn) {
        console.log('Model button styles:', getComputedStyle(minimizeModelBtn));
        console.log('Model button parent:', minimizeModelBtn.parentElement);
        minimizeModelBtn.replaceWith(minimizeModelBtn.cloneNode(true));
    } else {
        console.log('Model button not found in DOM');
    }
    
    // Get fresh references after replacement
    const newMinimizeTelemetryBtn = document.getElementById('minimize-telemetry');
    const newMinimizeModelBtn = document.getElementById('minimize-model');
    
    console.log('After replacement - Telemetry button:', newMinimizeTelemetryBtn);
    console.log('After replacement - Model button:', newMinimizeModelBtn);
    
    // Telemetry panel minimize
    if (newMinimizeTelemetryBtn) {
        console.log('Adding event listener to telemetry button');
        newMinimizeTelemetryBtn.addEventListener('click', (e) => {
            console.log('Telemetry minimize clicked!');
            e.stopPropagation();
            minimizePanel('telemetry');
        });
    }
    
    // Model panel minimize
    if (newMinimizeModelBtn) {
        console.log('Adding event listener to model button');
        newMinimizeModelBtn.addEventListener('click', (e) => {
            console.log('Model minimize clicked!');
            e.stopPropagation();
            minimizePanel('model');
        });
    }
}

/**
 * Minimizes a specific panel and creates a minimized tab
 */
function minimizePanel(panelType) {
    const dashboard = document.getElementById('mission-dashboard');
    const tabsContainer = document.getElementById('minimized-tabs-container');
    
    if (panelType === 'telemetry') {
        const telemetryTile = document.getElementById('telemetry-tile');
        const existingTab = document.getElementById('minimized-telemetry-tab');
        
        // Hide the panel
        if (telemetryTile) {
            telemetryTile.classList.add('minimized');
        }
        
        // Create minimized tab if it doesn't exist
        if (!existingTab && tabsContainer) {
            const tab = document.createElement('div');
            tab.id = 'minimized-telemetry-tab';
            tab.className = 'minimized-tab telemetry-tab';
            tab.innerHTML = `<img src="/assets/telem.svg" style="width:18px; height:18px; filter:brightness(0) invert(1);" alt="Telemetry">`;
            tab.title = 'Click to restore telemetry panel';
            
            // Set satellite-specific color
            if (activeSatellite) {
                if (activeSatellite.toUpperCase().includes('CRTS')) {
                    tab.style.background = 'rgba(255, 140, 0, 0.7)'; // Orange for CRTS
                    tab.style.borderColor = '#ff8c00';
                } else if (activeSatellite.toUpperCase().includes('BULLDOG')) {
                    tab.style.background = 'rgba(0, 207, 255, 0.7)'; // Cyan for BULLDOG
                    tab.style.borderColor = '#00cfff';
                }
            }
            
            tab.addEventListener('click', () => {
                restorePanel('telemetry');
            });
            
            tabsContainer.appendChild(tab);
        }
        
    } else if (panelType === 'model') {
        const modelTile = document.getElementById('model-tile');
        const existingTab = document.getElementById('minimized-model-tab');
        
        // Hide the panel
        if (modelTile) {
            modelTile.classList.add('minimized');
        }
        
        // Create minimized tab if it doesn't exist
        if (!existingTab && tabsContainer) {
            const tab = document.createElement('div');
            tab.id = 'minimized-model-tab';
            tab.className = 'minimized-tab model-tab';
            tab.innerHTML = `<img src="/assets/3d.svg" style="width:18px; height:18px; filter:brightness(0) invert(1);" alt="3D Model">`;
            tab.title = 'Click to restore 3D model panel';
            
            // Set satellite-specific color
            if (activeSatellite) {
                if (activeSatellite.toUpperCase().includes('CRTS')) {
                    tab.style.background = 'rgba(255, 140, 0, 0.7)'; // Orange for CRTS
                    tab.style.borderColor = '#ff8c00';
                } else if (activeSatellite.toUpperCase().includes('BULLDOG')) {
                    tab.style.background = 'rgba(0, 207, 255, 0.7)'; // Cyan for BULLDOG
                    tab.style.borderColor = '#00cfff';
                }
            }
            
            tab.addEventListener('click', () => {
                restorePanel('model');
            });
            
            tabsContainer.appendChild(tab);
        }
    }
    
    // Show the dock since we now have minimized panels
    updateDockVisibility();
    
    // Update dashboard layout
    updateDashboardLayout();
}

/**
 * Restores a minimized panel and removes its tab
 */
function restorePanel(panelType) {
    const dashboard = document.getElementById('mission-dashboard');
    
    if (panelType === 'telemetry') {
        const telemetryTile = document.getElementById('telemetry-tile');
        const tab = document.getElementById('minimized-telemetry-tab');
        
        // Show the panel
        if (telemetryTile) {
            telemetryTile.classList.remove('minimized');
        }
        
        // Remove the tab
        if (tab) {
            tab.remove();
        }
        
    } else if (panelType === 'model') {
        const modelTile = document.getElementById('model-tile');
        const tab = document.getElementById('minimized-model-tab');
        
        // Show the panel
        if (modelTile) {
            modelTile.classList.remove('minimized');
        }
        
        // Remove the tab
        if (tab) {
            tab.remove();
        }
        
        // Resize model viewer when restored
        if (previewEngine) {
            setTimeout(() => {
                previewEngine.resize();
            }, 100);
        }
    }
    
    // Update dock visibility - hide if no more minimized panels
    updateDockVisibility();
    
    // Update dashboard layout
    updateDashboardLayout();
}

/**
 * Updates the dashboard layout based on minimized panels
 */
function updateDashboardLayout() {
    // No layout changes needed - panels maintain their original sizes
    // This prevents 3D model distortion by keeping consistent dimensions
    
    // Just ensure the 3D model viewer is properly resized if the model panel is visible
    const modelTile = document.getElementById('model-tile');
    const modelMinimized = modelTile?.classList.contains('minimized');
    
    if (!modelMinimized && previewEngine) {
        // Slight delay to ensure DOM has updated
        setTimeout(() => {
            previewEngine.resize();
        }, 50);
    }
}

/**
 * Cleans up minimized tabs when dashboard is closed
 */
function cleanupMinimizedTabs() {
    const tabsContainer = document.getElementById('minimized-tabs-container');
    if (tabsContainer) {
        tabsContainer.innerHTML = '';
        // Hide the dock when dashboard is closed
        tabsContainer.style.display = 'none';
    }
}

// Make cleanup function globally accessible
window.cleanupMinimizedTabs = cleanupMinimizedTabs;

/**
 * Minimizes SDA panels and creates minimized tabs
 */
function minimizeSDAPanel(panelType) {
    const tabsContainer = document.getElementById('minimized-tabs-container');
    
    if (panelType === 'legend') {
        const sdaLegend = document.getElementById('sda-legend');
        const existingTab = document.getElementById('minimized-sda-legend-tab');
        
        // Hide the panel
        if (sdaLegend) {
            sdaLegend.style.display = 'none';
            sdaLegend.classList.remove('visible');
        }
        
        // Create minimized tab if it doesn't exist
        if (!existingTab && tabsContainer) {
            const tab = document.createElement('div');
            tab.id = 'minimized-sda-legend-tab';
            tab.className = 'minimized-tab sda-legend-tab';
            tab.innerHTML = `<img src="/assets/sat.svg" style="width:18px; height:18px; filter:brightness(0) invert(1);" alt="SDA Visualization">`;
            tab.title = 'Click to restore SDA visualization panel';
            
            // Red color for Red Orbit
            tab.style.background = 'rgba(255, 0, 0, 0.7)';
            tab.style.borderColor = '#ff0000';
            
            tab.addEventListener('click', () => {
                restoreSDAPanel('legend');
            });
            
            tabsContainer.appendChild(tab);
        }
        
    } else if (panelType === 'browser') {
        const sdaBrowser = document.getElementById('sda-data-browser');
        const existingTab = document.getElementById('minimized-sda-browser-tab');
        
        // Hide the panel
        if (sdaBrowser) {
            sdaBrowser.style.display = 'none';
            sdaBrowser.classList.remove('visible');
        }
        
        // Create minimized tab if it doesn't exist
        if (!existingTab && tabsContainer) {
            const tab = document.createElement('div');
            tab.id = 'minimized-sda-browser-tab';
            tab.className = 'minimized-tab sda-browser-tab';
            tab.innerHTML = `<img src="/assets/telem.svg" style="width:18px; height:18px; filter:brightness(0) invert(1);" alt="Satellite Database">`;
            tab.title = 'Click to restore satellite database panel';
            
            // Green color for database
            tab.style.background = 'rgba(34, 197, 94, 0.7)';
            tab.style.borderColor = '#22c55e';
            
            tab.addEventListener('click', () => {
                restoreSDAPanel('browser');
            });
            
            tabsContainer.appendChild(tab);
        }
    }
    
    updateDockVisibility();
}

/**
 * Restores a minimized SDA panel and removes its tab
 */
function restoreSDAPanel(panelType) {
    if (panelType === 'legend') {
        const sdaLegend = document.getElementById('sda-legend');
        const tab = document.getElementById('minimized-sda-legend-tab');
        
        // Show the panel
        if (sdaLegend) {
            sdaLegend.style.display = 'block';
            sdaLegend.classList.add('visible');
        }
        
        // Remove the tab
        if (tab) {
            tab.remove();
        }
        
    } else if (panelType === 'browser') {
        const sdaBrowser = document.getElementById('sda-data-browser');
        const tab = document.getElementById('minimized-sda-browser-tab');
        
        // Show the panel
        if (sdaBrowser) {
            sdaBrowser.style.display = '';
            sdaBrowser.classList.add('visible');
        }
        
        // Remove the tab
        if (tab) {
            tab.remove();
        }
    }
    
    updateDockVisibility();
}

// Make SDA functions globally accessible
window.minimizeSDAPanel = minimizeSDAPanel;
window.restoreSDAPanel = restoreSDAPanel;
window.updateDockVisibility = updateDockVisibility;

/**
 * Updates the visibility of the minimize dock based on minimized panels
 */
function updateDockVisibility() {
    const tabsContainer = document.getElementById('minimized-tabs-container');
    if (!tabsContainer) return;
    
    // Check if there are any minimized tabs
    const minimizedTabs = tabsContainer.children.length;
    
    if (minimizedTabs > 0) {
        // Show the dock with minimized panels
        tabsContainer.style.display = 'flex';
    } else {
        // Hide the dock when no panels are minimized
        tabsContainer.style.display = 'none';
    }
}

/**
 * Restores all minimized panels when reopening satellite viewer
 */
function restoreAllMinimizedPanels() {
    const telemetryTile = document.getElementById('telemetry-tile');
    const modelTile = document.getElementById('model-tile');
    
    // Restore any minimized panels
    if (telemetryTile && telemetryTile.classList.contains('minimized')) {
        telemetryTile.classList.remove('minimized');
    }
    
    if (modelTile && modelTile.classList.contains('minimized')) {
        modelTile.classList.remove('minimized');
    }
    
    // Clear any existing minimized tabs
    const tabsContainer = document.getElementById('minimized-tabs-container');
    if (tabsContainer) {
        tabsContainer.innerHTML = '';
    }
    
    // Update dock visibility
    updateDockVisibility();
    
    // Resize model viewer if restored
    if (previewEngine) {
        setTimeout(() => {
            previewEngine.resize();
        }, 100);
    }
}

/**
 * Shows a temporary notification message in the UI
 * @param {string} message - The message to display
 * @param {number} duration - Time in milliseconds to show the notification (default: 3000ms)
 */
function showNotification(message, duration = 3000) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('leos-notification');
    if (!notification) {
        // Determine top position based on whether banner is active
        const topPosition = window.unclassBannerActive ? '110px' : '70px';
        
        notification = document.createElement('div');
        notification.id = 'leos-notification';
        notification.style.cssText = `
            position: absolute;
            top: ${topPosition}; /* Position adjusted for banner if active */
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 23, 40, 0.92);
            border: 1px solid var(--neon-blue);
            color: #66d9ff;
            padding: 8px 16px;
            border-radius: 8px;
            font-family: var(--font-primary);
            font-size: 14px;
            font-weight: 500;
            text-align: center;
            z-index: 1100;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            box-shadow: 0 2px 12px rgba(0, 207, 255, 0.2);
        `;
        document.body.appendChild(notification);
    }
    
    // Set message and show notification
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Hide after duration
    clearTimeout(window.notificationTimeout);
    window.notificationTimeout = setTimeout(() => {
        notification.style.opacity = '0';
    }, duration);
}

// Global flag to track if settings modal listeners are initialized
let settingsModalInitialized = false;

function initializeSettingsModal() {
    if (settingsModalInitialized) return;
    
    const modal = document.getElementById('simulation-settings-modal');
    if (!modal) return;
    
    // Global settings object to store all simulation settings
    window.simulationSettings = {
        // Security & Classification
        applyUnclassBanner: false,
        
        // Performance
        renderQuality: 'medium',
        updateFrequency: 60,
        adaptiveQuality: true,
        showFpsCounter: false,
        
        // Visual Display
        showOrbitPaths: false,
        showSatelliteLabels: true,
        showGroundStations: true,
        showLineOfSight: true,
        showEarthAtmosphere: true,
        showSunlight: true,
        
        // Orbit Trails
        trailLength: 180, // minutes
        trailQuality: 'medium',
        trailOpacity: 0.8,
        trailFadeGradient: true,
        
        // Satellite Appearance
        satelliteScale: 1.0,
        showSatelliteGlow: true,
        realisticLighting: true,
        labelScale: 1.0,
        
        // Camera & Controls
        cameraSensitivity: 1.0,
        zoomSpeed: 1.0,
        smoothCamera: true,
        autoFollowSatellite: false,
        
        // Performance
        renderQuality: 'medium',
        updateFrequency: 60,
        adaptiveQuality: true,
        showFpsCounter: false,
        
        // Advanced
        showCoordinateSystem: false,
        showOrbitalMechanics: false,
        enablePhysicsDebug: false,
        earthRotationRate: 1.0
    };
    
    const closeModal = () => {
        modal.style.display = 'none';
    };
    
    // Initialize all range inputs with value display updates
    const initializeRangeInput = (rangeId, valueId, suffix = '') => {
        const range = document.getElementById(rangeId);
        const value = document.getElementById(valueId);
        if (range && value) {
            const updateValue = () => {
                const val = parseFloat(range.value);
                if (suffix === '%') {
                    value.textContent = `${Math.round(val * 100)}%`;
                } else if (suffix === 'x') {
                    value.textContent = `${val}x`;
                } else if (suffix === ' min') {
                    value.textContent = `${val} min`;
                } else if (suffix === ' FPS') {
                    value.textContent = `${val} FPS`;
                } else {
                    value.textContent = `${Math.round(val * 100)}%`;
                }
            };
            range.addEventListener('input', updateValue);
            updateValue(); // Set initial value
        }
    };
    
    // Initialize all range inputs
    initializeRangeInput('trail-length', 'trail-length-value', ' min');
    initializeRangeInput('trail-opacity', 'trail-opacity-value', '%');
    initializeRangeInput('satellite-scale', 'satellite-scale-value', '%');
    initializeRangeInput('label-scale', 'label-scale-value', '%');
    initializeRangeInput('camera-sensitivity', 'camera-sensitivity-value', '%');
    initializeRangeInput('zoom-speed', 'zoom-speed-value', '%');
    initializeRangeInput('update-frequency', 'update-frequency-value', ' FPS');
    initializeRangeInput('earth-rotation-rate', 'earth-rotation-rate-value', '%');
    
    
    // Settings presets
    const presets = {
        performance: {
            trailQuality: 'low',
            renderQuality: 'low',
            updateFrequency: 30,
            showEarthAtmosphere: false,
            showSatelliteGlow: false,
            adaptiveQuality: true,
            trailLength: 60
        },
        quality: {
            trailQuality: 'ultra',
            renderQuality: 'ultra',
            updateFrequency: 120,
            showEarthAtmosphere: true,
            showSatelliteGlow: true,
            realisticLighting: true,
            trailLength: 360
        },
        cinematic: {
            smoothCamera: true,
            autoFollowSatellite: true,
            showSatelliteGlow: true,
            realisticLighting: true,
            trailFadeGradient: true,
            showEarthAtmosphere: true,
            satelliteScale: 1.5,
            trailOpacity: 0.9
        },
        educational: {
            showCoordinateSystem: true,
            showOrbitalMechanics: true,
            showFpsCounter: true,
            autoPauseEvents: true,
            timeMultiplier: 5,
            labelScale: 1.3
        },
        developer: {
            enablePhysicsDebug: true,
            showCoordinateSystem: true,
            showOrbitalMechanics: true,
            showFpsCounter: true,
            adaptiveQuality: false,
            renderQuality: 'medium'
        }
    };
    
    // Preset selector
    const presetsSelect = document.getElementById('settings-presets');
    if (presetsSelect) {
        presetsSelect.addEventListener('change', (e) => {
            const presetName = e.target.value;
            if (presetName && presets[presetName]) {
                applyPreset(presets[presetName]);
                showNotification(`${presetName.charAt(0).toUpperCase() + presetName.slice(1)} preset loaded!`);
            }
            presetsSelect.value = ''; // Reset selector
        });
    }
    
    // Apply preset function
    const applyPreset = (preset) => {
        Object.assign(window.simulationSettings, preset);
        updateModalFromSettings();
    };
    
    // Update modal UI from settings object
    const updateModalFromSettings = () => {
        const settings = window.simulationSettings;
        
        // Update all controls based on settings
        Object.keys(settings).forEach(key => {
            let elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            
            // Handle special cases for field mapping
            if (key === 'timezone') {
                elementId = 'timezone-select';
            }
            
            const element = document.getElementById(elementId);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else if (element.type === 'range') {
                    element.value = settings[key];
                    element.dispatchEvent(new Event('input')); // Trigger value display update
                } else if (element.tagName === 'SELECT') {
                    element.value = settings[key];
                } else {
                    element.value = settings[key];
                }
            }
        });
    };
    
    // Reset to defaults
    const resetBtn = document.getElementById('settings-reset-button');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset to default values
            window.simulationSettings = {
                timeMultiplier: 1.0,
                timezone: 'UTC',
                showOrbitPaths: false,
                showSatelliteLabels: true,
                showGroundStations: true,
                showLineOfSight: true,
                showEarthAtmosphere: true,
                showSunlight: true,
                trailLength: 180,
                trailQuality: 'medium',
                trailOpacity: 0.8,
                trailFadeGradient: true,
                satelliteScale: 1.0,
                showSatelliteGlow: true,
                realisticLighting: true,
                labelScale: 1.0,
                cameraSensitivity: 1.0,
                zoomSpeed: 1.0,
                smoothCamera: true,
                autoFollowSatellite: false,
                renderQuality: 'medium',
                updateFrequency: 60,
                adaptiveQuality: true,
                showFpsCounter: false,
                showCoordinateSystem: false,
                showOrbitalMechanics: false,
                enablePhysicsDebug: false,
                earthRotationRate: 1.0
            };
            updateModalFromSettings();
            showNotification('Settings reset to defaults!');
        });
    }
    
    // Close button handlers
    const closeBtn = document.getElementById('settings-modal-close');
    const closeFooterBtn = document.getElementById('settings-modal-close-footer');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);
    
    // Apply settings button
    const applyBtn = document.getElementById('settings-apply-button');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            // Save old values for comparison
            const oldRenderQuality = window.simulationSettings.renderQuality;
            const oldFpsCounter = window.simulationSettings.showFpsCounter;
            const oldUpdateFreq = window.simulationSettings.updateFrequency;
            
            applyAllSettings();
            
            // Show specific feedback about what changed
            let changes = [];
            if (window.simulationSettings.renderQuality !== oldRenderQuality) {
                changes.push(`Render quality: ${window.simulationSettings.renderQuality}`);
            }
            if (window.simulationSettings.showFpsCounter !== oldFpsCounter) {
                changes.push(`FPS counter: ${window.simulationSettings.showFpsCounter ? 'ON' : 'OFF'}`);
            }
            if (window.simulationSettings.updateFrequency !== oldUpdateFreq) {
                changes.push(`Target FPS: ${window.simulationSettings.updateFrequency}`);
            }
            
            closeModal();
            
            if (changes.length > 0) {
                showNotification(`Settings applied: ${changes.join(', ')}`, 4000);
            } else {
                showNotification('Settings applied successfully!', 3000);
            }
        });
    }
    
    // Apply all settings to simulation
    const applyAllSettings = () => {
        const settings = window.simulationSettings;
        
        // Read all values from modal controls
        const inputs = modal.querySelectorAll('input, select');
        inputs.forEach(input => {
            let key = input.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            
            // Handle special cases for field mapping
            if (input.id === 'timezone-select') {
                key = 'timezone';
            }
            
            if (key && settings.hasOwnProperty(key)) {
                if (input.type === 'checkbox') {
                    settings[key] = input.checked;
                } else if (input.type === 'range' || input.type === 'number') {
                    settings[key] = parseFloat(input.value);
                } else {
                    settings[key] = input.value;
                }
            }
        });
        
        
        // Apply performance settings (render quality, FPS limiting)
        applyRenderQuality(settings);
        applyFpsCounter(settings);
        applyFpsLimiting(settings);
        
        // Apply trail settings to existing trails
        applyTrailSettings(settings);
        
        // Apply visual settings
        applyVisualSettings(settings);
        
        // Apply UNCLASS banner
        applyUnclassBanner(settings);
        
        // Apply camera settings
        applyCameraSettings(settings);
        
        console.log('All simulation settings applied:', settings);
    };
    
    // Tab switching functionality
    const tabButtons = modal.querySelectorAll('.tab-button');
    const tabContents = modal.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        // Add hover effects (skip disabled buttons)
        button.addEventListener('mouseenter', () => {
            if (!button.classList.contains('active') && !button.classList.contains('disabled')) {
                button.style.background = 'rgba(0,207,255,0.1)';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            if (!button.classList.contains('active') && !button.classList.contains('disabled')) {
                button.style.background = 'rgba(0,23,40,0.5)';
            }
        });
        
        button.addEventListener('click', () => {
            // Skip if button is disabled
            if (button.classList.contains('disabled')) {
                return;
            }
            
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                if (!btn.classList.contains('disabled')) {
                    btn.style.background = 'rgba(0,23,40,0.5)';
                    btn.style.borderBottom = '2px solid transparent';
                }
            });
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            button.style.background = 'rgba(0,207,255,0.2)';
            button.style.borderBottom = '2px solid #00cfff';
            
            const targetContent = modal.querySelector(`#${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    settingsModalInitialized = true;
}

// Helper functions to apply specific setting categories

function applyTrailSettings(settings) {
    // Apply trail settings to satellites module
    if (window.cometTrails) {
        Object.keys(window.cometTrails).forEach(satName => {
            const trail = window.cometTrails[satName];
            if (trail) {
                // Update trail length (convert minutes to seconds)
                trail.maxHistoryLength = settings.trailLength * 60;
                
                // Update trail opacity
                if (trail.trailMesh) {
                    trail.trailMesh.alpha = settings.trailOpacity;
                }
                
                // Update sampling interval based on quality
                switch (settings.trailQuality) {
                    case 'low':
                        trail.samplingIntervalSeconds = 5;
                        break;
                    case 'medium':
                        trail.samplingIntervalSeconds = 2;
                        break;
                    case 'high':
                        trail.samplingIntervalSeconds = 1;
                        break;
                    case 'ultra':
                        trail.samplingIntervalSeconds = 0.5;
                        break;
                }
            }
        });
    }
}

function applyRenderQuality(settings) {
    // Only apply render quality changes if it's different from current
    if (window.scene && window.scene.getEngine) {
        const engine = window.scene.getEngine();
        
        // Store current settings to avoid unnecessary changes
        if (!window.currentRenderSettings) {
            window.currentRenderSettings = {
                renderQuality: 'medium',
                scaling: 1.0,
                samples: 2
            };
        }
        
        // Only apply changes if render quality actually changed
        if (settings.renderQuality !== window.currentRenderSettings.renderQuality) {
            let newScaling, newSamples;
            
            switch (settings.renderQuality) {
                case 'low':
                    newScaling = 2.0; // 50% resolution
                    newSamples = 1;
                    window.scene.skipPointerMovePicking = true;
                    window.scene.autoClear = false;
                    break;
                case 'medium':
                    newScaling = 1.0; // 100% resolution
                    newSamples = 2;
                    window.scene.skipPointerMovePicking = true;
                    window.scene.autoClear = true;
                    break;
                case 'high':
                    newScaling = 0.8; // 125% resolution
                    newSamples = 4;
                    window.scene.skipPointerMovePicking = false;
                    window.scene.autoClear = true;
                    break;
                case 'ultra':
                    newScaling = 0.5; // 200% resolution
                    newSamples = 8;
                    window.scene.skipPointerMovePicking = false;
                    window.scene.autoClear = true;
                    break;
            }
            
            // Apply changes only if they're different
            if (newScaling !== window.currentRenderSettings.scaling) {
                engine.setHardwareScalingLevel(newScaling);
                window.currentRenderSettings.scaling = newScaling;
            }
            
            if (newSamples !== window.currentRenderSettings.samples) {
                engine.samples = newSamples;
                window.currentRenderSettings.samples = newSamples;
            }
            
            window.currentRenderSettings.renderQuality = settings.renderQuality;
            
            // Force a resize to apply the new scaling level
            engine.resize();
            
            console.log(`Render quality set to: ${settings.renderQuality}, Hardware scaling: ${engine.getHardwareScalingLevel()}`);
        }
    }
}

function applyFpsCounter(settings) {
    // Update FPS counter
    if (settings.showFpsCounter) {
        if (!window.fpsCounter) {
            // Create FPS counter
            const fpsDiv = document.createElement('div');
            fpsDiv.id = 'fps-counter';
            fpsDiv.style.cssText = 'position: fixed; top: 60px; right: 20px; background: rgba(0,23,40,0.9); color: #66d9ff; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; z-index: 1000; border: 1px solid #00cfff;';
            fpsDiv.textContent = 'FPS: 0';
            document.body.appendChild(fpsDiv);
            window.fpsCounter = fpsDiv;
        }
        
        // Show FPS counter
        window.fpsCounter.style.display = 'block';
        
        // Clear any existing interval
        if (window.fpsUpdateInterval) {
            clearInterval(window.fpsUpdateInterval);
            window.fpsUpdateInterval = null;
        }
        
        // Initialize custom FPS tracking
        if (!window.fpsTracker) {
            window.fpsTracker = {
                frameCount: 0,
                lastTime: performance.now(),
                currentFps: 0
            };
        }
        
        // Start FPS monitoring using custom frame counting
        window.fpsUpdateInterval = setInterval(() => {
            if (window.fpsCounter && window.fpsCounter.style.display !== 'none') {
                window.fpsCounter.textContent = `FPS: ${Math.round(window.fpsTracker.currentFps)}`;
            }
        }, 250); // Update display every 250ms for responsiveness
        
        // Hook into the render loop for accurate FPS counting
        if (window.scene && !window.fpsRenderObserver) {
            window.fpsRenderObserver = window.scene.onBeforeRenderObservable.add(() => {
                const now = performance.now();
                window.fpsTracker.frameCount++;
                
                // Calculate FPS every second
                if (now - window.fpsTracker.lastTime >= 1000) {
                    window.fpsTracker.currentFps = (window.fpsTracker.frameCount * 1000) / (now - window.fpsTracker.lastTime);
                    window.fpsTracker.frameCount = 0;
                    window.fpsTracker.lastTime = now;
                }
            });
        }
    } else if (window.fpsCounter) {
        window.fpsCounter.style.display = 'none';
        // Clear FPS update interval
        if (window.fpsUpdateInterval) {
            clearInterval(window.fpsUpdateInterval);
            window.fpsUpdateInterval = null;
        }
        // Clean up render observer
        if (window.fpsRenderObserver && window.scene) {
            window.scene.onBeforeRenderObservable.remove(window.fpsRenderObserver);
            window.fpsRenderObserver = null;
        }
    }
}

function applyFpsLimiting(settings) {
    // Update target FPS and performance settings
    if (window.scene && window.scene.getEngine) {
        const engine = window.scene.getEngine();
        
        // Apply target FPS limit
        if (settings.updateFrequency && settings.updateFrequency < 60) {
            // For lower FPS targets, introduce frame limiting
            if (!window.fpsLimiter) {
                window.fpsLimiter = {
                    targetInterval: 1000 / settings.updateFrequency,
                    lastFrame: 0
                };
                
                // Hook into render loop to limit FPS
                if (!window.fpsLimitObserver) {
                    window.fpsLimitObserver = window.scene.onBeforeRenderObservable.add(() => {
                        const now = performance.now();
                        if (now - window.fpsLimiter.lastFrame < window.fpsLimiter.targetInterval) {
                            return; // Skip this frame
                        }
                        window.fpsLimiter.lastFrame = now;
                    });
                }
            } else {
                window.fpsLimiter.targetInterval = 1000 / settings.updateFrequency;
            }
        } else {
            // Remove FPS limiting for higher targets
            if (window.fpsLimitObserver) {
                window.scene.onBeforeRenderObservable.remove(window.fpsLimitObserver);
                window.fpsLimitObserver = null;
                window.fpsLimiter = null;
            }
        }
        
        // Set adaptive quality based on target FPS
        if (settings.adaptiveQuality) {
            if (settings.updateFrequency >= 120) {
                // High FPS target - optimize for performance
                window.scene.particlesEnabled = false;
                window.scene.spritesEnabled = false;
                window.scene.lensFlaresEnabled = false;
            } else if (settings.updateFrequency <= 30) {
                // Low FPS target - enable all effects
                window.scene.particlesEnabled = true;
                window.scene.spritesEnabled = true;
                window.scene.lensFlaresEnabled = true;
            } else {
                // Medium FPS - balanced
                window.scene.particlesEnabled = true;
                window.scene.spritesEnabled = true;
                window.scene.lensFlaresEnabled = false;
            }
        }
        
        console.log(`Target FPS set to: ${settings.updateFrequency}, Adaptive quality: ${settings.adaptiveQuality}`);
    }
}

function applyVisualSettings(settings) {
    // Apply satellite visibility settings
    if (window.satelliteMeshes) {
        Object.values(window.satelliteMeshes).forEach(mesh => {
            if (mesh) {
                // Satellite scale
                const scale = settings.satelliteScale;
                mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
                
                // Satellite labels
                const labelControl = scene?.gui?.getControlByName(`${mesh.name}_label`);
                if (labelControl) {
                    labelControl.isVisible = settings.showSatelliteLabels;
                    const labelScale = settings.labelScale;
                    labelControl.scaleX = labelControl.scaleY = labelScale;
                }
                
                // Orbit paths visibility
                if (mesh.orbitPath) {
                    mesh.orbitPath.isVisible = settings.showOrbitPaths;
                }
            }
        });
    }
    
    // Apply ground station visibility
    if (window.groundStationMeshes) {
        Object.values(window.groundStationMeshes).forEach(mesh => {
            if (mesh) {
                mesh.isVisible = settings.showGroundStations;
            }
        });
    }
    
    // Apply Earth atmosphere effects
    if (window.earthMesh && settings.showEarthAtmosphere) {
        // Add atmosphere effect (this would require atmosphere shader implementation)
        console.log('Earth atmosphere effects:', settings.showEarthAtmosphere);
    }
}

function applyUnclassBanner(settings) {
    const banner = document.getElementById('unclass-banner');
    const timeDisplay = document.getElementById('time-display');
    const controlDock = document.getElementById('control-dock-container');
    const addTleButton = document.getElementById('add-tle-button');
    const notification = document.getElementById('leos-notification');
    const cyberrtsLogo = document.getElementById('cyberrts-logo-link');
    
    if (banner) {
        if (settings.applyUnclassBanner) {
            // Show banner
            banner.style.display = 'block';
            
            // Adjust time display position
            if (timeDisplay) {
                timeDisplay.style.top = '64px'; // 40px banner + 24px offset
            }
            
            // Adjust CyberRTS logo position
            if (cyberrtsLogo) {
                cyberrtsLogo.style.top = '52px'; // 40px banner + 12px offset
            }
            
            // Adjust control dock position  
            if (controlDock) {
                controlDock.style.top = '56px'; // 40px banner + 16px offset
            }
            
            // Adjust Add TLE button position
            if (addTleButton) {
                addTleButton.style.top = '60px'; // 40px banner + 20px offset
            }
            
            // Adjust notification position
            if (notification) {
                notification.style.top = '110px'; // 40px banner + 70px offset
            }
            
            // Store banner state for dynamic notifications
            window.unclassBannerActive = true;
            
            console.log('UNCLASSIFIED banner applied');
        } else {
            // Hide banner
            banner.style.display = 'none';
            
            // Reset time display position
            if (timeDisplay) {
                timeDisplay.style.top = '24px';
            }
            
            // Reset CyberRTS logo position
            if (cyberrtsLogo) {
                cyberrtsLogo.style.top = '12px';
            }
            
            // Reset control dock position
            if (controlDock) {
                controlDock.style.top = '16px';
            }
            
            // Reset Add TLE button position
            if (addTleButton) {
                addTleButton.style.top = '20px';
            }
            
            // Reset notification position
            if (notification) {
                notification.style.top = '70px';
            }
            
            // Clear banner state
            window.unclassBannerActive = false;
            
            console.log('UNCLASSIFIED banner removed');
        }
    }
}

function applyCameraSettings(settings) {
    if (window.camera) {
        // Camera sensitivity (affects rotation speed)
        if (window.camera.attachControl) {
            window.camera.angularSensibilityX = 1000 / settings.cameraSensitivity;
            window.camera.angularSensibilityY = 1000 / settings.cameraSensitivity;
        }
        
        // Zoom speed (affects wheel sensitivity)
        if (window.camera.wheelPrecision) {
            window.camera.wheelPrecision = 50 / settings.zoomSpeed;
        }
        
        // Smooth camera transitions
        window.smoothCameraEnabled = settings.smoothCamera;
        
        // Auto-follow satellite
        window.autoFollowEnabled = settings.autoFollowSatellite;
    }
}


window.showSimulationSettingsModal = function showSimulationSettingsModal() {
    // Initialize modal listeners if not done yet
    initializeSettingsModal();
    
    const modal = document.getElementById('simulation-settings-modal');
    if (!modal) return;
    
    // Initialize settings if not done yet
    if (!window.simulationSettings) {
        initializeSettingsModal();
    }
    
    
    // Update modal UI to reflect current settings
    const updateModalFromSettings = () => {
        const settings = window.simulationSettings;
        
        // Update all controls based on settings
        Object.keys(settings).forEach(key => {
            let elementId = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            
            // Handle special cases for field mapping
            if (key === 'timezone') {
                elementId = 'timezone-select';
            }
            
            const element = document.getElementById(elementId);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else if (element.type === 'range') {
                    element.value = settings[key];
                    element.dispatchEvent(new Event('input')); // Trigger value display update
                } else if (element.tagName === 'SELECT') {
                    element.value = settings[key];
                } else {
                    element.value = settings[key];
                }
            }
        });
    };
    
    // Update modal with current settings
    updateModalFromSettings();
    
    // Show the modal
    modal.style.display = 'flex';
}

async function loadSatelliteData() {
    try {
        // Initialize simulation time first to prevent null errors
        simulationStartTime = new Date();
        simulationTime = new Date(simulationStartTime);
        
        console.log('Loading satellite data using data loader...');
        
        // Load satellite data from static files instead of backend API
        const data = await dataLoader.loadSatelliteData();
        
        if (!data || !data.satellites) {
            console.error('No satellite data loaded, using fallback');
            // Create minimal fallback data
            orbitalElements = dataLoader.getFallbackSatelliteData().satellites;
        } else {
            // Store orbital elements for real-time calculation
            orbitalElements = data.satellites;
            console.log('Loaded orbital elements for satellites:', Object.keys(orbitalElements));
        }
        
        // Initialize simulation start time
        if (data && data.metadata && data.metadata.simulation_start) {
            simulationStartTime = new Date(data.metadata.simulation_start);
            simulationTime = new Date(simulationStartTime);
        }
        
        // Create a lightweight version of satelliteData for compatibility
        satelliteData = {
            metadata: {
                start_time: simulationStartTime.toISOString(),
                time_step_seconds: 5,
                total_time_steps: 17280 // For compatibility with UI
            }
        };
        
        // Add initial trajectory point for each satellite and load/generate telemetry
        for (const satName of Object.keys(orbitalElements)) {
            satelliteData[satName] = {
                trajectory: [{ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }]
            };
            
            // Try to load telemetry data, fallback to generated data
            let telemetry = await dataLoader.loadTelemetryData(satName);
            if (!telemetry || telemetry.length === 0) {
                console.log(`Generating mock telemetry for ${satName}`);
                telemetry = dataLoader.generateMockTelemetry(satName, orbitalElements[satName]);
            }
        }
        
        console.log('Creating satellites in scene...');
        // Create satellites using the imported module
        await createSatellites(scene, satelliteData, orbitalElements, activeSatellite, advancedTexture, simulationTime);
        
        console.log('Starting simulation loop with time:', simulationStartTime);
        simulationTime = startSimulationLoop(scene, satelliteData, orbitalElements, simulationStartTime, () => simState.timeMultiplier, advancedTexture, activeSatellite, getTelemetryData());
        
        // Ensure simulationTime is not null after starting the loop
        if (!simulationTime) {
            console.warn('simulationTime is null after starting loop, using current time');
            simulationTime = new Date();
        }
        
        console.log('Simulation initialized successfully with time:', simulationTime);

        // Initialize Red Orbit hybrid physics system
        await initializeHybridPhysics();
        
        // Don't create separate collision controls - using modal instead
        // createCollisionControls(scene);

    // --- Satellite orbital mechanics render loop synchronized with Earth rotation ---
    scene.onBeforeRenderObservable.add(() => {
      // Use the same simulation time as Earth rotation for perfect synchronization
      const currentSimTime = getCurrentSimTime();
      if (!currentSimTime) return; // Safety check
      
      // RED ORBIT physics is handled in the render loop, not here
      // This prevents double physics updates
      
      const meshes = getSatelliteMeshes();
      const telemetryObj = getTelemetryData();
      
      // If RED ORBIT physics is active, skip TLE updates
      if (redOrbitPhysics && redOrbitPhysics.initialized) {
        // Physics positions are handled by the physics engine in the render loop
        return;
      }
      
      // Otherwise, use normal TLE-based updates
      Object.entries(orbitalElements).forEach(([satName, elems]) => {
        const mesh = meshes[satName];
        if (!mesh || !elems) return;
        
        try {
          const epochTime = new Date(elems.epoch);
          
          // Calculate realistic orbital position using same time as Earth rotation
          const result = calculateSatellitePosition(elems, currentSimTime, epochTime);
          
          // Update mesh position with proper scaling
          const pos = toBabylonPosition(result.position);
          // Use copyFrom for better performance and to avoid breaking GLB hierarchy
          // This preserves any child mesh relative positions while updating orbital position
          if (mesh.position) {
            mesh.position.copyFrom(pos);
          } else {
            mesh.position = pos.clone();
          }
          
          // Generate synchronized telemetry data
          const baseTelemetry = generateRealTimeTelemetry(
            result.position,
            result.velocity,
            elems,
            satName
          );
          const detailed = getDetailedTelemetryForSatellite(satName);
          telemetryObj[satName] = { ...baseTelemetry, ...detailed };
          
        } catch (error) {
          // Silently handle individual satellite errors to prevent cascade failures
          console.warn(`Error updating satellite ${satName}:`, error);
        }
      });
    });

    } catch (error) {
        console.error('Error loading satellite data:', error);
    }
}

// All satellite related functions have been moved to satellites.js

// Removed all Brand UI functions since they've been moved

/**
 * Initialize SDA in the background without blocking the main app
 * This runs completely independently and won't affect app responsiveness
 */
function initSDAInBackground(scene) {
    // Use setTimeout to ensure this runs after the main thread is free
    setTimeout(() => {
        try {
            // Initialize SDA visualization with error handling
            initSDAVisualization(scene).then(controller => {
                sdaController = controller;
                window.sdaController = controller;
                
                // Setup SDA modal controls after initialization
                setupSDAModalControls();
                setupSDAToggleButton();
                
            }).catch(err => {
                // SDA is optional - app continues to work without it
                // In production, errors are silent but don't break the app
                setupSDAToggleButton(); // Still setup button for future attempts
            });
        } catch (err) {
            // Silent error handling for production builds
            setupSDAToggleButton(); // Still setup button for future attempts
        }
    }, 1000); // Small delay to ensure main app is fully loaded
}

/**
 * Setup SDA modal controls
 */
function setupSDAModalControls() {
    const sdaModal = document.getElementById('sda-welcome-modal');
    const sdaCloseBtn = document.getElementById('sda-modal-close');
    const sdaCloseBtnFooter = document.getElementById('sda-modal-close-footer');
    const sdaActivateBtn = document.getElementById('sda-activate-button');

    if (sdaCloseBtn) {
        sdaCloseBtn.addEventListener('click', () => {
            sdaModal.style.display = 'none';
            // Don't set localStorage - allow modal to show again
            // Hide Add TLE button when closing without activating
            const addTle = document.getElementById('add-tle-button');
            if (addTle) addTle.style.display = 'none';
        });
    }
    if (sdaCloseBtnFooter) {
        sdaCloseBtnFooter.addEventListener('click', () => {
            sdaModal.style.display = 'none';
            // Don't set localStorage - allow modal to show again
            // Hide Add TLE button when closing without activating
            const addTle = document.getElementById('add-tle-button');
            if (addTle) addTle.style.display = 'none';
        });
    }
    if (sdaActivateBtn) {
        sdaActivateBtn.addEventListener('click', () => {
            // Close modal and mark as seen
            sdaModal.style.display = 'none';
            localStorage.setItem('sda-welcome-seen', 'true');
            
            // Activate SDA using toggle() method to ensure proper initialization
            if (window.sdaController) {
                // If SDA is not already visible, toggle it on
                if (!window.sdaController.isVisible) {
                    window.sdaController.toggle();
                }
                const addTle = document.getElementById('add-tle-button');
                if (addTle) addTle.style.display = 'block';
            }
        });
    }
    // Close modal on background click
    if (sdaModal) {
        sdaModal.addEventListener('click', (e) => {
            if (e.target === sdaModal) {
                sdaModal.style.display = 'none';
                // Don't set localStorage - allow modal to show again
                // Hide Add TLE button when closing without activating
                const addTle = document.getElementById('add-tle-button');
                if (addTle) addTle.style.display = 'none';
            }
        });
    }
}

/**
 * Setup SDA toggle button
 */
function setupSDAToggleButton() {
    const sdaToggleBtn = document.getElementById('sda-toggle-btn');
    if (sdaToggleBtn) {
        sdaToggleBtn.addEventListener('click', () => {
            const hasSeenWelcome = localStorage.getItem('sda-welcome-seen') === 'true';
            const sdaModal = document.getElementById('sda-welcome-modal');
            
            if (!hasSeenWelcome) {
                // First time: show welcome modal
                if (sdaModal) sdaModal.style.display = 'flex';
            } else {
                // After first time: directly toggle SDA
                if (window.sdaController) {
                    window.sdaController.toggle();
                }
            }
        });
    }
}

/**
 * Initialize Red Orbit PURE physics system - NO HYBRID, REAL PHYSICS ONLY
 */
async function initializeHybridPhysics() {
    try {
        console.log('RED ORBIT: Initializing PURE physics engine - no more hybrid bullshit!');
        
        // Use GPU physics for massive scale!
        // createPhysicsEngine already calls initialize() internally
        redOrbitPhysics = await createPhysicsEngine(scene); // GPU ONLY!
        
        // Set initial 1x speed for physics engine (debugging ghost positions)
        redOrbitPhysics.physicsTimeMultiplier = 1;
        
        // Initialize Advanced Kessler System
        const advancedKessler = new AdvancedKesslerSystem(scene, redOrbitPhysics);
        
        // Initialize Kessler UI
        const kesslerUI = new KesslerUI();
        
        // Expose globally for UI access
        window.redOrbitPhysics = redOrbitPhysics;
        window.advancedKessler = advancedKessler;
        window.kesslerUI = kesslerUI;
        
        // Hide the original satellite meshes - physics engine creates its own
        const meshes = getSatelliteMeshes();
        Object.entries(meshes).forEach(([satName, mesh]) => {
            if (mesh) {
                mesh.isVisible = false; // Hide original meshes
                mesh.position = new BABYLON.Vector3(1000, 1000, 1000); // Move far away
            }
        });
        
        // Physics engine already populated space with satellites in populateSpace()
        // No need to create more - that was causing duplicates!
        
        // Expose for navigation controller
        window.redOrbitPhysics = redOrbitPhysics;
        
        // Set up interactive rogue placement system
        setupRoguePlacementSystem(scene, camera, redOrbitPhysics);
        
        console.log('RED ORBIT: Pure physics initialized with', redOrbitPhysics.bodies.size, 'satellites!');
        console.log('RED ORBIT: Ready to collide some shit!');
        
    } catch (error) {
        console.error('RED ORBIT: Failed to initialize pure physics:', error);
        // No fallback - we're all in on physics now!
    }
}

// Rogue Satellite Placement System
function setupRoguePlacementSystem(scene, camera, physics) {
    let placementMode = false;
    let placementCallback = null;
    let placementMarkers = [];
    let placementObserver = null;
    
    // Visual marker material for placement preview
    const markerMaterial = new BABYLON.StandardMaterial('roguePlacementMarker', scene);
    markerMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
    markerMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    markerMaterial.alpha = 0.8;
    
    // Enable placement mode
    window.enableRoguePlacement = function(callback) {
        placementMode = true;
        placementCallback = callback;
        
        // Remove old observer if exists
        if (placementObserver) {
            scene.onPointerObservable.remove(placementObserver);
        }
        
        // Add right-click handler to canvas
        placementObserver = scene.onPointerObservable.add((pointerInfo) => {
            if (!placementMode) return;
            
            // Check for right-click (button 2)
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && 
                pointerInfo.event.button === 2) {
                
                // Prevent context menu
                pointerInfo.event.preventDefault();
                
                const pickResult = scene.pick(scene.pointerX, scene.pointerY);
                
                if (pickResult.hit) {
                    // Get world position
                    const worldPos = pickResult.pickedPoint;
                    
                    // Convert Babylon coordinates to physics coordinates (km)
                    const physicsPos = {
                        x: worldPos.x * 6371, // Convert from Earth radius units to km
                        y: worldPos.y * 6371,
                        z: worldPos.z * 6371
                    };
                    
                    // Create visual marker at placement location
                    const marker = BABYLON.MeshBuilder.CreateSphere('rogueMarker', {
                        diameter: 0.02, // Small visible marker
                        segments: 8
                    }, scene);
                    marker.position = worldPos;
                    marker.material = markerMaterial;
                    placementMarkers.push(marker);
                    
                    // Notify callback with position
                    if (placementCallback) {
                        placementCallback(physicsPos);
                    }
                }
            }
        });
        
        // Disable context menu during placement mode
        const canvas = scene.getEngine().getRenderingCanvas();
        canvas.addEventListener('contextmenu', preventContextMenu);
    };
    
    // Prevent context menu function
    function preventContextMenu(e) {
        if (placementMode) {
            e.preventDefault();
            return false;
        }
    }
    
    // Disable placement mode
    window.disableRoguePlacement = function() {
        placementMode = false;
        placementCallback = null;
        
        // Remove observer
        if (placementObserver) {
            scene.onPointerObservable.remove(placementObserver);
            placementObserver = null;
        }
        
        // Re-enable context menu
        const canvas = scene.getEngine().getRenderingCanvas();
        canvas.removeEventListener('contextmenu', preventContextMenu);
    };
    
    // Clear placed markers
    window.clearPlacedRogues = function() {
        placementMarkers.forEach(marker => marker.dispose());
        placementMarkers = [];
    };
    
    // Launch rogues with specified velocities
    window.launchRogues = function(rogueData) {
        if (!physics || !physics.device) {
            console.error('[PLACEMENT] Physics not ready');
            return;
        }
        
        console.log(`[PLACEMENT] Launching ${rogueData.length} rogue satellites`);
        
        // For each placed rogue, create a high-velocity object for collision
        rogueData.forEach((rogue, index) => {
            // Pick specific indices near the beginning for visibility
            const targetIdx = 100 + index * 5; // Space them out for better visibility
            
            // Get position vector
            const px = rogue.position.x;
            const py = rogue.position.y;
            const pz = rogue.position.z;
            const r = Math.sqrt(px*px + py*py + pz*pz);
            
            // Calculate RETROGRADE orbital velocity (opposite to normal orbits)
            // This ensures head-on collisions with existing satellites
            const orbitalSpeed = Math.sqrt(398600.4418 / r); // km/s
            
            // Get tangential direction (perpendicular to radius)
            const radialUnit = { x: px/r, y: py/r, z: pz/r };
            
            // Cross product with Z-axis to get tangential direction
            let tangX = -py/r;
            let tangY = px/r;
            let tangZ = 0;
            
            // Normalize tangential vector
            const tangMag = Math.sqrt(tangX*tangX + tangY*tangY + tangZ*tangZ);
            if (tangMag > 0) {
                tangX /= tangMag;
                tangY /= tangMag;
                tangZ /= tangMag;
            }
            
            // Create RETROGRADE velocity (negative tangential) + extra speed for impact
            // Add user-specified velocity as extra collision speed
            const totalSpeed = orbitalSpeed + rogue.velocity;
            const vx = -tangX * totalSpeed; // Negative for retrograde
            const vy = -tangY * totalSpeed;
            const vz = -tangZ * totalSpeed;
            
            console.log(`[ROGUE ${index}] Position: (${px.toFixed(1)}, ${py.toFixed(1)}, ${pz.toFixed(1)}) km`);
            console.log(`[ROGUE ${index}] Velocity: ${totalSpeed.toFixed(1)} km/s retrograde`);
            
            // Create update data for this rogue
            const updateData = new Float32Array(8);
            updateData[0] = px;
            updateData[1] = py;
            updateData[2] = pz;
            updateData[3] = vx;
            updateData[4] = vy;
            updateData[5] = vz;
            updateData[6] = rogue.mass;
            updateData[7] = 5; // Type 5 = rogue (red color)
            
            // Write to GPU buffer
            if (physics.device && physics.stateBuffer) {
                physics.device.queue.writeBuffer(
                    physics.stateBuffer,
                    targetIdx * 32, // 8 floats * 4 bytes
                    updateData
                );
                console.log(`[ROGUE ${index}] Written to GPU buffer at index ${targetIdx}`);
            }
        });
        
        // Clear visual markers after launch
        window.clearPlacedRogues();
        
        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #00ff00, #00cc00);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            font-family: 'Orbitron', monospace;
            z-index: 10000;
            box-shadow: 0 0 50px rgba(0,255,0,0.8);
            text-transform: uppercase;
            letter-spacing: 2px;
        `;
        notification.textContent = `${rogueData.length} ROGUES LAUNCHED`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    };
}

/**
 * Create orbital zone visualizations (Van Allen belts, orbital regions)
 */
function createOrbitalZones(scene) {
    const zones = [];
    
    // Inner Van Allen Belt (1000-6000 km altitude)
    // Center at 3500 km altitude, spans 5000 km
    const innerBelt = BABYLON.MeshBuilder.CreateTorus('innerVanAllen', {
        diameter: 3.1, // (6371 + 3500) / 6371 * 2 = 3.1 Babylon units
        thickness: 0.78, // (6000 - 1000) / 6371 = 0.78 Babylon units
        tessellation: 64
    }, scene);
    innerBelt.position = BABYLON.Vector3.Zero();
    const innerBeltMat = new BABYLON.StandardMaterial('innerBeltMat', scene);
    innerBeltMat.diffuseColor = new BABYLON.Color3(1, 0.4, 0);
    innerBeltMat.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0);
    innerBeltMat.alpha = 0.05;
    innerBeltMat.backFaceCulling = false;
    innerBelt.material = innerBeltMat;
    innerBelt.isVisible = false;
    zones.push(innerBelt);
    
    // Outer Van Allen Belt (13000-60000 km altitude)
    // Center at 36500 km altitude, spans 47000 km - ENCOMPASSES GEO!
    const outerBelt = BABYLON.MeshBuilder.CreateTorus('outerVanAllen', {
        diameter: 13.45, // (6371 + 36500) / 6371 * 2 = 13.45 Babylon units
        thickness: 7.37, // (60000 - 13000) / 6371 = 7.37 Babylon units
        tessellation: 64
    }, scene);
    outerBelt.position = BABYLON.Vector3.Zero();
    const outerBeltMat = new BABYLON.StandardMaterial('outerBeltMat', scene);
    outerBeltMat.diffuseColor = new BABYLON.Color3(1, 0, 1);
    outerBeltMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0.5);
    outerBeltMat.alpha = 0.03;
    outerBeltMat.backFaceCulling = false;
    outerBelt.material = outerBeltMat;
    outerBelt.isVisible = false;
    zones.push(outerBelt);
    
    // Store zones globally for toggle
    window.orbitalZones = zones;
    
    // Toggle visibility with L key (handled in navigation-controller.js)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'l' || event.key === 'L') {
            zones.forEach(zone => {
                zone.isVisible = !zone.isVisible;
            });
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupTimeControls();
});
