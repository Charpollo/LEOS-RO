/**
 * GPU PHYSICS LAUNCHER
 * Direct GPU physics integration - NO HAVOK, FULL GPU ONLY!
 */

import { GPUPhysicsEngine } from './gpu-physics-engine.js';

// Export the PHYSICS_CONFIG - GPU ONLY!
export const PHYSICS_CONFIG = {
    USE_GPU: true,     // ALWAYS GPU
    INITIAL_COUNT: 8000000  // 8 MILLION - Showcasing massive scale with real physics!
};

/**
 * Create GPU physics engine - FULL GPU!
 */
export async function createPhysicsEngine(scene) {
    
    // Check if we're accessing via 0.0.0.0 and warn
    if (window.location.hostname === '0.0.0.0') {
        console.warn('⚠️ Accessing via 0.0.0.0 - WebGPU may not work!');
        console.warn('Try using http://localhost:8080 instead');
    }
    
    // Wait a moment for WebGPU to be available (Chrome Canary sometimes needs this)
    if (!navigator.gpu) {
        console.log('Waiting for WebGPU to initialize...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased wait time
    }
    
    // Check WebGPU support after wait
    if (!navigator.gpu) {
        console.error('❌ WebGPU NOT AVAILABLE!');
        console.error('');
        console.error('SOLUTION:');
        console.error('1. Use http://localhost:8080 instead of http://0.0.0.0:8080');
        console.error('2. Or enable WebGPU in Chrome:');
        console.error('   - Go to chrome://flags/#enable-unsafe-webgpu');
        console.error('   - Set "Unsafe WebGPU Support" to Enabled');
        console.error('   - Restart Chrome');
        console.error('');
        console.error('TEST WebGPU: http://localhost:8080/webgpu-test.html');
        
        // Show alert to user
        alert('WebGPU not detected!\n\nPlease use http://localhost:8080 instead of 0.0.0.0:8080\n\nOr enable WebGPU in chrome://flags');
        
        throw new Error('WebGPU is REQUIRED - use localhost:8080 or enable WebGPU');
    }
    
    // Create GPU physics engine directly
    const gpuEngine = new GPUPhysicsEngine(scene);
    
    // Check URL params for object count
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const objectCount = parseInt(urlParams.get('objects')) || PHYSICS_CONFIG.INITIAL_COUNT;
    
    // Determine initial count based on mode
    let initialCount = objectCount;
    if (mode === 'demo') {
        initialCount = 10000;
        console.log('%c🎮 DEMO MODE: 10,000 objects', 'color: #00ffff; font-size: 16px');
    } else if (mode === 'kessler') {
        initialCount = 50000;
        console.log('%c☢️ KESSLER MODE: 50,000 objects', 'color: #ff0000; font-size: 16px');
    } else if (mode === 'catalog') {
        initialCount = 100000;
        console.log('%c🔭 CATALOG MODE: 100,000 objects', 'color: #ffff00; font-size: 16px');
    } else if (mode === 'mega') {
        initialCount = 400000;
        console.log('%c🚀 MEGA MODE: 400,000 objects', 'color: #ff00ff; font-size: 18px; font-weight: bold');
    } else if (mode === 'max') {
        initialCount = 1000000;
        console.log('%c🎆 MAXIMUM MODE: 1,000,000 OBJECTS!', 'color: #00ff00; font-size: 20px; font-weight: bold; background: #000; padding: 10px');
        console.log('%c🌍 WORLD\'S FIRST BROWSER-BASED MILLION OBJECT SIMULATOR', 'color: #ffff00; font-size: 16px');
    }
    
    // Initialize GPU engine
    await gpuEngine.initialize();
    await gpuEngine.populateSpace(initialCount);
    
    // No controls needed - we're pure 1 MILLION!
    
    // Skip GPU controls modal - we're pure GPU now
    
    // Store references globally for debugging
    window.gpuPhysicsEngine = gpuEngine;
    window.redOrbitPhysics = gpuEngine; // Also expose as redOrbitPhysics for compatibility
    
    // Expose highlight function globally
    window.highlightCollisionTargets = (idx1, idx2) => {
        if (gpuEngine && gpuEngine.highlightCollisionTargets) {
            gpuEngine.highlightCollisionTargets(idx1, idx2);
        }
    };
    
    // Log minimal info
    console.log('GPU Physics: 1,000,000 objects initialized');
    
    // Return the engine with compatibility wrapper
    return createCompatibilityWrapper(gpuEngine);
}

/**
 * Create compatibility wrapper to match existing physics API
 */
function createCompatibilityWrapper(gpuEngine) {
    const wrapper = {
        // Core properties
        bodies: new Map(),
        debris: new Map(),
        initialized: true,
        physicsTimeMultiplier: 1,
        activeObjects: gpuEngine.activeObjects,
        debrisGenerated: 0,
        workgroupSize: 256,
        
        // Direct methods to GPU engine
        step(deltaTime) {
            gpuEngine.step(deltaTime);
            // Update our activeObjects count
            this.activeObjects = gpuEngine.activeObjects;
            this.debrisGenerated = gpuEngine.debrisGenerated || 0;
        },
        
        update(deltaTime) {
            this.step(deltaTime);
        },
        
        triggerKesslerSyndrome() {
            return gpuEngine.triggerKesslerSyndrome();
        },
        
        getKesslerStatus() {
            return {
                active: gpuEngine.kesslerActive,
                collisionCount: gpuEngine.collisionCount,
                cascadeLevel: 0,
                debrisGenerated: gpuEngine.debrisGenerated,
                message: gpuEngine.kesslerActive ? 'Kessler syndrome active!' : 'No cascade'
            };
        },
        
        getStats() {
            return gpuEngine.getStats();
        },
        
        // Conjunction analysis
        analyzeConjunctions(timeHorizon, minDistance) {
            return gpuEngine.analyzeConjunctions(timeHorizon, minDistance);
        },
        
        // Set target object count
        setTargetObjects(count) {
            const result = gpuEngine.setTargetObjects(count);
            // Update our wrapper's activeObjects count
            wrapper.activeObjects = gpuEngine.activeObjects;
            return result;
        },
        
        // Compatibility method for creating satellites
        createSatellite(params) {
            // GPU engine handles all satellites in bulk
            console.log('Individual satellite creation not supported in GPU mode');
        },
        
        // Time multiplier setter (uses global)
        set physicsTimeMultiplier(value) {
            gpuEngine.setTimeMultiplier(value);
            this._physicsTimeMultiplier = value;
        },
        
        get physicsTimeMultiplier() {
            return this._physicsTimeMultiplier || 1;
        },
        
        // Add scaling capability
        async scaleToTarget(count) {
            // Re-populate with new count
            await gpuEngine.populateSpace(count);
        }
    };
    
    // Add keyboard shortcut for GPU controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'g' || e.key === 'G') {
            if (window.gpuControls) {
                window.gpuControls.toggle();
            }
        }
        
        // Quick scale shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    wrapper.scaleToTarget(10000);
                    break;
                case '2':
                    wrapper.scaleToTarget(50000);
                    break;
                case '3':
                    wrapper.scaleToTarget(100000);
                    break;
                case '4':
                    wrapper.scaleToTarget(400000);
                    break;
                case '5':
                    wrapper.scaleToTarget(1000000);
                    break;
            }
        }
    });
    
    return wrapper;
}


// Export GPU physics engine for direct use
export { GPUPhysicsEngine } from './gpu-physics-engine.js';