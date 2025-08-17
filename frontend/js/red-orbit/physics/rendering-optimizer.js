/**
 * Rendering Optimizer
 * Fixes flickering/glittering at distance and improves visual quality
 * Following flight rules for smooth visualization
 */

import * as BABYLON from '@babylonjs/core';

export class RenderingOptimizer {
    constructor(scene) {
        this.scene = scene;
        this.camera = null;
        this.meshTemplates = {};
        this.materials = {};
    }
    
    /**
     * Initialize optimized rendering settings
     */
    initialize(camera) {
        this.camera = camera;
        
        // Set up anti-aliasing and rendering pipeline
        this.setupRenderingPipeline();
        
        // Configure camera for better distance rendering
        this.optimizeCameraSettings();
    }
    
    /**
     * Create optimized mesh templates with LOD
     */
    createOptimizedMeshTemplates() {
        const meshTemplates = {};
        
        // Base sizes - slightly larger to reduce flickering
        const sizes = {
            LEO: 0.008,      // Increased from 0.005
            MEO: 0.009,      // Slightly larger
            GEO: 0.010,      // More visible at distance
            HEO: 0.011,      // Largest regular satellites
            DEBRIS: 0.006,   // Still smaller than satellites
            COLLISION: 0.015 // Very visible during events
        };
        
        // Create meshes with better geometry for distance viewing
        Object.keys(sizes).forEach(type => {
            const mesh = BABYLON.MeshBuilder.CreateSphere(`sat_${type}`, {
                diameter: sizes[type],
                segments: 4 // Slightly more segments for smoother appearance
            }, this.scene);
            
            // Optimize for distance rendering
            mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
            mesh.doNotSyncBoundingInfo = true;
            mesh.freezeWorldMatrix();
            
            meshTemplates[type] = mesh;
        });
        
        return meshTemplates;
    }
    
    /**
     * Create optimized materials with better visibility
     */
    createOptimizedMaterials() {
        const materials = {};
        
        // Color definitions with higher saturation for better visibility
        const colors = {
            LEO: new BABYLON.Color3(0, 1, 0.8),      // Cyan-green
            MEO: new BABYLON.Color3(1, 0.9, 0),      // Bright yellow
            GEO: new BABYLON.Color3(0.2, 0.6, 1),    // Sky blue
            HEO: new BABYLON.Color3(1, 0.2, 0.8),    // Hot pink
            DEBRIS: new BABYLON.Color3(1, 0.6, 0.1), // Orange
            COLLISION: new BABYLON.Color3(1, 0.1, 0) // Bright red
        };
        
        Object.keys(colors).forEach(type => {
            const mat = new BABYLON.StandardMaterial(`mat_${type}`, this.scene);
            
            // Use emissive for self-illumination
            mat.emissiveColor = colors[type];
            mat.disableLighting = true;
            
            // Add subtle specular for depth perception
            mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            mat.specularPower = 32;
            
            // Optimize rendering
            mat.backFaceCulling = true;
            mat.needDepthPrePass = false;
            mat.separateCullingPass = false;
            
            // Improve visibility at distance
            mat.fogEnabled = false; // No fog for space objects
            
            materials[type] = mat;
        });
        
        return materials;
    }
    
    /**
     * Set up rendering pipeline for better quality
     */
    setupRenderingPipeline() {
        const engine = this.scene.getEngine();
        
        // Enable anti-aliasing
        if (engine.getCaps().standardDerivatives) {
            this.scene.forceWireframe = false;
            this.scene.useOrderIndependentTransparency = false;
        }
        
        // Optimize depth buffer precision for large scenes
        this.scene.useLogarithmicDepth = true;
        
        // Set up better frustum culling
        this.scene.skipFrustumClipping = false;
        
        // Optimize mesh selection
        this.scene.skipPointerMovePicking = true;
        this.scene.constantlyUpdateMeshUnderPointer = false;
        
        // Better instance rendering
        this.scene.useClonedMeshMap = true;
        this.scene.useMaterialMeshMap = true;
        
        // Add FXAA anti-aliasing if available
        if (BABYLON.FxaaPostProcess) {
            const fxaa = new BABYLON.FxaaPostProcess("fxaa", 1.0, this.camera);
            fxaa.samples = 4; // Higher quality AA
        }
    }
    
