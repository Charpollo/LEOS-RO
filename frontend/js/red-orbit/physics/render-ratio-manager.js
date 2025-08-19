/**
 * Render Ratio Manager
 * Manages the simulated:rendered object ratio following flight rules
 * Minimum 2:1 ratio (simulated:rendered) for proper visualization
 */

export class RenderRatioManager {
    constructor() {
        // Minimum ratio enforced
        this.MIN_RATIO = 2.0;
        
        // Current configuration
        this.config = {
            simulated: 30000,  // Updated default for telemetry optimization
            rendered: 15000,   // Updated default for telemetry optimization
            ratio: 2.0
        };
        
        // Render indices for mapping simulated to rendered objects
        this.renderIndices = null;
        this.pinnedObjects = new Set(); // Objects that must always be rendered
        this.swapRate = 0.02; // 2% swap rate per second
        this.minDwell = 3000; // Minimum 3 seconds before swap
        this.lastSwapTime = 0;
        this.objectDwellTimes = new Map();
        
        // Initialize default render indices
        this.buildRenderIndices();
    }
    
    /**
     * Set object counts with validation
     * @param {number} simulated - Total simulated objects
     * @param {number} rendered - Objects to render
     * @returns {boolean} Success
     */
    setObjectCounts(simulated, rendered) {
        const ratio = simulated / rendered;
        
        // Allow exact 2:1 ratio (>= instead of >)
        if (ratio < this.MIN_RATIO) {
            // For exact 2:1 ratio, allow it
            if (Math.abs(ratio - this.MIN_RATIO) < 0.01) {
                // Close enough to 2:1, accept it
            } else {
                console.warn(`[RenderRatio] Invalid ratio ${ratio.toFixed(1)}:1, minimum is ${this.MIN_RATIO}:1`);
                return false;
            }
        }
        
        this.config.simulated = simulated;
        this.config.rendered = rendered;
        this.config.ratio = ratio;
        
        // Rebuild render indices
        this.buildRenderIndices();
        
        console.log(`[RenderRatio] Configuration applied: ${simulated} simulated, ${rendered} rendered (${ratio.toFixed(1)}:1)`);
        return true;
    }
    
    /**
     * Build render indices using center-of-bin approach
     * Following flight-rules/render-sim.md guidelines
     */
    buildRenderIndices() {
        const { simulated, rendered } = this.config;
        const actualRendered = Math.min(rendered, simulated);
        
        this.renderIndices = new Uint32Array(actualRendered);
        const step = simulated / actualRendered;
        let accumulator = 0.5 * step; // Center-of-bin approach
        
        for (let i = 0; i < actualRendered; i++) {
            const idx = Math.floor(accumulator);
            this.renderIndices[i] = idx >= simulated ? simulated - 1 : idx;
            accumulator += step;
        }
        
        // Initialize dwell times
        this.objectDwellTimes.clear();
        const now = performance.now();
        for (let i = 0; i < actualRendered; i++) {
            this.objectDwellTimes.set(this.renderIndices[i], now);
        }
    }
    
    /**
     * Pin objects that must always be rendered (events, conjunctions, etc.)
     * @param {number[]} indices - Array of object indices to pin
     */
    pinObjects(indices) {
        indices.forEach(idx => this.pinnedObjects.add(idx));
        this.updateRenderIndicesWithPins();
    }
    
    /**
     * Unpin objects
     * @param {number[]} indices - Array of object indices to unpin
     */
    unpinObjects(indices) {
        indices.forEach(idx => this.pinnedObjects.delete(idx));
    }
    
    /**
     * Update render indices to include pinned objects
     */
    updateRenderIndicesWithPins() {
        if (this.pinnedObjects.size === 0) return;
        
        const { rendered } = this.config;
        const pinnedArray = Array.from(this.pinnedObjects);
        const nonPinnedCount = rendered - pinnedArray.length;
        
        if (nonPinnedCount <= 0) {
            // All slots taken by pinned objects
            this.renderIndices = new Uint32Array(pinnedArray);
            return;
        }
        
        // Rebuild with pinned objects first
        const newIndices = new Uint32Array(rendered);
        let idx = 0;
        
        // Add pinned objects first
        for (const pinned of pinnedArray) {
            newIndices[idx++] = pinned;
        }
        
        // Fill remaining with sampled objects
        const step = this.config.simulated / nonPinnedCount;
        let accumulator = 0.5 * step;
        
        for (let i = 0; i < nonPinnedCount && idx < rendered; i++) {
            const objIdx = Math.floor(accumulator);
            if (!this.pinnedObjects.has(objIdx)) {
                newIndices[idx++] = objIdx;
            }
            accumulator += step;
        }
        
        this.renderIndices = newIndices;
    }
    
    /**
     * Perform background object swapping for dynamic visualization
     * @param {number} deltaTime - Time since last update in ms
     */
    updateSwapping(deltaTime) {
        const now = performance.now();
        
        // Check if enough time has passed for swapping
        if (now - this.lastSwapTime < 1000 / this.swapRate) {
            return;
        }
        
        const { simulated, rendered } = this.config;
        const swapCount = Math.floor(rendered * this.swapRate / 100);
        
        // Find objects that have exceeded minimum dwell time
        const swappableIndices = [];
        for (let i = 0; i < this.renderIndices.length; i++) {
            const objIdx = this.renderIndices[i];
            if (!this.pinnedObjects.has(objIdx)) {
                const dwellTime = now - (this.objectDwellTimes.get(objIdx) || 0);
                if (dwellTime > this.minDwell) {
                    swappableIndices.push(i);
                }
            }
        }
        
        // Perform swaps
        const actualSwaps = Math.min(swapCount, swappableIndices.length);
        for (let i = 0; i < actualSwaps; i++) {
            const swapIdx = swappableIndices[Math.floor(Math.random() * swappableIndices.length)];
            const newObjIdx = Math.floor(Math.random() * simulated);
            
            // Only swap if not already rendered
            if (!this.isObjectRendered(newObjIdx)) {
                this.renderIndices[swapIdx] = newObjIdx;
                this.objectDwellTimes.set(newObjIdx, now);
            }
        }
        
        this.lastSwapTime = now;
    }
    
    /**
     * Check if an object index is currently being rendered
     * @param {number} objIdx - Object index to check
     * @returns {boolean}
     */
    isObjectRendered(objIdx) {
        for (let i = 0; i < this.renderIndices.length; i++) {
            if (this.renderIndices[i] === objIdx) return true;
        }
        return false;
    }
    
    /**
     * Get the current render indices
     * @returns {Uint32Array}
     */
    getRenderIndices() {
        return this.renderIndices;
    }
    
    /**
     * Get current statistics
     * @returns {Object}
     */
    getStats() {
        return {
            simulated: this.config.simulated,
            rendered: this.config.rendered,
            ratio: this.config.ratio,
            pinned: this.pinnedObjects.size,
            swapRate: this.swapRate,
            minDwell: this.minDwell
        };
    }
}

// Export singleton instance
export const renderRatioManager = new RenderRatioManager();