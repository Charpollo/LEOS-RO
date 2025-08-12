/**
 * Export Tab - Data export and integration options
 * Handles telemetry export, Grafana integration, and state snapshots
 */

export default class ExportTab {
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
        title.textContent = 'DATA EXPORT & INTEGRATION';
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
    
    onActivate() {
        console.log('[EXPORT TAB] Activated');
    }
    
    onDeactivate() {
        // Stop streaming if active
        if (this.isStreaming) {
            this.stopStreaming();
        }
    }
}