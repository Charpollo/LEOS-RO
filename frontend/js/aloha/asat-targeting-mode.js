/**
 * ASAT Targeting Mode
 * Interactive click-to-target ASAT launch system
 * 
 * FLIGHT RULES:
 * - Click once for launch site
 * - Click again for target
 * - Auto-generates optimal trajectory
 * - Visual feedback during targeting
 */

import * as BABYLON from '@babylonjs/core';
import ASATTrajectoryGenerator from './asat-trajectory-generator.js';

export class ASATTargetingMode {
    constructor(scene, alohaHandler) {
        this.scene = scene;
        this.alohaHandler = alohaHandler;
        this.generator = new ASATTrajectoryGenerator();
        
        this.isActive = false;
        this.targetingState = 'idle'; // idle, selecting-launch, selecting-target, preview
        
        this.launchPoint = null;
        this.targetPoint = null;
        this.launchMarker = null;
        this.targetMarker = null;
        this.previewLine = null;
        
        this.pickingObserver = null;
        this.hudText = null;
        
        // Earth mesh reference
        this.earthMesh = null;
    }
    
    /**
     * Enter targeting mode
     */
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.targetingState = 'selecting-launch';
        
        // Find Earth mesh
        this.earthMesh = this.scene.getMeshByName('earth');
        if (!this.earthMesh) {
            console.error('Earth mesh not found');
            return;
        }
        
        // Show HUD instructions
        this.showHUD('ASAT TARGETING MODE: Right-click on Earth to select launch site');
        
        // Get canvas
        const canvas = this.scene.getEngine().getRenderingCanvas();
        
        // Set up right-click handler directly on canvas
        this.rightClickHandler = (e) => {
            if (e.button !== 2) return; // Only right click
            
            e.preventDefault();
            
            // Create a picking ray
            const pickResult = this.scene.pick(e.clientX, e.clientY);
            
            if (pickResult.hit && pickResult.pickedMesh === this.earthMesh) {
                const coords = this.worldToLatLon(pickResult.pickedPoint);
                
                if (this.targetingState === 'selecting-launch') {
                    this.setLaunchPoint(coords, pickResult.pickedPoint);
                } else if (this.targetingState === 'selecting-target') {
                    this.setTargetPoint(coords, pickResult.pickedPoint);
                }
            }
        };
        
        canvas.addEventListener('mousedown', this.rightClickHandler);
        
        // Prevent context menu on right click
        this.contextMenuHandler = (e) => {
            e.preventDefault();
            return false;
        };
        canvas.addEventListener('contextmenu', this.contextMenuHandler);
        
        // Add ESC key handler
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.deactivate();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
        
        // Change cursor
        canvas.style.cursor = 'crosshair';
        
