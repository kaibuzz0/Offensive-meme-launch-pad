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


## Follow-up round — October 31, 2026: safe walking routes and world2 draft

This batch continued from the previous AI's `b53015e3` baseline on the same draft PR. The live production `main` branch remains unchanged.

### Implemented and pushed
- `city-nav.js`: bounded, demand-driven A* planner over the existing `MemeCityCore.blocked()` physics; route segments are additionally line-sampled to prevent cutting through building corners. An independent static grid cache is used only for immutable geometry, with player-built obstacles checked dynamically. Paths cannot teleport or move the player, and invalid/unreachable/budget-exhausted plans return a clear failure.
- `city.js`: actual walk-route polyline in the world and map panel; path recalculation after major deviation, marker clearing, and explicit unreachable feedback. Native browser `navigator` is preserved (a temporary name collision was caught and fixed before this handoff). The room simulation/authority was not modified.
- `scripts/city-nav.test.mjs`: wall avoidance, route budget/invalid inputs, safe line segments and all **14** current shop/market/medic public entrances reachable from the source spawn. These source-level graph checks are not physical browser tests.
- `city-topology.js`: **inactive** world2 blueprint (10,080 × 10,080, center 5,040/5,040), fortress at the center, public commons distinguished from solo private land, north/east/south/west road axes, preserved stable region IDs for four original districts and all six meme neighborhoods, original 16×10 fortress grid footprint, and six 3×3 clan outposts. Deterministic old-region coordinate transforms and a non-writing solo-save migration preview cover known geographic regions and saved crew posts. It intentionally refuses unmapped greenbelt positions.
- `scripts/city-topology.test.mjs`: center, road, region, original building entrance, plot and safe-preview invariants. All **47** exterior doors have a projected target, but this only demonstrates coordinate coverage, **not** viable walkable access after construction.

### Verification and deployment constraints
GitHub Actions validation for integrated walking paths succeeded at `6317cd9` (run 41220246225), and the follow-up browser-native `navigator` fix succeeded at `3ca37f1`. World2 topology test coverage initially exposed a cross-VM array comparison issue in the test itself; that was corrected and rerun green at `efe9b9e` (run 41220526763). This is automated CI, not mobile acceptance.

**world1 remains active.** The version guard is still save v5/world1; world2 is not loaded by the game or deployed, no existing stored coordinate has moved, and no existing player progression has been changed. Do not turn `draft.enabled` on or update world constants without a full staged migration.

### Immediate next tasks
1. Map every legacy spawn, checkpoint, guard post, active mission/raid location, interior/door entry, and greenbelt save position into world2; add safe relocation for unresolved/out-of-bounds points and reversible world2 backup/rollback tests. Preserve inventory, outfits, XP, credits, clan reputation, build tiles, outposts and journey progress exactly.
2. Author and collision-test actual world2 roads, plaza, fortress perimeter, gates and interiors while keeping world1 as default. Verify reachability for all 47 doors and service terminals on the new world collision graph.
3. Add a locally gated, review-only game preview of world2 with eight-direction avatar and live route testing. Solo has a personal fortress at the center; online's temporary guest room has a neutral shared plaza with no permanent ownership. Test two browsers and mid-range Android before enabling production.
4. After center-out world acceptance: persistent base defense raids with clear cooldown/rewards, authority-safe faction territory and destruction, police working for Insiders, zombie encounters, accessible retro arcade and token-themed holder cosmetics. No real token burning or Minecraft server integration.

## Follow-up — October 31, 2026: staged world2 migration and physical route geometry

**PR-only development commits:** `b251852`, `17088d0`, `70ba29d`, `ac2f161`, `a70e484`, `bba9ef2`. Current world1 remains the only active/browser game. The world2 code is tested in Node but is **not loaded into the browser, merged into main or deployed**.

### Implemented

