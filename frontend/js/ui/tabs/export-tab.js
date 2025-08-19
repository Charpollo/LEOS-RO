/**
 * Data Tab - Data export, import, and integration options
 * Handles telemetry export/import, Grafana integration, and state management
 */

export default class DataTab {
    constructor() {
        this.container = null;
        this.websocket = null;
        this.isStreaming = false;
    }
    
    render() {
        this.container = document.createElement('div');
        this.container.className = 'export-tab-content';
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
        title.textContent = 'DATA MANAGEMENT & INTEGRATION';
        this.container.appendChild(title);
        
        // Export options grid
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        `;
        
        const exportOptions = [
            {
                id: 'telemetry-json',
                title: 'Telemetry JSON',
                description: 'Export raw telemetry data',
                icon: '📄',
                action: () => this.exportTelemetry()
            },
            {
                id: 'csv-data',
                title: 'CSV Export',
                description: 'Spreadsheet-compatible format',
                icon: '📊',
                action: () => this.exportCSV()
            },
            {
                id: 'state-snapshot',
                title: 'State Snapshot',
                description: 'Save current configuration',
                icon: '📸',
                action: () => this.saveSnapshot()
            },
            {
                id: 'video-capture',
                title: 'Record Video',
                description: 'Capture simulation video',
                icon: '🎬',
                action: () => this.startVideoCapture()
            }
        ];
        
        exportOptions.forEach(option => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 0, 0, 0.2);
                padding: 15px;
                cursor: pointer;
                transition: all 0.3s;
            `;
            
            card.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 10px;">${option.icon}</div>
                <div style="color: #ff0000; font-size: 13px; font-weight: bold; margin-bottom: 5px;">${option.title}</div>
                <div style="color: #666; font-size: 10px;">${option.description}</div>
            `;
            
            card.addEventListener('click', option.action);
            card.addEventListener('mouseenter', () => {
                card.style.background = 'rgba(255, 0, 0, 0.1)';
                card.style.borderColor = '#ff0000';
                card.style.transform = 'translateY(-2px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.background = 'rgba(0, 0, 0, 0.5)';
                card.style.borderColor = 'rgba(255, 0, 0, 0.2)';
                card.style.transform = 'translateY(0)';
            });
            
            grid.appendChild(card);
        });
        
        this.container.appendChild(grid);
        
        // Grafana streaming section
        const streamSection = document.createElement('div');
        streamSection.style.cssText = `
            margin-top: 30px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 0, 0.3);
        `;
        
        const streamTitle = document.createElement('h4');
        streamTitle.style.cssText = `
            color: #ffff00;
            font-size: 13px;
            text-transform: uppercase;
            margin: 0 0 15px 0;
        `;
        streamTitle.textContent = 'GRAFANA STREAMING';
        streamSection.appendChild(streamTitle);
        
        const streamControls = document.createElement('div');
        streamControls.style.cssText = `
            display: flex;
            gap: 10px;
            align-items: center;
        `;
        
        const wsInput = document.createElement('input');
        wsInput.type = 'text';
        wsInput.id = 'grafana-endpoint';
        wsInput.placeholder = 'ws://localhost:3000/api/live/push';
        wsInput.value = 'ws://localhost:3000/api/live/push';
        wsInput.style.cssText = `
            flex: 1;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 0, 0.3);
            color: #ffff00;
            padding: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        `;
        
        const streamBtn = document.createElement('button');
        streamBtn.id = 'stream-toggle';
        streamBtn.style.cssText = `
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid rgba(0, 255, 0, 0.3);
            color: #00ff00;
            padding: 8px 20px;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.2s;
        `;
        streamBtn.textContent = 'START STREAMING';
        streamBtn.addEventListener('click', () => this.toggleStreaming());
        
        streamControls.appendChild(wsInput);
        streamControls.appendChild(streamBtn);
        streamSection.appendChild(streamControls);
        
        // Stream status
        const streamStatus = document.createElement('div');
        streamStatus.id = 'stream-status';
        streamStatus.style.cssText = `
            margin-top: 10px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 0, 0.2);
            color: #999;
            font-size: 11px;
            text-align: center;
        `;
        streamStatus.textContent = 'Not connected';
        streamSection.appendChild(streamStatus);
        
        this.container.appendChild(streamSection);
        
        // Universal Telemetry Streaming section
        const telemetrySection = document.createElement('div');
        telemetrySection.style.cssText = `
            margin-top: 20px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(0, 255, 255, 0.3);
        `;
        
        const telemetryTitle = document.createElement('h4');
        telemetryTitle.style.cssText = `
            color: #00ffff;
            font-size: 13px;
            text-transform: uppercase;
            margin: 0 0 15px 0;
        `;
        telemetryTitle.textContent = 'UNIVERSAL TELEMETRY STREAMING';
        telemetrySection.appendChild(telemetryTitle);
        
        // Endpoint selection
        const endpointSelect = document.createElement('select');
        endpointSelect.id = 'telemetry-endpoint-select';
        endpointSelect.style.cssText = `
            width: 100%;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(0, 255, 255, 0.3);
            color: #00ffff;
            padding: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin-bottom: 10px;
        `;
        
        const endpoints = [
            { value: 'redwatch', text: 'RED WATCH - ws://localhost:8000/ws/ingest' },
            { value: 'grafana', text: 'Grafana Live - ws://localhost:3000/api/live/push' },
            { value: 'prometheus', text: 'Prometheus - ws://localhost:9090/api/v1/write' },
            { value: 'influxdb', text: 'InfluxDB - ws://localhost:8086/api/v2/write' },
            { value: 'custom', text: 'Custom Endpoint...' }
        ];
        
        endpoints.forEach(ep => {
            const option = document.createElement('option');
            option.value = ep.value;
            option.textContent = ep.text;
            endpointSelect.appendChild(option);
        });
        
        telemetrySection.appendChild(endpointSelect);
        
        // Custom endpoint input (hidden by default)
        const customEndpointInput = document.createElement('input');
        customEndpointInput.type = 'text';
        customEndpointInput.id = 'custom-telemetry-endpoint';
        customEndpointInput.placeholder = 'ws://your-endpoint:port/path';
        customEndpointInput.style.cssText = `
            width: 100%;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(0, 255, 255, 0.3);
            color: #00ffff;
            padding: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin-bottom: 10px;
            display: none;
        `;
        telemetrySection.appendChild(customEndpointInput);
        
        // Show custom input when selected
        endpointSelect.addEventListener('change', (e) => {
            customEndpointInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        
        // Telemetry controls
        const telemetryControls = document.createElement('div');
        telemetryControls.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        `;
        
        const telemetryToggle = document.createElement('button');
        telemetryToggle.id = 'telemetry-toggle';
        telemetryToggle.textContent = 'START TELEMETRY';
        telemetryToggle.style.cssText = `
            flex: 1;
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(0, 255, 255, 0.3);
            color: #00ffff;
            padding: 10px;
            cursor: pointer;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 11px;
            transition: all 0.3s;
        `;
        
        telemetryToggle.addEventListener('click', () => this.toggleTelemetry());
        telemetryControls.appendChild(telemetryToggle);
        
        // Configure button
        const configBtn = document.createElement('button');
        configBtn.textContent = 'CONFIGURE';
        configBtn.style.cssText = `
            background: rgba(255, 165, 0, 0.1);
            border: 1px solid rgba(255, 165, 0, 0.3);
            color: #ffa500;
            padding: 10px 20px;
            cursor: pointer;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 11px;
            transition: all 0.3s;
        `;
        
        configBtn.addEventListener('click', () => this.showTelemetryConfig());
        telemetryControls.appendChild(configBtn);
        
        telemetrySection.appendChild(telemetryControls);
        
        // Status display
        const telemetryStatus = document.createElement('div');
        telemetryStatus.id = 'telemetry-status';
        telemetryStatus.style.cssText = `
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(0, 255, 255, 0.2);
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #666;
        `;
        telemetryStatus.innerHTML = `
            <div>Status: <span id="telemetry-status-text" style="color: #666;">DISCONNECTED</span></div>
            <div>Messages: <span id="telemetry-msg-count">0</span></div>
            <div>Data Rate: <span id="telemetry-data-rate">0 KB/s</span></div>
            <div>Objects: <span id="telemetry-object-count">0</span></div>
        `;
        telemetrySection.appendChild(telemetryStatus);
        
        this.container.appendChild(telemetrySection);
        
        // Update status periodically
        setInterval(() => this.updateTelemetryStatus(), 1000);
        
        return this.container;
    }
    
    exportTelemetry() {
        console.log('[EXPORT TAB] Exporting telemetry JSON');
        
        const data = {
            timestamp: Date.now(),
            simulation: {
                objects: window.gpuPhysicsEngine?.activeObjects || 0,
                fps: window.engine?.getFps() || 0,
                timeMultiplier: window.simState?.timeMultiplier || 1
            },
            conjunctions: window.conjunctionHistory?.getHistory() || [],
            physics: {
                earthMu: 398600.4418,
                integration: 'GPU Euler @ 60Hz',
                collisionThreshold: 1.0
            }
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telemetry_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    exportCSV() {
        console.log('[EXPORT TAB] Exporting CSV data');
        
        // Create CSV with current satellite positions
        let csv = 'ID,X(km),Y(km),Z(km),VX(km/s),VY(km/s),VZ(km/s),Type\n';
        
        // TODO: Get actual satellite data from GPU physics engine
        // For now, create sample data
        for (let i = 0; i < 100; i++) {
            csv += `SAT-${i},0,0,0,0,0,0,LEO\n`;
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `satellites_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    saveSnapshot() {
        console.log('[EXPORT TAB] Saving state snapshot');
        
        const state = {
            timestamp: Date.now(),
            configuration: {
                objectCount: window.gpuPhysicsEngine?.activeObjects || 0,
                timeMultiplier: window.simState?.timeMultiplier || 1,
                scenario: 'current'
            },
            camera: {
                position: window.camera?.position || { x: 0, y: 0, z: 0 },
                target: window.camera?.target || { x: 0, y: 0, z: 0 }
            }
        };
        
        localStorage.setItem('redOrbitSnapshot', JSON.stringify(state));
        
        // Show notification
        this.showNotification('State snapshot saved', 'success');
    }
    
    startVideoCapture() {
        console.log('[EXPORT TAB] Starting video capture');
        
        // TODO: Implement actual video capture using MediaRecorder API
        this.showNotification('Video capture not yet implemented', 'warning');
    }
    
    toggleStreaming() {
        if (this.isStreaming) {
            this.stopStreaming();
        } else {
            this.startStreaming();
        }
    }
    
    startStreaming() {
        const endpoint = document.getElementById('grafana-endpoint').value;
        console.log(`[EXPORT TAB] Starting Grafana streaming to ${endpoint}`);
        
        try {
            this.websocket = new WebSocket(endpoint);
            
            this.websocket.onopen = () => {
                this.isStreaming = true;
                this.updateStreamStatus('Connected', '#00ff00');
                
                const btn = document.getElementById('stream-toggle');
                btn.textContent = 'STOP STREAMING';
                btn.style.background = 'rgba(255, 0, 0, 0.1)';
                btn.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                btn.style.color = '#ff0000';
                
                // Start sending data
                this.streamInterval = setInterval(() => {
                    this.sendTelemetryData();
                }, 1000);
            };
            
            this.websocket.onerror = (error) => {
                console.error('[EXPORT TAB] WebSocket error:', error);
                this.updateStreamStatus('Connection error', '#ff0000');
                this.stopStreaming();
            };
            
            this.websocket.onclose = () => {
                this.updateStreamStatus('Disconnected', '#999999');
                this.stopStreaming();
            };
            
        } catch (error) {
            console.error('[EXPORT TAB] Failed to connect:', error);
            this.updateStreamStatus('Failed to connect', '#ff0000');
        }
    }
    
    stopStreaming() {
        console.log('[EXPORT TAB] Stopping Grafana streaming');
        
        this.isStreaming = false;
        
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = null;
        }
        
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        const btn = document.getElementById('stream-toggle');
        if (btn) {
            btn.textContent = 'START STREAMING';
            btn.style.background = 'rgba(0, 255, 0, 0.1)';
            btn.style.borderColor = 'rgba(0, 255, 0, 0.3)';
            btn.style.color = '#00ff00';
        }
        
        this.updateStreamStatus('Not connected', '#999999');
    }
    
    sendTelemetryData() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
        
        const telemetry = {
            timestamp: Date.now(),
            objects: window.gpuPhysicsEngine?.activeObjects || 0,
            fps: window.engine?.getFps() || 0,
            conjunctions: window.conjunctionHistory?.getActiveConjunctions()?.length || 0,
            debris: window.gpuPhysicsEngine?.debrisGenerated || 0,
            timeMultiplier: window.simState?.timeMultiplier || 1
        };
        
        this.websocket.send(JSON.stringify(telemetry));
    }
    
    updateStreamStatus(message, color) {
        const status = document.getElementById('stream-status');
        if (status) {
            status.textContent = message;
            status.style.color = color;
            status.style.borderColor = color + '33';
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 
                         type === 'warning' ? 'rgba(255, 255, 0, 0.2)' : 
                         'rgba(255, 0, 0, 0.2)'};
            border: 1px solid ${type === 'success' ? '#00ff00' : 
                                type === 'warning' ? '#ffff00' : 
                                '#ff0000'};
            color: ${type === 'success' ? '#00ff00' : 
                    type === 'warning' ? '#ffff00' : 
                    '#ff0000'};
            font-family: 'Orbitron', monospace;
            font-size: 12px;
            z-index: 100000;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    getDataIcon(iconType) {
        const icons = {
            file: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/>
            </svg>`,
            table: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,8V12H11V8H5M13,8V12H19V8H13M5,14V18H11V14H5M13,14V18H19V14H13Z"/>
            </svg>`,
            camera: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z"/>
            </svg>`,
            video: `<svg viewBox="0 0 24 24" fill="#ff0000" width="32" height="32">
                <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
            </svg>`
        };
        return icons[iconType] || icons.file;
    }
    
    onActivate() {
        console.log('[DATA TAB] Activated');
    }
    
    onDeactivate() {
        // Stop streaming if active
        if (this.isStreaming) {
            this.stopStreaming();
        }
    }
    
    toggleTelemetry() {
        // Load the telemetry connector if not already loaded
        if (!window.telemetryConnector) {
            import('../telemetry/universal-telemetry-connector.js').then(() => {
                this.toggleTelemetryConnection();
            }).catch(err => {
                console.error('[EXPORT TAB] Failed to load telemetry connector:', err);
                this.showNotification('Failed to load telemetry module', 'error');
            });
        } else {
            this.toggleTelemetryConnection();
        }
    }
    
    toggleTelemetryConnection() {
        const connector = window.telemetryConnector;
        const select = document.getElementById('telemetry-endpoint-select');
        const customInput = document.getElementById('custom-telemetry-endpoint');
        const button = document.getElementById('telemetry-toggle');
        
        if (connector.connected) {
            // Disconnect
            connector.disable();
            button.textContent = 'START TELEMETRY';
            button.style.background = 'rgba(0, 255, 255, 0.1)';
            button.style.borderColor = 'rgba(0, 255, 255, 0.3)';
            button.style.color = '#00ffff';
        } else {
            // Configure endpoint based on selection
            let endpoint, name, format;
            
            switch (select.value) {
                case 'redwatch':
                    endpoint = 'ws://localhost:8000/ws/ingest';
                    name = 'RED WATCH';
                    format = 'redwatch';
                    break;
                case 'grafana':
                    endpoint = 'ws://localhost:3000/api/live/push';
                    name = 'Grafana';
                    format = 'grafana';
                    break;
                case 'prometheus':
                    endpoint = 'ws://localhost:9090/api/v1/write';
                    name = 'Prometheus';
                    format = 'prometheus';
                    break;
                case 'influxdb':
                    endpoint = 'ws://localhost:8086/api/v2/write';
                    name = 'InfluxDB';
                    format = 'influxdb';
                    break;
                case 'custom':
                    endpoint = customInput.value;
                    name = 'Custom';
                    format = 'raw';
                    break;
            }
            
            if (!endpoint) {
                this.showNotification('Please enter a custom endpoint', 'warning');
                return;
            }
            
            // Set endpoint and format
            connector.setEndpoint(endpoint, name);
            connector.updateConfig({ dataConfig: { format: format } });
            
            // Connect
            connector.enable();
            
            // Update button
            button.textContent = 'STOP TELEMETRY';
            button.style.background = 'rgba(255, 0, 0, 0.1)';
            button.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            button.style.color = '#ff0000';
        }
    }
    
    updateTelemetryStatus() {
        if (!window.telemetryConnector) return;
        
        const connector = window.telemetryConnector;
        const status = connector.getStatus();
        
        // Update status text
        const statusText = document.getElementById('telemetry-status-text');
        if (statusText) {
            if (status.connected) {
                statusText.textContent = 'CONNECTED';
                statusText.style.color = '#00ff00';
            } else if (status.enabled) {
                statusText.textContent = 'CONNECTING...';
                statusText.style.color = '#ffff00';
            } else {
                statusText.textContent = 'DISCONNECTED';
                statusText.style.color = '#666';
            }
        }
        
        // Update metrics
        const msgCount = document.getElementById('telemetry-msg-count');
        if (msgCount) msgCount.textContent = status.messagesSent || 0;
        
        const dataRate = document.getElementById('telemetry-data-rate');
        if (dataRate) {
            const kbps = status.bytesSent ? (status.bytesSent / 1024) / (Date.now() / 1000) : 0;
            dataRate.textContent = `${kbps.toFixed(2)} KB/s`;
        }
        
        const objectCount = document.getElementById('telemetry-object-count');
        if (objectCount) {
            const physics = window.redOrbitPhysics;
            objectCount.textContent = physics?.activeObjects || 0;
        }
    }
    
    showTelemetryConfig() {
        // TODO: Show configuration modal
        this.showNotification('Configuration dialog coming soon', 'info');
    }
}