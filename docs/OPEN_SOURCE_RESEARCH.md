# Open-source research — biome foundation (2026-11-04)

Research preceded integration. **No external code or assets have been imported** into this biome increment: a small original deterministic value-noise/hash routine is sufficient for the current three fixed, decorative terrain regions.

| Candidate | Verified upstream revision | License | Integration assessment |
|---|---|---|---|
| [jwagner/simplex-noise.js](https://github.com/jwagner/simplex-noise.js) | `6bfff874f5f0efed6375a9bf27fbd39b3cec6b4e` (2024-07-26) | MIT, LICENSE inspected | Fast TypeScript/JavaScript noise generator, suitable for future seeded terrain; new dependency and seeding logic would be premature for three hand-positioned areas. Deferred. |
| [josephg/noisejs](https://github.com/josephg/noisejs) | `9c53d7faed1c1a1d4c0927b238ff3def7bb8803b` (default branch) | ISC, LICENSE inspected | Lightweight Perlin/Simplex routines, but global noise state and older upstream code add integration/maintenance complexity for fixed regions. Deferred. |
| [ondras/rot.js](https://github.com/ondras/rot.js) | `46782e248c2db9d379a5e4f13bb8323f18dff04b` (2024-11-13) | BSD-3-Clause (GitHub metadata) | Good future source for procedural dungeon and grid navigation algorithms. A full roguelike toolkit is disproportionate for non-solid terrain paint. Deferred. |

No third-party attribution obligation has been introduced because no code or imagery was copied. If a dependency is imported in a later batch, inspect the exact license and asset rights, record upstream SHA, preserve notices, and confirm security and footprint.
