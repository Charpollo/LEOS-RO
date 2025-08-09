/**
 * RED ORBIT CONSTELLATION MANAGER
 * Full catalog loading with constellation selection
 * No shortcuts - REAL satellites, REAL physics
 */

export class ConstellationManager {
    constructor(scene, physicsEngine) {
        this.scene = scene;
        this.physicsEngine = physicsEngine;
        this.noradData = null;
        this.loadedConstellations = new Map();
        this.satelliteGroups = new Map();
        
        // Define constellation patterns
        this.constellationPatterns = {
            'STARLINK': /STARLINK/i,
            'ONEWEB': /ONEWEB/i,
            'IRIDIUM': /IRIDIUM/i,
            'GLOBALSTAR': /GLOBALSTAR/i,
            'ORBCOMM': /ORBCOMM/i,
            'PLANET': /PLANET|FLOCK|DOVE/i,
            'SPIRE': /SPIRE|LEMUR/i,
            'GPS': /NAVSTAR|GPS/i,
            'GLONASS': /COSMOS.*GLONASS|GLONASS/i,
            'GALILEO': /GALILEO/i,
            'BEIDOU': /BEIDOU/i,
            'GEOSTATIONARY': null, // Special case - by mean motion
            'ISS': /ISS|ZARYA/i,
            'DEBRIS': /DEB|R\/B|FRAGMENT/i,
            'CHINESE': /CZ-|TIANHE|TIANGONG|YAOGAN/i,
            'RUSSIAN': /COSMOS|METEOR|RESURS/i,
            'USA_MILITARY': /USA \d+|NROL|AEHF|WGS|MUOS|SBIRS/i,
            'WEATHER': /NOAA|METOP|GOES|HIMAWARI|METEOSAT/i,
            'SCIENCE': /HUBBLE|TERRA|AQUA|LANDSAT|SENTINEL/i,
            'AMATEUR': /AMSAT|HAM|CAS-|XW-|HO-|AO-|FO-|SO-|RS-/i,
            'CUBESATS': null, // Special case - by size/mass
            'ALL_LEO': null, // Mean motion > 11
            'ALL_MEO': null, // Mean motion 2-11
            'ALL_GEO': null, // Mean motion ~1
        };
        
        this.initializeUI();
    }
    
    async loadFullCatalog() {
        try {
            console.log('RED ORBIT: Loading FULL NORAD catalog...');
            const response = await fetch('/data/norad.json');
            if (!response.ok) throw new Error('Failed to fetch NORAD data');
            
            this.noradData = await response.json();
            console.log(`CATALOG: Loaded ${this.noradData.length} total satellites`);
            
            // Analyze the catalog
            this.analyzeCatalog();
            
            return this.noradData;
        } catch (error) {
            console.error('Failed to load NORAD catalog:', error);
            return null;
        }
    }
    
