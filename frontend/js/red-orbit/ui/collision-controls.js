/**
 * Red Orbit Collision Controls
 * UI for triggering and managing collisions
 */

import * as BABYLON from '@babylonjs/core';

export function createCollisionControls(scene) {
    // Controls are now integrated into the Red Orbit modal
    // This function only sets up event listeners, no UI overlay
    
    // Listen for Red Orbit modal trigger
    window.addEventListener('redOrbitCollision', () => {
        triggerTestCollision();
    });
    
    // Update stats periodically for the modal
    setInterval(updateStats, 1000);
    
    return null; // No UI container created
}

/**
 * Trigger a test collision between SDA orbs
 */
function triggerTestCollision() {
    const system = window.redOrbitPhysics;
    const scene = window.scene;
    if (!system || !scene) return;
    
    // Get all SDA orb meshes
    const sdaOrbs = scene.meshes.filter(mesh => 
        mesh.name && (mesh.name.includes('sda_instance') || mesh.name.includes('special_'))
    );
    
    if (sdaOrbs.length >= 2) {
        // Pick two random SDA orbs
        const orb1 = sdaOrbs[Math.floor(Math.random() * sdaOrbs.length)];
        const orb2 = sdaOrbs[Math.floor(Math.random() * sdaOrbs.length)];
        
        if (orb1 === orb2 && sdaOrbs.length > 2) {
            // Pick a different orb
            const index = sdaOrbs.indexOf(orb1);
            orb2 = sdaOrbs[(index + 1) % sdaOrbs.length];
        }
        
        // Triggering catastrophic collision between SDA orbs
        
        // Create massive explosion at collision point
        const collisionPos = {
            x: (orb1.position.x + orb2.position.x) / 2,
            y: (orb1.position.y + orb2.position.y) / 2,
            z: (orb1.position.z + orb2.position.z) / 2
        };
        
        // Create cascading debris field
        createCascadingDebris(collisionPos, orb1, orb2);
        
        // Hide/destroy the colliding orbs
        orb1.isVisible = false;
        orb2.isVisible = false;
        
        // Trigger chain reaction after delay
        setTimeout(() => {
            triggerChainReaction(collisionPos, sdaOrbs);
        }, 500);
        
        return;
    }
    
    // Fallback to satellites
    const satellites = Array.from(system.satellites.keys());
    if (satellites.length < 2) {
        // Need at least 2 objects for collision
        return;
    }
    
    const sat1Id = satellites[0];
    const sat2Id = satellites[1];
    const sat1 = system.satellites.get(sat1Id);
    const sat2 = system.satellites.get(sat2Id);
    
    if (!sat1 || !sat2) return;
    
    // Get proper satellite positions from orbital mechanics
    // Satellites are at ~800km altitude, not at Earth surface
    const pos1 = sat1.mesh.position;
    const pos2 = sat2.mesh.position;
    
    // These positions are already scaled, need to get actual orbital radius
    // Assuming LEO at 800km altitude = 7171km from Earth center
    const orbitalRadius = 7171; // km (Earth radius 6371 + 800km altitude)
    
    const collisionPos = {
        x: (pos1.x + pos2.x) / 2 * orbitalRadius,
        y: (pos1.y + pos2.y) / 2 * orbitalRadius,
        z: (pos1.z + pos2.z) / 2 * orbitalRadius
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
        diameter: 1.0,  // Larger initial size
        segments: 32
    }, scene);
    
    const material = new BABYLON.StandardMaterial('flash-mat', scene);
    material.emissiveColor = new BABYLON.Color3(1, 0.3, 0);  // Bright red-orange
    material.disableLighting = true;
    material.alpha = 1.0;
    flash.material = material;
    
    // Position at collision point
    flash.position.x = position.x / 6371;
    flash.position.y = position.y / 6371;
    flash.position.z = position.z / 6371;
    
    // Create expanding ring effect
    const ring = BABYLON.MeshBuilder.CreateTorus('collision-ring', {
        diameter: 2,
        thickness: 0.1,
        tessellation: 32
    }, scene);
    
    const ringMat = new BABYLON.StandardMaterial('ring-mat', scene);
    ringMat.emissiveColor = new BABYLON.Color3(1, 0.5, 0);
    ringMat.disableLighting = true;
    ringMat.alpha = 0.8;
    ring.material = ringMat;
    ring.position = flash.position.clone();
    
    // Animate flash and ring
    let scale = 1;
    let ringScale = 1;
    let alpha = 1;
    
    const animationId = setInterval(() => {
        scale += 0.3;  // Faster expansion
        ringScale += 0.5;
        alpha -= 0.02;  // Slower fade
        
        if (alpha <= 0) {
            clearInterval(animationId);
            flash.dispose();
            ring.dispose();
        } else {
            flash.scaling = new BABYLON.Vector3(scale, scale, scale);
            ring.scaling = new BABYLON.Vector3(ringScale, ringScale, ringScale);
            material.alpha = alpha;
            ringMat.alpha = alpha * 0.8;
        }
    }, 16);
}

