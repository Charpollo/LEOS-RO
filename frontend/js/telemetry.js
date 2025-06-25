// Telemetry module for generating and displaying telemetry data

// Handle external telemetry data
function handleExternalTelemetryData(data) {
    if (!data) return;
    
    // Convert external data format to internal format
    if (Array.isArray(data)) {
        // Handle batch data (from files, APIs, etc.)
        data.forEach(item => processExternalTelemetryItem(item));
    } else {
        // Handle single data point (from WebSocket, etc.)
        processExternalTelemetryItem(data);
    }
}

function processExternalTelemetryItem(item) {
    // Normalize external data to internal telemetry format
    const satelliteName = item.satellite || item.name || 'Unknown';
    
    // Convert external format to internal telemetry structure
    const telemetry = {
        timestamp: item.timestamp,
        altitude: item.altitude_km || item.altitude,
        latitude: item.latitude_deg || item.latitude,
        longitude: item.longitude_deg || item.longitude,
        speed: item.velocity_kmps || item.velocity || item.speed,
        velocity: item.velocity_eci || item.velocity,
        position_eci: item.position_eci || item.position,
        
        // Add computed values if missing
        ...generateComputedTelemetryValues(item)
    };
    
    // Update global telemetry data
    if (window.telemetryData) {
        window.telemetryData[satelliteName] = telemetry;
        
        // Trigger UI update if this satellite is currently selected
        if (window.activeSatellite === satelliteName) {
            updateTelemetryUI(satelliteName, window.telemetryData);
        }
    }
}

function generateComputedTelemetryValues(item) {
    // Generate missing telemetry values from available data
    const computed = {};
    
    // Calculate period if missing
    if (!item.period && item.altitude_km) {
        const altitude = item.altitude_km;
        const r = 6371 + altitude; // km
        computed.period = 2 * Math.PI * Math.sqrt((r * r * r) / 398600.4418) / 60; // minutes
    }
    
    // Calculate inclination if missing (placeholder)
    if (!item.inclination) {
        computed.inclination = 97.4; // Default to sun-synchronous
    }
    
    // Generate realistic systems data based on orbital position
    computed.systems = generateSystemsFromPosition(item);
    
    return computed;
}

function generateSystemsFromPosition(item) {
    // Generate realistic systems telemetry based on position and time
    const isInSunlight = calculateSunlightStatus(item);
    const isOverPoles = Math.abs(item.latitude_deg || item.latitude || 0) > 60;
    
    return {
        power: {
            battery: Math.round(75 + (isInSunlight ? 15 : -5) + Math.random() * 10),
            solar_array: isInSunlight ? Math.round(75 + Math.random() * 25) : 0,
            power_consumption: Math.round(8 + Math.random() * 4 + (isOverPoles ? 2 : 0))
        },
        thermal: {
            core_temp: Math.round((isInSunlight ? 25 : -10) + Math.random() * 8),
            solar_array_temp: Math.round((isInSunlight ? 35 : -20) + Math.random() * 15),
            battery_temp: Math.round(15 + Math.random() * 10)
        },
        comms: {
            signal_strength: Math.round(80 + Math.random() * 20 - (isOverPoles ? 10 : 0)),
            data_rate: Math.round(70 + Math.random() * 30),
            packet_loss: Math.round(Math.random() * (isOverPoles ? 8 : 3))
        }
    };
}

function calculateSunlightStatus(item) {
    // Simplified sunlight calculation
    const hour = new Date(item.timestamp).getUTCHours();
    const longitude = item.longitude_deg || item.longitude || 0;
    
    // Rough calculation of local solar time
    const localHour = (hour + longitude / 15) % 24;
    return localHour > 6 && localHour < 18;
}

