/**
 * Scenario Manager
 * Manages pre-defined space scenarios for simulation
 * Following flight rules for realistic orbital distributions
 */

export class ScenarioManager {
    constructor() {
        // Scenario definitions with realistic distributions
        this.scenarios = {
            'Current (2025)': {
                name: 'Current (2025)',
                satellites: 9500,
                debris: 34000,
                distribution: {
                    LEO: { satellites: 7500, debris: 30000, altRange: [200, 2000] },
                    MEO: { satellites: 1500, debris: 3000, altRange: [2000, 35786] },
                    GEO: { satellites: 450, debris: 900, altRange: [35786, 35786] },
                    HEO: { satellites: 50, debris: 100, altRange: [35786, 100000] }
                }
            },
            'Projected 2035': {
                name: 'Projected 2035',
                satellites: 100000,
                debris: 500000,
                distribution: {
                    LEO: { satellites: 85000, debris: 450000, altRange: [200, 2000] },
                    MEO: { satellites: 10000, debris: 35000, altRange: [2000, 35786] },
                    GEO: { satellites: 4500, debris: 12000, altRange: [35786, 35786] },
                    HEO: { satellites: 500, debris: 3000, altRange: [35786, 100000] }
                }
            },
            'Starlink Full': {
                name: 'Starlink Full',
                satellites: 42000,
                debris: 0,
                distribution: {
                    LEO: { satellites: 42000, debris: 0, altRange: [540, 570] }, // Starlink shells
                    MEO: { satellites: 0, debris: 0, altRange: [2000, 35786] },
                    GEO: { satellites: 0, debris: 0, altRange: [35786, 35786] },
                    HEO: { satellites: 0, debris: 0, altRange: [35786, 100000] }
                }
            },
            'Chinese ASAT Test': {
                name: 'Chinese ASAT Test',
                satellites: 9500,
                debris: 3000000,
                distribution: {
                    LEO: { satellites: 7500, debris: 2800000, altRange: [800, 900] }, // ASAT debris cloud
                    MEO: { satellites: 1500, debris: 150000, altRange: [2000, 35786] },
                    GEO: { satellites: 450, debris: 40000, altRange: [35786, 35786] },
                    HEO: { satellites: 50, debris: 10000, altRange: [35786, 100000] }
                }
            },
            'Kessler Cascade': {
                name: 'Kessler Cascade',
                satellites: 5000,
                debris: 8000000,
                distribution: {
                    LEO: { satellites: 3000, debris: 7500000, altRange: [200, 2000] },
                    MEO: { satellites: 1500, debris: 400000, altRange: [2000, 35786] },
                    GEO: { satellites: 450, debris: 90000, altRange: [35786, 35786] },
                    HEO: { satellites: 50, debris: 10000, altRange: [35786, 100000] }
                }
            },
            'Blue Origin Kuiper': {
                name: 'Blue Origin Kuiper',
                satellites: 3236,
                debris: 0,
                distribution: {
                    LEO: { satellites: 3236, debris: 0, altRange: [590, 630] }, // Kuiper shells
                    MEO: { satellites: 0, debris: 0, altRange: [2000, 35786] },
                    GEO: { satellites: 0, debris: 0, altRange: [35786, 35786] },
                    HEO: { satellites: 0, debris: 0, altRange: [35786, 100000] }
                }
            }
        };
        
        this.currentScenario = null;
    }
    
    /**
     * Load a scenario by name
     * @param {string} scenarioName - Name of the scenario to load
     * @returns {Object} Scenario configuration
     */
    loadScenario(scenarioName) {
        const scenario = this.scenarios[scenarioName];
        if (!scenario) {
            console.error(`[ScenarioManager] Unknown scenario: ${scenarioName}`);
            return null;
        }
        
        this.currentScenario = scenario;
        console.log(`[ScenarioManager] Loading scenario: ${scenarioName}`);
        console.log(`  Satellites: ${scenario.satellites.toLocaleString()}`);
        console.log(`  Debris: ${scenario.debris.toLocaleString()}`);
        
        return scenario;
    }
    