- New `city-migration.js` converts old v1 local-area positions and v2–v5 world1 coordinates into explicit world2 staging coordinates, including district/neighborhood mapping, optional checkpoint/respawn/waypoint coordinates, and saved crew posts. Unmapped world1 greenbelt positions and invalid defender posts get deterministic recovery locations with notices rather than erasing XP, credits, inventory, equipment, journey, clan reputation or plot/outpost tile records.
- Unsafe or unknown active-session activities (`contract`, `blockJob`, `defense`, `room`, `rising.arena`) are **blocked**, not silently migrated; these states are not serialized by the existing solo save. New staged saves use `saveVersion:6`/`worldVersion:2` **only in a separate preview key**; the running browser still writes v5/world1.
- `CityMigration.stage` preserves the exact original raw save in a separate world2 recovery key before writing any world2 preview, refuses to overwrite a backup for another revision and checks the active raw value for optimistic multi-tab conflicts. `inspectStage` refuses a stale preview when either active or backup copy has changed. This is a guard, **not an atomic cross-tab commit protocol**, and no live world2 activation/rollback UI exists yet.
- New `city-world2.js` authors an inactive collision/layout layer: physical central fortress perimeter, four clear cardinal gate openings and roads, an outside-the-plot safe spawn, dynamic solo construction collision and original stable building IDs. The six existing main-hub services get individually authored slots on either side of the north road; other 41 entrances use projected footprint geometry. Its collision/nav adapter uses existing `CityNav` for real path checks in Node. **These coordinates are preliminary and not guaranteed to be the final visual floorplan.**
- Expanded `scripts/city-migration.test.mjs` and new `scripts/city-world2.test.mjs` cover legacy position conversion, progression immutability, greenbelt recovery, unsafe activity refusal, backup/revision conflict, fortress gates, protected construction spawn, all 47 reachable door destinations and path segment collision.

### Verified

- On code commit `bba9ef203f7d418a6ad6edce6f5629833fd3f28b`, GitHub Actions [run 41221761283](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41221761283) **passed 156/156 tests**, `npm run check`, patch whitespace, and `node scripts/city-benchmark.mjs`. Node 22 shared runner benchmark: eight simulated players, 44 ambient bots, 2,400 ticks / 120 simulated seconds, median **0.511 ms**, p95 **1.309 ms**, max **13.122 ms**, snapshot 22,536 bytes. These measure existing world1 server simulation; **not** new world2 gameplay or Android/browser FPS.
- Intermediate `70ba29d` and `a70e484` CI runs intentionally exposed test/geometry mistakes, fixed in `ac2f161` and `bba9ef2`; the latest branch head is green.

### Blocking follow-ups before any world2 activation

1. **Unify stable door/POI placement mapping.** The six authored hub building slots in `city-world2.js` are not all identical to generic `CityTopology.point` projections; mission, guide, saved waypoint and interior entrance mapping must use canonical stable IDs before enabling world2.
2. **Add real playable engine+renderer integration under an explicit isolated preview flag.** Current gameplay, client saves, room authority, map and textures still use world1. Migrate `C.WORLD`, `C.PLOT`, `blocked`, buildings, faction spawns, guard/raid anchors, collision, interiors, encounters, missions and guides as a coherent world2 config; do not simply flip the topology flag.
3. Validate legacy saves in actual browser reloads, including reconstruction of plot and outposts with physical collision, reliable rollback UI, conflict behavior with two tabs, inaccessible entrances and bad coordinates. All current 47-door proofs are **Node model** tests; they are not browser proof.
4. Test a real first-five-minute playthrough, all 47 doors, two online guests, eight-direction combat posing, and mid-range Android. Keep wallet/trading code unchanged and production `main` untouched.


## Continued development — October 31, 2026: canonical world2 destinations and isolated playable browser shell

**Branch:** `codex/living-blocks-handoff`, draft PR #1. Continues directly after the reported `6bc8508c` baseline. The active world1 game, production `main`, and active solo-save key are **not migrated or replaced**.

### Pushed code

- `city-world2-registry.js`: one stable-ID index for **47** world2 building doors plus district anchors, all station names, 12 landmarks, five guides, three journey checkpoints, and fortress plot. Six authored hub building positions are canonical, rather than deriving mission/market entrances from old proportions; shop/market/arcade/garage street stations use the actual front-door points where those station IDs exist. Projected legacy markers snap only to walkable world2 coordinates.
- `city-migration.js`: optional registry-aware waypoint/checkpoint/respawn resolution by stable ID and journey route target. Without the optional argument, previous staging behavior is retained. The raw active save remains unchanged.
- `scripts/city-world2-registry.test.mjs`: direct equality to authored entrance coordinates (including half-pixel centers), all 47 walk routes, service station alignment, registry coverage, stable-ID waypoint migration and source immutability. Initial CI caught two test/precision assumptions; fixed in later commits before the green result.
- `city-world2-preview.html` and `city-world2-preview.js`: review-only responsive browser geometry explorer with manual keyboard/touch movement, actual world2 wall/building/plot collision, four cardinal gates, on-demand A* street routes, entry/exit to existing interior room geometry, static faction figure markers, temporary test walls, three orientation checkpoint markers, and opt-in `CityMigration.stage()` loading to a separate preview. It does **not** use the live combat, mission or economy simulation, pay prizes, mint tokens, host real multiplayer or activate a world2 save.
- Preview resources included in the future Pages copy list, static deployment checks and local `server/city-server.mjs` allowlist, so the page can be tested locally on the development branch at `http://localhost:8787/city-world2-preview.html` via `npm run dev`. The production Pages deployment is still gated on `main`; no live preview URL was deployed.
- `scripts/city-world2-preview.test.mjs`: mock-DOM rendering/control smoke checks and no-production-save-write guard. **Mock DOM is not actual browser acceptance**.

