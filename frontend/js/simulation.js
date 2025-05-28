import { TIME_ACCELERATION } from './constants.js';
import { updateSatellitePosition } from './satellites.js';
import { updateTelemetryUI } from './telemetry.js';

export function startSimulationLoop(scene, satelliteData, orbitalElements, simulationStartTime, timeMultiplier, advancedTexture, activeSatellite, telemetryData) {
    // Initialize simulation time from start time or use current time
    let simulationTime = simulationStartTime || new Date();
    updateTimeDisplay(simulationTime);
    
    // Frame counter for performance optimizations
    let frameCounter = 0;
    let activeSatelliteList = [];
    
    // Pre-filter the satellite list for better performance
    for (const satName in orbitalElements) {
        if (satName !== 'metadata') {
            activeSatelliteList.push(satName);
        }
    }
    
    // Use a less frequent update for better performance
    scene.registerBeforeRender(() => {
        // Run only every 3 frames to reduce CPU load
        if (frameCounter++ % 3 !== 0) {
            return;
        }
        
        // Calculate time increment based on time multiplier
        const timeIncrement = timeMultiplier * TIME_ACCELERATION * 1000 * 3; // Adjust for the frame skip
        
        // Advance simulation time
        simulationTime = new Date(simulationTime.getTime() + timeIncrement);
        
        // Only process visible satellites or limit to 5 at a time for smoother loading
        const visibleSats = frameCounter < 120 ? 
            activeSatelliteList.slice(0, Math.min(Math.floor(frameCounter/12), activeSatelliteList.length)) : 
            activeSatelliteList;
        
        // Update positions
        for (const satName of visibleSats) {
            updateSatellitePosition(satName, 0, orbitalElements, simulationTime, scene);
        }
        
        // Only update time display every 30 frames for performance
        if (frameCounter % 30 === 0) {
            updateTimeDisplay(simulationTime);
            
            // Update telemetry UI if a satellite is active
            if (activeSatellite) {
                updateTelemetryUI(activeSatellite, telemetryData);
            }
        }
    });
    
    return simulationTime;
}

export function updateTimeDisplay(simulationTime) {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        // Show date and time in a clean format
        const options = { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        };
        timeElement.textContent = simulationTime.toLocaleDateString('en-US', options) + ' UTC';
    }
}
