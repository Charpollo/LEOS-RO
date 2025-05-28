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
    // Check if advanced telemetry is open and update it
    const advancedTelemetry = document.getElementById('advanced-telemetry');
    if (advancedTelemetry && advancedTelemetry.style.display === 'block') {
        showAdvancedTelemetry(activeSatellite, telemetryData);
        return;
    }
    
    // Fallback for basic telemetry display (if telemetry-data element exists)
    const telemetryElement = document.getElementById('telemetry-data');
    if (!telemetryElement) {
        // If no basic telemetry element, just show advanced telemetry
        if (activeSatellite) {
            showAdvancedTelemetry(activeSatellite, telemetryData);
        }
        return;
    }
    
    if (!activeSatellite || !telemetryData[activeSatellite]) {
        telemetryElement.innerHTML = '<div class="no-data">No telemetry data available</div>';
        return;
    }
    
    const data = telemetryData[activeSatellite];
    let html = '';
    
    html += '<div class="telemetry-group">';
    html += '<h3>Position</h3>';
    html += createTelemetryItem('Altitude', `${data.altitude.toFixed(2)} km`);
    if (data.latitude !== undefined) html += createTelemetryItem('Latitude', `${data.latitude.toFixed(2)}°`);
    if (data.longitude !== undefined) html += createTelemetryItem('Longitude', `${data.longitude.toFixed(2)}°`);
    html += '</div>';
    
    html += '<div class="telemetry-group">';
    html += '<h3>Orbit</h3>';
    html += createTelemetryItem('Velocity', `${data.speed.toFixed(4)} km/s`);
    if (data.period !== undefined) html += createTelemetryItem('Period', `${data.period.toFixed(2)} min`);
    html += createTelemetryItem('Inclination', `${data.inclination.toFixed(2)}°`);
    html += '</div>';
    
    if (data.systems) {
        html += '<div class="telemetry-group">';
        html += '<h3>Systems</h3>';
        
        // Power systems
        if (data.systems.power) {
            html += createTelemetryItem('Battery', `${data.systems.power.battery}%`);
            html += createTelemetryItem('Solar Array', `${data.systems.power.solar_array}%`);
        }
        
        // Thermal systems
        if (data.systems.thermal) {
            html += createTelemetryItem('Core Temp', `${data.systems.thermal.core_temp}°C`);
        }
        
        // Comms systems
        if (data.systems.comms) {
            html += createTelemetryItem('Signal', `${data.systems.comms.signal_strength}%`);
        }
        
        html += '</div>';
    }
    
    telemetryElement.innerHTML = html;
}

