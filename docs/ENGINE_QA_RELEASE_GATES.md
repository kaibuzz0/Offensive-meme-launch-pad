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
