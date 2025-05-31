// Telemetry module for generating and displaying telemetry data

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
    
    // Generate simulated systems status
    const systems = {
        power: {
            battery: Math.round(80 + Math.random() * 15),
            solar_array: Math.round(75 + Math.random() * 25),
            power_consumption: Math.round(10 + Math.random() * 5)
        },
        thermal: {
            core_temp: Math.round(18 + Math.random() * 7),
            solar_array_temp: Math.round(25 + Math.random() * 30),
            battery_temp: Math.round(15 + Math.random() * 10)
        },
        comms: {
            signal_strength: Math.round(85 + Math.random() * 15),
            data_rate: Math.round(80 + Math.random() * 20),
            packet_loss: Math.round(Math.random() * 5)
        }
    };
    
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
        systems
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
         // Populate left tile with telemetry
         const leftContent = document.getElementById('mission-telemetry-content');
         if (leftContent && activeSatellite && telemetryData[activeSatellite]) {
             const t = telemetryData[activeSatellite];
            leftContent.innerHTML = `
                <div><strong>Altitude:</strong> ${t.altitude?.toFixed(2) ?? 'N/A'} km</div>
                <div><strong>Velocity:</strong> ${t.velocity?.toFixed(2) ?? 'N/A'} km/s</div>
                <div><strong>Inclination:</strong> ${t.inclination?.toFixed(2) ?? 'N/A'}°</div>
                <div><strong>Lat/Lon:</strong> ${t.latitude?.toFixed(2) ?? 'N/A'}, ${t.longitude?.toFixed(2) ?? 'N/A'}</div>
                <div><strong>Period:</strong> ${t.period?.toFixed(2) ?? 'N/A'} min</div>
                <hr>
                <div><strong>Power:</strong> ${t.systems?.power?.value ?? t.systems?.power?.battery ?? 'N/A'}%</div>
                <div><strong>Thermal:</strong> ${t.systems?.thermal?.value ?? t.systems?.thermal?.core_temp ?? 'N/A'}°C</div>
                <div><strong>Comms:</strong> ${t.systems?.comms?.signal_strength ?? 'N/A'}</div>
                <div class="telemetry-placeholder">(Graphs and subsystem data coming soon)</div>
            `;
         } else if (leftContent) {
             leftContent.innerHTML = '<div class="telemetry-placeholder">No telemetry data available.</div>';
         }        // Don't replace the model canvas - it's now handled by the 3D model viewer
        // The modelCanvas is created in HTML and managed by initModelViewer()
     }
 }
