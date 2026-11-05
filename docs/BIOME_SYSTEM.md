# Existing one-world biome foundation

**Canonical entry:** `city.html`. **Engine:** unchanged `MemeCityCore.Engine`. **World:** the same 11,200 × 11,200 Center City. The additive `city-biomes.js` module loads after `city-core.js`, before the original map and renderer.

| Biome | World-space rectangle | Walkable destination |
|---|---|---|
| Pinewood Forest | x160–960, y2360–3160 | (560,2760) |
| Ashfall Dead Zone | x160–960, y6860–7660 | (560,7260) |
| Stonebreak Highlands | x9030–9840, y6850–7640 | (9435,7245) |

Use the original **Map** menu to mark each biome and navigate along the existing route system. The original Canvas draws cached, distinct forest, rubble or stone ground material plus pine/brush, dead-snags/debris or boulders/tufts in the same depth-sorted scene. Map and minimap show the biome patches; the full map has labels and a legend.

**API:** `CityBiomes.regions`, `materials`, `regionAt(x,y)`, `terrainAt(x,y)`, `noise(x,y,seed)`, `drawGround(ctx,visible)`, `scenery(ctx,visible)`, `drawMap(ctx,sx,sy,ox,oy,compact)`. Queries return `id`, `regionId`, `material`, `footing`, `roughness`, `walkable` and `buildable`. All three regions are walkable, and none grants construction rights at this stage.

**Runtime limits:** Three lazily created 420×420 cached Canvas textures (~2 MB combined RGBA). No per-frame noise generation. Decorations are deterministic, non-solid, at most 96 across the map and culled by the live viewport. The original `CityDistricts.land()` full-world draw is unchanged, and should be profiled separately on Android hardware.

**Preservation:** Original collision map, roads, quests, world dimensions, shop/door IDs, fortress plot and saved pieces, save key/schema, multiplayer simulation and wallet flows are untouched. Decorative scenery has no physics, loot, persistent damage or hitboxes. No V2 pages or world seed generator are activated.

**Construction milestone:** Add a separately authorized bounded construction-test lot; use `terrainAt()` to validate materials in addition to original `C.blocked()`, ownership and server permissions. **Destruction milestone:** attach material and HP only to designated noncritical, recoverable objects, never auto-apply damage to all decorative scenery. A future seeded extension can consume the same material interface without changing the existing save identity.