### Verification

A full Node 22 PR validation passed at the preview integration commit `b0cf229a`; subsequent registry and mock-preview smoke cases passed in GitHub Actions (see branch check history). These checks validate JavaScript syntax, route/model coordinates, gameplay regression compatibility, local file availability and a simulated initial preview render. **No real Chrome/Android screenshots, physical 47-door walkthrough, multiplayer room session or phone FPS measurement were performed here.**

### Remaining hard constraints / next batches

1. Run browser QA on the isolated preview with mouse, keyboard and real touch controls: four gates, all 47 interior entries, nearby interaction, in-room movement, construction collisions and reload; verify actual avatar 360-degree animation and geometry. Fix browser-only errors. Test a genuine old solo save and multi-tab update conflict with backup restoration.
2. Introduce a feature-flagged world2 *engine* adapter mapping shared server/client physics, spawn, interiors, 12 landmark locations, guides, NPC gangs/Insider police, mission beacons and construction; do not mutate `C.WORLD` after initialization or import the isolated preview as if it were an authoritative game engine.
3. Implement explicitly reversible solo world2 save activation and rollback only after the entire engine and UI support world2. Keep world1 as default until acceptance. Shared rooms must use neutral central commons, not a single eight-owner private plot.
4. Once playable world2 semantics are proven, expand autonomous fortress defenses, gang raids and Insider-controlled police, territory/building damage, zombies, arcade activities, and holder-cosmetic avatar forms. **No BAREIRON Minecraft server, on-chain burn or speculative holder payout mechanics.**

## World2 round 3 — simulated combat and progression in the isolated browser preview (October 31, 2026)

**Working branch:** `codex/living-blocks-handoff`; **latest tested gameplay commit:** `777a924b`. [Full CI (https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41223390175)](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41223390175): **170 / 170 tests green**, Node 22 static/deployment checks, patch whitespace check and world1 server benchmark all pass. The preview, not the main game, owns these capabilities.

### Completed this round and pushed

- `city-world2-simulation.js` provides an **offline, in-memory world2 simulation** using the new world2 geometry and canonical POI IDs instead of the original hard-coded world1 collision source. It supports the player movement vector, bounded directional shooting and magazine cooldown/reload, limited NPC gang movement, an Insider-branded police unit responding to heat, a fortress defender attacking nearby raiders, simple north-gate defense waves, HP/respawn and the existing three canonical journey-checkpoint XP/credit pattern. All rewards and inventory changes are **nonpersistent preview data**; no real financial actions.
- `city-world2-preview.js` now drives movement, AI actors, shooting and defense from simulation state (replacing earlier decorative gang sprites); displays NPC HP bars and a combat/status HUD. Added buttons and keyboard actions: Space/F fire, R reload, G defense wave, C claim checkpoint, alongside existing WASD/arrows/E and pointer movement buttons. Entering an interior pauses the exterior simulation; interior activity terminals remain nontransactional and unimplemented.
- Preview construction now validates `MemeCityCore.buildAccess`, world2 collision and temporary build/remove state. Staged `worldVersion:2` character loading reads bounded validated inventory, equipped gear, clan profile, progress, optional rising/places metadata, crew posts and outposts into an **unsaved memory copy**. Stale/invalid stage or unsupported world version remain blocked. Repeated defense waves remove old raid entries rather than accumulating dead NPCs.
- The new simulation script is wired into preview HTML, static-file checks, local development-server allowlist, and future Pages copy manifest. Only the **development branch** has changed; `main`, original `city.html`, public gameplay, world1 saves and online room authority are unchanged.
- Added five isolated simulation test cases and two further state/cap tests plus a mock-DOM preview control test, bringing complete CI from **162 to 170 tests**. First tests caught a misleading wall-at-gate test and a per-tick cooldown assumption; both corrected and fully rerun. Browser/device acceptance has **not** been performed.

