/**
 * Red Orbit Collision Controls
 * UI for triggering and managing collisions
 */

export function createCollisionControls(scene) {
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'red-orbit-collision-controls';
    controlsContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(20, 0, 0, 0.9);
        border: 2px solid #ff3300;
        border-radius: 8px;
        padding: 15px;
        color: #ff6600;
        font-family: monospace;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(255, 51, 0, 0.5);
    `;
    
    controlsContainer.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #ff3300;">Red Orbit Controls</h3>
        <button id="trigger-collision" style="
            background: #ff3300;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px 0;
            width: 100%;
            font-weight: bold;
        ">Trigger Collision</button>
        <button id="toggle-physics" style="
            background: #ff6600;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px 0;
            width: 100%;
        ">Enable Physics</button>
        <div id="physics-stats" style="
            margin-top: 10px;
            font-size: 12px;
            color: #ffaa00;
        ">
            <div>Satellites: <span id="sat-count">0</span></div>
            <div>Debris: <span id="debris-count">0</span></div>
            <div>Physics Active: <span id="physics-active">No</span></div>
        </div>
    `;
    
    document.body.appendChild(controlsContainer);
    
    // Button handlers
    const triggerBtn = document.getElementById('trigger-collision');
    const toggleBtn = document.getElementById('toggle-physics');
    
    triggerBtn.addEventListener('click', () => {
        if (window.hybridOrbitalSystem) {
            triggerTestCollision();
        } else {
            alert('Physics system not initialized!');
        }
    });
    
    toggleBtn.addEventListener('click', () => {
        if (window.hybridOrbitalSystem) {
            toggleBtn.textContent = window.hybridOrbitalSystem.initialized ? 'Physics Enabled' : 'Enable Physics';
            updateStats();
        }
    });
    
    // Update stats periodically
    setInterval(updateStats, 1000);
    
    return controlsContainer;
}

/**
 * Trigger a test collision between two satellites
 */
function triggerTestCollision() {
    const system = window.hybridOrbitalSystem;
    if (!system) return;
    
    // Get two random satellites
    const satellites = Array.from(system.satellites.keys());
    if (satellites.length < 2) {
        alert('Need at least 2 satellites for collision!');
        return;
    }
    
    // Pick two satellites
    const sat1Id = satellites[0];
    const sat2Id = satellites[1];
    
    console.log(`Triggering collision between ${sat1Id} and ${sat2Id}`);
    
    // Get current positions
    const sat1 = system.satellites.get(sat1Id);
    const sat2 = system.satellites.get(sat2Id);
    
    if (!sat1 || !sat2) return;
    
    // Calculate collision position (midpoint)
    const pos1 = sat1.mesh.position;
    const pos2 = sat2.mesh.position;
    
    const collisionPos = {
        x: (pos1.x + pos2.x) / 2 * 6371, // Convert to km
        y: (pos1.y + pos2.y) / 2 * 6371,
        z: (pos1.z + pos2.z) / 2 * 6371
    };
    
    // Simulate high-speed collision
    const relativeVelocity = 7.5 + Math.random() * 7.5; // 7.5-15 km/s
    
    // Trigger the collision in the physics system
    system.handleCollision({
        id0: `proxy_${sat1Id}`,
        id1: `proxy_${sat2Id}`,
        position: collisionPos,
        relativeVelocity: relativeVelocity
    });
    
    // Flash effect
    createCollisionFlash(collisionPos);
}

/**
 * Create visual flash effect
 */
function createCollisionFlash(position) {
    const scene = window.scene;
    if (!scene) return;
    
    const flash = BABYLON.MeshBuilder.CreateSphere('collision-flash', {
        diameter: 0.2,
        segments: 16
    }, scene);
    
    const material = new BABYLON.StandardMaterial('flash-mat', scene);
    material.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
    material.disableLighting = true;
    flash.material = material;
    
    // Position at collision point
    flash.position.x = position.x / 6371;
    flash.position.y = position.y / 6371;
    flash.position.z = position.z / 6371;
    
    // Animate flash
    let scale = 1;
    let alpha = 1;
    
    const animationId = setInterval(() => {
        scale += 0.2;
        alpha -= 0.05;
        
        if (alpha <= 0) {
            clearInterval(animationId);
            flash.dispose();
        } else {
            flash.scaling = new BABYLON.Vector3(scale, scale, scale);
            material.alpha = alpha;
        }
    }, 16);
}

/**
 * Update statistics display
 */
function updateStats() {
    const system = window.hybridOrbitalSystem;
    if (!system) return;
    
    const stats = system.getStats();
    
    document.getElementById('sat-count').textContent = stats.satelliteCount;
    document.getElementById('debris-count').textContent = stats.debrisCount;
    document.getElementById('physics-active').textContent = system.initialized ? 'Yes' : 'No';
}