    analyzeCatalog() {
        const stats = {
            total: this.noradData.length,
            constellations: {},
            orbits: { LEO: 0, MEO: 0, GEO: 0, HEO: 0 },
            countries: {},
            active: 0,
            debris: 0
        };
        
        // Group satellites by constellation
        for (const sat of this.noradData) {
            const name = sat.OBJECT_NAME || '';
            
            // Count by constellation
            for (const [constName, pattern] of Object.entries(this.constellationPatterns)) {
                if (pattern && pattern.test(name)) {
                    stats.constellations[constName] = (stats.constellations[constName] || 0) + 1;
                    
                    // Store satellite in group
                    if (!this.satelliteGroups.has(constName)) {
                        this.satelliteGroups.set(constName, []);
                    }
                    this.satelliteGroups.get(constName).push(sat);
                }
            }
            
            // Special cases
            const meanMotion = parseFloat(sat.MEAN_MOTION);
            if (meanMotion) {
                if (meanMotion > 11) {
                    stats.orbits.LEO++;
                    if (!this.satelliteGroups.has('ALL_LEO')) {
                        this.satelliteGroups.set('ALL_LEO', []);
                    }
                    this.satelliteGroups.get('ALL_LEO').push(sat);
                } else if (meanMotion > 2) {
                    stats.orbits.MEO++;
                    if (!this.satelliteGroups.has('ALL_MEO')) {
                        this.satelliteGroups.set('ALL_MEO', []);
                    }
                    this.satelliteGroups.get('ALL_MEO').push(sat);
                } else if (Math.abs(meanMotion - 1) < 0.1) {
                    stats.orbits.GEO++;
                    if (!this.satelliteGroups.has('ALL_GEO')) {
                        this.satelliteGroups.set('ALL_GEO', []);
                    }
                    this.satelliteGroups.get('ALL_GEO').push(sat);
                    
                    // Also add to GEOSTATIONARY group
                    if (!this.satelliteGroups.has('GEOSTATIONARY')) {
                        this.satelliteGroups.set('GEOSTATIONARY', []);
                    }
                    this.satelliteGroups.get('GEOSTATIONARY').push(sat);
                }
            }
            
            // Debris detection
            if (/DEB|R\/B|FRAGMENT/i.test(name)) {
                stats.debris++;
            }
        }
        
        // Log statistics
        console.log('CATALOG ANALYSIS:');
        console.log('===================');
        console.log(`Total Objects: ${stats.total}`);
        console.log(`Debris: ${stats.debris}`);
        console.log('\nOrbits:');
        console.log(`  LEO: ${stats.orbits.LEO}`);
        console.log(`  MEO: ${stats.orbits.MEO}`);
        console.log(`  GEO: ${stats.orbits.GEO}`);
        console.log('\nMajor Constellations:');
        
        // Sort constellations by count
        const sortedConstellations = Object.entries(stats.constellations)
            .sort((a, b) => b[1] - a[1]);
        
        for (const [name, count] of sortedConstellations) {
            if (count > 0) {
                console.log(`  ${name}: ${count} satellites`);
            }
        }
        
        this.catalogStats = stats;
        this.updateUIWithStats();
    }
    