### Important limitations and follow-up engineering

1. **This is not a port of the production engine.** The new offline `CityWorld2Simulation` prototypes combat and missions without using world1 `MemeCityCore.Engine` or the actual online `server/city-rooms.mjs`. It cannot be treated as server-authoritative, persistent or multiplayer. Real online NPC pursuit/combat/territory must share one consistent and tested server/client world2 coordinate contract before activation.
2. **Mission/interior scope is narrow.** Only canonical three-stop checkpoint progression and a simple timed-free defense wave are supported in the new preview. Existing courier, escort, district contracts, interior shop/medic/market transactions, arcade, team control points, factions, gang destructibility and missions still require a reviewed world2 implementation. Preview gangs are intentionally small and the Insider police/fortress defender behavior is a basic bounded prototype.
3. **Real browser QA still required:** load `http://localhost:8787/city-world2-preview.html` via `npm run dev` on the PR branch. Test WASD, arrows and touch simultaneously, all 47 doors, four gates, avatar facing/fire while walking, keyboard focus, interior enter/exit, NPC motion and wall collision, defense-wave completion/respawn, staging and two-tab backup conflicts. Capture screenshots and frame time on mid-range Android. The mock-DOM tests are not actual browser evidence.
4. **Preserve safe migration:** separate stage/backup/inspect keys never activate world2 or overwrite the active v5/world1 save. Implement an explicit review + reversible activation UI only after complete engine, server and mobile acceptance. Never merge/deploy or run wallet transactions without user approval.

## World-v2 post-release development — October 31, 2026 (draft PR #2)

The previous PR #1 is now merged into deployed `main` (`08e6d169`); **new work happens only in `codex/world2-territory-foundation`**. The live world1 client, legacy user save key and Render server have not changed in this round. No wallet actions were performed.

### Implemented and pushed

- New six-clan territorial state machine with safe world2 neighborhood control markers, distance/health/hostile contest rules, eight-second capture, reset and preview-only one-time progress rewards. Each control now has a faction-identified gang NPC capable of contesting captures. The browser preview shows control markers, route options, capture progress, faction selection, nearby action and clan ownership. All six control points are verified walkable from the central fortress spawn.
- New small `city-world2-contracts.js` delivery contract: accepting at Launch House, walking the canonical route to Creator District under a 210-second deadline, receiving one reward, aborting or expiring. Guards against distant acceptance, repeated payout and incompatible active fortress-defense duties. Browser preview includes mission buttons, in-room launch terminal, street delivery and HUD countdown.
- New `city-world2-session.js`: manual save/load of `worldVersion:2/saveVersion:6` under distinct `offensive-meme-city-world2-preview-v1` key only, including character progression, gear, build tiles, outposts, clan reputation and claimed territory ownership. It requires reviewing/loading existing sandbox saves before overwrite, detects stale-tab writes and rejects malformed/future schema or invalid territory ownership. It never writes the original world1 localStorage key. Incomplete raids/couriers do not persist.
- Updated preview wiring, mock-DOM tests, static validation, local server allowlist and future Pages asset manifest. `city-world2-preview.html` remains a preview—not a server-authoritative game.

### Verified

[GitHub Actions run 41224951450](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41224951450) on code `70f9a6ca`: **189 / 189 tests passed**, static resource validation, diff whitespace and deterministic world1 server benchmark completed successfully. Earlier intermediate CI runs revealed floating-point timer boundary handling and old test fixture omissions; these were fixed before this green run. Automated testing does **not** establish actual Chrome/Android behavior, real render quality, or multi-client authoritative security.

### Still missing before any production v2 release

- Verified browser+mobile loop across four gates, six capture points, 47 interior entrances, courier, fire while moving, equipment and two-tab save conflict.
- Full integration of the world2 simulation with core and Render online room authority. Territory and contract progression currently exist only in an isolated browser prototype and are not safe as real server-validated rewards.
- Production-grade clan raid factions and private fortress persistence with staging/rollback and cross-device identity; actual interior medicine/trading/arcade; world2 automatic save migration and server parity. No real-world token/fee integrations in this PR.