    /**
     * Generate orbital parameters for objects based on scenario
     * @param {Object} scenario - Scenario configuration
     * @param {number} objectIndex - Index of the object
     * @param {boolean} isDebris - Whether this is debris or satellite
     * @returns {Object} Orbital parameters
     */
    generateOrbitalParams(scenario, objectIndex, isDebris = false) {
        if (!scenario) scenario = this.currentScenario;
        if (!scenario) return this.generateRandomOrbitalParams();
        
        // Determine which orbit class this object belongs to
        let totalObjects = isDebris ? scenario.debris : scenario.satellites;
        let accumulator = 0;
        let orbitClass = 'LEO';
        let classData = null;
        
        for (const [className, data] of Object.entries(scenario.distribution)) {
            const count = isDebris ? data.debris : data.satellites;
            accumulator += count;
            if (objectIndex < accumulator) {
                orbitClass = className;
                classData = data;
                break;
            }
        }
        
        if (!classData) {
            classData = scenario.distribution.LEO;
        }
        
        // Generate parameters based on orbit class
        const [minAlt, maxAlt] = classData.altRange;
        const altitude = minAlt + Math.random() * (maxAlt - minAlt);
        const semiMajorAxis = 6371 + altitude; // Earth radius + altitude
        
        // Random orbital elements
        const inclination = this.getInclinationForOrbitClass(orbitClass);
        const eccentricity = this.getEccentricityForOrbitClass(orbitClass);
        const argumentOfPeriapsis = Math.random() * 360;
        const rightAscension = Math.random() * 360;
        const meanAnomaly = Math.random() * 360;
        
        return {
            semiMajorAxis,
            eccentricity,
            inclination,
            argumentOfPeriapsis,
            rightAscension,
            meanAnomaly,
            orbitClass,
            altitude
        };
    }
    
    /**
     * Get appropriate inclination for orbit class
     * @param {string} orbitClass - LEO, MEO, GEO, or HEO
     * @returns {number} Inclination in degrees
     */
    getInclinationForOrbitClass(orbitClass) {
        switch(orbitClass) {
            case 'LEO':
                // Mix of polar, sun-synchronous, and ISS-like orbits
                const type = Math.random();
                if (type < 0.3) return 90 + (Math.random() - 0.5) * 20; // Polar
                if (type < 0.6) return 98 + (Math.random() - 0.5) * 5; // Sun-sync
                return 51.6 + (Math.random() - 0.5) * 10; // ISS-like
                
            case 'MEO':
                // GPS-like orbits
                return 55 + (Math.random() - 0.5) * 10;
                
            case 'GEO':
                // Equatorial
                return Math.random() * 5;
                
            case 'HEO':
                // Molniya-like
                return 63.4 + (Math.random() - 0.5) * 10;
                
            default:
                return Math.random() * 180;
        }
    }
    
    /**
     * Get appropriate eccentricity for orbit class
     * @param {string} orbitClass - LEO, MEO, GEO, or HEO
     * @returns {number} Eccentricity
     */
    getEccentricityForOrbitClass(orbitClass) {
        switch(orbitClass) {
            case 'LEO':
            case 'MEO':
            case 'GEO':
                // Mostly circular
                return Math.random() * 0.01;
                
            case 'HEO':
                // Highly elliptical
                return 0.7 + Math.random() * 0.2;
                
            default:
                return Math.random() * 0.1;
        }
    }
    
    /**
     * Generate random orbital parameters (fallback)
     * @returns {Object} Orbital parameters
     */
    generateRandomOrbitalParams() {
        const altitude = 200 + Math.random() * 35586; // LEO to GEO
        return {
            semiMajorAxis: 6371 + altitude,
            eccentricity: Math.random() * 0.1,
            inclination: Math.random() * 180,
            argumentOfPeriapsis: Math.random() * 360,
            rightAscension: Math.random() * 360,
            meanAnomaly: Math.random() * 360,
            orbitClass: altitude < 2000 ? 'LEO' : altitude < 35786 ? 'MEO' : 'GEO',
            altitude
        };
    }
    
    /**
     * Get scenario statistics
     * @returns {Object} Current scenario stats
     */
    getStats() {
        if (!this.currentScenario) {
            return {
                name: 'None',
                satellites: 0,
                debris: 0,
                total: 0
            };
        }
        
        return {
            name: this.currentScenario.name,
            satellites: this.currentScenario.satellites,
            debris: this.currentScenario.debris,
            total: this.currentScenario.satellites + this.currentScenario.debris,
            distribution: this.currentScenario.distribution
        };
    }
}

// Export singleton instance
export const scenarioManager = new ScenarioManager();