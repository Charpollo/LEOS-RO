import * as BABYLON from '@babylonjs/core';

/**
 * Sets up global keyboard controls for the LEOS visualization.
 * @param {BABYLON.ArcRotateCamera} camera - The main camera object.
 * @param {function(number):void} setTimeMultiplier - Setter for time multiplier.
 * @param {function():number} getTimeMultiplier - Getter for time multiplier.
 */
export function setupKeyboardControls(camera, setTimeMultiplier, getTimeMultiplier) {
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'r':
            case 'R':
                if (camera) camera.setTarget(BABYLON.Vector3.Zero());
                break;
            case ' ':
                // Spacebar: Pause/resume simulation (toggle timeMultiplier)
                const tm = getTimeMultiplier();
                setTimeMultiplier(tm !== 0 ? 0 : 0.1);
                break;
            // Add more controls as needed
        }
    });
}