    async loadConstellation(constellationName, options = {}) {
        const {
            batchSize = 100,
            delayMs = 50,
            onProgress = null,
            onComplete = null
        } = options;
        
        if (!this.satelliteGroups.has(constellationName)) {
            console.warn(`Constellation ${constellationName} not found`);
            return [];
        }
        
        const satellites = this.satelliteGroups.get(constellationName);
        console.log(`CONSTELLATION: Loading ${constellationName}: ${satellites.length} satellites`);
        
        const loadedSats = [];
        const totalBatches = Math.ceil(satellites.length / batchSize);
        
        for (let i = 0; i < satellites.length; i += batchSize) {
            const batch = satellites.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            
            console.log(`  Loading batch ${batchNum}/${totalBatches} (${batch.length} satellites)`);
            
            // Process batch
            const batchResults = await this.processSatelliteBatch(batch, constellationName);
            loadedSats.push(...batchResults);
            
            // Update progress
            if (onProgress) {
                onProgress({
                    constellation: constellationName,
                    loaded: Math.min(i + batchSize, satellites.length),
                    total: satellites.length,
                    percentage: Math.min(100, ((i + batchSize) / satellites.length) * 100)
                });
            }
            
            // Update UI
            this.updateLoadingProgress(constellationName, i + batch.length, satellites.length);
            
            // Small delay to prevent blocking
            if (i + batchSize < satellites.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        // Mark constellation as loaded
        this.loadedConstellations.set(constellationName, loadedSats);
        
        console.log(`COMPLETE: ${constellationName} fully loaded: ${loadedSats.length} satellites`);
        
        if (onComplete) {
            onComplete(loadedSats);
        }
        
        return loadedSats;
    }
    
    async processSatelliteBatch(batch, constellationName) {
        const results = [];
        
        for (const sat of batch) {
            try {
                // Parse satellite data using TLE parser
                const parsed = this.physicsEngine.tleParser.simplifiedOrbitalCalculation(sat);
                
                if (parsed) {
                    // Create satellite in physics engine
                    const satData = {
                        id: sat.NORAD_CAT_ID,
                        name: sat.OBJECT_NAME,
                        constellation: constellationName,
                        position: parsed.position,
                        velocity: parsed.velocity,
                        meanMotion: parseFloat(sat.MEAN_MOTION),
                        inclination: parseFloat(sat.INCLINATION),
                        eccentricity: parseFloat(sat.ECCENTRICITY)
                    };
                    
                    // Add to physics engine
                    this.physicsEngine.addRealSatellite(satData);
                    results.push(satData);
                }
            } catch (error) {
                // Silent fail for individual satellites
            }
        }
        
        return results;
    }
    
    unloadConstellation(constellationName) {
        if (!this.loadedConstellations.has(constellationName)) {
            console.warn(`Constellation ${constellationName} not loaded`);
            return;
        }
        
        const satellites = this.loadedConstellations.get(constellationName);
        
        // Remove from physics engine
        for (const sat of satellites) {
            this.physicsEngine.removeSatellite(sat.id);
        }
        
        this.loadedConstellations.delete(constellationName);
        console.log(`UNLOADED: ${constellationName}`);
    }
    
    initializeUI() {
        // UI now handled by navigation panel system
        // Keep manager globally accessible
        window.constellationManager = this;
    }
    
    updateUIWithStats() {
        const statsDiv = document.getElementById('catalog-stats');
        if (statsDiv && this.catalogStats) {
            statsDiv.innerHTML = `
                <div style="color: #00ff00;">CATALOG LOADED</div>
                <div>Total: ${this.catalogStats.total} objects</div>
                <div>LEO: ${this.catalogStats.orbits.LEO} | MEO: ${this.catalogStats.orbits.MEO} | GEO: ${this.catalogStats.orbits.GEO}</div>
            `;
        }
        
        const listDiv = document.getElementById('constellation-list');
        if (listDiv) {
            const constellations = Array.from(this.satelliteGroups.entries())
                .filter(([name, sats]) => sats.length > 0 && !name.startsWith('ALL_'))
                .sort((a, b) => b[1].length - a[1].length);
            
            let html = '<div style="max-height: 350px; overflow-y: auto;">';
            
            for (const [name, sats] of constellations) {
                const isLoaded = this.loadedConstellations.has(name);
                const buttonStyle = isLoaded ? 
                    'background: rgba(0,255,0,0.2); border-color: #00ff00; color: #00ff00;' :
                    'background: rgba(255,255,255,0.1); border-color: #666; color: #fff;';
                
                html += `
                    <div style="margin: 5px 0; display: flex; align-items: center;">
                        <button onclick="window.constellationManager?.toggleConstellation('${name}')"
                                style="flex: 1; padding: 6px; ${buttonStyle} 
                                       border: 1px solid; cursor: pointer; 
                                       font-size: 10px; font-family: 'Orbitron', monospace;
                                       text-align: left;">
                            ${name} (${sats.length})
                        </button>
                    </div>
                `;
            }
            
            html += '</div>';
            listDiv.innerHTML = html;
        }
    }
    
    updateLoadingProgress(constellation, loaded, total) {
        const statusDiv = document.getElementById('loading-status');
        if (statusDiv) {
            const percentage = Math.round((loaded / total) * 100);
            statusDiv.innerHTML = `
                <div>Loading ${constellation}...</div>
                <div style="width: 100%; height: 4px; background: #333; margin: 5px 0;">
                    <div style="width: ${percentage}%; height: 100%; background: #00ff00;"></div>
                </div>
                <div>${loaded} / ${total} satellites (${percentage}%)</div>
            `;
        }
    }
    
    async toggleConstellation(name) {
        if (this.loadedConstellations.has(name)) {
            this.unloadConstellation(name);
        } else {
            await this.loadConstellation(name, {
                onProgress: (progress) => {
                    console.log(`Loading ${progress.constellation}: ${progress.percentage.toFixed(1)}%`);
                }
            });
        }
        this.updateUIWithStats();
    }
    
    async loadAllLEO() {
        console.log('WARNING: Loading ALL LEO satellites - this will take time!');
        await this.loadConstellation('ALL_LEO', {
            batchSize: 200,
            delayMs: 100
        });
    }
    
    clearAll() {
        for (const [name, _] of this.loadedConstellations) {
            this.unloadConstellation(name);
        }
        this.updateUIWithStats();
    }
}