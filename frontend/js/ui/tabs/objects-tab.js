/**
 * Objects Tab - Real-time satellite object management
 * Controls object count, presets, and performance monitoring
 */

export default class ObjectsTab {
    constructor() {
        this.container = null;
        this.objectCount = 10000;
        this.presets = [
            { label: '10K', value: 10000, description: 'Full tracking' },
            { label: '30K', value: 30000, description: 'NORAD catalog' },
            { label: '100K', value: 100000, description: 'Large scale' },
            { label: '400K', value: 400000, description: 'Mega scale' },
            { label: '1M', value: 1000000, description: 'Million' },
            { label: '8M', value: 8000000, description: 'Maximum' }
        ];
        this.updateInterval = null;
    }
    
    render() {
        this.container = document.createElement('div');
        this.container.className = 'objects-tab-content';
        this.container.style.cssText = `
            padding: 20px;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
            overflow-y: auto;
        `;
        
        // Object count section
        const countSection = document.createElement('div');
        countSection.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;
        
        // Title
        const title = document.createElement('h3');
        title.style.cssText = `
            color: #ff0000;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
        `;
        title.textContent = 'OBJECT COUNT CONTROL';
        countSection.appendChild(title);
        
        // Preset buttons
        const presetsContainer = document.createElement('div');
        presetsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 10px;
        `;
        
        this.presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'preset-button';
            btn.style.cssText = `
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid rgba(255, 0, 0, 0.3);
                color: #ff0000;
                padding: 10px;
                cursor: pointer;
                transition: all 0.2s;
                font-family: 'Orbitron', monospace;
            `;
            btn.innerHTML = `
                <div style="font-size: 16px; font-weight: bold;">${preset.label}</div>
                <div style="font-size: 9px; color: #999; margin-top: 3px;">${preset.description}</div>
            `;
            btn.addEventListener('click', () => this.applyPreset(preset.value));
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(255, 0, 0, 0.2)';
                btn.style.borderColor = '#ff0000';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(255, 0, 0, 0.1)';
                btn.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            });
            presetsContainer.appendChild(btn);
        });
        
        countSection.appendChild(presetsContainer);
        
        // Slider control
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '1000';
        slider.max = '8000000';
        slider.value = this.objectCount;
        slider.style.cssText = `
            flex: 1;
            height: 4px;
            background: rgba(255, 0, 0, 0.2);
            outline: none;
            -webkit-appearance: none;
        `;
        
        const countDisplay = document.createElement('span');
        countDisplay.id = 'object-count-display';
        countDisplay.style.cssText = `
            color: #ff0000;
            font-size: 18px;
            font-weight: bold;
            min-width: 120px;
            text-align: right;
            font-family: 'Orbitron', monospace;
        `;
        countDisplay.textContent = this.formatNumber(this.objectCount);
        
        slider.addEventListener('input', (e) => {
            this.objectCount = parseInt(e.target.value);
            countDisplay.textContent = this.formatNumber(this.objectCount);
        });
        
        slider.addEventListener('change', (e) => {
            this.applyObjectCount(parseInt(e.target.value));
        });
        
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(countDisplay);
        
        countSection.appendChild(sliderContainer);
        
        // Apply button
        const applyBtn = document.createElement('button');
        applyBtn.style.cssText = `
            background: linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(255, 0, 0, 0.1));
            border: 2px solid #ff0000;
            color: #ff0000;
            padding: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: all 0.3s;
            font-family: 'Orbitron', monospace;
        `;
        applyBtn.textContent = 'APPLY CHANGES';
        applyBtn.addEventListener('click', () => this.applyObjectCount(this.objectCount));
        
        countSection.appendChild(applyBtn);
        this.container.appendChild(countSection);
        
        // Performance metrics
        const metricsSection = document.createElement('div');
        metricsSection.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-top: 20px;
        `;
        
