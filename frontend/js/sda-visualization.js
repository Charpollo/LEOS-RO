import * as BABYLON from '@babylonjs/core';
import { EARTH_RADIUS, EARTH_SCALE, EARTH_VISUAL_SURFACE_RADIUS, EARTH_CORE_RADIUS } from './constants.js';
import { calculateSatellitePosition, toBabylonPosition } from './orbital-mechanics.js';
import * as satellite from 'satellite.js';

// SDA Visualization Module - Optimized for 58K+ objects with performance enhancements
class SDAVisualization {
  constructor() {
    this.isVisible = false;
    this.scene = null;
    this.tleData = [];
    this.objectData = {};
    this.tooltip = null;
    this.updateIndex = 0;
    this.objectKeys = [];
    this.isInitialized = false;
    
    // Performance optimization structures
    this.masterMesh = null;
    this.instancedMeshes = {}; // One per orbit class
    this.instanceMatrices = {}; // Matrices for thin instances
    this.originalMatrices = {}; // Backup of original matrices for restoration
    this.instanceColors = {}; // Colors for thin instances
    this.objectInstances = {}; // Map object IDs to instance indices
    this.maxInstancesPerClass = 20000; // Maximum instances per class
    this.updateBatchSize = 200; // Objects to update per frame
    
    // Color coding for different orbit classes - BRIGHT for visibility
    this.COLORS = {
      LEO: new BABYLON.Color3(0.2, 1, 1),     // Bright Cyan
      MEO: new BABYLON.Color3(1, 1, 0.2),     // Bright Yellow  
      GEO: new BABYLON.Color3(1, 0.2, 0.2),   // Bright Red
      HEO: new BABYLON.Color3(1, 0.2, 1),     // Bright Purple
      DEBRIS: new BABYLON.Color3(1, 0.5, 0.2), // Orange for debris
      REAL: new BABYLON.Color3(1, 1, 1)       // White for real NORAD satellites
    };
    
    // Frustum culling optimization
    this.frustumCulling = true;
    this.lastCameraPosition = new BABYLON.Vector3(0, 0, 0);
    this.cameraMovementThreshold = 0.1;
  }

  async initialize(scene) {
    this.scene = scene;
    this.isInitialized = false;
    
    // Defer heavy initialization until first activation
    this.scene = scene;
    
    // Set up UI interactions
    this.setupUI();
    
    // Initially hidden
    this.setVisible(false);
    
    return this;
  }

  setupUI() {
    // Set up UI event handlers and interactions
    this.setupToggleHandlers();
    this.setupDataBrowser();
    console.log('SDA UI setup completed');
  }

  setupToggleHandlers() {
    // Set up orbit class toggle functionality
    document.addEventListener('click', (event) => {
      if (event.target.closest('.sda-toggle')) {
        const toggle = event.target.closest('.sda-toggle');
        const orbitClass = toggle.dataset.toggle;
        this.toggleOrbitClass(orbitClass, toggle);
      }
    });
  }

  toggleOrbitClass(orbitClass, toggleElement) {
    const isActive = toggleElement.classList.contains('active');
    
    // Handle data source toggles (REAL and SIMULATED)
    if (orbitClass === 'REAL' || orbitClass === 'SIMULATED') {
      this.toggleDataSource(orbitClass, toggleElement);
      return;
    }
    
    if (isActive) {
      // Disable orbit class
      toggleElement.classList.remove('active');
      this.hideOrbitClass(orbitClass);
    } else {
      // Enable orbit class
      toggleElement.classList.add('active');
      this.showOrbitClass(orbitClass);
    }
    
    console.log(`Toggled ${orbitClass} visibility: ${!isActive}`);
  }

  toggleDataSource(sourceType, toggleElement) {
    const isActive = toggleElement.classList.contains('active');
    
    if (isActive) {
      toggleElement.classList.remove('active');
      this.hideDataSource(sourceType);
    } else {
      toggleElement.classList.add('active');
      this.showDataSource(sourceType);
    }
    
    console.log(`Toggled ${sourceType} data source visibility: ${!isActive}`);
  }

  hideDataSource(sourceType) {
    // Hide all satellites of specified source type
    Object.keys(this.instancedMeshes).forEach(orbitClass => {
      if (this.instancedMeshes[orbitClass]) {
        // This is a simplified approach - in full implementation,
        // we'd need to track which instances are real vs simulated
        // For now, we'll update the thin instances to hide specific source types
        this.updateInstanceVisibilityBySource(orbitClass, sourceType, false);
      }
    });
  }

  showDataSource(sourceType) {
    // Show all satellites of specified source type
    Object.keys(this.instancedMeshes).forEach(orbitClass => {
      if (this.instancedMeshes[orbitClass]) {
        this.updateInstanceVisibilityBySource(orbitClass, sourceType, true);
      }
    });
  }

  updateInstanceVisibilityBySource(orbitClass, sourceType, visible) {
    // Get the mesh for this orbit class
    const mesh = this.instancedMeshes[orbitClass];
    if (!mesh) return;
    
    console.log(`🔄 Updating ${sourceType} visibility in ${orbitClass} class: ${visible ? 'show' : 'hide'}`);
    
    // Get the current matrices for this orbit class
    const matrices = this.instanceMatrices[orbitClass];
    if (!matrices) {
      console.warn(`No matrices found for ${orbitClass}`);
      return;
    }
    
    // Find satellites in this orbit class that match the source type
    const satellitesInClass = Object.values(this.objectData).filter(sat => sat.meshClass === orbitClass);
    let modifiedCount = 0;
    
    for (const satellite of satellitesInClass) {
      const isRealSatellite = satellite.isReal && satellite.source === 'NORAD';
      const shouldShow = (sourceType === 'REAL' && isRealSatellite) || 
                        (sourceType === 'SIMULATED' && !isRealSatellite);
      
      if (shouldShow) {
        const instanceIndex = satellite.instanceIndex;
        if (instanceIndex !== undefined && instanceIndex >= 0) {
          const matrixOffset = instanceIndex * 16;
          
          if (visible) {
            // Restore from original matrices
            const originalMatrices = this.originalMatrices[orbitClass];
            if (originalMatrices) {
              console.log(`🔄 Restoring satellite ${satellite.name} in ${orbitClass} (instance ${instanceIndex})`);
              for (let i = 0; i < 16; i++) {
                matrices[matrixOffset + i] = originalMatrices[matrixOffset + i];
              }
              // Verify restoration worked
              const scale = matrices[matrixOffset + 0];
              console.log(`   Scale after restoration: ${scale}`);
            } else {
              console.warn(`❌ No original matrices found for ${orbitClass} - cannot restore satellite ${satellite.name}`);
            }
            // Mark satellite as visible for tooltip system
            satellite.isVisibleInScene = true;
          } else {
            // Hide by scaling to zero but preserve position data for tooltips
            console.log(`🫥 Hiding satellite ${satellite.name} in ${orbitClass} (instance ${instanceIndex})`);
            matrices[matrixOffset + 0] = 0.0;  // X scale = 0
            matrices[matrixOffset + 5] = 0.0;  // Y scale = 0
            matrices[matrixOffset + 10] = 0.0; // Z scale = 0
            // Mark satellite as hidden but keep position data intact
            satellite.isVisibleInScene = false;
          }
          modifiedCount++;
        }
      }
    }
    
    // Update the mesh with modified matrices
    if (modifiedCount > 0) {
      // Ensure the orbit class mesh is enabled when showing satellites
      if (visible && !mesh.isEnabled()) {
        console.log(`🔄 Re-enabling ${orbitClass} mesh for data source restoration`);
        mesh.setEnabled(true);
        mesh.isVisible = true;
        
        // Also update the orbit class toggle UI to reflect this
        const orbitToggle = document.querySelector(`.sda-toggle[data-toggle="${orbitClass}"]`);
        if (orbitToggle && !orbitToggle.classList.contains('active')) {
          orbitToggle.classList.add('active');
          console.log(`🔄 Re-activated ${orbitClass} orbit class toggle`);
        }
      }
      
      mesh.thinInstanceSetBuffer("matrix", matrices, 16);
      
      // Force refresh thin instance picking system after matrix updates
      try {
        mesh.thinInstanceEnablePicking = false;
        mesh.thinInstanceEnablePicking = true;
        console.log(`🔄 Refreshed thin instance picking for ${orbitClass}`);
      } catch (error) {
        console.warn(`Failed to refresh picking for ${orbitClass}:`, error);
      }
      
      console.log(`📊 ${visible ? 'Showed' : 'Hid'} ${modifiedCount} ${sourceType} satellites in ${orbitClass} class`);
    }
  }

  hideOrbitClass(orbitClass) {
    if (this.instancedMeshes[orbitClass]) {
      this.instancedMeshes[orbitClass].setEnabled(false);
      console.log(`✓ Hidden ${orbitClass} mesh (${Object.keys(this.instancedMeshes[orbitClass].thinInstancesOfMesh || {}).length} instances)`);
    } else {
      console.log(`⚠️ No mesh found for ${orbitClass} class`);
    }
  }

  showOrbitClass(orbitClass) {
    if (this.instancedMeshes[orbitClass]) {
      this.instancedMeshes[orbitClass].setEnabled(true);
      console.log(`✓ Shown ${orbitClass} mesh`);
    } else {
      console.log(`⚠️ No mesh found for ${orbitClass} class`);
    }
  }

