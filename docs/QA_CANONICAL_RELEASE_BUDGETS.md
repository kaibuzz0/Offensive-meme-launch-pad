# #47 / #57 canonical game release budgets and evidence contract

Status: **provisional acceptance thresholds, not measured performance claims**. Owner: Engine QA. Baseline values must be recorded for the exact `main` SHA and compared with the exact PR SHA. This checklist does not certify a release.

## Test entry and devices

Start from the **public homepage Play control**, not a deep-linked test-only URL. Record the URL reached, page version/commit (if exposed), user agent, viewport, devicePixelRatio, renderer and WebGL capability. Run on a phone-sized Chromium viewport (390×844 CSS px, DPR 2 or a recorded emulation setting), desktop Chromium, and a physical Android Chrome device when accessible. **Emulation is not physical Android evidence.** Test offline Solo with no wallet, no network after initial install/cache warmup, and no account. Do not erase existing saves to make a test pass.

Repeat the same seeded route: first nonblank frame → recognizable fortress/mountain skyline → wooded road → lit district/interior → collect resource → place/build or perform another persistent world edit → reload → verify state. Run WebGL and compatibility renderer against the **same seed, edits and player state**, comparing landmark positions, collision, reachable interactions, inventory and save data. A renderer fallback that loads a different flat world fails.

## Provisional release budgets (to validate or revise using physical devices)

| Metric | Proposed acceptance gate | Measurement |
| --- | --- | --- |
| Blank screen / uncaught startup errors | **0** across 10 cold starts per tested configuration | Video/screenshots, console and page errors |
| First interactive world frame, warmed cache | p95 **≤ 8 s** on target Android-class device | Navigation/Play click → rendered and responsive scene |
| Startup network transfer | **≤ 12 MiB** before first interactive world frame | PerformanceResourceTiming + browser network trace; exclude later lazy loads |
| Frame time in quiet starter route | p95 **≤ 33.3 ms** after 30 s warmup | 2-minute requestAnimationFrame trace |
| Frame time in busy representative scene | p95 **≤ 50 ms** | 2-minute trace, same seed and actor fixture |
| Input-to-visible response | p95 **≤ 150 ms** for movement/interact | Input timestamp to next observable change |
| Main-thread long tasks | **0 tasks ≥ 250 ms** during the tested route | PerformanceObserver longtask where supported |
| Active chunk/worker queue | Bounded, drains after stationary 30 s | Instrument queue length and worker count |
| Long-session process memory | No sustained **> 20%** growth between comparable stationary windows after 30 minutes | Android memory tooling / browser process metrics; label unavailable GPU metrics |
| Save/migration data loss | **0**; repeated migration produces identical valid state | Backup original, migrate twice, compare normalized state and unknown-ID archive |
| Multiplayer trust boundary | **0 accepted** unauthorized inventory, world-edit, damage or cosmetic-ID mutations | Invalid-ID, replay, duplicate-claim and permission tests |

These are initial engineering gates, **not existing results**. Do not label them passed without measured evidence. GPU memory and draw calls must be reported as unavailable when not instrumented, never inferred from JavaScript heap. Report p50/p95/p99 where sample size permits, count, device, exact SHA and cold/warm cache separately.

## Minimum exact-head regression matrix

1. `npm test` and `npm run check` at the exact PR SHA; preserve full failure logs.
2. Homepage Play click, first frame and original Solo start on phone-sized Chromium.
3. WebGL and forced compatibility path: same seed/geometry, fortress gate, road, lit interior, pickup, collision and persistence.
4. Reload and migration: old save retained as recoverable backup; valid migrated save; repeat migration idempotent; corrupt/unknown data quarantined without destructive overwrite.
5. Offline Solo without wallet and after reload; no multiplayer endpoint required for core gameplay.
6. 30-minute traversal/stationary session with network bytes, active chunks, worker queues, RAM and frame-time samples; detect duplicate downloads and resource growth.
7. Multiplayer server rejects forged IDs, impossible resource counts, repeated claims, unauthorized edits, replayed requests and client-authored damage.
8. For media-range PR #177, compare server-only RSS and latency across **identical server fixtures and load generators** on `main` and PR head, 5+ runs each, same Node version, concurrency and host. The benchmark client must be outside the measured server process. Sampled RSS can miss short spikes; disclose this.

## Evidence table to fill for every candidate

| Field | Baseline main | Candidate PR |
| --- | --- | --- |
| Commit SHA / deployment URL | Not measured | Not measured |
| Browser / physical device | Not measured | Not measured |
| First world frame p95 / startup transfer | Not measured | Not measured |
| Quiet and busy p95 frame times | Not measured | Not measured |
| Long tasks / stalls | Not measured | Not measured |
| Process RSS / GPU memory | Not measured | Not measured |
| Draw calls / active meshes / worker queue | Not measured | Not measured |
| WebGL/compatibility visual parity | Not verified | Not verified |
| Save/reload and old-save migration | Not verified | Not verified |
| Public homepage Play → persistent interaction | Not verified | Not verified |

## Coordination

This is a **QA-only gate definition**, not a new engine or gameplay mode. #43 controls merge/deployment and shared architecture. #44 must evaluate any proposed profiler or serialization dependency against this measurement gap before adoption. #47 owns performance evidence; #57 owns save/security and exact-head acceptance. PRs #172, #173, #176, #177 and #180 are historical review leads; fetch their current state before integration. The canonical game remains the only target; no forced merge or destructive save rewrite is authorized.
