/**
 * RED ORBIT Clean UI Initialization
 * Removes clutter and initializes Engineering Panel
 * Following flight-rules for modularity
 */

import { initEngineeringPanel } from './engineering-panel.js';

export function initCleanUI() {
    // Remove all telemetry and alert panels
    const elementsToRemove = [
        '#telemetry-panel',
        '#telemetry-dashboard',
        '#alert-banner',
        '#statistics-overlay',
        '#conjunction-list',
        '#risk-matrix',
        '#debris-counter',
        '#ground-dashboard',
        '.telemetry-card',
        '.telemetry-item',
        '#nav-sidebar',
        '#nav-collapse-btn',
        '#main-content'
    ];
    
    elementsToRemove.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
    });
    
    // Initialize Engineering Panel
    const engineeringPanel = initEngineeringPanel();
    
    // Listen for scenario loading events
    window.addEventListener('load-scenario', (event) => {
        const { type, count, targetId } = event.detail;
        console.log(`Loading scenario: ${type} with ${count || 'default'} objects`);
        
        // Dispatch to physics engine
        window.dispatchEvent(new CustomEvent('physics-scenario', { 
            detail: event.detail 
        }));
    });
    
    // Listen for simulation reset
    window.addEventListener('reset-simulation', () => {
        console.log('Resetting simulation');
        // Clear all objects and restart
        window.dispatchEvent(new CustomEvent('physics-reset'));
    });
    
    // Make panel accessible globally for data streaming
    window.redOrbitEngineeringPanel = engineeringPanel;
    
    // Export telemetry collection function for WebSocket streaming
    window.collectRedOrbitTelemetry = () => {
        const telemetry = {
            timestamp: new Date().toISOString(),
            data: {
                objects: []
            }
        };
        
        // Collect from physics engine if available
        if (window.redOrbitPhysics) {
            const physicsData = window.redOrbitPhysics.getAllObjectData();
            telemetry.data.objects = physicsData;
        }
        
        return telemetry;
    };
    
    console.log('RED ORBIT Clean UI initialized - Press "O" to open Engineering Panel');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCleanUI);
} else {
    // DOM already loaded
    setTimeout(initCleanUI, 100);
}