## World2 indoor service slice — October 31, 2026

Continued on draft PR #2 from `fa1610c0`; production `main`, the existing world1 game, wallets and live Render multiplayer authority remain unchanged.

### Added and pushed
- `city-world2-services.js`: a **sandbox-only** indoor service API backed by the original `MemeCityCore.ITEMS` item IDs and prices. An actual room's rear activity terminal is required: buy/equip `jacket`, `visor`, `blaster`, `boots` inside `door:shop`; buy a capped medkit (25 play credits, capacity nine); and sell owned gear at `door:market` for half its catalog price. Salvage removes equipped gear and refuses duplicate sales. Purchases have item/credit/serial limits and never use real currency or wallet operations.
- `city-world2-preview.html/js`: responsive selector/buttons to buy, equip, salvage, purchase/use medkits; explicit indoor guidance and HUD medkit counter. Press H for a medkit. Shop/market actions refuse remote locations. No real-money marketplace, multiplayer escrow, or blockchain interaction.
- `city-world2-simulation.js`: optional services adapter; equipped boots provide the original listed +25 running speed and equipped blaster does 36 damage vs 35 base in offline combat; the original world1 engine stays unchanged.
- `scripts/city-world2-services.test.mjs`, additional browser mock and game tests: protected indoor proximity, balance debit, one-time salvage, medkit capacity, upgraded equipment effects, and isolation. `city-world2-session` already stores validated preview inventory/equipped gear and `rising` medical counts; a new save-roundtrip regression verifies the values survive isolated reload and leave the world1 key byte-for-byte unchanged.
- Added the module to the future Pages asset bundle, local static server allowlist, preview script order and static-file validation.

### Verification and limits
An initial new test fixture needed enough *preview* credits to purchase both upgraded items; its corrected version passed **195/195 tests** at commit `dddfd5d`, [GitHub Actions run 41225483294](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41225483294). The final added gear/medkit save-reload test has its own follow-up CI run; check the latest branch status before claiming a new count.

**Still not validated:** real Chrome/Android visual, touch and performance QA; authenticated server-authoritative world2 services; two clients observing identical commerce and NPC events; atomic concurrent browser save commits; production world2 rollout. The above is a functional **offline game prototype only**, not onchain or production multiplayer. Keep PR #2 draft and do not deploy to main without explicit owner review.

**Next vertical slice:** add server-compatible action schema and authoritative validation for world2 service commands, then real online integration tests and actual mobile gameplay acceptance. Protect public interior services and refund/inventory invariants. Finish a reversible world2 activation/rollback procedure before replacing world1. No BAREIRON Minecraft-server port or token burning.

## Round 5 — isolated world-v2 authoritative rooms (October 31, 2026)

Following Round 4 at a012ae4b (196/196 passing tests), new development on PR #2 added city-world2-authority.js, server/city-world2-prototype.mjs and server/city-world2-local.mjs. The new server-owned world2 Engine uses canonical collision/buildings/services/territory/courier definitions, shared guest rooms and server-calculated movement, NPC damage and rewards. Peer snapshots redact private inventories/credits; server actions reject forged client coordinates and balances.

The local HTTP endpoint is loopback-only (127.0.0.1:8788), separate from Render and the existing world1 service; browser preview connectivity is not implemented yet. New Node test suites cover actual HTTP join/auth/input/leave, two guests/room isolation, invalid actions/origins, server-validated purchases, courier and faction capture.

**CI:** [206 tests passed, 0 failed](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41226269497) at d508f757. Whitespace, static and world1 server benchmark checks passed. No production merge, Render redeploy, physical browser or Android tests were performed. Next work: opt-in room client, real browser acceptance, authoritative gameplay parity, and production release authorization.


## Round 6 — Local authoritative browser multiplayer client, October 31, 2026

Continued from verified world2 server prototype commit `560d68c1` on the **same draft PR #2**, preserving deployed `main` and all live world1 saves. No Render deployment or real-wallet operations.

