# Canonical game — QA performance and parity gate (proposed)

Owner: #47 Android performance, #57 multiplayer/security QA. Integration and release: #43. This is a **measurement protocol and provisional release budget**, not evidence that the game meets these numbers.

## Current source-confirmed blocker (2026-11-23)

On main, `sw.js` precaches only `offline.html` and three icons. Its navigation handler fetches from the network and falls back to `offline.html` on failure. Thus an offline homepage → wallet-free Solo bootstrap is **not implemented by this service worker**. Do not claim offline Solo acceptance on the basis of a registered PWA alone. Review overlapping offline-cache PRs with #43; avoid caching wallet, quote, token, API or POST traffic. Verify actual offline assets and cache bounds before merging.

## Reproducible acceptance route

Use an explicit seed and record browser build, SHA, URL, viewport, device, OS, GPU, network/cache state and renderer. Follow **homepage Play → fortress and mountain skyline → wooded road → lit district/interior → pickup → workbench/build/place → save → reload**. Record screenshots/video, errors and object IDs. Run twice on the same seed and once on a second seed. Compare accelerated WebGL and compatibility rendering for the **same** geometry, collisions, interactables and persistent player state. Test without a wallet, then with the network disconnected after the game has been provisioned. Keep old URLs and saves until validated migration passes.

## Provisional targets — revise only from measured baselines

| Metric | Initial target | Measurement |
|---|---:|---|
| Homepage Play → first nonblank interactive frame, warm Android | ≤ 5 s | performance marks + video, p50/p95 over ≥ 10 runs |
| Cold start on throttled Android-class browser | ≤ 12 s | p50/p95 over ≥ 10 runs, cache cleared |
| Initial gameplay transfer (compressed, excluding optional catalog) | ≤ 5 MiB | browser resource timing / HAR; list requests and duplicate bytes |
| Frame time during route | p95 ≤ 50 ms; p99 ≤ 100 ms | ≥ 5 min sampled frames, record p50/p95/p99 |
| Interaction long tasks | no > 200 ms input-to-next-frame stalls | performance trace during pickup/place/save |
| Active mesh/worker queues | bounded; no monotonically growing backlog after idle | queue depth and completed/aborted jobs every 10 s |
| Memory and cache growth | no sustained positive trend after repeated 10-minute traversal cycles | browser process memory where supported, Cache Storage bytes/count, GPU/resource counts |
| Save/reload | no loss of committed pickup, placement or position | exact seed/object IDs before/after reload |

These are **candidate gates**, not benchmark results or promises of universal Android performance. GPU memory cannot be reliably read from generic browser APIs; use platform tooling or report 'unavailable'. Do not substitute desktop mobile emulation for physical Android evidence. Report device model and thermal state where physical hardware is available.

## Security and migration checks

- Before activation: copy the old save to a recoverable backup, validate schema/version/size/IDs and world seed; activate atomically only after successful conversion. Run migration twice and assert identical results. Retain unknown legacy fields in quarantine rather than deleting them.
- Reject malformed or retired equipment IDs, impossible attachment combinations, non-finite coordinates, oversized payloads and cross-world replay. Ensure invalid batches cause **no partial ledger/world edits**.
- Repeated pickup, craft, spend, place and reward requests must be idempotent or explicitly rejected; assert no duplication across reload and reconnect.
- In multiplayer, the server validates inventory, movement, damage, cooldowns, resource costs and item unlocks. Client render paths never grant gameplay authority.
- Compare one fixed-seed fixture in both renderers and assert matching interaction IDs and persisted results, not merely screenshots.

## Required evidence in each release PR

Exact head SHA; `npm test` and `npm run check` results; mobile-sized Chromium acceptance; physical Android result or explicit unavailable; cold/warm resource counts, downloaded bytes, frame-time percentiles, memory/cache trend, and regression delta; browser screenshots or trace; legacy save recovery and multiplayer negative tests where affected. Distinguish **source-only**, **PR-only**, **merged**, **deployed**, and **visually verified**. Do not approve release solely on Node test totals.

## Library evaluation decision for this gate

**Defer new dependencies.** Built-in PerformanceObserver, performance marks, Resource Timing and Chromium tracing are sufficient to establish the first baseline without adding runtime bytes or license risk. Before adopting a third-party profiler, record its pinned revision, LICENSE, transitive dependency graph, delivered bytes and Android/WebGL compatibility in #44's single shortlist. This is a bounded choice for measurement, not a blanket rejection of future tooling.
