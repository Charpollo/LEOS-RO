import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';

// Import UI components and manager
import './components/telemetry-card.js';
import './components/telemetry-item.js';
import { uiManager } from './ui/manager.js';
import { initBrandUI, hideLoadingScreen, showWelcomeModal, showHelpButton } from './ui/brand-ui.js';
import { createTelemetryItem } from './ui/template-manager.js';

// Import frontend-only data loader
import { dataLoader } from './data-loader.js';

// Import SDA visualization
import { initSDAVisualization, createTLEInputModal } from './sda-visualization.js';

// Import our modular components
import { EARTH_RADIUS_KM, EARTH_SCALE, MIN_LEO_ALTITUDE_KM, MOON_DISTANCE, MOON_SCALE, LOS_DEFAULT_KM, LOS_DEFAULT_BABYLON, calculateHorizonDistance } from './constants.js';
import { createSkybox } from './skybox.js';
import { createEarth } from './earth.js';
import { createMoon } from './moon.js';
import { createSatellites, getSatelliteMeshes, getTelemetryData, getDetailedTelemetryForSatellite } from './satellites.js';
import { updateTelemetryUI } from './telemetry.js';
import { startSimulationLoop, updateTimeDisplay, getCurrentSimTime } from './simulation.js';
import { setupKeyboardControls } from './controls.js';
import { createGroundStations, updateGroundStationsLOS, createCoverageCircles, getGroundStationMeshes, clearAutoLOSBeams, getGroundStationDefinitions, createTestConnection } from './groundStations.js';
import { initAuroraBackground, cleanupAuroraBackground } from './aurora-background.js';

// Import orbital mechanics functions
import { calculateSatellitePosition, toBabylonPosition, generateRealTimeTelemetry } from './orbital-mechanics.js';

// Globals
let engine;
let scene;
let camera;
let earthMesh;
let moonMesh;
let satelliteData = {};
let activeSatellite = null;
let isInitialized = false;
let sceneLoaded = false;
let advancedTexture; 
let sdaController; // SDA visualization controller

// Use a shared state object for timeMultiplier
const simState = {
    timeMultiplier: 0.1, // Slowed down for more appealing visualization
    lastTimeMultiplier: 0.1
};

// Orbital elements and real-time calculation data
let orbitalElements = {};
let simulationStartTime = new Date();
let simulationTime = new Date();
let sunDirection = new BABYLON.Vector3(1, 0, 0);

