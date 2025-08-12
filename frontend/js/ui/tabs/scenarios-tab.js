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
                icon: '📡'
            },
            starlink_full: {
                name: 'Starlink Full',
                description: 'Complete Starlink constellation',
                objects: 42000,
                icon: '🛰️'
            },
            megaconstellations: {
                name: 'Megaconstellations',
                description: 'All planned satellite constellations',
                objects: 91000,
                icon: '🌐'
            },
            kessler_syndrome: {
                name: 'Kessler Syndrome',
                description: 'Cascading collision scenario',
                objects: 200000,
                icon: '💥'
            },
            historical_events: {
                name: 'Historical Events',
                description: 'Fengyun, Cosmos collisions',
                objects: 50000,
                icon: '📚'
            },
            stress_test: {
                name: 'GPU Stress Test',
                description: 'Maximum capacity test',
                objects: 1000000,
                icon: '🔥'
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
                <div style="font-size: 24px; margin-bottom: 10px;">${scenario.icon}</div>
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
    
    onActivate() {
        console.log('[SCENARIOS TAB] Activated');
    }
}