/**
 * Data Source Manager UI Component
 * Provides interface for switching between telemetry data sources
 */

import { TelemetryDataManager, DEFAULT_SOURCES } from './data-sources.js';

export class DataSourceUI {
    constructor() {
        this.dataManager = new TelemetryDataManager();
        this.isVisible = false;
        this.setupDefaultSources();
        this.createUI();
        this.bindEvents();
    }

    setupDefaultSources() {
        // Register all default sources
        for (const [name, config] of Object.entries(DEFAULT_SOURCES)) {
            this.dataManager.registerSource(name, config);
        }

        // Subscribe to data manager events
        this.dataManager.subscribe((event, data) => {
            this.handleDataEvent(event, data);
        });
    }

    createUI() {
        // Create data source panel HTML
        const panel = document.createElement('div');
        panel.id = 'data-source-panel';
        panel.className = 'data-source-panel hidden';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>Telemetry Data Sources</h3>
                <button class="close-btn" onclick="dataSourceUI.hide()">&times;</button>
            </div>
            
            <div class="panel-content">
                <div class="current-source">
                    <h4>Current Source</h4>
                    <div id="current-source-info">No source selected</div>
                </div>

                <div class="available-sources">
                    <h4>Available Sources</h4>
                    <div id="source-list"></div>
                </div>

                <div class="custom-source">
                    <h4>Add Custom Source</h4>
                    <div class="source-type-tabs">
                        <button class="tab-btn active" data-type="rest-api">REST API</button>
                        <button class="tab-btn" data-type="websocket">WebSocket</button>
                        <button class="tab-btn" data-type="file-upload">Upload File</button>
                    </div>
                    
                    <div class="source-config">
                        <!-- Dynamic form content will be inserted here -->
                    </div>
                </div>

                <div class="source-status">
                    <h4>Connection Status</h4>
                    <div id="connection-status">Disconnected</div>
                    <div id="data-info"></div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;
        this.updateSourceList();
        this.setupCustomSourceForms();
    }

    updateSourceList() {
        const sourceList = document.getElementById('source-list');
        const sources = this.dataManager.getSourceStatus();
        
        sourceList.innerHTML = sources.map(source => `
            <div class="source-item ${source.isActive ? 'active' : ''} ${source.isConnected ? 'connected' : 'disconnected'}">
                <div class="source-info">
                    <div class="source-name">${source.name}</div>
                    <div class="source-type">${source.type}</div>
                    <div class="source-description">${this.getSourceDescription(source.name)}</div>
                </div>
                <div class="source-controls">
                    <button onclick="dataSourceUI.activateSource('${source.name}')" 
                            ${source.isActive ? 'disabled' : ''}>
                        ${source.isActive ? 'Active' : 'Use'}
                    </button>
                    <div class="status-indicator ${source.isConnected ? 'connected' : 'disconnected'}"></div>
                </div>
            </div>
        `).join('');
    }

