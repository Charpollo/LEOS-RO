# Visual Scale vs Physics Scale in RED ORBIT

## Overview
RED ORBIT uses two different scales: one for physics simulation (real scale) and one for visualization (exaggerated scale). This document explains why this distinction exists and how to interpret what you see.

## The Two Scales

### 1. Physics Scale (Real Dimensions)
- **Used for:** All orbital calculations, collision detection, conjunction analysis
- **Scale:** 1:1 with reality
- **Units:** Kilometers for position, meters for satellite size
- **Satellite size:** ~10 meters diameter (typical)
- **Earth radius:** 6,371 km

### 2. Visual Scale (What You See)
- **Used for:** 3D rendering and display
- **Scale:** ~8000x larger than reality
- **Default diameter:** 0.008 Babylon units (~51 km visual diameter)
- **Purpose:** Makes satellites visible to human operators

## Why Scale Exaggeration?

At true scale, satellites would be invisible:
- Real satellite: 10m diameter
- Earth radius: 6,371,000m
- True scale ratio: 10 / 6,371,000 = 0.0000015 (invisible pixel)

Our visual scale makes objects visible:
- Visual scale: 0.008 Babylon units
- Scale multiplier: 0.008 / 0.0000015 = ~5,333x to 8,000x larger

## Interpreting Visual Overlaps

When satellites appear to overlap visually, they are NOT colliding but having a close approach:

### Visual Overlap Guide

| Visual Appearance | Real Distance | Risk Level | Action Required |
|------------------|---------------|------------|-----------------|
| **Barely touching** | 50-100 km | Low | Normal - monitor |
| **Slight overlap** | 25-50 km | Medium | Conjunction alert |
| **Heavy overlap** | 10-25 km | High | Warning - may need avoidance |
| **Complete overlap** | <10 km | Critical | Collision risk - immediate action |

### The "Safety Bubble" Concept

Think of the visual representation as a **safety bubble** around each satellite:
- The bubble is ~8000x larger than the actual satellite
- When bubbles touch, satellites are having a close approach
- When bubbles overlap significantly, collision risk increases

## Conjunction Analysis Accuracy

**Important:** All conjunction predictions use REAL physics, not visual scale:

1. **Position calculations:** Real orbital mechanics (Kepler/Newton)
2. **Distance checks:** Actual separation in kilometers
3. **Collision detection:** Real satellite dimensions (~10m)
4. **Time to closest approach:** Calculated with real velocities

The visual scale is ONLY for human observation. All safety-critical calculations use true physical dimensions.

## Benefits of Scale Exaggeration

1. **Early Warning System**
   - Near-misses become visible events
   - Operators can spot risks at a glance
   - No need to constantly check numerical data

2. **Situational Awareness**
   - See orbital patterns and clustering
   - Identify congested regions
   - Observe constellation movements

3. **Industry Standard**
   - NASA, ESA, and commercial operators use similar scaling
   - Recognized best practice for space visualization
   - Balances visibility with spatial understanding

## Configuration

The visual scale can be adjusted in the Engineering Panel:

- **Visualization Mode:** 0.008 diameter (8000x real) - Default
- **Real Scale Mode:** 0.0001 diameter (100x real) - Minimum visible

To see the true vastness of space, use Real Scale mode where satellites appear as tiny dots.

## Technical Implementation

```javascript
// Physics uses real dimensions
this.EARTH_RADIUS = 6371.0; // km
this.EARTH_MU = 398600.4418; // km³/s²

// Visual rendering uses scaled dimensions
const diameter = 0.008; // Default visualization scale
// Real satellite would be: 0.0000015
// Scale factor: ~5,333x to 8,000x
```

## Key Takeaway

**Visual overlap ≠ Collision**

Visual overlap is an early warning indicator of close approaches. Actual collisions only occur when objects are within meters of each other, but by making objects appear larger, we can see and prevent these events before they happen.

This scale exaggeration transforms invisible near-misses into visible, actionable events - a critical feature for space traffic management.