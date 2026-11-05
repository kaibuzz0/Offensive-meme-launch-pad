# Meme City — Terrain-Only Rebuild Progress

**Working branch:** `codex/seeded-worldgen-rebuild` (PR #36)
**Production policy:** Existing World V1 at `city.html` remains the default until terrain mode is robust; no original saves deleted. Owner requested incremental main merges of tested milestones.

## Product scope for the present rounds

Rebuild the map first. A fresh player creates a unique seeded world with all **132 distinct named biome variants** present in the initial generated atlas. Nearby surface chunks should load and render consistently in the *existing* `city.html` page. Roads, buildings, settlements, NPCs and gameplay combat are **not** part of the new terrain view yet. Reopening should keep the same seed and position. This is a terrain-only phase, not a claim of complete 3D Minecraft mechanics.

## Milestone 1: implementation

- `city-worldgen.js` preserves procedural 16×16 chunk data and -64…+256 voxel sampling, with `createWorld(seed,{terrainOnly:true})` now omitting streets, settlement sites, structure footprints and settlement-based spawn. Legacy generator APIs remain available for future phases.
- `city-terrain-world.js` reuses the 132 distinct names, groups, palettes, and materials from the original `CityFrontier.regions` **as a catalog**, not fixed locations. Each world seed deterministically shuffles and jitters 132 anchors in the starter atlas; climate warping creates irregular region boundaries. Every named biome appears at its own anchor, checked by automated tests.
- `city-terrain-mode.js` renders these generated tiles in the canonical `city.html` Canvas on `?terrain=1`, provides keyboard, d-pad and mobile thumbstick exploration, has no buildings, roads, NPCs or active economic gameplay, and draws chunks through a bounded 64-chunk LRU.
- Seed and player position are kept in new terrain-specific `localStorage` keys, distinct from the preserved World V1 save. New seeds do not overwrite older seed-keyed position records.
- `city.html` advertises the opt-in terrain mode. The default original game continues unchanged for existing players.
- Both static GitHub Pages and local Chromium-test server manifests include the new scripts.
- Automated tests check unique 132-biome coverage, different seeds, blank terrain chunks, deterministic chunk seams, geology and the cache bound. Real mobile-sized Chromium terrain-entry and save-reload QA has been added to CI.

## What this is **not** yet

- Not a free-roaming 3D voxel/greedy-meshed renderer; current view is a simple top-down terrain canvas.
- Not asynchronous Web Worker chunk streaming, IndexedDB chunk-edit storage, voxel movement/collision or persistent mining.
- Not an endless distribution of all 132 biomes. The initial atlas guarantees one seed-specific region per biome, but the next round must introduce repeatable outer-region anchors without edge domination.
- Not active NPCs, streets, generated buildings, multiplayer, quests or combat.
- Not a replacement of the existing character engine or the public default World V1 entry.
- Not a measured physical Android FPS/thermal acceptance run.

## Estimated progress (engineering judgment, not automated percent)

**Terrain-only map milestone (round 1):** approximately **55%** of the way to an Android-tested, selectable generated-world map.
**Complete sandbox world (round 1):** approximately **15%**, because voxel physics, infinite region streaming, 3D meshing, world editing and multiplayer remain.

The estimates cover the explicitly agreed map-first scope, and will be revised after each verified batch rather than presented as exact completion measurements.

## Next verified batch

1. Make biome anchors scale into seamless repeating procedurally placed regions beyond the starter atlas, while retaining all 132 guaranteed initial biome types.
2. Move chunk generation into a Web Worker and apply strict per-frame upload, eviction and memory budgets for Android.
3. Use one shared terrain coordinate system for player/avatar representation and material collision; eliminate the temporary terrain-only marker movement.
4. Add a real browser test of biome atlas and seed switching; profile first-frame and camera movement performance on mobile.
5. Switch the public default only after the new terrain mode achieves acceptable mobile usability; preserve legacy save entry as an explicit selectable option.

**Merge gate:** Full Node, asset/static, original World V1 Chromium regression, new terrain Chromium smoke, and successful GitHub Pages deployment. Preserve existing saves. Never force a destructive default-world migration.
## Milestone 2 — Quarter-meter first-person wilderness (PR #37)

**Visual target:** A distinctive realistic wilderness, not an imitation of Minecraft textures or UI. The present native WebGL renderer is a procedural foundation; it does **not** meet photorealistic visual quality yet.

**Block scale and world height:**
- One voxel edge = **0.25 m**, one-sixty-fourth of a standard 1m cube's volume.
- Player reference height = 7.2 voxels (1.8m). Eye height = 6.4 voxels (1.6m).
- Underground bedrock = -256 voxels (-64m), maximum world elevation = +2048 voxels (+512m), water level = 112 voxels (28m).
- Terrain noise produces different mountain ridges, hills, river-cut channels and submerged basins, with separate alpine, tropical, desert, volcanic, grassland and other family influences.

**Implemented on opt-in generated-world path:**
- First-person WebGL camera with mouse/touch drag, relative WASD/d-pad/joystick movement, persisted viewing angles, top-down fallback and atlas switching.
- Biome-conditioned, seed-stable 3D vegetation prototypes: pines, broadleaf trees, palms, mushrooms, cacti, shrubs, grasses, flowers, reeds, crystals and rocks.
- Terrain surface and exposed sides, bounded GPU chunk-cache, near/far mesh LOD, blue water surfaces, sky gradient/sun glow, directional sunlight approximation, distance fog, texture-free procedural material grain.
- Seed-generated 3D caves and ore/bedrock sampling, but underground tunnel meshes and physically enterable caves **remain incomplete**.
- Separate terrain save namespace; no alteration of legacy Solo game saves, wallet, NPCs, buildings or streets.
- Native browser/Node unit checks for 132-biome catalog, seed variation, quarter-voxel scale, mountains, caves, plants, seam continuity, bounded geometry and mobile-sized Chromium entry.

**Quality and technical limitations:**
- First-person camera currently follows sampled terrain elevation, **without full player collision, jumps, falling physics or underground pathing**.
- Terrain materials use procedural colors and shading, not high-resolution material textures, physically based shading or real dynamic shadows. Lighting and water are visual approximations.
- Dense forest rendering and all 132 distinct biome-specific vegetation identities are not finished. Starter biome anchors still occupy an internally seeded 12×11 arrangement, not a geographically realistic unlimited ecology simulation.
- Far geometry uses a coarse 4-voxel sampling step; adaptive fog/LOD and Web Workers require subsequent optimization. No measured physical Android GPU/FPS guarantee.
- This is still an optional wilderness mode within **the same** `city.html`, not a second independent game or production replacement.

**Next graphics-intensive work:** biome-specific PBR material atlases with verified texture licenses, normal/roughness maps, ambient occlusion, cast shadows, better water and shoreline transparency, stratified forests with grass and leaf billboards/geometry LOD, eroded slopes and rock faces, real rendered subterranean caves, player collision and worker-based generation.

**Estimated progress after round 2 (not a precise metric):**
- Core first-person voxel landscape prototype: **~65%**.
- Realism-quality graphics and environmental simulation: **~20%**.
- Full Minecraft-like but original sandbox gameplay/world systems: **~20%**.

**Merge gate:** No release without exact-head tests, local legacy/game regressions, GitHub Pages integrity and mobile-sized Chromium verification. Keep original public mode and saves intact until a separately approved cutover.
