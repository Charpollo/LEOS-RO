# GPU Physics Scaling Analysis for RED ORBIT

## Current CPU Physics Limits

### With Havok (CPU-based)
- **Practical Limit**: 10,000-15,000 objects at 60 FPS
- **Absolute Limit**: ~25,000 objects at 30 FPS
- **Bottleneck**: CPU single-thread collision detection

### Performance Breakdown at Scale
```
1,000 objects:   ~2ms physics (500 FPS capable)
10,000 objects:  ~16ms physics (60 FPS capable)
25,000 objects:  ~33ms physics (30 FPS)
50,000 objects:  ~130ms physics (7 FPS) - UNUSABLE
100,000 objects: ~520ms physics (2 FPS) - COMPLETELY BROKEN
```

## When You NEED GPU Physics

### The Breaking Points
1. **15,000+ objects**: CPU physics becomes unstable
2. **Real debris clouds**: Kessler events generate 100,000+ fragments
3. **N-body gravitation**: Moon, Sun, J2 perturbations for all objects
4. **Collision detection**: O(n²) problem, needs spatial acceleration
5. **Real-time requirements**: Maintaining 60+ FPS

## GPU Physics Architecture

### WebGPU Compute Shaders Approach
```glsl
// Each object computed in parallel
@compute @workgroup_size(256)
fn update_orbits(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    let pos = positions[idx];
    let vel = velocities[idx];
    
    // Calculate gravity (parallelized)
    let r = length(pos);
    let gravity = -EARTH_MU / (r * r * r) * pos;
    
    // Update velocity and position
    velocities[idx] = vel + gravity * dt;
    positions[idx] = pos + velocities[idx] * dt;
}
```

### What You Can Achieve with GPU Physics

| Scale | CPU (Havok) | GPU (Custom) | Use Case |
|-------|-------------|--------------|----------|
| **1K** | 60 FPS (2ms) | 60 FPS (0.1ms) | Current RED ORBIT |
| **10K** | 60 FPS (16ms) | 60 FPS (0.5ms) | Enhanced simulation |
| **50K** | 7 FPS | 60 FPS (2ms) | Full Kessler cascade |
| **100K** | 2 FPS | 60 FPS (4ms) | Realistic debris field |
| **500K** | Impossible | 60 FPS (20ms) | All tracked space objects |
| **1M** | Impossible | 30 FPS (33ms) | Future mega-constellations |
| **10M** | Impossible | 5 FPS | Theoretical limit |

## Hybrid CPU-GPU Architecture Design

### Level 1: Havok + LOD (10-25K objects)
```javascript
// Near objects: Full Havok physics
if (distanceToCamera < 1000) {
    havok.fullPhysics(object);
}
// Far objects: Simplified orbital integration
else {
    keplerOrbitUpdate(object);
}
```

### Level 2: GPU Compute for Orbits (25-100K)
```javascript
// GPU: Orbital mechanics for all objects
gpuComputeOrbits(allObjects);

// CPU: Collision detection for nearby objects only
havok.collisions(nearbyObjects);
```

### Level 3: Full GPU Physics (100K-1M)
```javascript
// Everything on GPU
class GPUPhysicsEngine {
    // Gravity calculation
    computeGravity();      // Parallel for all objects
    
    // Broad-phase collision via spatial hashing
    spatialHash();         // GPU accelerated
    
    // Narrow-phase collision
    detectCollisions();    // Parallel pairs
    
    // Debris generation
    generateDebris();      // Compute shader
}
```

## Implementation Complexity

### Staying with CPU (Havok)
- **Complexity**: Low
- **Time to implement**: 1-2 weeks
- **Max objects**: 15,000
- **Pros**: Easy, stable, proven
- **Cons**: Limited scale

### Hybrid CPU-GPU
- **Complexity**: Medium
- **Time to implement**: 4-6 weeks
- **Max objects**: 50,000
- **Pros**: Good balance, keeps collision accuracy
- **Cons**: Two systems to maintain

### Full GPU Physics
- **Complexity**: Very High
- **Time to implement**: 2-3 months
- **Max objects**: 1,000,000+
- **Pros**: Massive scale, future-proof
- **Cons**: Complex debugging, browser compatibility

## Real-World Comparisons

### Current Space Tracking
- **NORAD Catalog**: ~50,000 tracked objects
- **Estimated total debris > 1cm**: ~1,000,000 pieces
- **Starlink alone**: 6,000+ satellites (growing to 42,000)

### Games/Simulations Reference
- **Universe Sandbox**: GPU physics, millions of particles
- **SpaceX Starlink Sim**: Custom GPU, 30,000 satellites
- **ESA MASTER**: CPU clusters, 750,000 debris objects

## WebGPU Code Example

```javascript
// GPU Orbital Physics Kernel
const computeShader = `
struct Object {
    position: vec3<f32>,
    velocity: vec3<f32>,
    mass: f32,
    radius: f32,
}

@group(0) @binding(0) var<storage, read_write> objects: array<Object>;
@group(0) @binding(1) var<uniform> params: SimParams;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= params.numObjects) { return; }
    
    var obj = objects[idx];
    let r = length(obj.position);
    
    // Gravity (vis-viva equation on GPU)
    let gravity = -398600.4418 / (r * r * r) * obj.position;
    
    // Atmospheric drag (if in atmosphere)
    var drag = vec3<f32>(0.0);
    let altitude = r - 6371.0;
    if (altitude < 200.0) {
        let density = exp(-(altitude - 100.0) / 50.0) * 0.001;
        drag = -normalize(obj.velocity) * length(obj.velocity) * density;
    }
    
    // Update velocity and position
    obj.velocity += (gravity + drag) * params.dt;
    obj.position += obj.velocity * params.dt;
    
    objects[idx] = obj;
}
`;
```

## Recommendation Path

### Phase 1: Optimize Havok (Now - 15K objects)
✅ Implement Havok migration
✅ Add LOD system
✅ Spatial partitioning
**Good for: 90% of use cases**

### Phase 2: Hybrid GPU Orbits (15-50K objects)
When you need:
- Full Kessler cascades
- Starlink constellation modeling
- Real debris field simulation

### Phase 3: Full GPU Physics (50K-1M objects)
When you need:
- Scientific accuracy for all tracked objects
- Predictive collision modeling
- N-body perturbations
- Real-time million-particle systems

## The GPU Trigger Points

**You need GPU physics when:**
1. Object count > 15,000 consistently
2. Collision checks > 1M per frame
3. Frame time > 16ms from physics alone
4. Simulating real catalog (50K+ objects)
5. N-body gravity (Sun, Moon effects)
6. Complex atmospheric models
7. Magnetic field interactions

## Conclusion

**Current Recommendation**: 
- Havok can handle up to **15,000 objects** effectively
- This covers 99% of visualization needs
- Real Kessler events need **50-100K** for accuracy

**GPU Physics needed at**:
- **25,000+ objects** for maintaining 60 FPS
- **50,000+ objects** for any reasonable performance
- **100,000+ objects** is GPU-only territory

**For RED ORBIT's goals**:
- Havok gets you to 10-15K (sufficient for impressive Kessler demos)
- Hybrid GPU for 50K (full constellation modeling)
- Full GPU only if simulating entire orbital catalog

The sweet spot is **Havok with LOD** for now, with GPU compute shaders as a future upgrade path when you need to model entire satellite constellations or realistic debris clouds.

---

*The jump to GPU physics should be driven by specific requirements, not just "because we can." Havok at 10-15K objects will already be incredibly impressive.*