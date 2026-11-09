# Canonical Play release QA — provisional budgets and evidence protocol

Owner: #47 / #57. Coordinate with #43. These are **proposed acceptance targets, not observed measurements**. Recalibrate after physical Android baseline. Do not use this document to declare a release passed.

## Reproducible route

1. Cold browser profile; open the actual deployed homepage and click its visible Play action. Record final URL, build SHA (if exposed), redirect chain, request waterfall, errors and screenshot. Repeat on warm cache, installed PWA and offline Solo without a wallet.
2. At 390×844 CSS pixels (mobile Chromium emulation; **not physical Android**), enter the same seed in accelerated WebGL and forced compatibility renderer. Capture first nonblank frame and compare fortress, mountain skyline, wooded road, lit district/interior, collision and available interactions. A fallback displaying unrelated flat geometry fails.
3. Travel road → interior, pick up a resource, build/place one object, reload and verify resource debit, object position, inventory, seed and landmark IDs. Repeat the same action twice quickly: no duplicate grant/debit.
4. Run 10-minute travel and 30-minute idle/active sessions, record worker queue length, loaded chunks, mesh/texture counts, cache bytes, JS heap where supported, frame-time p50/p95/p99, long tasks, context-loss recovery and network request count. Compare cold/warm/reload; no unbounded growth.
5. Import representative old saves into a disposable profile. Preserve raw backup, validate converted record before activation, run migration twice (identical result), retain unknown IDs separately, simulate corrupted input and interrupted write, verify old save remains recoverable.
6. Multiplayer: replay duplicate claim IDs, invalid item/skin IDs, excessive coordinates, out-of-order edit revisions, unauthorized inventory/damage changes and concurrent save recovery. Server must reject mutations or apply idempotently; offline Solo still works without network.

## Provisional release budgets (targets only)

| Metric | Proposed target | Evidence |
| --- | --- | --- |
| Blank viewport after Play | **0** in 10 cold starts per renderer | screenshot + pixel inspection + console |
| Time to visible interactive scene | p95 ≤ 8 s on baseline Android-class test device; p95 ≤ 5 s desktop | performance marks + video |
| Cold transfer through first playable frame | ≤ 6 MiB compressed | HAR; exclude unrelated browser traffic |
| Mobile frame time during road travel | p95 ≤ 33.3 ms, p99 ≤ 50 ms | ≥ 3 minutes, per renderer |
| Interaction input-to-visible-feedback | p95 ≤ 150 ms | timestamped actions |
| Main-thread long tasks | no task > 250 ms during interaction | PerformanceObserver/trace |
| Loaded chunk/worker jobs | bounded, no monotonically increasing queue after stationary settle | 30-minute sample |
| JS heap/cache after repeated route | ≤ 20% sustained growth from warmed baseline after 5 loops, subject to GC and platform visibility | trace, memory/caches |
| Save migration | 100% fixture preservation or explicit quarantined unknown fields; no destructive failure | deterministic fixtures |
| Cross-renderer gameplay | identical stable IDs, collision, inventory, edits and reload outcomes | paired seed action logs |

**Caveats:** Heap APIs, GPU memory and true device RAM may be unavailable in Chromium or Android; record 'not measured' rather than estimate. Emulator viewport is not device profiling. Frame budgets are hypotheses pending actual Android evidence; avoid claiming speedups without before/after runs on the same build/device.

## Exact-head release checklist

- Record base/head SHA, npm test and npm run check outputs; browser smoke must run against the same SHA.
- Verify original Solo, forced fallback, accelerated path, gate and pickup persistence; retain the #86 reset-position regression as an open gate until a fresh controller-coordinate test passes.
- Capture screenshots from homepage Play (not direct deep-link only), including actual visual content and readable controls in landscape touch layout.
- Do not merge PR-only assets or game modules based on Node test totals. #43 reviews compatible work and validates deployed Pages SHA.
- Keep the existing #44 shortlist deduplicated; browser PerformanceObserver/DevTools and Playwright/Chromium already available in the ecosystem should be assessed before adding dependencies. Any third-party import requires pinned version, license, transitive and bundle-size review.

## Evidence record template

Date/time UTC; commit SHA; deployed URL and Pages SHA; browser/device model, OS and physical vs emulated; viewport/DPR; GPU/backend; seed; cache state; connection; startup p50/p95; transfer bytes; frame p50/p95/p99; peak heap and unavailable metrics; draw calls/active chunks; stalls; save fixture IDs; screenshot/trace/HAR links; pass/fail with precise reproduction.

**Status at authoring:** protocol only; no physical Android measurements or screenshot assertions executed in this document. No changes to gameplay, renderer or saves.
