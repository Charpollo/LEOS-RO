/**
 * Setup Engineering Panel for RED ORBIT
 * This file initializes the Engineering Panel without modifying app.js
 */

import { EngineeringPanel } from './engineering-panel.js';

// Initialize when window loads
window.addEventListener('load', () => {
    // Wait a bit for everything to be ready
    setTimeout(() => {
        console.log('Initializing Engineering Panel...');
        
        // Remove UI clutter
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
            '.telemetry-item'
        ];
        
        elementsToRemove.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) el.remove();
            });
        });
        
        // Initialize the Engineering Panel
        const panel = new EngineeringPanel();
        window.redOrbitEngineeringPanel = panel;
        
        console.log('Engineering Panel ready - Press "O" to open');
    }, 1000);
});

export default EngineeringPanel;