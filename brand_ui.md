# LEOS: First Orbit – UI Integration README

This project aims to replicate and refine the visual style of the original **LEOS: First Orbit** interface, aligning it with the simulation and UI design seen in the LEOS browser demo.

---

## 🌌 Overview

LEOS: First Orbit is a Babylon.js-based 3D space simulation focused on orbital mechanics, satellite behavior, and immersive user experience. This README provides a structured breakdown of the interface components, interaction flow, and UI design patterns based on the reference screenshots from the original implementation.

---

## 🧱 UI Components

### 1. Left Info Panel (Mission Briefing)

- **Purpose**: Displays mission summary, engine description, satellite capabilities, and orbital mechanics.
- **Design**:
  - Fixed to the left
  - Semi-transparent with backdrop blur
  - Sections: `The LEOS Engine`, `About the Satellites`, `Orbital Mechanics`
  - Color scheme: Black background, neon blue headers

### 2. Loading Screen

- **Trigger**: On initial simulation launch
- **Content**:
  - Title: "Launching LEOS: First Orbit"
  - Subtitle: "Preparing simulation data"
  - Animated loading spinner
  - Space fact overlay (randomized or static)
- **Style**:
  - Fullscreen black overlay
  - Centered text and spinner
  - Light blue highlight text and border

### 3. Welcome Modal (Tutorial)

- **Trigger**: First-time launch or manual access
- **Functionality**:
  - Instructions: Rotate, Zoom, Satellite Info, Reset View, Exit
  - Button: “Got it!” to close
- **Appearance**:
  - Centered modal with glowing border
  - Neon blue font highlights

---

## 🎨 UI Design Goals

- **Theme**: Space exploration, futuristic UI
- **Font**: Modern sans-serif (Segoe UI, Roboto, etc.)
- **Highlight Color**: Neon blue (`#00cfff`)
- **Layout**: Sidebar on left, full-width globe background, floating modals
- **Visual Style**: Smooth transitions, clean overlays, immersive interface

---

## 🧠 Behavior & UX Summary

- **User starts simulation** → loading screen appears with space fact
- **Simulation loads** → welcome modal shows with tutorial
- **User dismisses modal** → left panel displays full mission context
- **User interacts**:
  - Click satellite → satellite popup (future feature)
  - Scroll/pinch → zoom
  - Drag → rotate Earth
  - Press `R` → reset view

---
