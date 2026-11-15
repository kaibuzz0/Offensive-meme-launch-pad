# Canonical game release contract — graphics integration (2026-11-15)

Status: **proposed contract, not gameplay implementation or public verification**. Coordinate in [#43](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/43). This supplements `docs/DEVELOPMENT_COUNCIL.md`; its unified-game directive takes precedence over historical parallel-mode instructions.

## Release rung and exact player path

Current gate: **A → B**. From the homepage primary Play action and installed PWA, enter the same first-person world without a wallet, see the fortress and mountain skyline, traverse the wooded road, enter a lit district building, pick up a resource, build/place an object, reload and confirm persistence. Capture browser console, screenshot, deterministic seed and coordinates, save version, renderer selected, build SHA, and observed action. No claim of release based only on Node/static CI.

## Interfaces (single source of truth)

- `WorldSnapshot`: `{seed, worldgenVersion, chunkIds, objectIds, geometryIds, collisionIds, editRevision}`. Stable IDs drive render, collision, navigation, pickup and persistence; renderers cannot generate a separate world.
- `PlayerState`: `{schemaVersion, worldId, transform, velocity, inventory, equipment, clothing, edits, progression, vehicleSeat}`. Solo and multiplayer share reducers/validation; multiplayer server is authoritative for edits, inventory, damage and vehicles.
- `RenderSnapshot`: immutable projection of the world/player state plus material/rig/socket descriptors. WebGL and compatibility renderers consume identical IDs, geometry, interactions and collision; automatic quality changes only visual LOD, resolution, distance, effects and scheduling. No public low/normal/high editions.
- `ContentDefinition`: stable `id`, `schemaVersion`, `category`, `tags`, `geometry/material`, optional `rig/animation/sockets`, capabilities and bounded stats, provenance. Mutable per-instance state is not stored in the definition. Unknown IDs are preserved in migration quarantine, not silently discarded.
- Flight: a vehicle mode within the same `PlayerState.vehicleSeat` and movement input map. #49/#52 establish seat/collision/state contracts before #53 attaches takeoff/landing; no separate flying world or controller.

These are **interface targets**, not assertions that named modules already exist. Adapt the strongest existing implementation incrementally rather than rewriting it.

## Save migration sequence

1. Inventory every existing key/schema/entry route and record original source versions; test fixture coverage for legacy Solo, terrain and partially migrated saves.
2. Copy original raw data to a durable versioned backup before conversion. Never delete unknown fields or unmappable IDs.
3. Convert into a new candidate key with deterministic mapping, stable world IDs and a migration marker; validate schema, referential integrity, inventory conservation, edits and world spawn.
4. Verify candidate load/reload and repeat migration twice with identical outcome. On failure leave original active and report recovery path.
5. Activate candidate only after successful validation; keep backup and rollback mechanism. Only then test redirects of old URLs and PWA cache/update behavior.

## Dependency and file ownership

| Owner | Deliverable consumed by integration |
|---|---|
| #45/#55/#56 Living World | Deterministic terrain, landmark/settlement IDs, NPC/wildlife descriptors and world queries |
| #49/#50/#52 Physics | Fixed-step movement, collision, avatar proportions, grip poses and vehicle seats |
| #48/#51/#54 Sandbox | Atomic pickup/edit/craft ledger, equip/use definitions, drone state |
| #47/#44/#57 QA/research | Android-class baseline, browser matrix, parity/performance gates and one licensed reuse shortlist |
| #46/#53/#43 Graphics/release | Visual rig/material kits, automatic renderer adaptation, flight integration, entry/migration and final release |

Do not independently rewrite another owner's controller, world generator, inventory ledger or save format. Resolve competing PRs through #43 before touching shared files.

## Verification matrix before merge

- `npm test` and `npm run check` on exact PR head.
- Desktop and emulated mobile Chromium: homepage Play and PWA shortcut; wallet-free Solo; fortress → road → interior → pickup → place → reload; original Solo recovery.
- WebGL enabled and forced compatibility mode: same seed, objects, collision and interactions, no stuck loading overlay, no uncaught exception; compare screenshots and state IDs.
- Migration: old saves, malformed/unknown IDs, interrupted migration, repeated conversion, backup recovery.
- QA reports startup bytes/time, p50/p95 frame times, stalls, main-thread blocking, RAM/GPU/mesh/draw load and long-session cache behavior, distinguishing emulation from physical Android.
- After eligible PR merge: verify main SHA, Pages workflow/deploy SHA, then inspect actual public homepage-to-game route. **PR-only ≠ deployed ≠ visually verified**.

## Immediate sequencing

1. Resolve the outstanding first-person compatibility startup/Chromium persistence failures and any overlapping canonical-entry/PWA test PRs; require exact-head browser evidence, not merely Node success.
2. Integrate a single working persistent gather/build interaction in the starter district.
3. Add a few free wardrobe preview/equip/save choices sharing the firing rig and first-person loadout, only after the base route works.
4. Introduce ground vehicle controls/seats before #53 flight. Keep #44 research bounded to a verified small meshing/atlas/rig candidate that demonstrably helps the current gate.

Historic PR numbers are leads only; re-check current status, conflicts and workflow results before merge.