export function generateRealTimeTelemetry(position, velocity, elements, satName) {
    // Calculate basic telemetry values from orbital elements
    const altitude = Math.sqrt(
        position.x * position.x + 
        position.y * position.y + 
        position.z * position.z
    ) - 6371; // Earth radius in km
    
    // Calculate latitude/longitude from position vector
    const latitude = Math.atan2(position.z, Math.sqrt(position.x * position.x + position.y * position.y)) * (180 / Math.PI);
    const longitude = Math.atan2(position.y, position.x) * (180 / Math.PI);
    
    // Calculate speed from velocity vector
    const speed = Math.sqrt(
        velocity.x * velocity.x + 
        velocity.y * velocity.y + 
        velocity.z * velocity.z
    );
    
    // Calculate orbital period from semi-major axis
    const semiMajorAxis = elements.a;
    const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / 398600.4418) / 60; // in minutes
    
    // Use the inclination directly from the elements
    const inclination = elements.i * (180 / Math.PI);
    
    // Calculate orbital phase for realistic variations
    const orbitalPhase = ((Date.now() / 1000) % (period * 60)) / (period * 60) * 2 * Math.PI;
    const isInSunlight = Math.sin(orbitalPhase) > -0.3; // Simplified eclipse calculation
    const isOverPoles = Math.abs(latitude) > 60; // High latitude passes
    
    // Generate simulated systems status with orbital variations
    const systems = {
        power: {
            battery: Math.round(75 + (isInSunlight ? 15 : -5) + Math.random() * 10),
            solar_array: isInSunlight ? Math.round(75 + Math.random() * 25) : 0,
            power_consumption: Math.round(8 + Math.random() * 4 + (isOverPoles ? 2 : 0))
        },
        thermal: {
            core_temp: Math.round((isInSunlight ? 25 : -10) + Math.random() * 8),
            solar_array_temp: Math.round((isInSunlight ? 35 : -20) + Math.random() * 15),
            battery_temp: Math.round(15 + Math.random() * 10)
        },
        comms: {
            signal_strength: Math.round(80 + Math.random() * 20 - (isOverPoles ? 10 : 0)),
            data_rate: Math.round(70 + Math.random() * 30),
            packet_loss: Math.round(Math.random() * (isOverPoles ? 8 : 3))
        }
    };
    
    // Generate CRTS-1 specific subsystems data with orbital variations
    const subsystems = satName.includes('CRTS') ? {
        solarArrays: isInSunlight ? Math.round(1000 + Math.random() * 300) : Math.round(50 + Math.random() * 100),
        powerSubsystem: Math.round(70 + (isInSunlight ? 20 : 0) + Math.random() * 10),
        telescope: (Math.random() > 0.6 && isInSunlight) ? 'Active' : 'Idle',
        lBandAntennas: Math.round(-90 + Math.random() * 15 + (isOverPoles ? -5 : 0)),
        kuBandAntenna: Math.round(80 + Math.random() * 60 - (isOverPoles ? 20 : 0)),
        slottedWaveguide: Math.round(30 + Math.random() * 60),
        lowGainAntennas: Math.random() > 0.3 ? 'Active' : 'Standby',
        coldGasThrusters: Math.round(75 + Math.random() * 20),
        magnetometer: (35 + Math.random() * 20 + (isOverPoles ? 15 : 0)).toFixed(1),
        starTrackers: (0.005 + Math.random() * 0.03 + (isOverPoles ? 0.01 : 0)).toFixed(3),
        sunSensor: isInSunlight ? Math.round(10 + Math.random() * 30) : Math.round(160 + Math.random() * 20)
    } : satName.includes('BULLDOG') ? {
        // Propulsion & Power
        ionPropulsion: Math.random() > 0.8 ? 'Active' : 'Standby',
        hallThrusters: Math.round(85 + Math.random() * 15),
        solarArrays: isInSunlight ? Math.round(800 + Math.random() * 400) : Math.round(30 + Math.random() * 80),
        powerElement: Math.round(80 + (isInSunlight ? 15 : -10) + Math.random() * 10),
        coldGasThrusters: Math.round(70 + Math.random() * 25),
        
        // Scientific Payload Instruments
        atmosphericExplorer: Math.random() > 0.7 ? 'Analyzing' : 'Idle',
        massSpectrometer: (Math.random() * 100).toFixed(1),
        xraySpectrometer: Math.random() > 0.6 ? 'Active' : 'Standby',
        spaceCamera: Math.random() > 0.5 ? 'Imaging' : 'Ready',
        terrainMapper: Math.random() > 0.4 ? 'Mapping' : 'Idle',
        laserRetroReflector: 'Operational',
        
        // Communications
        kuBandAntennas: Math.round(-80 + Math.random() * 20 + (isOverPoles ? -10 : 0)),
        xBandAntennas: Math.round(-75 + Math.random() * 15 + (isOverPoles ? -8 : 0)),
        ttcAntenna: Math.round(75 + Math.random() * 25 - (isOverPoles ? 15 : 0)),
        highGainAntenna: Math.round(90 + Math.random() * 30 - (isOverPoles ? 20 : 0)),
        directionalComm: Math.round(85 + Math.random() * 15),
        
        // Navigation & Control
        starTrackers: (0.008 + Math.random() * 0.025 + (isOverPoles ? 0.015 : 0)).toFixed(3),
        adcsSystem: Math.round(92 + Math.random() * 8),
        
        // Other
        nanosatDocks: Math.random() > 0.9 ? 'Deploying' : 'Secured'
    } : null;
    
    // Specialized values based on satellite name
    if (satName.includes('CRTS')) {
        // Specialized sensor readings for CRTS satellites
        systems.sensors = {
            radiation_detector: Math.round(10 + Math.random() * 5),
            magnetometer: Math.round(40 + Math.random() * 20),
            star_tracker: Math.round(90 + Math.random() * 10)
        };
    } else if (satName.includes('BULLDOG')) {
        // Specialized payloads for BULLDOG satellites
        systems.payload = {
            imaging_system: Math.round(85 + Math.random() * 15),
            storage_capacity: Math.round(45 + Math.random() * 25),
            memory_usage: Math.round(30 + Math.random() * 40)
        };
    }
    
    // Return complete telemetry package
    return {
        altitude,
        latitude,
        longitude,
        speed,
        period,
        inclination,
        systems,
        subsystems
    };
}

