/**
 * Engineering Tabs Controller - VSCode-style bottom panel
 * Provides persistent monitoring and control interface
 * Following RED ORBIT flight rules - modular, real physics, no cheating
 */

// Import tab modules
import MissionControlTab from './tabs/mission-control-tab.js';
import ObjectsTab from './tabs/objects-tab.js';
import ScenariosTab from './tabs/scenarios-tab.js';
import ConjunctionsTab from './tabs/conjunctions-tab.js';
import DataTab from './tabs/export-tab.js';
import SettingsTab from './tabs/settings-tab.js';

export class EngineeringTabs {
    constructor() {
        this.activeTab = null;
        this.minimized = true; // Start minimized
        this.container = null;
        this.tabBar = null;
        this.contentArea = null;
        this.resizeHandle = null;
        this.tabs = new Map();
        this.height = 300; // Default height in pixels
        this.minHeight = 40; // Just tab bar
        this.maxHeight = 600; // Max height
        this.isResizing = false;
        this.timelineController = null;
    }
    
    async initialize() {
        console.log('[ENGINEERING TABS] Initializing VSCode-style panel...');
        this.createContainer();
        await this.registerTabs();
        this.setupKeyboardShortcuts();
        this.setupResizeHandler();
        this.attachToViewport();
        this.createTimeline();
        
        // Start minimized
        this.minimize();
        
        console.log('[ENGINEERING TABS] Panel ready');
    }
    
    createContainer() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'engineering-tabs-container';
        this.container.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${this.height}px;
            background: rgba(10, 10, 10, 0.95);
            border-top: 2px solid #ff0000;
            display: flex;
            flex-direction: column;
            z-index: 10000;
            transition: height 0.3s ease;
            font-family: 'Orbitron', monospace;
        `;
        
        // Resize handle (like VSCode)
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            cursor: ns-resize;
            background: transparent;
            z-index: 10001;
        `;
        this.resizeHandle.addEventListener('mouseenter', () => {
            this.resizeHandle.style.background = 'rgba(255, 0, 0, 0.5)';
        });
        this.resizeHandle.addEventListener('mouseleave', () => {
            if (!this.isResizing) {
                this.resizeHandle.style.background = 'transparent';
            }
        });
        
        // Tab bar
        this.tabBar = document.createElement('div');
        this.tabBar.id = 'engineering-tab-bar';
        this.tabBar.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: 40px;
            background: rgba(20, 20, 20, 0.95);
            border-bottom: 1px solid rgba(255, 0, 0, 0.3);
            padding: 0 10px;
            gap: 5px;
            position: relative;
        `;
        
        // Content area
        this.contentArea = document.createElement('div');
        this.contentArea.id = 'engineering-tab-content';
        this.contentArea.style.cssText = `
            flex: 1;
            overflow: hidden;
            position: relative;
            background: rgba(5, 5, 5, 0.95);
        `;
        
        // Assemble
        this.container.appendChild(this.resizeHandle);
        this.container.appendChild(this.tabBar);
        this.container.appendChild(this.contentArea);
    }
    
    addUserDisplay() {
        // User display on left side of tab bar
        const userDisplay = document.createElement('div');
        userDisplay.id = 'user-display';
        userDisplay.style.cssText = `
            position: absolute;
            left: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            height: 100%;
        `;
        
        // Get user info from localStorage
        const userName = localStorage.getItem('userName') || 'Mission Commander';
        const userCallsign = localStorage.getItem('userCallsign') || 'FLIGHT';
        const userRole = localStorage.getItem('userRole') || 'Operator';
        
        // Create avatar/icon
        const avatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
        </svg>`;
        
        userDisplay.innerHTML = `
            <div style="color: #00ff00; display: flex; align-items: center;">
                ${avatarSvg}
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center;">
                <div style="color: #fff; font-size: 11px; font-weight: bold; text-transform: uppercase;">${userName}</div>
                <div style="color: #666; font-size: 9px;">${userCallsign} | ${userRole}</div>
            </div>
        `;
        
