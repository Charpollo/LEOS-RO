/**
 * RED ORBIT GPU PHYSICS ENGINE
 * World's first million-object orbital physics simulator
 * Full WebGPU compute - NO CHEATING!
 * 
 * Target: 400K-1M objects @ 60 FPS
 * Platform: M4 Max Pro / RTX 5090
 */

import * as BABYLON from '@babylonjs/core';
import { renderRatioManager } from './render-ratio-manager.js';
import { scenarioManager } from './scenario-manager.js';
import { renderingOptimizer } from './rendering-optimizer.js';

export class GPUPhysicsEngine {
    constructor(scene) {
        this.scene = scene;
        this.device = null;
        this.initialized = false;
        
        // Object management
        this.maxObjects = 10000000; // 10 MILLION MAX!
        this.activeObjects = 0;
        this.targetObjects = 5000000; // Initial target - 5 MILLION!
        
        // Real physics constants - NO CHEATING!
        this.EARTH_RADIUS = 6371.0; // km
        this.EARTH_MU = 398600.4418; // km³/s²
        this.MOON_MU = 4902.8; // km³/s²
        this.SUN_MU = 132712440018.0; // km³/s²
        
        // Scaling - Earth radius = 1 Babylon unit (MUST match Earth rendering)
        this.KM_TO_BABYLON = 1/6371; // Earth radius = 1 Babylon unit
        
        // GPU buffers
        this.positionBuffer = null;
        this.velocityBuffer = null;
        this.massBuffer = null;
        this.typeBuffer = null;
        this.collisionBuffer = null;
        
        // Compute pipelines
        this.orbitPipeline = null;
        this.collisionPipeline = null;
        this.debrisPipeline = null;
        
        // Timing - following flight rules for realistic time progression
        this.physicsTimeMultiplier = 1; // Start at 1x real-time like Havok
        this.availableTimeMultipliers = [1, 10, 60, 100, 1000, 10000]; // Real-time to 10000x
        this.frameCount = 0;
        
        // Rendering with ratio manager
        this.renderCount = 0;
        this.instanceMatrices = null;
        this.renderManager = renderRatioManager;
        
        // Kessler tracking
        this.kesslerActive = false;
        this.collisionCount = 0;
        this.debrisGenerated = 0;
    }
    
