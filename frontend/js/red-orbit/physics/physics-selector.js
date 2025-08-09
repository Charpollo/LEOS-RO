/**
 * Physics Engine for RED ORBIT
 * Using Havok for 10,000+ object support
 */

import { RedOrbitHavokPhysics } from './havok-physics.js';
import { SimpleHavokPhysics } from './havok-simple.js';
import { HavokPhysics10K } from './havok-10k.js';

export async function createPhysicsEngine(scene, useHavok = true) {
    // Use 10K version with real physics!
    const USE_10K = true;
    const USE_SIMPLE = false;
    
    let physics;
    if (USE_10K) {
        physics = new HavokPhysics10K(scene);
    } else if (USE_SIMPLE) {
        physics = new SimpleHavokPhysics(scene);
    } else {
        physics = new RedOrbitHavokPhysics(scene);
    }
    
    await physics.initialize();
    
    return physics;
}

// Configuration for Havok physics
export const PHYSICS_CONFIG = {
    // Havok is now the only physics engine
    USE_HAVOK: true,
    
    // Performance settings
    LOD_ENABLED: true,
    MAX_DEBRIS: 10000,
    PHYSICS_TIMESTEP: 1/240,
    
    // Object counts (10K with Havok)
    OBJECT_COUNTS: {
        LEO: 6000,
        MEO: 2500,
        HIGH: 1000,
        DEBRIS: 500,
        TOTAL: 10000
    },
    
    // LOD distances for performance
    LOD_DISTANCES: {
        NEAR: 1000,   // Full physics
        MID: 5000,    // Reduced physics
        FAR: 20000    // Minimal physics
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.PHYSICS_CONFIG = PHYSICS_CONFIG;
}