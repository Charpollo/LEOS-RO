/**
 * Constellation Control Panel for Navigation System
 * Professional interface for satellite constellation management
 * Real physics, real data, no shortcuts
 */

export class ConstellationPanel {
    constructor() {
        this.manager = null;
        this.initialized = false;
        this.currentLoading = null;
        this.loadedCount = 0;
        this.fpsCounter = 60;
        
        // Performance monitoring
        this.performanceMonitor = {
            lastUpdate: Date.now(),
            frameCount: 0,
            fps: 60
        };
    }
    
    async initialize(constellationManager) {
        this.manager = constellationManager;
        
        // Wait for catalog to be loaded
        if (!this.manager.noradData) {
            await this.manager.loadFullCatalog();
        }
        
        this.setupEventListeners();
        this.updateStatistics();
        this.renderConstellationList();
        this.startPerformanceMonitoring();
        
        this.initialized = true;
        console.log('CONSTELLATION PANEL: Initialized');
    }
    
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('constellation-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterConstellations(e.target.value);
            });
        }
        
        // Control buttons
        const loadAllLEO = document.getElementById('btn-load-all-leo');
        if (loadAllLEO) {
            loadAllLEO.addEventListener('click', () => this.loadAllLEO());
        }
        
        const loadAllGEO = document.getElementById('btn-load-all-geo');
        if (loadAllGEO) {
            loadAllGEO.addEventListener('click', () => this.loadAllGEO());
        }
        
        const clearAll = document.getElementById('btn-clear-all');
        if (clearAll) {
            clearAll.addEventListener('click', () => this.clearAll());
        }
        
        const exportData = document.getElementById('btn-export-data');
        if (exportData) {
            exportData.addEventListener('click', () => this.exportData());
        }
    }
    
    updateStatistics() {
        if (!this.manager.catalogStats) return;
        
        const stats = this.manager.catalogStats;
        
        // Update stat displays
        this.updateElement('stat-total', stats.total);
        this.updateElement('stat-leo', stats.orbits.LEO);
        this.updateElement('stat-meo', stats.orbits.MEO);
        this.updateElement('stat-geo', stats.orbits.GEO);
    }
    
    renderConstellationList() {
        const container = document.getElementById('constellation-list-container');
        if (!container) return;
        
        const constellations = Array.from(this.manager.satelliteGroups.entries())
            .filter(([name, sats]) => sats.length > 0 && !name.startsWith('ALL_'))
            .sort((a, b) => b[1].length - a[1].length);
        
        let html = '';
        
        for (const [name, satellites] of constellations) {
            const isLoaded = this.manager.loadedConstellations.has(name);
            const statusClass = isLoaded ? 'loaded' : '';
            const statusText = isLoaded ? 'ACTIVE' : 'READY';
            const statusColor = isLoaded ? '#00ff00' : '#666';
            
            html += `
                <div class="constellation-item ${statusClass}" data-constellation="${name}">
                    <div>
                        <div style="color: #fff; font-size: 12px; font-weight: 600; margin-bottom: 3px;">
                            ${name}
                        </div>
                        <div style="color: #999; font-size: 10px;">
                            ${satellites.length} satellites
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: ${statusColor}; font-size: 10px; text-transform: uppercase;">
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Add click handlers
        container.querySelectorAll('.constellation-item').forEach(item => {
            item.addEventListener('click', () => {
                const constName = item.dataset.constellation;
                this.toggleConstellation(constName);
            });
        });
    }
    
    async toggleConstellation(name) {
        const item = document.querySelector(`[data-constellation="${name}"]`);
        
        if (this.manager.loadedConstellations.has(name)) {
            // Unload constellation
            this.manager.unloadConstellation(name);
            if (item) {
                item.classList.remove('loaded');
            }
            this.updateActiveConstellations();
            this.updateMetrics();
        } else {
            // Load constellation
            if (item) {
                item.classList.add('loading');
            }
            
            this.showLoadingProgress(name);
            
            await this.manager.loadConstellation(name, {
                batchSize: 100,
                delayMs: 50,
                onProgress: (progress) => {
                    this.updateLoadingProgress(progress);
                },
                onComplete: () => {
                    this.hideLoadingProgress();
                    if (item) {
                        item.classList.remove('loading');
                        item.classList.add('loaded');
                    }
                    this.updateActiveConstellations();
                    this.updateMetrics();
                }
            });
        }
    }
    
    updateActiveConstellations() {
        const container = document.getElementById('active-constellations');
        if (!container) return;
        
        const loaded = Array.from(this.manager.loadedConstellations.entries());
        
        if (loaded.length === 0) {
            container.innerHTML = `
                <div style="color: #666; text-align: center; padding: 20px;">
                    No constellations loaded
                </div>
            `;
            return;
        }
        
        let html = '';
        for (const [name, satellites] of loaded) {
            html += `
                <div style="padding: 10px; margin: 5px 0; background: rgba(0,255,0,0.1); 
                            border: 1px solid rgba(0,255,0,0.3); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #00ff00; font-size: 12px; font-weight: 600;">
                                ${name}
                            </div>
                            <div style="color: #999; font-size: 10px;">
                                ${satellites.length} satellites active
                            </div>
                        </div>
                        <button onclick="window.constellationPanel.unloadConstellation('${name}')"
                                style="padding: 4px 8px; background: rgba(255,0,0,0.2); 
                                       border: 1px solid rgba(255,0,0,0.5); color: #ff0000; 
                                       cursor: pointer; font-size: 10px; border-radius: 3px;">
                            REMOVE
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    showLoadingProgress(name) {
        const container = document.getElementById('loading-progress-container');
        const nameEl = document.getElementById('loading-constellation-name');
        
        if (container) {
            container.style.display = 'block';
        }
        if (nameEl) {
            nameEl.textContent = `Loading ${name}...`;
        }
        
        this.currentLoading = name;
    }
    
    updateLoadingProgress(progress) {
        const bar = document.getElementById('loading-progress-bar');
        const text = document.getElementById('loading-progress-text');
        
        if (bar) {
            bar.style.width = `${progress.percentage}%`;
        }
        if (text) {
            text.textContent = `${progress.loaded} / ${progress.total} satellites`;
        }
    }
    
    hideLoadingProgress() {
        const container = document.getElementById('loading-progress-container');
        if (container) {
            setTimeout(() => {
                container.style.display = 'none';
            }, 1000);
        }
        this.currentLoading = null;
    }
    
    filterConstellations(searchTerm) {
        const items = document.querySelectorAll('.constellation-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const name = item.dataset.constellation.toLowerCase();
            if (name.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    async loadAllLEO() {
        if (confirm('Loading ALL LEO satellites will significantly impact performance. Continue?')) {
            console.log('LOADING: All LEO satellites - this will take time');
            this.showLoadingProgress('ALL LEO');
            
            await this.manager.loadConstellation('ALL_LEO', {
                batchSize: 200,
                delayMs: 100,
                onProgress: (progress) => {
                    this.updateLoadingProgress(progress);
                },
                onComplete: () => {
                    this.hideLoadingProgress();
                    this.updateActiveConstellations();
                    this.updateMetrics();
                }
            });
        }
    }
    
    async loadAllGEO() {
        this.showLoadingProgress('ALL GEO');
        
        await this.manager.loadConstellation('ALL_GEO', {
            batchSize: 100,
            delayMs: 50,
            onProgress: (progress) => {
                this.updateLoadingProgress(progress);
            },
            onComplete: () => {
                this.hideLoadingProgress();
                this.updateActiveConstellations();
                this.updateMetrics();
            }
        });
    }
    
    clearAll() {
        if (confirm('Remove all loaded constellations?')) {
            this.manager.clearAll();
            this.renderConstellationList();
            this.updateActiveConstellations();
            this.updateMetrics();
        }
    }
    
    exportData() {
        const loaded = Array.from(this.manager.loadedConstellations.entries());
        const data = {
            timestamp: new Date().toISOString(),
            catalog_size: this.manager.noradData.length,
            loaded_constellations: loaded.map(([name, sats]) => ({
                name: name,
                count: sats.length
            })),
            total_loaded: loaded.reduce((sum, [_, sats]) => sum + sats.length, 0)
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `constellation_data_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    updateMetrics() {
        // Update loaded count
        let totalLoaded = 0;
        for (const [_, satellites] of this.manager.loadedConstellations) {
            totalLoaded += satellites.length;
        }
        
        this.loadedCount = totalLoaded;
        this.updateElement('metric-loaded', totalLoaded);
        
        // Estimate memory usage (rough approximation)
        const memoryMB = Math.round((totalLoaded * 0.05) * 10) / 10; // ~50KB per satellite
        this.updateElement('metric-memory', `${memoryMB} MB`);
    }
    
    startPerformanceMonitoring() {
        // Monitor FPS
        const updateFPS = () => {
            this.performanceMonitor.frameCount++;
            const now = Date.now();
            const delta = now - this.performanceMonitor.lastUpdate;
            
            if (delta >= 1000) {
                this.performanceMonitor.fps = Math.round((this.performanceMonitor.frameCount * 1000) / delta);
                this.performanceMonitor.frameCount = 0;
                this.performanceMonitor.lastUpdate = now;
                
                this.updateElement('metric-fps', this.performanceMonitor.fps);
                
                // Update system status based on FPS
                const statusEl = document.getElementById('system-status');
                if (statusEl) {
                    if (this.performanceMonitor.fps >= 50) {
                        statusEl.innerHTML = `
                            <span style="display: inline-block; width: 6px; height: 6px; 
                                       background: #00ff00; border-radius: 50%; margin-right: 5px;"></span>
                            OPERATIONAL
                        `;
                        statusEl.style.color = '#00ff00';
                    } else if (this.performanceMonitor.fps >= 30) {
                        statusEl.innerHTML = `
                            <span style="display: inline-block; width: 6px; height: 6px; 
                                       background: #ffcc00; border-radius: 50%; margin-right: 5px;"></span>
                            DEGRADED
                        `;
                        statusEl.style.color = '#ffcc00';
                    } else {
                        statusEl.innerHTML = `
                            <span style="display: inline-block; width: 6px; height: 6px; 
                                       background: #ff0000; border-radius: 50%; margin-right: 5px;"></span>
                            CRITICAL
                        `;
                        statusEl.style.color = '#ff0000';
                    }
                }
            }
            
            requestAnimationFrame(updateFPS);
        };
        
        requestAnimationFrame(updateFPS);
    }
    
    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }
    
    unloadConstellation(name) {
        this.manager.unloadConstellation(name);
        this.renderConstellationList();
        this.updateActiveConstellations();
        this.updateMetrics();
    }
}

// Export singleton instance
export const constellationPanel = new ConstellationPanel();

// Make available globally for button handlers
if (typeof window !== 'undefined') {
    window.constellationPanel = constellationPanel;
}