# QA #47/#57 — Runtime baseline and release measurement contract

Status: **measurement protocol, not measured results**. Owner: Engine QA. Integration coordination: #43. This file is a scoped acceptance artifact; it does not change the game or supersede `docs/DEVELOPMENT_COUNCIL.md`.

## Canonical acceptance

Start at the public homepage, use its visible **Play** action, choose wallet-free offline Solo, and record the actual URL. Follow the same seeded first-person world through fortress/mountain skyline, wooded road, lit interior and an actual pickup/build action. Reload and verify the same seed, player location, inventory and world edit. Repeat with accelerated WebGL and automatic compatibility rendering; record identical world/object IDs, collision and interaction results. A nonblank canvas by itself is not a pass. Capture console errors, network failures, screenshots, and the exact commit and deployed Pages revision. Test original Solo separately until migrations are verified.

## Provisional release budgets (targets, not observed performance)

| Metric | Provisional target | Evidence |
| --- | --- | --- |
| Cold homepage Play to first nonblank interactive world | <= 10 seconds on reference midrange Android over throttled 4G; <= 5 seconds desktop broadband | navigation + first gameplay frame marks |
| Initial transferred resources (cold, compressed) | <= 5 MiB | HAR or Resource Timing; disclose unavailable transfer sizes |
| Gameplay frame intervals, quiet / busy | p50 <= 33.3 ms; p95 <= 50 ms; p99 <= 100 ms | >= 3 minutes each; dropped-frame count |
| Long tasks / input stalls | no interaction block > 250 ms; report all tasks >= 50 ms | Long Tasks API where supported; input timestamp deltas otherwise |
| JS heap after 30-minute travel | <= 1.25x warmed-up steady-state after returning to same region | browser heap API if available; do not substitute for GPU memory |
| GPU/mesh allocation | <= 24 MiB active mesh budget per council; GPU memory unknown unless instrumented | live mesh/buffer accounting |
| Worker/queue lifecycle | bounded workers and queue; no monotonic growth after return to origin | worker count, pending/active queue, cache size at 0/10/30 min |
| Save and reload | 100% repeatable recovery across 3 reloads, with original save untouched | save snapshots and checksums |
| Renderer parity | same seed, object IDs, interactions, collisions, progression | WebGL and compatibility screenshots + state assertions |

**These are proposed acceptance thresholds requiring #43 review and device calibration**, not claims that the game meets them. Record phone model, Android/Chrome version, RAM, DPR, battery/thermal condition, viewport, network throttling, renderer and whether a physical device or desktop emulation was used. Physical-device evidence must be labeled separately.

## Required reproducible runs

1. **Cold start:** clear only HTTP cache/service-worker cache in a disposable test profile; never clear user saves. Capture navigation before Play, first paint, Play click, first nonblank scene, first responsive movement, duplicate URL requests and transfer totals.
2. **Traversal:** deterministic seed, same camera waypoints, fortress arch, wooded road, lit district and interior. Capture screenshot and world-object IDs at each waypoint. Do not relax traversal timeouts to hide failures.
3. **Interaction:** collect resource, craft/place one object, reload, verify ledger quantity and placed geometry. Repeat action quickly to detect double claims. Test disconnected Solo with no wallet.
4. **Migration:** snapshot original legacy keys; run copy/validate/readback/activate; repeat migration, simulate interruption and malformed/unknown content IDs; confirm original remains recoverable.
5. **Security:** submit unknown item/outfit IDs, negative or huge quantities, duplicate reward requests, invalid world edits and forged multiplayer damage; verify authoritative server rejects them and Solo remains playable.
6. **Long session:** 30-minute outward-and-return traversal, repeated scene changes, tab hide/show and reload; record JS heap, mesh buffers, worker count, queue and cache size at fixed intervals.
7. **Compatibility:** force fallback using the existing supported test hook, if available; never invent a URL flag. Assert same scene and interactive collision, not an unrelated flat-map substitute.

## Evidence ledger template

| Commit / deploy | Environment | Cold start | Transfer | Frame p50/p95/p99 | Long stalls | Heap/GPU/mesh | Save/reload | Visual route | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pending | physical Android: not tested | — | — | — | — | — | — | — | unverified |
| pending | mobile-sized Chromium: not tested in this change | — | — | — | — | — | — | — | unverified |

## Reuse decision (#44)

**Defer new profiling dependencies.** First validate the existing runtime probe in draft PR #125 against exact-head Chromium and a real Android browser. It is not on main as of this note. No new dependency is licensed, bundled or adopted by this change. Revisit only if the existing probe cannot measure a release-blocking metric. Coordinate the single research shortlist with issue #44.

## Release blockers

No physical Android baseline; no verified public end-to-end route; no verified cross-renderer save/interaction parity; no demonstrated repeat-safe migration. Passing Node tests or PR-only diagnostics do not close these blockers. The integration owner controls merges and Pages verification.
