# Meme City development status — 2026-10-30

Baseline: `3ec0c0cd3c68258290d689073525e565ec377ff5` (Alpha 11).
This review branch contains the Living Blocks / Alpha 12 increment. It is not a claim that the full polished-alpha handoff is complete. No production deployment or real financial transaction is part of this increment.

## Implemented

- Online courier delivery is admitted through the room service, with countdown, destination and duplicate reward checks.
- Night Market interior trading validates the actual building and terminal proximity before invoking the existing ownership, escrow, price and balance rules.
- Six neighborhood medics and the original outdoor Patch share supply rules. Equipment interiors buy and equip gear with correct location context.
- Shared online capabilities reject unsupported actions. The UI explains solo-only construction, companions and arena activities. Online journey chapters use supported activities; solo chapters remain unchanged.
- Discovery totals derive from building configuration; the visible release label uses shared metadata.
- Faction relationship data controls resident patrols, guards and hostility. Four additional clans have resident crews; remote ambient crews suspend expensive AI. Clan switching is blocked during jobs, wanted pursuit and active combat/challenges.
- Active firing retains aim direction; recoil decays continuously; remote snapshots carry firing state. Clothing remains recognizable around the existing continuous rig.
- Solo district outposts support bounded placement, collision, refunds and save restoration. Reputation unlocks decorative trim without tokens. These are private solo lots, not shared territorial ownership.
- Wallet disconnect revokes proofs and invalidates in-flight checks. Small USDC quote presets preserve exact token destinations and wallet deep links; no quote or low-cost route is guaranteed.

## Verification

`npm test`: **116 passed, 0 failed**.
`npm run check`: syntax, assets, script boundaries, control targets and deployment references passed.

New room-boundary tests load core, arcade, rising, interiors, clans and monk together. They exercise delivery, buying/equipping, market transfers, six medic services, outdoor restocking and all eight online chapter readiness/claim rules. Fixtures set simulation positions and achievements; these tests are not a physical travel playthrough.

Earlier browser review in this work covered faction/outpost/token panels and the quote handoff, before the final service repairs. A fresh browser recheck was blocked after the preview connection failed and the browser could not acquire authority for the error tab. No workaround was attempted. Final service changes therefore have automated verification only.

Not yet verified: full eight-direction gameplay appearance, fresh-player 15–20 minute journey, two simultaneous browser clients, touch-device gameplay, live wallet settlement, measured frame time or memory on Galaxy A15-class hardware. Online progress remains temporary guest state and is lost on server restart. Solo progress stays browser-local.

## Next milestones, in priority order

1. Complete browser acceptance for the repaired services and online journey using two clients. Exercise reconnect, delayed snapshots, server restart and unsupported panels; record latency and snapshot size. Resolve any browser-only defects before promotion.
2. Capture actual-game-scale poses in eight directions, full circular walking/idle/firing turns and reverse/blocked movement. Align authoritative projectile origin with a shared muzzle anchor. Test cover edges, aim transitions and remote poses.
3. Add one bounded district conflict event with state transitions, cooldown, visible resolution and validated participation rewards. Add retreat/regroup/investigation behavior and clearer targeting cues.
4. Improve navigation legend and obstacle-aware routes, useful arcade interiors, mission variants, solo placement previews and accessibility checks after construction. Prevent sealed entrances and trapping before expanding building features.
5. Profile mobile rendering and simulation on documented hardware, test portrait/landscape and pointer cancellation, then optimize measured hot spots. Add durable accounts/shared ownership only with database migrations, atomic operations, permissions and recovery tests.

The new purchase presets and wallet changes are review-only here: the supplied handoff explicitly excludes deploying financial changes as development testing. Keep the existing public release until review and the remaining acceptance checks are complete.

## Follow-up round — October 31, 2026

Continued on `codex/living-blocks-handoff`, PR #1. Completed batches were pushed as `d98104d` (combat/preview) and `7be50e5` (conflict/UI), followed by the final access/report batch. Main and production were not changed.

### Implemented this round

