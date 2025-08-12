/**
 * Mission Control Tab - User's personalized command center
 * Default home tab with customizable dashboard and mission overview
 */

export default class MissionControlTab {
    constructor() {
        this.container = null;
        this.widgets = [];
        this.user = this.getCurrentUser();
    }
    
    getCurrentUser() {
        // Get user from localStorage or use default
        return {
            name: localStorage.getItem('userName') || 'Mission Commander',
            callsign: localStorage.getItem('userCallsign') || 'FLIGHT',
            role: localStorage.getItem('userRole') || 'Operator',
            avatar: localStorage.getItem('userAvatar') || null
        };
    }
    
    render() {
        this.container = document.createElement('div');
        this.container.className = 'mission-control-tab-content';
        this.container.style.cssText = `
            padding: 20px;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
            overflow-y: auto;
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.95) 100%);
        `;
        
        // Mission Control Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(255, 0, 0, 0.3);
        `;
        
        // Title and Status
        const titleSection = document.createElement('div');
        titleSection.innerHTML = `
            <h2 style="color: #ff0000; font-size: 20px; margin: 0; font-family: 'Orbitron', monospace; text-transform: uppercase; letter-spacing: 3px;">
                MISSION CONTROL CENTER
            </h2>
            <div style="color: #00ff00; font-size: 12px; margin-top: 5px;">
                SYSTEM STATUS: <span style="font-weight: bold;">NOMINAL</span> | 
                UTC: <span id="utc-time">${new Date().toUTCString()}</span>
            </div>
        `;
        
        // Mission Stats
        const statsSection = document.createElement('div');
        statsSection.style.cssText = `
            display: flex;
            gap: 20px;
            align-items: center;
        `;
        statsSection.innerHTML = `
            <div style="text-align: center;">
                <div style="color: #666; font-size: 10px;">ACTIVE OBJECTS</div>
                <div style="color: #00ff00; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">
                    ${window.gpuPhysicsEngine?.activeObjects?.toLocaleString() || '0'}
                </div>
            </div>
            <div style="text-align: center;">
                <div style="color: #666; font-size: 10px;">CONJUNCTIONS</div>
                <div style="color: #ffff00; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">
                    ${window.conjunctionHistory?.getActiveConjunctions()?.length || 0}
                </div>
            </div>
            <div style="text-align: center;">
                <div style="color: #666; font-size: 10px;">FPS</div>
                <div style="color: #00ffff; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">
                    ${Math.round(window.engine?.getFps() || 60)}
                </div>
            </div>
        `;
        
        header.appendChild(titleSection);
        header.appendChild(statsSection);
        this.container.appendChild(header);
        
        // Dashboard Grid
        const dashboard = document.createElement('div');
        dashboard.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            flex: 1;
        `;
        
        // Quick Actions Widget
        const quickActions = this.createWidget('QUICK ACTIONS', `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="action-btn" onclick="window.engineeringTabs.switchTab('objects')" style="${this.actionButtonStyle()}">
                    Launch 10K Objects
                </button>
                <button class="action-btn" onclick="window.engineeringTabs.switchTab('scenarios')" style="${this.actionButtonStyle()}">
                    Load Scenario
                </button>
                <button class="action-btn" onclick="window.gpuPhysicsEngine?.togglePause?.()" style="${this.actionButtonStyle()}">
                    Pause Simulation
                </button>
                <button class="action-btn" onclick="window.engineeringTabs.switchTab('export')" style="${this.actionButtonStyle()}">
                    Export Data
                </button>
            </div>
        `);
        
        // Active Missions Widget
        const missions = this.createWidget('ACTIVE MISSIONS', `
            <div style="max-height: 200px; overflow-y: auto;">
                <div class="mission-item" style="${this.missionItemStyle()}">
                    <div style="color: #00ff00; font-size: 12px; font-weight: bold;">ISS TRACKING</div>
                    <div style="color: #666; font-size: 10px;">Altitude: 408 km | Velocity: 7.66 km/s</div>
                </div>
                <div class="mission-item" style="${this.missionItemStyle()}">
                    <div style="color: #ffff00; font-size: 12px; font-weight: bold;">STARLINK DEPLOYMENT</div>
                    <div style="color: #666; font-size: 10px;">42,000 satellites active</div>
                </div>
                <div class="mission-item" style="${this.missionItemStyle()}">
                    <div style="color: #ff6600; font-size: 12px; font-weight: bold;">DEBRIS MONITORING</div>
                    <div style="color: #666; font-size: 10px;">Tracking 128,000 objects</div>
                </div>
            </div>
        `);
        
        // System Health Widget
        const systemHealth = this.createWidget('SYSTEM HEALTH', `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${this.createHealthBar('GPU Usage', 45, '#00ff00')}
                ${this.createHealthBar('Memory', 62, '#ffff00')}
                ${this.createHealthBar('Network', 15, '#00ff00')}
                ${this.createHealthBar('CPU', 38, '#00ff00')}
            </div>
        `);
        
        // Alerts Widget
        const alerts = this.createWidget('ALERTS & NOTIFICATIONS', `
            <div style="max-height: 200px; overflow-y: auto;">
                <div class="alert-item" style="${this.alertItemStyle('#ffff00')}">
                    <span style="font-size: 10px; display: flex; align-items: center; gap: 5px;">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
                        </svg>
                        Conjunction predicted in 47 minutes
                    </span>
                </div>
                <div class="alert-item" style="${this.alertItemStyle('#00ff00')}">
                    <span style="font-size: 10px; display: flex; align-items: center; gap: 5px;">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                        </svg>
                        All systems nominal
                    </span>
                </div>
                <div class="alert-item" style="${this.alertItemStyle('#00ffff')}">
                    <span style="font-size: 10px; display: flex; align-items: center; gap: 5px;">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                        </svg>
                        8M objects loaded successfully
                    </span>
                </div>
            </div>
        `);
        
        // Grafana Embed (placeholder for now)
        const grafanaEmbed = this.createWidget('TELEMETRY DASHBOARD', `
            <div style="height: 300px; background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,0,0.2); display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; color: #666;">
                    <div style="margin-bottom: 10px;">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                            <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
                        </svg>
                    </div>
                    <div style="font-size: 12px;">Grafana Dashboard</div>
                    <div style="font-size: 10px; margin-top: 5px; display: inline-flex; align-items: center; gap: 3px;">
                        Configure in Settings 
                        <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                            <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
                        </svg>
                        Data Sources
                    </div>
                </div>
            </div>
        `, 'span 2');
        
        // Command History Widget
        const commandHistory = this.createWidget('COMMAND HISTORY', `
            <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #00ff00; max-height: 200px; overflow-y: auto;">
                <div>> System initialized at ${new Date().toLocaleTimeString()}</div>
                <div>> GPU Physics Engine: ACTIVE</div>
                <div>> Loaded 8,000,000 objects</div>
                <div>> Conjunction monitoring: ENABLED</div>
                <div>> Time multiplier: 1x</div>
                <div>> Awaiting commands...</div>
            </div>
        `);
        
        dashboard.appendChild(quickActions);
        dashboard.appendChild(missions);
        dashboard.appendChild(systemHealth);
        dashboard.appendChild(alerts);
        dashboard.appendChild(grafanaEmbed);
        dashboard.appendChild(commandHistory);
        
        this.container.appendChild(dashboard);
        
        // Start updating time
        this.startTimeUpdate();
        
        return this.container;
    }
    
