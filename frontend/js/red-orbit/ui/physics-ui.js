/**
 * UI elements for Red Orbit physics tests
 */
export function createPhysicsUI() {
    // Create container for physics controls
    const container = document.createElement('div');
    container.id = 'red-orbit-physics-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(255, 0, 0, 0.1);
        border: 1px solid rgba(255, 0, 0, 0.3);
        border-radius: 8px;
        padding: 15px;
        color: #ff6b00;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 14px;
        display: none;
        z-index: 1000;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(255, 0, 0, 0.2);
    `;
    
    container.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: 600; color: #ff0040;">
            🚨 RED ORBIT PHYSICS TEST
        </div>
        <div style="margin-bottom: 5px;">
            Press <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px;">P</kbd> to toggle collision test
        </div>
        <div id="physics-status" style="color: #ffcc00; font-size: 12px;">
            Status: <span id="physics-status-text">Inactive</span>
        </div>
        <div id="physics-stats" style="margin-top: 10px; font-size: 12px; display: none;">
            <div>Debris particles: <span id="debris-count">0</span></div>
            <div>Physics bodies: <span id="physics-bodies">0</span></div>
            <div>Collision: <span id="collision-status">Pending</span></div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    return {
        show() {
            container.style.display = 'block';
        },
        hide() {
            container.style.display = 'none';
        },
        updateStatus(isRunning, stats) {
            const statusText = document.getElementById('physics-status-text');
            const statsDiv = document.getElementById('physics-stats');
            
            if (isRunning) {
                statusText.textContent = 'Active';
                statusText.style.color = '#00ff00';
                statsDiv.style.display = 'block';
                
                if (stats) {
                    document.getElementById('debris-count').textContent = 
                        stats.debrisStats ? stats.debrisStats.activeDebris : 0;
                    document.getElementById('physics-bodies').textContent = 
                        stats.physicsBodyCount || 0;
                    document.getElementById('collision-status').textContent = 
                        stats.collisionOccurred ? 'DETECTED!' : 'Pending';
                    
                    if (stats.collisionOccurred) {
                        document.getElementById('collision-status').style.color = '#ff0000';
                        document.getElementById('collision-status').style.fontWeight = 'bold';
                    }
                }
            } else {
                statusText.textContent = 'Inactive';
                statusText.style.color = '#ff6b00';
                statsDiv.style.display = 'none';
            }
        }
    };
}