- Shared weapon dimensions/anchor explicitly separate ground-plane projectile collision from 58-unit visual height. The first projectile step sweeps the barrel, covering close targets and intervening cover. Remote recoil uses the same 120 ms decay window. Existing arm-length and all-angle geometry checks remain.
- Friendly fire is disabled: player and companion projectile collision uses the same hostility predicate as targeting. Other guests' owner-scoped enemies are protected. Mission enemies remain hostile to their owner regardless of clan. Ambient kills cannot advance bounty objectives. NPC windups recheck allegiance; dormant NPCs clear attack targets and keep a wake-up cooldown. Aim assistance retains its target within a 75-unit distance preference to reduce switching.
- Preview hosts use the local room service, avoiding accidental tests against the older production build.
- Fixed a browser-observed bug where solo-only online panels returned before opening their explanation dialog. Fixed per-mode feedback counters so a solo result ID cannot suppress the first online contract result with the same ID. The latter fix still needs its full transition replay.
- Founders Crossing: 90-second initial wait, 15-second announcement, 10-second preparation, up to 75 seconds of combat, 12-second resolution/reaction, then 180-second cooldown. Two Insider and two Rug troops start; one reinforcement per side is allowed, bounded by the global 64-NPC cap. Markers appear in the world and map, with live participant HUD progress and a clan-panel enrollment interface.
- Event enrollment requires physical proximity and the Insider or Rug clan, closes after 15 active seconds, and locks clan switching for that round. Direct damage of at least 60 plus 10 seconds of active movement/fire in the ring qualifies for an automatic single reward: 80 credits for victory, 40 for defeat/timeout, and 50 XP. No per-KO event farming; no idle spectator reward. Contribution is scoped to the server guest identity and cannot transfer to a newly joined guest. This is not Sybil-resistant account identity; permanent anti-abuse identity remains a future backend milestone.
- Map legend, shop/medic symbols and medic destinations. New placement checks reject enclosed walkable cells and blocked HQ entrances before charging. The fortress tile preview disables structurally invalid placements. Existing saves are preserved; legacy inaccessible arrangements are not silently deleted. Full world-space access to every doorway and obstacle-aware navigation remain pending.

### Actual browser evidence

- Preview recovered using the supported daemon start. Fresh solo entry, on-screen directional movement, courier acceptance, physical traversal and delivery completed; result showed **85 credits / 100 XP / 21 seconds**. An earlier attempt ended in a normal bust. Pressure around the courier beacon remains high and needs balancing.
- Solo reload preserved earned XP and credits after the first attempted run. The full buy/equip/reload chain was not completed: the later physical approach to Bad Taste Supply was interrupted by a bust and navigation retries.
- Two separate browser tabs joined the same private room, and the HUD reported two players with the second nickname. This is two browser clients in one desktop browser, not two physical devices.
- Online Build restriction visibly opened and its Online Journey button displayed the supported eight chapters. Online courier was traversed using the on-screen buttons; delivery changed completed jobs from 0 to 1 and XP from 50 to 150. The result modal was suppressed by the cross-mode counter bug fixed above; subsequent bust altered the credit balance, so the exact online reward amount was verified by regression tests rather than isolated browser balance observation.
- Inspected actual gameplay screenshots while moving near the courier beacon and equipment store: character clothing, trees, buildings and NPC encounters render. This is not a completed eight-direction firing/occlusion inspection.
- Browser runtime/preview reset during the repeated request; restored preview successfully. No security-policy bypass was used.

### Tests and measured performance

126 automated tests pass, plus repository checks and whitespace validation. New coverage includes all-angle shared muzzle projection, friendly/owner-scoped projectile damage, close-range barrel collision, sleep/wake timing, event lifecycle/caps/idle rewards/contribution/enrollment, shared-room event admission/stale controls, and construction access/refunds-before-failure.

Reproduce simulation profiling with `node scripts/city-benchmark.mjs`. Shared Linux host, Node v24.22.1, AMD EPYC 9V74; 8 players across 6 districts, 44 ambient bots plus bounded event troops, 2,400 ticks / 120 simulated seconds. Measured median tick 0.581 ms, p95 1.481 ms, max 13.827 ms; one serialized snapshot 22,536 bytes; end-process heap 11,680,880 bytes and RSS 69,599,232 bytes. These are a single Node run, not browser frame times, browser memory, real network latency, or Galaxy A15 performance. No mobile FPS claim is made.

