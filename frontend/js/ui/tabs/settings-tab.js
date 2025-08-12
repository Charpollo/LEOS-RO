/**
 * Settings Tab - System configuration and user preferences
 * Manages display settings, data sources, and system config
 */

export default class SettingsTab {
    constructor() {
        this.container = null;
        this.settings = this.loadSettings();
    }
    
    loadSettings() {
        // Load from localStorage or use defaults
        return {
            display: {
                unclassifiedBanner: localStorage.getItem('showUnclassified') === 'true',
                showOrbits: localStorage.getItem('showOrbits') !== 'false',
                showLabels: localStorage.getItem('showLabels') === 'true',
                showGrid: localStorage.getItem('showGrid') === 'true'
            },
            data: {
                noradApiKey: localStorage.getItem('noradApiKey') || '',
                grafanaEndpoint: localStorage.getItem('grafanaEndpoint') || 'ws://localhost:3000/api/live/push',
                telemetrySource: localStorage.getItem('telemetrySource') || 'synthetic'
            },
            performance: {
                maxObjects: parseInt(localStorage.getItem('maxObjects')) || 8000000,
                gpuWorkgroups: parseInt(localStorage.getItem('gpuWorkgroups')) || 256,
                autoScale: localStorage.getItem('autoScale') !== 'false'
            },
            user: {
                name: localStorage.getItem('userName') || 'Mission Commander',
                callsign: localStorage.getItem('userCallsign') || 'FLIGHT',
                role: localStorage.getItem('userRole') || 'Operator'
            }
        };
    }
    
    render() {
        this.container = document.createElement('div');
        this.container.className = 'settings-tab-content';
        this.container.style.cssText = `
            padding: 20px;
            height: 100%;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        `;
        
        // Settings Header
        const header = document.createElement('h3');
        header.style.cssText = `
            color: #ff0000;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(255, 0, 0, 0.3);
        `;
        header.textContent = 'SYSTEM SETTINGS';
        this.container.appendChild(header);
        
        // Settings Sections
        const sections = document.createElement('div');
        sections.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 20px;
        `;
        
        // User Profile Section
        sections.appendChild(this.createSection('USER PROFILE', `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">NAME</label>
                    <input type="text" id="user-name" value="${this.settings.user.name}" style="${this.inputStyle()}" />
                </div>
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">CALLSIGN</label>
                    <input type="text" id="user-callsign" value="${this.settings.user.callsign}" style="${this.inputStyle()}" />
                </div>
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">ROLE</label>
                    <select id="user-role" style="${this.inputStyle()}">
                        <option value="Operator" ${this.settings.user.role === 'Operator' ? 'selected' : ''}>Operator</option>
                        <option value="Analyst" ${this.settings.user.role === 'Analyst' ? 'selected' : ''}>Analyst</option>
                        <option value="Commander" ${this.settings.user.role === 'Commander' ? 'selected' : ''}>Commander</option>
                        <option value="Observer" ${this.settings.user.role === 'Observer' ? 'selected' : ''}>Observer</option>
                    </select>
                </div>
            </div>
        `));
        
        // Display Settings Section
        sections.appendChild(this.createSection('DISPLAY SETTINGS', `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                ${this.createToggle('unclassified-banner', 'Show Unclassified Banner', this.settings.display.unclassifiedBanner)}
                ${this.createToggle('show-orbits', 'Show Orbital Paths', this.settings.display.showOrbits)}
                ${this.createToggle('show-labels', 'Show Satellite Labels', this.settings.display.showLabels)}
                ${this.createToggle('show-grid', 'Show Coordinate Grid', this.settings.display.showGrid)}
            </div>
        `));
        
        // Data Sources Section
        sections.appendChild(this.createSection('DATA SOURCES', `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">TELEMETRY SOURCE</label>
                    <select id="telemetry-source" style="${this.inputStyle()}">
                        <option value="synthetic" ${this.settings.data.telemetrySource === 'synthetic' ? 'selected' : ''}>Synthetic (Generated)</option>
                        <option value="norad" ${this.settings.data.telemetrySource === 'norad' ? 'selected' : ''}>NORAD Space-Track</option>
                        <option value="custom" ${this.settings.data.telemetrySource === 'custom' ? 'selected' : ''}>Custom TLE File</option>
                    </select>
                </div>
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">NORAD API KEY</label>
                    <input type="password" id="norad-api-key" value="${this.settings.data.noradApiKey}" 
                           placeholder="Enter Space-Track.org API key" style="${this.inputStyle()}" />
                </div>
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">GRAFANA ENDPOINT</label>
                    <input type="text" id="grafana-endpoint" value="${this.settings.data.grafanaEndpoint}" 
                           placeholder="ws://localhost:3000/api/live/push" style="${this.inputStyle()}" />
                </div>
            </div>
        `));
        
        // Performance Settings Section
        sections.appendChild(this.createSection('PERFORMANCE', `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">MAX OBJECTS</label>
                    <select id="max-objects" style="${this.inputStyle()}">
                        <option value="10000" ${this.settings.performance.maxObjects === 10000 ? 'selected' : ''}>10,000</option>
                        <option value="100000" ${this.settings.performance.maxObjects === 100000 ? 'selected' : ''}>100,000</option>
                        <option value="1000000" ${this.settings.performance.maxObjects === 1000000 ? 'selected' : ''}>1,000,000</option>
                        <option value="8000000" ${this.settings.performance.maxObjects === 8000000 ? 'selected' : ''}>8,000,000</option>
                    </select>
                </div>
                <div>
                    <label style="color: #666; font-size: 10px; display: block; margin-bottom: 5px;">GPU WORKGROUPS</label>
                    <select id="gpu-workgroups" style="${this.inputStyle()}">
                        <option value="64" ${this.settings.performance.gpuWorkgroups === 64 ? 'selected' : ''}>64</option>
                        <option value="128" ${this.settings.performance.gpuWorkgroups === 128 ? 'selected' : ''}>128</option>
                        <option value="256" ${this.settings.performance.gpuWorkgroups === 256 ? 'selected' : ''}>256</option>
                        <option value="512" ${this.settings.performance.gpuWorkgroups === 512 ? 'selected' : ''}>512</option>
                    </select>
                </div>
                ${this.createToggle('auto-scale', 'Auto-scale Performance', this.settings.performance.autoScale)}
            </div>
        `));
        
        // About Section
        sections.appendChild(this.createSection('ABOUT', `
            <div style="color: #666; font-size: 11px; line-height: 1.6;">
                <div><strong style="color: #ff0000;">RED ORBIT</strong> - LEO Satellite Tracker</div>
                <div>Version: 1.0.0</div>
                <div>GPU Physics: ${navigator.gpu ? 'Enabled' : 'Disabled'}</div>
                <div>Max Capacity: 8,000,000 objects</div>
                <div style="margin-top: 10px;">
                    <a href="#" onclick="window.open('/flight-rules/physics.md')" style="color: #00ff00; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M19,2L19,2C17.89,2 17,2.9 17,4V18C17,19.1 17.89,20 19,20H19C20.1,20 21,19.1 21,18V4C21,2.9 20.1,2 19,2M19,18H17V4H19V18M9,2A2,2 0 0,0 7,4V20A2,2 0 0,0 9,22H16V20H9V4H16V2H9Z"/>
                        </svg>
                        View Flight Rules
                    </a>
                </div>
            </div>
        `));
        
        this.container.appendChild(sections);
        
        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.style.cssText = `
            margin-top: 20px;
            padding: 12px;
            background: linear-gradient(135deg, rgba(0, 255, 0, 0.2), rgba(0, 255, 0, 0.1));
            border: 2px solid #00ff00;
            color: #00ff00;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.3s;
            font-family: 'Orbitron', monospace;
        `;
        saveBtn.textContent = 'SAVE SETTINGS';
        saveBtn.addEventListener('click', () => this.saveSettings());
        
        this.container.appendChild(saveBtn);
        
        return this.container;
    }
    
    createSection(title, content) {
        const section = document.createElement('div');
        section.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 0, 0, 0.2);
            border-radius: 8px;
            padding: 15px;
        `;
        
        section.innerHTML = `
            <div style="color: #ff0000; font-size: 11px; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 1px;">
                ${title}
            </div>
            <div>
                ${content}
            </div>
        `;
        
        return section;
    }
    