  setupDataBrowser() {
    // Set up data browser functionality
    const searchInput = document.getElementById('sda-search-input');
    const filterSelect = document.getElementById('sda-filter-select');
    
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterDataList());
    }
    
    if (filterSelect) {
      filterSelect.addEventListener('change', () => this.filterDataList());
    }
  }

  setVisible(visible) {
    this.isVisible = visible;
    if (this.mesh) {
      this.mesh.setEnabled(visible);
    }
    
    // Update UI elements visibility
    const sdaLegend = document.getElementById('sda-legend');
    const sdaDataBrowser = document.getElementById('sda-data-browser');
    const addTleButton = document.getElementById('add-tle-button');
    
    if (sdaLegend) {
      if (visible) {
        sdaLegend.style.display = 'block';
        sdaLegend.classList.add('visible');
      } else {
        sdaLegend.style.display = 'none';
        sdaLegend.classList.remove('visible');
      }
    }
    
    if (sdaDataBrowser) {
      if (visible) {
        sdaDataBrowser.style.display = 'flex';
        sdaDataBrowser.classList.add('visible');
        // Populate data browser when first shown
        if (!this.dataBrowserPopulated || !this.dataArray) {
          setTimeout(() => {
            this.populateDataBrowser();
            this.dataBrowserPopulated = true;
          }, 100); // Small delay to ensure objects are created
        }
      } else {
        sdaDataBrowser.style.display = 'none';
        sdaDataBrowser.classList.remove('visible');
      }
    }
    
    if (addTleButton) {
      addTleButton.style.display = visible ? 'block' : 'none';
    }
    
    console.log(`SDA visualization visibility set to: ${visible}`);
  }

  toggle() {
    const newVisibility = !this.isVisible;
    this.setVisible(newVisibility);
    
    // Lazy initialize if needed and becoming visible
    if (newVisibility && !this.isInitialized) {
      this.lazyInitialize().catch(error => {
        console.error('Failed to lazy initialize SDA:', error);
      });
    }
    
    console.log(`SDA visualization toggled to: ${newVisibility}`);
    return newVisibility;
  }

  getColorHex(orbitClass) {
    const color = this.COLORS[orbitClass] || this.COLORS.LEO;
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  positionToBabylon(position) {
    // Convert orbital position to Babylon.js coordinate system
    // Position should have x, y, z in kilometers
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      return null;
    }

    // Scale from kilometers to Babylon units
    // EARTH_SCALE is already 1/6371, so we use it directly
    const scaleFactor = EARTH_SCALE;
    
    return new BABYLON.Vector3(
      position.x * scaleFactor,
      position.z * scaleFactor,  // Swap Y and Z for Babylon coordinate system
      position.y * scaleFactor
    );
  }

  async lazyInitialize() {
    if (this.isInitialized) return;
    
    console.log('Lazy initializing SDA visualization...');
    
    // Show loading indicator
    this.showLoadingIndicator();
    
    // Load TLE data first
    await this.loadTLEData();
    
    // Create the visualization system progressively
    await this.createParticleSystemProgressive();
    
    this.isInitialized = true;
    
    // Hide loading indicator
    this.hideLoadingIndicator();
  }

  showLoadingIndicator() {
    let loadingDiv = document.getElementById('sda-loading');
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.id = 'sda-loading';
      loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: #00cfff;
        padding: 25px;
        border-radius: 10px;
        font-family: 'Orbitron', monospace;
        font-size: 16px;
        z-index: 10000;
        border: 2px solid #00cfff;
        box-shadow: 0 0 20px rgba(0, 207, 255, 0.3);
      `;
      loadingDiv.innerHTML = `
        <div>Loading Comprehensive Space Catalog...</div>
        <div style="margin-top: 5px; font-size: 14px; color: #66d9ff;">41,000+ Objects - Real NORAD Format Data</div>
        <div id="sda-loading-progress" style="margin-top: 10px; font-weight: bold;">0 / 41000 objects loaded</div>
      `;
      document.body.appendChild(loadingDiv);
    }
    loadingDiv.style.display = 'block';
  }

  hideLoadingIndicator() {
    const loadingDiv = document.getElementById('sda-loading');
    if (loadingDiv) {
      loadingDiv.style.display = 'none';
    }
  }

  showDataModeDisclaimer(mode, realCount, totalCount) {
    const modeMessages = {
      'real': {
        color: 'rgba(0, 255, 100, 0.95)',
        border: '#00ff64',
        title: '✅ REAL CELESTRAK DATA - BETA',
        message: `🚧 BETA VERSION: Displaying ${totalCount.toLocaleString()} real satellites from Celestrak NORAD catalog (data from 1 week ago). This is a demonstration of real satellite positions, not live real-time data. Full real-time API integration coming soon.`,
        shadow: 'rgba(0, 255, 100, 0.4)'
      },
      'hybrid': {
        color: 'rgba(255, 200, 0, 0.95)',
        border: '#ffc800',
        title: '🔄 HYBRID DATA MODE - BETA',
        message: `🚧 BETA VERSION: Combining ${realCount.toLocaleString()} real Celestrak satellites (1 week old data) with ${(totalCount - realCount).toLocaleString()} simulated objects for visualization demonstration. NOT real-time data. Live streaming will be added in future updates.`,
        shadow: 'rgba(255, 200, 0, 0.4)'
      },
      'static': {
        color: 'rgba(255, 140, 0, 0.95)',
        border: '#ff8c00',
        title: '⚠️ SIMULATION MODE - BETA',
        message: `🚧 BETA VERSION: Displaying ${totalCount.toLocaleString()} simulated space objects for comprehensive visualization demonstration. This is NOT real satellite data. Real-time Celestrak API integration is planned for future releases.`,
        shadow: 'rgba(255, 140, 0, 0.4)'
      }
    };
    
    const config = modeMessages[mode];
    console.warn(`${config.title}: ${config.message}`);
    
    // Create disclaimer overlay
    let disclaimerDiv = document.getElementById('sda-data-disclaimer');
    if (disclaimerDiv) {
      disclaimerDiv.remove(); // Remove existing disclaimer
    }
    
    disclaimerDiv = document.createElement('div');
    disclaimerDiv.id = 'sda-data-disclaimer';
    disclaimerDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${config.color};
      color: #ffffff;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: 'Orbitron', monospace;
      font-size: 12px;
      z-index: 9999;
      border: 2px solid ${config.border};
      box-shadow: 0 0 15px ${config.shadow};
      max-width: 320px;
      line-height: 1.4;
    `;
    disclaimerDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #fff;">${config.title}</div>
      <div>${config.message}</div>
      <div style="margin-top: 8px; font-size: 10px; opacity: 0.8;">Click to dismiss</div>
    `;
    
    // Auto-dismiss after 12 seconds or on click
    disclaimerDiv.addEventListener('click', () => {
      disclaimerDiv.style.display = 'none';
    });
    
    setTimeout(() => {
      if (disclaimerDiv) {
        disclaimerDiv.style.opacity = '0.7';
      }
    }, 12000);
    
    document.body.appendChild(disclaimerDiv);
  }

  async createParticleSystemProgressive() {
    // Clean up existing system
    this.cleanupExistingSystem();

    if (this.tleData.length === 0) {
      console.warn('No TLE data available for visualization');
      return;
    }

    // Create parent node for all SDA objects
    this.mesh = new BABYLON.TransformNode("sdaObjects", this.scene);
    
    // Create shared materials for better performance
    this.createSharedMaterials();
    
    // Create thin instances for massive performance improvement
    await this.createThinInstances();
    
    // Set up update loop
    this.scene.registerBeforeRender(() => {
      if (this.isVisible && this.isInitialized) {
        this.updateThinInstances();
      }
    });
    
    // Set up mouse interaction
    this.setupMouseInteraction();
  }

  setupMouseInteraction() {
    // Set up click and hover interactions for satellite selection
    if (!this.scene) return;
    
    // Mouse click handler for satellite selection
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh) {
        const pickedMesh = pointerInfo.pickInfo.pickedMesh;
        
        // Check if it's one of our SDA meshes
        if (pickedMesh.name && pickedMesh.name.startsWith('sda_master_')) {
          const instanceId = pointerInfo.pickInfo.instanceIndex;
          console.log(`Click on SDA mesh: ${pickedMesh.name}, instance: ${instanceId}`);
          if (instanceId !== null && instanceId !== undefined) {
            this.handleSatelliteClick(pickedMesh, instanceId, pointerInfo.pickInfo.pickedPoint);
          }
        }
      }
    }, BABYLON.PointerEventTypes.POINTERDOWN);

    // Alternative hover approach using canvas events
    this.setupCanvasHoverEvents();
    
    console.log('SDA mouse interaction setup completed');
  }

  setupCanvasHoverEvents() {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    // Throttle hover events for performance
    let hoverTimeout = null;
    
    canvas.addEventListener('mousemove', (event) => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      
      hoverTimeout = setTimeout(() => {
        this.handleCanvasHover(event);
      }, 16); // Throttle to ~60fps for better responsiveness
    });

    canvas.addEventListener('mouseleave', () => {
      this.hideSatelliteTooltip();
    });
  }

  handleCanvasHover(event) {
    // Skip if SDA not visible
    if (!this.isVisible || !this.isInitialized) return;
    
    // Get pick info at mouse position
    const pickInfo = this.scene.pick(event.offsetX, event.offsetY);
    
    // Debug log every 100th hover to avoid spam
    if (Math.random() < 0.01) {
      console.log('Hover check:', { visible: this.isVisible, initialized: this.isInitialized, hit: pickInfo?.hit, mesh: pickInfo?.pickedMesh?.name });
    }
    
    if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
      const pickedMesh = pickInfo.pickedMesh;
      
      // Debug: Log all mesh interactions
      console.log(`Mouse over mesh: ${pickedMesh.name}, hit: ${pickInfo.hit}`);
      
      // Check if it's one of our SDA meshes
      if (pickedMesh.name && pickedMesh.name.startsWith('sda_master_')) {
        const instanceId = pickInfo.instanceIndex;
        console.log(`🎯 Canvas hover on SDA mesh: ${pickedMesh.name}`);
        console.log(`   Instance ID: ${instanceId} (type: ${typeof instanceId})`);
        console.log(`   Thin instance picking enabled: ${pickedMesh.thinInstanceEnablePicking}`);
        console.log(`   Mesh enabled: ${pickedMesh.isEnabled()}, visible: ${pickedMesh.isVisible}`);
        
        if (instanceId !== null && instanceId !== undefined && instanceId >= 0) {
          console.log(`✓ Valid instance found - showing tooltip for instance ${instanceId}`);
          this.showSatelliteHoverTooltip(pickedMesh, instanceId, event);
        } else {
          // Thin instance picking failed - try to find closest satellite
          console.log(`❌ Instance picking failed for ${pickedMesh.name} (instanceId: ${instanceId}), trying fallback`);
          this.showClosestSatelliteTooltip(pickedMesh, pickInfo.pickedPoint, event);
        }
      } else {
        this.hideSatelliteTooltip();
      }
    } else {
      this.hideSatelliteTooltip();
    }
  }

  showClosestSatelliteTooltip(mesh, pickedPoint, event) {
    // Find the actual closest satellite to the picked point in 3D space
    const orbitClass = mesh.name.replace('sda_master_', '');
    
    // Find satellites in this orbit class that are currently visible
    const satellitesInClass = Object.values(this.objectData).filter(sat => {
      if (sat.meshClass !== orbitClass) return false;
      if (sat.isVisibleInScene === false) return false;
      
      // Check if satellite should be visible based on data source toggles
      const isRealSatellite = sat.isReal && sat.source === 'NORAD';
      const realToggle = document.querySelector('.sda-toggle[data-toggle="REAL"]');
      const simulatedToggle = document.querySelector('.sda-toggle[data-toggle="SIMULATED"]');
      
      const isRealToggleActive = realToggle && realToggle.classList.contains('active');
      const isSimulatedToggleActive = simulatedToggle && simulatedToggle.classList.contains('active');
      
      // Satellite should be visible if its data source toggle is active
      if (isRealSatellite && !isRealToggleActive) return false;
      if (!isRealSatellite && !isSimulatedToggleActive) return false;
      
      return true;
    });
    
    if (satellitesInClass.length > 0 && pickedPoint) {
      console.log(`🔍 Finding closest visible satellite to picked point in ${orbitClass} class (${satellitesInClass.length} visible satellites)`);
      
      // Calculate distances to find the actual closest satellite
      let closestSatellite = null;
      let minDistance = Infinity;
      
      for (const satellite of satellitesInClass) {
        // Get the satellite's 3D position from the original matrices (not current scaled matrices)
        const instanceIndex = satellite.instanceIndex;
        const originalMatrices = this.originalMatrices[orbitClass];
        
        if (originalMatrices && instanceIndex !== undefined && instanceIndex >= 0) {
          // Extract position from original transformation matrix
          const matrixOffset = instanceIndex * 16;
          const satPosition = new BABYLON.Vector3(
            originalMatrices[matrixOffset + 12], // X translation
            originalMatrices[matrixOffset + 13], // Y translation 
            originalMatrices[matrixOffset + 14]  // Z translation
          );
          
          // Skip if position is zero (hidden satellite)
          if (satPosition.x === 0 && satPosition.y === 0 && satPosition.z === 0) {
            continue;
          }
          
          // Calculate distance to picked point
          const distance = BABYLON.Vector3.Distance(pickedPoint, satPosition);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestSatellite = satellite;
          }
        }
      }
      
      if (closestSatellite) {
        console.log(`🎯 Found closest visible satellite: ${closestSatellite.name} (distance: ${minDistance.toFixed(3)})`);
        
        // Get mouse coordinates
        const canvas = this.scene.getEngine().getRenderingCanvas();
        const rect = canvas.getBoundingClientRect();
        const x = rect.left + event.offsetX;
        const y = rect.top + event.offsetY;
        
        // Show the enhanced tooltip
        this.showTooltip(closestSatellite, x, y);
      } else {
        console.log(`❌ Could not find valid satellite positions in ${orbitClass}`);
        this.showFallbackTooltip(mesh, event);
      }
    } else {
      this.showFallbackTooltip(mesh, event);
    }
  }

  showFallbackTooltip(mesh, event) {
    // Fallback tooltip when we can't detect specific instance
    const orbitClass = mesh.name.replace('sda_master_', '');
    
    // Don't show fallback tooltip when no specific satellite is detected
    // This prevents the "leo sta label" issue when hovering between satellites
    console.log(`⚠️ Fallback tooltip suppressed for ${orbitClass} - no specific satellite detected`);
    this.hideSatelliteTooltip();
  }

  handleSatelliteClick(mesh, instanceIndex, worldPosition) {
    // Handle satellite click for tooltip/selection
    const orbitClass = mesh.name.replace('sda_master_', '');
    
    // Find the satellite data for this instance
    for (const [objectId, objData] of Object.entries(this.objectData)) {
      if (objData.meshClass === orbitClass && objData.instanceIndex === instanceIndex) {
        console.log(`Selected satellite: ${objData.name} (${orbitClass})`);
        
        // Focus satellite in data browser
        this.focusSatelliteInBrowser(objData.noradId);
        
        this.showSatelliteTooltip(objData, worldPosition);
        break;
      }
    }
  }

  focusSatelliteInBrowser(noradId) {
    // Set search input to the NORAD ID
    const searchInput = document.getElementById('sda-search-input');
    if (searchInput) {
      searchInput.value = noradId;
      this.filterDataList();
      
      // Scroll to the item and expand it
      setTimeout(() => {
        const dataItem = document.querySelector(`[data-object-id*="${noradId}"]`);
        if (dataItem) {
          dataItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dataItem.classList.add('expanded');
          dataItem.style.background = 'rgba(0, 207, 255, 0.2)';
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            dataItem.style.background = '';
          }, 2000);
        }
      }, 100);
    }
  }

  showSatelliteHoverTooltip(mesh, instanceIndex, mouseEvent) {
    // Find the satellite data for this instance
    const orbitClass = mesh.name.replace('sda_master_', '');
    let satelliteData = null;
    
    console.log(`🔍 Looking for satellite in ${orbitClass} class, instance ${instanceIndex}`);
    
    // Debug: List first 5 satellites in this orbit class
    let foundCount = 0;
    for (const [objectId, objData] of Object.entries(this.objectData)) {
      if (objData.meshClass === orbitClass) {
        if (foundCount < 5) {
          console.log(`  - ${objData.name} (instance ${objData.instanceIndex}): isReal=${objData.isReal}, source=${objData.source}`);
        }
        foundCount++;
        
        if (objData.instanceIndex === instanceIndex) {
          satelliteData = objData;
          console.log(`✓ Found matching satellite: ${objData.name} (${objData.noradId})`);
          break;
        }
      }
    }
    
    console.log(`📊 Total satellites in ${orbitClass} class: ${foundCount}`);
    
    if (!satelliteData) {
      console.log(`❌ No satellite data found for ${orbitClass} instance ${instanceIndex}`);
      return;
    }
    
    // Get mouse coordinates (handle different event types)
    let x, y;
    if (mouseEvent.clientX !== undefined) {
      x = mouseEvent.clientX;
      y = mouseEvent.clientY;
    } else if (mouseEvent.offsetX !== undefined) {
      // Convert canvas coordinates to page coordinates
      const canvas = this.scene.getEngine().getRenderingCanvas();
      const rect = canvas.getBoundingClientRect();
      x = rect.left + mouseEvent.offsetX;
      y = rect.top + mouseEvent.offsetY;
    } else {
      // Fallback to center of screen
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }
    
    // Create or update tooltip
    this.showTooltip(satelliteData, x, y);
  }

  showTooltip(satelliteData, x, y) {
    // Remove existing tooltip
    this.hideSatelliteTooltip();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'sda-tooltip';
    tooltip.id = 'sda-hover-tooltip';
    
    // Clean satellite data and remove emojis
    const cleanName = (satelliteData.name || 'Unknown Satellite').replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    const orbitClass = satelliteData.class || 'Unknown';
    const altitude = satelliteData.altitude ? `${satelliteData.altitude} km` : 'Unknown';
    const inclination = satelliteData.inclination ? `${satelliteData.inclination}\u00b0` : 'Unknown';
    const country = (satelliteData.country || 'Unknown').replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    const noradId = satelliteData.noradId || satelliteData.norad || 'N/A';
    
    // Determine if this is real or simulated data
    const isRealSatellite = satelliteData.isReal || (satelliteData.source === 'NORAD') || (orbitClass === 'REAL');
    const dataSource = isRealSatellite ? 'Real NORAD Data' : 'Simulated Data';
    const sourceColor = isRealSatellite ? '#00ff64' : '#ff8800';
    
    // Debug logging for real satellite detection
    console.log(`Tooltip for ${cleanName}: isReal=${satelliteData.isReal}, source=${satelliteData.source}, class=${orbitClass}, determined as: ${dataSource}`);
    
    tooltip.innerHTML = `
      <h4>${cleanName}</h4>
      <div style="background: rgba(${isRealSatellite ? '0, 255, 100' : '255, 136, 0'}, 0.1); padding: 6px 8px; border-radius: 4px; margin: 8px 0;">
        <p style="font-size: 12px; color: ${sourceColor}; margin: 0; font-weight: bold;">${dataSource}</p>
      </div>
      <p><strong>Class:</strong> <span class="orbit-class ${orbitClass.toLowerCase()}">${orbitClass}</span></p>
      <p><strong>NORAD ID:</strong> ${noradId}</p>
      <p><strong>Altitude:</strong> ${altitude}</p>
      <p><strong>Inclination:</strong> ${inclination}</p>
      <p><strong>Country:</strong> ${country}</p>
      ${satelliteData.rcs ? `<p><strong>RCS:</strong> ${satelliteData.rcs}</p>` : ''}
    `;
    
    // Position tooltip
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = (y - 10) + 'px';
    
    document.body.appendChild(tooltip);
    
    // Store reference for cleanup
    this.currentTooltip = tooltip;
  }

  hideSatelliteTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
    
    // Also remove any existing tooltips by ID
    const existingTooltip = document.getElementById('sda-hover-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }

  showSatelliteTooltip(satelliteData, worldPosition) {
    // Click-based tooltip (can be enhanced later)
    console.log('Satellite Info:', {
      name: satelliteData.name,
      class: satelliteData.class,
      altitude: satelliteData.altitude + ' km',
      inclination: satelliteData.inclination + '°',
      country: satelliteData.country,
      rcs: satelliteData.rcs
    });
  }
  
  cleanupExistingSystem() {
    if (this.mesh) {
      this.mesh.dispose();
    }
    
    // Clean up instanced meshes
    Object.values(this.instancedMeshes).forEach(mesh => {
      if (mesh) mesh.dispose();
    });
    
    // Reset all data structures
    this.objectData = {};
    this.instancedMeshes = {};
    this.instanceMatrices = {};
    this.instanceColors = {};
    this.objectInstances = {};
  }
  
  createSharedMaterials() {
    this.sharedMaterials = {};
    Object.keys(this.COLORS).forEach(orbitClass => {
      const material = new BABYLON.StandardMaterial(`sdaMaterial_${orbitClass}`, this.scene);
      material.emissiveColor = this.COLORS[orbitClass];
      material.disableLighting = true;
      
      // Make materials moderately bright for subtle visibility
      material.emissiveColor = material.emissiveColor.scale(1.3); // More subtle brightness
      
      // Slight transparency for less aggressive appearance
      material.alpha = 0.85;
      
      // Enable backface culling for performance
      material.backFaceCulling = true;
      
      material.freeze(); // Freeze material for better performance
      this.sharedMaterials[orbitClass] = material;
    });
  }
  
  async createThinInstances() {
    const batchSize = 1000;
    const now = new Date();
    
    // Group objects by orbit class for thin instances
    const classCounts = {};
    const classObjects = {};
    
    // First pass: count objects per class and calculate positions
    let processedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < this.tleData.length; i++) {
      const obj = this.tleData[i];
      
      // Skip objects that don't have either TLE data OR static position
      if (!obj.isStatic && (!obj.tle1 || !obj.tle2)) {
        skippedCount++;
        continue;
      }
      
      // Skip static objects that don't have position
      if (obj.isStatic && !obj.position) {
        skippedCount++;
        continue;
      }
      
      try {
        let position;
        
        if (obj.isStatic) {
          // Use pre-calculated static position
          position = obj.position;
        } else {
          // Use SGP4 for real TLE data
          position = this.calculateSimpleOrbitPosition(obj.tle1, obj.tle2, now);
          if (!position) {
            skippedCount++;
            continue;
          }
        }
        
        // Classify satellites by their actual orbital class (preserve LEO/MEO/GEO/HEO info)
        let orbitClass = obj.class || this.determineOrbitClass(position.altitude);
        
        if (obj.isReal && obj.source === 'NORAD') {
          console.log(`🔍 Real NORAD satellite: ${obj.name} -> ${orbitClass} class (REAL data)`);
        } else {
          if (i < 20) { // Only log first 20 to avoid spam
            console.log(`🔍 Simulated satellite: ${obj.name} -> ${orbitClass} class`);
          }
        }
        
        if (!classCounts[orbitClass]) {
          classCounts[orbitClass] = 0;
          classObjects[orbitClass] = [];
        }
        
        classCounts[orbitClass]++;
        classObjects[orbitClass].push({
          obj,
          position,
          index: i
        });
        processedCount++;
      } catch (error) {
        skippedCount++;
        console.warn(`Failed to process object ${i}:`, error.message);
      }
    }
    
    console.log(`SDA: Processed ${processedCount} objects, skipped ${skippedCount}`);
    console.log(`🔍 Class counts:`, classCounts);
    
    // Create thin instances for each orbit class in order: REAL first, then others
    const creationOrder = ['REAL', 'LEO', 'MEO', 'GEO', 'HEO', 'DEBRIS', 'USER'];
    let totalInstancesCreated = 0;
    
    for (const orbitClass of creationOrder) {
      const count = classCounts[orbitClass];
      if (!count || count === 0) continue;
      
      console.log(`Creating ${count} thin instances for ${orbitClass}`);
      
      // Update progress to show current class being built
      const progress = document.getElementById('sda-loading-progress');
      if (progress) {
        progress.innerHTML = `Building <span style="color: ${this.getColorHex(orbitClass)}; font-weight: bold;">${orbitClass}</span> objects: <span style="color: #00ff00; font-weight: bold;">${count.toLocaleString()}</span>`;
      }
      
      // Create master mesh with subtle but visible sizing
      const masterMesh = BABYLON.MeshBuilder.CreateSphere(`sda_master_${orbitClass}`, {
        diameter: orbitClass === 'GEO' ? 0.016 : orbitClass === 'DEBRIS' ? 0.006 : orbitClass === 'LEO' ? 0.009 : 0.012, // Smaller debris and LEO
        segments: 4      // Reduced segments for performance
      }, this.scene);
      
      // Apply Earth's tilt to match Earth orientation (23.5 degrees)
      const EARTH_TILT = 23.5 * Math.PI / 180;
      masterMesh.rotation.x = EARTH_TILT + 0.05; // Match earth.js tilt with fine-tune adjustment
      
      masterMesh.material = this.sharedMaterials[orbitClass];
      masterMesh.parent = this.mesh;
      
      // Ensure mesh is properly configured for visibility and interaction
      masterMesh.isVisible = true;
      masterMesh.setEnabled(true);
      masterMesh.receiveShadows = false;
      masterMesh.checkCollisions = false;
      
      // Enable picking for hover tooltips
      masterMesh.isPickable = true;
      masterMesh.enablePointerMoveEvents = true;
      
      // Note: Action manager removed - using simplified canvas approach for better compatibility
      
      // Validate material is properly applied
      if (!masterMesh.material) {
        console.warn(`No material applied to ${orbitClass} master mesh`);
        masterMesh.material = this.sharedMaterials[orbitClass] || this.sharedMaterials.LEO;
      }
      
      // Add very subtle glow effect for key orbit classes only
      try {
        if (!this.scene.glowLayer) {
          this.scene.glowLayer = new BABYLON.GlowLayer("sda_glow", this.scene);
          this.scene.glowLayer.intensity = 0.3; // Much more subtle
        }
        
        // Only add glow to GEO objects for distinction
        if (orbitClass === 'GEO') {
          this.scene.glowLayer.addIncludedOnlyMesh(masterMesh);
        }
      } catch (error) {
        console.warn('Glow layer setup failed:', error);
      }
      
      // Don't freeze the world matrix yet - wait until after thin instances are applied
      // masterMesh.freezeWorldMatrix();
      
      // Prepare matrices for thin instances
      const matrices = new Float32Array(16 * count);
      const colors = new Float32Array(4 * count);
      const color = this.COLORS[orbitClass];
      
      // Process objects for this class with dynamic real-time loading
      let processedInClass = 0;
      let validInstanceCount = 0;
      const BATCH_SIZE = 1000; // Show orbs in batches for dynamic loading effect
      
      for (let i = 0; i < classObjects[orbitClass].length; i++) {
        const { obj, position, index } = classObjects[orbitClass][i];
        const babylonPos = this.positionToBabylon(position);
        
        // Validate position is reasonable
        if (!babylonPos || isNaN(babylonPos.x) || isNaN(babylonPos.y) || isNaN(babylonPos.z)) {
          // Skip invalid positions silently to reduce console spam
          continue;
        }
        
        // Create transformation matrix using validInstanceCount for proper indexing
        const matrix = BABYLON.Matrix.Translation(babylonPos.x, babylonPos.y, babylonPos.z);
        matrix.copyToArray(matrices, validInstanceCount * 16);
        
        // Set color with special treatment for real NORAD satellites
        if (obj.isReal && obj.source === 'NORAD') {
          // Real satellites: brighter with white tint to distinguish them
          colors[validInstanceCount * 4] = Math.min(color.r * 1.5 + 0.3, 1.0);     // Add white tint
          colors[validInstanceCount * 4 + 1] = Math.min(color.g * 1.5 + 0.3, 1.0); // Add white tint
          colors[validInstanceCount * 4 + 2] = Math.min(color.b * 1.5 + 0.3, 1.0); // Add white tint
          colors[validInstanceCount * 4 + 3] = 1.0; // Full opacity for real satellites
        } else {
          // Simulated satellites: normal coloring
          colors[validInstanceCount * 4] = Math.min(color.r * 1.2, 1.0);
          colors[validInstanceCount * 4 + 1] = Math.min(color.g * 1.2, 1.0);
          colors[validInstanceCount * 4 + 2] = Math.min(color.b * 1.2, 1.0);
          colors[validInstanceCount * 4 + 3] = 0.85; // Slight transparency for simulated
        }
        
        // Store object data
        this.objectData[obj.norad || `obj-${index}`] = {
          name: obj.name || `Object ${index}`,
          noradId: obj.norad || `obj-${index}`,
          class: orbitClass,
          tle1: obj.tle1,
          tle2: obj.tle2,
          altitude: (position.altitude || 0).toFixed(0),
          inclination: (position.inclination || 0).toFixed(1),
          instanceIndex: validInstanceCount, // Use validInstanceCount for proper mapping
          meshClass: orbitClass,
          rcs: obj.rcs || 'UNKNOWN',
          country: obj.country || 'UNKNOWN',
          launch: obj.launch || 'UNKNOWN',
          labelVisible: false,
          isReal: obj.isReal || false,
          source: obj.source || 'Unknown',
          isVisibleInScene: true // Track visibility for tooltip system
        };
        
        // Store instance mapping
        this.objectInstances[obj.norad || `obj-${index}`] = {
          class: orbitClass,
          index: validInstanceCount // Use validInstanceCount for instance mapping
        };
        
        validInstanceCount++;
        processedInClass++;
        
        // Dynamic loading: Update orbs in real-time every BATCH_SIZE objects
        if (validInstanceCount > 0 && (validInstanceCount % BATCH_SIZE === 0 || i === classObjects[orbitClass].length - 1)) {
          // Apply current batch to thin instances for immediate visual feedback
          const currentMatrices = matrices.slice(0, validInstanceCount * 16);
          const currentColors = colors.slice(0, validInstanceCount * 4);
          
          masterMesh.thinInstanceSetBuffer("matrix", currentMatrices, 16);
          masterMesh.thinInstanceSetBuffer("color", currentColors, 4);
          // Don't set picking here during batch updates - will be set once at the end
          masterMesh.setEnabled(true);
          masterMesh.isVisible = true;
          
          // Update progress with real-time count
          const progress = document.getElementById('sda-loading-progress');
          if (progress) {
            progress.innerHTML = `<span style="color: ${this.getColorHex(orbitClass)}; font-weight: bold;">${orbitClass}</span> Loading: <span style="color: #00ff00; font-weight: bold;">${validInstanceCount.toLocaleString()}</span> / <span style="color: #66d9ff;">${count.toLocaleString()}</span> orbs`;
          }
          
          // Brief pause to allow rendering and maintain smooth 60fps
          await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps timing
        }
        
        // Additional progress updates for very large batches
        if (processedInClass % 2500 === 0) {
          const progress = document.getElementById('sda-loading-progress');
          if (progress) {
            progress.innerHTML = `<span style="color: ${this.getColorHex(orbitClass)}; font-weight: bold;">${orbitClass}</span> Processing: <span style="color: #00ff00; font-weight: bold;">${processedInClass.toLocaleString()}</span> / <span style="color: #66d9ff;">${count.toLocaleString()}</span>`;
          }
          
          // Longer pause for processing updates
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Apply thin instances to the master mesh
      try {
        if (validInstanceCount > 0) {
          // Trim arrays to actual valid instances
          const trimmedMatrices = matrices.slice(0, validInstanceCount * 16);
          const trimmedColors = colors.slice(0, validInstanceCount * 4);
          
          masterMesh.thinInstanceSetBuffer("matrix", trimmedMatrices, 16);
          masterMesh.thinInstanceSetBuffer("color", trimmedColors, 4);
          
          // Enable instances to be pickable for tooltips - try multiple approaches
          masterMesh.thinInstanceEnablePicking = true;
          masterMesh.isPickable = true;
          masterMesh.enablePointerMoveEvents = true;
          
          // Force update the picking system
          if (this.scene.pick) {
            console.log(`✓ Thin instance picking enabled for ${orbitClass} with ${validInstanceCount} instances`);
          }
          
          // Force mesh visibility but DON'T freeze world matrix (interferes with picking)
          masterMesh.setEnabled(true);
          masterMesh.isVisible = true;
          // masterMesh.freezeWorldMatrix(); // Commented out - interferes with thin instance picking
          
          console.log(`${orbitClass}: Successfully created and applied ${validInstanceCount} thin instances out of ${count} total`);
        } else {
          console.warn(`${orbitClass}: No valid instances created out of ${count} total`);
          masterMesh.dispose(); // Clean up unused mesh
          continue;
        }
      } catch (error) {
        console.error(`Failed to create thin instances for ${orbitClass}:`, error);
        continue;
      }
      
      // Store references and backup original matrices BEFORE any modifications
      this.instancedMeshes[orbitClass] = masterMesh;
      this.instanceMatrices[orbitClass] = matrices.slice(0, validInstanceCount * 16); // Store the actual matrices used
      this.originalMatrices[orbitClass] = new Float32Array(matrices.slice(0, validInstanceCount * 16)); // Backup for restoration
      this.instanceColors[orbitClass] = colors.slice(0, validInstanceCount * 4);
      
      totalInstancesCreated += validInstanceCount;
      
      // Show completion for this class
      const progressElement = document.getElementById('sda-loading-progress');
      if (progressElement) {
        progressElement.innerHTML = `<span style="color: ${this.getColorHex(orbitClass)}; font-weight: bold;">${orbitClass}</span> complete: <span style="color: #00ff00; font-weight: bold;">${count.toLocaleString()}</span> objects`;
      }
      
      // Brief pause between classes for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Final summary
    const finalProgress = document.getElementById('sda-loading-progress');
    if (finalProgress) {
      finalProgress.innerHTML = `<span style="color: #00ff00; font-weight: bold;">Complete!</span> ${totalInstancesCreated.toLocaleString()} objects loaded`;
    }
    
    console.log(`Total instances created: ${totalInstancesCreated} out of ${this.tleData.length} TLE objects`);
    
    // Update legend with object counts
    this.updateLegendCounts(classCounts, totalInstancesCreated);
    
    // Populate data browser now that objects are created
    if (this.isVisible && !this.dataBrowserPopulated) {
      this.populateDataBrowser();
      this.dataBrowserPopulated = true;
    }
    
    // Cache object keys for efficient batched updates
    this.objectKeys = Object.keys(this.objectData);
    this.updateIndex = 0;
  }

  updateThinInstances() {
    // Placeholder for real-time updates when needed
    // For static visualization, no updates are necessary
    // This method exists to prevent the error when called from the render loop
    
    // In future versions, this could update orbital positions in real-time:
    // - Calculate new positions based on current simulation time
    // - Update thin instance matrices for visible objects
    // - Batch updates for performance (update subset per frame)
  }

  updateLegendCounts(classCounts, totalCount) {
    // Update the main object count
    const objectCountElement = document.getElementById('sda-object-count');
    if (objectCountElement) {
      objectCountElement.textContent = `(${totalCount.toLocaleString()} objects)`;
    }

    // Update individual class counts using specific IDs
    const leoCount = document.getElementById('leo-count');
    const meoCount = document.getElementById('meo-count');
    const geoCount = document.getElementById('geo-count');
    const heoCount = document.getElementById('heo-count');
    const debrisCount = document.getElementById('debris-count');

    if (leoCount) leoCount.textContent = (classCounts.LEO || 0).toLocaleString();
    if (meoCount) meoCount.textContent = (classCounts.MEO || 0).toLocaleString();
    if (geoCount) geoCount.textContent = (classCounts.GEO || 0).toLocaleString();
    if (heoCount) heoCount.textContent = (classCounts.HEO || 0).toLocaleString();
    if (debrisCount) debrisCount.textContent = (classCounts.DEBRIS || 0).toLocaleString();
    
    // Note: Real satellites are now distributed among their proper orbital classes above
  }

  updateDataModeDisplay(mode, realCount, staticCount, totalCount) {
    const modeBadge = document.getElementById('mode-badge');
    const modeText = document.getElementById('mode-text');
    const realCountElement = document.getElementById('real-count');
    const staticCountElement = document.getElementById('static-count');
    const lastUpdatedElement = document.getElementById('last-updated');

    if (modeBadge) {
      modeBadge.textContent = mode.toUpperCase();
      modeBadge.className = `mode-badge ${mode.toLowerCase()}`;
    }

    if (modeText) {
      const modeMessages = {
        'real': `BETA: ${totalCount.toLocaleString()} real satellites from Celestrak (1 week old data). Not real-time.`,
        'hybrid': `BETA: ${realCount.toLocaleString()} real Celestrak + ${staticCount.toLocaleString()} simulated objects. Demonstration only.`,
        'static': `BETA: ${totalCount.toLocaleString()} simulated objects for visualization demo. Not real satellite data.`
      };
      modeText.textContent = modeMessages[mode] || 'Loading satellite data...';
    }

    if (realCountElement) {
      realCountElement.textContent = realCount.toLocaleString();
    }

    if (staticCountElement) {
      staticCountElement.textContent = staticCount.toLocaleString();
    }

    if (lastUpdatedElement) {
      const now = new Date();
      lastUpdatedElement.textContent = now.toLocaleTimeString();
    }
  }

  populateDataBrowser() {
    const dataList = document.getElementById('sda-data-list');
    if (!dataList) {
      console.log('Data list element not found');
      return;
    }
    
    if (!this.objectData || Object.keys(this.objectData).length === 0) {
      console.log('No object data available for data browser');
      dataList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No satellite data available</div>';
      return;
    }

    console.log(`Populating data browser with ${Object.keys(this.objectData).length} objects`);

    // Convert object data to array for easier manipulation
    this.dataArray = Object.entries(this.objectData).map(([id, data]) => ({
      id,
      ...data
    }));

    // Debug: Log class distribution
    const classCounts = {};
    this.dataArray.forEach(item => {
      classCounts[item.class] = (classCounts[item.class] || 0) + 1;
    });
    console.log('🛰️ Data browser class distribution:', classCounts);
    console.log('🔍 Total satellites in database:', this.dataArray.length);

    this.renderDataList();
  }

  renderDataList() {
    const dataList = document.getElementById('sda-data-list');
    const searchTerm = document.getElementById('sda-search-input')?.value.toLowerCase() || '';
    const filterClass = document.getElementById('sda-filter-select')?.value || '';

    if (!dataList || !this.dataArray) return;

    // Filter data
    let filteredData = this.dataArray.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm) ||
        item.noradId.toString().includes(searchTerm);
      
      const matchesFilter = !filterClass || item.class === filterClass;
      
      return matchesSearch && matchesFilter;
    });

    // Sort by name
    filteredData.sort((a, b) => a.name.localeCompare(b.name));

    // Limit to 100 items for performance
    filteredData = filteredData.slice(0, 100);

    // Generate HTML
    const html = filteredData.map(item => {
      const classColors = {
        'LEO': '#33ffff',
        'MEO': '#ffff33', 
        'GEO': '#ff3333',
        'HEO': '#ff33ff',
        'DEBRIS': '#ff8833',
        'USER': '#ffffff'
      };

      return `
        <div class="sda-data-item" data-object-id="${item.id}">
          <div class="sda-data-header">
            <span class="sda-data-name">${item.name}</span>
            <span class="sda-data-class" style="background: ${classColors[item.class] || '#888'}; color: black;">${item.class}</span>
          </div>
          <div class="sda-data-details">
            <div class="sda-data-row">
              <span>NORAD ID:</span>
              <span>${item.noradId}</span>
            </div>
            <div class="sda-data-row">
              <span>Altitude:</span>
              <span>${item.altitude} km</span>
            </div>
            <div class="sda-data-row">
              <span>Inclination:</span>
              <span>${item.inclination}°</span>
            </div>
            <div class="sda-data-row">
              <span>RCS:</span>
              <span>${item.rcs}</span>
            </div>
            <div class="sda-data-row">
              <span>Country:</span>
              <span>${item.country}</span>
            </div>
            ${item.launch ? `
            <div class="sda-data-row">
              <span>Launch:</span>
              <span>${item.launch}</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    dataList.innerHTML = html;

    // Add click handlers for expansion
    dataList.querySelectorAll('.sda-data-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('expanded');
      });
    });
  }

  filterDataList() {
    this.renderDataList();
  }

  async loadTLEData() {
    console.log('Loading satellite data...');
    console.log('📡 FUTURE FEATURE: Real-time Celestrak API streaming will be available in upcoming releases');
    
    let realData = [];
    let dataMode = 'static'; // 'real', 'hybrid', or 'static'
    
    try {
      // Load from local Celestrak NORAD data (API integration coming soon)
      console.log('Loading real Celestrak NORAD data from local files...');
      realData = await this.loadLocalTLEFiles();
      
      if (realData && realData.length > 0) {
        console.log(`Loaded ${realData.length} real satellites from Celestrak NORAD data`);
        
        // Check if we have real NORAD data to determine mode
        const TARGET_OBJECTS = 58000;
        const MIN_REAL_DATA_THRESHOLD = 5; // Low threshold to enable hybrid mode with any real data
        
        if (realData.length >= MIN_REAL_DATA_THRESHOLD) {
          if (realData.length >= TARGET_OBJECTS * 0.8) {
            // We have enough real data - use pure real mode
            this.tleData = realData;
            dataMode = 'real';
            console.log(`Using pure real data mode with ${this.tleData.length} objects`);
          } else {
            // Real data available but not enough - create hybrid mode
            dataMode = 'hybrid';
            console.log(`Creating hybrid mode: ${realData.length} real + static supplement`);
            
            // Generate static data to supplement real data and mark sources
            const staticData = this.generateStaticOrbitalPositions(TARGET_OBJECTS - realData.length);
            
            // Mark real vs simulated data
            realData.forEach(sat => { sat.isReal = true; sat.source = 'NORAD'; });
            staticData.forEach(sat => { sat.isReal = false; sat.source = 'Simulated'; });
            
            this.tleData = [...realData, ...staticData];
            
            console.log(`Hybrid mode: ${realData.length} real + ${staticData.length} static = ${this.tleData.length} total`);
          }
        } else {
          // Very little real data - treat as fallback mode
          console.log(`Insufficient real data (${realData.length} objects), falling back to static mode`);
          const staticData = this.generateStaticOrbitalPositions();
          staticData.forEach(sat => { sat.isReal = false; sat.source = 'Simulated'; });
          this.tleData = staticData;
          dataMode = 'static';
        }
        
        this.showDataModeDisclaimer(dataMode, realData.length, this.tleData.length);
        
        // Update legend mode display
        const staticCount = dataMode === 'hybrid' ? (this.tleData.length - realData.length) : 0;
        this.updateDataModeDisplay(dataMode, realData.length, staticCount, this.tleData.length);
        return;
      }
    } catch (error) {
      console.warn('Failed to load real satellite data:', error.message);
    }
    
    // Complete fallback to static orbital positions
    console.log('Using complete fallback static orbital visualization...');
    this.tleData = this.generateStaticOrbitalPositions();
    dataMode = 'static';
    this.showDataModeDisclaimer(dataMode, 0, this.tleData.length);
    
    // Update legend mode display for static mode
    this.updateDataModeDisplay(dataMode, 0, this.tleData.length, this.tleData.length);
    console.log(`Generated ${this.tleData.length} static orbital objects`);
  }

  async fetchRealSatelliteData() {
    console.log('Fetching real satellite data from multiple sources...');
    
    const endpoints = [
      // High-priority, reliable sources
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=json'
    ];
    
    const allSatellites = [];
    const maxRetries = 2;
    
    for (const endpoint of endpoints) {
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          console.log(`Fetching from: ${endpoint}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(endpoint, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'LEOS-Visualization/1.0'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            const processed = data.map(obj => this.processRealSatelliteData(obj)).filter(Boolean);
            allSatellites.push(...processed);
            console.log(`✓ Loaded ${processed.length} satellites from ${endpoint}`);
            break; // Success, move to next endpoint
          }
          
        } catch (error) {
          retries++;
          console.warn(`✗ Attempt ${retries} failed for ${endpoint}:`, error.message);
          
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
          }
        }
      }
    }
    
    // Remove duplicates based on NORAD ID
    const uniqueSatellites = [];
    const seenIds = new Set();
    
    for (const sat of allSatellites) {
      if (!seenIds.has(sat.norad)) {
        seenIds.add(sat.norad);
        uniqueSatellites.push(sat);
      }
    }
    
    console.log(`Total unique satellites: ${uniqueSatellites.length}`);
    return uniqueSatellites;
  }

  async loadLocalTLEFiles() {
    console.log('Loading local Celestrak NORAD catalog data...');
    
    const localFiles = [
      '/data/norad.json',           // Real Celestrak NORAD data
      '/assets/tle-comprehensive.json',
      '/assets/tle-sample.json'
    ];
    
    const allSatellites = [];
    
    for (const filePath of localFiles) {
      try {
        console.log(`Loading from: ${filePath}`);
        const response = await fetch(filePath);
        
        if (!response.ok) {
          console.warn(`Failed to load ${filePath}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          // Direct array format
          const processed = data.map(obj => this.processLocalTLEData(obj)).filter(Boolean);
          allSatellites.push(...processed);
          console.log(`✓ Loaded ${processed.length} satellites from ${filePath}`);
        } else if (data.satellites && Array.isArray(data.satellites)) {
          // Nested format
          const processed = data.satellites.map(obj => this.processLocalTLEData(obj)).filter(Boolean);
          allSatellites.push(...processed);
          console.log(`✓ Loaded ${processed.length} satellites from ${filePath}`);
        } else if (typeof data === 'object' && !Array.isArray(data)) {
          // Object format (e.g., {"ISS": {...}, "GOES_16": {...}})
          const processed = Object.values(data).map(obj => this.processLocalTLEData(obj)).filter(Boolean);
          allSatellites.push(...processed);
          console.log(`✓ Loaded ${processed.length} satellites from ${filePath}`);
        } else {
          console.warn(`Unsupported format in ${filePath}`);
        }
        
      } catch (error) {
        console.warn(`Failed to load ${filePath}:`, error.message);
      }
    }
    
    // Remove duplicates
    const uniqueSatellites = [];
    const seenIds = new Set();
    
    for (const sat of allSatellites) {
      if (!seenIds.has(sat.norad)) {
        seenIds.add(sat.norad);
        uniqueSatellites.push(sat);
      }
    }
    
    console.log(`Total local TLE satellites: ${uniqueSatellites.length}`);
    return uniqueSatellites;
  }
  
  processLocalTLEData(obj) {
    try {
      // Handle NORAD JSON format from Celestrak
      if (obj.OBJECT_NAME && obj.NORAD_CAT_ID) {
        // Convert NORAD JSON to TLE format  
        const tle1 = this.generateTLE1FromNORAD(obj);
        const tle2 = this.generateTLE2FromNORAD(obj);
        
        return {
          name: obj.OBJECT_NAME,
          norad: obj.NORAD_CAT_ID.toString(),
          class: this.classifyNORADObject(obj),
          tle1: tle1,
          tle2: tle2,
          epoch: obj.EPOCH || new Date().toISOString(),
          rcs: obj.RCS_SIZE || 'UNKNOWN',
          country: obj.COUNTRY_CODE || 'UNKNOWN',
          launch: obj.LAUNCH_DATE || 'UNKNOWN',
          isReal: true,
          source: 'NORAD'
        };
      }
      
      // Handle standard TLE data formats
      if (obj.tle1 && obj.tle2) {
        return {
          name: obj.name || obj.satellite_name || `SAT-${obj.norad || 'UNKNOWN'}`,
          norad: obj.norad || obj.noradId || obj.catalog_number || 'UNKNOWN',
          class: this.classifyLocalObject(obj),
          tle1: obj.tle1,
          tle2: obj.tle2,
          epoch: obj.epoch || new Date().toISOString(),
          rcs: obj.rcs || 'UNKNOWN',
          country: obj.country || 'UNKNOWN',
          launch: obj.launch || 'UNKNOWN',
          isReal: obj.isReal || false,
          source: obj.source || 'Unknown'
        };
      }
      return null;
    } catch (error) {
      console.warn('Failed to process local TLE data:', error);
      return null;
    }
  }
  
  generateTLE1FromNORAD(obj) {
    // Generate TLE line 1 from NORAD data
    const noradId = obj.NORAD_CAT_ID.toString().padStart(5, '0');
    const classification = obj.CLASSIFICATION_TYPE || 'U';
    const intlDesignator = obj.OBJECT_ID || '00000A  ';
    const epochYear = obj.EPOCH ? obj.EPOCH.substring(2, 4) : '25';
    const epochDay = obj.EPOCH ? this.convertEpochToDay(obj.EPOCH) : '001.50000000';
    const meanMotionDot = (obj.MEAN_MOTION_DOT || 0).toExponential(8).replace('e', '');
    const meanMotionDDot = (obj.MEAN_MOTION_DDOT || 0).toExponential(8).replace('e', '');
    const bstar = (obj.BSTAR || 0).toExponential(8).replace('e', '');
    const ephemerisType = obj.EPHEMERIS_TYPE || 0;
    const elementSetNo = (obj.ELEMENT_SET_NO || 999).toString().padStart(4, ' ');
    
    return `1 ${noradId}${classification} ${intlDesignator} ${epochYear}${epochDay}  ${meanMotionDot}  ${meanMotionDDot}  ${bstar} ${ephemerisType} ${elementSetNo}9`;
  }

  generateTLE2FromNORAD(obj) {
    // Generate TLE line 2 from NORAD data
    const noradId = obj.NORAD_CAT_ID.toString().padStart(5, '0');
    const inclination = (obj.INCLINATION || 0).toFixed(4).padStart(8, ' ');
    const raan = (obj.RA_OF_ASC_NODE || 0).toFixed(4).padStart(8, ' ');
    const eccentricity = Math.round((obj.ECCENTRICITY || 0) * 10000000).toString().padStart(7, '0');
    const argPer = (obj.ARG_OF_PERICENTER || 0).toFixed(4).padStart(8, ' ');
    const meanAnomaly = (obj.MEAN_ANOMALY || 0).toFixed(4).padStart(8, ' ');
    const meanMotion = (obj.MEAN_MOTION || 1).toFixed(8).padStart(11, ' ');
    const revNumber = (obj.REV_AT_EPOCH || 0).toString().padStart(5, '0');
    
    return `2 ${noradId} ${inclination} ${raan} ${eccentricity} ${argPer} ${meanAnomaly} ${meanMotion}${revNumber}9`;
  }

  convertEpochToDay(epochString) {
    // Convert ISO date to day of year format
    try {
      const date = new Date(epochString);
      const year = date.getFullYear();
      const start = new Date(year, 0, 0);
      const diff = date - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      const fraction = (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86400;
      return (dayOfYear + fraction).toFixed(8).padStart(12, '0');
    } catch (error) {
      return '001.50000000';
    }
  }

  classifyNORADObject(obj) {
    // Classify NORAD objects based on orbital parameters and name
    const name = (obj.OBJECT_NAME || '').toUpperCase();
    const meanMotion = obj.MEAN_MOTION || 0;
    
    // Check for debris first
    if (name.includes('DEB') || name.includes('DEBRIS') || name.includes('FRAG')) {
      return 'DEBRIS';
    }
    
    // Classify by mean motion (revolutions per day)
    if (meanMotion > 10) return 'LEO';
    if (meanMotion > 1.5) return 'MEO';  
    if (meanMotion > 0.9 && meanMotion < 1.1) return 'GEO';
    if (meanMotion > 0) return 'HEO';
    
    // Fallback based on name patterns
    if (name.includes('STARLINK') || name.includes('ONEWEB')) return 'LEO';
    if (name.includes('GPS') || name.includes('GALILEO') || name.includes('GLONASS')) return 'MEO';
    if (name.includes('GOES') || name.includes('METEOSAT') || name.includes('INTELSAT')) return 'GEO';
    
    return 'LEO'; // Default
  }

  classifyLocalObject(obj) {
    const name = (obj.name || obj.satellite_name || '').toUpperCase();
    
    // Use existing classification logic
    if (name.includes('DEB') || name.includes('DEBRIS') || name.includes('FRAG')) {
      return 'DEBRIS';
    }
    
    if (name.includes('STARLINK')) return 'LEO';
    if (name.includes('ONEWEB')) return 'LEO';
    if (name.includes('GPS') || name.includes('GALILEO') || name.includes('GLONASS')) return 'MEO';
    if (name.includes('GOES') || name.includes('METEOSAT') || name.includes('INTELSAT')) return 'GEO';
    
    // Default classification based on orbital parameters if available
    if (obj.mean_motion || obj.meanMotion) {
      const meanMotion = parseFloat(obj.mean_motion || obj.meanMotion);
      if (meanMotion > 10) return 'LEO';
      if (meanMotion > 1.5) return 'MEO';
      if (meanMotion > 0.9 && meanMotion < 1.1) return 'GEO';
      return 'HEO';
    }
    
    return 'LEO'; // Default
  }
  
  processRealSatelliteData(obj) {
    try {
      // Validate required fields
      if (!obj.TLE_LINE1 || !obj.TLE_LINE2 || !obj.NORAD_CAT_ID) {
        return null;
      }
      
      // Quick validation of TLE format
      if (obj.TLE_LINE1.length !== 69 || obj.TLE_LINE2.length !== 69) {
        return null;
      }
      
      return {
        name: obj.OBJECT_NAME || `SAT-${obj.NORAD_CAT_ID}`,
        norad: obj.NORAD_CAT_ID.toString(),
        class: this.classifyRealObject(obj),
        tle1: obj.TLE_LINE1,
        tle2: obj.TLE_LINE2,
        epoch: obj.EPOCH || new Date().toISOString(),
        rcs: obj.RCS_SIZE || 'UNKNOWN',
        country: obj.COUNTRY_CODE || 'UNKNOWN',
        launch: obj.LAUNCH_DATE || 'UNKNOWN'
      };
    } catch (error) {
      console.warn('Failed to process satellite data:', error);
      return null;
    }
  }
  
  classifyRealObject(obj) {
    const name = (obj.OBJECT_NAME || '').toUpperCase();
    
    // Debris classification
    if (name.includes('DEB') || name.includes('DEBRIS') || name.includes('FRAG')) {
      return 'DEBRIS';
    }
    
    // Constellation classification
    if (name.includes('STARLINK')) return 'LEO';
    if (name.includes('ONEWEB')) return 'LEO';
    if (name.includes('IRIDIUM')) return 'LEO';
    
    // Navigation satellites
    if (name.includes('GPS') || name.includes('NAVSTAR')) return 'MEO';
    if (name.includes('GALILEO')) return 'MEO';
    if (name.includes('GLONASS')) return 'MEO';
    if (name.includes('BEIDOU')) return 'MEO';
    
    // Geostationary satellites
    if (name.includes('GOES') || name.includes('METEOSAT') || name.includes('INTELSAT')) return 'GEO';
    
    // Use mean motion to classify if available
    if (obj.MEAN_MOTION) {
      const meanMotion = parseFloat(obj.MEAN_MOTION);
      if (meanMotion > 10) return 'LEO';
      if (meanMotion > 1.5) return 'MEO';
      if (meanMotion > 0.9 && meanMotion < 1.1) return 'GEO';
      return 'HEO';
    }
    
    return 'LEO'; // Default classification
  }
  
  generateStaticOrbitalPositions(targetCount = 58000) {
    console.log(`Generating ${targetCount} static orbital positions...`);
    
    const staticObjects = [];
    
    // Scale orbital shells based on target count
    const scaleFactor = targetCount / 58000;
    
    // Create realistic orbital shells with static positions - dynamically scaled
    const baseShells = [
      // LEO Constellations (77.6% of total)
      { name: 'LEO-Starlink', ratio: 0.259, altitude: 550, inclination: 53, class: 'LEO' },
      { name: 'LEO-OneWeb', ratio: 0.138, altitude: 1200, inclination: 87, class: 'LEO' },
      { name: 'LEO-Kuiper', ratio: 0.121, altitude: 630, inclination: 51, class: 'LEO' },
      { name: 'LEO-CubeSats', ratio: 0.086, altitude: 400, inclination: 98, class: 'LEO' },
      { name: 'LEO-SmallSats', ratio: 0.069, altitude: 500, inclination: 97, class: 'LEO' },
      { name: 'LEO-ISS-Zone', ratio: 0.052, altitude: 410, inclination: 52, class: 'LEO' },
      { name: 'LEO-Sun-Sync', ratio: 0.052, altitude: 700, inclination: 98, class: 'LEO' },
      
      // MEO Navigation (0.4% of total)
      { name: 'MEO-GPS', ratio: 0.0006, altitude: 20200, inclination: 55, class: 'MEO' },
      { name: 'MEO-Galileo', ratio: 0.0005, altitude: 23222, inclination: 56, class: 'MEO' },
      { name: 'MEO-GLONASS', ratio: 0.0005, altitude: 19100, inclination: 65, class: 'MEO' },
      { name: 'MEO-BeiDou', ratio: 0.0006, altitude: 21500, inclination: 55, class: 'MEO' },
      { name: 'MEO-Commercial', ratio: 0.0019, altitude: 25000, inclination: 50, class: 'MEO' },
      
      // GEO Belt (0.9% of total)
      { name: 'GEO-CommSats', ratio: 0.0052, altitude: 35786, inclination: 0, class: 'GEO' },
      { name: 'GEO-WeatherSats', ratio: 0.0009, altitude: 35786, inclination: 0, class: 'GEO' },
      { name: 'GEO-Military', ratio: 0.0014, altitude: 35786, inclination: 0, class: 'GEO' },
      { name: 'GEO-Broadcasting', ratio: 0.0012, altitude: 35786, inclination: 0, class: 'GEO' },
      
      // Space Debris (20.7% of total)
      { name: 'DEBRIS-LEO-Low', ratio: 0.069, altitude: 400, inclination: 85, class: 'DEBRIS' },
      { name: 'DEBRIS-LEO-Mid', ratio: 0.060, altitude: 600, inclination: 75, class: 'DEBRIS' },
      { name: 'DEBRIS-LEO-High', ratio: 0.043, altitude: 800, inclination: 98, class: 'DEBRIS' },
      { name: 'DEBRIS-Fragments', ratio: 0.034, altitude: 500, inclination: 45, class: 'DEBRIS' },
      
      // HEO and Special Orbits (0.4% of total)
      { name: 'HEO-Molniya', ratio: 0.0014, altitude: 26600, inclination: 63, class: 'HEO' },
      { name: 'HEO-Tundra', ratio: 0.0007, altitude: 35786, inclination: 63, class: 'HEO' },
      { name: 'HEO-Scientific', ratio: 0.0010, altitude: 30000, inclination: 28, class: 'HEO' },
      { name: 'HEO-Deep-Space', ratio: 0.0012, altitude: 50000, inclination: 15, class: 'HEO' }
    ];
    
    // Convert ratios to actual counts
    const orbitalShells = baseShells.map(shell => ({
      ...shell,
      count: Math.max(1, Math.round(shell.ratio * targetCount))
    }));
    
    let objectId = 10000;
    
    for (const shell of orbitalShells) {
      for (let i = 0; i < shell.count; i++) {
        // Distribute objects around the orbital shell
        const raan = (i * 360 / shell.count) + (Math.random() - 0.5) * 10;
        const meanAnomaly = Math.random() * 360;
        const argPerigee = Math.random() * 360;
        
        // Calculate position using Kepler's laws (simplified)
        const position = this.calculateStaticPosition(
          shell.altitude,
          shell.inclination,
          raan,
          meanAnomaly,
          argPerigee
        );
        
        staticObjects.push({
          name: `${shell.name}-${i + 1}`,
          norad: `${objectId++}`,
          class: shell.class,
          position: position,
          altitude: shell.altitude,
          inclination: shell.inclination,
          rcs: shell.class === 'DEBRIS' ? 'SMALL' : 'MEDIUM',
          country: 'STATIC',
          launch: '2024-01-01',
          isStatic: true // Flag to identify static objects
        });
      }
    }
    
    return staticObjects;
  }
  
  calculateStaticPosition(altitude, inclination, raan, meanAnomaly, argPerigee) {
    // Convert to radians
    const incRad = inclination * Math.PI / 180;
    const raanRad = raan * Math.PI / 180;
    const argPerRad = argPerigee * Math.PI / 180;
    const maRad = meanAnomaly * Math.PI / 180;
    
    // Earth radius in km
    const earthRadius = 6371;
    const orbitalRadius = earthRadius + altitude;
    
    // Simplified orbital position calculation
    const x = orbitalRadius * (Math.cos(raanRad) * Math.cos(argPerRad + maRad) - Math.sin(raanRad) * Math.sin(argPerRad + maRad) * Math.cos(incRad));
    const y = orbitalRadius * (Math.sin(raanRad) * Math.cos(argPerRad + maRad) + Math.cos(raanRad) * Math.sin(argPerRad + maRad) * Math.cos(incRad));
    const z = orbitalRadius * (Math.sin(argPerRad + maRad) * Math.sin(incRad));
    
    return { x, y, z, altitude, inclination };
  }
  
  async fetchRealNORADDataLegacy() {
    const endpoints = [
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=analyst&FORMAT=JSON',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=JSON',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=JSON'
    ];
    
    const allSatellites = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        
        const data = await response.json();
        if (Array.isArray(data)) {
          data.forEach(obj => {
            if (obj.TLE_LINE1 && obj.TLE_LINE2) {
              allSatellites.push({
                name: obj.OBJECT_NAME || obj.NORAD_CAT_ID,
                norad: obj.NORAD_CAT_ID.toString(),
                class: this.classifyObject(obj),
                tle1: obj.TLE_LINE1,
                tle2: obj.TLE_LINE2,
                epoch: obj.EPOCH || new Date().toISOString(),
                rcs: obj.RCS_SIZE || 'UNKNOWN',
                country: obj.COUNTRY || 'UNKNOWN',
                launch: obj.LAUNCH_DATE || 'UNKNOWN'
              });
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint}:`, error);
      }
    }
    
    // Remove duplicates based on NORAD ID
    const uniqueSatellites = [];
    const seenIds = new Set();
    
    for (const sat of allSatellites) {
      if (!seenIds.has(sat.norad)) {
        seenIds.add(sat.norad);
        uniqueSatellites.push(sat);
      }
    }
    
    return uniqueSatellites;
  }
  
  classifyObject(obj) {
    // Classify based on orbital parameters
    if (obj.MEAN_MOTION) {
      const meanMotion = parseFloat(obj.MEAN_MOTION);
      if (meanMotion > 10) return 'LEO';
      if (meanMotion > 1.5) return 'MEO';
      if (meanMotion > 0.9 && meanMotion < 1.1) return 'GEO';
      return 'HEO';
    }
    
    // Fallback classification based on object name
    const name = obj.OBJECT_NAME || '';
    if (name.includes('DEB') || name.includes('DEBRIS')) return 'DEBRIS';
    if (name.includes('STARLINK')) return 'LEO';
    if (name.includes('GPS') || name.includes('GALILEO') || name.includes('GLONASS')) return 'MEO';
    if (name.includes('GOES') || name.includes('METEOSAT')) return 'GEO';
    
    return 'LEO'; // Default
  }
  
  generateRealSatelliteSeeds() {
    // Keep a few real satellites as seeds for testing
    return [
      {
        name: "ISS (ZARYA)",
        norad: "25544",
        class: "LEO",
        tle1: "1 25544U 98067A   25169.18513889  .00008396  00000+0  15112-3 0  9990",
        tle2: "2 25544  51.6455  37.3238 0007076 132.8248 356.1283 15.50168983399991",
        rcs: 'LARGE',
        country: 'USA',
        launch: '1998-11-20'
      },
      {
        name: "GOES 16",
        norad: "41866", 
        class: "GEO",
        tle1: "1 41866U 16071A   25167.74993576 -.00000290  00000+0  00000+0 0  9996",
        tle2: "2 41866   0.0448 172.2648 0000569 141.6764  94.5863  1.00271645 31488",
        rcs: 'LARGE',
        country: 'USA',
        launch: '2016-11-19'
      },
      {
        name: "GPS IIF-7",
        norad: "40105",
        class: "MEO", 
        tle1: "1 40105U 14045A   25168.83022673  .00000022  00000+0  00000+0 0  9990",
        tle2: "2 40105  54.7416 261.5752 0048253 201.3285 158.4543  2.00566719 79944",
        rcs: 'LARGE',
        country: 'USA',
        launch: '2014-07-15'
      }
    ];
  }

  generateTLE1(noradId) {
    // Use real working TLE line 1 template (based on ISS)
    const padded = noradId.padStart(5, '0');
    // Use current epoch - format: 25001.50000000 (2025, day 1)
    const epochStr = '25001.50000000';
    
    return `1 ${padded}U 98067A   ${epochStr}  .00002182  00000+0  11606-3 0  9990`;
  }

  generateTLE2(noradId, inclination, meanMotion, raanOffset = null) {
    // Use real working TLE line 2 template with variations
    const padded = noradId.padStart(5, '0');
    
    const incl = inclination.toFixed(4).padStart(8, ' ');
    const raan = (raanOffset !== null ? raanOffset : Math.random() * 360).toFixed(4).padStart(8, ' ');
    const eccentricity = '0001000'; // Fixed low eccentricity that works
    const argPer = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const meanAnomaly = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    const meanMotionStr = meanMotion.toFixed(8).padStart(11, ' ');
    const revNumber = '99999';
    
    return `2 ${padded} ${incl} ${raan} ${eccentricity} ${argPer} ${meanAnomaly} ${meanMotionStr}${revNumber}9`;
  }


  calculateSimpleOrbitPosition(tle1, tle2, date) {
    try {
      // Parse TLE lines using satellite.js
      const satrec = satellite.twoline2satrec(tle1, tle2);
      
      // Get position and velocity
      const positionAndVelocity = satellite.propagate(satrec, date);
      
      if (!positionAndVelocity || !positionAndVelocity.position) {
        return null;
      }
      
      const positionEci = positionAndVelocity.position;
      
      // Convert from ECI to ECEF (Earth-centered, Earth-fixed)
      const gmst = satellite.gstime(date);
      const positionEcef = satellite.eciToEcf(positionEci, gmst);
      
      return {
        x: positionEcef.x,
        y: positionEcef.y, 
        z: positionEcef.z,
        altitude: Math.sqrt(positionEcef.x * positionEcef.x + positionEcef.y * positionEcef.y + positionEcef.z * positionEcef.z) - 6371, // Approximate altitude
        inclination: satrec.inclo * 180 / Math.PI // Convert from radians to degrees
      };
    } catch (error) {
      console.warn('SGP4 calculation failed:', error);
      return null;
    }
  }


  // Additional TLE helper methods and utilities would go here...
  
}