    createWidget(title, content, gridSpan = '1') {
        const widget = document.createElement('div');
        widget.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 0, 0, 0.2);
            border-radius: 8px;
            padding: 15px;
            grid-column: span ${gridSpan};
        `;
        
        widget.innerHTML = `
            <div style="color: #ff0000; font-size: 11px; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; border-bottom: 1px solid rgba(255,0,0,0.2); padding-bottom: 5px;">
                ${title}
            </div>
            <div style="color: #ccc;">
                ${content}
            </div>
        `;
        
        return widget;
    }
    
    createHealthBar(label, value, color) {
        return `
            <div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px;">
                    <span style="color: #666;">${label}</span>
                    <span style="color: ${color};">${value}%</span>
                </div>
                <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px;">
                    <div style="width: ${value}%; height: 100%; background: ${color}; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
            </div>
        `;
    }
    
    actionButtonStyle() {
        return `
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.3);
            color: #ff0000;
            padding: 8px;
            cursor: pointer;
            font-size: 10px;
            text-transform: uppercase;
            transition: all 0.2s;
            font-family: 'Orbitron', monospace;
        `;
    }
    
    missionItemStyle() {
        return `
            padding: 8px;
            margin-bottom: 8px;
            background: rgba(0, 255, 0, 0.05);
            border-left: 3px solid #00ff00;
        `;
    }
    
    alertItemStyle(color) {
        return `
            padding: 6px;
            margin-bottom: 5px;
            background: ${color}11;
            border-left: 2px solid ${color};
            color: ${color};
        `;
    }
    
    startTimeUpdate() {
        setInterval(() => {
            const timeEl = document.getElementById('utc-time');
            if (timeEl) {
                timeEl.textContent = new Date().toUTCString();
            }
        }, 1000);
    }
    
    onActivate() {
        console.log('[MISSION CONTROL TAB] Activated');
        // Could refresh stats here
    }
    
    onDeactivate() {
        // Cleanup if needed
    }
}