        console.log('ASAT Targeting Mode activated');
    }
    
    /**
     * Exit targeting mode - FLIGHT RULE: Always clean up resources
     */
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.targetingState = 'idle';
        
        // Get canvas
        const canvas = this.scene.getEngine().getRenderingCanvas();
        
        // Remove right click handler
        if (this.rightClickHandler) {
            canvas.removeEventListener('mousedown', this.rightClickHandler);
            this.rightClickHandler = null;
        }
        
        // Remove context menu handler
        if (this.contextMenuHandler) {
            canvas.removeEventListener('contextmenu', this.contextMenuHandler);
            this.contextMenuHandler = null;
        }
        
        // Remove ESC key handler
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
        
        // Clean up markers
        this.clearMarkers();
        
        // Hide HUD
        this.hideHUD();
        
        // Clean up config panel if exists
        const panel = document.getElementById('asat-config-panel');
        if (panel) panel.remove();
        
        // Reset cursor
        canvas.style.cursor = 'default';
        
        // Reset state
        this.launchPoint = null;
        this.targetPoint = null;
        
        console.log('ASAT Targeting Mode deactivated - all resources cleaned');
    }
    
    
    /**
     * Set launch point
     */
    setLaunchPoint(coords, worldPoint) {
        this.launchPoint = coords;
        
        // Remove old marker
        if (this.launchMarker) {
            this.launchMarker.dispose();
        }
        
        // Create launch marker (green sphere)
        this.launchMarker = BABYLON.MeshBuilder.CreateSphere('launch-marker', {
            diameter: 0.15,
            segments: 16
        }, this.scene);
        this.launchMarker.position = worldPoint.clone();
        
        const mat = new BABYLON.StandardMaterial('launch-mat', this.scene);
        mat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        mat.emissiveColor = new BABYLON.Color3(0, 0.5, 0);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        this.launchMarker.material = mat;
        
        // Update state
        this.targetingState = 'selecting-target';
        this.showHUD(`Launch: ${coords.lat.toFixed(1)}°, ${coords.lon.toFixed(1)}° | Right-click to select target`);
    }
    
    /**
     * Set target point
     */
    setTargetPoint(coords, worldPoint) {
        this.targetPoint = coords;
        
        // Remove old marker
        if (this.targetMarker) {
            this.targetMarker.dispose();
        }
        
        // Create target marker (red sphere)
        this.targetMarker = BABYLON.MeshBuilder.CreateSphere('target-marker', {
            diameter: 0.15,
            segments: 16
        }, this.scene);
        this.targetMarker.position = worldPoint.clone();
        
        const mat = new BABYLON.StandardMaterial('target-mat', this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        mat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        this.targetMarker.material = mat;
        
        // Generate and show preview
        this.showTrajectoryPreview();
        
        // Update state
        this.targetingState = 'preview';
        this.showConfigPanel();
    }
    
    /**
     * Show trajectory preview line
     */
    showTrajectoryPreview() {
        // Remove old preview
        if (this.previewLine) {
            this.previewLine.dispose();
        }
        
        // Generate trajectory
        const trajectory = this.generator.generateTrajectory({
            launchLat: this.launchPoint.lat,
            launchLon: this.launchPoint.lon,
            targetLat: this.targetPoint.lat,
            targetLon: this.targetPoint.lon,
            targetAlt: 400,
            duration: 420
        });
        
        // Convert to world coordinates
        const points = trajectory.map(point => {
            const [t, x, y, z] = point;
            // Scale from km to scene units
            return new BABYLON.Vector3(x / 1000, z / 1000, -y / 1000);
        });
        
        // Create preview line
        this.previewLine = BABYLON.MeshBuilder.CreateLines('preview-line', {
            points: points,
            updatable: false
        }, this.scene);
        this.previewLine.color = new BABYLON.Color3(1, 1, 0); // Yellow preview
        this.previewLine.alpha = 0.8;
    }
    
    /**
     * Convert world position to lat/lon
     */
    worldToLatLon(worldPoint) {
        // Normalize to unit sphere
        const normalized = worldPoint.normalize();
        
        // Convert to lat/lon
        const lat = Math.asin(normalized.y) * 180 / Math.PI;
        const lon = Math.atan2(normalized.z, normalized.x) * 180 / Math.PI;
        
        return { lat, lon };
    }
    
    /**
     * Show configuration panel
     */
    showConfigPanel() {
        const panel = document.createElement('div');
        panel.id = 'asat-config-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #ff0000;
            border-radius: 10px;
            padding: 20px;
            color: white;
            font-family: monospace;
            z-index: 10000;
            min-width: 400px;
        `;
        
        const distance = this.calculateDistance();
        
        panel.innerHTML = `
            <h3 style="color: #ff0000; margin-top: 0;">ASAT Trajectory Configuration</h3>
            <div style="margin: 10px 0;">
                <strong>Launch:</strong> ${this.launchPoint.lat.toFixed(2)}°, ${this.launchPoint.lon.toFixed(2)}°<br>
                <strong>Target:</strong> ${this.targetPoint.lat.toFixed(2)}°, ${this.targetPoint.lon.toFixed(2)}°<br>
                <strong>Distance:</strong> ${distance.toFixed(0)} km
            </div>
            <div style="margin: 15px 0;">
                <label>Target Altitude (km): 
                    <input type="number" id="target-alt" value="400" min="200" max="1000" style="width: 80px; background: #222; color: white; border: 1px solid #666;">
                </label><br>
                <label>Flight Time (sec): 
                    <input type="number" id="flight-time" value="420" min="300" max="600" style="width: 80px; background: #222; color: white; border: 1px solid #666;">
                </label>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="launch-asat-btn" style="
                    flex: 1;
                    padding: 10px;
                    background: #ff0000;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-weight: bold;
                ">LAUNCH ASAT</button>
                <button id="cancel-targeting-btn" style="
                    flex: 1;
                    padding: 10px;
                    background: #444;
                    border: 1px solid #666;
                    color: white;
                    cursor: pointer;
                ">CANCEL</button>
                <button id="reset-targeting-btn" style="
                    flex: 1;
                    padding: 10px;
                    background: #444;
                    border: 1px solid #666;
                    color: white;
                    cursor: pointer;
                ">RESET</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Event handlers
        document.getElementById('launch-asat-btn').addEventListener('click', () => {
            this.launchASAT();
        });
        
        document.getElementById('cancel-targeting-btn').addEventListener('click', () => {
            this.deactivate();
            panel.remove();
        });
        
        document.getElementById('reset-targeting-btn').addEventListener('click', () => {
            panel.remove();
            this.reset();
        });
        
        // Update preview on value change
        const updatePreview = () => {
            this.showTrajectoryPreview();
        };
        document.getElementById('target-alt').addEventListener('input', updatePreview);
        document.getElementById('flight-time').addEventListener('input', updatePreview);
    }
    
    /**
     * Calculate great circle distance
     */
    calculateDistance() {
        const R = 6371; // Earth radius in km
        const lat1 = this.launchPoint.lat * Math.PI / 180;
        const lat2 = this.targetPoint.lat * Math.PI / 180;
        const dLat = (this.targetPoint.lat - this.launchPoint.lat) * Math.PI / 180;
        const dLon = (this.targetPoint.lon - this.launchPoint.lon) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    /**
     * Launch ASAT with current configuration
     */
    async launchASAT() {
        const altInput = document.getElementById('target-alt');
        const timeInput = document.getElementById('flight-time');
        
        const config = {
            launchLat: this.launchPoint.lat,
            launchLon: this.launchPoint.lon,
            targetLat: this.targetPoint.lat,
            targetLon: this.targetPoint.lon,
            targetAlt: parseFloat(altInput?.value || 400),
            duration: parseInt(timeInput?.value || 420)
        };
        
        // Generate trajectory
        const trajectory = this.generator.generateTrajectory(config);
        const data = this.generator.generateMetadata(config, trajectory);
        
        // Load into ALOHA handler
        await this.alohaHandler.loadTrajectory({
            data: data,
            showConjunctions: true,
            autoTarget: true,
            playbackSpeed: 1
        });
        
        // Start playback
        this.alohaHandler.startPlayback();
        
        // Clean up
        const panel = document.getElementById('asat-config-panel');
        if (panel) panel.remove();
        this.deactivate();
        
        console.log('ASAT launched from targeting mode');
    }
    
    /**
     * Reset targeting mode
     */
    reset() {
        this.targetingState = 'selecting-launch';
        this.launchPoint = null;
        this.targetPoint = null;
        this.clearMarkers();
        this.showHUD('ASAT TARGETING MODE: Right-click on Earth to select launch site');
    }
    
    /**
     * Clear all markers
     */
    clearMarkers() {
        if (this.launchMarker) {
            this.launchMarker.dispose();
            this.launchMarker = null;
        }
        if (this.targetMarker) {
            this.targetMarker.dispose();
            this.targetMarker = null;
        }
        if (this.previewLine) {
            this.previewLine.dispose();
            this.previewLine = null;
        }
    }
    
    /**
     * Show HUD text
     */
    showHUD(text) {
        this.hideHUD();
        
        this.hudText = document.createElement('div');
        this.hudText.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #ff0000;
            border-radius: 5px;
            padding: 15px 30px;
            color: #ff0000;
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            text-transform: uppercase;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
            animation: pulse-border 2s infinite;
        `;
        this.hudText.innerHTML = `
            <style>
                @keyframes pulse-border {
                    0% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.5); }
                    50% { box-shadow: 0 0 40px rgba(255, 0, 0, 0.8); }
                    100% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.5); }
                }
            </style>
            ${text}
            <div style="font-size: 12px; color: #ff6666; margin-top: 5px; font-weight: normal;">
                Press ESC to cancel targeting mode
            </div>
        `;
        document.body.appendChild(this.hudText);
    }
    
    /**
     * Hide HUD text
     */
    hideHUD() {
        if (this.hudText) {
            this.hudText.remove();
            this.hudText = null;
        }
    }
}

export default ASATTargetingMode;