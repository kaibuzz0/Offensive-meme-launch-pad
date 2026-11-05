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


## Milestone A — terrain polish and survey interaction (draft PR #29)

- The forest, wasteland and highlands now use **the same deterministic irregular outlines** for the world Canvas, large map and `regionAt()`/material queries. Terrain edges no longer appear as rectangular color blocks. The original roads, story locations, collision and saved data do not move.
- Scenery now includes fern stands, flowers, stumps, salvage, rock fragments and strata in addition to pine trees, brush, snags, wreckage and boulders. Each biome's cached texture also contains a modest number of material-specific scratches and contour marks.
- The decorative population is capped at **144 generated props total** across three regions; only in-range items enter the existing depth queue, and just three survey posts are added. Props, signs and ground textures are **non-solid**; no server NPCs, damage, resource farming or construction permissions are added.
- Each biome has an **in-world survey post** located at its original map waypoint. From within 115 world units, use **E / SURVEY SITE** or the existing mobile **Interact** button. A local read-only panel displays a field note plus current terrain material and footing. No credits, XP, wallet requests, irreversible actions or saved flags.
- The game HUD displays the native biome name while inside its organic boundary. The survey action never overrides indoor activity, shop doors, active courier checkpoints or mission stations.
- Future development must not mistake survey posts for collectible or damageable objects. They are observation-only reference points.

### QA and remaining limits

Automated tests check render bounds, original fortress-to-biome route access, polygon/query consistency, survey proximity and gameplay unchanged. Mobile-sized Chromium paints actual survey signs and displays the original map buttons. Physical Android hardware acceptance and release approval are still necessary. Organic contours are hand-fixed within the same three greenbelt quadrants; this is **not** a world generator. Biome props remain intentionally walk-through art until authoritative collision and recovery rules are designed.


## 132-region continuous world frontier

The original three Center City biomes remain unchanged. A separate original JavaScript module, **city-frontier.js**, adds **132 distinct new regions** on the east side of the same world. See [FRONTIER_BAREIRON_ARCHITECTURE.md](FRONTIER_BAREIRON_ARCHITECTURE.md) for the full 12-family catalog architecture, exact world boundaries, legacy-save protection, memory budgets and source-code provenance.

The live world is now 24,400 × 14,400, with the old 11,200 × 11,200 city still occupying its original coordinates. Twelve families × eleven named, seeded locations = 132 new biomes, plus the existing three = 135 total. All 132 have climate, moisture, material and palette data with native scenery and survey posts. The family selector in the original Map menu exposes all destinations without replacing the map or adding teleportation.

Frontier textures are generated lazily into 192×192 Canvas tiles. The maximum LRU is 12 textures, plus 16 region prop caches (each up to 24 non-solid props). Terrain, navigation, and survey journal are deterministic; no full-map payload or textures are written to Solo save. Original player save version and key are unchanged; frontier observations use a separate validated localStorage journal. No active combat resources or construction claims are added.

**Production gate:** Test physical Android devices and audit large-world FPS/memory before merge. Never import GPL source copied from bareiron/irongingot without explicit licensing assessment.
