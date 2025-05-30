import { TIME_ACCELERATION } from './constants.js';
import { updateSatellitePosition } from './satellites.js';
import { updateTelemetryUI } from './telemetry.js';

let isUTC = true;
let currentSimTime = null;
export function toggleTimeMode() {
    isUTC = !isUTC;
}
export function getCurrentSimTime() {
    return currentSimTime;
}

export function startSimulationLoop(scene, satelliteData, orbitalElements, simulationStartTime, getTimeMultiplier, advancedTexture, activeSatellite, telemetryData) {
    // Initialize simulation time from start time or use current time
    let simulationTime = simulationStartTime || new Date();
    currentSimTime = simulationTime;
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
    // --- Accurate time scaling ---
    let lastFrameTime = performance.now();
    // Use a less frequent update for better performance
    scene.registerBeforeRender(() => {
        // Run only every 3 frames to reduce CPU load
        if (frameCounter++ % 3 !== 0) {
            return;
        }
        const now = performance.now();
        const deltaRealSeconds = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        const timeMultiplier = getTimeMultiplier();
        // Advance simulation time by real elapsed time * timeMultiplier * TIME_ACCELERATION
        const timeIncrement = timeMultiplier * TIME_ACCELERATION * deltaRealSeconds * 1000; // ms
        simulationTime = new Date(simulationTime.getTime() + timeIncrement);
        currentSimTime = simulationTime;
        
        // Only process visible satellites or limit to 5 at a time for smoother loading
        const visibleSats = frameCounter < 120 ? 
            activeSatelliteList.slice(0, Math.min(Math.floor(frameCounter/12), activeSatelliteList.length)) : 
            activeSatelliteList;
        
        // Update positions
        for (const satName of visibleSats) {
            updateSatellitePosition(satName, 0, orbitalElements, simulationTime, scene, advancedTexture);
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
    const el = document.getElementById('current-time');
    if (!el) return;
    const options = {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    };
    if (isUTC) { options.timeZone = 'UTC'; }
    el.textContent = simulationTime.toLocaleDateString('en-US', options)
                    + (isUTC ? ' UTC' : ' Local');
}
