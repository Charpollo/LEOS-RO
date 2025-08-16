# Proposed Documentation Consolidation

## New Structure

### 1. TECHNICAL-LIMITATIONS-AND-TRADEOFFS.md
Comprehensive guide to all system limitations and design tradeoffs

**Sections:**
1. **Overview of Three Systems**
   - Physics Simulation (O(N) - scales perfectly)
   - Collision Detection (O(N²) - limited coverage)
   - Rendering (GPU bandwidth limited)

2. **Scaling Limitations**
   - The N-Body problem
   - Capability matrix by object count
   - What works at each scale

3. **Rendering vs Simulation Tradeoffs**
   - The frozen satellite problem
   - The 2:1 rule
   - Optimal configurations

4. **Collision Detection Coverage**
   - Spatial hashing approach
   - Coverage percentages
   - What we catch vs miss

5. **Performance Benchmarks**
   - FPS at different scales
   - Memory usage
   - GPU requirements

6. **Mitigation Strategies**
   - Render slicing
   - Smart sampling
   - Region-based analysis

### 2. ORBITAL-MECHANICS-AND-VERIFICATION.md
Complete mathematical foundation and verification

**Sections:**
1. **Core Physics Implementation**
   - Newton's laws
   - Vis-viva equation
   - Orbital elements

2. **Verification Methods**
   - Test cases
   - Comparison with NASA data
   - Single satellite tests

3. **Collision Mathematics**
   - Probability calculations
   - Miss distance computation
   - Time to closest approach

4. **GPU Implementation**
   - Shader code
   - Numerical integration
   - Precision considerations

### Documents to Keep As-Is:
- **RO-Grafana.md** - Grafana integration guide
- **CONJUNCTION-DATA-FORMAT.md** - API spec
- **ORBITAL-ZONES-RADIATION-ENVIRONMENT.md** - Reference data
- **RED-ORBIT-VALUE-PROPOSITION.md** - Business case
- **LIVE-DEMO-EVENT.md** - Event documentation

## Benefits of Consolidation

1. **Reduces confusion** - Related topics in one place
2. **Eliminates redundancy** - No repeated explanations
3. **Clearer navigation** - Fewer files to search through
4. **Better context** - See all limitations together
5. **Easier maintenance** - Update one doc instead of three

## Migration Plan

1. Create new consolidated documents
2. Add redirects from old filenames
3. Update any code references
4. Archive original documents
5. Update README with new structure