### Development batches pushed
- `city-world2-online-transport.js`: strict **loopback-only** server API transport; per-guest session bearer credential held only in memory (never URL/storage), sequenced movement/fire input, server-owned actions and snapshots, timeout/401 fail-closed behavior, duplicate-join rejection, no stale poll rollback.
- `city-world2-online.html` / `city-world2-online.js`: standalone local-only browser QA page alongside the offline preview, exposing public/private room join/leave, shared real player/guard rendering with 360-degree armed avatar rigs, directional keyboard/touch movement and aim, two-client positional HUD, server-sourced six control points, manual POI targets, interior entry/exit, server-validated gear/medic actions and courier controls. Peer inventory and credentials are not displayed. **It does not synthesize real XP/credits or write local saves.**
- The production `city.html` remains world1. Local static server allows the new test assets; the GitHub Pages deployment manifest intentionally excludes them.
- `city-world2-authority.js`: server now checks actual owned/equipped boots and blaster before applying their listed movement/weapon modifiers; no client-provided damage/speed or balances accepted.
- `scripts/city-world2-online-transport.test.mjs`, `scripts/city-world2-online.test.mjs`, `scripts/city-world2-online-http.test.mjs`, expanded authoritative equipment regression: protected bearer tokens, monotonic snapshots, CORS/forgery refusal, two real HTTP guest sessions, isolated private room, server position synchronization and browser control mock.
- `scripts/city-world2-browser-smoke.mjs`: new real Chromium DevTools Protocol two-tab test; local backend and static host run on loopback, browser tests authenticated join, movement, room synchronization, denied remote purchase, mobile-sized viewport and no runtime exceptions. Added to CI as `npm run qa:world2:browser`. Earlier intermediate CI exposed a test-only background-tab timing and exact asynchronous snapshot comparison issue. Both harness assertions were refined; **latest branch CI must be checked before treating full real-Chrome acceptance as passed**.
- `server/WORLD2_LOCAL_QA.md`: exact two-terminal local QA instructions, headless Chrome command, Android adb-reverse procedure, and explicit remaining blockers.

### Release gates still open
This is a **local-only, server-authoritative multiplayer QA path**, not a production service. Browser-based tests do not equal a real mid-range Android hardware run. Server guest progress is still in-memory, world1-to-world2 irreversible save activation is not enabled, and complete world1 missions/arcade/fortress/companions/moderation remain unported. The offline preview's sandbox credits are a different simulation; **do not route them into temporary shared-room credits**. Never merge to `main`, expose loopback API publicly, trigger wallet operations or deploy Render without explicit owner approval.

Next prioritize real-device QA and server feature-parity, then safe migration with per-player rollback and multi-tab protections. Commit and push focused validated batches on `codex/world2-territory-foundation`, keep PR #2 draft, and preserve all newer commits.


### Verified Round 6 final result — October 31, 2026

**Code commit `4aec1c8754855b43e95ac2be5b2678fe40e89c82` passed the complete CI pipeline:** [run 41227746512](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41227746512), **219 tests passed / zero failures**, static checks, regression benchmark and the new **real Chromium two-tab/mobile-viewport smoke test** all successful. Chromium verified joining public world2 rooms in two tabs, that Bob saw Alice's server-owned position change from the original spawn, no unexpected horizontal overflow at 412px emulated phone width, an unauthorized shop purchase rejected by the server, guest-session cleanup and no uncaught browser exceptions. Test harness intermediate failures were due to background tab scheduling and a mis-escaped position regex; corrected before this green result.

This real-browser milestone is **not** proof of Android hardware FPS or reliable mobile touch gestures. No durable shared gameplay backend was deployed, no existing game save was migrated, and no production `main` file was changed by PR #2. Keep developer QA local; the browser QA page is intentionally excluded from Pages production artifacts.

## Round 7 — server-authoritative personal fortress construction (October 31, 2026)

Draft PR #2 advances beyond Round 6's 219-test Chromium multiplayer bridge. Players in a temporary v2 guest room can build/demolish 7 familiar kinds of fortress items in a 16×10 personal plot using game-only credits. The server checks canonical plot locations and distance, bounds, collision/trapped player, C.buildAccess pathing, cost, maximum inventory, overlapping tiles and a one-time half-price demolition refund. Structures do **not** affect peers' collisions or reveal private state. Closing an ephemeral session loses the guest's plot.

The opt-in loopback multiplayer client gained marker/selectors, server-bound actions and owner-only plot rendering. Automated suites include Node engine security cases, actual HTTP requests and an expanded real Chromium two-tab test that rejects remote builds, exercises placement/refund and checks the second guest's plot remains empty. Latest gameplay/QA source: `bb3d2e7b`. Check the final CI outcome before describing browser QA as passed. The public game main, Render service, Solana payments and world1 saves were not changed.