export function showAdvancedTelemetry(activeSatellite, telemetryData) {
    if (!activeSatellite) {
        console.log('No active satellite selected');
        return;
    }
    
    document.getElementById('dashboard-title').textContent = `${activeSatellite} - Mission Control Dashboard`;
    
    const dashboardContent = document.getElementById('dashboard-content');
    dashboardContent.innerHTML = '';
    
    if (telemetryData[activeSatellite]) {
        const data = telemetryData[activeSatellite];
        
        // Create position panel
        const positionPanel = createAdvancedPanel('Position & Orbit');
        positionPanel.innerHTML = `
            <div class="data-grid">
                <div class="data-row">
                    <span class="data-label">Altitude:</span>
                    <span class="data-value">${data.altitude.toFixed(2)} km</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Latitude:</span>
                    <span class="data-value">${data.latitude.toFixed(2)}°</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Longitude:</span>
                    <span class="data-value">${data.longitude.toFixed(2)}°</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Velocity:</span>
                    <span class="data-value">${data.speed.toFixed(4)} km/s</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Orbit Period:</span>
                    <span class="data-value">${data.period.toFixed(2)} min</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Inclination:</span>
                    <span class="data-value">${data.inclination.toFixed(2)}°</span>
                </div>
            </div>
        `;
        dashboardContent.appendChild(positionPanel);
        
        // Add system panels
        if (data.systems) {
            // Power Systems Panel
            if (data.systems.power) {
                const powerPanel = createAdvancedPanel('Power Systems');
                powerPanel.innerHTML = `
                    <div class="data-grid">
                        <div class="data-row">
                            <span class="data-label">Battery Charge:</span>
                            <span class="data-value">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.systems.power.battery}%"></div>
                                </div>
                                ${data.systems.power.battery}%
                            </span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Solar Array Output:</span>
                            <span class="data-value">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.systems.power.solar_array}%"></div>
                                </div>
                                ${data.systems.power.solar_array}%
                            </span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Power Consumption:</span>
                            <span class="data-value">${data.systems.power.power_consumption} W</span>
                        </div>
                    </div>
                `;
                dashboardContent.appendChild(powerPanel);
            }
            
            // Thermal Systems Panel
            if (data.systems.thermal) {
                const thermalPanel = createAdvancedPanel('Thermal Systems');
                thermalPanel.innerHTML = `
                    <div class="data-grid">
                        <div class="data-row">
                            <span class="data-label">Core Temperature:</span>
                            <span class="data-value">${data.systems.thermal.core_temp}°C</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Solar Array Temperature:</span>
                            <span class="data-value">${data.systems.thermal.solar_array_temp}°C</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Battery Temperature:</span>
                            <span class="data-value">${data.systems.thermal.battery_temp}°C</span>
                        </div>
                    </div>
                `;
                dashboardContent.appendChild(thermalPanel);
            }
            
            // Communications Systems Panel
            if (data.systems.comms) {
                const commsPanel = createAdvancedPanel('Communications');
                commsPanel.innerHTML = `
                    <div class="data-grid">
                        <div class="data-row">
                            <span class="data-label">Signal Strength:</span>
                            <span class="data-value">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.systems.comms.signal_strength}%"></div>
                                </div>
                                ${data.systems.comms.signal_strength}%
                            </span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Data Rate:</span>
                            <span class="data-value">${data.systems.comms.data_rate} Kbps</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Packet Loss:</span>
                            <span class="data-value">${data.systems.comms.packet_loss}%</span>
                        </div>
                    </div>
                `;
                dashboardContent.appendChild(commsPanel);
            }
            
            // Specialized Sensors Panel (for CRTS satellites)
            if (data.systems.sensors) {
                const sensorsPanel = createAdvancedPanel('Specialized Sensors');
                sensorsPanel.innerHTML = `
                    <div class="data-grid">
                        <div class="data-row">
                            <span class="data-label">Radiation Detector:</span>
                            <span class="data-value">${data.systems.sensors.radiation_detector} μSv/h</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Magnetometer:</span>
                            <span class="data-value">${data.systems.sensors.magnetometer} nT</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Star Tracker Status:</span>
                            <span class="data-value">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.systems.sensors.star_tracker}%"></div>
                                </div>
                                ${data.systems.sensors.star_tracker}%
                            </span>
                        </div>
                    </div>
                `;
                dashboardContent.appendChild(sensorsPanel);
            }
            
            // Payload Panel (for BULLDOG satellites)
            if (data.systems.payload) {
                const payloadPanel = createAdvancedPanel('Payload Systems');
                payloadPanel.innerHTML = `
                    <div class="data-grid">
                        <div class="data-row">
                            <span class="data-label">Imaging System:</span>
                            <span class="data-value">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.systems.payload.imaging_system}%"></div>
                                </div>
                                ${data.systems.payload.imaging_system}%
                            </span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Storage Capacity:</span>
                            <span class="data-value">${data.systems.payload.storage_capacity} GB</span>
                        </div>
                        <div class="data-row">
                            <span class="data-label">Memory Usage:</span>
                            <span class="data-value">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.systems.payload.memory_usage}%"></div>
                                </div>
                                ${data.systems.payload.memory_usage}%
                            </span>
                        </div>
                    </div>
                `;
                dashboardContent.appendChild(payloadPanel);
            }
        }
    } else {
        dashboardContent.innerHTML = '<div class="no-data">No telemetry data available</div>';
    }
}

function createTelemetryItem(label, value) {
    return `<div class="telemetry-item">
        <span class="telemetry-label">${label}:</span>
        <span class="telemetry-value">${value}</span>
    </div>`;
}

function formatSystemName(name) {
    return name.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function createAdvancedPanel(title) {
    const panel = document.createElement('div');
    panel.className = 'dashboard-panel';
    
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.textContent = title;
    
    const content = document.createElement('div');
    content.className = 'panel-content';
    
    panel.appendChild(header);
    panel.appendChild(content);
    
    return panel;
}
