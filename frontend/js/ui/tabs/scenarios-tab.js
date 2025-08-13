/**
 * Scenarios Tab - Pre-configured simulation scenarios
 * Manages different satellite configurations and events
 */

export default class ScenariosTab {
    constructor() {
        this.container = null;
        this.scenarios = {
            current_catalog: {
                name: 'Current Catalog',
                description: 'Today\'s tracked objects from NORAD',
                objects: 30000,
                iconType: 'satellite'
            },
            starlink_full: {
                name: 'Starlink Full',
                description: 'Complete Starlink constellation',
                objects: 42000,
                iconType: 'constellation'
            },
            megaconstellations: {
                name: 'Megaconstellations',
                description: 'All planned satellite constellations',
                objects: 91000,
                iconType: 'globe'
            },
            kessler_syndrome: {
                name: 'Kessler Syndrome',
                description: 'Cascading collision scenario',
                objects: 200000,
                iconType: 'collision'
            },
            historical_events: {
                name: 'Historical Events',
                description: 'Fengyun, Cosmos collisions',
                objects: 50000,
                iconType: 'history'
            },
            stress_test: {
                name: 'GPU Stress Test',
                description: 'Maximum capacity test',
                objects: 1000000,
                iconType: 'performance'
            }
        };
    }
    
    render() {
        this.container = document.createElement('div');
        this.container.className = 'scenarios-tab-content';
        this.container.style.cssText = `
            padding: 20px;
            height: 100%;
            overflow-y: auto;
        `;
        
        // Title
        const title = document.createElement('h3');
        title.style.cssText = `
            color: #ff0000;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0 0 20px 0;
        `;
        title.textContent = 'SIMULATION SCENARIOS';
        this.container.appendChild(title);
        
        // Scenarios grid
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        `;
        
        Object.entries(this.scenarios).forEach(([key, scenario]) => {
            const card = document.createElement('div');
            card.className = 'scenario-card';
            card.style.cssText = `
                background: rgba(255, 0, 0, 0.05);
                border: 1px solid rgba(255, 0, 0, 0.3);
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s;
            `;
            
            card.innerHTML = `
                <div style="margin-bottom: 10px;">${this.getScenarioIcon(scenario.iconType)}</div>
                <div style="color: #ff0000; font-size: 13px; font-weight: bold; margin-bottom: 5px;">${scenario.name}</div>
                <div style="color: #999; font-size: 11px; margin-bottom: 10px;">${scenario.description}</div>
                <div style="color: #666; font-size: 10px;">Objects: ${scenario.objects.toLocaleString()}</div>
            `;
            
            card.addEventListener('click', () => this.loadScenario(key));
            card.addEventListener('mouseenter', () => {
                card.style.background = 'rgba(255, 0, 0, 0.1)';
                card.style.borderColor = '#ff0000';
                card.style.transform = 'translateY(-2px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.background = 'rgba(255, 0, 0, 0.05)';
                card.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                card.style.transform = 'translateY(0)';
            });
            
            grid.appendChild(card);
        });
        
        this.container.appendChild(grid);
        
        return this.container;
    }
    
    async loadScenario(scenarioKey) {
        const scenario = this.scenarios[scenarioKey];
        console.log(`[SCENARIOS TAB] Loading scenario: ${scenario.name}`);
        
        // TODO: Implement scenario loading logic
        if (window.gpuPhysicsEngine) {
            await window.gpuPhysicsEngine.populateSpace(scenario.objects);
        }
    }
    
    getScenarioIcon(iconType) {
        const icons = {
            satellite: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M19,2L17,4V7L14,10L12,8L8,12L10,14L7,17L4,14L2,16L5,19L8,16L10,18L14,14L16,16L20,12L17,9H20L22,7L19,2Z"/>
            </svg>`,
            constellation: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M12,2L14.39,8.26L21,9.27L16.5,13.14L17.82,19.68L12,16.27L6.18,19.68L7.5,13.14L3,9.27L9.61,8.26L12,2Z"/>
            </svg>`,
            globe: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>`,
            collision: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>`,
            history: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z"/>
            </svg>`,
            performance: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M13,2.03C17.73,2.5 21.5,6.25 21.95,11C22.5,16.5 18.5,21.38 13,21.93V19.93C16.64,19.5 19.5,16.61 19.96,12.97C20.5,8.58 17.39,4.59 13,4.05V2.05L13,2.03M11,2.06V4.06C9.57,4.26 8.22,4.84 7.1,5.74L5.67,4.26C7.19,3 9.05,2.25 11,2.06M4.26,5.67L5.69,7.1C4.8,8.23 4.24,9.58 4.05,11H2.05C2.25,9.04 3,7.19 4.26,5.67M2.06,13H4.06C4.24,14.42 4.81,15.77 5.69,16.9L4.27,18.33C3.03,16.81 2.26,14.96 2.06,13M7.1,18.37C8.23,19.25 9.58,19.82 11,20V22C9.04,21.79 7.18,21 5.67,19.74L7.1,18.37M12,16.5L7.5,12H11V8H13V12H16.5L12,16.5Z"/>
            </svg>`
        };
        return icons[iconType] || icons.satellite;
    }
    
    onActivate() {
        console.log('[SCENARIOS TAB] Activated');
    }
}