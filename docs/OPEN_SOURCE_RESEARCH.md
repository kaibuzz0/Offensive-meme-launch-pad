# Open-source research — biome foundation (2026-11-04)

Research preceded integration. **No external code or assets have been imported** into this biome increment: a small original deterministic value-noise/hash routine is sufficient for the current three fixed, decorative terrain regions.

| Candidate | Verified upstream revision | License | Integration assessment |
|---|---|---|---|
| [jwagner/simplex-noise.js](https://github.com/jwagner/simplex-noise.js) | `6bfff874f5f0efed6375a9bf27fbd39b3cec6b4e` (2024-07-26) | MIT, LICENSE inspected | Fast TypeScript/JavaScript noise generator, suitable for future seeded terrain; new dependency and seeding logic would be premature for three hand-positioned areas. Deferred. |
| [josephg/noisejs](https://github.com/josephg/noisejs) | `9c53d7faed1c1a1d4c0927b238ff3def7bb8803b` (default branch) | ISC, LICENSE inspected | Lightweight Perlin/Simplex routines, but global noise state and older upstream code add integration/maintenance complexity for fixed regions. Deferred. |
| [ondras/rot.js](https://github.com/ondras/rot.js) | `46782e248c2db9d379a5e4f13bb8323f18dff04b` (2024-11-13) | BSD-3-Clause (GitHub metadata) | Good future source for procedural dungeon and grid navigation algorithms. A full roguelike toolkit is disproportionate for non-solid terrain paint. Deferred. |

No third-party attribution obligation has been introduced because no code or imagery was copied. If a dependency is imported in a later batch, inspect the exact license and asset rights, record upstream SHA, preserve notices, and confirm security and footprint.


## Milestone A follow-up — scenery distribution and visual noise (2026-11-04)

Reviewed before implementing expanded foliage and organic borders:

| Candidate | Reviewed upstream head | License | Code/maintenance review and decision |
|---|---|---|---|
| [kchapelier/poisson-disk-sampling](https://github.com/kchapelier/poisson-disk-sampling) | `9536e50c682c8e1d5a5add44a729b7414a276c61` (2022-06-05) | MIT per GitHub repository | Arbitrary-dimensional Poisson-disk sampling, pluggable RNG and spacing parameters; suitable for denser future forests, but would add runtime package plus point validation for only 3×48 fixed props. **Deferred**. |
| [kchapelier/fast-2d-poisson-disk-sampling](https://github.com/kchapelier/fast-2d-poisson-disk-sampling) | `68e9d98fbff5c376a1b3eb187d48db597c7a8c1f` (2022-05-28) | MIT per GitHub repository | Lightweight browser-capable 2D spacing algorithm; useful later for larger procedural forests. Current bounded hand-seeded layout already satisfies scene budget and preserves travel corridors. **Deferred**. |
| [jwagner/simplex-noise.js](https://github.com/jwagner/simplex-noise.js) | `6bfff874f5f0efed6375a9bf27fbd39b3cec6b4e` (2024-07-26) | MIT, LICENSE previously verified | Self-contained ~2kB browser/Node noise implementation suitable for noise maps or seeded biomes. Existing original value-noise helper is sufficient for fixed, once-baked terrain and polygon perimeter. **Deferred**. |

**Reused:** existing Meme City Canvas2D and deterministic hash/noise helpers; **new third-party code and art imported:** none. No package-lock, external script, shader engine or attribution changes are needed. Before later adopting a sampling library, revalidate license notices, all example asset rights and safety/performance on target Android phones.


## 132 biome frontier: bareiron-fork design review

- **[p2r3/bareiron](https://github.com/p2r3/bareiron)** — GPL-3.0 C Minecraft server, memory-first deterministic terrain and network chunk generation. Not a browser renderer.
- **[TheShovel/irongingot](https://github.com/TheShovel/irongingot)** — GPL-3.0 fork, with src/chunk_generator.c cache and pre-generation; src/worldgen.c terrain and biomes; src/serialize.c JSON snapshots of modified blocks and player state. These were used as research references for original Canvas chunk caches and a versioned observation journal; **no GPL implementation was copied**.
- **[kchapelier/fast-2d-poisson-disk-sampling](https://github.com/kchapelier/fast-2d-poisson-disk-sampling)** — MIT, deferred optional object spacing source; deterministic native hashes adequate for max 24 props/region.

**No direct code or assets imported.** Built as city-frontier.js using the existing game's own original JavaScript engine. See docs/FRONTIER_BAREIRON_ARCHITECTURE.md for detailed architecture, memory budget, save integrity and licensing review.

## Code review follow-up — viewport culling and mine entrance cache (2026-11-05)

This round looked for reusable open-source options for hundreds of visible props, sparse excavation entrances, and terrain geometry, while preserving the existing all-native browser Canvas and signed wallet path.

| Library | License inspected | Useful capability | Decision now |
|---|---|---|---|
| [mourner/flatbush](https://github.com/mourner/flatbush) | ISC (upstream LICENSE) | Packed static Hilbert R-tree for dense rectangle viewport queries, low-overhead bulk index | **Deferred.** The currently bounded 132 biome polygons and max 512 mine edits do not justify shipping a third-party spatial index. Reconsider for thousands of destructible props. |
| [d3/d3-quadtree](https://github.com/d3/d3-quadtree) | ISC-style permissive LICENSE (upstream file) | Incremental spatial indexing for dynamic NPC or debris positions | **Deferred.** Small existing actor counts and bounded culling are cheaper than a new dependency. Reconsider when simulating persistent debris/settlements. |
| [kchapelier/fast-2d-poisson-disk-sampling](https://github.com/kchapelier/fast-2d-poisson-disk-sampling) | MIT (upstream LICENSE) | Evenly spaced, seedable procedural vegetation and terrain props | **Deferred.** Current fixed-budget biome scenery uses deterministic original placements and no new npm/CDN dependency. |
| [jwagner/simplex-noise.js](https://github.com/jwagner/simplex-noise.js) | MIT (upstream LICENSE) | Seedable natural terrain/height/material fields with better spatial variation | **Deferred.** The existing deterministic world-seed noise is adequate for current authored frontiers; not a fix for the rendering bug. |

**Finding implemented:** `CityMining.createStore().surfaceOpenings(visible)` cached the *view-filtered* results on its first call instead of caching all validated surface openings. A player moving to another shaft could find it missing even though mining and the map journal were intact. The fix caches the **entire** validated sparse geometry and only applies the viewport filter to each returned view; excavation still invalidates the cache. The implementation follows the standard separation between immutable source geometry and camera query results; **no third-party source or assets are copied**.

**Checks:** multi-shaft and across-biome camera queries, a cold cache first queried with an empty viewport, reload, unchanged ore depths, and complete map-entrance listing. Keep existing hard caps, save keys, all Solo/Together authority boundaries and original `city.html`. Continue researching physics/destructible object libraries before the next major gameplay batch.
