# QA release budgets and evidence protocol — 2026-11-18

Owner: #47 Android performance / #57 multiplayer-security QA; coordinate release gates with #43 and reuse decisions with #44.

This document sets **provisional acceptance targets, not measured results**. It does not supersede `docs/CANONICAL_GAME_RELEASE_CONTRACT.md`. Current rung A is not accepted. Never infer physical Android results from desktop Chromium emulation.

## Reproducible route and environments

- Record exact git commit, PR head SHA, deployment SHA, browser/version, device/OS, renderer, screen size, device pixel ratio, thermal/power state, seed, worldgen/save schema version, network throttling and cold/warm cache.
- Run from homepage Play (not direct `city.html`) into wallet-free Solo. Capture visible fortress/mountain skyline, arch, wooded road, lit interior, gather/place, inventory, collision, save/reload and offline return. Use one fixed seed and camera/pose for before/after screenshots.
- Run accelerated WebGL and compatibility renderer with the **same** world/pose and compare geometry IDs, collision, interactable IDs, inventory and persisted edits. Rendering downgrade may change detail, never gameplay.
- Capture mobile Chromium at 360×800 and 412×915 CSS pixels with touch emulation, landscape touch controls, desktop Chromium, and a physical Android device when available. Label each result as **physical**, **emulated**, or **not run**.
- Repeat quiet scene, dense district, continuous travel, building interaction, save/reload, context loss/recovery, offline restart and 30-minute traversal. Record failed requests, JS errors, blank canvas, GPU context losses, cache entry/byte counts and worker queue length.
- Capture baseline on main and compare exact PR head with identical settings; no speedup claim without paired measurements.

## Provisional budgets — revise only with measured device evidence

| Metric | Initial release target | Measurement |
|---|---:|---|
| Cold Play to first meaningful rendered frame | p95 ≤ 10 s on representative Android over simulated 4G | navigation-to-first-game-frame timestamps, 5 runs |
| Warm Play to first meaningful rendered frame | p95 ≤ 4 s | 5 warm-cache runs |
| Initial transferred game bytes | ≤ 8 MiB before first interactive frame | network resource transfer sizes; exclude later streaming |
| Frame time, quiet area | p95 ≤ 33.3 ms (30 FPS) | ≥ 2 minutes, requestAnimationFrame intervals |
| Frame time, busy district | p95 ≤ 50 ms (20 FPS) | ≥ 2 minutes; report p50/p95/p99 |
| Single main-thread blocking task | ≤ 100 ms during active play | Long Tasks observer / trace |
| User action to visible response | p95 ≤ 150 ms | timestamp input to committed interaction feedback |
| Worker mesh queue | ≤ 64 pending jobs | queue high-water mark and age |
| Resident voxel mesh buffers | ≤ existing 24 MiB cap unless profiled and approved | allocated/disposed bytes |
| Offline game resource cache (PR #201 proposed) | ≤ 80 entries, ≤ 12 MiB total, ≤ 4 MiB each | actual CacheStorage keys and body lengths |
| Long-session cache/worker growth | no sustained positive growth after return to same location | snapshots at 0/10/20/30 min; investigate monotonic trend |
| JS heap and GPU memory | **baseline required; no universal numeric threshold yet** | heap where supported; GPU allocation proxy; report unavailable APIs |

Frame intervals are not equivalent to GPU frame time. Long Tasks and heap APIs may be unavailable on Android; mark missing measurements explicitly. CacheStorage limits are implementation budgets, not proof of offline completeness.

## Mandatory regression matrix

1. Online homepage → Play → Solo without wallet; first visible frame must not be blank. Log all required script requests and response status.
2. Offline repeat with unchanged seed and different seed; HTML cache-key normalization must not change save/world identity.
3. Network interruption, concurrent requests, service-worker restart, eviction, compressed response, HTTP 206 and 404; never cache incomplete or wallet/quote/API responses.
4. Original Solo save, prior seeded-world save, invalid/unknown item ID and interrupted migration: copy/validate/activate; repeat migration; verify backup and rollback. Do not delete unmappable data.
5. Accelerated vs compatibility route: same fortress/arch/interior, collision, pickup, equip, placement, saved inventory and edits.
6. Multiplayer invalid IDs, spoofed rewards, duplicate action IDs, excessive edit batches, movement/vehicle speed and world-revision conflicts: server must reject unauthorized mutations. Offline Solo uses shared validation without requiring network.
7. Touch move/look, landscape layout, atlas, context loss and recovery; retain controller state and gameplay identity.
8. At PR head run `npm test`, `npm run check`, browser smoke, then verify Pages workflow and actual served commit. No merge solely from Node test totals.

## Blockers and ownership

- #43: exact homepage route, canonical entry, deployment and save migration integration.
- #47/#57: test harness, device traces, security and parity evidence.
- #46: WebGL/compatibility visual equivalence and GPU resource disposal.
- #48: atomic gather/place ledger and replay tests.
- #44: shortlist only proven bottleneck candidates with pinned revision, license, dependency/bundle costs and measured integration impact.

**Evidence at creation:** documentation only; no tests or Android profiling were executed for this file. The offline cache PR #201 is a candidate requiring exact-head validation; do not treat it as deployed without fresh verification.