### Remaining acceptance / next highest priority

1. Finish two-client physical shop/market trade and six medic flows; replay solo→online→solo result/save transitions after the feedback fix. Exercise disconnect/reconnect under actual stream loss. Browser tests have not yet covered these end to end.
2. Play through Founders Crossing as participant and spectator, inspect actual combat/reward UX, and tune duration/difficulty. Automated lifecycle tests pass, but do not replace this acceptance. Verify final live progress HUD visually.
3. Eight-direction gameplay pose capture, manual aim/strafe/cover-edge tests, narrow portrait and landscape touch controls, and real-device frame/render/memory measurement.
4. Obstacle-aware route guidance, world-space construction preview, continuous collision/access audits and legacy layout repair UX. Do not describe the conservative tile test as complete world navigation validation.

PR remains draft because these acceptance items are unfinished, not because pushing is blocked. Continue pushing verified batches; do not merge/deploy merely to satisfy a push request.

## Visual parity follow-up — October 31, 2026

### Armed-NPC visual parity and avatar clarity

- All armed human roles (players, faction residents, Insider security, Rugmasters, and hired guards) now render through the same full-body, depth-sorted weapon/arm/leg rig. The old NPC-specific 2-D held-gun overlay is removed, avoiding disconnected hands and differently ordered limbs during turns.
- Rendering movement no longer freezes bot gait solely because the enemy is in its attack state. The shared travel-distance tracker animates legs only when the actor actually changes position; guards retain their target-facing aim while retreating.
- NPC combat pose resolves aim in attack/skirmish states and movement-facing during chase/patrol rather than continuing to stare toward an old shot target. Shared NPC visual scaling is 0.9 for regular bots/guards (including other civilian roles by default); boss visuals are 1.15 versus the prior 1.28.
- NPC uniforms retain faction-specific cloth color and visible insignia rather than accidentally showing meme prints when using the common armed rig. Player and faction-resident meme logos stay on torso and sleeve panels.
- Meme icons on the rig preserve a square 28×28 print with a contrast outline instead of distorting the art into a 30×23 rectangle. Ready images are prefiltered to a 128×128 cached thumbnail for subsequent draws. The unarmed top print is also square.
- Small armed NPCs use a reduced polygon count (316 instead of 684 surfaces in a representative rig pose) and skip per-face outlines. Unused offscreen civilian costume sprites are no longer built for armed actors.

### Verification and limits

- Six dedicated avatar/unit tests passed under an isolated JavaScript compatibility harness, including two new NPC gait/target/LOD regressions. (This is not a complete Node `npm test` execution.)
- Syntax compilation passed for seven central game/rendering files; 576 simulated role/yaw/LOD geometry combinations passed depth/finiteness checks; 64 mock-canvas rendering poses completed without exceptions. A representative logo mock used one thumbnail canvas and one original-image downsampling operation across repeated renders.
- The actual GitHub Pages release is still on `main`. This code is committed and pushed to the draft PR branch, **not deployed**.
- Remaining acceptance: real browser/phone screenshots in all eight directions, walking while firing for player/guard/Insider/Rugmaster/resident, frame-time and memory measurements on mid-range Android, clothing/insignia legibility at 0.72 world zoom, recoil and muzzle/cover alignment, collision silhouettes after the modest NPC scale change, and multiplayer interpolation under packet delay.

## Stage 0 validation and Stage 1 map vertical slice — October 31, 2026

