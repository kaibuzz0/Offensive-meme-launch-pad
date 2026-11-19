# Canonical game release contract — Graphics / Integration
Updated 2026-11-16. This is a dependency and acceptance specification, **not** proof of deployed behavior. Read current main, open PRs, and `docs/DEVELOPMENT_COUNCIL.md` before implementation. Supersedes instructions to maintain permanent separate game editions.

## Immediate gate and ownership
Current rung: **A, advancing into B only after acceptance**. Route: homepage Play → wallet-free Solo → first-person fortress and mountain skyline → arch → wooded road → lit district/interior → gather/build interaction → reload and verify persistence. The fortress-arch test must establish deterministic heading and live controller coordinates after mobile look input; diagnose collision, frame-time and orientation separately. Do not treat a stale HUD sample or a software Chromium FPS as physical Android evidence.

| Owner | Exclusive change scope | Required handoff |
|---|---|---|
| #43 Graphics/Integration | homepage/bootstrap, canonical entry and release wiring, schema coordination, merge/deployment evidence | publish one contract, sequence dependent PRs and verify public path |
| #46 Graphics | renderer adapters, automatic detail, shared avatar/held-item rig/socket, materials/building kits | render **same** world IDs, collisions and state on accelerated/compatibility paths |
| #53 Flight (Graphics) | aircraft visual integration and flight adapter **after** #52 shared seats/control/save contract | same world coordinates, player controller and save IDs; no separate scene |
| #45/#55/#56 Living World | seed/worldgen versions, settlements, actors and stable geometry/content IDs | collision/render queries and deterministic scene fixtures |
| #49/#50/#52 Physics | fixed-step controller, collision, seats and ground vehicles | pose/socket limits and deterministic arch traversal |
| #48/#51/#54 Sandbox | authoritative item ledger, atomic gather/build/equip, ranged items and drones | persisted IDs, held item state, save/reload fixtures |
| #47/#44/#57 QA | exact-head browser gates, migration tests, device profiling and reuse shortlist | numeric baseline and measured regressions on each relevant PR |

## Canonical runtime interfaces (adapt existing implementations; do not create competing engines)
- **Entry**: one homepage Play action launches canonical first-person game; Solo runs offline without wallet. Old URLs remain functional until redirects pass migration and parity checks.
- **World**: `{worldId, seed, worldgenVersion, chunkId, geometryId, contentId, editsVersion}`; deterministic 0.25 m edits, stable landmarks and clustered biome IDs. Worldgen supplies both visual and collision queries. Regeneration plus validated edits; bound resident chunks.
- **Player/state**: `{schemaVersion, worldId, playerId, pose, velocity, inventory, equipment, vehicleSeat, edits}`; one gameplay state for Solo and multiplayer. Multiplayer server validates mutable state. Renderers cannot mutate authoritative gameplay.
- **Render adapter**: consumes immutable frame snapshot of world, visible instances, player/NPC poses and equipment IDs. Backend choice is automatic; it may change resolution, LOD, effects and distance, **never** objects, hitboxes, interactions or save identity. On WebGL loss/recovery, preserve the same state and confirm the same visible route.
- **Content**: stable versioned definitions for avatar slots, item grip sockets, material/building kit IDs and provenance; mutable equip/ownership is separate. Unknown IDs are preserved as recoverable data with safe visual defaults.

## Migration sequence
1. Inventory entrypoints, save keys, world generators, render backends, state stores and overlapping PRs. Record old-to-new mapping and old schema fixtures.
2. Copy original saves into a recoverable backup; migrate to a versioned candidate without overwriting originals. Validate identity, seed, coordinates, edits, inventory and equipment; quarantine unmappable values.
3. Read candidate back and verify checksums/invariants; atomically activate only after validation. Repeat migration and reload to prove idempotence and rollback.
4. Verify accelerated and compatibility renderers against identical seed, player pose, visible objects, collisions, interactions and persistent changes.
5. Verify wallet-free Solo, mobile dual joystick, atlas, homepage-to-workbench route and PWA offline startup; only then redirect old URLs and retire obsolete public mode selectors. Keep source history and backups.

## Acceptance and release evidence
- Required: `npm test`, `npm run check`, original Solo and first-person mobile Chromium acceptance at **exact PR head**. Test fortress heading after look joystick and log pose/velocity/collision and frame-time if blocked.
- QA records download/startup, frame-time p50/p95/p99, longest interaction stall, main-thread work, RAM/GPU proxy, draw/mesh load, and long-session cache on desktop and available Android-class hardware; label emulated versus physical. Keep current mesh cap until measured adjustment.
- Content increment: screenshot from player-eye level, action/equip state, touch reachability, collision, acquisition and save/reload; before/after at fixed seed and camera.
- A merge requires compatible dependencies, exact-head green checks, migration/parity evidence where affected, and review. After merge, verify Pages workflow, served commit, homepage Play and real gameplay route. State separately: implemented, PR-only, merged, deployed, visually verified.
- **No flight/wardrobe release claim** until accessible through canonical public game. Flight depends on seats/vehicle physics; wardrobe starts with a few free preview/equip/save choices using one rig and shared first-person loadout.

