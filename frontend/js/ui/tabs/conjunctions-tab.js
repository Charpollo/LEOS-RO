/**
 * Conjunctions Tab - Real-time conjunction monitoring and history
 * Replaces the right-side conjunction panel
 */

export default class ConjunctionsTab {
    constructor() {
        this.container = null;
        this.updateInterval = null;
        this.conjunctionHistory = [];
        this.activeConjunctions = [];
    }
    
    render() {
        this.container = document.createElement('div');
        this.container.className = 'conjunctions-tab-content';
        this.container.style.cssText = `
            padding: 20px;
            height: 100%;
            display: flex;
            gap: 20px;
            overflow: hidden;
        `;
        
        // Left side - Active conjunctions list
        const leftPanel = document.createElement('div');
        leftPanel.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
        `;
        
        const activeTitle = document.createElement('h3');
        activeTitle.style.cssText = `
            color: #ff0000;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0 0 15px 0;
        `;
        activeTitle.textContent = 'ACTIVE CONJUNCTIONS';
        leftPanel.appendChild(activeTitle);
        
        const activeList = document.createElement('div');
        activeList.id = 'active-conjunctions-list';
        activeList.style.cssText = `
            flex: 1;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 0, 0, 0.2);
            padding: 10px;
            overflow-y: auto;
        `;
        leftPanel.appendChild(activeList);
        
        // Right side - Statistics and history
        const rightPanel = document.createElement('div');
        rightPanel.style.cssText = `
            width: 350px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;
        
