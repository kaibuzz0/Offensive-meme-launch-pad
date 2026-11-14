# Engine QA release baseline and gates (workstreams #47, #44, #57)

Status: **proposed numerical budgets, not measured results**. This document supplements `docs/DEVELOPMENT_COUNCIL.md`; the integration owner (#43) decides release acceptance. No gameplay code or saved data is changed by this document.

## Required acceptance path

Run from the *actual homepage Play link*, without a `terrain=1` test-only override: Play → wallet-free Solo → recognizable fortress/mountains → wooded road → lit district/interior → pickup/build interaction → autosave/pagehide → reload. Repeat at a phone-sized viewport (e.g. 393×852 CSS px) and landscape (852×393). Repeat on WebGL and forced compatibility rendering with the **same seed, world IDs, collision, interaction and saved state**. Assert visible nonblank pixels, controller movement, pickup idempotency and actual persistence. Preserve the old Solo entry until migration tests pass. Chromium mobile emulation is **not** physical Android evidence.

## Initial release budgets (targets requiring physical-device calibration)

| Metric | Provisional target | Measurement |
| --- | --- | --- |
| Homepage Play to interactive scene, warm cache | p95 <= 8 s | 5 runs per device/renderer; performance marks |
| Homepage Play to interactive scene, cold cache | p95 <= 15 s | 5 fresh profiles; bytes actually transferred |
| Gameplay frame time, quiet route | p95 <= 33.3 ms, p99 <= 50 ms | 2-minute trace after loading |
| Gameplay frame time, busy district | p95 <= 50 ms | 2-minute trace; disclose device class |
| Interaction response | p95 <= 150 ms | input timestamp to visible response |
| Main-thread long tasks | zero > 250 ms during interaction | PerformanceObserver / trace |
| Active mesh worker count | <= 2 on mobile | count creations, terminations, pending jobs |
| Worker pending jobs | bounded <= 32; no monotonic growth | repeated travel/reload diagnostic |
| Warm reload transferred bytes | report separately, investigate > 1 MB | resource timing plus network protocol |
| Cache size and memory | no sustained upward trend after 3 identical route cycles | browser process memory and cache inspection |

These are **starting thresholds**, not claims of achieved performance. GPU memory and draw-call budgets must be recorded as measured baselines per renderer before a numeric cap is enforced. Do not interpret `performance.memory` as total Android RAM or treat browser resource timing `transferSize=0` as proof of service-worker origin.

## Position replay regression (#86)

1. Set known seed; enter through homepage Play and select Solo without a wallet.
2. Click Start at Fortress Road, await a fresh simulation tick and sample authoritative controller coordinates **after** reset (not the status HUD).
3. Drive a deterministic desktop/touch input sequence; verify position changed beyond tolerance.
4. Wait for autosave; record saved seed, schema version, position, and timestamp. Trigger pagehide and confirm the same state is preserved.
5. Reload without clearing storage; assert seed and position restored within collision/quantization tolerance; repeat the same reload to prove idempotency.
6. Repeat on WebGL and compatibility rendering, with three seeds. Preserve backup when old data cannot map; never overwrite unknown records.

On failure attach page errors, screenshots, fresh controller coordinates, saved-record metadata (no secrets), renderer, worker counts and network phase summary. Do not weaken existing pixel/scene/pickup/gate assertions.

## Multiplayer/security release checks

Authoritative server must validate movement envelopes, collision, item IDs and quantities, equipment slot compatibility, cooldowns, claims, crafting ledger transactions, damage and edits. Repeated client requests with identical idempotency keys must not duplicate rewards. Reject unknown/malicious content IDs and oversized payloads without crashing or mutating authoritative state. Solo must use shared gameplay rules offline without needing network, wallet, or multiplayer credentials. Never persist keys or tokens in saves.

## Research disposition (#44)

Prefer the repository's existing Chromium and Node test harness and browser-native PerformanceObserver/DevTools tracing **before adding a profiler dependency**. This is a *defer-new-dependency* decision, not an upstream license evaluation. Revisit external packages only when a measured bottleneck remains and pin exact version, license, transitive size, browser support and attribution. Keep the deduplicated candidate list in #44 rather than cloning it here.

## Evidence checklist for every relevant PR

Record commit SHA; CI run and exact-head result; physical Android model/OS/browser versus Chromium emulation; initial/warm transfer bytes; startup p50/p95; frame p95/p99; interaction stalls; worker count/queue; save/reload result; same-seed renderer parity; public Pages deployment and human-visible verification. Mark unmeasured fields **not measured**, not zero. A green unit suite does not replace browser evidence.

## Source-audited browser coverage gap — November 12, 2026

Current `scripts/city-terrain-browser-smoke.mjs` on main follows homepage Play into `city.html?terrain=1`, requires `terrain-only-mode`, and checks an initial chunk with zero sites, structures and roads. It cannot certify the requested canonical wallet-free Solo, inhabited starter district or lit interior. The WebGL path exercises actual pickup and gate interactions, whereas forced Canvas2D recovery currently checks only boot, nonblank pixels and startup exceptions. **Do not count that as gameplay parity.**

The reload assertion checks seed and supply/gate flags but not restored controller coordinates. Issue #86 needs fresh post-reset controller coordinates, deterministic movement, saved position, two ordinary reloads and a comparison across both renderer paths with the same seed and save fixture. Preserve unknown legacy records and backup before migration. The current `Page.reload({ignoreCache:true})` is cache-bypassing, so its transferred bytes are not warm-reload evidence; add `ignoreCache:false` as a separate phase. Capture completed/canceled/pending worker requests at teardown.

These are **verified test-coverage limitations from source inspection**, not proof of a public gameplay defect. Physical Android, process/GPU memory and public visual acceptance remain unmeasured. Keep legacy smoke intact until #43 validates canonical entry and save migration.

## CI evidence and next bounded QA gate — November 13, 2026

The exact-head GitHub Actions run [#43463187501](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/43463187501) for commit `12637ea` passed 479 Node tests and mobile-sized Chromium acceptance, including fortress road/gate and seed/movement restoration. This supersedes the earlier gate timeout in [run #43425611055](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/43425611055). **Neither run is physical Android evidence.** The earlier failing run reported approximately 12 FPS, 89/89 loaded chunks, ~260k scene vertices and 76% render scale at 412×915; these are failure diagnostics, not a representative p95 baseline. The deterministic eight-player server tick p95 of 5.29 ms was on GitHub-hosted hardware, not a mobile benchmark.

**Next scoped acceptance implementation (owner #47/#57; coordinate with #43):** Add a read-only simulation-tick position snapshot to the canonical controller, exposing seed, tick ID, numeric world X/Y/Z, collision/grounded flags and renderer identity to the existing Chromium test. This must not become a second gameplay state store or a writable production cheat API. Assert fresh tick after Fortress Road reset; record displacement under actual input; wait for saved position; reload twice with cache intact and compare restored live controller coordinates, not merely the saved JSON or status HUD. Repeat identical seed/input path in WebGL and Canvas2D and assert identical gate/pickup/collision state. The fallback's current touch-stick CSS transform and yaw checks are **input smoke only**, not movement or interaction parity. Keep existing nonblank-pixel and fortress-gate assertions mandatory.

**Performance instrumentation protocol:** For each renderer, record cold fresh-profile and warm normal-reload network bytes separately, startup p50/p95, frame-time p95/p99 over a two-minute quiet and busy route, longest main-thread task, active/pending/completed/canceled mesh jobs, process memory where available and three repeated travel/reload cycles. Log whether browser cache, service worker, and CDP cache bypass were enabled. Do not infer transferred bytes from resource-timing zero values alone. Label synthetic Chromium, desktop and physical Android results separately. Until measured, all release budgets above remain provisional and the public deployment remains unverified.
