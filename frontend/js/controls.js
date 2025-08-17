import * as BABYLON from '@babylonjs/core';

/**
 * Sets up global keyboard controls for the LEOS visualization.
 * @param {BABYLON.ArcRotateCamera} camera - The main camera object.
 * @param {function(number):void} setTimeMultiplier - Setter for time multiplier.
 * @param {function():number} getTimeMultiplier - Getter for time multiplier.
 */
export function setupKeyboardControls(camera, setTimeMultiplier, getTimeMultiplier) {
    // Track which keys are currently pressed
    const keysPressed = {};
    
    // Camera movement speeds - continuous per-frame movement
    const NORMAL_SPEED = 2.0;      // Normal camera movement speed (per second)
    const CINEMATIC_SPEED = 0.3;   // Smooth cinematic speed (per second)
    
    // Camera animation state
    let targetRadius = null;
    let targetAlpha = null;
    
    // Smooth camera movement on each frame
    const scene = camera.getScene();
    scene.registerBeforeRender(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000; // Convert to seconds
        
        // Handle continuous zoom
        if (keysPressed['ArrowUp'] || keysPressed['ArrowDown']) {
            const speed = keysPressed['Alt'] ? CINEMATIC_SPEED : NORMAL_SPEED;
            const zoomFactor = 1 + (speed * deltaTime);
            
            if (keysPressed['ArrowUp']) {
                // Zoom in smoothly
                camera.radius = Math.max(camera.lowerRadiusLimit, camera.radius / zoomFactor);
            } else if (keysPressed['ArrowDown']) {
                // Zoom out smoothly
                camera.radius = Math.min(camera.upperRadiusLimit, camera.radius * zoomFactor);
            }
        }
        
        // Handle continuous rotation
        if (keysPressed['ArrowLeft'] || keysPressed['ArrowRight']) {
            const speed = keysPressed['Alt'] ? CINEMATIC_SPEED : NORMAL_SPEED;
            const rotationSpeed = speed * deltaTime;
            
            if (keysPressed['ArrowLeft']) {
                camera.alpha -= rotationSpeed;
            } else if (keysPressed['ArrowRight']) {
                camera.alpha += rotationSpeed;
            }
        }
    });
    
    window.addEventListener('keydown', (event) => {
        // Track Alt key state
        if (event.key === 'Alt') {
            keysPressed['Alt'] = true;
        }
        
        // Handle arrow keys for camera movement
        if (event.key.startsWith('Arrow') && camera) {
            event.preventDefault(); // Prevent page scrolling
            keysPressed[event.key] = true;
            
            // Log for debugging when using cinematic mode
            if (event.altKey && !keysPressed['AltLogged']) {
                console.log('[Camera] Cinematic mode activated');
                keysPressed['AltLogged'] = true;
            }
            return; // Don't process other keys when arrow key is pressed
        }
        
        switch (event.key) {
            case 'r':
            case 'R':
                // R key: Real-time speed (1x)
                setTimeMultiplier(1.0);
                console.log('[Controls] Real-time speed (1x)');
                break;
            case 'f':
            case 'F':
                // F key: Fast speed (60x)
                setTimeMultiplier(60.0);
                console.log('[Controls] Fast speed (60x)');
                break;
            // O key handled by Engineering Panel
            // Arrow keys handled above for camera movement
        }
    });
    
    // Track key releases
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
        
        // Clear Alt state and logging flag
        if (event.key === 'Alt') {
            keysPressed['Alt'] = false;
            keysPressed['AltLogged'] = false;
        }
    });
}
