# 🌕 LEOS: Moon Exploration & Transition Module

## Purpose
This feature enables users to transition from Low Earth Orbit (LEO) to a detailed lunar view. Through either the LEOS Dial or direct interaction with the Moon in the scene, users can “travel” to the Moon and explore its surface, orbital characteristics, and view Earth from lunar distance.

The goal is to expand the scope of LEOS from Earth-centric operations into lunar mission support, education, and visualization.

---

## Core Features

### 🛰️ Activation Methods
- **LEOS Dial Button**
  - Label: `Moon View`
  - Clicking this triggers a transition from current Earth view to the Moon
- **Direct Click Interaction**
  - Clicking the Moon object in the scene (if visible) triggers the same transition
  - Add glowing/hover outline to indicate interactivity

---

## Visual Behavior

### 🚀 Transition
- Smooth camera movement or teleport effect from Earth orbit to Moon orbit
- Option for a brief cinematic fly-through or straight cut (based on sim settings)
- Retain Earth in background from lunar view
- Zoom and rotate camera freely once in Moon mode

### 🌓 Moon Environment
- Detailed 3D sphere with realistic albedo + bump/normal map for lunar terrain
- No need for terrain tessellation in v1 (can add later)
- High-contrast lighting to simulate shadowed craters and lit regions
- Low orbit camera altitudes (50–100km) to simulate spacecraft perspectives
- Optionally rotate the Moon slowly (realistic sidereal period or sim speed)

---

## 🌍 Earth from Moon
- Maintain Earth in the background skybox or scene
- Earth should be visible at a realistic distance with cloud animation (if toggled)
- Support orbital realism or user-controlled positioning

---

## 🔘 LEOS Dial Integration
- Add new button:  
  - **Label**: `Moon View`  
  - **Icon**: 🌓 (Moon glyph)
- Button state toggles between:
  - Earth Mode (default)
  - Moon Mode (exploration)
- Optional: Show text overlay: `"Now viewing: The Moon"` or `"Now viewing: Earth"`

---

## 🔁 Interactivity in Moon Mode
- Camera orbit, pan, zoom (same control scheme as Earth)
- Enable object anchoring for future expansion (landers, satellites)
- Enable user to click on lunar regions or place markers (Phase 2)
- Back button on screen or Dial to return to Earth

---

## Performance Considerations
- Keep Moon mesh LOD scalable for low-end devices
- Use single Moon mesh with PBR materials
- Render Earth as a distant object (lower LOD) while in Moon mode

---

## Expansion Paths (Future)
- Add lunar terrain tilesets for EVA or lander simulations
- Add real mission overlays (Apollo landing zones, future Artemis zones)
- Add lunar satellite orbits (e.g., CAPSTONE, Lunar Reconnaissance Orbiter)
- Integrate lunar cybersecurity scenarios (e.g., comms jamming, control spoofing)
- Add Sun-Earth-Moon perspective simulation (eclipse view, etc.)

---

## Status
This feature is part of **LEOS Free Edition**, implemented entirely in **Babylon.js**. No backend or dynamic loading is required for v1.

All transitions and rendering logic live inside the frontend simulation. The Moon object should already exist in the 3D scene graph and be selectable via UI or mouse click.