        // Statistics
        const statsTitle = document.createElement('h3');
        statsTitle.style.cssText = `
            color: #ff0000;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
        `;
        statsTitle.textContent = 'STATISTICS';
        rightPanel.appendChild(statsTitle);
        
        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        `;
        
        const stats = [
            { id: 'total-conjunctions', label: 'Total Events', value: '0', color: '#ffff00' },
            { id: 'active-count', label: 'Active Now', value: '0', color: '#ff0000' },
            { id: 'high-risk', label: 'High Risk', value: '0', color: '#ff0000' },
            { id: 'avg-distance', label: 'Avg Distance', value: '0 km', color: '#00ffff' }
        ];
        
        stats.forEach(stat => {
            const statBox = document.createElement('div');
            statBox.style.cssText = `
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid ${stat.color}33;
                padding: 10px;
                text-align: center;
            `;
            statBox.innerHTML = `
                <div style="color: #666; font-size: 9px; margin-bottom: 5px;">${stat.label}</div>
                <div id="${stat.id}" style="color: ${stat.color}; font-size: 18px; font-weight: bold; font-family: 'Orbitron', monospace;">${stat.value}</div>
            `;
            statsGrid.appendChild(statBox);
        });
        
        rightPanel.appendChild(statsGrid);
        
        // History
        const historyTitle = document.createElement('h3');
        historyTitle.style.cssText = `
            color: #ff0000;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 15px 0 10px 0;
        `;
        historyTitle.textContent = 'RECENT HISTORY';
        rightPanel.appendChild(historyTitle);
        
        const historyList = document.createElement('div');
        historyList.id = 'conjunction-history-list';
        historyList.style.cssText = `
            flex: 1;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 0, 0, 0.2);
            padding: 10px;
            overflow-y: auto;
            max-height: 200px;
        `;
        rightPanel.appendChild(historyList);
        
        // Export buttons
        const exportButtons = document.createElement('div');
        exportButtons.style.cssText = `
            display: flex;
            gap: 10px;
            margin-top: 10px;
        `;
        
        const exportBtn = document.createElement('button');
        exportBtn.style.cssText = `
            flex: 1;
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid rgba(0, 255, 0, 0.3);
            color: #00ff00;
            padding: 8px;
            cursor: pointer;
            font-size: 11px;
            text-transform: uppercase;
            transition: all 0.2s;
        `;
        exportBtn.textContent = 'Export CSV';
        exportBtn.addEventListener('click', () => this.exportData('csv'));
        
        const grafanaBtn = document.createElement('button');
        grafanaBtn.style.cssText = exportBtn.style.cssText;
        grafanaBtn.style.background = 'rgba(255, 255, 0, 0.1)';
        grafanaBtn.style.borderColor = 'rgba(255, 255, 0, 0.3)';
        grafanaBtn.style.color = '#ffff00';
        grafanaBtn.textContent = 'Send to Grafana';
        grafanaBtn.addEventListener('click', () => this.exportData('grafana'));
        
        exportButtons.appendChild(exportBtn);
        exportButtons.appendChild(grafanaBtn);
        rightPanel.appendChild(exportButtons);
        
        this.container.appendChild(leftPanel);
        this.container.appendChild(rightPanel);
        
        return this.container;
    }
    
    onActivate() {
        console.log('[CONJUNCTIONS TAB] Activated');
        this.startUpdating();
    }
    
    onDeactivate() {
        this.stopUpdating();
    }
    
    startUpdating() {
        // Update every second
        this.updateInterval = setInterval(() => {
            this.updateConjunctions();
        }, 1000);
        
        // Initial update
        this.updateConjunctions();
    }
    
    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateConjunctions() {
        // Get data from conjunction history if available
        if (window.conjunctionHistory) {
            this.activeConjunctions = window.conjunctionHistory.getActiveConjunctions();
            this.conjunctionHistory = window.conjunctionHistory.getHistory();
            
            // Update active list
            this.renderActiveConjunctions();
            
            // Update statistics
            this.updateStatistics();
            
            // Update history
            this.renderHistory();
        }
    }
    
    renderActiveConjunctions() {
        const list = document.getElementById('active-conjunctions-list');
        if (!list) return;
        
        if (this.activeConjunctions.length === 0) {
            list.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No active conjunctions</div>';
            return;
        }
        
        list.innerHTML = '';
        this.activeConjunctions.forEach((conj, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                background: rgba(255, 0, 0, 0.05);
                border: 1px solid rgba(255, 0, 0, 0.2);
                padding: 10px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            const riskColor = conj.distance < 1 ? '#ff0000' : 
                            conj.distance < 5 ? '#ffff00' : 
                            '#00ff00';
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #ff0000; font-weight: bold;">SAT-${conj.sat1} ↔ SAT-${conj.sat2}</span>
                    <span style="color: ${riskColor}; font-size: 12px;">${conj.distance.toFixed(2)} km</span>
                </div>
                <div style="color: #666; font-size: 10px;">
                    TCA: ${new Date(conj.time).toLocaleTimeString()}
                </div>
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255, 0, 0, 0.1)';
                item.style.borderColor = '#ff0000';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.background = 'rgba(255, 0, 0, 0.05)';
                item.style.borderColor = 'rgba(255, 0, 0, 0.2)';
            });
            
            list.appendChild(item);
        });
    }
    
    updateStatistics() {
        // Update total conjunctions
        const totalEl = document.getElementById('total-conjunctions');
        if (totalEl) {
            totalEl.textContent = this.conjunctionHistory.length.toString();
        }
        
        // Update active count
        const activeEl = document.getElementById('active-count');
        if (activeEl) {
            activeEl.textContent = this.activeConjunctions.length.toString();
        }
        
        // Update high risk count
        const highRiskEl = document.getElementById('high-risk');
        if (highRiskEl) {
            const highRisk = this.activeConjunctions.filter(c => c.distance < 1).length;
            highRiskEl.textContent = highRisk.toString();
        }
        
        // Update average distance
        const avgEl = document.getElementById('avg-distance');
        if (avgEl && this.activeConjunctions.length > 0) {
            const avg = this.activeConjunctions.reduce((sum, c) => sum + c.distance, 0) / this.activeConjunctions.length;
            avgEl.textContent = `${avg.toFixed(1)} km`;
        }
    }
    
    renderHistory() {
        const list = document.getElementById('conjunction-history-list');
        if (!list) return;
        
        const recent = this.conjunctionHistory.slice(-10).reverse(); // Last 10 events
        
        if (recent.length === 0) {
            list.innerHTML = '<div style="color: #666; text-align: center;">No historical data</div>';
            return;
        }
        
        list.innerHTML = '';
        recent.forEach(event => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 5px;
                border-bottom: 1px solid rgba(255, 0, 0, 0.1);
                color: #999;
                font-size: 11px;
            `;
            
            item.innerHTML = `
                <div>${new Date(event.time).toLocaleTimeString()} - ${event.distance.toFixed(2)} km</div>
                <div style="color: #666; font-size: 9px;">SAT-${event.sat1} ↔ SAT-${event.sat2}</div>
            `;
            
            list.appendChild(item);
        });
    }
    
    exportData(format) {
        console.log(`[CONJUNCTIONS TAB] Exporting data as ${format}`);
        
        if (format === 'csv') {
            this.exportCSV();
        } else if (format === 'grafana') {
            this.sendToGrafana();
        }
    }
    
    exportCSV() {
        // Create CSV content
        let csv = 'Time,Satellite1,Satellite2,Distance(km),Risk\n';
        
        this.conjunctionHistory.forEach(event => {
            const risk = event.distance < 1 ? 'HIGH' : event.distance < 5 ? 'MEDIUM' : 'LOW';
            csv += `${new Date(event.time).toISOString()},${event.sat1},${event.sat2},${event.distance},${risk}\n`;
        });
        
        // Download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conjunctions_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    sendToGrafana() {
        // TODO: Implement Grafana webhook integration
        console.log('[CONJUNCTIONS TAB] Grafana integration not yet implemented');
    }
}