    createToggle(id, label, checked) {
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px;">
                <label for="${id}" style="color: #999; font-size: 11px; cursor: pointer;">${label}</label>
                <div class="toggle-switch" style="position: relative;">
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="display: none;" />
                    <div onclick="document.getElementById('${id}').checked = !document.getElementById('${id}').checked" style="
                        width: 40px;
                        height: 20px;
                        background: ${checked ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'};
                        border: 1px solid ${checked ? '#00ff00' : '#ff0000'};
                        border-radius: 10px;
                        cursor: pointer;
                        position: relative;
                        transition: all 0.3s;
                    ">
                        <div style="
                            width: 16px;
                            height: 16px;
                            background: ${checked ? '#00ff00' : '#ff0000'};
                            border-radius: 50%;
                            position: absolute;
                            top: 1px;
                            ${checked ? 'right: 1px;' : 'left: 1px;'}
                            transition: all 0.3s;
                        "></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    inputStyle() {
        return `
            width: 100%;
            padding: 8px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 0, 0, 0.2);
            color: #fff;
            font-size: 11px;
            font-family: 'Courier New', monospace;
        `;
    }
    
    saveSettings() {
        // Save all settings to localStorage
        localStorage.setItem('userName', document.getElementById('user-name').value);
        localStorage.setItem('userCallsign', document.getElementById('user-callsign').value);
        localStorage.setItem('userRole', document.getElementById('user-role').value);
        
        localStorage.setItem('showUnclassified', document.getElementById('unclassified-banner').checked);
        localStorage.setItem('showOrbits', document.getElementById('show-orbits').checked);
        localStorage.setItem('showLabels', document.getElementById('show-labels').checked);
        localStorage.setItem('showGrid', document.getElementById('show-grid').checked);
        
        localStorage.setItem('telemetrySource', document.getElementById('telemetry-source').value);
        localStorage.setItem('noradApiKey', document.getElementById('norad-api-key').value);
        localStorage.setItem('grafanaEndpoint', document.getElementById('grafana-endpoint').value);
        
        localStorage.setItem('maxObjects', document.getElementById('max-objects').value);
        localStorage.setItem('gpuWorkgroups', document.getElementById('gpu-workgroups').value);
        localStorage.setItem('autoScale', document.getElementById('auto-scale').checked);
        
        // Show success notification
        this.showNotification('Settings saved successfully!', 'success');
        
        // Update user display if needed
        if (window.engineeringTabs) {
            window.engineeringTabs.updateUserDisplay();
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
            border: 1px solid ${type === 'success' ? '#00ff00' : '#ff0000'};
            color: ${type === 'success' ? '#00ff00' : '#ff0000'};
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
        console.log('[SETTINGS TAB] Activated');
    }
}