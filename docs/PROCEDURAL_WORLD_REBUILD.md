# Meme City — Fresh Procedural World Rebuild

**Decision:** The intended final game is a seeded, procedurally generated sandbox world, not the existing 24,400 × 14,400 fixed city with a 132-cell biome extension. This is an architectural reset of terrain and world layout, **not** a reset of the user's existing saves without permission.

## World contract

- **One world per seed.** Creating a world chooses a unique user-visible seed once. Every chunk and vertical block generated from that seed must be identical when reloaded or generated in a different order. World chunks are generated on demand; no predetermined "Center City," coordinates for six clan areas or rows of exactly 132 locations.
- **Seamless clustered biomes.** Temperature, moisture, height and anomaly vary over smooth, seeded noise at scales larger than chunks. Neighboring chunks sample the exact same functions. Biomes form irregular geographic clusters, not artificial straight grid boundaries. Multiple distinct biome archetypes can appear anywhere as local climate dictates; the count of *regions* is not hard-coded.
- **Actual terrain height and vertical geology.** Every column has a procedural surface height; block heights are quantized to the 8-unit vertical grid between -64 bedrock and +256 world ceiling. Caves are carved by deterministic 3D noise. Ore and stone layers are generated from the surface downward. The last layer is permanent unbreakable bedrock.
- **Actual procedural civilization.** Settlement sites are selected by seed in coarse spatial cells and tested against local terrain. The seed determines whether a site contains a village, town or city and its name, roads, parcel arrangement, building styles and positions. A later phase must connect these sites with generated trade roads, building entrances, interactable services and NPC population. No hard-coded list of 47 required doors or fixed clan HQ coordinates in new worlds.
- **Other content follows the same rules.** Trees, vegetation, resources, water, ruins, dungeons, factions, quests, market services, enemies, structures and player building must be chunk-local and seeded (or stored as authenticated player edits), rather than sprayed over a fixed scene. Features are unloaded outside the active radius. Local and multiplayer clients must agree on seed, generator version and authoritative edits.
- **Spawn is generated.** The player starts at a seed-specific safe settlement crossing. Save files pin the exact world seed, generation schema and player location; different seeds create independent worlds.
- **One playable world.** Reuse the established game's input, shared NPC/avatar rig, wallet verification, combat and HUD as integrations become possible. Do not ship a permanent second game or claim that a graphics-only scene is a playable world.

## First working foundation (in this branch)

`city-worldgen.js` is a **pure, dependency-free generator**. It currently provides:

| API | Behavior |
|---|---|
| `createWorld(seed)` | Immutable seed-specific generator |
| `climateAt(x,y)` | Domain-warped height, temperature, moisture, anomaly |
| `biomeAt(x,y)` | Smooth, seed-dependent classification among 14 environmental archetypes |
| `settlementCell(cx,cy)` | Seed-placed and terrain-qualified settlement candidate |
| `settlementsNear(x,y,radius)` | Nearby generated villages/towns/cities |
| `spawnAt()` | Deterministic starting settlement, not a fixed old map spawn |
| `chunkAt(cx,cy)` | 16 × 16 generated surface with settlement roads and building footprints |
| `blockAt(x,y,z)` | 8-unit vertical block material, caves, ores and bedrock |
| `sliceAt(cx,cy,z)` | One bounded 16 × 16 underground/above-ground height slice |

Chunks are addressable at positive or negative tile coordinates. Terrain and settlements are generated from integer hashing and continuous noise without `Math.random()`, external packages, remote assets or reliance on `MemeCityCore.WORLD`. No new world writes to LocalStorage. Nothing automatically migrates or deletes the existing canonical V1 world.

**This is generator data, not yet playable terrain.** There is no gameplay collision, persistent mining edit integration, procedural surface renderer, streaming building interiors, online authority, life simulation, water simulation or Android performance proof. It must not be described as a finished Minecraft-like game yet.

## Required implementation order

1. **Seeded generator and stability tests — started.** Confirm varied seeds, biome clusters and chunk boundaries, 3D geology through -64 bedrock, generated roads/buildings and safe spawn.
2. **Real chunk streaming and terrain rendering.** Replace the old fixed-map view/greenbelt with generated terrain loaded around the same player. Render visualized hills, caves, vegetation, water and blocks within memory budgets; chunk coordinates must be continuous when crossing edges. No secondary player engine.
3. **Collision and authoritative world editing.** Replace hard-coded obstacle arrays with material/voxel collisions. Implement dig, mine, place, fall, jump, climb, roof height and safe terrain entry using the *same* generated coordinates. Store sparse player edits separately from seed-derived untouched terrain.
4. **Procedural settlements and NPC functionality.** Generate connecting roads, shops, building doors/rooms, settlement roles, pathfinding and living residents. Retain combat and faction logic but place content from generated sites rather than fixed addresses.
5. **New-world creation, save isolation and migration.** Create a seed selection/random seed screen in `city.html`, start a fresh save namespace per world with a generator version, and preserve existing World V1 progress as a separately selectable legacy save. No silent migration or clearing of site data.
6. **Multiplayer world agreement.** Server must verify seed, generator version, authoritative edit journal, player blocks and interactions. Old guests and old rooms must never join a different generated world with mismatched coordinates.
7. **Release candidate.** Real Android hardware performance, main browser acceptance, terrain collision tests, mining/saving after restart, multiple seeds and cross-chunk consistency. Only then switch the canonical game to the new generated-world experience.

## Design rules

- **No fixed 132-biome map.** Fourteen environmental *types* are currently possible, with no predetermined map regions or number of naturally occurring patches.
- **No arbitrary fake map size.** The generator works in chunk coordinates rather than a single pre-sized rectangular landmass, though practical streaming and storage limits apply.
- **No surface-only fakery.** Underground samples and caves are derived from the same x/y/z coordinates as the surface.
- **No hidden save overwrite.** Existing Solo/Together state, wallet connection and token holdings are left unchanged until explicit tested migration.
- **No unapproved production merge.** This branch is the start of the rewrite and not the completed generated world; all existing deployed code remains usable while the new world architecture is developed.
