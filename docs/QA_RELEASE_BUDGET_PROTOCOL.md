# Meme City — QA performance release protocol

Owner: #47 Android runtime, #57 security/parity; library decisions tracked in #44. This is a **proposed release budget**, not a measurement or a claim that the current game meets it. Supersedes assumptions that a lower-end renderer may use different gameplay.

## Reproducible matrix

Record commit SHA, browser build, OS/device model, GPU, memory class, viewport and DPR, power/thermal state, seed, renderer, cache state, offline/online state, network throttling and sample duration for every run. **Physical Android** must be identified separately from **desktop Chromium mobile emulation**; emulation cannot certify Android GPU/RAM performance.

Run the normal public route **index.html → primary Play → city.html → wallet-free Solo → fortress/mountain → wooded road → district/interior → pickup/build → save → reload**. Use a fixed seed and record screenshots, pixel checks and game-state assertions. Repeat with WebGL and forced Canvas2D recovery, with the **same geometry identifiers, collision, inventory, player state and persistence**. No renderer-specific gameplay shortcuts.

Test cold cache, warm cache, offline PWA revisit, repeated entry/exit (10 cycles), 15-minute travel, 15-minute crowded scene, building and saving, and 30-minute idle/long-session. Include both portrait and 915×412 landscape touch controls. Run at least three repetitions per scenario; report median and worst observed result, not only best.

## Initial release budgets (provisional targets; calibrate after real-device baseline)

| Metric | Provisional target | Measurement |
| --- | --- | --- |
| Homepage Play → first nonblank playable world | p95 ≤ 8 s on representative Android-class device, warm ≤ 4 s | performance marks + first meaningful canvas pixels + controls ready |
| Cold transfer to first interaction | ≤ 8 MiB compressed | CDP Network loadingFinished encodedDataLength; deduplicate URL+request IDs; separately report cached bytes |
| Frame pacing while moving | p50 ≤ 33.3 ms, p95 ≤ 50 ms, p99 ≤ 100 ms | requestAnimationFrame deltas after warmup; label throttling and foreground state |
| Input-to-visible-action latency | p95 ≤ 150 ms | synthetic action timestamps and next observable gameplay/paint state |
| Long main-thread tasks | zero > 250 ms in steady play; count all > 50 ms | PerformanceObserver longtask and CDP tracing |
| JS heap after 30-minute bounded travel | ≤ 20% increase over post-warmup steady baseline after GC where available | CDP Performance.getMetrics / Runtime.getHeapUsage; report absolute MB |
| Terrain worker pending queue | ≤ 2 pending requests | existing runtime queue instrumentation; track peak and drain time |
| Terrain GPU allocation | ≤ 24 MiB for existing terrain allocation metric | existing renderer counter; **not** total GPU memory |
| Save/reload | 100% verified deterministic restoration in acceptance fixtures | same seed, position, edits, inventory and claim IDs |
| Duplicate pickup/claim | zero duplicate ledger credits | repeated/concurrent input tests and server-authoritative assertions |
| Fatal startup failures | zero blank scenes and unhandled exceptions | screenshots, canvas pixel samples, console and exception logs |

These are **gates to evaluate**, not fabricated baseline values. If a target is not measurable on a device, mark **not measured**, never **passed**. GPU memory and draw calls may need renderer instrumentation because browser APIs do not expose reliable total GPU allocation. For memory leaks compare steady-state plateaus after returning to the same location; monotonic heap alone is not proof of a leak.

## Per-PR evidence contract

1. Fetch current main and active PRs; identify the exact tested head SHA.
2. Run `npm test`, `npm run check`, and the actual homepage-entry Chromium acceptance at the exact head. Keep original Solo, WebGL, forced Canvas2D, touch, pickup, gate, migration and reload coverage.
3. Record cold/warm transfer, time-to-first-interaction, p50/p95/p99 frame times, long tasks, heap trend, pending worker peak, visible mesh/draw counts where instrumented, screenshots and exception logs. Report baseline and candidate using the same matrix.
4. Exercise malformed/unknown content IDs, incompatible outfit slots, repeated rewards, tampered multiplayer inventory/world edits, invalid save versions, and interrupted migration. Preserve the original save and unmappable records; migration must be idempotent and validated before promotion.
5. Publish **implemented / PR-only / merged / deployed / visually verified** as separate statuses. Never infer visual progress from green unit tests.

## Integration order

Highest incomplete rung remains A until the homepage route and save/reload work on both renderers with actual performance evidence. Reconcile existing QA PRs before duplicating browser smoke assertions. Prefer the existing CDP/Node harness for profiling (zero new runtime dependency). #43 owns merges and Pages verification. Do not remove old entrypoints or saves before proven migration; do not weaken the existing WebGL 3D chunk assertion merely to make fallback pass.

## Current evidence limitations

This document itself performs no benchmark. Physical Android, GPU memory, long-session leaks, production Play screenshots, post-fallback pickup and live controller reload remain **unverified** until an exact-head run supplies artifacts. The reference visual archive is not evaluated by this protocol.
