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
                if (camera) {
                    camera.setTarget(BABYLON.Vector3.Zero());
                    camera.setPosition(new BABYLON.Vector3(
                        camera.radius * Math.sin(camera.alpha) * Math.cos(camera.beta),
                        camera.radius * Math.sin(camera.beta),
                        camera.radius * Math.cos(camera.alpha) * Math.cos(camera.beta)
                    ));
                }
                break;
            case '+':
            case '=': // Allow both + and = for easier access
                {
                    let tm = getTimeMultiplier();
                    tm = Math.min(tm * 2, 100); // Cap max speed
                    setTimeMultiplier(tm);
                }
                break;
            case '-':
            case '_':
                {
                    let tm = getTimeMultiplier();
                    tm = Math.max(tm / 2, 0.0001); // Cap min speed
                    setTimeMultiplier(tm);
                }
                break;
            case ' ':
                // Spacebar: Pause/resume simulation (toggle timeMultiplier)
                const tm = getTimeMultiplier();
                setTimeMultiplier(tm !== 0 ? 0 : 0.1);
                break;
            case 'k':
            case 'K':
                // K key: Trigger Kessler Syndrome
                if (window.redOrbitPhysics && window.redOrbitPhysics.triggerKesslerSyndrome) {
                    console.log('[KESSLER] Syndrome triggered via hotkey');
                    window.redOrbitPhysics.triggerKesslerSyndrome();
                    
                    // Show notification
                    const notification = document.createElement('div');
                    notification.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: linear-gradient(135deg, #ff0000, #ff6600);
                        color: white;
                        padding: 20px 40px;
                        border-radius: 10px;
                        font-size: 18px;
                        font-weight: bold;
                        font-family: 'Orbitron', monospace;
                        z-index: 10000;
                        box-shadow: 0 0 50px rgba(255,0,0,0.8);
                        animation: kesslerPulse 0.5s ease-out;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                    `;
                    notification.textContent = 'KESSLER CASCADE INITIATED';
                    document.body.appendChild(notification);
                    
                    setTimeout(() => notification.remove(), 3000);
                }
                break;
            // Add more controls as needed
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
