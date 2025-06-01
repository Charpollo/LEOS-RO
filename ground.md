# 📡 LEOS: Ground Station & Line-of-Sight (LOS) Module

## Purpose
This feature introduces realistic ground station coverage and satellite communication into the LEOS simulation. Ground stations will be placed at real-world geographic locations and will detect when satellites pass overhead (LOS events). During LOS, a visual signal will be rendered between the ground station and satellite to indicate active communication.

This is a foundational feature that supports future telemetry, data relay, cyber scenarios, and mission control modules.

---

## Core Features

### 🌍 Ground Station Placement
Ground stations are rendered as **green glowing dots** on the surface of the Earth. For this version, the following stations will be statically placed:

| Location         | Name                |
|------------------|---------------------|
| Australia        | Canberra DSN Site   |
| Mainland US (1)  | Vandenberg, CA      |
| Mainland US (2)  | Wallops Island, VA  |
| Hawaii           | Mauna Kea Station   |
| Additional Site  | Diego Garcia, Indian Ocean |

- Stations remain fixed on Earth's surface.
- Dots remain visible or toggleable in LEOS.

---

## Satellite Communication Events

### 🔄 LOS Detection
- Every satellite in the simulation checks its line of sight (LOS) to each ground station on each frame/tick.
- A satellite is **in LOS** if:
  - It is above the station's horizon (e.g., >0° elevation angle)
  - There is no occlusion (optional in future, ignore Earth obstruction in v1)

### 📡 Signal Visualization
- When LOS occurs:
  - Animate a **green arc or beam** from the ground station up to the satellite.
  - Use Babylon.js glow or pulse to simulate active communication.
  - Duration of signal should last as long as LOS is active.

### 🧠 Visual Behavior
- Beam appears as either:
  - Curved arc (using mesh tube or line path)
  - Straight beam with glow effect
- Optionally display:
  - Satellite name + timestamp above ground station
  - “In contact” label or icon

---

## Integration with LEOS Dial

- Add new button to LEOS Dial:
  - **Label**: `Ground Stations`
  - **Icon**: 🛰️+📡
- Toggles visibility of all ground stations
- Optionally opens a side panel showing:
  - Station name
  - Satellites currently in LOS
  - Contact duration (count-up timer)

---

## Interactivity

- Hovering over a ground station shows:
  - Station Name
  - Location (lat/lon)
  - Active connections
- Clicking a station opens panel:
  - List of satellites in view
  - Time of next contact (optional v2)

---

## Technical Notes

### LOS Calculation Method (v1)
- For each satellite:
  - Convert both satellite and station to ECEF or geodetic coordinates
  - Calculate elevation angle between ground station and satellite
  - LOS if elevation > 0°

- Future expansion:
  - Take terrain, Earth obstruction into account
  - Integrate orbital prediction for precontact events

---

## Performance Considerations
- Keep active signal beams lightweight (glow line/mesh only when LOS is active)
- Limit checking to every N frames if needed for large satellite counts
- Use low-LOD for Earth station icons (simple spheres with emissive material)

---

## Expansion Paths (Future)
- Add uplink/downlink bandwidth logic
- Simulate handoff between ground stations
- Add cyber vulnerability overlays (signal jamming, spoofing)
- Enable user to build or move custom ground stations
- Connect to real-world SatNOGS or DSN feeds for realism
- Add TT&C console to show real-time telemetry during LOS

---

## Status
This module is included in **LEOS Free Edition**. All behavior is simulated and visualized using **Babylon.js** in the frontend. No backend dependency is required at this stage. LOS calculations and rendering are performed client-side. 