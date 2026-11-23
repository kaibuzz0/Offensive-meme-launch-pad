# QA #47 — Mobile release measurement contract (provisional)

Status: **proposed budgets, not measured performance**. Owner #47/#57; #43 reviews release gate. Baseline ref: record exact main SHA and deployed Pages SHA before comparison. This document does not establish browser or physical-device acceptance.

## Reproducible paths

1. Start at the **homepage** and activate its visible primary **Play** link (currently `city.html?terrain=1`); do not begin tests at a deep link. Use a clean profile and repeat with a warm service-worker cache.
2. Record visible fortress and mountain skyline, wooded road, lit district/interior and a persistent pickup/build interaction. Fail if the canvas is blank, controls are blocked, or the scene changes to a different flat-map game in fallback.
3. On a phone-sized viewport (390×844 CSS px and landscape 844×390), test touch movement and look, interact, save, reload and confirm **live controller coordinates**, inventory and gate/pickup state; repeat under forced Canvas2D and WebGL when supported.
4. Repeat a fixed seed/camera route in quiet and busy scenes, building and resource pickup, repeated traversal, 10 reloads and a 30-minute session. Record request counts, transferred bytes, duplicate asset URLs, frame-time p50/p95/p99, longest interaction stall, JS heap where available, process RAM and GPU resources where supported, mesh/draw counts, active workers, pending tasks and cache growth.
5. For offline Solo, load the app online once, disconnect network and start Solo **without a wallet**. Do not claim offline support based on a network-connected test. Reconnect separately for multiplayer authorization/room isolation.

## Initial *candidate* release budgets (adjust only with recorded baseline and device evidence)

| Metric | Proposed Android-class target | How to verify |
|---|---:|---|
| First meaningful world frame, warm cache | ≤ 5 s | navigation mark → visibly rendered interactive frame |
| First meaningful world frame, cold cache | ≤ 12 s | fresh storage, recorded network profile |
| Startup transferred resources | ≤ 5 MiB | browser Resource Timing/HAR; exclude cached bytes |
| Gameplay frame time p95 / p99 | ≤ 33 / 50 ms | animation frame intervals across fixed route |
| Single input-to-visible-response stall | ≤ 150 ms | event timestamp to resulting visible state |
| Long main-thread task | ≤ 100 ms | PerformanceObserver longtask/trace |
| JS heap growth after 10 reload/travel cycles | ≤ 20% above stabilized baseline | same device and GC protocol; diagnostic only |
| Active worker count and pending chunk jobs | bounded; no monotonic growth | runtime counters before/after repeated travel |
| Missing geometry, collisions or interactions in compatibility renderer | **0** | same seed, player route, interaction assertions |
| Lost/duplicated persisted edits, pickups or credits after reload | **0** | before/after durable state comparison |

These are **provisional acceptance targets**, not existing measurements or promises. Heap instrumentation and GPU memory may be unavailable on some Android browsers; mark N/A, never infer zero. Capture device model, Android version, browser build, DPR, viewport, battery/thermal state, network shaping, build SHA, renderer, seed and cache state with every result. Label physical Android separately from desktop Chromium emulation. A CI green result does not substitute for actual scene screenshots or controller state.

## Regression gates and ownership

- **#43 integration:** exact-head `npm test`, `npm run check`, Chromium Play→scene→interaction→reload, reviewed dependency order and Pages deployment SHA.
- **#47 runtime:** resource transfer inventory (extend PR #164), WebGL startup/Canvas2D parity, bounded workers/meshes/cache, repeatable measurements and physical Android evidence.
- **#57 security/save:** forged IDs, room isolation, duplicate reward claims, versioned repeat-safe migration and preservation of unmappable legacy data. PRs #166/#167/#169 are test-only leads, not evidence of public gameplay.
- **#44 reuse:** prefer existing browser Performance API and Node built-ins before new dependencies. Evaluate third-party profiler/serialization packages only if a measured blocker warrants bundle, license and transitive-dependency review.

## Reporting template

`SHA | PR | physical/emulated device | viewport | renderer | seed | cold/warm | visible route step | startup s | transferred MiB | frame p95/p99 ms | stall ms | heap/RAM | workers/jobs | persistence pass/fail | public deployed SHA | screenshot/HAR/trace link | limitation`

No public deployment, performance result or source-gameplay change is claimed by this documentation-only increment.

## 2026-11-23 source-level blocker and additional budget gates

Fresh `main` inspection: `sw.js` currently precaches `offline.html` plus three icons; it does **not** precache `index.html`, `city.html` or the playable script/worker graph. The network-first navigation fallback therefore cannot establish offline Solo. This is a source-level finding, not a disconnected-browser test. Coordinate any cache implementation with #43 and the existing scope/cache PRs rather than creating a competing service worker.

Additional **candidate** bounds to capture alongside the table above: game-only CacheStorage total ≤ 64 MiB after a complete online visit and 30 minutes of traversal; no monotonic growth in worker count or queued chunk jobs over that session; zero cached wallet, account, API, multiplayer or token-response payloads. These are provisional targets, not current measurements. If the canonical game requires more than 64 MiB, publish the measured essential-asset inventory and revise the cap before asserting offline support.

Security and migration evidence must include duplicate action-ID replay, forged reward/balance and cosmetic IDs, unauthorized room/world mutations, and an interrupted migration with exact original save backup preserved. Validate candidate readback and repeat the migration/reload twice. Treat missing physical Android, unavailable GPU-memory counters and unexecuted browser paths as **not tested**, not passing.