        const metrics = [
            { id: 'fps', label: 'FPS', value: '60', color: '#00ff00' },
            { id: 'objects', label: 'Active Objects', value: '10,000', color: '#ffff00' },
            { id: 'gpu', label: 'GPU Usage', value: '45%', color: '#00ffff' },
            { id: 'memory', label: 'Memory', value: '1.2 GB', color: '#ff00ff' }
        ];
        
        metrics.forEach(metric => {
            const metricBox = document.createElement('div');
            metricBox.style.cssText = `
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid ${metric.color}33;
                padding: 15px;
                text-align: center;
            `;
            metricBox.innerHTML = `
                <div style="color: #666; font-size: 10px; text-transform: uppercase; margin-bottom: 5px;">${metric.label}</div>
                <div id="${metric.id}-metric" style="color: ${metric.color}; font-size: 24px; font-weight: bold; font-family: 'Orbitron', monospace;">${metric.value}</div>
            `;
            metricsSection.appendChild(metricBox);
        });
        
        this.container.appendChild(metricsSection);
        
        return this.container;
    }
    
    onActivate() {
        // Start updating metrics
        this.startMetricsUpdate();
    }
    
    onDeactivate() {
        // Stop updating metrics
        this.stopMetricsUpdate();
    }
    
    startMetricsUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
        }, 1000);
    }
    
    stopMetricsUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    updateMetrics() {
        // Update FPS
        const fpsElement = document.getElementById('fps-metric');
        if (fpsElement && window.engine) {
            fpsElement.textContent = Math.round(window.engine.getFps());
        }
        
        // Update object count
        const objectsElement = document.getElementById('objects-metric');
        if (objectsElement && window.gpuPhysicsEngine) {
            objectsElement.textContent = this.formatNumber(window.gpuPhysicsEngine.activeObjects);
        }
        
        // Update GPU usage (simulated for now)
        const gpuElement = document.getElementById('gpu-metric');
        if (gpuElement) {
            const usage = 40 + Math.random() * 20;
            gpuElement.textContent = `${usage.toFixed(0)}%`;
        }
        
        // Update memory usage
        const memoryElement = document.getElementById('memory-metric');
        if (memoryElement && performance.memory) {
            const mb = performance.memory.usedJSHeapSize / 1024 / 1024;
            memoryElement.textContent = `${(mb / 1024).toFixed(1)} GB`;
        }
    }
    
    formatNumber(num) {
        return num.toLocaleString();
    }
    
    async applyPreset(count) {
        console.log(`[OBJECTS TAB] Applying preset: ${count} objects`);
        this.objectCount = count;
        
        // Update slider
        const slider = this.container.querySelector('input[type="range"]');
        if (slider) {
            slider.value = count;
        }
        
        // Update display
        const display = document.getElementById('object-count-display');
        if (display) {
            display.textContent = this.formatNumber(count);
        }
        
        await this.applyObjectCount(count);
    }
    
    async applyObjectCount(count) {
        console.log(`[OBJECTS TAB] Applying object count: ${count}`);
        
        // Apply to GPU physics engine
        if (window.gpuPhysicsEngine) {
            try {
                await window.gpuPhysicsEngine.populateSpace(count);
                
                // Show success notification
                this.showNotification(`Successfully updated to ${this.formatNumber(count)} objects`, 'success');
            } catch (error) {
                console.error('[OBJECTS TAB] Failed to update object count:', error);
                this.showNotification('Failed to update object count', 'error');
            }
        } else {
            console.warn('[OBJECTS TAB] GPU Physics Engine not available');
            this.showNotification('Physics engine not ready', 'warning');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 
                         type === 'error' ? 'rgba(255, 0, 0, 0.2)' : 
                         'rgba(255, 255, 0, 0.2)'};
            border: 1px solid ${type === 'success' ? '#00ff00' : 
                                type === 'error' ? '#ff0000' : 
                                '#ffff00'};
            color: ${type === 'success' ? '#00ff00' : 
                    type === 'error' ? '#ff0000' : 
                    '#ffff00'};
            font-family: 'Orbitron', monospace;
            font-size: 12px;
            z-index: 100000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}