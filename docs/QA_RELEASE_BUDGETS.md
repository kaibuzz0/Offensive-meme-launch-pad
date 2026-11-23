# Canonical Play — QA evidence and provisional release budgets

Owner: #47 Android runtime, #57 multiplayer/security; coordinate with #43. This is a **test specification**, not a passing report or deployed feature. No physical Android, Chromium, or Pages gameplay verification is claimed by this document.

## Reproducible acceptance route

Record exact git SHA, browser version, GPU, RAM, viewport, renderer, seed, cache state, network profile and run timestamp for every result. Start at the **public homepage Play control**, never at a private deep link. At 390×844 CSS pixels (and a landscape 844×390 pass), select wallet-free Solo. Confirm the recognizable fortress and mountain skyline, traverse the wooded road, enter the lit district/interior, pick up a resource, place or craft an item, save, reload, and verify the same world seed, inventory, object IDs, position and edit. Repeat offline after a completed online warm-up. A fallback renderer must show the **same objects and interactions**, not a flat substitute world.

Run `npm test` and `npm run check` at the **PR head**, then browser acceptance at that same SHA. Capture screenshots, console errors, resource waterfall, frame-time distribution and IndexedDB/localStorage snapshots with secrets redacted. Re-run with an older save, a corrupt save, two tabs, ten seed URLs, WebGL context loss and unavailable WebGL. Never overwrite a legacy save until copy → migrate → validate → activate succeeds; unknown IDs remain recoverable in backup.

## Initial proposed budgets (not measurements)

These are **provisional targets** for midrange physical Android, subject to a measured baseline and adjustment with #43. A failure is a release review item, not a reason to silently change gameplay.

| Metric | Initial target | Measurement |
| --- | --- | --- |
| Play click → first meaningful world frame, warm | p95 ≤ 5 s | Performance marks + video |
| Play click → first meaningful world frame, cold | p95 ≤ 10 s | Empty cache, 4G profile |
| Frame time, quiet area | p95 ≤ 33.3 ms; p99 ≤ 50 ms | requestAnimationFrame, 120 s |
| Frame time, busy district | p95 ≤ 50 ms | 120 s, fixed seed/path |
| Input → visible action | p95 ≤ 150 ms | timestamp input and applied tick |
| Main-thread long tasks | No task > 200 ms during travel | PerformanceObserver + trace |
| First playable transfer | ≤ 8 MiB compressed | DevTools transfer sizes |
| Offline runtime cache | ≤ 64 MiB measured bytes; ≤ 96 entries | CacheStorage response body byte counts |
| Worker queue | ≤ 32 pending chunks; bounded during 10 min travel | Instrumented queue high-water mark |
| 30-minute session | No sustained > 20% growth after warm-up/GC | JS heap + browser process memory |
| Save migration | 100% fixture recovery; no source deletion | Repeated migration and forced-failure tests |

GPU allocation and draw calls require an initial **measured** device-specific baseline; do not invent fixed numbers before profiling. Track active meshes, vertices, triangles, texture allocations, context losses, and GPU memory where the browser exposes it. Memory APIs may be unavailable on Android: mark missing values N/A, not zero. Emulated mobile Chromium is **not physical Android evidence**.

## Service-worker regression gate (#228/#230)

1. Missing, malformed, understated and overstated Content-Length, streamed body 2 MiB−1, 2 MiB and 2 MiB+1, failed reader and aborted requests.
2. Delay `cache.put` and eviction artificially. The original online network response must reach the page before the cache write finishes; `event.waitUntil` must retain the background task.
3. Visit ten distinct seed URLs and two tabs; verify canonical navigation cache keys, exact byte usage, entry count, no duplicate game script downloads and no seed confusion in gameplay.
4. Warm cache, close all tabs, disconnect network, relaunch homepage Play → Solo and perform a saved pickup/reload. Verify required resources are cached, while wallet/API/token responses are excluded.
5. Repeated activation, update and rollback must not delete saved gameplay state. Test offline failure reporting rather than presenting an empty scene as success.

## Multiplayer boundary checks

Server must reject unknown/retired item IDs, incompatible outfit sockets, unauthorized cosmetics, negative/NaN/out-of-range coordinates, replayed pickup/claim IDs, duplicate crafting spends, invalid world edits and client-authored damage/rewards. Validate identity, ownership, distance, inventory, world version and transaction idempotency on the authoritative server. Offline Solo shares gameplay rules but never requires network or wallet.

## Current evidence limitation

At creation, main `sw.js` contains only shell caching for the offline notice and icons. Offline Solo is therefore **not demonstrated** by the service worker on main. PR-only cache changes require independent exact-head browser tests and integration review. Do not mark release rung A accepted from Node test totals alone.
