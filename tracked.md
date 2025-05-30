# 🛰️ LEOS: Global Tracked Objects Visualization Layer

## Purpose
This module adds a visual layer to the LEOS simulation that displays NORAD- and StarTrack-tracked orbital objects in real-time or accelerated-time around Earth. Each object is visualized as a small dot based on TLE propagation and orbit classification.

The goal is to provide space domain awareness (SDA) within LEOS for educational, exploratory, and operational simulation use.

---

## Core Functionality

### 🌐 Main Features
- Renders all tracked orbital objects from static TLE data.
- Objects appear as glowing dots orbiting Earth in the 3D simulation.
- Dot movement is propagated using satellite.js to reflect real orbital positions.
- Orbit class determines the color of each dot.
- Dots are interactive — hovering shows key metadata.
- Users can manually add new satellites via TLE input.

---

## UI Integration

### LEOS Dial Button
- **Label**: `Track All Objects`
- **Position**: Top-left dial interface
- **Action**:
  - Enables or disables visualization of all tracked orbital objects
  - Reveals controls to add a new object via TLE

### TLE Input Modal
- Two-line input box for pasting TLE data
- Button to submit and add to scene
- Newly added object renders instantly in orbit

---

## Visual Behavior

### Dot Properties
| Orbit Class | Altitude Range        | Color     |
|-------------|------------------------|-----------|
| LEO         | 160 – 2,000 km         | Cyan      |
| MEO         | 2,000 – 35,786 km      | Yellow    |
| GEO         | ~35,786 km             | Red       |
| HEO         | Highly Elliptical      | Purple    |
| User        | Manual TLE             | White     |

- Use particle systems or mesh instances for dots
- Dots animate in orbit
- Tooltip on hover shows:
  - Object Name
  - NORAD ID
  - Orbit Altitude & Inclination
  - Launch Date or Operator if available

---

## Data Source

### TLE Dataset
- Uses `.txt` or `.json` TLE files stored locally or preloaded
- All orbits are calculated client-side using `satellite.js`
- No backend or server calls in this version

---

## Performance Considerations
- Support up to 5,000–10,000 objects via GPU-based particle rendering
- Use `satellite.js` only during animation frame updates
- Allow toggling visibility for performance control

---

## Expansion Paths (Future)
- Backend integration for live sync with Celestrak or Space-Track
- Persistent user TLE tracking
- Collision risk highlight (Red Sky)
- Filters by mission type, country, object size

---

## Status
This feature is part of **LEOS Free Edition** and designed for **frontend-only** Babylon.js environments. All data handling and visualization are performed in-browser.