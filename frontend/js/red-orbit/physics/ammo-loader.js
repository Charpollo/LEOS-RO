/**
 * Ammo.js loader for Red Orbit
 * Handles loading the physics engine WASM module
 */

let ammoInstance = null;
let ammoLoadPromise = null;

export async function loadAmmo() {
    if (ammoInstance) {
        return ammoInstance;
    }
    
    if (ammoLoadPromise) {
        return ammoLoadPromise;
    }
    
    ammoLoadPromise = new Promise((resolve, reject) => {
        // Check if Ammo is already loaded
        if (typeof Ammo !== 'undefined') {
            console.log('Ammo.js already loaded, initializing...');
            if (typeof Ammo === 'function') {
                Ammo().then((AmmoLib) => {
                    ammoInstance = AmmoLib;
                    console.log('Ammo.js physics engine initialized from existing script');
                    resolve(AmmoLib);
                }).catch(reject);
                return;
            } else if (typeof Ammo === 'object') {
                // Already initialized
                ammoInstance = Ammo;
                resolve(Ammo);
                return;
            }
        }
        
        // Create script element to load Ammo.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.babylonjs.com/ammo.js';
        script.type = 'text/javascript';
        
        script.onload = () => {
            console.log('Ammo.js script loaded, initializing...');
            // Ammo() returns a promise when the WASM module is loaded
            if (typeof Ammo === 'function') {
                Ammo().then((AmmoLib) => {
                    ammoInstance = AmmoLib;
                    console.log('Ammo.js physics engine loaded successfully');
                    console.log('Ammo.js version:', AmmoLib.getVersion ? AmmoLib.getVersion() : 'Unknown');
                    resolve(AmmoLib);
                }).catch(error => {
                    console.error('Failed to initialize Ammo.js:', error);
                    reject(error);
                });
            } else {
                reject(new Error('Ammo.js not found after script load'));
            }
        };
        
        script.onerror = () => {
            reject(new Error('Failed to load Ammo.js script'));
        };
        
        document.head.appendChild(script);
    });
    
    return ammoLoadPromise;
}

export function getAmmo() {
    if (!ammoInstance) {
        throw new Error('Ammo.js not loaded. Call loadAmmo() first.');
    }
    return ammoInstance;
}