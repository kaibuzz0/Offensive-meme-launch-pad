# Meme City QA release gate — baseline protocol (2026-11-08)

Owner: #47 Android performance / #57 multiplayer-security QA. Integration: #43. **This is a test protocol and provisional budget, not a measured performance result.**

## Evidence categories
- **Physical Android:** device model, Android/Chrome version, thermal state, power mode, network, viewport, GPU backend, build SHA, video and trace. No physical Android access has been established in this run.
- **Mobile-sized Chromium:** report as desktop emulation; never describe as Android hardware.
- **Node/static checks:** validate schemas and logic only; never count as a visible frame or browser interaction.
- **Public Pages:** record deployed SHA separately from workflow success, actual rendered pixels and gameplay acceptance.

## Exact-head reproducible route
1. Capture main and PR head SHA, homepage URL and all Play navigation targets. Cold-load from cleared cache/service worker and storage **only after exporting existing saves**. Capture request log, transferred bytes, failed requests, console errors, service-worker version, first visible scene and time to interactive.
2. Follow **homepage Play**, choose **offline Solo without wallet**, and record actual route. Confirm first-person fortress and mountain skyline, wooded road, district lighting and an accessible interior. Do not substitute a direct deep link.
3. At a fixed seed and camera path, compare WebGL and forced compatibility renderer: same landmark positions, geometry identity, collisions, pickup/gate state, HUD and save key. Pixel colors may differ; geometry and actions may not. Capture screenshots and the selected backend.
4. Touch: landscape viewport, independent movement/look joysticks, rotate camera while moving, pickup and interact. Check pointer cancellation, focus loss and orientation change; no stuck input.
5. Persistence: save before reset, collect one item, open gate, build/edit if available; wait for **fresh controller coordinates after the action**, flush save, reload and verify seed, coordinates, inventory and edits. Run migration twice; compare serialized output and preserve the original backup. Unknown/retired IDs remain recoverable, never silently discarded.
6. Security: replay pickup/build request IDs, inject unknown outfit/item IDs, negative or huge quantities, nonfinite coordinates, unauthorized world edits and client-authored rewards. Server must reject invalid multiplayer mutations without changing authoritative state; offline Solo must remain playable.
7. Travel between chunks, visit crowded actors/interior, place/remove objects, repeat reloads and idle for 30 minutes. Record cache size, active workers, GPU buffers/textures, JS heap (where available), frame-time p50/p95/p99, long tasks, draw calls, mesh counts and resource growth. Compare start/end after returning to identical location.
8. Run `npm test` and `npm run check` on **the same exact SHA** as the browser capture; preserve failing logs and screenshot artifacts. Gate fails for blank screen, different gameplay between backends, lost save or unvalidated server reward, regardless of test totals.

## Initial provisional release budgets — targets, NOT observed measurements
These numbers are starting acceptance thresholds subject to physical-device profiling and agreement with #43, not performance claims.

| Metric | Android-class provisional target | Measurement |
|---|---:|---|
| Cold homepage Play → first recognizable interactive scene | <= 10 s on stable 10 Mbps connection | navigation + performance marks; 5 trials |
| Initial transferred assets (cold cache) | <= 8 MiB | summed network transfer sizes, including dynamic imports |
| Frame time, representative travel p95 | <= 33.3 ms | >= 120 s after warmup |
| Frame time, representative travel p99 | <= 66.7 ms | >= 120 s after warmup |
| Interaction stall | no task > 200 ms | PerformanceObserver longtask + input timestamp |
| Live JS heap | <= 160 MiB when browser exposes heap measurement | sample after GC opportunity; mark unsupported if unavailable |
| GPU allocation | instrument and report; **no numeric gate until available** | buffers/textures and estimated bytes, not assumed device VRAM |
| Workers / pending chunk queue | <= 2 workers; <= 32 pending jobs | runtime instrumentation, count at 1/10/30 min |
| Returned-to-origin retained resource growth | <= 15% over post-warmup baseline | same seed/location, after 30 min travel |
| Duplicate downloads | 0 redundant network transfers of identical immutable asset URL during one session | HAR grouped by URL + cache status |

Desktop targets should be measured separately rather than extrapolated from mobile. Unavailable APIs must be recorded as **not measured**, not as passing.

## Current blockers / handoff
- #86 describes a stale-HUD post-reset position assertion; use authoritative fresh controller state, not an old HUD sample.
- Historical #78/#80 WebGL recovery must be tested through the homepage route and verified with rendered pixels, not just a Canvas2D fallback assertion.
- #43 currently identifies PR-only scenery/workbench and QA parity work. Do not call those features public until merged, deployed and visually exercised.
- Before adopting any profiler, serializer or network library, check existing instrumentation and #44 notes, pin revision, inspect actual LICENSE and dependencies, measure bundle/startup impact, then record adopt/defer/reject in one shared shortlist.
- A real physical Android performance baseline and public visual walkthrough remain **unverified** here. No tests or benchmark commands were executed in this GitHub-only connector run.