/**
 * Create cascading debris from collision
 */
function createCascadingDebris(position, orb1, orb2) {
    const scene = window.scene;
    if (!scene) return;
    
    // Create multiple debris pieces
    const debrisCount = 20 + Math.floor(Math.random() * 30);
    
    for (let i = 0; i < debrisCount; i++) {
        const debris = BABYLON.MeshBuilder.CreateSphere(`debris_${Date.now()}_${i}`, {
            diameter: 0.002 + Math.random() * 0.008,
            segments: 8
        }, scene);
        
        // Red/orange/yellow debris colors
        const material = new BABYLON.StandardMaterial(`debris_mat_${i}`, scene);
        const colorChoice = Math.random();
        if (colorChoice < 0.33) {
            material.emissiveColor = new BABYLON.Color3(1, 0, 0); // Red
        } else if (colorChoice < 0.66) {
            material.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Orange
        } else {
            material.emissiveColor = new BABYLON.Color3(1, 1, 0); // Yellow
        }
        material.disableLighting = true;
        debris.material = material;
        
        // Position at collision point
        debris.position = position.clone();
        
        // Add explosive velocity
        const speed = 0.001 + Math.random() * 0.005;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        const velocity = new BABYLON.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.sin(phi) * Math.sin(theta) * speed,
            Math.cos(phi) * speed
        );
        
        // Animate debris
        let frame = 0;
        scene.registerBeforeRender(() => {
            if (debris && !debris.isDisposed()) {
                debris.position.addInPlace(velocity);
                
                // Fade out and remove after time
                frame++;
                if (frame > 300) {
                    material.alpha = Math.max(0, 1 - (frame - 300) / 100);
                    if (frame > 400) {
                        debris.dispose();
                    }
                }
            }
        });
    }
}

/**
 * Trigger chain reaction with nearby objects
 */
function triggerChainReaction(epicenter, allOrbs) {
    const scene = window.scene;
    if (!scene) return;
    
    // Find orbs within blast radius
    const blastRadius = 0.5;
    const affectedOrbs = allOrbs.filter(orb => {
        if (!orb.isVisible) return false;
        const distance = BABYLON.Vector3.Distance(orb.position, epicenter);
        return distance < blastRadius && distance > 0;
    });
    
    // Create secondary explosions
    affectedOrbs.forEach((orb, index) => {
        setTimeout(() => {
            if (orb.isVisible) {
                createCollisionFlash({
                    x: orb.position.x * 6371,
                    y: orb.position.y * 6371,
                    z: orb.position.z * 6371
                });
                
                // Create more debris
                createCascadingDebris(orb.position, orb, orb);
                
                // Hide the orb
                orb.isVisible = false;
                
                // Update debris count
                const debrisCount = document.getElementById('active-debris-count');
                if (debrisCount) {
                    const current = parseInt(debrisCount.textContent) || 0;
                    debrisCount.textContent = current + 10 + Math.floor(Math.random() * 20);
                }
            }
        }, index * 200); // Staggered explosions
    });
}

/**
 * Update statistics display
 */
function updateStats() {
    const system = window.redOrbitPhysics;
    if (!system) return;
    
    const stats = system.getStats();
    
    // Update modal stats if visible
    const modalDebrisCount = document.getElementById('modal-debris-count');
    if (modalDebrisCount) {
        modalDebrisCount.textContent = stats.debrisCount;
    }
}