## Focused reuse decision
Before adding a rendering dependency, review existing mesh batching, atlas and worker code and #44's deduplicated research list. Prefer a measured local bottleneck fix over a full engine replacement. Evaluate exact upstream revision, license, transitive cost, WebGL1/PWA compatibility and device frame-time. Do not import BAREIRON or third-party assets without license verification.

## Construction transaction integration gate — 2026-11-18

This section is an implementation contract, **not evidence of a passing game**. Do not merge a voxel-only journal, inventory-only workbench, or renderer-only preview as if the entire player action were durable.

1. **Single action identity:** The input handler assigns a stable `actionId` to each player request and supplies `worldId`, `playerId`, expected world revision, item ID/count and requested voxel coordinates. Solo and authoritative multiplayer validate against the same gameplay rules. Repeated `actionId` must not spend resources or apply edits twice.
2. **Validate without mutation:** The Sandbox owner checks item balance, voxel bounds, edit batch limits, occupied geometry and current revision, then prepares candidate inventory **and** voxel edits together. A preview operation must not update active world, inventory, collision or saves. The Physics owner supplies collision validity; the Living World owner supplies stable geometry and chunk IDs.
3. **Durable commit:** Write a versioned candidate transaction/snapshot containing both item debit and world edit, action ID and checksum. Read back and validate before activating. On failure preserve the last valid snapshot and original migration backup. Never expose a placed block with an uncommitted debit or vice versa. Unknown IDs remain recoverable, not silently discarded.
4. **Replay and renderer handoff:** After successful activation, publish one immutable world/player frame snapshot to WebGL and compatibility renderers and one collision update to Physics. Rendering failure or context loss must not trigger a second charge. On reload, replay committed actions idempotently; no duplicate items or edits. Ensure save/worldgen versions preserve existing landmark and player edits.
5. **Browser fixture:** In wallet-free Solo, open the homepage Play route, approach the fortress arch and lit interior, gather one resource, place a valid block, observe inventory decrease by one and collision update, reload and verify the same block and inventory. Retry the same action ID and verify no second debit. Test insufficient inventory, invalid coordinate, interrupted commit, old-save migration, WebGL context loss, compatibility renderer, mobile dual joystick and offline revisit. Record exact-head test logs and screenshots; no release claim without real browser evidence.

**Dependency order:** #48/#82 inventory ledger + #199 candidate edit journal → #49 collision and #45 stable IDs → #46 same-state render visibility → #47/#57 deterministic and Chromium acceptance → #43 reviewed merge, Pages deploy and public verification. Resolve conflicting historical PRs rather than merging them wholesale. #53 flight remains blocked until #52's vehicle seat/controller/save contract is verified in this same world. Research in #44 should focus on measured meshing/asset bottlenecks, not an engine rewrite.

## Offline Solo release gate — 2026-11-19 (source-verified blocker)

**Observed on default branch:** `sw.js` uses `offensive-shell-v1` and precaches only `offline.html` and three app icons. Navigation is network-first with an offline fallback; the game HTML, its JavaScript/CSS/worker dependencies and dynamic game assets are not cached by that service worker. Therefore a successful offline **game** revisit has not been established by this implementation. This is source inspection, not a physical Android/browser result. Do not describe a fallback page as offline Solo.

**Integration scope:** reconcile the bounded same-origin game-asset caching proposed in #201 with cache-isolation regression coverage from #210, against fresh PR heads. Never cache wallet signing flows, account/API responses, token/reward data or unrelated cross-origin assets. Cache only an audited allowlist of canonical game assets (including dynamically imported modules/workers), enforce total/per-response bounds and eviction, and retain the fallback page when assets are unavailable. Prevent stale cache versions from mixing incompatible game code and save schema; preserve active sessions during worker updates.

**Exact-head acceptance fixture:** (1) online first visit: homepage Play → wallet-free first-person Solo → fortress, road and lit interior; (2) perform a persistent gather/place action and reload online; (3) disable network, navigate from the homepage/PWA entry and reopen Solo, traverse the same scene and reload the saved edit without wallet or external services; (4) confirm all required modules, workers, fonts and textures load locally, no missing-resource/console errors, and no stale or foreign cache entries; (5) repeat on mobile Chromium and label emulation versus physical device. A fresh installation while already offline is a distinct scenario and is **not** promised by a runtime cache populated after a previous online visit.

**Release sequencing:** #201/#210 integration and #47/#57 browser acceptance must be reviewed alongside #48 construction durability and #46 renderer parity before #43 can claim rung A/B completion. Do not retire old entrypoints or promote wardrobe/flight on the strength of cache unit tests alone. Record the exact PR head, workflow run, served Pages commit, screenshots and real public route separately.