// Global SDA visualization instance
let sdaVisualization = null;

/**
 * Initialize SDA visualization system with 3D scene
 */
export async function initSDAVisualization(scene) {
  if (!scene) {
    console.error('Scene is required for SDA initialization');
    return null;
  }
  
  try {
    sdaVisualization = new SDAVisualization();
    await sdaVisualization.initialize(scene);
    console.log('SDA Visualization system initialized successfully');
    return sdaVisualization;
  } catch (error) {
    console.error('Failed to initialize SDA visualization:', error);
    return null;
  }
}

/**
 * Create TLE input modal for adding custom satellites
 */
export function createTLEInputModal() {
  const modal = document.createElement('div');
  modal.id = 'tle-input-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: none;
    z-index: 10000;
    justify-content: center;
    align-items: center;
  `;

  modal.innerHTML = `
    <div style="background: #1a1a1a; padding: 30px; border-radius: 10px; border: 2px solid #00cfff; max-width: 500px; width: 90%;">
      <h3 style="color: #00cfff; margin-top: 0; font-family: 'Orbitron', monospace;">Add New Satellite (TLE)</h3>
      <div style="margin-bottom: 15px;">
        <label style="color: #fff; display: block; margin-bottom: 5px;">Satellite Name:</label>
        <input type="text" id="tle-name" style="width: 100%; padding: 8px; background: #333; color: #fff; border: 1px solid #666; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="color: #fff; display: block; margin-bottom: 5px;">TLE Line 1:</label>
        <input type="text" id="tle-line1" style="width: 100%; padding: 8px; background: #333; color: #fff; border: 1px solid #666; border-radius: 4px;" maxlength="69">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="color: #fff; display: block; margin-bottom: 5px;">TLE Line 2:</label>
        <input type="text" id="tle-line2" style="width: 100%; padding: 8px; background: #333; color: #fff; border: 1px solid #666; border-radius: 4px;" maxlength="69">
      </div>
      <div style="text-align: right;">
        <button id="tle-cancel" style="padding: 8px 16px; margin-right: 10px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="tle-add" style="padding: 8px 16px; background: #00cfff; color: #000; border: none; border-radius: 4px; cursor: pointer;">Add Satellite</button>
      </div>
    </div>
  `;

  // Event handlers
  modal.querySelector('#tle-cancel').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.querySelector('#tle-add').addEventListener('click', () => {
    const name = modal.querySelector('#tle-name').value;
    const line1 = modal.querySelector('#tle-line1').value;
    const line2 = modal.querySelector('#tle-line2').value;

    if (name && line1 && line2) {
      if (sdaVisualization) {
        sdaVisualization.addNewTLE(line1, line2, name);
      }
      modal.style.display = 'none';
    } else {
      alert('Please fill in all fields');
    }
  });

  document.body.appendChild(modal);
  return modal;
}

/**
 * Legacy function for backward compatibility
 */
export function addNewSDATle(tle1, tle2, name) {
  return sdaVisualization ? sdaVisualization.addNewTLE(tle1, tle2, name) : false;
}
