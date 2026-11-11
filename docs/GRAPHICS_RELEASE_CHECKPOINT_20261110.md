# Graphics / release integration checkpoint — 2026-11-10

This checkpoint is a scoped addendum to [DEVELOPMENT_COUNCIL.md](DEVELOPMENT_COUNCIL.md), not a replacement for current source inspection. **Status: contract-only PR; no playable changes or public deployment claimed.**

## Immediate release batch (rung A → B)
1. **#43 integration:** Inventory actual homepage Play targets, `city.html` query variants, PWA links, current main/PRs, and storage keys before redirecting any URL. Select the existing first-person `city.html?terrain=1` path provisionally, subject to browser acceptance. Coordinate shared bootstrap changes. Keep offline wallet-free Solo reachable.
2. **#45/#56 Living World:** Supply stable IDs and terrain/collision queries for the fortress skyline, wooded road, lit lodge and interactable supply node. Seed, worldgen version, and chunk identity must be deterministic.
3. **#48 Sandbox:** Implement one resource pickup → workbench/place → save/reload transaction using shared item IDs, with repeated-input protection. Own inventory mutations and legacy key inventory.
4. **#46 Graphics:** Consume those same IDs/poses for both accelerated and compatibility rendering. Deliver actual visible fortress, mountains, trees, lodge lighting, readable supply affordance; no alternate flat world. Define shared avatar/held-item socket contract before wardrobe implementation.
5. **#49/#52 Physics:** Supply one fixed-step controller and world collision, including mobile movement/look and future vehicle seat/entry contract. No flight-specific duplicate player controller.
6. **#47/#57 QA:** Record desktop/mobile-emulated evidence for homepage → world → pickup → interior → placement → reload; inspect screenshot pixels, coordinates, localStorage, WebGL/fallback parity and console failures. Report startup and p50/p95 frame time, long tasks, memory proxies, mesh/draw count and cache growth; distinguish physical Android measurements.

## Required contracts before merging feature branches
- **WorldSnapshot:** `{seed,worldgenVersion,chunkId,objectId,geometryId,collisionId,revision}`; renderer receives immutable world view and player pose; gameplay owns mutations. Any renderer-specific LOD is nonauthoritative.
- **PlayerState:** versioned world/position/orientation, inventory ledger, equipped IDs, cosmetics, edits and vehicle seat; solo and multiplayer consume the same gameplay transitions, with server validation in multiplayer.
- **RenderState:** same world object IDs, geometry, interactions and equipment across WebGL/fallback; automatic detail can change only visual sampling, never world identity or collision.
- **Save migration:** inventory legacy keys → copy originals to backup → parse/validate migrated schema → readback verification → activate pointer atomically; repeated runs are no-ops, unknown fields preserved in a quarantine envelope. Test interrupted migration and rollback.
- **Flight #53:** defer activation until shared seat/vehicle/save and collision contracts land. Flight may supply a bounded fixed-step model, but no second world, controls or camera implementation.

## Merge/release evidence
For every candidate record PR number, exact head SHA, base SHA, conflict status, Node checks, Chromium desktop/mobile, original Solo, migration, renderer parity, and deployed Pages SHA. Never equate green unit tests with screenshot/interaction acceptance. Hold drafts, failures, conflicts and visually unverified gameplay changes. Historical #80 is reported merged in #43; do not recreate it without fresh evidence.

## Next action
The smallest player-facing slice is **one reliable visible road-to-lodge interaction with saved pickup and reload**. Do not spend this release slice on a speculative engine migration or expanded wardrobe catalog. After the route passes, ship 2–3 free headgear/outfit choices using the existing avatar firing rig and one persisted loadout, then test first-person held item parity.

Reference archive `makethegameactuallylooklikethis.zip` has not been inspected for this checkpoint; no proprietary assets are authorized by the reference.