**Working branch:** `codex/living-blocks-handoff`; [draft PR #1](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/1). No merge into `main`, no production deployment and no wallet transactions.

### Implemented and pushed

- `9057626` / `a4e8043`: added a Node 22 PR/branch validation workflow with full `npm test`, `npm run check`, patch whitespace verification and the room benchmark. Corrected the initial shallow-checkout workflow failure.
- `8eb83eb`: reproduced and corrected the VM-cross-realm `deepStrictEqual` assertion in the recent NPC animation regression test; this was a test harness failure, not evidence of malformed player/NPC aim geometry.
- `575bb620`: introduced `city-map.js`, a stable and validated POI compatibility catalog of the existing hub, districts, neighborhoods, stations, 47 actual building entrance definitions and journey landmarks. The map now supports click/touch destination selection, real service-counter building route buttons, visible entrances, current-waypoint highlighting and waypoint clearing. Source coordinates and saved player data remain unchanged.
- Added 3 navigation tests for POI reference/destination integrity, phone/desktop coordinate mapping and safe marker hit testing. Deployment/script validation includes the new map helper.

### Actual verification of code commit `575bb620`

- GitHub Actions [Node 22 validation run](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41219364022): **131 tests passed, 0 failed**, `npm run check` passed, patch whitespace check passed.
- GitHub runner: Node 22, shared AMD EPYC 7763, 8 simulated players, 44 ambient bots and maximum 6 event troops, 2,400 ticks / 120 simulated seconds. Median tick **0.688 ms**, p95 **1.630 ms**, maximum **18.780 ms**; snapshot **22,536 bytes**; process heap **9,435,520 bytes**, RSS **94,298,112 bytes**. These are one-run server simulation metrics only.
- Full physical browser pointer/tap validation **NOT RUN**. Two-client playthrough **NOT RUN** this round. Physical Android/frame pacing/battery validation **NOT RUN**; do not treat the successful Node benchmark as phone FPS.

### Open design boundaries and next steps

- The current map shows **directional waypoints**, not collision-safe A* routes; the navigation panel now explicitly discloses that. Obstacle-aware routing, door reachability and route recalculation are the next navigation slice.
- Legacy solo saves use version 1–4 with no separate world schema/versioned rollback snapshot. Before repositioning the city, design and test `worldVersion` and safe recovery plus an old-POI-to-new-POI migration table. **Do not recenter the world by editing constants first.**
- `city-core.js` remains the canonical simulation/authority; the new map helper is an adapter for the current world data, not an independent terrain or combat authority.
- Existing online guest rooms remain temporary. The public release and financial UI on `main` are unchanged. No persistent online personal-land, new holder entitlements, token burns or purchases are implemented here.
- See `docs/CITY_ARCHITECTURE_AUDIT.md` and `NEXT_AI_HANDOFF.md` for source locations and the next testable increments.

## Save-schema guard follow-up — October 31, 2026

**Code commit:** `62135ce4`, pushed to the same open draft PR. No map relocation or production deployment.

- Added `city-save.js` with separate `SAVE_VERSION=5` and `WORLD_VERSION=1`. New solo saves write `version:5`, `saveVersion:5` and `worldVersion:1`.
- Before opening an existing v1–v4 solo save for continued use, copies its raw original JSON to `offensive-meme-city-v1-legacy-backup` if a recovery copy is not already present. Existing backups are not overwritten.
- Malformed, unsupported/future-schema and future-world saves are left unchanged; auto-saving is disabled and the user is informed. If a required backup fails, old progress can still be read in the session but will not be overwritten.
- Preserved the existing v1-to-current position adapter, item/progression restore and existing world coordinates. This is a schema safeguard and **NOT** the future center-out position/plot/outpost migration.
- Added five save regression tests covering fresh state, legacy backup/idempotence, unsupported schema, corrupted input and unavailable/quota-limited storage. Updated script order and GitHub Pages deployment manifest.

**Actual validation:** [CI run 41219705683](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41219705683): **136 passed / 0 failed**, `npm run check` passed, diff check passed. Node 22 shared runner benchmark: 8 players, 44 ambient bots, 2,400 simulation ticks, median **0.363 ms**, p95 **1.077 ms**, max **11.754 ms**, 22,536-byte snapshot. Separate sample/run from prior benchmark; **not** evidence of a performance improvement or phone FPS.

**Still needed before map redesign:** create a stable landmark/door region migration table, preserve plot/outposts/contracts/waypoints, add deterministic world transforms, validate entrance reachability and recover collision-trapped legacy builds. Add true multitab conflict handling or explicit save revision checks. Full browser reload/backup recovery and Android-device playthrough remain unverified.
