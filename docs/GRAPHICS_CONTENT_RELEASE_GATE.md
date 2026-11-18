# Graphics/content integration gate — 2026-11-18

Owner: #43 integration, #46 rendering/content, #53 flight. This supplements [CANONICAL_GAME_RELEASE_CONTRACT.md](CANONICAL_GAME_RELEASE_CONTRACT.md) and [DEVELOPMENT_COUNCIL.md](DEVELOPMENT_COUNCIL.md), not a separate engine or release edition.

## Current decision and smallest shared batch

**Rung A is still unaccepted.** Preserve the current homepage `city.html?terrain=1` route and recoverable legacy URLs/saves while migration and parity remain unverified. Do not remove original Solo or compatibility entry URLs yet. Do not introduce a separate low/normal/high game or a second world model.

Next shared acceptance batch: homepage Play → wallet-free Solo → recognizable fortress/mountain skyline → wooded road → lit interior → gather resource → place a voxel → collide with it → reload with the edit and correct inventory. Require a screenshot from player eye level and a browser interaction trace, not just green unit tests.

| Owner | Scoped deliverable | Shared interface / gate |
|---|---|---|
| #48 Sandbox | Single durable, idempotent resource debit + voxel edit commit; no duplicate charges | Stable edit ID, world seed, revision, inventory ledger; validated save/readback and rollback |
| #49 Physics | Collision queries see exactly the committed edits, not stale or speculative cells | World-space geometry IDs, 0.25 m voxel scale, bounded fixed-step queries |
| #45/#56 Living World | Stable starter landmark/road/interior IDs and material descriptors | Seed + worldgen version + instance ID; preserve edits across regeneration |
| #46 Graphics | Render those exact world/geometry IDs on WebGL and compatibility paths | Shared immutable world snapshot, material IDs, scene revision; no independent collision or saves |
| #47/#57 QA | Exact-head Node/check + desktop/mobile Chromium route, offline/reload and renderer parity | Capture seed, commit, browser/device, frame-time percentiles, stalls, memory/mesh/cache metrics |
| #43 Release | Review dependency order and passing PR heads, merge only compatible verified changes | Main/Pages commit evidence, homepage-to-game screenshots and save migration rollback |

## Renderer and visual content contract

- Renderers consume one canonical seeded world snapshot, persistent edit journal and actor/equipment state. Renderer choice is automatic, with adaptive resolution, view distance, shadows, LOD and work scheduling based on measured frame-time and memory. It never changes objects, collisions, interactions or saved progression.
- A reusable content definition uses a stable ID, schema version, category/tags, geometry/material reference, optional rig/animation/socket IDs, bounded capabilities/stats, acquisition/recipe, persistence ID and asset provenance. Keep mutable player/world state separate. Unknown or retired IDs survive migration in a recoverable quarantine rather than silently disappearing.
- Use existing player firing rig and compatible NPC rig. Shared socket names and equip IDs drive first-person held objects and world-visible avatar. First wardrobe release is a **small set of free** headgear/jacket choices with real preview, equip, clipping validation and save/reload; optional token cosmetics do not gate Solo.
- Building kits reuse a small palette of foundation/wall/roof/door/window/light parts. Generated and player-placed parts use identical world IDs and collision/edit queries. Prioritize fortress/road/interior silhouettes, terrain fit and readable lighting over unbounded asset catalogs.
- Reuse/instance geometry, batch surfaces, cull hidden faces, bound worker/mesh/cache queues, unload obsolete assets and avoid loading unused wardrobe/catalog data at startup. QA measures quiet and crowded scenes before claiming speedups.
- Reference archive `makethegameactuallylooklikethis.zip` is a visual direction only; its contents and asset licenses must be inspected before reuse. No proprietary reference assets are authorized for copying.

## Migration and flight dependency

1. Inventory existing entrypoints, generators, stores and renderer paths on current main; preserve source history and raw save backups.
2. Introduce versioned, repeat-safe preview migration with validation and explicit unmappable-record retention; test interrupted write and repeated migration.
3. Verify same seed, geometry IDs, collision, equipment and edits in accelerated and compatibility renderers. Only then redirect old public entry URLs and remove duplicate public mode selectors.
4. #53 flight waits for #52 shared seat/entry/exit/controller/save contract and #49 collision queries. Aircraft uses the same world/player state, camera/input abstraction and persistence; no flight-only map. Test takeoff, landing, collision, reload and touch controls before promotion.

## Research handoff

Check #44's existing shortlist first. Prefer a focused meshing/instancing/rig or asset-conversion component only after recording exact upstream revision, license/attribution, transitive size, WebGL1/Android/offline fit and measured baseline impact. No engine migration solely on source size. The immediate construction/render parity gate can use the existing journal and renderer; a new dependency is not justified without a measured blocker.

**Evidence status at authoring:** This file is an integration plan, not implementation, a physical-device benchmark, a successful browser test or a public deployment. PR #199's journal batch is not yet a durable inventory transaction; draft QA PRs #201/#203/#204 require exact-head verification.