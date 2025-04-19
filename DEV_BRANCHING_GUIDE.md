# LEOS Git Strategy & Branching Guide

This guide outlines how we organize, branch, and tag the **LEOS codebase** across multiple long-running product lines:

- `LEOS: First Orbit` (public demo)
- `LEOS: Mission Ready` (full commercial release)
- `LEOS: Red Sky` (internal R&D / demonstration)

It defines how we split development across branches, work on features safely, and tag major milestones.

---

## 1. Repository Structure Overview

All products live in **one single repo** called `LEOS`.

We use **long-lived base branches** to isolate product lines, and short-lived `feature/*` branches to safely develop changes.

| Branch Name     | Purpose                                                      |
|-----------------|--------------------------------------------------------------|
| `main`          | The **stable production** branch for `LEOS: Mission Ready`   |
| `first-orbit`   | The **public demo** version of LEOS                          |
| `red-sky`       | The **internal R&D / showcase** version                      |
| `feature/*`     | Temporary branches used for adding new features or fixes     |
| `hotfix/*`      | Urgent fixes to any of the long-lived branches (rare)        |

---

## 2. Long-Running Branches

These branches should always remain **stable**, deployable, and protected.

### `main`

- Final build-ready branch for `Mission Ready`
- Only merge well-tested features
- Deployed via production pipeline

### `first-orbit`

- Represents the live demo environment
- Only receives bugfixes, small enhancements
- **Treat this as production** for the demo

### `red-sky`

- Internal-only features, visualizations, or testbeds
- Can diverge more from the main architecture

---

## 3. How to Work on a Feature (Standard Workflow)

> **NEVER** commit directly to `main`, `first-orbit`, or `red-sky`.

### 🔁 Step-by-Step Workflow

1. Start from the correct base branch:
   ```bash
   git checkout first-orbit
   git pull
   ```

2. Create a feature branch:
   ```bash
   git checkout -b feature/firstorbit-load-speed
   ```

3. Do your work. Commit often:
   ```bash
   git add .
   git commit -m "Optimize load speed in First Orbit"
   ```

4. Merge it back in when tested:
   ```bash
   git checkout first-orbit
   git merge feature/firstorbit-load-speed
   git push origin first-orbit
   ```

5. Clean up:
   ```bash
   git branch -d feature/firstorbit-load-speed
   git push origin --delete feature/firstorbit-load-speed
   ```

---

## 4. Tagging Strategy (Versioning and Revert Points)

We use **annotated Git tags** to mark stable releases, milestones, and deployments.

### Why Tags?

- ✅ Rollbacks
- ✅ Tracking release history
- ✅ Deployment automation
- ✅ Consistent versioning for different product lines

---

### 📌 Tag Naming Convention

| Product Branch   | Format                        | Example                   |
|------------------|-------------------------------|---------------------------|
| `first-orbit`    | `v<MAJOR>.<MINOR>-firstorbit` | `v1.1-firstorbit`         |
| `mission-ready`  | `v<MAJOR>.<MINOR>-mission`    | `v2.0-mission`            |
| `red-sky`        | `v<DATE>-redsky`              | `v2025-04-demo1-redsky`   |

---

### 🏷️ How to Tag a Version

1. Ensure you’re on the right branch:
   ```bash
   git checkout first-orbit
   git pull
   ```

2. Tag the release:
   ```bash
   git tag -a v1.1-firstorbit -m "Performance improvements for First Orbit"
   ```

3. Push the tag to GitHub:
   ```bash
   git push origin v1.1-firstorbit
   ```

---

### ⏪ How to Revert to a Tag

```bash
# View tags
git tag

# Checkout a tag (read-only mode)
git checkout tags/v1.1-firstorbit

# Reset a branch to a tagged commit (use with caution)
git checkout first-orbit
git reset --hard v1.1-firstorbit
git push origin first-orbit --force
```

---

## 5. Naming Conventions

| Type            | Format Example                      |
|-----------------|--------------------------------------|
| Feature branch  | `feature/<area>-<shortdesc>`         |
| Hotfix branch   | `hotfix/<area>-<bugdesc>`            |
| Tag             | `v1.0-firstorbit`, `v2.1-mission`    |

---

## 6. Additional Rules

- All new development **must happen in `feature/*` branches**
- Always merge **back into the base branch** it came from
- Tag before any public release, internal showcase, or Cloud Run deploy
- Clean up stale branches after merges

---

## ✅ Example Use Case

> You want to add telemetry enhancements to `LEOS: Red Sky` for an investor demo:

```bash
git checkout red-sky
git checkout -b feature/redsky-telemetry-upgrade
# Work...
git commit -am "Improve telemetry visualization"
git checkout red-sky
git merge feature/redsky-telemetry-upgrade
git tag -a v2025-04-redsky-demo1 -m "Demo-ready Red Sky with telemetry upgrade"
git push origin red-sky
git push origin v2025-04-redsky-demo1
```