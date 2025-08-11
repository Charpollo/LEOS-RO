/**
 * CONJUNCTION ANALYSIS HISTORY MODULE
 * Saves and manages conjunction events for review
 * Flight Rules: Modular, persistent data storage
 */

export class ConjunctionHistory {
    constructor() {
        this.history = [];
        this.maxHistorySize = 1000; // Keep last 1000 events
        this.currentConjunctions = new Map(); // Active conjunctions
        this.savedAnalyses = []; // Saved analysis snapshots
        
        // Load from localStorage if available
        this.loadHistory();
    }
    
    /**
     * Add a conjunction event to history
     */
    addConjunction(conjunction) {
        const event = {
            id: `conj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...conjunction,
            status: 'active'
        };
        
        this.history.unshift(event); // Add to beginning
        this.currentConjunctions.set(event.id, event);
        
        // Trim history if too large
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
        
        this.saveHistory();
        return event;
    }
    
    /**
     * Update conjunction status
     */
    updateConjunction(id, updates) {
        const conjunction = this.currentConjunctions.get(id);
        if (conjunction) {
            Object.assign(conjunction, updates);
            
            // Update in history
            const historyIndex = this.history.findIndex(h => h.id === id);
            if (historyIndex !== -1) {
                this.history[historyIndex] = conjunction;
            }
            
            // Remove from current if resolved
            if (updates.status === 'resolved' || updates.status === 'passed') {
                this.currentConjunctions.delete(id);
            }
            
            this.saveHistory();
        }
    }
    
    /**
     * Save current analysis snapshot
     */
    saveAnalysisSnapshot(name = null) {
        const snapshot = {
            id: `snap_${Date.now()}`,
            name: name || `Analysis ${new Date().toLocaleString()}`,
            timestamp: new Date().toISOString(),
            conjunctions: Array.from(this.currentConjunctions.values()),
            totalObjects: window.gpuPhysicsEngine?.activeObjects || 0,
            riskLevel: this.calculateRiskLevel()
        };
        
        this.savedAnalyses.unshift(snapshot);
        
        // Keep only last 50 snapshots
        if (this.savedAnalyses.length > 50) {
            this.savedAnalyses = this.savedAnalyses.slice(0, 50);
        }
        
        this.saveHistory();
        return snapshot;
    }
    
    /**
     * Calculate current risk level
     */
    calculateRiskLevel() {
        const activeCount = this.currentConjunctions.size;
        const criticalCount = Array.from(this.currentConjunctions.values())
            .filter(c => c.minDistance < 1).length; // Less than 1km
        
        if (criticalCount > 5 || activeCount > 20) return 'CRITICAL';
        if (criticalCount > 2 || activeCount > 10) return 'HIGH';
        if (criticalCount > 0 || activeCount > 5) return 'MODERATE';
        if (activeCount > 0) return 'LOW';
        return 'NOMINAL';
    }
    
    /**
     * Get history for display
     */
    getHistory(limit = 100) {
        return this.history.slice(0, limit);
    }
    
    /**
     * Get active conjunctions
     */
    getActiveConjunctions() {
        return Array.from(this.currentConjunctions.values())
            .sort((a, b) => a.timeToClosest - b.timeToClosest);
    }
    
    /**
     * Get saved analyses
     */
    getSavedAnalyses() {
        return this.savedAnalyses;
    }
    
    /**
     * Load history from localStorage
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('redOrbit_conjunctionHistory');
            if (saved) {
                const data = JSON.parse(saved);
                this.history = data.history || [];
                this.savedAnalyses = data.savedAnalyses || [];
                
                // Rebuild current conjunctions from history
                this.history.forEach(conj => {
                    if (conj.status === 'active') {
                        this.currentConjunctions.set(conj.id, conj);
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load conjunction history:', error);
        }
    }
    
    /**
     * Save history to localStorage
     */
    saveHistory() {
        try {
            const data = {
                history: this.history,
                savedAnalyses: this.savedAnalyses
            };
            localStorage.setItem('redOrbit_conjunctionHistory', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save conjunction history:', error);
        }
    }
    
    /**
     * Clear all history
     */
    clearHistory() {
        this.history = [];
        this.currentConjunctions.clear();
        this.savedAnalyses = [];
        localStorage.removeItem('redOrbit_conjunctionHistory');
    }
    
    /**
     * Export history as JSON
     */
    exportHistory() {
        const data = {
            exportDate: new Date().toISOString(),
            history: this.history,
            savedAnalyses: this.savedAnalyses,
            summary: {
                totalEvents: this.history.length,
                activeConjunctions: this.currentConjunctions.size,
                savedSnapshots: this.savedAnalyses.length
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conjunction_history_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Export single conjunction event
     */
    exportSingleEvent(eventId) {
        const event = this.history.find(h => h.id === eventId);
        if (!event) {
            console.warn('Event not found:', eventId);
            return;
        }
        
        const data = {
            exportDate: new Date().toISOString(),
            event: event,
            metadata: {
                id: event.id,
                timestamp: event.timestamp,
                object1: event.object1,
                object2: event.object2,
                minDistance: event.minDistance,
                relativeVelocity: event.relativeVelocity || 'N/A',
                timeToClosestApproach: event.timeToClosestApproach || 'N/A',
                status: event.status || 'resolved'
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conjunction_${event.object1}_${event.object2}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.showNotification) {
            window.showNotification('Conjunction data exported', 'success');
        }
    }
}

// Export singleton instance
export const conjunctionHistory = new ConjunctionHistory();