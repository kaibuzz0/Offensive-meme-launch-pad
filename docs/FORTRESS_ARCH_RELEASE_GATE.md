# Fortress arch traversal: release-blocker reproduction contract

Status: **test specification only**, not a gameplay fix or proof of deployment. Owner: #43/#46 integration, with #49 Physics and #47/#57 QA. Last reviewed 2026-11-19.

## Source and observed failure

The existing canonical release contract is `docs/CANONICAL_GAME_RELEASE_CONTRACT.md`. Prior PR #216 mobile Chromium evidence reported all 89 requested chunks loaded and approximately 260k vertices at approximately 16 FPS, but the expected fortress-arch gate interaction was not reached before timeout. These are **software browser diagnostics**, not a measured physical Android baseline. The storage listener is a separate potential defect; the gate timeout must not be attributed to it without evidence. Recheck current PR head and CI before using those historical numbers.

## One bounded acceptance fixture

1. Start from the normal homepage Play action, enter wallet-free Solo, and select the same deterministic seed and fortress-road spawn for both renderers. Record the actual served commit, viewport, DPR, renderer name, worldgen version and save schema.
2. After spawn/reset, wait for a **fresh authoritative controller simulation tick**, not merely a HUD update. Record timestamp/tick, world XYZ, yaw/pitch, grounded state, velocity, collision candidate, visible arch geometry ID, camera direction and current movement/look inputs.
3. Exercise the mobile look joystick, then release it and confirm the intended yaw/pitch **after** its last input frame. Run movement toward the arch with a bounded fixed-step controller and log each 0.5 seconds: live pose, speed, collision normal/contact ID, frame-time p50/p95/p99, active chunks and visible mesh count.
4. Separate the failure into mutually distinguishable outcomes: (a) incorrect heading or look input; (b) blocked physics collision/headroom; (c) missing or unreachable interaction volume; (d) severe frame-time stall; (e) lost controller focus/input; (f) render-only absence of otherwise valid geometry. Do not increase the timeout as the sole remedy.
5. Confirm gate interaction using **authoritative world state**, then walk to wooded road and lit interior. Repeat with compatibility rendering using the **same seed, geometry IDs, collision rules and player state**. Verify both the actual visible scene and the interaction, not just a canvas pixel.
6. On reload, verify position and gate state with a readback of the same versioned save. Repeat the same gate action ID and confirm no duplicated state changes. Preserve existing legacy saves and backup snapshots.
7. Run original Solo regression, first-person mobile Chromium, `npm test`, `npm run check` and offline revisit after an online install. Capture screenshots and trace/video on failure. Report physical Android evidence separately if available.

## Ownership and merge dependency

- **Physics #49**: live controller pose/heading, deterministic arch collision and movement regression; owns controller and collision code.
- **Living World #45/#56**: stable arch/road/interior geometry IDs and reproducible seed fixture; no alternate world implementation.
- **Sandbox #48**: gate and later workbench action IDs, durable item/edit transaction and readback.
- **Graphics #46**: consume the same world snapshot in accelerated and compatibility renderers; show arch, skyline, road and lit district at automatic quality without changing collisions or interactions.
- **QA #47/#57**: exact-head browser diagnostics, FPS/long-stall evidence and save/offline regression; label emulation versus physical devices.
- **Integration #43**: review conflicts and CI, merge only reviewed compatible green heads, verify GitHub Pages served commit and homepage-to-game behavior. Flight #53 waits for #52's shared vehicle seat/control/save contract.

## Release decision

A source-level pass is not a public visual acceptance. Do not merge a failing or draft PR merely because GitHub says it is technically mergeable. Keep old public routes until migration and renderer parity are demonstrated. Current next player-visible target is a solid persistent roadside workbench reached from homepage Play; wardrobe and flight are not substitutes for this blocker.
