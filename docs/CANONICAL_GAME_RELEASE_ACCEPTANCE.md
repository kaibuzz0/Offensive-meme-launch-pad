# Canonical game integration acceptance — November 11, 2026

This is an executable release checklist for council issue #43. It supplements [DEVELOPMENT_COUNCIL.md](DEVELOPMENT_COUNCIL.md), not a second game specification. No runtime migration or public redirect is authorized by this document alone.

## Source snapshot and ownership

The default-branch homepage currently links to `city.html?terrain=1` in navigation. This is the *candidate canonical bootstrap*, not proof of end-to-end acceptance. Inventory the remaining homepage links, query parameters, game scripts, service worker cache keys, IndexedDB/localStorage keys and PR heads immediately before implementation; do not rely on historical PR numbers or stale branch status.

| Contract | Owner | Required handoff |
| --- | --- | --- |
| Bootstrap, old-URL redirects, migration activation, release | #43 | One game initialization path and feature-flagged rollout; no early deletion |
| World generation, object identity, settlement/NPC definitions | #45/#55/#56 | Seed, worldgen version, chunk/voxel IDs, query and event APIs |
| Renderer, wardrobe/rig sockets, material kits | #46 | Render immutable world snapshots and player loadout; backend-independent entity IDs |
| Physics, seats, movement, ground vehicles | #49/#50/#52 | Fixed-step pose, collision and seat/vehicle state shared by all cameras |
| Inventory, gather/craft/edit ledger, ranged tools, drones | #48/#51/#54 | Atomic transaction IDs, stable item IDs, persistent edit schema |
| Browser/Android budgets, security, network parity | #47/#44/#57 | Baseline and exact-head evidence; client never authoritative for multiplayer rewards |
| Flight | #53 with #49/#52 | Same vehicle seat, collision, world-query and save interfaces; no second flight world |

Before modifying a shared bootstrap, save schema or controller, claim its path in issue #43 and identify downstream PRs. Do not merge overlapping controller or ledger implementations independently.

## Required data contracts

- **WorldSnapshot**: `seed`, `worldgenVersion`, `chunkId`, stable `objectId`, generated geometry references, validated persistent edits and immutable revision. All renderers and physics query the same snapshot; quality settings cannot change gameplay geometry or collision.
- **PlayerState**: `schemaVersion`, `worldId`, position/orientation/velocity, inventory, equipment/loadout, interaction progression, vehicle/seat reference and last committed revision. Solo and multiplayer use the same rules, with offline Solo wallet-free.
- **RenderView**: references the WorldSnapshot and PlayerState, plus *visual-only* render scale, LOD, shadows, view distance and queue budgets. The fallback renderer must retain object IDs, interactions and navigable geometry.
- **ContentDefinition**: stable ID, definition version, category/tags, mesh/material/rig/socket references, capability metadata and provenance; mutable per-player state lives outside definitions. Unknown IDs must not crash loading or silently vanish from backups.
- **FlightVehicle** (future): stable vehicle ID, world ID, pose/velocity, seat occupancy, controls, durability and persisted revision. The flight controller consumes the same fixed-step world queries and input mapping as ground vehicles.

These are interface requirements, **not** claims that the named structures already exist. Reuse existing APIs when equivalent rather than creating a parallel state system.

## Save migration: do not redirect before verification

1. Record old save keys, schemas, game modes, seeded world versions and entry URLs from the current source. Preserve fixture samples and create a recoverable backup of each original payload.
2. Implement a versioned `copy → validate → activate` migration. Keep source data untouched. Record a migration marker only after a complete readback of the new snapshot and ledger. Repeated calls must be idempotent.
3. Quarantine unmappable/unknown content IDs and old edits with provenance for later recovery; never discard them silently. Interrupted migration must restart safely.
4. Test old Solo and terrain fixtures, repeated migrations, interrupted writes, missing fields, incompatible worldgen versions and save/reload of edits, inventory, equipment and position.
5. Verify WebGL and compatibility renderers against identical seed, scene IDs, collision queries, interactions and save revision. Do not substitute a flat-map edition as a fallback.
6. Verify offline wallet-free Solo and PWA caching. Only then redirect historic URLs, remove duplicate public mode choices and retire obsolete runtime code. Keep source history and backup recovery instructions.

## Next public milestone: A → B

**Path:** Homepage Play → recognizable fortress and mountain skyline → wooded road → lit district/interior → collect supply → craft/place at workbench → save → reload → confirm object, inventory and position.

Minimum evidence per proposed release:
- `npm test` and `npm run check` on the exact PR head, plus Chromium desktop and mobile viewport runs with seed, route, screenshots and console errors recorded.
- Real clickable entry from the homepage; visible world and working touch movement, look and interact controls. Test fallback renderer on the **same** scene.
- Repeat pickup/craft input cannot duplicate resources; reload persists one committed transaction. Legacy save fixtures remain recoverable.
- Frame-time median/p95, startup bytes/time, stalls, draw/mesh counts and memory recorded for quiet and busy scenes. Distinguish software Chromium from a physical Android device; no invented improvements or targets.
- GitHub Pages deployment SHA, actual public URL and player-eye-level verification documented separately from passing tests.

## Release decision

**BLOCK** for blank startup, gameplay divergence between renderers, missing offline Solo, unrecoverable migration, broken inventory/edit persistence, severe stalls or absent exact-head browser evidence. A green unit-test count alone is insufficient. Do not merge draft/conflicted/untested feature PRs. Flight and large wardrobe catalogs follow the first complete persistent interaction, not the reverse.

## Reuse gate

Consult existing #44 shortlist first. For any proposed mesher/LOD/rig or asset library, record upstream pinned revision, LICENSE/attribution, transitive dependencies, offline/WebGL1 fit, bundle and Android impact, estimated integration effort and adopt/defer/reject outcome. No unlicensed asset copying or unmeasured performance claims.
