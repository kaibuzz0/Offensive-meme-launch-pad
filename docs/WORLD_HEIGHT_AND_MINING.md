# Meme City — bounded vertical mining layers

**Status:** Draft PR #29; unmerged and not deployed. This is the first playable underground mining slice in the **existing** World V1 Canvas game, not a replacement 3D engine or a server-driven voxel world.

## Vertical world coordinates

Horizontal player map coordinates remain `x` and `y` across the existing 24,400 × 14,400 single world. The new independent **vertical coordinate is `z`**, so historical y positions and saved player locations do not change.

| Limit | World z | Rule |
|---|---:|---|
| Maximum world height | +256 | Hard bound for future elevation-aware construction and world edits |
| Existing ground/surface | 0 | The active top-down street movement and combat plane remains here |
| Mineable stratum 1, topsoil | −8 | Dig into the subsurface |
| Mineable strata 2–7 | −16, −24, −32, −40, −48, −56 | Procedural stone, coal, copper, iron, quartz, gold and crystals |
| Bedrock floor | −64 | Solid, unbreakable lower boundary |

The exported immutable `MemeCityCore.WORLD.vertical` defines `{minHeight:-64,maxHeight:256,surface:0,stratumHeight:8}`; `CityMining.validZ(z)` rejects non-integers, out-of-range elevations and non-finite values. **This does not create 3D walking, airborne blocks, vertical NPC AI or Minecraft-style voxel camera navigation.** World V1 still moves actors on a ground plane; the mine is a controllable vertical cross-section UI in that same world.

## How to mine in the playable game

1. Walk into one of the **132 added frontier biomes** (the protected 11,200-square city and three earlier demonstration biomes remain untouched).
2. Choose **Mine** on the existing game toolbar or main menu, press **E / Mine** while away from a survey post, or select **Mine beneath this biome** at a frontier survey.
3. A 5 × 5 interactive dig-site panel opens. A free starter pickaxe removes the selected surface tile and records the removed block.
4. Dig the **highlighted central shaft** at the current level to unlock **Descend**. A new depth can be opened only if that same shaft has been cleared through all preceding levels.
5. At depth, tunnels may expand only into horizontally adjacent tiles from previously cleared underground rock. You cannot mine a distant underground block, skip a layer, or dig through bedrock.
6. Your collected **local sample counts** appear in the Mining panel and the Gear panel. These **are not tradeable or spendable** until a future verified resource economy exists.

All mining occurs while paused in the original Solo game; closes back to the exact same world position.

## Terrain, cache and sparse save

`city-mining.js` is a native JS module (no source copied from bareiron/irongingot). It builds deterministic geology from the existing `CityFrontier.SEED`, region seeds, fixed 32-unit XY cells and depth index. Unmined blocks require **no storage**. Only player-excavated entries are persisted, never terrain textures, ore totals, avatar state or new world definitions.

Separate browser-local key: `offensive-meme-city-v1-mining-v1`.

Data contains only `{version:1,seed,minHeight,maxHeight,blocks:[<validated excavation IDs>]}`. Each entry identifies a biome, layer, cell XY and entrance shaft XY. On load, the module validates all IDs, bounds, depth order, accessible shaft, adjacent tunneling, duplicate blocks and the global/biome excavation caps **before allowing subsequent edits**. An invalid record fails closed without rewriting its bytes. Failed writes do not award material samples. Other-tab changes are detected before writing, to reduce lost progress; browser localStorage is not a transactional multi-device service.

Global cap: **512 excavated blocks** per local journal. Per-biome cap: **96 blocks**. The ore inventory is recomputed deterministically from saved block IDs; it cannot be supplied through the save document as a separate trusted numeric balance.

The **original protected player save remains** `offensive-meme-city-v1-center` (schema v6, layout v2); the separate frontier exploration journal is also unchanged. Mining does not grant XP, play credits, crypto assets, combat advantages or server inventory.

## Multiplayer and security boundary

Online room mining is **explicitly disabled** in this milestone, since the existing authoritative room server does not yet own world-edit permissions or a persistent chunk database. Do not treat local mined resources as verifiable currency or shared inventory. Future online mining will require server-side coordinate and material validation, tick limits, ownership/claims, chunk-based sparse persistence, race conflict handling, and recovery before launching player-to-player transactions.

## Acceptance

