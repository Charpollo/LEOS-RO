/**
 * GPU PHYSICS LAUNCHER
 * Direct GPU physics integration - NO HAVOK, FULL GPU ONLY!
 */

import { GPUPhysicsEngine } from './gpu-physics-engine.js';

// Export the PHYSICS_CONFIG - GPU ONLY!
export const PHYSICS_CONFIG = {
    USE_GPU: true,     // ALWAYS GPU
    INITIAL_COUNT: 1000000  // Start with 1 MILLION - GO BIG!
};

/**
 * Create GPU physics engine - FULL GPU!
 */
export async function createPhysicsEngine(scene) {
    console.log('%c🌍 RED ORBIT: GPU PHYSICS ENGINE', 'color: #ff0000; font-size: 20px; font-weight: bold');
    console.log('%c⚡ FULL GPU MODE - NO CPU FALLBACK', 'color: #00ff00; font-size: 16px');
    
    // Check WebGPU support FIRST
    if (!navigator.gpu) {
        console.error('%c❌ WebGPU NOT AVAILABLE', 'color: #ff0000; font-size: 20px; font-weight: bold');
        console.error('%c🔧 REQUIRED: Enable WebGPU in browser flags', 'color: #ffff00; font-size: 16px');
        console.error('   1. Go to: chrome://flags/#enable-unsafe-webgpu');
        console.error('   2. Set to: Enabled');
        console.error('   3. Restart Chrome');
        throw new Error('WebGPU is required for RED ORBIT GPU Physics');
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
    
    // Create simple object count controls (no modal)
    createSimpleObjectControls(gpuEngine);
    
    // Skip GPU controls modal - we're pure GPU now
    
    // Store references globally for debugging
    window.gpuPhysicsEngine = gpuEngine;
    
    
    // Log capabilities
    console.log('%c✅ WebGPU INITIALIZED - Can scale to 1,000,000 objects!', 'color: #00ff00; font-size: 16px; font-weight: bold');
    console.log('%c🎮 Press "G" to open GPU control panel', 'color: #00ffff; font-size: 14px');
    console.log('%c🔗 URL Parameters:', 'color: #ffff00; font-size: 14px');
    console.log('   ?mode=max&objects=1000000 - Million objects');
    console.log('   ?mode=mega&objects=400000 - 400K objects');
    console.log('   ?mode=catalog&objects=100000 - Full catalog');
    console.log('   ?mode=kessler&objects=50000 - Kessler syndrome');
    
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
        
        // Direct methods to GPU engine
        step(deltaTime) {
            gpuEngine.step(deltaTime);
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

/**
 * Create simple object count controls
 */
function createSimpleObjectControls(gpuEngine) {
    // Create small control panel for object counts
    const panel = document.createElement('div');
    panel.id = 'object-count-controls';
    panel.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #ff0000;
        border-radius: 4px;
        padding: 10px;
        color: white;
        font-family: monospace;
        font-size: 12px;
        z-index: 100;
    `;
    
    panel.innerHTML = `
        <div style="margin-bottom: 5px; color: #ff0000; font-weight: bold;">GPU Objects</div>
        <button onclick="window.setObjectCount(10000)" style="margin: 2px; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">10K</button>
        <button onclick="window.setObjectCount(100000)" style="margin: 2px; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">100K</button>
        <button onclick="window.setObjectCount(250000)" style="margin: 2px; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">250K</button>
        <button onclick="window.setObjectCount(500000)" style="margin: 2px; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">500K</button>
        <button onclick="window.setObjectCount(1000000)" style="margin: 2px; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; cursor: pointer;">1M</button>
    `;
    
    document.body.appendChild(panel);
    
    // Add global function to change object count
    window.setObjectCount = async (count) => {
        console.log(`Setting object count to ${count.toLocaleString()}...`);
        await gpuEngine.populateSpace(count);
    };
}

// Export GPU physics engine for direct use
export { GPUPhysicsEngine } from './gpu-physics-engine.js';