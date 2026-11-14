# Fortress gate traversal — graphics/physics/QA diagnostic contract (2026-11-14)

Status: **proposed diagnostic procedure, not a verified fix or release**. Previous Chromium evidence from PR #161 indicated approximately 12 FPS, 89 loaded chunks and 260k vertices with a fortress gate traversal timeout. These numbers are historical, not a fresh benchmark. The next change must preserve the actual movement assertion rather than increasing the timeout blindly.

## Single reproducible scene

Use the existing homepage Play route into the canonical first-person seed and fortress-road spawn. Run the same seed, viewport, camera orientation, input sequence and travel distance with WebGL enabled and forced compatibility rendering. Capture actual controller position at every fixed simulation tick, attempted displacement, collision resolution, gate collider identity, camera position, current render backend, elapsed frame time, simulation-step count, active chunk count, generated/visible vertices, pending meshing tasks and browser errors. Record exact commit, browser and whether the device is emulated or physical. Never infer controller position from a stale HUD sample.

## Failure classification and bounded response

1. **Collision obstruction:** simulation ticks advance, requested forward movement is nonzero but resolved displacement is zero or repeatedly clipped at the gate. Physics (#49) verifies arch clearance, collider IDs, character dimensions and identical world queries in both backends. Do not bypass collision or teleport the player in acceptance.
2. **Frame starvation:** movement progresses in fixed simulation time but browser input/frames stall. Graphics (#46) profiles chunk scheduling, uploads, mesh creation, draw count and memory. Apply one measured change at a time: near-first chunk priority, bounded mesh jobs, hidden-face culling, release distant buffers or automatic detail reduction. Preserve geometry and collision IDs. QA (#47) captures p50/p95/p99 frame times and long tasks before/after.
3. **Controller/input fault:** simulation advances but intended mobile joystick input never reaches the shared controller. Physics and QA compare raw touch/pointer events, input vectors, orientation and focus with desktop controls.
4. **Startup/fallback fault:** viewport never advances beyond loading, throws, or renders mismatched objects. Graphics compares the same world snapshot and IDs through WebGL and Canvas. Fallback must not switch to a flat-world simulation.

## Minimum next PR acceptance

- `npm test` and `npm run check` on the exact head.
- Mobile Chromium homepage Play → recognizable fortress/mountain → pass gate → wooded road; capture coordinates and pixel evidence.
- Forced compatibility renderer starts and follows the same path, with matching interactable IDs.
- Original wallet-free Solo and existing save fixtures remain usable; no save deletion.
- Record startup, frame-time percentiles, loaded/visible chunks, vertices/draws, peak memory when observable, and any remaining stalls. Label emulation versus real Android.
- No retirement of legacy URLs, no wildlife promotion and no main merge until checks pass and Pages/public behavior are separately inspected.

## Ownership and dependency

#43 owns entry/migration/release; #46 rendering and compatibility parity; #49 physics/collision/controller; #47 numerical browser budgets; #45/#56 geometry and actor identities; #48 pickup/workbench save ledger. #53 flight stays behind verified vehicle seat/state/controller contracts. This diagnostic work is the smallest rung-A unblocker before the rung-B pickup → workbench → reload loop.

No external dependency is justified by the evidence yet. Revisit the existing #44 shortlist only after a measured bottleneck identifies a component that is cheaper to reuse than to repair locally.
