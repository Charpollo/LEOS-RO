RED ORBIT — Render/Sim + Grafana Flight Rules

Purpose: Concrete rules for running very large GPU physics while rendering only what’s useful, with a clean Grafana story.

⸻

Core Principles
	•	Simulate many, render some. We keep physics at large scale (hundreds of thousands → millions) and render a small, curated slice (50k–100k) that stays readable and lively.
	•	Truth vs View.
	•	Truth channel (sim): all objects, all events → exported to Grafana.
	•	View channel (render): the subset we draw for humans → clearly labeled.
	•	Pin what matters, sample the rest. Event participants, near-camera, and high-risk objects are pinned; background clutter is sampled/rotated.

⸻

Why we don’t use 1:1 rendering

We intentionally avoid 1:1 (drawing every simulated object) because:
	1.	Frame time collapse. Millions of draws (even thin instances) drive FPS down; engines clamp deltaTime, so motion appears frozen or jerky.
	2.	Visual snowstorm. Dense dots turn into noise; the story disappears.
	3.	Index/refresh pitfalls. When sim==render, naïve index mapping and zero swap rate can leave the same objects on screen for long stretches, looking “still” even though physics is running.
	4.	No headroom for pinning. You can’t guarantee important newcomers (collisions/conjunctions) will be visible without evicting something immediately.

Bottom line: 1:1 costs more, looks worse, and paradoxically makes “still dots” more likely in practice.

⸻

The “still data weirdness” (what causes frozen-looking dots)
	•	Low FPS / dt clamping: physics advances by tiny increments per frame when FPS tanks → movement looks static.
	•	Duplicate/stride mapping: a bad LUT (e.g., i * step rounding) picks the same indices repeatedly.
	•	Zero/slow swap + high dwell: if you never rotate the background set, background appears frozen.
	•	Scale issues: at GEO/HEO, per-frame motion is sub-pixel at wide FOV; without trails/jitter, it reads as “still.”
	•	Camera lock & circular orbits: face-on circular LEO with the camera tracking Earth = little apparent lateral motion.

Fixes checklist:
	•	Use center-of-bin index LUT (no stride=0), e.g., acc = 0.5*step.
	•	Maintain a small swap rate (1–5%/s) and min dwell (≥3–8s).
	•	Always pin movers/events; never evict pins.
	•	Add trails (or tiny view-only jitter) for far-field.
	•	Keep simulated_count > rendered_count to have headroom for swaps.

⸻

Recommended Ratios & Slices
	•	Production demos / ops UX: render 50k–100k from ≥200k simulated (1:2 up to 1:8+).
	•	Marketing shots: push trails, heatmaps, and cinematic lighting; keep render ≤100k.
	•	Debug labs: temporarily smaller totals if you need every object visible (not our default).

Render slicing knobs (UI toggles):
	•	Orbit class: LEO / MEO / GEO / HEO
	•	Object type: Satellite / Debris / Collision debris
	•	AOI focus: cone/box around camera or lat/lon/alt tiles
	•	Event focus: pin current collisions, recent debris, and conjunctions
	•	Swap rate & dwell: rotate a small % of non-pinned items per second; respect dwell
	•	LOD/Trails: far-field heatmap/voxels; near-field thin instances with trails

⸻

Grafana: what we ship and how to read it

We emit two aligned streams:

1) Truth channel (Simulation)
	•	simulated_count
	•	conjunctions_active
	•	collisions_per_sec
	•	debris_generated_total
	•	flux_by_alt_bin{bin="200–600km"}
	•	event_stream (collider IDs, timestamps, Δv estimates)
	•	physics_time_multiplier, dt_ms
	•	Provenance: run_id, commit_sha, config_version, seed

2) View channel (Render policy & perf)
	•	rendered_count, pinned_count
	•	sampling_strategy (strata, AOI weights)
	•	swap_rate_pct_s, min_dwell_ms
	•	heatmap_enabled, lod_level
	•	frame_time_ms, fps, gpu_mem_mb

Dash layout suggestion
	•	Row A (State): simulated_count vs rendered_count + %pinned
	•	Row B (Risk): collisions/conjunctions over time; top AOIs by risk
	•	Row C (Orbit strata): stacked bars by LEO/MEO/GEO/HEO and type
	•	Row D (Perf): FPS, frame time, GPU MB; swap/dwell gauges
	•	Row E (Sampling): table of strata → selected/rendered %, seed, policy

Example metric names (Prometheus-style)

redorbit_sim_objects_total{stratum="LEO"}
redorbit_view_objects_rendered_total
redorbit_view_pinned_total
redorbit_events_collisions_total
redorbit_perf_frame_time_ms
redorbit_sampling_swap_rate_percent
redorbit_sampling_min_dwell_ms
redorbit_run_info{run_id="...", commit="...", config="..."}


⸻

Operator-facing labeling (in app)

Always show a badge:

Rendering 100,000 of 200,000 simulated • 100% of event participants pinned

Tooltip example (on a dot):

This view shows 128 of 4,218 in this tile
Strata: LEO / Debris / 12N–45E
Pinned: false • Dwell: 6.2s left


⸻

Implementation notes (short + practical)
	•	Index LUT (center-of-bin) to spread sim→render evenly:

function makeRenderIndexLUT(simCount, renderCount){
  const R = Math.min(renderCount, simCount);
  const lut = new Uint32Array(R);
  const step = simCount / R;
  let acc = 0.5 * step;               // center-of-bin
  for (let i = 0; i < R; i++, acc += step) {
    const idx = Math.floor(acc);
    lut[i] = idx >= simCount ? simCount - 1 : idx;
  }
  return lut;
}

	•	Pin-first, sample-second, then rotate a small % of non-pinned per tick; enforce min dwell.
	•	Seeded sampling for deterministic replay; stamp the seed + commit into Grafana.
	•	Trails/heatmaps for far-field; thin instances near AOI for detail.
	•	Never evict pins. Event participants remain visible until de-pinned.

⸻

Preset configs

Showcase (cinematic)
	•	Sim: 400k–1M • Render: 50k–100k
	•	Trails on, swap ~2%/s, dwell 6–10s
	•	AOI weighted; events pinned; heatmap at far-field

Ops LEO Focus
	•	Sim: 200k–8M
	•	Render: 50k–100k with LEO overweight
	•	Strict determinism, Grafana truth/view split
	•	Conjunction table + AOI heatmaps

Perf/Debug
	•	Smaller totals only to diagnose; FPS counter on; simple lighting
	•	Verify swap/dwell/LUT behavior (no duplicates, healthy motion)

⸻

Quick QA

Q: If we only render 50–100k, do we miss Kessler cascades?
A: No—event participants are pinned; background is sampled/rotated. Grafana shows the full cascade from the truth channel.

Q: Why did dots look frozen previously?
A: A mix of low FPS (dt clamp), non-rotating samples, and index duplication. Fix with center-of-bin LUT, small swap rate, min dwell, and keep simulated>rendered.

Q: How do users know what they’re seeing?
A: The badge (counts + pinning) + tooltips + the Grafana view vs truth panels.

⸻

Bottom line:
Keep physics big, keep visuals curated. We don’t use 1:1 because it harms FPS, readability, and can actually increase “stillness.” Pin events, rotate background, label the view, and push the full truth to Grafana. That’s how we demo beautifully and operate credibly.