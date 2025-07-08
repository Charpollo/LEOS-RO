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
         // Update header text to reflect selected satellite while preserving minimize buttons
         if (leftHeader) {
             // Find the minimize button if it exists
             const minimizeBtn = leftHeader.querySelector('.tile-minimize-btn');
             leftHeader.textContent = `${activeSatellite} Telemetry`;
             // Re-append the minimize button if it existed
             if (minimizeBtn) {
                 leftHeader.appendChild(minimizeBtn);
             }
         }
         if (rightHeader) {
             // Find the minimize button if it exists
             const minimizeBtn = rightHeader.querySelector('.tile-minimize-btn');
             rightHeader.textContent = `${activeSatellite} Asset`;
             // Re-append the minimize button if it existed
             if (minimizeBtn) {
                 rightHeader.appendChild(minimizeBtn);
             }
         }
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
                         <div class="telemetry-item"><span>Latitude:</span> <span>${t.latitude?.toFixed(2) ?? 'N/A'}°</span></div>
                         <div class="telemetry-item"><span>Longitude:</span> <span>${t.longitude?.toFixed(2) ?? 'N/A'}°</span></div>
                     </div>
                 `;
                 
                 // CRTS-1 detailed telemetry from Telem_example.json
                 if (activeSatellite.toUpperCase().includes('CRTS') && t.systems) {
                     // Payload Sensors
                     if (t.Payload_Sensors || (t.systems && t.systems.sensors)) {
                         const sensors = t.Payload_Sensors || t.systems.sensors || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Payload Sensors</h4>
                                 <div class="telemetry-item"><span>Imaging Mode:</span> <span>${sensors.Imaging_Mode || sensors.imaging_mode || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Sensor Temp:</span> <span>${sensors.Sensor_Temp_C || sensors.sensor_temp || 'N/A'}°C</span></div>
                                 <div class="telemetry-item"><span>Capture Status:</span> <span>${sensors.Capture_Status || sensors.capture_status || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Image Data Stored:</span> <span>${sensors.Image_Data_Stored_MB || sensors.image_data_stored || 'N/A'} MB</span></div>
                                 ${sensors.Target_Area ? `
                                     <div class="telemetry-item"><span>Target Latitude:</span> <span>${sensors.Target_Area.Latitude || 'N/A'}</span></div>
                                     <div class="telemetry-item"><span>Target Longitude:</span> <span>${sensors.Target_Area.Longitude || 'N/A'}</span></div>
                                 ` : ''}
                             </div>
                         `;
                     }
                     
                     // Power & Thermal
                     if (t.Power_Thermal || (t.systems && (t.systems.power || t.systems.thermal))) {
                         const power = t.Power_Thermal || {};
                         const systemPower = t.systems && t.systems.power || {};
                         const systemThermal = t.systems && t.systems.thermal || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Power & Thermal</h4>
                                 <div class="telemetry-item"><span>Battery Level:</span> <span>${power.Battery_Level_Percent || systemPower.battery_level || systemPower.value || 'N/A'}%</span></div>
                                 <div class="telemetry-item"><span>Solar Panel Output:</span> <span>${power.Solar_Panel_Output_W || systemPower.solar_panels || 'N/A'} W</span></div>
                                 <div class="telemetry-item"><span>Thermal Regulator:</span> <span>${power.Thermal_Regulator_Status || systemThermal.status || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Battery Temp:</span> <span>${power.Battery_Temperature_C || systemThermal.battery_temp || 'N/A'}°C</span></div>
                                 <div class="telemetry-item"><span>Panel Orientation:</span> <span>${power.Panel_Orientation_Deg || 'N/A'}°</span></div>
                             </div>
                         `;
                     }
                     
                     // Communications
                     if (t.Communications || (t.systems && t.systems.communications)) {
                         const comms = t.Communications || t.systems.communications || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Communications</h4>
                                 <div class="telemetry-item"><span>X-Band Link:</span> <span>${comms.X_Band_Link_Status || comms.status || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Uplink Signal:</span> <span>${comms.Uplink_Signal_Strength_dBm || comms.signal_strength || 'N/A'} dBm</span></div>
                                 <div class="telemetry-item"><span>Downlink Rate:</span> <span>${comms.Downlink_Rate_Mbps || comms.data_rate || 'N/A'} Mbps</span></div>
                                 <div class="telemetry-item"><span>Last Ground Contact:</span> <span>${comms.Last_Ground_Contact_Min || 'N/A'} min ago</span></div>
                                 <div class="telemetry-item"><span>Comm Errors:</span> <span>${comms.Comm_Errors || '0'}</span></div>
                             </div>
                         `;
                     }
                     
                     // GNC (Guidance, Navigation, Control)
                     if (t.GNC || (t.systems && t.systems.attitude)) {
                         const gnc = t.GNC || {};
                         const attitude = t.systems && t.systems.attitude || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Guidance, Navigation & Control</h4>
                                 ${gnc.Pitch_Yaw_Roll_Deg ? `
                                     <div class="telemetry-item"><span>Pitch:</span> <span>${gnc.Pitch_Yaw_Roll_Deg.Pitch || attitude.pitch || 'N/A'}°</span></div>
                                     <div class="telemetry-item"><span>Yaw:</span> <span>${gnc.Pitch_Yaw_Roll_Deg.Yaw || attitude.yaw || 'N/A'}°</span></div>
                                     <div class="telemetry-item"><span>Roll:</span> <span>${gnc.Pitch_Yaw_Roll_Deg.Roll || attitude.roll || 'N/A'}°</span></div>
                                 ` : ''}
                                 <div class="telemetry-item"><span>Orbit Altitude:</span> <span>${gnc.Orbit_Altitude_km || 'N/A'} km</span></div>
                                 <div class="telemetry-item"><span>Velocity:</span> <span>${gnc.Velocity_km_s || 'N/A'} km/s</span></div>
                                 <div class="telemetry-item"><span>Sun Sensor Alignment:</span> <span>${gnc.Sun_Sensor_Alignment_Percent || 'N/A'}%</span></div>
                                 <div class="telemetry-item"><span>Star Tracker Lock:</span> <span>${gnc.Star_Tracker_Lock || 'N/A'}</span></div>
                             </div>
                         `;
                     }
                     
                     // CDH (Command & Data Handling)
                     if (t.CDH) {
                         const cdh = t.CDH;
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Command & Data Handling</h4>
                                 <div class="telemetry-item"><span>CPU Usage:</span> <span>${cdh.CPU_Usage_Percent || 'N/A'}%</span></div>
                                 <div class="telemetry-item"><span>Storage Used:</span> <span>${cdh.Storage_Used_GB || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Command Queue:</span> <span>${cdh.Command_Queue || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>System Clock:</span> <span>${cdh.System_Clock_Sync || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Bus Status:</span> <span>${cdh.Bus_Status || 'N/A'}</span></div>
                             </div>
                         `;
                     }
                 }
                 
                 // BULLDOG detailed telemetry from Telem_example.json
                 if (activeSatellite.toUpperCase().includes('BULLDOG') && t.systems) {
                     // Propulsion & Power
                     if (t.Propulsion_Power || (t.systems && (t.systems.propulsion || t.systems.power))) {
                         const propPower = t.Propulsion_Power || {};
                         const sysPower = t.systems && t.systems.power || {};
                         const sysProp = t.systems && t.systems.propulsion || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Propulsion & Power</h4>
                                 <div class="telemetry-item"><span>Propulsion Mode:</span> <span>${propPower.Propulsion_Mode || sysProp.mode || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Thruster Status:</span> <span>${propPower.Thruster_Status || sysProp.thruster_status || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Fuel Remaining:</span> <span>${propPower.Fuel_Remaining_Percent || sysProp.fuel_level || 'N/A'}%</span></div>
                                 <div class="telemetry-item"><span>Power Draw:</span> <span>${propPower.Power_Draw_W || sysPower.power_draw || 'N/A'} W</span></div>
                                 <div class="telemetry-item"><span>Battery Temp:</span> <span>${propPower.Battery_Temp_C || sysPower.battery_temp || 'N/A'}°C</span></div>
                             </div>
                         `;
                     }
                     
                     // Scientific Payloads
                     if (t.Scientific_Payloads || (t.systems && t.systems.payload)) {
                         const payload = t.Scientific_Payloads || t.systems.payload || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Scientific Payloads</h4>
                                 <div class="telemetry-item"><span>ACE Status:</span> <span>${payload.ACE_Status || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>XRS Activity:</span> <span>${payload.XRS_Activity || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>TMC Mapping:</span> <span>${payload.TMC_Mapping_Area || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>LRA Signal Return:</span> <span>${payload.LRA_Signal_Return || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>MPSC Imaging:</span> <span>${payload.MPSC_Imaging || payload.imaging_system || 'N/A'}</span></div>
                             </div>
                         `;
                     }
                     
                     // Communications
                     if (t.Communications || (t.systems && t.systems.communications)) {
                         const comms = t.Communications || t.systems.communications || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Communications</h4>
                                 <div class="telemetry-item"><span>Ku-Band Uplink:</span> <span>${comms.Ku_Band_Uplink_Rate_Mbps || 'N/A'} Mbps</span></div>
                                 <div class="telemetry-item"><span>X-Band Link:</span> <span>${comms.X_Band_Link_Status || comms.status || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>TTC Signal Quality:</span> <span>${comms.TTandC_Signal_Quality || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>MHGA Pointing:</span> <span>${comms.MHGA_Pointing_Vector || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>DCA Redundancy:</span> <span>${comms.DCA_Redundancy_Check || 'N/A'}</span></div>
                             </div>
                         `;
                     }
                     
                     // Navigation & Control
                     if (t.Navigation_Control || (t.systems && t.systems.attitude)) {
                         const navCtrl = t.Navigation_Control || {};
                         const attitude = t.systems && t.systems.attitude || {};
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Navigation & Control</h4>
                                 <div class="telemetry-item"><span>ADCS Mode:</span> <span>${navCtrl.ADCS_Mode || attitude.status || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Star Tracker Error:</span> <span>${navCtrl.Star_Tracker_Error_Deg || 'N/A'}°</span></div>
                                 <div class="telemetry-item"><span>Angular Velocity:</span> <span>${navCtrl.Angular_Velocity_rad_s || 'N/A'} rad/s</span></div>
                                 <div class="telemetry-item"><span>Reaction Wheels:</span> <span>${navCtrl.Reaction_Wheels || 'N/A'}</span></div>
                                 <div class="telemetry-item"><span>Orbit Path Deviation:</span> <span>${navCtrl.Orbit_Path_Deviation_m || 'N/A'}</span></div>
                             </div>
                         `;
                     }
                     
                     // Experimental Systems
                     if (t.Experimental_Systems) {
                         const exp = t.Experimental_Systems;
                         telemetryHTML += `
                             <div class="telemetry-card" style="margin-top: 15px;">
                                 <h4>Experimental Systems</h4>
                                 ${exp.Dock_Port_Status ? `
                                     <div class="telemetry-item"><span>Dock Port 1:</span> <span>${exp.Dock_Port_Status.Port_1 || 'N/A'}</span></div>
                                     <div class="telemetry-item"><span>Dock Port 2:</span> <span>${exp.Dock_Port_Status.Port_2 || 'N/A'}</span></div>
                                 ` : ''}
                                 <div class="telemetry-item"><span>Software Config:</span> <span>${exp.Software_Config || 'N/A'}</span></div>
                                 ${exp.Autonomous_Maneuver_Log ? `
                                     <div class="telemetry-item"><span>Maneuvers Planned:</span> <span>${exp.Autonomous_Maneuver_Log.Planned || 'N/A'}</span></div>
                                     <div class="telemetry-item"><span>Maneuvers Completed:</span> <span>${exp.Autonomous_Maneuver_Log.Completed || 'N/A'}</span></div>
                                 ` : ''}
                                 <div class="telemetry-item"><span>Mission Mode:</span> <span>${exp.Mission_Mode || 'N/A'}</span></div>
                             </div>
                         `;
                     }
                 }
                 
                 // Add note about upcoming features
                 telemetryHTML += `
                     <div class="telemetry-note" style="margin-top: 15px; padding: 10px; background: rgba(0, 100, 200, 0.1); border-radius: 5px; border-left: 3px solid #00a8ff;">
                         <strong>Coming Soon:</strong> Real-time data graphs, detailed subsystem drill-down capabilities, and integrated dashboards will be available in the next update.
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