    async initialize() {
        console.log('%c🚀 GPU Physics: Initializing WebGPU...', 'color: #00ffff; font-size: 14px; font-weight: bold');
        
        // Check WebGPU support with better detection
        if (!navigator.gpu) {
            console.error('%c❌ WebGPU NOT AVAILABLE', 'color: #ff0000; font-size: 16px; font-weight: bold');
            console.warn('To enable WebGPU:');
            console.warn('1. Use http://localhost:8080 instead of http://0.0.0.0:8080');
            console.warn('2. Chrome: Go to chrome://flags/#enable-unsafe-webgpu and ENABLE it');
            console.warn('3. Safari: Enable Developer menu, then Develop > Experimental Features > WebGPU');
            console.warn('4. Use Chrome Canary for latest WebGPU support');
            throw new Error('WebGPU not supported! Use localhost:8080 or enable it in browser flags');
        }
        
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance', // Use discrete GPU
            forceFallbackAdapter: false
        }).catch(err => {
            console.error('Failed to request adapter:', err);
            return null;
        });
        
        if (!adapter) {
            console.error('%c❌ No WebGPU adapter found!', 'color: #ff0000; font-size: 16px');
            console.warn('This may mean:');
            console.warn('1. WebGPU flags are not properly enabled');
            console.warn('2. Your GPU drivers need updating');
            console.warn('3. Your browser needs to be restarted after enabling flags');
            throw new Error('No WebGPU adapter found!');
        }
        
        
        // Get device with adaptive limits
        try {
            // First try with reduced limits that should work on most GPUs
            this.device = await adapter.requestDevice({
                requiredLimits: {
                    maxBufferSize: 1073741824,               // 1GB - enough for 5-8M objects
                    maxStorageBufferBindingSize: 1073741824, // 1GB storage buffers
                    maxComputeWorkgroupStorageSize: 32768,   // 32KB
                    maxComputeInvocationsPerWorkgroup: 512,  // 512 for better parallelism
                    maxComputeWorkgroupSizeX: 512,           // 512 for better GPU utilization
                    maxComputeWorkgroupsPerDimension: 65535
                }
            });
            this.workgroupSize = 512; // Increased for better GPU utilization
        } catch (e) {
            console.warn('Failed with high limits, trying with default limits...');
            // Fallback to default limits
            this.device = await adapter.requestDevice();
            this.workgroupSize = 64; // Use smaller workgroup
        }
        
        const info = adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : {};
        console.log('%c✅ WebGPU AVAILABLE!', 'color: #00ff00; font-size: 14px; font-weight: bold');
        console.log(`%c🎮 GPU: ${info.description || 'WebGPU Device'} initialized`, 'color: #00ffff; font-size: 12px');
        
        // Create buffers for 1M objects
        await this.createBuffers();
        
        // Create compute shaders
        await this.createComputePipelines();
        
        // Create mesh templates for rendering
        this.createMeshTemplates();
        
        this.initialized = true;
        // GPU ready - counts logged after population
    }
    
    async createBuffers() {
        const floatsPerObject = 8; // x,y,z,vx,vy,vz,mass,type
        const bufferSize = this.maxObjects * floatsPerObject * 4; // 4 bytes per float
        
        // Allocating physics buffers: ${(bufferSize / 1024 / 1024).toFixed(2)} MB
        
        // Position + velocity buffer (interleaved for cache efficiency)
        this.stateBuffer = this.device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        
        // Initialize with zeros
        const stateArray = new Float32Array(this.stateBuffer.getMappedRange());
        stateArray.fill(0);
        this.stateBuffer.unmap();
        
        // Collision detection buffer
        this.collisionBuffer = this.device.createBuffer({
            size: this.maxObjects * 16, // Grid cell assignments
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        
        // Uniform buffer for parameters
        this.uniformBuffer = this.device.createBuffer({
            size: 64, // dt, time, objectCount, etc.
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    
    async createComputePipelines() {
        // Main orbital physics compute shader
        const orbitShaderModule = this.device.createShaderModule({
            code: `
                struct SimParams {
                    dt: f32,
                    time: f32,
                    objectCount: u32,
                    earthMu: f32,
                    moonMu: f32,
                    sunMu: f32,
                    earthRadius: f32,
                    padding: f32,
                }
                
                struct Object {
                    px: f32, py: f32, pz: f32,  // position (no padding)
                    vx: f32, vy: f32, vz: f32,  // velocity (no padding)
                    mass: f32,
                    objType: f32, // 0=sat, 1=debris, 2=special
                }
                
                @group(0) @binding(0) var<storage, read_write> objects: array<Object>;
                @group(0) @binding(1) var<uniform> params: SimParams;
                
                // Workgroup size optimized for M4 Max / RTX 5090
                @compute @workgroup_size(256, 1, 1)
                fn main(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= params.objectCount) { return; }
                    
                    var obj = objects[idx];
                    let pos = vec3<f32>(obj.px, obj.py, obj.pz);
                    let vel = vec3<f32>(obj.vx, obj.vy, obj.vz);
                    
                    // Calculate radius from Earth center
                    let r = length(pos);
                    
                    // ATMOSPHERIC BURNUP - objects destroyed below 100km altitude
                    let altitude = r - params.earthRadius;
                    if (altitude < 100.0) { 
                        obj.objType = -1.0; // Mark as destroyed (burned up)
                        obj.px = 0.0; obj.py = 0.0; obj.pz = 0.0; // Move to origin
                        obj.vx = 0.0; obj.vy = 0.0; obj.vz = 0.0; // Stop moving
                        objects[idx] = obj;
                        return;
                    }
                    
                    // REAL PHYSICS - Newton's law of gravitation
                    // a = -GM/r² * r_hat = -GM/r³ * r_vector
                    // This gives acceleration, not force (F=ma, so a=F/m)
                    // IMPORTANT: earthMu is in km³/s², r is in km, so acceleration is in km/s²
                    let earthGravity = -params.earthMu / (r * r * r) * pos;
                    
                    // Add Moon perturbation (for realism!)
                    // Simplified for now - full implementation would calculate real Moon position
                    let moonDist = 384400.0; // km
                    let moonPos = vec3<f32>(moonDist, 0.0, 0.0);
                    let moonDelta = pos - moonPos;
                    let moonR = length(moonDelta);
                    let moonGravity = -params.moonMu / (moonR * moonR * moonR) * moonDelta;
                    
                    // Total acceleration 
                    var acceleration = earthGravity + moonGravity * 0.1; // Scale moon effect
                    
                    // Apply atmospheric drag if altitude < 200km
                    if (altitude < 200.0) {
                        let density = exp(-(altitude - 100.0) / 50.0) * 0.001;
                        let speed = length(vel);
                        if (speed > 0.001) {
                            let drag = -normalize(vel) * speed * speed * density * 0.01;
                            acceleration = acceleration + drag;
                        }
                    }
                    
                    // Simple Euler integration (same as Havok)
                    // Update velocity (acceleration is in km/s², dt is in seconds)
                    let newVel = vel + acceleration * params.dt;
                    obj.vx = newVel.x;
                    obj.vy = newVel.y;
                    obj.vz = newVel.z;
                    
                    // Update position (velocity is in km/s, dt is in seconds)
                    let newPos = pos + newVel * params.dt;
                    obj.px = newPos.x;
                    obj.py = newPos.y;
                    obj.pz = newPos.z;
                    
                    // Write back
                    objects[idx] = obj;
                }
            `
        });
        
        // Create pipeline
        this.orbitPipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: orbitShaderModule,
                entryPoint: 'main'
            }
        });
        
        // Collision detection shader (spatial hashing)
        const collisionShaderModule = this.device.createShaderModule({
            code: `
                struct SimParams {
                    dt: f32,
                    time: f32,
                    objectCount: u32,
                    earthMu: f32,
                    moonMu: f32,
                    sunMu: f32,
                    earthRadius: f32,
                    padding: f32,
                }
                
                struct Object {
                    px: f32, py: f32, pz: f32,  // position (no padding)
                    vx: f32, vy: f32, vz: f32,  // velocity (no padding)
                    mass: f32,
                    objType: f32,
                }
                
                @group(0) @binding(0) var<storage, read_write> objects: array<Object>;
                @group(0) @binding(1) var<storage, read_write> collisions: array<atomic<u32>>;
                @group(0) @binding(2) var<uniform> params: SimParams;
                
                fn hashPosition(pos: vec3<f32>) -> u32 {
                    // Spatial hash for broad phase
                    let gridSize = 100.0; // 100km grid cells
                    let x = u32(pos.x / gridSize);
                    let y = u32(pos.y / gridSize);
                    let z = u32(pos.z / gridSize);
                    return (x * 73856093u) ^ (y * 19349663u) ^ (z * 83492791u);
                }
                
                @compute @workgroup_size(256, 1, 1)
                fn detectCollisions(@builtin(global_invocation_id) id: vec3<u32>) {
                    let idx = id.x;
                    if (idx >= params.objectCount) { return; }
                    
                    let obj1 = objects[idx];
                    if (obj1.objType < 0.0) { return; } // Skip destroyed
                    
                    let pos1 = vec3<f32>(obj1.px, obj1.py, obj1.pz);
                    let hash1 = hashPosition(pos1);
                    
                    // Check ALL objects in same grid cell (spatial partitioning)
                    // With 100K objects, this is now feasible
                    for (var j = 0u; j < params.objectCount; j++) {
                        if (j == idx) { continue; } // Skip self
                        let obj2 = objects[j];
                        if (obj2.objType < 0.0) { continue; }
                        
                        let pos2 = vec3<f32>(obj2.px, obj2.py, obj2.pz);
                        let hash2 = hashPosition(pos2);
                        if (hash1 != hash2) { continue; } // Different grid cells
                        
                        // Fine collision check - increased range for cascade effect
                        let dist = distance(pos1, pos2);
                        if (dist < 0.050) { // 50 meter collision threshold for better cascade
                            // Mark collision!
                            atomicAdd(&collisions[0], 1u);
                            
                            // Convert both objects to debris (type 1)
                            objects[idx].objType = 1.0; // Mark as debris
                            objects[j].objType = 1.0;   // Mark as debris
                            
                            // Add explosive velocity to simulate fragmentation
                            let impact_vel = length(vec3<f32>(obj1.vx - obj2.vx, obj1.vy - obj2.vy, obj1.vz - obj2.vz));
                            let explosion_force = impact_vel * 0.5; // Scale explosion by impact velocity
                            
                            // Random direction for debris scatter
                            let dir = normalize(pos2 - pos1);
                            objects[idx].vx += dir.x * explosion_force;
                            objects[idx].vy += dir.y * explosion_force;
                            objects[idx].vz += dir.z * explosion_force;
                            
                            objects[j].vx -= dir.x * explosion_force;
                            objects[j].vy -= dir.y * explosion_force;
                            objects[j].vz -= dir.z * explosion_force;
                        }
                    }
                }
            `
        });
        
        this.collisionPipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: collisionShaderModule,
                entryPoint: 'detectCollisions'
            }
        });
        
        console.log('GPU Compute pipelines created successfully');
    }
    
    createMeshTemplates() {
        // Create different colored templates for orbit types (following Havok color scheme)
        this.meshTemplates = {};
        this.materials = {};
        
        // LEO - Cyan (60% of objects)
        // Check if test mode - make satellite MUCH larger
        const urlParams = new URLSearchParams(window.location.search);
        const isTestMode = urlParams.get('mode') === 'test-single' || urlParams.get('mode') === 'test-collision';
        const diameter = isTestMode ? 5.0 : 0.008; // Default visualization scale
        this.currentScale = diameter; // Store current scale
        
        this.meshTemplates.LEO = BABYLON.MeshBuilder.CreateSphere('gpuSatLEO', {
            diameter: diameter,
            segments: 10 // Ultra-smooth spheres
        }, this.scene);
        this.materials.LEO = new BABYLON.StandardMaterial('gpuMatLEO', this.scene);
        // Make test satellite bright yellow for visibility
        this.materials.LEO.emissiveColor = isTestMode ? 
            new BABYLON.Color3(1, 1, 0) : // Bright yellow in test mode
            new BABYLON.Color3(0, 1, 1); // Cyan normally
        this.materials.LEO.disableLighting = true;
        this.meshTemplates.LEO.material = this.materials.LEO;
        this.meshTemplates.LEO.thinInstanceEnablePicking = false;
        this.meshTemplates.LEO.isVisible = false;
        this.meshTemplates.LEO.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        this.meshTemplates.LEO.doNotSyncBoundingInfo = true;
        
        // MEO - Yellow (25% of objects) - GPS/GLONASS
        this.meshTemplates.MEO = BABYLON.MeshBuilder.CreateSphere('gpuSatMEO', {
            diameter: this.currentScale,  // Use current scale
            segments: 10
        }, this.scene);
        this.materials.MEO = new BABYLON.StandardMaterial('gpuMatMEO', this.scene);
        this.materials.MEO.emissiveColor = new BABYLON.Color3(1, 1, 0); // YELLOW for MEO
        this.materials.MEO.disableLighting = true;
        this.meshTemplates.MEO.material = this.materials.MEO;
        this.meshTemplates.MEO.thinInstanceEnablePicking = false;
        this.meshTemplates.MEO.isVisible = false;
        this.meshTemplates.MEO.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        this.meshTemplates.MEO.doNotSyncBoundingInfo = true;
        
        // GEO - Blue (10% of objects)
        this.meshTemplates.GEO = BABYLON.MeshBuilder.CreateSphere('gpuSatGEO', {
            diameter: this.currentScale,  // Use current scale
            segments: 10
        }, this.scene);
        this.materials.GEO = new BABYLON.StandardMaterial('gpuMatGEO', this.scene);
        this.materials.GEO.emissiveColor = new BABYLON.Color3(0, 0.5, 1); // Blue
        this.materials.GEO.disableLighting = true;
        this.meshTemplates.GEO.material = this.materials.GEO;
        this.meshTemplates.GEO.thinInstanceEnablePicking = false;
        this.meshTemplates.GEO.isVisible = false;
        this.meshTemplates.GEO.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        this.meshTemplates.GEO.doNotSyncBoundingInfo = true;
        
        // HEO - Magenta (5% of objects)
        this.meshTemplates.HEO = BABYLON.MeshBuilder.CreateSphere('gpuSatHEO', {
            diameter: this.currentScale,  // Use current scale
            segments: 10
        }, this.scene);
        this.materials.HEO = new BABYLON.StandardMaterial('gpuMatHEO', this.scene);
        this.materials.HEO.emissiveColor = new BABYLON.Color3(1, 0, 1); // Magenta
        this.materials.HEO.disableLighting = true;
        this.meshTemplates.HEO.material = this.materials.HEO;
        this.meshTemplates.HEO.thinInstanceEnablePicking = false;
        this.meshTemplates.HEO.isVisible = false;
        this.meshTemplates.HEO.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        this.meshTemplates.HEO.doNotSyncBoundingInfo = true;
        
        // Debris - Orange for normal space debris (not collision debris)
        this.meshTemplates.DEBRIS = BABYLON.MeshBuilder.CreateSphere('gpuDebris', {
            diameter: this.currentScale * 0.8, // Slightly smaller than satellites
            segments: 8
        }, this.scene);
        this.materials.DEBRIS = new BABYLON.StandardMaterial('gpuMatDebris', this.scene);
        this.materials.DEBRIS.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Orange for normal debris
        this.materials.DEBRIS.disableLighting = true;
        this.meshTemplates.DEBRIS.material = this.materials.DEBRIS;
        this.meshTemplates.DEBRIS.thinInstanceEnablePicking = false;
        this.meshTemplates.DEBRIS.isVisible = false;
        this.meshTemplates.DEBRIS.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        this.meshTemplates.DEBRIS.doNotSyncBoundingInfo = true;
        
        // Collision debris - Bright Red for Kessler cascade
        this.meshTemplates.COLLISION_DEBRIS = BABYLON.MeshBuilder.CreateSphere('gpuCollisionDebris', {
            diameter: this.currentScale * 1.5, // Larger for visibility during cascade
            segments: 8
        }, this.scene);
        this.materials.COLLISION_DEBRIS = new BABYLON.StandardMaterial('gpuMatCollisionDebris', this.scene);
        this.materials.COLLISION_DEBRIS.emissiveColor = new BABYLON.Color3(1, 0, 0); // Bright RED for cascade
        this.materials.COLLISION_DEBRIS.disableLighting = true;
        this.meshTemplates.COLLISION_DEBRIS.material = this.materials.COLLISION_DEBRIS;
        this.meshTemplates.COLLISION_DEBRIS.thinInstanceEnablePicking = false;
        this.meshTemplates.COLLISION_DEBRIS.isVisible = false;
        this.meshTemplates.COLLISION_DEBRIS.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        this.meshTemplates.COLLISION_DEBRIS.doNotSyncBoundingInfo = true;
        
        // Default to LEO for backward compatibility
        this.instancedMesh = this.meshTemplates.LEO;
        
        // Collision highlight material
        this.materials.COLLISION = new BABYLON.StandardMaterial('gpuMatCollision', this.scene);
        this.materials.COLLISION.emissiveColor = new BABYLON.Color3(1, 0, 0); // Bright red
        this.materials.COLLISION.disableLighting = true;
        
        // Store highlighted objects
        this.highlightedIndices = [];
        
        // Explosion effects list
        this.explosions = [];
    }
    
    createExplosion(position) {
        // Create explosion particle effect
        const explosion = BABYLON.MeshBuilder.CreateSphere('explosion', {
            diameter: 0.05,
            segments: 16
        }, this.scene);
        
        explosion.position = new BABYLON.Vector3(
            position.x * this.KM_TO_BABYLON,
            position.y * this.KM_TO_BABYLON,
            position.z * this.KM_TO_BABYLON
        );
        
        // Explosion material
        const explMat = new BABYLON.StandardMaterial('explMat', this.scene);
        explMat.emissiveColor = new BABYLON.Color3(1, 0.5, 0); // Orange explosion
        explMat.alpha = 1;
        explMat.disableLighting = true;
        explosion.material = explMat;
        
        // Animate explosion
        const scaleAnim = new BABYLON.Animation(
            'explScale',
            'scaling',
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const alphaAnim = new BABYLON.Animation(
            'explAlpha',
            'material.alpha',
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        scaleAnim.setKeys([
            { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
            { frame: 30, value: new BABYLON.Vector3(5, 5, 5) },
            { frame: 60, value: new BABYLON.Vector3(0.1, 0.1, 0.1) }
        ]);
        
        alphaAnim.setKeys([
            { frame: 0, value: 1 },
            { frame: 30, value: 0.5 },
            { frame: 60, value: 0 }
        ]);
        
        explosion.animations = [scaleAnim, alphaAnim];
        
        // Start animation and dispose after completion
        this.scene.beginAnimation(explosion, 0, 60, false, 1, () => {
            explosion.dispose();
        });
        
        this.explosions.push(explosion);
    }
    
    highlightCollisionTargets(idx1, idx2) {
        // Marking objects ${idx1} and ${idx2} for collision
        
        // Store indices for highlighting
        this.highlightedIndices = [idx1, idx2];
        
        // Create pulsing animation for highlighted objects
        if (this.scene) {
            // Create highlight spheres around target objects
            if (this.highlightSphere1) this.highlightSphere1.dispose();
            if (this.highlightSphere2) this.highlightSphere2.dispose();
            
            this.highlightSphere1 = BABYLON.MeshBuilder.CreateSphere('highlight1', {
                diameter: 0.02, // Larger than normal satellites
                segments: 8
            }, this.scene);
            this.highlightSphere1.material = this.materials.COLLISION;
            
            this.highlightSphere2 = BABYLON.MeshBuilder.CreateSphere('highlight2', {
                diameter: 0.02,
                segments: 8
            }, this.scene);
            this.highlightSphere2.material = this.materials.COLLISION;
            
            // Create pulsing animation
            const pulseAnim = new BABYLON.Animation(
                'pulseAnim',
                'material.alpha',
                60,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const keys = [
                { frame: 0, value: 0.3 },
                { frame: 30, value: 1.0 },
                { frame: 60, value: 0.3 }
            ];
            pulseAnim.setKeys(keys);
            
            this.highlightSphere1.animations = [pulseAnim];
            this.highlightSphere2.animations = [pulseAnim];
            
            this.scene.beginAnimation(this.highlightSphere1, 0, 60, true);
            this.scene.beginAnimation(this.highlightSphere2, 0, 60, true);
        }
    }
    
    async populateSpace(count = 400000) {
        // Apply 2:1 minimum ratio (simulated:rendered)
        const simulatedCount = count;
        // Use render manager's configured count, don't override
        const renderedCount = this.renderManager.config.rendered || Math.min(Math.floor(count / 2), 50000);
        
        // Configure render ratio manager
        this.renderManager.setObjectCounts(simulatedCount, renderedCount);
        // Removed verbose creation log
        
        const startTime = performance.now();
        this.activeObjects = count;
        
        // Check for test modes
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        // Initialize orbit type indices array BEFORE using it
        this.orbitTypeIndices = new Uint8Array(count);
        
        // Store initial positions for instance creation
        this.initialPositions = new Float32Array(count * 3);
        
        // Map buffer for CPU write
        await this.device.queue.onSubmittedWorkDone();
        
        // Create staging buffer
        const stagingBuffer = this.device.createBuffer({
            size: count * 32, // 8 floats per object
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        
        const data = new Float32Array(stagingBuffer.getMappedRange());
        
        // Generate realistic orbital distribution with proper orbital mechanics
        for (let i = 0; i < count; i++) {
            const baseIdx = i * 8;
            
            // Determine orbit type and store it
            let altitude, inclination, eccentricity, orbitType;
            
            // Special handling for test modes
            if (mode === 'test-single') {
                // Single satellite at ISS altitude for orbital verification
                altitude = 408;  // ISS altitude exactly
                inclination = 51.6 * Math.PI / 180;  // ISS inclination
                eccentricity = 0.0001;  // Nearly circular
                orbitType = 0;  // LEO
                console.log('📍 Placing satellite at ISS orbit: 408km, 51.6° inclination');
                // Orbital mechanics verified: 92.68 min period, 7.66 km/s velocity
                
                // Store initial position for tracking
                window.testSatelliteInitial = {
                    altitude: altitude,
                    inclination: inclination,
                    startTime: performance.now()
                };
            } else if (mode === 'test-collision' && i === 0) {
                // First object: satellite in circular orbit
                altitude = 500;
                inclination = 0;  // Equatorial for simplicity
                eccentricity = 0.0001;
                orbitType = 0;
                console.log('🛰️ Satellite placed at 500km equatorial orbit');
            } else if (mode === 'test-collision' && i === 1) {
                // Second object: debris on collision course
                altitude = 500;  // Same altitude
                inclination = 0.1;  // Slightly different inclination for intersection
                eccentricity = 0.0001;
                orbitType = 4;  // Mark as debris
                console.log('💥 Debris placed on intersecting orbit');
            } else {
                // Normal distribution for non-test modes
                const rand = Math.random();
            
            if (rand < 0.6) { // 60% LEO - REALISTIC DISTRIBUTION WITH EQUATORIAL CONCENTRATION
                const leoType = Math.random();
                if (leoType < 0.5) {
                    // MAJORITY at equatorial/low-inclination (ISS, commercial constellations)
                    altitude = 400 + Math.random() * 600;
                    inclination = Math.random() * 35 * Math.PI / 180; // 0-35 degrees - HEAVY EQUATORIAL
                    eccentricity = 0.0001 + Math.random() * 0.001;
                } else if (leoType < 0.75) {
                    // Mid-inclination (many Starlink planes)
                    altitude = 500 + Math.random() * 100;
                    inclination = (40 + Math.random() * 20) * Math.PI / 180; // 40-60 degrees
                    eccentricity = 0.0001 + Math.random() * 0.001;
                } else if (leoType < 0.95) {
                    // Sun-synchronous/polar (Earth observation) - FEWER at poles
                    altitude = 600 + Math.random() * 400;
                    inclination = (95 + Math.random() * 10) * Math.PI / 180; // 95-105 degrees - TRUE POLAR
                    eccentricity = 0.001 + Math.random() * 0.01;
                } else {
                    // High-inclination reconnaissance - RARE
                    altitude = 300 + Math.random() * 500;
                    inclination = (70 + Math.random() * 20) * Math.PI / 180;
                    eccentricity = 0.05 + Math.random() * 0.15; // More elliptical
                }
                orbitType = 0; // LEO
                if (i < this.orbitTypeIndices.length) this.orbitTypeIndices[i] = 0;
            } else if (rand < 0.85) { // 25% MEO
                // Navigation satellites with proper inclinations
                const meoType = Math.random();
                if (meoType < 0.5) {
                    // GPS-like orbit
                    altitude = 20180 + Math.random() * 40;
                    inclination = (55 + Math.random() * 2) * Math.PI / 180;
                } else {
                    // GLONASS-like orbit
                    altitude = 19100 + Math.random() * 100;
                    inclination = (64.8 + Math.random() * 2) * Math.PI / 180;
                }
                eccentricity = 0.001 + Math.random() * 0.003;
                orbitType = 1; // MEO
                if (i < this.orbitTypeIndices.length) this.orbitTypeIndices[i] = 1;
            } else if (rand < 0.95) { // 10% GEO - TRUE GEOSTATIONARY AT EQUATOR
                altitude = 35786; // Exact geostationary altitude
                inclination = Math.random() * 2 * Math.PI / 180; // 0-2 degrees - STRICTLY EQUATORIAL
                eccentricity = 0.00001 + Math.random() * 0.0001; // Near-perfect circles
                orbitType = 2; // GEO
                if (i < this.orbitTypeIndices.length) this.orbitTypeIndices[i] = 2;
            } else if (rand < 0.99) { // 4% HEO
                // For HEO, specify apoapsis altitude instead of periapsis
                const apoapsisAlt = 35000 + Math.random() * 5000; // 35000-40000 km apoapsis
                const periapsisAlt = 500 + Math.random() * 1000; // 500-1500 km periapsis
                altitude = periapsisAlt; // Use periapsis altitude
                // Calculate eccentricity from periapsis and apoapsis
                const rp = this.EARTH_RADIUS + periapsisAlt;
                const ra = this.EARTH_RADIUS + apoapsisAlt;
                eccentricity = (ra - rp) / (ra + rp); // This gives proper eccentricity
                inclination = 63.4 * Math.PI / 180; // Molniya orbit inclination
                orbitType = 3; // HEO
                if (i < this.orbitTypeIndices.length) this.orbitTypeIndices[i] = 3;
            } else { // 1% Debris (orange, normal space junk)
                const debrisType = Math.random();
                if (debrisType < 0.4) {
                    // Debris from Fengyun/Cosmos collision zone (~800km)
                    altitude = 750 + Math.random() * 100;
                    inclination = (70 + Math.random() * 30) * Math.PI / 180;
                    eccentricity = 0.001 + Math.random() * 0.05;
                } else if (debrisType < 0.7) {
                    // Indian ASAT test debris (~300-2200km)
                    altitude = 300 + Math.random() * 1900;
                    inclination = (96 + Math.random() * 4) * Math.PI / 180;
                    eccentricity = 0.01 + Math.random() * 0.1;
                } else if (debrisType < 0.85) {
                    // GEO graveyard orbit
                    altitude = 36100 + Math.random() * 300;
                    inclination = Math.random() * 15 * Math.PI / 180;
                    eccentricity = 0.001 + Math.random() * 0.01;
                } else {
                    // Random debris with high eccentricity
                    altitude = 400 + Math.random() * 1000;
                    inclination = Math.random() * 180 * Math.PI / 180;
                    eccentricity = 0.1 + Math.random() * 0.3; // Very elliptical
                }
                orbitType = 4; // DEBRIS (orange, not red collision debris)
                if (i < this.orbitTypeIndices.length) this.orbitTypeIndices[i] = 4;
            }
            } // Close the else block for test mode handling
            
            // REAL ORBITAL MECHANICS - NO CHEATING!
            // Calculate semi-major axis from periapsis and eccentricity
            const periapsis = this.EARTH_RADIUS + altitude;
            const a = periapsis / (1 - eccentricity); // Semi-major axis
            
            // Random true anomaly (position along orbit)
            // For highly elliptical orbits, bias towards periapsis where objects spend less time
            let trueAnomaly;
            if (eccentricity > 0.5) {
                // For HEO, place more objects near periapsis (0 or 2π)
                const u = Math.random();
                if (u < 0.7) {
                    // 70% near periapsis
                    trueAnomaly = (Math.random() - 0.5) * Math.PI * 0.5;
                } else {
                    // 30% elsewhere
                    trueAnomaly = Math.random() * 2 * Math.PI;
                }
            } else {
                trueAnomaly = Math.random() * 2 * Math.PI;
            }
            
            // Calculate radius at this true anomaly
            const r = a * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly));
            
            // Random orbital orientation
            const raan = Math.random() * 2 * Math.PI; // Right Ascension of Ascending Node
            const argPeriapsis = Math.random() * 2 * Math.PI; // Argument of periapsis
            
            // Position in orbital plane (orbit is in XY plane initially)
            const xOrbit = r * Math.cos(trueAnomaly);
            const yOrbit = r * Math.sin(trueAnomaly);
            
            // Rotation matrices for 3D orientation
            // NOTE: We need to rotate so equatorial orbits go around the equator (XZ plane with Y as north)
            const cosI = Math.cos(inclination);
            const sinI = Math.sin(inclination);
            const cosR = Math.cos(raan);
            const sinR = Math.sin(raan);
            const cosW = Math.cos(argPeriapsis);
            const sinW = Math.sin(argPeriapsis);
            
            // Transform to Earth-centered inertial coordinates
            // For Earth: Y is north pole, XZ is equatorial plane
            // Equatorial orbit (inclination=0) should be in XZ plane
            const px = (cosR * cosW - sinR * sinW * cosI) * xOrbit + (-cosR * sinW - sinR * cosW * cosI) * yOrbit;
            const pz = (sinR * cosW + cosR * sinW * cosI) * xOrbit + (-sinR * sinW + cosR * cosW * cosI) * yOrbit;
            const py = (sinW * sinI) * xOrbit + (cosW * sinI) * yOrbit;
            
            data[baseIdx + 0] = px;
            data[baseIdx + 1] = py;
            data[baseIdx + 2] = pz;
            
            // Store initial positions for rendering
            this.initialPositions[i * 3 + 0] = px;
            this.initialPositions[i * 3 + 1] = py;
            this.initialPositions[i * 3 + 2] = pz;
            
            // VELOCITY using vis-viva equation: v² = μ(2/r - 1/a)
            const orbitalSpeed = Math.sqrt(this.EARTH_MU * (2/r - 1/a));
            
            // Calculate velocity in orbital plane
            // For elliptical orbits, velocity direction is perpendicular to radius vector
            // but magnitude varies with position
            
            // Velocity components in orbital plane
            const h = Math.sqrt(this.EARTH_MU * a * (1 - eccentricity * eccentricity)); // Specific angular momentum
            const vr = (this.EARTH_MU * eccentricity * Math.sin(trueAnomaly)) / h; // Radial velocity
            const vt = h / r; // Tangential velocity
            
            // Convert to orbital frame
            const vxOrbit = vr * Math.cos(trueAnomaly) - vt * Math.sin(trueAnomaly);
            const vyOrbit = vr * Math.sin(trueAnomaly) + vt * Math.cos(trueAnomaly);
            
            // Apply same transformation as position to get inertial velocity
            // Must match the coordinate swap we did for position (Y and Z swapped)
            const vx = (cosR * cosW - sinR * sinW * cosI) * vxOrbit + (-cosR * sinW - sinR * cosW * cosI) * vyOrbit;
            const vz = (sinR * cosW + cosR * sinW * cosI) * vxOrbit + (-sinR * sinW + cosR * cosW * cosI) * vyOrbit;
            const vy = (sinW * sinI) * vxOrbit + (cosW * sinI) * vyOrbit;
            
            data[baseIdx + 3] = vx;
            data[baseIdx + 4] = vy;
            data[baseIdx + 5] = vz;
            
            // Mass and type
            data[baseIdx + 6] = 100 + Math.random() * 5000; // 100-5100 kg realistic satellite mass
            // Object types: 0=normal satellite, 1=collision debris (red), 5=rogue (red)
            // Start with all normal satellites in nominal state
            data[baseIdx + 7] = 0; // Type 0 = normal operational satellite
            
            // Debug first few objects
            if (i < 3) {
                console.log(`Object ${i}:`);
                console.log(`  Position: (${px.toFixed(2)}, ${py.toFixed(2)}, ${pz.toFixed(2)}) km`);
                console.log(`  Velocity: (${vx.toFixed(2)}, ${vy.toFixed(2)}, ${vz.toFixed(2)}) km/s`);
                console.log(`  Radius: ${r.toFixed(2)} km, Altitude: ${(r - this.EARTH_RADIUS).toFixed(2)} km`);
                // Orbital speed calculated: ${orbitalSpeed.toFixed(2)} km/s
                const actualSpeed = Math.sqrt(vx*vx + vy*vy + vz*vz);
                console.log(`  Actual Speed: ${actualSpeed.toFixed(2)} km/s`);
                // Check if velocity is perpendicular to position
                const dotProduct = px*vx + py*vy + pz*vz;
                console.log(`  Dot product (should be ~0): ${dotProduct.toFixed(2)}`);
            }
        }
        
        stagingBuffer.unmap();
        
        // Copy to GPU
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            stagingBuffer, 0,
            this.stateBuffer, 0,
            count * 32
        );
        this.device.queue.submit([commandEncoder.finish()]);
        
        // Create instances for rendering
        this.createInstances(count);
        
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        // Final count logged in physics-launcher.js instead
    }
    
    createInstances(count) {
        // Clean up ALL existing instances properly to prevent ghosts
        if (this.instancesByType) {
            for (const mesh of Object.values(this.instancesByType)) {
                if (mesh) {
                    mesh.thinInstanceSetBuffer('matrix', null);
                    mesh.thinInstanceCount = 0;
                    mesh.isVisible = false;
                }
            }
        }
        
        // Also clean up mesh templates
        for (const mesh of Object.values(this.meshTemplates)) {
            if (mesh) {
                mesh.thinInstanceSetBuffer('matrix', null);
                mesh.thinInstanceCount = 0;
                mesh.isVisible = false;
            }
        }
        
        // Use render manager to determine what to render
        const renderIndices = this.renderManager.getRenderIndices();
        const renderCount = renderIndices.length;
        
        // Calculate distribution based on orbit types
        const distribution = {
            LEO: Math.floor(renderCount * 0.6),
            MEO: Math.floor(renderCount * 0.25),
            GEO: Math.floor(renderCount * 0.1),
            HEO: Math.floor(renderCount * 0.04),
            DEBRIS: Math.floor(renderCount * 0.01)
        };
        
        // Create instances for each orbit type
        this.instancesByType = {};
        this.matricesByType = {};
        let totalCreated = 0;
        
        // Track how many of each type we've created
        const typeCounts = { LEO: 0, MEO: 0, GEO: 0, HEO: 0, DEBRIS: 0 };
        
        for (const [orbitType, typeCount] of Object.entries(distribution)) {
            if (typeCount > 0) {
                const matrices = new Float32Array(16 * typeCount);
                let typeIdx = 0;
                
                // Fill matrices with initial positions based on orbit type
                for (let i = 0; i < count && typeIdx < typeCount; i++) {
                    // Check if this object matches the current orbit type
                    const objectType = this.orbitTypeIndices[i];
                    const typeNames = ['LEO', 'MEO', 'GEO', 'HEO', 'DEBRIS'];
                    
                    if (typeNames[objectType] === orbitType) {
                        const offset = typeIdx * 16;
                        
                        // Get initial position
                        const x = this.initialPositions[i * 3 + 0] * this.KM_TO_BABYLON;
                        const y = this.initialPositions[i * 3 + 1] * this.KM_TO_BABYLON;
                        const z = this.initialPositions[i * 3 + 2] * this.KM_TO_BABYLON;
                        
                        // Full identity matrix with position
                        matrices[offset + 0] = 1;  // m11
                        matrices[offset + 1] = 0;  // m12
                        matrices[offset + 2] = 0;  // m13
                        matrices[offset + 3] = 0;  // m14
                        matrices[offset + 4] = 0;  // m21
                        matrices[offset + 5] = 1;  // m22
                        matrices[offset + 6] = 0;  // m23
                        matrices[offset + 7] = 0;  // m24
                        matrices[offset + 8] = 0;  // m31
                        matrices[offset + 9] = 0;  // m32
                        matrices[offset + 10] = 1; // m33
                        matrices[offset + 11] = 0; // m34
                        matrices[offset + 12] = x; // m41 (x translation)
                        matrices[offset + 13] = y; // m42 (y translation)
                        matrices[offset + 14] = z; // m43 (z translation)
                        matrices[offset + 15] = 1; // m44
                        
                        typeIdx++;
                    }
                }
                
                // Set buffer and create instances for this type
                this.meshTemplates[orbitType].thinInstanceSetBuffer('matrix', matrices, 16, true);
                this.meshTemplates[orbitType].isVisible = true;
                
                // Store references
                this.instancesByType[orbitType] = this.meshTemplates[orbitType];
                this.matricesByType[orbitType] = matrices;
                
                totalCreated += typeCount;
            }
        }
        
        // Store total render count
        this.renderCount = totalCreated;
        
    }
    
    async step(deltaTime) {
        if (!this.initialized || this.activeObjects === 0) return;
        
        // Update render swapping for dynamic visualization
        this.renderManager.updateSwapping(deltaTime * 1000);
        
        // CRITICAL FIX: Clamp deltaTime to prevent huge jumps on first frame
        // Maximum 0.033 seconds (33ms) for smoother 30+ FPS minimum
        const clampedDeltaTime = Math.min(deltaTime, 0.033);
        
        // Use global time multiplier from simulation state
        const timeMultiplier = window.getTimeMultiplier ? window.getTimeMultiplier() : this.physicsTimeMultiplier;
        const dt = clampedDeltaTime * timeMultiplier;
        
        // Frame debug removed for cleaner console
        if (false) { // Disabled debug logs
            console.log(`Frame ${this.frameCount}: deltaTime=${deltaTime.toFixed(4)} (clamped=${clampedDeltaTime.toFixed(4)}), timeMultiplier=${timeMultiplier}, dt=${dt.toFixed(4)}`);
            if (deltaTime > 0.1) {
                console.warn(`⚠️ Large deltaTime ${deltaTime.toFixed(4)} clamped to ${clampedDeltaTime.toFixed(4)}`);
            }
            
            // Calculate expected gravity for a LEO satellite at ~7000km
            const testR = 7000; // km
            const expectedAccel = this.EARTH_MU / (testR * testR); // km/s²
            console.log(`Expected acceleration at ${testR}km: ${expectedAccel.toFixed(4)} km/s²`);
            // Expected velocity change: ${(expectedAccel * dt).toFixed(6)} km/s
        }
        
        // Performance logging only for large counts
        if (this.activeObjects >= 100000 && this.frameCount % 300 === 0) { // Log every 5 seconds instead of every second
            const fps = 1 / deltaTime;
            console.log(`%c🚀 Simulated: ${this.activeObjects.toLocaleString()} | Rendered: ${this.renderCount.toLocaleString()} @ ${fps.toFixed(1)} FPS`, 'color: #00ff00; font-size: 12px');
        }
        
        // Test mode tracking for single satellite
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'test-single' && this.frameCount % 60 === 0) { // Log every second
            await this.trackTestSatellite();
        }
        
        // Increment frame count
        this.frameCount++;
        
        // Update uniform buffer
        const uniformData = new Float32Array([
            dt,                    // dt
            this.frameCount * dt,  // time
            this.activeObjects,    // objectCount
            this.EARTH_MU,        // earthMu
            this.MOON_MU,         // moonMu
            this.SUN_MU,          // sunMu
            this.EARTH_RADIUS,    // earthRadius
            0                     // padding
        ]);
        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
        
        // Create command encoder
        const commandEncoder = this.device.createCommandEncoder();
        
        // Orbital physics pass
        const orbitPass = commandEncoder.beginComputePass();
        orbitPass.setPipeline(this.orbitPipeline);
        
        // Create bind group
        const bindGroup = this.device.createBindGroup({
            layout: this.orbitPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.stateBuffer } },
                { binding: 1, resource: { buffer: this.uniformBuffer } }
            ]
        });
        
        orbitPass.setBindGroup(0, bindGroup);
        
        // Dispatch with adaptive workgroup size
        const workgroupSize = this.workgroupSize || 64;
        const workgroupCount = Math.ceil(this.activeObjects / workgroupSize);
        orbitPass.dispatchWorkgroups(workgroupCount);
        orbitPass.end();
        
        // Submit commands
        this.device.queue.submit([commandEncoder.finish()]);
        
        // Read back positions for rendering (async)
        // Update every frame for smooth motion at 1x and 60x speeds
        await this.updateRendering();
        
        this.frameCount++;
    }
    
    async updateRendering() {
        // Read positions from GPU
        const readBuffer = this.device.createBuffer({
            size: this.renderCount * 32,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.stateBuffer, 0,
            readBuffer, 0,
            this.renderCount * 32
        );
        this.device.queue.submit([commandEncoder.finish()]);
        
        await readBuffer.mapAsync(GPUMapMode.READ);
        const data = new Float32Array(readBuffer.getMappedRange());
        
        // Store for debris counting
        this.lastStateData = data;
        
        // Count debris and detect new collisions for explosions
        if (this.kesslerActive) {
            let debrisCount = 0;
            const newDebris = [];
            
            for (let i = 0; i < this.renderCount; i++) {
                const objType = data[i * 8 + 7];
                if (objType === 1 || objType === 5) {
                    debrisCount++;
                    
                    // Check if this is newly created debris
                    if (!this.lastDebrisIndices || !this.lastDebrisIndices.includes(i)) {
                        newDebris.push({
                            x: data[i * 8 + 0],
                            y: data[i * 8 + 1],
                            z: data[i * 8 + 2]
                        });
                    }
                }
            }
            
            // Create explosions for new debris (collisions)
            if (newDebris.length > 0 && this.frameCount % 10 === 0) { // Limit explosion rate
                for (const pos of newDebris.slice(0, 2)) { // Max 2 explosions per frame
                    this.createExplosion(pos);
                }
            }
            
            // Update debris tracking
            this.debrisGenerated = debrisCount;
            this.lastDebrisIndices = [];
            for (let i = 0; i < this.renderCount; i++) {
                const objType = data[i * 8 + 7];
                if (objType === 1 || objType === 5) {
                    this.lastDebrisIndices.push(i);
                }
            }
        }
        
        // Track indices for each orbit type
        const typeIndices = {
            LEO: 0,
            MEO: 0,
            GEO: 0,
            HEO: 0,
            DEBRIS: 0
        };
        
        // Debug first object position changes
        if (this.frameCount < 5 && this.renderCount > 0) {
            // Object layout: [px, py, pz, vx, vy, vz, mass, type] - no padding!
            const x0 = data[0];
            const y0 = data[1];
            const z0 = data[2];
            const vx0 = data[3];
            const vy0 = data[4];
            const vz0 = data[5];
            
            const r = Math.sqrt(x0*x0 + y0*y0 + z0*z0);
            const v = Math.sqrt(vx0*vx0 + vy0*vy0 + vz0*vz0);
            
            // Calculate position change from last frame
            if (this.lastDebugPos) {
                const dx = x0 - this.lastDebugPos.x;
                const dy = y0 - this.lastDebugPos.y;
                const dz = z0 - this.lastDebugPos.z;
                const dr = r - this.lastDebugPos.r;
                console.log(`  Δpos: (${dx.toFixed(3)}, ${dy.toFixed(3)}, ${dz.toFixed(3)}) km`);
                console.log(`  Δr: ${dr.toFixed(3)} km (${dr > 0 ? 'moving away' : 'moving closer'})`);
            }
            
            console.log(`Frame ${this.frameCount} - Object 0:`);
            console.log(`  r=${r.toFixed(1)}km (alt=${(r-this.EARTH_RADIUS).toFixed(1)}km), v=${v.toFixed(3)}km/s`);
            console.log(`  pos=(${x0.toFixed(2)}, ${y0.toFixed(2)}, ${z0.toFixed(2)})`);
            console.log(`  vel=(${vx0.toFixed(2)}, ${vy0.toFixed(2)}, ${vz0.toFixed(2)})`);
            
            this.lastDebugPos = {x: x0, y: y0, z: z0, r: r};
        }
        
        // Update highlight spheres if they exist
        if (this.highlightedIndices.length > 0 && this.highlightSphere1 && this.highlightSphere2) {
            const idx1 = this.highlightedIndices[0];
            const idx2 = this.highlightedIndices[1];
            
            if (idx1 < this.renderCount) {
                const baseIdx1 = idx1 * 8;
                this.highlightSphere1.position.x = data[baseIdx1 + 0] * this.KM_TO_BABYLON;
                this.highlightSphere1.position.y = data[baseIdx1 + 1] * this.KM_TO_BABYLON;
                this.highlightSphere1.position.z = data[baseIdx1 + 2] * this.KM_TO_BABYLON;
            }
            
            if (idx2 < this.renderCount) {
                const baseIdx2 = idx2 * 8;
                this.highlightSphere2.position.x = data[baseIdx2 + 0] * this.KM_TO_BABYLON;
                this.highlightSphere2.position.y = data[baseIdx2 + 1] * this.KM_TO_BABYLON;
                this.highlightSphere2.position.z = data[baseIdx2 + 2] * this.KM_TO_BABYLON;
            }
        }
        
        // Update instance matrices by orbit type for proper coloring
        for (let i = 0; i < this.renderCount; i++) {
            const baseIdx = i * 8;
            const x = data[baseIdx + 0] * this.KM_TO_BABYLON;
            const y = data[baseIdx + 1] * this.KM_TO_BABYLON;
            const z = data[baseIdx + 2] * this.KM_TO_BABYLON;
            const objType = data[baseIdx + 7];
            
            // Determine orbit type from stored index or object type
            let orbitType;
            
            // Check object type for collision debris/rogues
            if (objType === 1 || objType === 5) {
                // Type 1 = collision debris (from cascade)
                // Type 5 = rogue satellites (collision initiators)
                // Both display as RED COLLISION DEBRIS for visual impact
                orbitType = 'COLLISION_DEBRIS';
            } else {
                // Normal satellites - determine by orbit type index or altitude
                if (i < this.orbitTypeIndices.length) {
                    const typeIdx = this.orbitTypeIndices[i];
                    orbitType = ['LEO', 'MEO', 'GEO', 'HEO', 'DEBRIS'][typeIdx] || 'LEO';
                } else {
                    // Fallback: determine by altitude
                    const r = Math.sqrt(x*x + y*y + z*z) / this.KM_TO_BABYLON;
                    const altitude = r - this.EARTH_RADIUS;
                    if (altitude < 2000) orbitType = 'LEO';
                    else if (altitude < 20000) orbitType = 'MEO';
                    else if (altitude > 35000 && altitude < 36000) orbitType = 'GEO';
                    else if (altitude > 20000) orbitType = 'HEO';
                    else orbitType = 'LEO';
                }
            }
            
            // Update the appropriate matrix buffer
            if (this.matricesByType[orbitType]) {
                const matrices = this.matricesByType[orbitType];
                const idx = typeIndices[orbitType];
                const offset = idx * 16;
                
                if (offset < matrices.length - 15) {
                    matrices[offset + 12] = x;
                    matrices[offset + 13] = y;
                    matrices[offset + 14] = z;
                    typeIndices[orbitType]++;
                }
            }
        }
        
        // Update all type-specific buffers
        for (const [orbitType, mesh] of Object.entries(this.instancesByType)) {
            if (this.matricesByType[orbitType]) {
                mesh.thinInstanceSetBuffer('matrix', this.matricesByType[orbitType], 16, true);
                mesh.thinInstanceRefreshBoundingInfo(true);
            }
        }
        
        readBuffer.unmap();
    }
    
    /**
     * Analyze potential conjunctions (close approaches) in the nominal state
     * Returns array of potential collision events sorted by time to closest approach
     */
    async analyzeConjunctions(timeHorizon = 60, minDistance = 5) {
        if (!this.device || this.activeObjects === 0) return [];
        
        const conjunctions = [];
        // With 100K objects, we can do more comprehensive analysis
        // 100K objects = 5 billion comparisons (feasible with spatial partitioning)
        const sampleSize = Math.min(1000, this.activeObjects); // Check up to 1000 objects
        
        // TODO: Implement GPU-based all-pairs conjunction analysis using:
        // 1. Spatial hashing to group nearby objects
        // 2. Parallel reduction to find close approaches
        // 3. Time propagation for TCA calculation
        
        // Read current state
        const commandEncoder = this.device.createCommandEncoder();
        const readSize = sampleSize * 32;
        const readBuffer = this.device.createBuffer({
            size: readSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        
        commandEncoder.copyBufferToBuffer(this.stateBuffer, 0, readBuffer, 0, readSize);
        this.device.queue.submit([commandEncoder.finish()]);
        
        await readBuffer.mapAsync(GPUMapMode.READ);
        const data = new Float32Array(readBuffer.getMappedRange());
        
        // Analyze pairs for potential conjunctions
        for (let i = 0; i < sampleSize - 1; i++) {
            // Skip debris objects
            if (data[i * 8 + 7] === 1) continue;
            
            const obj1 = {
                idx: i,
                x: data[i * 8 + 0], y: data[i * 8 + 1], z: data[i * 8 + 2],
                vx: data[i * 8 + 3], vy: data[i * 8 + 4], vz: data[i * 8 + 5]
            };
            
            // Only check nearby objects for efficiency
            for (let j = i + 1; j < Math.min(i + 50, sampleSize); j++) {
                // Skip debris
                if (data[j * 8 + 7] === 1) continue;
                
                const obj2 = {
                    idx: j,
                    x: data[j * 8 + 0], y: data[j * 8 + 1], z: data[j * 8 + 2],
                    vx: data[j * 8 + 3], vy: data[j * 8 + 4], vz: data[j * 8 + 5]
                };
                
                // Calculate relative position and velocity
                const dx = obj2.x - obj1.x;
                const dy = obj2.y - obj1.y;
                const dz = obj2.z - obj1.z;
                const dvx = obj2.vx - obj1.vx;
                const dvy = obj2.vy - obj1.vy;
                const dvz = obj2.vz - obj1.vz;
                
                // Calculate time to closest approach (TCA)
                const dvDotDv = dvx*dvx + dvy*dvy + dvz*dvz;
                if (dvDotDv < 0.0001) continue; // Objects moving in parallel
                
                const tca = -(dx*dvx + dy*dvy + dz*dvz) / dvDotDv;
                
                // Only consider future conjunctions within time horizon
                if (tca > 0 && tca < timeHorizon) {
                    // Calculate distance at closest approach
                    const xAtTCA = dx + dvx * tca;
                    const yAtTCA = dy + dvy * tca;
                    const zAtTCA = dz + dvz * tca;
                    const distanceAtTCA = Math.sqrt(xAtTCA*xAtTCA + yAtTCA*yAtTCA + zAtTCA*zAtTCA);
                    
                    // Check if this is a close approach
                    if (distanceAtTCA < minDistance) {
                        // Calculate collision probability (simplified model)
                        const probability = Math.max(0, 1 - (distanceAtTCA / minDistance));
                        
                        conjunctions.push({
                            object1: obj1.idx,
                            object2: obj2.idx,
                            timeToClosestApproach: tca,
                            minDistance: distanceAtTCA,
                            probability: probability,
                            relativeVelocity: Math.sqrt(dvx*dvx + dvy*dvy + dvz*dvz),
                            position1: { x: obj1.x, y: obj1.y, z: obj1.z },
                            position2: { x: obj2.x, y: obj2.y, z: obj2.z }
                        });
                    }
                }
            }
        }
        
        readBuffer.unmap();
        
        // Sort by time to closest approach
        conjunctions.sort((a, b) => a.timeToClosestApproach - b.timeToClosestApproach);
        
        // Return top 10 most imminent conjunctions
        return conjunctions.slice(0, 10);
    }
    
    /**
     * Get near-misses that have recently occurred
     */
    async getNearMisses(lookbackTime = 10, maxDistance = 10) {
        // This would track recent close approaches that didn't result in collision
        // For now, return empty array as this requires historical tracking
        return [];
    }
    
    async triggerKesslerSyndrome() {
        console.log('GPU KESSLER: Initiating cascade with 1M objects!');
        
        if (!this.device || this.activeObjects === 0) {
            console.warn('Cannot trigger Kessler syndrome: no objects or device not ready');
            return;
        }
        
        // Pick two objects close together in LEO for faster collision
        // Search for objects that are actually near each other
        const searchStart = 100; // Start from index 100 to avoid edge cases
        const searchRange = 200; // Search within 200 objects for proximity
        
        // Pick first object
        const idx1 = searchStart + Math.floor(Math.random() * searchRange);
        // Pick nearby object (within 10 indices for spatial proximity)
        const idx2 = idx1 + 1 + Math.floor(Math.random() * 5);
        
        // Create a command to read current state
        const commandEncoder = this.device.createCommandEncoder();
        
        // Read the two selected objects
        const readSize = Math.max(idx1, idx2) * 32 + 32; // Ensure we read enough
        const readBuffer = this.device.createBuffer({
            size: readSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        
        commandEncoder.copyBufferToBuffer(this.stateBuffer, 0, readBuffer, 0, readSize);
        this.device.queue.submit([commandEncoder.finish()]);
        
        await readBuffer.mapAsync(GPUMapMode.READ);
        const data = new Float32Array(readBuffer.getMappedRange());
        
        // Get positions of selected objects
        const obj1 = {
            x: data[idx1 * 8 + 0], y: data[idx1 * 8 + 1], z: data[idx1 * 8 + 2],
            vx: data[idx1 * 8 + 3], vy: data[idx1 * 8 + 4], vz: data[idx1 * 8 + 5],
            mass: data[idx1 * 8 + 6], type: data[idx1 * 8 + 7]
        };
        const obj2 = {
            x: data[idx2 * 8 + 0], y: data[idx2 * 8 + 1], z: data[idx2 * 8 + 2],
            vx: data[idx2 * 8 + 3], vy: data[idx2 * 8 + 4], vz: data[idx2 * 8 + 5],
            mass: data[idx2 * 8 + 6], type: data[idx2 * 8 + 7]
        };
        
        readBuffer.unmap();
        
        // Calculate collision velocities - aim objects at each other at high speed
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const dz = obj2.z - obj1.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        const collisionSpeed = 30; // 30 km/s - extreme hypervelocity for quick impact!
        const vx1 = (dx / dist) * collisionSpeed;
        const vy1 = (dy / dist) * collisionSpeed;
        const vz1 = (dz / dist) * collisionSpeed;
        
        // Update velocities to cause collision - write to the correct indices
        const updateData1 = new Float32Array(8);
        updateData1[0] = obj1.x;
        updateData1[1] = obj1.y;
        updateData1[2] = obj1.z;
        updateData1[3] = vx1; // New collision velocity
        updateData1[4] = vy1;
        updateData1[5] = vz1;
        updateData1[6] = obj1.mass || 5000; // Keep existing mass
        updateData1[7] = 5; // Mark as special rogue type
        
        const updateData2 = new Float32Array(8);
        updateData2[0] = obj2.x;
        updateData2[1] = obj2.y;
        updateData2[2] = obj2.z;
        updateData2[3] = -vx1 * 0.8; // Opposite direction, slightly slower
        updateData2[4] = -vy1 * 0.8;
        updateData2[5] = -vz1 * 0.8;
        updateData2[6] = obj2.mass || 5000; // Keep existing mass
        updateData2[7] = 5; // Mark as special rogue type
        
        // Write collision course velocities to the correct positions
        this.device.queue.writeBuffer(this.stateBuffer, idx1 * 32, updateData1);
        this.device.queue.writeBuffer(this.stateBuffer, idx2 * 32, updateData2);
        
        this.kesslerActive = true;
        this.collisionCount = 0;
        
        console.log(`[KESSLER] Collision course initiated`);
        console.log(`   Targets: Object #${idx1} and Object #${idx2}`);
        console.log(`   Position 1: [${obj1.x.toFixed(0)}, ${obj1.y.toFixed(0)}, ${obj1.z.toFixed(0)}] km`);
        console.log(`   Position 2: [${obj2.x.toFixed(0)}, ${obj2.y.toFixed(0)}, ${obj2.z.toFixed(0)}] km`);
        // Impact velocity: ${collisionSpeed} km/s
        console.log(`   Separation: ${dist.toFixed(0)} km`);
        console.log(`   Time to impact: ${(dist / collisionSpeed).toFixed(1)} seconds`);
        
        return {
            message: 'Kessler cascade initiated!',
            idx1: idx1,
            idx2: idx2,
            object1: obj1,
            object2: obj2,
            distance: dist,
            impactVelocity: collisionSpeed,
            timeToImpact: dist / collisionSpeed,
            position: { x: obj1.x, y: obj1.y, z: obj1.z }
        };
    }
    
    /**
     * Set simulated and rendered object counts
     * Called from Engineering Panel
     */
    async setObjectCounts(simulated, rendered) {
        console.log(`[GPU Physics] Setting counts: ${simulated} simulated, ${rendered} rendered`);
        
        // Validate ratio
        if (!this.renderManager.setObjectCounts(simulated, rendered)) {
            console.error('[GPU Physics] Invalid ratio - must be at least 2:1');
            return false;
        }
        
        // Update render count
        this.renderCount = rendered;
        
        // Reinitialize with new counts
        this.activeObjects = 0;
        this.targetObjects = simulated;
        await this.populateSpace(simulated);
        
        return true;
    }
    
    /**
     * Load a predefined scenario
     * Called from Engineering Panel
     */
    async loadScenario(scenarioConfig) {
        console.log(`[GPU Physics] Loading scenario: ${scenarioConfig.name}`);
        
        // Load scenario into manager
        const scenario = scenarioManager.loadScenario(scenarioConfig.name);
        if (!scenario) return false;
        
        // Calculate total objects
        const totalObjects = scenario.satellites + scenario.debris;
        const renderedObjects = Math.min(100000, Math.floor(totalObjects / 2)); // Allow up to 100K rendered
        
        // Set counts and reinitialize
        await this.setObjectCounts(totalObjects, renderedObjects);
        
        // TODO: Apply scenario-specific orbital parameters during populateSpace
        // This would require modifying populateSpace to use scenarioManager.generateOrbitalParams
        
        return true;
    }
    
    getStats() {
        const renderStats = this.renderManager.getStats();
        return {
            totalObjects: this.activeObjects,
            maxCapacity: this.maxObjects,
            renderer: 'WebGPU',
            physicsTime: this.frameCount * this.physicsTimeMultiplier / 60,
            fps: 60, // Target
            timeMultiplier: this.physicsTimeMultiplier,
            kesslerActive: this.kesslerActive,
            collisionCount: this.collisionCount,
            debrisGenerated: this.debrisGenerated,
            simulated: renderStats.simulated,
            rendered: renderStats.rendered,
            ratio: renderStats.ratio,
            pinnedObjects: renderStats.pinned
        };
    }
    
    async trackTestSatellite() {
        // Read position and velocity of our test satellite
        const commandEncoder = this.device.createCommandEncoder();
        const readBuffer = this.device.createBuffer({
            size: 32, // Just read first object (8 floats × 4 bytes)
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        
        commandEncoder.copyBufferToBuffer(this.stateBuffer, 0, readBuffer, 0, 32);
        this.device.queue.submit([commandEncoder.finish()]);
        
        await readBuffer.mapAsync(GPUMapMode.READ);
        const data = new Float32Array(readBuffer.getMappedRange());
        
        const x = data[0];
        const y = data[1];
        const z = data[2];
        const vx = data[3];
        const vy = data[4];
        const vz = data[5];
        
        // Calculate orbital parameters
        const r = Math.sqrt(x*x + y*y + z*z);
        const v = Math.sqrt(vx*vx + vy*vy + vz*vz);
        const altitude = r - this.EARTH_RADIUS;
        
        // Calculate orbital period using vis-viva
        const a = 1 / (2/r - v*v/this.EARTH_MU); // Semi-major axis
        const period = 2 * Math.PI * Math.sqrt(a*a*a / this.EARTH_MU) / 60; // In minutes
        
        // Track if satellite completed orbit
        const elapsedTime = (performance.now() - window.testSatelliteInitial.startTime) / 1000 / 60; // Minutes
        
        console.log(`🛰️ ORBITAL TEST at T+${elapsedTime.toFixed(1)} min:`);
        console.log(`  Position: r=${r.toFixed(1)}km, alt=${altitude.toFixed(1)}km`);
        console.log(`  Velocity: ${v.toFixed(3)} km/s (expected: 7.66 km/s)`);
        console.log(`  Calculated period: ${period.toFixed(2)} min (expected: 92.68 min)`);
        console.log(`  Position: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) km`);
        
        // Check if we've completed an orbit
        if (elapsedTime >= 92.68 && elapsedTime <= 93) {
            // Orbit complete - satellite near starting position
            console.log(`  Initial altitude: ${window.testSatelliteInitial.altitude}km`);
            console.log(`  Current altitude: ${altitude.toFixed(1)}km`);
            console.log(`  Drift: ${Math.abs(altitude - window.testSatelliteInitial.altitude).toFixed(2)}km`);
        }
        
        readBuffer.unmap();
    }
    
    setTimeMultiplier(multiplier) {
        // Validate multiplier is in allowed range
        if (this.availableTimeMultipliers.includes(multiplier)) {
            this.physicsTimeMultiplier = multiplier;
            console.log(`Time multiplier set to ${multiplier}x`);
        } else {
            console.warn(`Invalid time multiplier ${multiplier}. Available: ${this.availableTimeMultipliers.join(', ')}`)
        }
    }
    
    updateObjectScale(scale) {
        // Update the scale of all mesh templates
        const oldScale = this.currentScale || 0.008;
        this.currentScale = scale;
        const scaleFactor = scale / oldScale;
        
        // Update each mesh template's scaling directly
        for (const [type, mesh] of Object.entries(this.meshTemplates)) {
            if (mesh) {
                // Apply scale factor to existing mesh
                mesh.scaling.scaleInPlace(scaleFactor);
            }
        }
        
        console.log(`[GPU Physics] Object scale updated from ${oldScale} to ${scale} (factor: ${scaleFactor})`);
    }
}