        this.tabBar.appendChild(userDisplay);
    }
    
    updateUserDisplay() {
        const userDisplay = document.getElementById('user-display');
        if (!userDisplay) return;
        
        const userName = localStorage.getItem('userName') || 'Mission Commander';
        const userCallsign = localStorage.getItem('userCallsign') || 'FLIGHT';
        const userRole = localStorage.getItem('userRole') || 'Operator';
        
        const avatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
        </svg>`;
        
        userDisplay.innerHTML = `
            <div style="color: #00ff00; display: flex; align-items: center;">
                ${avatarSvg}
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center;">
                <div style="color: #fff; font-size: 11px; font-weight: bold; text-transform: uppercase;">${userName}</div>
                <div style="color: #666; font-size: 9px;">${userCallsign} | ${userRole}</div>
            </div>
        `;
    }
    
    async registerTabs() {
        // Add user display first
        this.addUserDisplay();
        
        // Tab configurations with their classes and SVG icons
        const tabModules = [
            { name: 'mission-control', label: 'Mission Control', icon: 'home', TabClass: MissionControlTab },
            { name: 'objects', label: 'Objects', icon: 'satellite', TabClass: ObjectsTab },
            { name: 'scenarios', label: 'Scenarios', icon: 'play', TabClass: ScenariosTab },
            { name: 'conjunctions', label: 'Conjunctions', icon: 'alert', TabClass: ConjunctionsTab },
            { name: 'data', label: 'Data', icon: 'download', TabClass: DataTab },
            { name: 'settings', label: 'Settings', icon: 'settings', TabClass: SettingsTab }
        ];
        
        for (const tabInfo of tabModules) {
            try {
                const tabInstance = new tabInfo.TabClass();
                this.tabs.set(tabInfo.name, tabInstance);
                
                // Create tab button
                const tabButton = document.createElement('button');
                tabButton.className = 'engineering-tab-button';
                tabButton.dataset.tab = tabInfo.name;
                
                // Create SVG icon
                const iconSvg = this.getSvgIcon(tabInfo.icon);
                
                tabButton.innerHTML = `
                    <span class="tab-icon" style="width: 16px; height: 16px; display: flex; align-items: center;">
                        ${iconSvg}
                    </span>
                    <span class="tab-label">${tabInfo.label}</span>
                `;
                tabButton.style.cssText = `
                    background: transparent;
                    border: none;
                    color: #999;
                    padding: 8px 15px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-family: 'Orbitron', monospace;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.2s;
                    border-bottom: 2px solid transparent;
                `;
                
                tabButton.addEventListener('click', () => this.switchTab(tabInfo.name));
                tabButton.addEventListener('dblclick', () => this.toggleMinimize());
                
                this.tabBar.appendChild(tabButton);
                
                // Initialize tab content
                const tabContent = tabInstance.render();
                tabContent.style.display = 'none';
                tabContent.dataset.tabName = tabInfo.name;
                this.contentArea.appendChild(tabContent);
                
            } catch (error) {
                console.error(`[ENGINEERING TABS] Failed to initialize tab ${tabInfo.name}:`, error);
            }
        }
        
        // Add minimize/maximize button positioned absolutely
        const controlButton = document.createElement('button');
        controlButton.id = 'tab-control-button';
        controlButton.style.cssText = `
            position: absolute;
            right: 10px;
            background: transparent;
            border: 1px solid rgba(255, 0, 0, 0.3);
            color: #ff0000;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s;
        `;
        controlButton.innerHTML = this.minimized ? '▲ EXPAND' : '▼ MINIMIZE';
        controlButton.addEventListener('click', () => this.toggleMinimize());
        this.tabBar.appendChild(controlButton);
    }
    
    getSvgIcon(iconName) {
        // Simple inline SVG icons
        const icons = {
            home: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
            </svg>`,
            satellite: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M19,2L17,4V7L14,10L12,8L8,12L10,14L7,17L4,14L2,16L5,19L8,16L10,18L14,14L16,16L20,12L17,9H20L22,7L19,2Z"/>
            </svg>`,
            play: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
            </svg>`,
            settings: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97L21.54,14.63L19.66,17.78L17.06,16.89L15.56,18.35L15.77,21.05L12.47,21.5L11.03,19.05L8.97,19.05L7.53,21.5L4.23,21.05L4.44,18.35L2.94,16.89L0.34,17.78L-1.54,14.63L0.57,12.97L0,10.5L0.57,8.03L-1.54,6.37L0.34,3.22L2.94,4.11L4.44,2.65L4.23,0L7.53,-0.5L8.97,2L11.03,2L12.47,-0.5L15.77,0L15.56,2.65L17.06,4.11L19.66,3.22L21.54,6.37L19.43,8.03L20,10.5L19.43,12.97Z"/>
            </svg>`,
            alert: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
            </svg>`,
            download: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
            </svg>`
        };
        
        return icons[iconName] || icons.satellite;
    }
    
    createTimeline() {
        // Timeline scrubber for event playback (like video editing)
        const timeline = document.createElement('div');
        timeline.id = 'engineering-timeline';
        timeline.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            background: rgba(0, 0, 0, 0.8);
            border-top: 1px solid rgba(255, 0, 0, 0.2);
            display: flex;
            align-items: center;
            padding: 0 10px;
            z-index: 100;
        `;
        
        // Timeline will be implemented in separate module
        this.contentArea.appendChild(timeline);
    }
    
    switchTab(tabName) {
        if (!this.tabs.has(tabName) && !document.querySelector(`[data-tab-name="${tabName}"]`)) {
            console.warn(`[ENGINEERING TABS] Tab ${tabName} not found`);
            return;
        }
        
        // Update button states
        document.querySelectorAll('.engineering-tab-button').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.style.color = '#ff0000';
                btn.style.borderBottom = '2px solid #ff0000';
            } else {
                btn.style.color = '#999';
                btn.style.borderBottom = '2px solid transparent';
            }
        });
        
        // Hide all tab contents
        this.contentArea.querySelectorAll('[data-tab-name]').forEach(content => {
            content.style.display = 'none';
        });
        
        // Show selected tab
        const selectedContent = this.contentArea.querySelector(`[data-tab-name="${tabName}"]`);
        if (selectedContent) {
            selectedContent.style.display = 'block';
        }
        
        this.activeTab = tabName;
        
        // If minimized, expand
        if (this.minimized) {
            this.restore();
        }
        
        // Notify tab of activation
        const tab = this.tabs.get(tabName);
        if (tab && tab.onActivate) {
            tab.onActivate();
        }
    }
    
    setupResizeHandler() {
        let startY = 0;
        let startHeight = 0;
        
        this.resizeHandle.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            startY = e.clientY;
            startHeight = this.height;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            
            const deltaY = startY - e.clientY;
            const newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, startHeight + deltaY));
            
            this.height = newHeight;
            this.container.style.height = `${newHeight}px`;
            
            // Adjust main viewport if needed
            this.adjustViewport();
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                document.body.style.cursor = '';
                this.resizeHandle.style.background = 'transparent';
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + number for tabs
            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                const tabMap = {
                    '0': 'mission-control',
                    '1': 'objects',
                    '2': 'scenarios',
                    '3': 'conjunctions',
                    '4': 'data',
                    '5': 'settings'
                };
                
                if (tabMap[e.key]) {
                    e.preventDefault();
                    this.switchTab(tabMap[e.key]);
                } else if (e.key === 'm' || e.key === 'M') {
                    e.preventDefault();
                    this.toggleMinimize();
                }
            }
        });
    }
    
    toggleMinimize() {
        if (this.minimized) {
            this.restore();
        } else {
            this.minimize();
        }
    }
    
    minimize() {
        this.minimized = true;
        this.container.style.height = `${this.minHeight}px`;
        this.contentArea.style.display = 'none';
        
        const controlBtn = document.getElementById('tab-control-button');
        if (controlBtn) {
            controlBtn.innerHTML = '▲ EXPAND';
        }
        
        this.adjustViewport();
    }
    
    restore() {
        this.minimized = false;
        this.container.style.height = `${this.height}px`;
        this.contentArea.style.display = 'block';
        
        const controlBtn = document.getElementById('tab-control-button');
        if (controlBtn) {
            controlBtn.innerHTML = '▼ MINIMIZE';
        }
        
        // Default to Mission Control tab if no tab is active
        if (!this.activeTab) {
            this.switchTab('mission-control');
        }
        
        this.adjustViewport();
    }
    
    adjustViewport() {
        // Adjust the 3D viewport to account for panel height
        const canvas = document.getElementById('renderCanvas');
        const panelHeight = this.minimized ? this.minHeight : this.height;
        
        if (canvas) {
            canvas.style.height = `calc(100vh - ${panelHeight}px)`;
            
            // Trigger Babylon.js engine resize
            if (window.engine) {
                window.engine.resize();
            }
        }
        
        // Also adjust any other UI elements that might need repositioning
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.height = `calc(100vh - ${panelHeight}px)`;
        }
    }
    
    attachToViewport() {
        document.body.appendChild(this.container);
        this.adjustViewport();
    }
    
    destroy() {
        if (this.container) {
            this.container.remove();
        }
        this.tabs.clear();
        this.adjustViewport();
    }
}

// Auto-initialize when imported
let engineeringTabs = null;

export function initializeEngineeringTabs() {
    if (!engineeringTabs) {
        engineeringTabs = new EngineeringTabs();
        engineeringTabs.initialize();
        
        // Expose globally for debugging and settings update
        window.engineeringTabs = engineeringTabs;
    }
    return engineeringTabs;
}