    setupCustomSourceForms() {
        const tabButtons = this.panel.querySelectorAll('.tab-btn');
        const configDiv = this.panel.querySelector('.source-config');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.showConfigForm(btn.dataset.type, configDiv);
            });
        });

        // Show initial form
        this.showConfigForm('rest-api', configDiv);
    }

    showConfigForm(type, container) {
        const forms = {
            'rest-api': `
                <div class="form-group">
                    <label>Source Name:</label>
                    <input type="text" id="api-name" placeholder="e.g., mission_control_live">
                </div>
                <div class="form-group">
                    <label>API URL:</label>
                    <input type="url" id="api-url" placeholder="https://api.example.com/telemetry">
                </div>
                <div class="form-group">
                    <label>API Key (optional):</label>
                    <input type="text" id="api-key" placeholder="Your API key">
                </div>
                <div class="form-group">
                    <label>Update Interval (seconds):</label>
                    <input type="number" id="api-interval" value="5" min="1">
                </div>
                <div class="form-group">
                    <label>Field Mapping (JSON):</label>
                    <textarea id="api-mapping" rows="4" placeholder='{
  "timestamp": "data.time",
  "latitude_deg": "position.lat",
  "longitude_deg": "position.lng",
  "altitude_km": "position.alt",
  "velocity_kmps": "velocity.speed"
}'></textarea>
                </div>
                <button onclick="dataSourceUI.addRestAPISource()">Add REST API Source</button>
            `,
            
            'websocket': `
                <div class="form-group">
                    <label>Source Name:</label>
                    <input type="text" id="ws-name" placeholder="e.g., realtime_feed">
                </div>
                <div class="form-group">
                    <label>WebSocket URL:</label>
                    <input type="text" id="ws-url" placeholder="wss://telemetry.example.com/live">
                </div>
                <div class="form-group">
                    <label>Field Mapping (JSON):</label>
                    <textarea id="ws-mapping" rows="4" placeholder='{
  "timestamp": "time",
  "latitude_deg": "lat",
  "longitude_deg": "lng",
  "altitude_km": "alt",
  "velocity_kmps": "speed"
}'></textarea>
                </div>
                <button onclick="dataSourceUI.addWebSocketSource()">Add WebSocket Source</button>
            `,
            
            'file-upload': `
                <div class="form-group">
                    <label>File Format:</label>
                    <select id="file-format">
                        <option value="jsonl">JSONL (Line-delimited JSON)</option>
                        <option value="json">JSON Array</option>
                        <option value="csv">CSV</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Select File:</label>
                    <input type="file" id="telemetry-file" accept=".json,.jsonl,.csv,.txt">
                </div>
                <div class="form-group">
                    <label>Source Name:</label>
                    <input type="text" id="file-name" placeholder="uploaded_telemetry">
                </div>
                <button onclick="dataSourceUI.addFileSource()">Upload File</button>
            `
        };

        container.innerHTML = forms[type] || '';
    }

    async addRestAPISource() {
        try {
            const name = document.getElementById('api-name').value;
            const url = document.getElementById('api-url').value;
            const apiKey = document.getElementById('api-key').value;
            const interval = parseInt(document.getElementById('api-interval').value) * 1000;
            const mappingText = document.getElementById('api-mapping').value;

            if (!name || !url) {
                alert('Please provide source name and URL');
                return;
            }

            let mapping = {};
            if (mappingText.trim()) {
                mapping = JSON.parse(mappingText);
            }

            const config = {
                type: 'rest-api',
                url,
                mapping,
                realTime: true,
                updateInterval: interval,
                description: `Custom REST API: ${url}`
            };

            if (apiKey) {
                config.apiKey = apiKey;
            }

            this.dataManager.registerSource(name, config);
            this.updateSourceList();
            alert(`REST API source '${name}' added successfully!`);

        } catch (error) {
            alert(`Error adding REST API source: ${error.message}`);
        }
    }

    async addWebSocketSource() {
        try {
            const name = document.getElementById('ws-name').value;
            const url = document.getElementById('ws-url').value;
            const mappingText = document.getElementById('ws-mapping').value;

            if (!name || !url) {
                alert('Please provide source name and WebSocket URL');
                return;
            }

            let mapping = {};
            if (mappingText.trim()) {
                mapping = JSON.parse(mappingText);
            }

            const config = {
                type: 'websocket',
                url,
                mapping,
                realTime: true,
                description: `Custom WebSocket: ${url}`
            };

            this.dataManager.registerSource(name, config);
            this.updateSourceList();
            alert(`WebSocket source '${name}' added successfully!`);

        } catch (error) {
            alert(`Error adding WebSocket source: ${error.message}`);
        }
    }

    async addFileSource() {
        try {
            const fileInput = document.getElementById('telemetry-file');
            const format = document.getElementById('file-format').value;
            const name = document.getElementById('file-name').value;

            if (!fileInput.files[0] || !name) {
                alert('Please select a file and provide a source name');
                return;
            }

            const config = {
                type: 'file-upload',
                file: fileInput.files[0],
                format,
                description: `Uploaded file: ${fileInput.files[0].name}`
            };

            this.dataManager.registerSource(name, config);
            this.updateSourceList();
            alert(`File source '${name}' added successfully!`);

        } catch (error) {
            alert(`Error adding file source: ${error.message}`);
        }
    }

    async activateSource(sourceName) {
        try {
            await this.dataManager.setActiveSource(sourceName);
            this.updateSourceList();
            this.updateCurrentSourceInfo();
        } catch (error) {
            alert(`Failed to activate source: ${error.message}`);
        }
    }

    updateCurrentSourceInfo() {
        const info = document.getElementById('current-source-info');
        const sources = this.dataManager.getSourceStatus();
        const activeSource = sources.find(s => s.isActive);

        if (activeSource) {
            info.innerHTML = `
                <div class="active-source">
                    <strong>${activeSource.name}</strong> (${activeSource.type})
                    <div class="status ${activeSource.isConnected ? 'connected' : 'disconnected'}">
                        ${activeSource.isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                    ${activeSource.lastUpdate ? `<div class="last-update">Last update: ${activeSource.lastUpdate.toLocaleString()}</div>` : ''}
                </div>
            `;
        } else {
            info.textContent = 'No source selected';
        }
    }

    handleDataEvent(event, data) {
        switch (event) {
            case 'connected':
                console.log('Data source connected:', data.source);
                this.updateConnectionStatus('Connected', 'connected');
                this.updateSourceList();
                break;
                
            case 'disconnected':
                console.log('Data source disconnected:', data.source);
                this.updateConnectionStatus('Disconnected', 'disconnected');
                this.updateSourceList();
                break;
                
            case 'data':
                console.log('New telemetry data received:', data);
                this.updateDataInfo(data);
                break;
                
            case 'data-refreshed':
                console.log('Data refreshed, records:', data.length);
                this.updateDataInfo(data);
                break;
        }
    }

    updateConnectionStatus(status, className) {
        const statusDiv = document.getElementById('connection-status');
        statusDiv.textContent = status;
        statusDiv.className = className;
    }

    updateDataInfo(data) {
        const dataInfo = document.getElementById('data-info');
        if (Array.isArray(data)) {
            dataInfo.innerHTML = `<div>Records loaded: ${data.length}</div>`;
        } else {
            dataInfo.innerHTML = `<div>Live data point received</div>`;
        }
    }

    getSourceDescription(sourceName) {
        const source = DEFAULT_SOURCES[sourceName];
        return source?.description || 'Custom source';
    }

    show() {
        this.panel.classList.remove('hidden');
        this.isVisible = true;
        this.updateSourceList();
        this.updateCurrentSourceInfo();
    }

    hide() {
        this.panel.classList.add('hidden');
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    bindEvents() {
        // Add keyboard shortcut to toggle panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'D' && e.ctrlKey) {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    // Get current telemetry data for integration with existing system
    getCurrentTelemetryData() {
        return this.dataManager.getCurrentData();
    }

    // Get data manager for advanced integration
    getDataManager() {
        return this.dataManager;
    }
}

// Create global instance
let dataSourceUI;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dataSourceUI = new DataSourceUI();
        window.dataSourceUI = dataSourceUI; // Make globally accessible
    });
} else {
    dataSourceUI = new DataSourceUI();
    window.dataSourceUI = dataSourceUI;
}

export { dataSourceUI };