// Ground station dashboard state
let groundStationDashboardOpen = false;

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
    
    // Set up listener for LEOS dial buttons
    window.addEventListener('leos-dial-action', (event) => {
        const action = event.detail.action;
        handleDialAction(action);
    });
    
    // Create scene with performance optimizations and wait until ready
    await createScene();
    // Create ground stations and coverage circles
    createGroundStations(scene, advancedTexture);
    createCoverageCircles(scene, LOS_DEFAULT_KM, 128); // Use default LOS distance for fallback
    
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
     
     // Clear any existing automatic LOS beams
     clearAutoLOSBeams();
     
     // clear previous LOS lines
     currentLOS.forEach(line => {
       scene.onBeforeRenderObservable.remove(line.pulseObserver);
       line.dispose();
     });
     currentLOS = [];
      const station = event.detail;
      
      // Get station info including pre-calculated horizon distance
      const stationKey = station.name.replace(/\s+/g, '_');
      const groundStationMeshes = getGroundStationMeshes();
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
     // draw pulsing green LOS lines
     inView.forEach(name => {
       const mesh = satelliteMeshes[name];
       const satPos = mesh.absolutePosition || mesh.position;
       const line = BABYLON.MeshBuilder.CreateLines(`los_${stationKey}_${name}`, { points: [stationPos, satPos] }, scene);
       line.color = new BABYLON.Color3(0,1,0);
       const obs = scene.onBeforeRenderObservable.add(() => {
         const t = performance.now() * 0.005;
         const strength = 0.5 + 0.5 * Math.sin(t);
         line.color = new BABYLON.Color3(0, strength, 0);
       });
       line.pulseObserver = obs;
       currentLOS.push(line);
     });
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
        lastFrameTime = now;
        scene.render();
        
        if (scene.isReady() && !sceneLoaded) {
            // Delay hiding loading screen to ensure all SDA objects are loaded
            setTimeout(() => {
                hideLoadingScreen();
            }, 3000); // 3 second delay for smooth object loading
            
            // Initialize SDA visualization
            initSDAVisualization(scene).then(controller => {
                sdaController = controller;
                // Make available globally for keyboard shortcuts
                window.sdaController = controller;
                console.log("SDA visualization initialized");

                // After binding SDA button behavior, set up modal controls
                const sdaModal = document.getElementById('sda-welcome-modal');
                const sdaCloseBtn = document.getElementById('sda-modal-close');
                const sdaCloseBtnFooter = document.getElementById('sda-modal-close-footer');
                const sdaActivateBtn = document.getElementById('sda-activate-button');

                if (sdaCloseBtn) {
                    sdaCloseBtn.addEventListener('click', () => {
                        sdaModal.style.display = 'none';
                        localStorage.setItem('sda-welcome-seen', 'true');
                    });
                }
                if (sdaCloseBtnFooter) {
                    sdaCloseBtnFooter.addEventListener('click', () => {
                        sdaModal.style.display = 'none';
                        localStorage.setItem('sda-welcome-seen', 'true');
                    });
                }
                if (sdaActivateBtn) {
                    sdaActivateBtn.addEventListener('click', () => {
                        console.log('SDA Activate Button clicked');
                        // Close modal and mark as seen
                        sdaModal.style.display = 'none';
                        localStorage.setItem('sda-welcome-seen', 'true');
                        
                        // Activate SDA (turn it on)
                        if (window.sdaController) {
                            // Force SDA to be visible
                            window.sdaController.setVisible(true);
                            // Update Add TLE button
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
                            localStorage.setItem('sda-welcome-seen', 'true');
                        }
                    });
                }
                // Bind click on SDA toggle button to invoke welcome modal or toggle
                const sdaToggleBtn = document.getElementById('sda-toggle-btn');
                if (sdaToggleBtn) {
                    sdaToggleBtn.addEventListener('click', () => {
                        console.log('SDA Toggle Button clicked');
                        const hasSeenWelcome = localStorage.getItem('sda-welcome-seen') === 'true';
                        
                        if (!hasSeenWelcome) {
                            // First time: show welcome modal
                            console.log('Showing welcome modal for first time');
                            if (sdaModal) sdaModal.style.display = 'flex';
                        } else {
                            // After first time: simply toggle SDA on/off
                            console.log('Toggling SDA overlay');
                            if (window.sdaController) {
                                const active = window.sdaController.toggle();
                                console.log('SDA is now:', active ? 'ON' : 'OFF');
                                // Update Add TLE button visibility
                                const addTleBtn = document.getElementById('add-tle-button');
                                if (addTleBtn) addTleBtn.style.display = active ? 'block' : 'none';
                            }
                        }
                    });
                }
            }).catch(err => {
                console.error("Failed to initialize SDA visualization:", err);
            });
            
            // Add event listener for the Add TLE button
            const addTleBtn = document.getElementById('add-tle-button');
            if (addTleBtn) {
                addTleBtn.addEventListener('click', () => {
                    showNotification('Coming Soon! TLE import functionality will be available in a future update.');
                });
            }
            
            sceneLoaded = true;
            // Show help button now that simulation is loaded
            showHelpButton();
            // Initialize keyboard controls once the scene is loaded
            setupKeyboardControls(
                camera,
                (v) => { simState.lastTimeMultiplier = simState.timeMultiplier; simState.timeMultiplier = v; },
                () => simState.timeMultiplier
            );
            
            // Show welcome modal after a slight delay
            setTimeout(() => {
                showWelcomeModal();
            }, 500);
        }
        // Only update automatic LOS beams when ground station dashboard is NOT open
        if (!groundStationDashboardOpen) {
            updateGroundStationsLOS(scene);
        }
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
        // Focus camera on selected satellite
        const satMesh = getSatelliteMeshes()[activeSatellite];
        if (camera && satMesh) {
            camera.setTarget(satMesh.position);
            // compute azimuth so camera looks straight down on satellite
            const pos = satMesh.position;
            const azimuth = Math.atan2(pos.z, pos.x) + Math.PI/2;
            camera.alpha = azimuth;
            
            // Adjust camera position based on whether this is a label click
            const isLabelClick = event.detail.source === 'label';
            const minR = camera.lowerRadiusLimit;
            const currentR = camera.radius;
            let targetR;
            
            if (isLabelClick) {
                // For label clicks, use a safer distance to prevent going inside Earth
                const safeDistance = EARTH_RADIUS_KM * EARTH_SCALE * 2.5;
                const distanceToSat = BABYLON.Vector3.Distance(BABYLON.Vector3.Zero(), satMesh.position);
                targetR = Math.max(safeDistance, distanceToSat * 1.1); // 10% farther than the satellite
                camera.beta = 0.4; // Less steep angle to see more context around the satellite
            } else {
                // For satellite mesh clicks, closer view but still safe
                camera.beta = 0.2;  // near-top-down angle
                targetR = Math.max(minR * 1.2, currentR * 0.5); // Stay at least 20% away from minimum limit
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
    
    // Create camera with optimized settings first (before any rendering pipelines)
    camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 20, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.01;
    camera.maxZ = 10000;
    camera.lowerRadiusLimit = EARTH_RADIUS_KM * EARTH_SCALE * 1.05; // Increased safety margin to prevent going inside Earth
    camera.upperRadiusLimit = EARTH_RADIUS_KM * EARTH_SCALE * 100; // Allow zoom far out
    camera.useAutoRotationBehavior = false;
    camera.inertia = 0.7; // Slightly higher for smoother movement
    camera.wheelDeltaPercentage = 0.04; // Smoother zoom
    
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
            const minSafeDistance = EARTH_RADIUS_KM * EARTH_SCALE * 1.05; // Safe distance threshold
            
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
    
    // Then create Earth and Moon
    earthMesh = await createEarth(scene, () => simState.timeMultiplier, sunDirection);
    moonMesh = await createMoon(scene, () => simState.timeMultiplier);
    // Create ground stations and coverage circles
    createGroundStations(scene, advancedTexture);
    createCoverageCircles(scene, LOS_DEFAULT_KM, 128); // Use default LOS distance for fallback
    
    // Finally load satellite data
    await loadSatelliteData();
    
    // Add test connection for debugging LOS system
    createTestConnection(scene);
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
    previewCamera.lowerRadiusLimit = 0.5; // Prevent getting too close to avoid clipping
    previewCamera.upperRadiusLimit = 15; // Allow more zoom out
    previewCamera.minZ = 0.01; // Better near clipping plane
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
    hemisphericLight.intensity = 1.2; // Increased base intensity for better visibility
    hemisphericLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
    hemisphericLight.specular = new BABYLON.Color3(0.15, 0.15, 0.2); // Lower specular to reduce reflective "static"
    
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
            : 'assets/bulldog_sat.glb';
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
            
            // Check for and start any built-in animations (solar panels, thrusters, etc.)
            console.log(`Checking for animations in ${modelFile}...`);
            console.log(`Animation groups found:`, result.animationGroups ? result.animationGroups.length : 0);
            console.log(`Scene animation groups total:`, previewScene.animationGroups.length);
            
            // Removed verbose animation and mesh loading logs
            // if there are animationGroups, start them silently
            if (result.animationGroups && result.animationGroups.length > 0) {
                result.animationGroups.forEach((animationGroup) => {
                    try {
                        animationGroup.start(true, 1.0);
                    } catch (error) {
                        console.error(`Failed to start animation ${animationGroup.name}:`, error);
                    }
                });
            }
            
            // Don't reparent individual meshes - let GLB maintain its own hierarchy
            console.log(`Loaded ${result.meshes.length} meshes for ${satName}:`, result.meshes.map(m => m.name));
            
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
                previewCamera.radius = 5.0; // Zoomed-out viewing distance for BULLDOG
                previewCamera.beta = Math.PI/3; // Better initial angle for viewing
                // Removed the 180-degree rotation that was causing floating pieces
            }
            previewMesh.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            
            // Center the model on origin with better positioning
            const boundingInfo = previewMesh.getBoundingInfo();
            const center = boundingInfo.boundingBox.center;
            // Adjust the Y position to center the satellite better in view
            const adjustedCenter = center.clone();
            if (satName.toUpperCase().includes('CRTS')) {
                adjustedCenter.y += 0.4; // Move CRTS more down for better centering
            }
            previewMesh.position = adjustedCenter.negate();
            
            // Add smooth auto-rotation animation with proper cleanup
            const rotationObserver = previewScene.onBeforeRenderObservable.add(() => {
                if (previewMesh && previewMesh.rotation) {
                    previewMesh.rotation.y += 0.002; // Much slower rotation for better viewing
                }
            });
            
            // Store the observer for cleanup
            previewMesh.userData = { rotationObserver };
            
            // Add enhanced lighting for better model visibility with reduced reflections
            const pointLight = new BABYLON.PointLight("modelSpotlight", 
                new BABYLON.Vector3(4, 3, 4), previewScene);
            pointLight.intensity = satName.toUpperCase().includes('CRTS') ? 2.5 : 1.2; // Much brighter lighting for CRTS
            pointLight.diffuse = new BABYLON.Color3(1.0, 1.0, 1.0);
            pointLight.specular = new BABYLON.Color3(0.2, 0.2, 0.3); // Lower specular to reduce static-like reflections
            
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
 * Shows a temporary notification message in the UI
 * @param {string} message - The message to display
 * @param {number} duration - Time in milliseconds to show the notification (default: 3000ms)
 */
function showNotification(message, duration = 3000) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('leos-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'leos-notification';
        notification.style.cssText = `
            position: absolute;
            top: 70px; /* Position below the time display which is at 24px */
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

    // --- New: Drive satellite meshes by SDA orbital logic in render loop ---
    scene.onBeforeRenderObservable.add(() => {
      const currentSimTime = getCurrentSimTime();
      const meshes = getSatelliteMeshes();
      const telemetryObj = getTelemetryData();
      Object.entries(orbitalElements).forEach(([satName, elems]) => {
        const mesh = meshes[satName];
        if (!mesh) return;
        const epochTime = new Date(elems.epoch);
        // calculate position & velocity
        const result = calculateSatellitePosition(elems, currentSimTime, epochTime);
        // update mesh position
        const pos = toBabylonPosition(result.position);
        mesh.position.copyFrom(pos);
        // --- new telemetry merge ---
        const baseTelemetry = generateRealTimeTelemetry(
          result.position,
          result.velocity,
          elems,
          satName
        );
        const detailed = getDetailedTelemetryForSatellite(satName);
        telemetryObj[satName] = { ...baseTelemetry, ...detailed };
      });
    });

    } catch (error) {
        console.error('Error loading satellite data:', error);
    }
}

// All satellite related functions have been moved to satellites.js

// Removed all Brand UI functions since they've been moved

window.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupTimeControls();
});
