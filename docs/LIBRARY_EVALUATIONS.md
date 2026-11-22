# Reuse evaluation — QA release blockers (2026-11-22)

Owner: #44 / #47 / #57. Coordination: #43. This is the **single proposed shortlist** for these lanes; merge into the existing shared shortlist rather than maintaining parallel lists. Current release rung: A (not visually accepted).

## Evidence and decision rules

Current `main/sw.js` (blob `39c516b24c48c44704acb371a009ca72a0d7c077`) precaches only offline.html and three app icons; navigations are network-first with offline notice fallback. It does **not** demonstrate an offline playable game. Do not describe offline Solo as complete merely because the PWA installs. Proposed runtime-cache changes in historical PRs #228/#230 and the public audit in #233 require **fresh** PR-head verification; numbers and statuses are historical leads.

Do not add a dependency for a feature already possible with platform APIs. Candidate licenses below are *upstream-reported/expected*, **not independently verified against an exact pinned revision in this checkpoint**. No candidate is approved for import without inspecting its exact LICENSE, transitive dependencies, version, delivered bytes and Android behavior.

| Candidate | Upstream | License to verify at pin | Release capability | Estimate (not measured) | Decision |
|---|---|---|---|---|---|
| Chromium DevTools Performance / Memory / Network | https://developer.chrome.com/docs/devtools/performance | Browser tooling; no redistributed code | p50/p95 frame-time, long tasks, network duplicates, heap trends | 0.5–1 day to record repeatable trace | **Adopt as external diagnostic**, zero shipped bytes |
| Playwright browser automation | https://github.com/microsoft/playwright | Apache-2.0 expected; verify exact version | phone-sized Chromium, WebGL and forced-compatibility screenshots, storage replay | 1–2 days if already present; check lockfile | **Conditional reuse existing test runner**; no new browser library without inventory |
| Chrome DevTools Protocol tracing | https://chromedevtools.github.io/devtools-protocol/ | Protocol, not an asset dependency | startup/network/long-task trace with exact build SHA | 0.5–1 day if browser harness exists | **Defer** until Playwright/CDP availability verified |
| protobuf.js | https://github.com/protobufjs/protobuf.js | BSD-3-Clause expected; verify exact revision | compact multiplayer snapshots | 2–4 days plus schema migration | **Defer**: no measured packet bottleneck, adds serialization compatibility risk |
| geckos.io | https://github.com/geckosio/geckos.io | BSD-3-Clause expected; verify exact revision | realtime transport | multi-day server and deployment integration | **Defer**: GitHub Pages cannot supply authoritative server |
| BAREIRON | exact upstream/revision not established | **Unknown** | bounded-buffer architectural reference | unknown | **Research only; no code reuse** |

## Acceptance fixture for #47 / #57

1. Record exact main/PR SHA, device model, Android version, browser version, power mode, renderer and seed. Distinguish **physical Android**, emulated phone-sized Chromium and desktop.
2. Follow **homepage Play**, wallet-free Solo, fortress/mountain skyline, wooded road, lit lodge/interior, pickup/place and reload. Record screenshot and world/object IDs at each checkpoint. A blank screen, missing controls, or different fallback world is a release failure.
3. Cold and warm startup: 10 trials each; record p50/p95 first interactive frame, bytes transferred, duplicate URLs, longest main-thread task and service-worker cache write duration. Record 5-minute quiet and busy scenes, travel and 30-minute cache/heap trend. Compare same seed/path on WebGL and compatibility renderer.
4. Offline test: first visit online, close all tabs, disconnect network, reopen homepage and enter wallet-free Solo; verify persisted pickup/build and old-save replay. Repeat with two tabs and ten seeds. Never evict required offline boot assets solely to satisfy an entry-count limit.
5. Cache: measure actual streamed response bytes (not only Content-Length), aggregate cache bytes, oversize rejection, cancellation, concurrent writers, cache eviction and network response latency with delayed cache writes. Proposed limits: 2 MiB per response, 64 MiB total cache; **targets, not measured results**.
6. Migration: copy old save; validate and activate new schema only after successful conversion; run migration twice; corrupt/unknown IDs must retain recoverable original. Assert no duplicate pickup, claims, resources or world edits.
7. Multiplayer: reject untrusted item/outfit/actor IDs, negative quantities, impossible movement, duplicate action IDs, unauthorized edits, client-reported damage and vehicle-seat claims at the **server boundary**; offline Solo must not require server or wallet.

## Provisional numerical budgets (not baseline measurements)

Warm startup p95 <=5 s; cold p95 <=10 s; quiet frame p95 <=33.3 ms; busy frame p95 <=50 ms; interaction p95 <=150 ms; initial playable transfer <=8 MiB; offline cache <=64 MiB; pending chunk work <=32. Record actual values before declaring pass/fail and revisit budgets with #43 after representative physical-device data.

## Release dependency

Prioritize runtime cache tests and actual homepage Play acceptance over further research or a renderer migration. Before merging any cache PR, run `npm test`, `npm run check`, and phone-sized Chromium on its exact head; inspect Pages deployment and public interactions separately. This note adds **no runtime implementation, measurements, deployment or visual verification**.
