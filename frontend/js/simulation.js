import { TIME_ACCELERATION } from './constants.js';
import { updateTelemetryUI } from './telemetry.js';
import { updateCometTrails } from './satellites.js';
import { getSun } from './app.js';

let currentSimTime = null;
export function getCurrentSimTime() {
    // Return currentSimTime if available, otherwise return current time as fallback
    return currentSimTime || new Date();
}

export function setCurrentSimTime(newTime) {
    currentSimTime = new Date(newTime);
    // Update display immediately
    updateTimeDisplay(currentSimTime);
}

// Make it accessible globally for other modules
window.getCurrentSimTime = getCurrentSimTime;
window.setCurrentSimTime = setCurrentSimTime;

export function startSimulationLoop(scene, satelliteData, orbitalElements, simulationStartTime, getTimeMultiplier, advancedTexture, activeSatellite, telemetryData) {
    // Initialize simulation time from start time or use current time
    let simulationTime = simulationStartTime || new Date();
    
    // Initialize currentSimTime immediately
    currentSimTime = simulationTime;
    currentSimTime = simulationTime;
    // Update display according to persisted mode
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
        // Always run update each frame for smoother orbital paths
        frameCounter++;

        const now = performance.now();
        const deltaRealSeconds = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        const timeMultiplier = getTimeMultiplier();
        // Expose current time multiplier globally for trail control
        window.currentTimeMultiplier = timeMultiplier;
        // Advance simulation time by real elapsed time * timeMultiplier * TIME_ACCELERATION
        const timeIncrement = timeMultiplier * TIME_ACCELERATION * deltaRealSeconds * 1000; // ms
        simulationTime = new Date(simulationTime.getTime() + timeIncrement);
        currentSimTime = simulationTime;

        // Only process visible satellites or limit to 5 at a time for smoother loading
        const visibleSats = frameCounter < 120 ? 
            activeSatelliteList.slice(0, Math.min(Math.floor(frameCounter/12), activeSatelliteList.length)) : 
            activeSatelliteList;

        // Position updates are handled in app.js render observer

        // Always update time display every simulation frame
        updateTimeDisplay(simulationTime);

        // Update telemetry UI if a satellite is active (keep this at lower frequency if needed)
        if (activeSatellite && frameCounter % 30 === 0) {
            updateTelemetryUI(activeSatellite, telemetryData);
        }
        
        // Update comet trails if in comet trail mode
        updateCometTrails();
        
        // Update sun if it exists - DISABLED for simple sun
        // const sun = getSun();
        // if (sun) {
        //     sun.update(deltaRealSeconds);
        // }
    });
    
    return simulationTime;
}

export function updateTimeDisplay(simulationTime) {
    const el = document.getElementById('time-text');
    if (!el) return;
    
    // Safety check for null or undefined simulationTime
    if (!simulationTime || !(simulationTime instanceof Date)) {
        console.warn('Invalid simulationTime passed to updateTimeDisplay:', simulationTime);
        simulationTime = new Date(); // Fallback to current time
    }
    
    // Get timezone setting from global settings
    const timezone = window.displayTimezone || 'UTC';
    
    let timeString;
    let tzLabel;
    
    switch (timezone) {
        case 'local':
            timeString = simulationTime.toLocaleString();
            tzLabel = 'Local';
            break;
        case 'EST':
            timeString = simulationTime.toLocaleString('en-US', { timeZone: 'America/New_York' });
            tzLabel = 'EST';
            break;
        case 'CST':
            timeString = simulationTime.toLocaleString('en-US', { timeZone: 'America/Chicago' });
            tzLabel = 'CST';
            break;
        case 'MST':
            timeString = simulationTime.toLocaleString('en-US', { timeZone: 'America/Denver' });
            tzLabel = 'MST';
            break;
        case 'PST':
            timeString = simulationTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
            tzLabel = 'PST';
            break;
        case 'CET':
            timeString = simulationTime.toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
            tzLabel = 'CET';
            break;
        case 'JST':
            timeString = simulationTime.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });
            tzLabel = 'JST';
            break;
        case 'UTC':
        default:
            const iso = simulationTime.toISOString().replace('T', ' ').substring(0, 19);
            timeString = iso;
            tzLabel = 'UTC';
            break;
    }
    
    el.textContent = `${timeString} ${tzLabel}`;
}
