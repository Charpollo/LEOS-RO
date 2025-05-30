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
            case 'Escape':
            case 'x':
            case 'X': {
                const dash = document.getElementById('mission-dashboard');
                if (dash) dash.classList.replace('visible','hidden');
                break;
            }
            // Add more controls as needed
        }
    });
}

// Close button click to hide mission dashboard
window.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-mission-dashboard');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const dash = document.getElementById('mission-dashboard');
            if (dash) dash.classList.replace('visible','hidden');
        });
    }
});
