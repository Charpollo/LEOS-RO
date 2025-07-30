# LEOS Flight Rules

These are the core principles and rules we follow when building and maintaining the LEOS codebase. All development must adhere to these guidelines.

## Core Rules

### 1. Code Length Limit - 1000 Lines Maximum
- **No file shall exceed 1000 lines of code**
- When approaching this limit (~800 lines), plan to modularize
- Break large files into logical, focused modules
- Each module should have a single, clear responsibility

### 2. Modular Architecture
- **Everything must be modularized**
- Create small, focused modules that do one thing well
- Use clear naming conventions that describe the module's purpose
- Ensure modules are easily referenceable and maintainable
- Follow the existing pattern in frontend/js/ with separate modules for:
  - Visual components (earth.js, moon.js, satellites.js)
  - Data handling (telemetry.js, groundStations.js)
  - UI management (uiManager.js, brandComponents.js)
  - Core functionality (simulation.js, app.js)

### 3. Realism Above All
- **Always prioritize realism in visual and physical implementations**
- Use accurate physics calculations for orbital mechanics
- Implement realistic lighting, shadows, and atmospheric effects
- Research real-world references before implementation
- Include realistic details like:
  - Accurate scale and proportions
  - Physically correct lighting behavior
  - Realistic material properties
  - Scientifically accurate phenomena

## Implementation Guidelines

### File Structure
```
frontend/js/
├── core/           # Core functionality modules
├── visuals/        # Visual component modules
├── data/           # Data handling modules
├── ui/             # UI component modules
└── utils/          # Utility functions
```

### Module Template
```javascript
// module-name.js
export class ModuleName {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.initialize();
    }

    initialize() {
        // Setup code
    }

    // Public methods
    update(deltaTime) {
        // Update logic
    }

    // Private methods prefixed with underscore
    _internalMethod() {
        // Internal logic
    }
}
```

### Realistic Implementation Checklist
- [ ] Research real-world references
- [ ] Use accurate scale and measurements
- [ ] Implement proper physics/mathematics
- [ ] Add realistic visual effects
- [ ] Include atmospheric/environmental effects
- [ ] Test under different conditions
- [ ] Verify scientific accuracy

## Exceptions
- Existing large codebases may remain as-is until refactoring is needed
- When modifying existing large files, consider refactoring if adding significant new code

## Review Process
Before merging any branch:
1. Verify no new files exceed 1000 lines
2. Ensure new features are properly modularized
3. Confirm realistic implementation with references
4. Document any scientific/mathematical basis used