export function updateTelemetryUI(activeSatellite, telemetryData) {
    // Show mission dashboard overlay
    const missionDashboard = document.getElementById('mission-dashboard');
     // Panel color logic
     let panelClass = '', headerClass = '';
     if (activeSatellite && activeSatellite.toUpperCase().includes('CRTS')) {
        panelClass = 'crts-panel';
        headerClass = 'crts-header';
    } else if (activeSatellite && activeSatellite.toUpperCase().includes('BULLDOG')) {
        panelClass = 'bulldog-panel';
        headerClass = 'bulldog-header';
    }
    if (missionDashboard) {
        missionDashboard.classList.replace('hidden','visible');
         // Set panel color classes
         const leftTile = missionDashboard.querySelector('.left-tile');
         const rightTile = missionDashboard.querySelector('.model-tile');
         const leftHeader = leftTile?.querySelector('.tile-header');
         const rightHeader = rightTile?.querySelector('.tile-header');
         // Update header text to reflect selected satellite
         if (leftHeader) leftHeader.textContent = `${activeSatellite} Telemetry`;
         if (rightHeader) rightHeader.textContent = `${activeSatellite} Asset`;
         leftTile?.classList.remove('crts-panel','bulldog-panel');
         rightTile?.classList.remove('crts-panel','bulldog-panel');
         leftHeader?.classList.remove('crts-header','bulldog-header');
         rightHeader?.classList.remove('crts-header','bulldog-header');
         if (panelClass) {
             leftTile?.classList.add(panelClass);
             rightTile?.classList.add(panelClass);
         }
         if (headerClass) {
             leftHeader?.classList.add(headerClass);
             rightHeader?.classList.add(headerClass);
         }
         // Use template system for comprehensive telemetry display
         const leftContent = document.getElementById('mission-telemetry-content');
         if (leftContent && activeSatellite && telemetryData[activeSatellite]) {
             const t = telemetryData[activeSatellite];
             
             // Import templates for comprehensive telemetry display
             import('./ui/templates.js').then(({ templates }) => {
                 let telemetryHTML = '';
                 
                 // Basic telemetry card
                 telemetryHTML += `
                     <div class="telemetry-card">
                         <h4>Orbital Parameters</h4>
                         <div class="telemetry-item"><span>Altitude:</span> <span>${t.altitude?.toFixed(2) ?? 'N/A'} km</span></div>
                         <div class="telemetry-item"><span>Velocity:</span> <span>${(() => {
                             if (t.speed && typeof t.speed === 'number') {
                                 return t.speed.toFixed(2);
                             } else if (t.velocity) {
                                 if (Array.isArray(t.velocity)) {
                                     return Math.sqrt(t.velocity[0]**2 + t.velocity[1]**2 + t.velocity[2]**2).toFixed(2);
                                 } else if (typeof t.velocity === 'number') {
                                     return t.velocity.toFixed(2);
                                 }
                             }
                             return 'N/A';
                         })()} km/s</span></div>
                         <div class="telemetry-item"><span>Period:</span> <span>${t.period?.toFixed(2) ?? 'N/A'} min</span></div>
                         <div class="telemetry-item"><span>Inclination:</span> <span>${t.inclination?.toFixed(2) ?? 'N/A'}°</span></div>
                     </div>
                 `;
                 
                 // CRTS-1 subsystems card
                 if (activeSatellite.toUpperCase().includes('CRTS') && t.subsystems) {
                     telemetryHTML += `
                         <div class="telemetry-card" style="margin-top: 15px;">
                             <h4>CRTS-1 Subsystems</h4>
                             <div class="telemetry-item"><span>Solar Arrays:</span> <span>${t.subsystems.solarArrays} W</span></div>
                             <div class="telemetry-item"><span>Power System:</span> <span>${t.subsystems.powerSubsystem}%</span></div>
                             <div class="telemetry-item"><span>Telescope:</span> <span>${t.subsystems.telescope}</span></div>
                             <div class="telemetry-item"><span>L-Band Antennas:</span> <span>${t.subsystems.lBandAntennas} dBm</span></div>
                             <div class="telemetry-item"><span>Ku-Band Antenna:</span> <span>${t.subsystems.kuBandAntenna} Mbps</span></div>
                             <div class="telemetry-item"><span>Waveguide Array:</span> <span>${t.subsystems.slottedWaveguide}°</span></div>
                             <div class="telemetry-item"><span>Low Gain Antennas:</span> <span>${t.subsystems.lowGainAntennas}</span></div>
                             <div class="telemetry-item"><span>Cold Gas Thrusters:</span> <span>${t.subsystems.coldGasThrusters}%</span></div>
                             <div class="telemetry-item"><span>Magnetometer:</span> <span>${t.subsystems.magnetometer} µT</span></div>
                             <div class="telemetry-item"><span>Star Trackers:</span> <span>${t.subsystems.starTrackers} arcsec</span></div>
                             <div class="telemetry-item"><span>Sun Sensor:</span> <span>${t.subsystems.sunSensor}°</span></div>
                         </div>
                     `;
                 }
                 
                 // BULLDOG subsystems card
                 if (activeSatellite.toUpperCase().includes('BULLDOG') && t.subsystems) {
                     telemetryHTML += `
                         <div class="telemetry-card" style="margin-top: 15px;">
                             <h4>BULLDOG Subsystems</h4>
                             <div class="telemetry-section"><strong>Propulsion & Power</strong></div>
                             <div class="telemetry-item"><span>Ion Propulsion:</span> <span>${t.subsystems.ionPropulsion}</span></div>
                             <div class="telemetry-item"><span>Hall Thrusters:</span> <span>${t.subsystems.hallThrusters}%</span></div>
                             <div class="telemetry-item"><span>Solar Arrays:</span> <span>${t.subsystems.solarArrays} W</span></div>
                             <div class="telemetry-item"><span>Power Element:</span> <span>${t.subsystems.powerElement}%</span></div>
                             <div class="telemetry-item"><span>Cold Gas Thrusters:</span> <span>${t.subsystems.coldGasThrusters}%</span></div>
                             
                             <div class="telemetry-section" style="margin-top: 10px;"><strong>Scientific Payload</strong></div>
                             <div class="telemetry-item"><span>Atmospheric Explorer:</span> <span>${t.subsystems.atmosphericExplorer}</span></div>
                             <div class="telemetry-item"><span>Mass Spectrometer:</span> <span>${t.subsystems.massSpectrometer}%</span></div>
                             <div class="telemetry-item"><span>X-ray Spectrometer:</span> <span>${t.subsystems.xraySpectrometer}</span></div>
                             <div class="telemetry-item"><span>Space Camera:</span> <span>${t.subsystems.spaceCamera}</span></div>
                             <div class="telemetry-item"><span>Terrain Mapper:</span> <span>${t.subsystems.terrainMapper}</span></div>
                             <div class="telemetry-item"><span>Laser Retroreflector:</span> <span>${t.subsystems.laserRetroReflector}</span></div>
                             
                             <div class="telemetry-section" style="margin-top: 10px;"><strong>Communications</strong></div>
                             <div class="telemetry-item"><span>Ku-Band Antennas:</span> <span>${t.subsystems.kuBandAntennas} dBm</span></div>
                             <div class="telemetry-item"><span>X-Band Antennas:</span> <span>${t.subsystems.xBandAntennas} dBm</span></div>
                             <div class="telemetry-item"><span>TTC Antenna:</span> <span>${t.subsystems.ttcAntenna}%</span></div>
                             <div class="telemetry-item"><span>High Gain Antenna:</span> <span>${t.subsystems.highGainAntenna} Mbps</span></div>
                             <div class="telemetry-item"><span>Directional Comm:</span> <span>${t.subsystems.directionalComm}%</span></div>
                             
                             <div class="telemetry-section" style="margin-top: 10px;"><strong>Navigation & Control</strong></div>
                             <div class="telemetry-item"><span>Star Trackers:</span> <span>${t.subsystems.starTrackers} arcsec</span></div>
                             <div class="telemetry-item"><span>ADCS System:</span> <span>${t.subsystems.adcsSystem}%</span></div>
                             
                             <div class="telemetry-section" style="margin-top: 10px;"><strong>Other</strong></div>
                             <div class="telemetry-item"><span>Nanosat Docks:</span> <span>${t.subsystems.nanosatDocks}</span></div>
                         </div>
                     `;
                 }
                 
                 // Add note about upcoming features
                 telemetryHTML += `
                     <div class="telemetry-note" style="margin-top: 15px; padding: 10px; background: rgba(0, 100, 200, 0.1); border-radius: 5px; border-left: 3px solid #00a8ff;">
                         <strong>Coming Soon:</strong> Real-time data graphs and detailed subsystem drill-down capabilities will be available in the next update.
                     </div>
                 `;
                 
                 leftContent.innerHTML = telemetryHTML;
             });
         } else if (leftContent) {
             leftContent.innerHTML = '<div class="telemetry-placeholder">Select a satellite to view telemetry.</div>';
         }
         
        // Don't replace the model canvas - it's now handled by the 3D model viewer
        // The modelCanvas is created in HTML and managed by initModelViewer()
     }
 }