Automated tests cover the exact world height ceiling and bedrock floor, all frontier regions, blocked city mining, every permitted stratum, shaft access, lateral tunnels, deterministic ores, save/reload, validation on bad records, multiple tabs, and storage failure. Real mobile-sized Chromium tests exercise the **actual playable mining UI**: excavate topsoil, descend, excavate the second level, and validate persisted block deltas and no-credit reward behavior.

**Physical Android device performance/thermal testing and art review remain outstanding.** Do not merge PR #29 or deploy without explicit owner approval.

## Next work

Render physical mine entrances and tunnel walls on the normal world Canvas; implement character depth/state and vertical camera navigation only after a physics specification and server authority design; add tools/durability, harder material mining times, local structural stability, and audited extraction resource economy. Preserve the current Mono/Canvas map and Solo game until the new capabilities have passed regression and owner approval.


## Milestone follow-on: rendered shafts and traversable depth slices

The same protected Solo excavation journal now drives **two native Canvas renderers**, through `city-mine-visuals.js`. The original outdoor World V1 camera paints a small recessed opening for every actually removed topsoil tile. Central shaft openings show a rope and mine label; their shading uses the deepest successfully excavated shaft block. The original map displays gold dots for known shaft entrances; players can tap them or use the added mine-entrance waypoint controls to walk back using existing collision-aware routes.

A second **640×350 Canvas cutaway inside the original Mining panel** renders each 5×5 mine as 2.5D native blocks, walls, ore flecks, open passages and a miner figure. It reads the same deterministic `CityMining.blockAt` material data and the same validated `CityMining.createStore` sparse edit journal. It is not a new game world, world map, voxel server or separate saving scheme.

A `CityMining.createExplorer(store,surfacePlayer)` session tracks the **underground avatar's local offset and z depth** from the old surface character. You can dig adjacent rock, descend once the central shaft has been excavated, and use four accessible North/South/East/West movement buttons to walk **only on already opened cells**. Ascending/descending requires returning to that central shaft. Player depth respects the seven mineable levels, the −64 unbreakable bedrock floor, and the +256 global height ceiling.

**Important boundary:** The underground miner's session position is *temporary*, not written into the existing character save and does not move the authoritative street-combat actor. Closing the panel returns the character to its unchanged original surface coordinates (z=0). Players cannot fall into non-collidable visual holes. Online room mining remains disabled until shared server-authoritative mining actions, validation, persistence and collision/depth replication have been implemented and tested. The `surfaceOpenings` array is cached and invalidated only after a committed rock excavation, avoiding repeated journal parsing every rendered frame. Corrupted journals fail closed, including any otherwise plausible prefix; no partial sample totals or shafts are exposed.

**QA:** Node tests verify actual surface opening coordinates/depth, view culling, cache invalidation, reload, shaft navigation, blocked movement, altitude bounds and Canvas drawing. Mobile-sized Chromium exercises an actual two-depth mine, moves the miner to a newly excavated adjacent tile, checks both renderer surfaces, confirms all three edits persisted and verifies that credits and the original saved player are untouched.

**Next milestone:** the room server, not a browser, must own world-edit history, player z, ore inventory and construction restrictions before releasing full free-roaming shared underground physics, destructible terrain, trading or real-time online resources.

## November 5 review fix: mine entrance visibility across camera transitions

Corrected a rendering-only bug in the validated Solo excavation sidecar. Previously, the first camera to query `surfaceOpenings(viewportPredicate)` could permanently limit the in-memory cache to just those visible openings. Other entrances could disappear from the outdoor Canvas or be omitted by the map until a new mining edit invalidated the cache.

Now the cache always contains the entire (at most 512) set of validated openings, and each viewport gets a separately filtered result. Surface geometry is still invalidated by a successfully committed excavation, never by a rejected or failed write. The map receives all shaft waypoints, including those outside the current camera. Regression tests cover two distant regions, zero-visible cold-cache queries, depth updates and reload.

The welcome HTML now distinguishes seven playable mining levels (down to z=−56), unbreakable z=−64 bedrock, and the **+256 ceiling reserved for future mechanics**; it does not claim current buildable 3D space. `city-mining.js?v=50-shaft-cache` ensures browsers fetch the corrected module. No gameplay balances, existing player location, original save schema, wallet or online mining authority changed.
