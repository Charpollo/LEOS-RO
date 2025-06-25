/**
 * LEOS Frontend-Only Data Loader
 * Replaces backend API calls with static data loading
 */

export class DataLoader {
    constructor() {
        this.satelliteData = null;
        this.telemetryData = new Map();
    }

    /**
     * Load satellite orbital elements from static JSON file
     */
    async loadSatelliteData() {
        try {
            console.log('Attempting to load satellite data from /data/satellite_data.json');
            const response = await fetch('/data/satellite_data.json');
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                console.warn(`Failed to load satellite data: ${response.status} - ${response.statusText}`);
                console.log('Falling back to hardcoded data');
                return this.getFallbackSatelliteData();
            }
            
            const text = await response.text();
            console.log('Raw response text (first 100 chars):', text.substring(0, 100));
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.log('Using fallback data instead');
                return this.getFallbackSatelliteData();
            }
            
            this.satelliteData = data;
            console.log('Successfully loaded satellite data:', Object.keys(data.satellites || {}));
            return this.satelliteData;
        } catch (error) {
            console.error('Error loading satellite data:', error);
            // Fallback to hardcoded data
            console.log('Using fallback satellite data');
            return this.getFallbackSatelliteData();
        }
    }

    /**
     * Fallback satellite data if JSON file is not available
     */
    getFallbackSatelliteData() {
        console.log('Using fallback satellite data');
        const fallbackData = {
            satellites: {
                "CRTS1": {
                    name: "CRTS1",
                    semi_major_axis_km: 6791.0,
                    eccentricity: 0.001,
                    inclination_deg: 97.4,
                    raan_deg: 0.0,
                    argument_of_perigee_deg: 0.0,
                    mean_anomaly_deg: 0.0,
                    epoch: "2025-01-01T00:00:00Z",
                    model_file: "crts_satellite.glb",
                    color: "#00CCFF"
                },
                "Bulldog": {
                    name: "Bulldog",
                    semi_major_axis_km: 6871.0,
                    eccentricity: 0.002,
                    inclination_deg: 98.2,
                    raan_deg: 45.0,
                    argument_of_perigee_deg: 90.0,
                    mean_anomaly_deg: 180.0,
                    epoch: "2025-01-01T00:00:00Z",
                    model_file: "bulldog_sat.glb",
                    color: "#FF6600"
                }
            },
            metadata: {
                simulation_start: "2025-01-01T00:00:00Z",
                description: "Fallback orbital elements for LEOS frontend-only visualization"
            }
        };
        
        this.satelliteData = fallbackData;
        return fallbackData;
    }

    /**
     * Load telemetry data from JSONL files
     * This demonstrates how to load the telemetry data you provided
     */
    async loadTelemetryData(satelliteName, fileIndex = 0) {
        try {
            // Construct filename based on satellite name and file index
            const filename = `${satelliteName}_${String(fileIndex).padStart(6, '0')}.jsonl`;
            const response = await fetch(`/data/telemetry/${filename}`);
            
            if (!response.ok) {
                console.warn(`Telemetry file not found: ${filename}`);
                return null;
            }

            const text = await response.text();
            const lines = text.trim().split('\n');
            const telemetryPoints = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.warn('Invalid JSON line in telemetry:', line);
                    return null;
                }
            }).filter(point => point !== null);

            this.telemetryData.set(satelliteName, telemetryPoints);
            return telemetryPoints;
        } catch (error) {
            console.error(`Error loading telemetry for ${satelliteName}:`, error);
            return null;
        }
    }

    /**
     * Generate mock telemetry data for satellites if no files available
     */
    generateMockTelemetry(satelliteName, orbitalElements, duration_hours = 24) {
        const telemetryPoints = [];
        const timeStep = 60; // 1 minute intervals
        const totalPoints = (duration_hours * 3600) / timeStep;
        
        const startTime = new Date(orbitalElements.epoch || '2025-01-01T00:00:00Z');
        
        for (let i = 0; i < totalPoints; i++) {
            const timestamp = new Date(startTime.getTime() + i * timeStep * 1000);
            
            // Simple orbital calculation for demonstration
            const meanMotion = Math.sqrt(398600.4418 / Math.pow(orbitalElements.semi_major_axis_km, 3));
            const meanAnomaly = (orbitalElements.mean_anomaly_deg + meanMotion * i * timeStep / 60) % 360;
            
            // Convert to radians
            const M = meanAnomaly * Math.PI / 180;
            const e = orbitalElements.eccentricity;
            const i = orbitalElements.inclination_deg * Math.PI / 180;
            const omega = orbitalElements.argument_of_perigee_deg * Math.PI / 180;
            const Omega = orbitalElements.raan_deg * Math.PI / 180;
            
            // Solve Kepler's equation (simplified)
            let E = M;
            for (let j = 0; j < 5; j++) {
                E = M + e * Math.sin(E);
            }
            
            // True anomaly
            const nu = 2 * Math.atan2(
                Math.sqrt(1 + e) * Math.sin(E / 2),
                Math.sqrt(1 - e) * Math.cos(E / 2)
            );
            
            // Radius
            const r = orbitalElements.semi_major_axis_km * (1 - e * Math.cos(E));
            
            // Position in orbital plane
            const x_orbital = r * Math.cos(nu);
            const y_orbital = r * Math.sin(nu);
            const z_orbital = 0;
            
            // Rotate to Earth-centered inertial frame
            const x_eci = x_orbital * (Math.cos(omega) * Math.cos(Omega) - Math.sin(omega) * Math.sin(Omega) * Math.cos(i)) -
                          y_orbital * (Math.sin(omega) * Math.cos(Omega) + Math.cos(omega) * Math.sin(Omega) * Math.cos(i));
            
            const y_eci = x_orbital * (Math.cos(omega) * Math.sin(Omega) + Math.sin(omega) * Math.cos(Omega) * Math.cos(i)) +
                          y_orbital * (Math.cos(omega) * Math.cos(Omega) * Math.cos(i) - Math.sin(omega) * Math.sin(Omega));
            
            const z_eci = x_orbital * Math.sin(omega) * Math.sin(i) + y_orbital * Math.cos(omega) * Math.sin(i);
            
            // Convert to lat/lon (simplified)
            const altitude_km = Math.sqrt(x_eci * x_eci + y_eci * y_eci + z_eci * z_eci) - 6371.0;
            const latitude_deg = Math.asin(z_eci / (altitude_km + 6371.0)) * 180 / Math.PI;
            const longitude_deg = Math.atan2(y_eci, x_eci) * 180 / Math.PI;
            
            telemetryPoints.push({
                timestamp: timestamp.toISOString(),
                tick: i,
                latitude_deg: latitude_deg,
                longitude_deg: longitude_deg,
                altitude_km: altitude_km,
                velocity_kmps: Math.sqrt(398600.4418 / r),
                velocity_eci: [0, 0, 0], // Simplified
                position_eci: [x_eci, y_eci, z_eci]
            });
        }
        
        this.telemetryData.set(satelliteName, telemetryPoints);
        return telemetryPoints;
    }

    /**
     * Get orbital elements for all satellites
     */
    getOrbitalElements() {
        return this.satelliteData?.satellites || {};
    }

    /**
     * Get telemetry data for a specific satellite
     */
    getTelemetryData(satelliteName) {
        return this.telemetryData.get(satelliteName) || [];
    }

    /**
     * Get simulation metadata
     */
    getMetadata() {
        return this.satelliteData?.metadata || {
            simulation_start: new Date().toISOString(),
            description: "Frontend-only LEOS visualization"
        };
    }
}

// Create singleton instance
export const dataLoader = new DataLoader();
