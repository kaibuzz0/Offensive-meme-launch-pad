# Meme City: 132-biome frontier and bareiron-fork architecture

**Status:** Draft PR #29, no merge or deployment approval. The canonical game stays city.html / MemeCityCore.Engine, not a replacement world.

## Reviewed upstream repos

| Reference | License | Mechanism reviewed | Meme City adaptation |
|---|---|---|---|
| [p2r3/bareiron](https://github.com/p2r3/bareiron) | GPL-3.0 | Deterministic procedural server terrain prioritizing memory conservation | Small fixed-seed region state, generated on demand |
| [TheShovel/irongingot](https://github.com/TheShovel/irongingot), a bareiron fork | GPL-3.0 | src/chunk_generator.c bounded LRU chunk cache; src/worldgen.c biomes; src/serialize.c world.json saves generated world deltas | Small Canvas and prop caches; seed-derived terrain and separate exploration save delta |
| [fast-2d-poisson-disk-sampling](https://github.com/kchapelier/fast-2d-poisson-disk-sampling) | MIT | Seeded, evenly spaced object placement | Candidate for later dense scenery, currently deferred |

**Source code provenance:** Bareiron and irongingot are C Minecraft servers. They do not contain a browser renderer usable as a JavaScript dependency; the Minecraft client handles visuals. Their GPL-3.0 code was **not copied, vendored, translated or imported** into this browser game. Instead this increment implements their **architectural ideas** independently in original JS, so it does not silently change the game's licensing. No Minecraft textures, registry tables, cubiomes binaries or new npm packages were imported. The user did not provide a URL for a particular bareiron fork; irongingot was chosen as a publicly verified active feature-expanded fork.

## Expanded original world, not a second world

- Existing city: x=0–11,200 and y=0–11,200. Fortress spawn, 16×10 plot, six clans, story routes, 47 doors, interiors, reserved lots, roads and original save coordinates do not move.
- New world bounds: **24,400 × 14,400**. New continuous frontier is attached at x=11,200. Its 11-column × 12-row grid uses 1,200-unit region cells.
- **132 new biomes**, composed of twelve ecological groups with eleven individually named regions each. The original three regions remain intact, yielding **135 total**. Each of the 132 has a unique name, region ID, deterministic seed, geographic position, palette, temperature, moisture, footing, material roughness, native scenery recipe and survey waypoint.
- Groups: Evergreen Wilds, Dune Sea, Frozen North, River Marsh, Volcanic Field, High Altitudes, Tropical Canopy, Open Grassland, Salt Expanse, Crystal Outcrop, Fungal Lowlands and Rustbelt Ruins.
- Terrain shapes have irregular perimeters shared by actual world rendering and terrain queries. Region edges have narrow walkable neutral paths. There is no false promise of water simulation, material harvesting, height collision, destructible props or procedural generation of an infinite new map.

## Loading, rendering, caches

Original city-core.js is still the authoritative actor/collision and multiplayer simulation. The new city-frontier.js module loads after CityBiomes and before the original city-map.js and city.js.

- Deterministic world data derives from a constant seed; it does not need to serialize a giant complete map.
- Camera-visible regions are generated and drawn in the existing Canvas2D viewport, with the same sprite depth queue as players, NPCs, shops and older biomes.
- Lazy textures are **192 × 192**, with strict **12-texture LRU** (roughly 1.7 MiB of raw RGBA pixel data). No offscreen texture is built ahead of time.
- Per-biome generated props are a maximum of **24**; a **16-region LRU** holds recent sets and only visible individual props enter the draw queue. No 132×texture upfront allocation.
- The expanded road renderer stays constrained to the **original** city footprint to avoid accidental city streets going through wilderness.
- The existing world map renders all 132 regions, labels 12 large family bands and provides an accessible grouped select instead of 132 stacked buttons. Existing pathfinding can plan from the fortress to frontier locations without teleporting.

## Saving generated content: delta journal, not full map

The Solo player save and schema remain **offensive-meme-city-v1-center** (player save version 6, layout 2, world 1). No overwrite or migration of the current character save is needed because all old coordinates stay in the same place.

Optional exploration-only journal key: **offensive-meme-city-v1-frontier-journal**. It stores version 1, the fixed seed, and a bounded list of validated surveyed biome IDs. On load, bad JSON, mismatched versions/seeds, duplicates, unknown IDs and excess-length lists **fail closed without overwriting the original journal bytes**. Failed storage writes never record a successful discovery. Multiplayer inspections never alter local Solo progress or server inventory, rewards, credits or wallet records.

**Not yet implemented:** Persisting placed/damaged world materials. When later adding construction, use separate chunk-keyed sparse edits, bounded per-user quotas and server-authoritative collision/ownership checks. Generated terrain remains immutable baseline; never trust client-supplied material HP, claims or currencies.

## Verification and release gates

New tests validate all 132 distinct names and region identities, old city geometry and saves, traversable destinations, exact 47 original doors, routing to distant biomes, cached texture/props limits, deterministic queries and a safe journal. Existing tests and mobile-sized Chromium checks remain mandatory.

Physical Android device FPS, memory, thermal/battery and accessibility review are not complete. Draft PR #29 must not merge or deploy without explicit owner approval.
