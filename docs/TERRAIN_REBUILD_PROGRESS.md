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

## Milestone 3 — World realism foundation (PR #38)

**Scope:** Keep the original `city.html` game untouched for default visitors. Improve its opt-in `?terrain=1` first-person wilderness only. All 132 existing named biomes remain seeded in the first world, with no streets, NPCs, buildings or wallet integration in the generated terrain.

**Added:**
- Deterministic cave-mouth depressions, steep exposed rock bands, mineral/soil/snow/mud/sand shore material families and increased biome-dependent plants. Cave mouths have seed-stable coordinates and dark rock interiors; full tunnel meshes and spelunking are **not** claimed.
- Low-poly but more organic eight-sided tree canopies, layered conifers, palm fronds, 3D shrubs, rocks, mushrooms, flowers and grass clusters instead of only cube foliage; contact ground shadows and foam strips where open water meets land.
- First-person **quarter-meter** step collision, gravity and jump arc with a mobile Jump button, keyboard Space and safe seed-derived spawn selection. This remains surface-heightfield physics: no true volumetric caves, arbitrary voxel collision, swimming, mining or multiplayer authority.
- Terrain generation optimization: cave-mouth lookup is constant-time per sample rather than querying nine cells.
- New regression tests for deterministic cave entrances, natural material variation, geometry, slope collision, gravity, safe landings and mobile browser control availability. All GitHub Pages/local-server asset manifests updated.

**Graphics standard:** Goal remains realistic, original open-world environments. Current lighting is a shader approximation, not photoreal PBR. No licensed high-resolution albedo/normal/roughness atlases, dynamic shadow maps, ambient occlusion pass, physically simulated water or plant wind rigs are present.

**Progress estimate after this milestone (subjective project tracking):**
- First-person terrain prototype: **~72%**
- Realism-quality environmental rendering: **~28%**
- Full world/gameplay rebuild: **~23%**

**Next priority:** Render fully excavated caves with three-dimensional surfaces, subterranean light and collision; create a material atlas with verified permissible textures, add dynamic directional shadows/normal maps, then worker meshing and physical Android thermal/FPS testing. Do not claim full realism, full caves, or performance readiness until each is verified.

**Merge gate:** exact-head Node tests, static Pages integrity, legacy browser regression, first-person mobile-sized Chromium smoke; then incremental main merge, deployment check and preserve legacy saves.

## Milestone 4 — First underground galleries and bounded GPU material rendering (PR #39)

**Round 4 release scope:** Incremental `city.html?terrain=1` work. Keep World V1 as default and protect the pre-existing local seed and legacy saves. Preserve all 132 biome variants, without adding streets, NPCs or buildings.

**Underground world integration:**
- Seed-derived cave entrances now continue into short underground galleries in the **same** X/Y/Z coordinate system. The tunnels have carved 3D `blockAt` air occupancy and near-chunk floor, vaulted ceiling, wall and occasional mineral geometry.
- The terrain renderer cuts cave openings in the taller exterior cliff mesh so the gallery entrance is not hidden by an opaque terrain wall. A player descending through the mouth can follow an underground floor. The first-person physics controller prevents jumping through a solid roof.
- Geology and galleries remain deterministic across reloads, with bedrock and existing non-gallery cave sampling intact.
- These are **short starter tunnels**, not interconnected cave systems, vertical shafts, comprehensive underground lighting, destructible cave blocks, mining, flood simulation or fully audited 3D capsule collision. Some steep entrances may still require tuning; never claim full cave exploration finished.

**Rendering and memory:**
- WebGL1 procedural multiscale rock, soil and mineral variation adds fine gravel, larger rock pattern, strata and simplified water sheen without fetching third-party textures.
- Progressive near/far chunk meshing remains in effect. GPU residency now enforces a 24 MiB mesh buffer budget with farthest-first eviction; this bounds **mesh buffers**, not the browser's total memory, shader textures, framebuffers or JS heap.
- In-game status indicates underground camera state and exports current GPU buffer bytes for automated browser QA.

**Verification:** Add targeted deterministic gallery topology, rendered mesh, same-world controller/roof collision and save-isolation tests, plus the exact-head full GitHub regression suite and mobile-sized Chromium WebGL checks.

**Not accomplished:** Production photorealism, physically based texture/normal/roughness material atlases, cast shadow maps, realistic water transparency/reflection, diverse biome species models, background-worker geometry generation, full nonlinear cave networks, persistent mining/terrain edits or physical Android battery/thermal/FPS measurements.

**Project-progress engineering estimates after round 4:** first-person terrain prototype **~78%**, realism-grade environment visuals **~34%**, full original sandbox **~26%**. These are subjective scope estimates rather than verified completion metrics.

**Next round:** Expand from short seed-stable galleries to connected underground chambers and caves with robust collision/navigation, profile on Android, and adopt vetted realistic material atlases with license notices and reduced-memory LOD textures.
## Milestone 5 — Connected cavern pockets and adaptive graphics (PR #40)

**Completed in code (verification required):**
- Existing seeded 112-voxel cave-mouth placements and saved world seeds are retained. Each eligible cave region contains the original entrance gallery, an approach passage, two deterministic underground chamber regions and a connector. This is a **small cave complex** rather than a world-spanning tunnel system.
- Surface, cave floors/roofs, air blocks and first-person movement all remain in one X/Y/Z coordinate system. A new metadata cache is capped at 256 cave cells.
- The current player-relative foot elevation is saved as an optional `vertical` attribute in the existing terrain-specific local save. Earlier saves lacking this attribute remain readable. Existing World V1 saves are untouched.
- Underground camera position drives a local warm lantern-style lighting approximation, darker fog and nearby cave illumination via WebGL1. This is **not** full global illumination, volumetric light, physically-based shading or dynamic cast shadows.
- Browser rendering uses an adaptive chunk view radius of 5–7, based on sustained frame delay; frame-time estimates are surfaced in the HUD. The preexisting 24 MiB resident GPU buffer cap and detailed-near/coarse-far mesh system stay in effect.
- New deterministic tests check chamber-to-chamber traversable floor topology, geometry consistency, seed variations, bounded caching and restoring vertical depth; the browser test covers 132 biomes, cave API, view radius and mobile-sized WebGL startup.

**Remaining limitations:** Neither all underground caves nor the full random geology field is yet represented as enterable mesh. Only authored pocket complexes are rendered. Many caves remain unexplorable noise-field data. Player collision is still heightfield-plus-gallery, not a fully robust swept 3D capsule. The lighting is an artistic approximation. Realistic licensed material maps, occlusion/shadows, detailed biome vegetation models, transparent water, background chunk workers and measured physical-Android FPS remain unfinished.

**Estimates after Round 5 (engineering judgment, not measured):** first-person landscape **82%**, realistic environmental rendering **38%**, full sandbox/world gameplay **29%**.

**Next suggested milestone:** Expand underground routing into larger multi-elevation cave systems, robust player collision, and worker-based chunk mesh production. Follow with licensed PBR texture maps and cast shadows (budgeted for Android), accurate water and shoreline transitions, and physics/navigation/browser regression across multiple saved seeds.

**Release criteria:** exact-head Node tests, static asset/Pages validation, legacy World V1 Chromium and terrain-mode Chromium must all pass before incremental merge. Confirm successful deployment and preserve legacy saves.
