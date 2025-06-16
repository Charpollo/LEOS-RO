import { templateManager } from './template-manager.js';

// Telemetry UI Functions
export function showAdvancedTelemetry(telemetry) {
    if (!telemetry) return;
    
    const dashboard = document.getElementById('advanced-telemetry');
    const content = document.getElementById('dashboard-content');
    
    if (dashboard && content) {
        dashboard.style.display = 'block';
        updateTelemetryDashboard(telemetry);
    }
}

export function hideAdvancedTelemetry() {
    const dashboard = document.getElementById('advanced-telemetry');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
}

// Status message display
export function showStatusMessage(message, duration = 2000) {
    let statusElement = document.getElementById('status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'status-message';
        statusElement.className = 'status-message';
        document.getElementById('renderCanvas-container').appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.classList.add('visible');
    
    setTimeout(() => {
        statusElement.classList.remove('visible');
    }, duration);
}

class UIManager {
    constructor() {
        this.init();
    }

    async init() {
        await templateManager.initialize();
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Cache DOM elements
        this.elements = {
            telemetryDashboard: document.getElementById('advanced-telemetry'),
            telemetryContent: document.getElementById('telemetry-data'),
            satelliteInfo: document.getElementById('satellite-info'),
            missionClock: document.getElementById('mission-clock'),
            statusMessage: document.getElementById('status-message'),
            debugContent: document.getElementById('debugContent')
        };
    }

    setupEventListeners() {
        // Graph control buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.graph-btn')) {
                this.handleGraphButtonClick(e.target);
            }
        });
    }

    updateTelemetryDashboard(telemetry) {
        if (!this.elements.telemetryDashboard) return;

        if (!telemetry) {
            this.elements.telemetryDashboard.innerHTML = '<div class="no-data">No telemetry data available</div>';
            return;
        }

        // Clear existing content
        this.elements.telemetryDashboard.innerHTML = '';

        // Add dashboard template
        const dashboard = templateManager.getTemplate('telemetry-dashboard');
        this.elements.telemetryDashboard.appendChild(dashboard);

        // Get dashboard content container
        const content = this.elements.telemetryDashboard.querySelector('.dashboard-content');

        // Add all telemetry cards
        const cards = [
            { id: 'orbital-card', data: telemetry },
            { id: 'position-card', data: telemetry },
            { id: 'velocity-card', data: telemetry },
            { id: 'mission-card', data: telemetry.missionParameters },
            { id: 'subsystems-card', data: telemetry.subsystems },
            { id: 'graph-card', data: { graphData: telemetry.graphData } }
        ];

        cards.forEach(({ id, data }) => {
            if (id === 'mission-card' && !data) return; // Skip mission card if no mission data
            const template = templateManager.getTemplate(id, data);
            content.appendChild(template);
        });

        this.initializeGraph();
        this.startTelemetryUpdates();
    }

    updateBasicTelemetry(telemetry) {
        if (!this.elements.telemetryContent || !telemetry) return;

        const items = [
            { label: 'Altitude', value: `${telemetry.altitude.toFixed(2)} km` },
            { label: 'Velocity', value: `${telemetry.speed.toFixed(2)} km/s` },
            { label: 'Position', value: `[${telemetry.position.x.toFixed(1)}, ${telemetry.position.y.toFixed(1)}, ${telemetry.position.z.toFixed(1)}]` }
        ];

        const html = items.map(item => `
            <telemetry-item
                label="${item.label}"
                value="${item.value}"
                unit="">
            </telemetry-item>
        `).join('');

        this.elements.telemetryContent.innerHTML = html;
    }

    updateMissionClock(time) {
        if (!this.elements.missionClock) return;
        
        this.elements.missionClock.textContent = time.toISOString().split('T')[1].split('.')[0] + ' UTC';
    }

    addDebugLogEntry(message, level, timestamp) {
        if (!this.elements.debugContent) return;

        const entry = document.createElement('div');
        entry.className = `debug-entry debug-${level.toLowerCase()}`;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'debug-time';
        timeSpan.textContent = timestamp;
        
        const msgSpan = document.createElement('span');
        msgSpan.textContent = message;
        
        entry.appendChild(timeSpan);
        entry.appendChild(msgSpan);
        
        this.elements.debugContent.prepend(entry);
        
        // Limit entries
        while (this.elements.debugContent.children.length > 100) {
            this.elements.debugContent.removeChild(this.elements.debugContent.lastChild);
        }
    }

    initializeGraph() {
        // Initialize telemetry graph (placeholder for now)
        const canvas = document.getElementById('telemetry-canvas');
        if (!canvas) return;

        // Graph initialization code would go here
        // This would be implemented based on your preferred graphing library
    }

    handleGraphButtonClick(button) {
        // Remove active class from all buttons
        document.querySelectorAll('.graph-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to clicked button
        button.classList.add('active');

        // Update graph based on selected parameter
        const parameter = button.dataset.param;
        this.updateGraph(parameter);
    }

    updateGraph(parameter) {
        // Update graph based on selected parameter
        // This would be implemented based on your graphing needs
    }

    /**
     * Hide the advanced telemetry dashboard
     */
    hideAdvancedTelemetry() {
        if (this.elements && this.elements.telemetryDashboard) {
            this.elements.telemetryDashboard.style.display = 'none';
        }
    }
}

// Create and export a singleton instance
export const uiManager = new UIManager();