    /**
     * Optimize camera settings for distance viewing
     */
    optimizeCameraSettings() {
        if (!this.camera) return;
        
        // Adjust near/far planes for better depth precision
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10000;
        
        // Set appropriate field of view
        if (this.camera.fov) {
            this.camera.fov = 0.8; // ~45 degrees, good balance
        }
        
        // Smooth camera movements
        this.camera.inertia = 0.9;
        this.camera.speed = 1.0;
        
        // Better wheel precision
        this.camera.wheelPrecision = 50;
        this.camera.wheelDeltaPercentage = 0.01;
    }
    
    /**
     * Apply distance-based scaling to reduce flickering
     * @param {Array} instances - Instance matrices
     * @param {BABYLON.Vector3} cameraPosition - Current camera position
     */
    applyDistanceScaling(instances, cameraPosition) {
        const minScale = 1.0;
        const maxScale = 3.0;
        const minDistance = 10;
        const maxDistance = 1000;
        
        instances.forEach((instance, idx) => {
            if (idx % 16 === 12 || idx % 16 === 13 || idx % 16 === 14) {
                // Don't modify position components
                return;
            }
            
            // Get position from matrix
            const x = instances[idx * 16 + 12];
            const y = instances[idx * 16 + 13];
            const z = instances[idx * 16 + 14];
            
            // Calculate distance to camera
            const dx = x - cameraPosition.x;
            const dy = y - cameraPosition.y;
            const dz = z - cameraPosition.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Calculate scale factor based on distance
            let scaleFactor = minScale;
            if (distance > minDistance) {
                const t = Math.min((distance - minDistance) / (maxDistance - minDistance), 1);
                scaleFactor = minScale + (maxScale - minScale) * t;
            }
            
            // Apply scale to matrix diagonal
            if (idx % 16 === 0) instances[idx] *= scaleFactor;
            if (idx % 16 === 5) instances[idx] *= scaleFactor;
            if (idx % 16 === 10) instances[idx] *= scaleFactor;
        });
    }
    
    /**
     * Create point cloud for very distant objects
     * @param {Float32Array} positions - Object positions
     * @param {Float32Array} colors - Object colors
     */
    createPointCloud(positions, colors) {
        const pointCloud = new BABYLON.PointsCloudSystem("pointCloud", 1, this.scene);
        
        pointCloud.addPoints(positions.length / 3, (particle, i) => {
            particle.position.x = positions[i * 3];
            particle.position.y = positions[i * 3 + 1];
            particle.position.z = positions[i * 3 + 2];
            
            if (colors) {
                particle.color = new BABYLON.Color4(
                    colors[i * 3],
                    colors[i * 3 + 1],
                    colors[i * 3 + 2],
                    1.0
                );
            }
        });
        
        // Build the mesh
        const mesh = pointCloud.buildMeshAsync();
        
        // Set point size for visibility
        pointCloud.pointSize = 3;
        
        return pointCloud;
    }
    
    /**
     * Get optimized render settings based on object count
     * @param {number} objectCount - Number of objects to render
     */
    getOptimalSettings(objectCount) {
        if (objectCount < 10000) {
            return {
                meshSegments: 6,
                useInstancing: true,
                usePointCloud: false,
                lodDistance: 100
            };
        } else if (objectCount < 50000) {
            return {
                meshSegments: 4,
                useInstancing: true,
                usePointCloud: false,
                lodDistance: 200
            };
        } else if (objectCount < 100000) {
            return {
                meshSegments: 3,
                useInstancing: true,
                usePointCloud: false,
                lodDistance: 500
            };
        } else {
            return {
                meshSegments: 2,
                useInstancing: true,
                usePointCloud: true, // Use point cloud for distant objects
                lodDistance: 1000
            };
        }
    }
}

// Export singleton instance
export const renderingOptimizer = new RenderingOptimizer(null);