import * as BABYLON from '@babylonjs/core';

/**
 * Simple debris visual test for Red Orbit
 * Tests debris visualization without physics first
 */
export class SimpleDebrisTest {
    constructor(scene) {
        this.scene = scene;
        this.isRunning = false;
        this.debris = [];
        this.testSatellites = [];
    }

    /**
     * Create visual test without physics
     */
    start() {
        if (this.isRunning) return;
        
        console.log('Starting simple debris visual test...');
        this.isRunning = true;
        
        // Create two test satellites
        this.createTestSatellites();
        
        // Create a simple debris field
        this.createDebrisField();
    }

    /**
     * Create test satellites
     */
    createTestSatellites() {
        // Satellite 1 - Blue
        const sat1 = BABYLON.MeshBuilder.CreateBox('testSat1', {
            size: 0.02
        }, this.scene);
        
        const mat1 = new BABYLON.StandardMaterial('sat1Mat', this.scene);
        mat1.diffuseColor = new BABYLON.Color3(0, 0.7, 1);
        mat1.emissiveColor = new BABYLON.Color3(0, 0.3, 0.5);
        sat1.material = mat1;
        sat1.position.set(-1, 0, 0);
        
        // Satellite 2 - Yellow  
        const sat2 = BABYLON.MeshBuilder.CreateBox('testSat2', {
            size: 0.02
        }, this.scene);
        
        const mat2 = new BABYLON.StandardMaterial('sat2Mat', this.scene);
        mat2.diffuseColor = new BABYLON.Color3(1, 0.7, 0);
        mat2.emissiveColor = new BABYLON.Color3(0.5, 0.3, 0);
        sat2.material = mat2;
        sat2.position.set(1, 0, 0);
        
        this.testSatellites.push(sat1, sat2);
        
        // Animate satellites moving toward each other
        let time = 0;
        this.scene.registerBeforeRender(() => {
            if (!this.isRunning) return;
            
            time += 0.016; // ~60fps
            
            // Move satellites
            sat1.position.x = -1 + time * 0.2;
            sat2.position.x = 1 - time * 0.2;
            
            // Check for "collision"
            if (Math.abs(sat1.position.x - sat2.position.x) < 0.05 && this.testSatellites.length > 0) {
                console.log('Visual collision detected!');
                this.createCollisionDebris(sat1.position);
                
                // Hide satellites
                sat1.isVisible = false;
                sat2.isVisible = false;
                this.testSatellites = [];
            }
        });
    }

    /**
     * Create a debris field
     */
    createDebrisField() {
        const debrisMat = new BABYLON.StandardMaterial('debrisMat', this.scene);
        debrisMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.1);
        debrisMat.emissiveColor = new BABYLON.Color3(1, 0.2, 0);
        debrisMat.specularColor = new BABYLON.Color3(0, 0, 0);
        
        // Create 20 debris particles
        for (let i = 0; i < 20; i++) {
            const size = 0.001 + Math.random() * 0.004;
            const debris = BABYLON.MeshBuilder.CreateSphere(`debris_${i}`, {
                diameter: size * 2,
                segments: 4
            }, this.scene);
            
            debris.material = debrisMat;
            
            // Random position in upper area
            debris.position.x = (Math.random() - 0.5) * 0.5;
            debris.position.y = 0.5 + Math.random() * 0.3;
            debris.position.z = (Math.random() - 0.5) * 0.5;
            
            // Store debris
            this.debris.push({
                mesh: debris,
                velocity: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                }
            });
        }
        
        // Animate debris
        this.scene.registerBeforeRender(() => {
            if (!this.isRunning) return;
            
            this.debris.forEach(d => {
                d.mesh.position.x += d.velocity.x;
                d.mesh.position.y += d.velocity.y;
                d.mesh.position.z += d.velocity.z;
            });
        });
    }

    /**
     * Create collision debris
     */
    createCollisionDebris(position) {
        const debrisMat = new BABYLON.StandardMaterial('collisionDebrisMat', this.scene);
        debrisMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
        debrisMat.emissiveColor = new BABYLON.Color3(1, 0.7, 0);
        
        // Create explosion debris
        for (let i = 0; i < 50; i++) {
            const size = 0.001 + Math.random() * 0.003;
            const debris = BABYLON.MeshBuilder.CreateSphere(`collision_debris_${i}`, {
                diameter: size * 2,
                segments: 4
            }, this.scene);
            
            debris.material = debrisMat;
            debris.position.copyFrom(position);
            
            // Explosion velocity
            const speed = 0.02 + Math.random() * 0.03;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            const velocity = {
                x: speed * Math.sin(phi) * Math.cos(theta),
                y: speed * Math.sin(phi) * Math.sin(theta),
                z: speed * Math.cos(phi)
            };
            
            this.debris.push({
                mesh: debris,
                velocity: velocity
            });
        }
        
        // Flash effect
        const flash = BABYLON.MeshBuilder.CreateSphere('flash', {
            diameter: 0.2,
            segments: 8
        }, this.scene);
        
        const flashMat = new BABYLON.StandardMaterial('flashMat', this.scene);
        flashMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
        flashMat.disableLighting = true;
        flash.material = flashMat;
        flash.position.copyFrom(position);
        
        // Fade out flash
        let alpha = 1;
        this.scene.registerBeforeRender(() => {
            alpha -= 0.05;
            if (alpha > 0) {
                flash.scaling.scaleInPlace(1.1);
                flashMat.alpha = alpha;
            } else {
                flash.dispose();
            }
        });
    }

    /**
     * Stop the test
     */
    stop() {
        console.log('Stopping debris test...');
        this.isRunning = false;
        
        // Clean up satellites
        this.testSatellites.forEach(sat => sat.dispose());
        this.testSatellites = [];
        
        // Clean up debris
        this.debris.forEach(d => d.mesh.dispose());
        this.debris = [];
    }

    /**
     * Get test statistics
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            satelliteCount: this.testSatellites.length,
            debrisCount: this.debris.length
        };
    }
}