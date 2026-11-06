# Meme City — 15-workstream development council

**Purpose:** Develop one original, expandable, Minecraft-scale *feature set* for Meme City without replacing the existing first-person wilderness or accidentally breaking the original Solo game. This is an independent game, not a Minecraft clone or a plan to use Minecraft code/assets.

**Current baseline:** Original first-person world at `city.html?terrain=1`, 132 named seeded biomes, 0.25m voxels, underground pocket caves, WebGL, Android PWA and a bounded off-thread voxel mesher. Preserve world seeds, save formats, the legacy `city.html` experience and existing tests.

## ChatGPT hourly development automations (GitHub research paused)

**Scheduled GitHub-only research is paused by user request (November 6, 2026).** [`meme-city-council.yml`](../.github/workflows/meme-city-council.yml) is now **manual-dispatch only**, with no cron or automatic push trigger. The user's account currently supports five active **ChatGPT** scheduled tasks; those five hourly coding workstreams jointly own the 15 issues below, with launches staggered 12 minutes apart. Each ChatGPT run is instructed to implement code, update a scoped PR, and verify tests where connected execution tools permit. The old GitHub-only research scanner can still be invoked manually but is no longer a scheduled development task.

The **five active ChatGPT automations are implementation-oriented**, and each is responsible for three of the 15 issue-owned specialties. Their ability to modify GitHub depends on the available connected GitHub actions in the scheduled run. The separate **manual-only GitHub research scanner** has no AI model credential and never installs libraries or writes game code. Human review and exact-commit CI remain required for integration.

The workflow uses only `GITHUB_TOKEN` with `contents: read`, `pull-requests: read` and `issues: write`; no other credentials are needed for public-repository research. It avoids repeating identical comments. If GitHub Search API is unavailable, the issue task is reported **blocked**, not fabricated as completed.

## Fifteen independent development lanes

| # | Workstream | Issue | Primary responsibility | Priority |
|---|---|---|---|---|
| 01 | Roadmap and integration | [#43](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/43) | Dependencies, handoffs, sequencing, integration gates | P0 |
| 02 | Open-source libraries | [#44](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/44) | Library/license research and integration spikes | P0 |
| 03 | Biome world generation | [#45](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/45) | Seeded biomes, rivers, mountains, terrain seams | P1 |
| 04 | Realistic graphics | [#46](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/46) | Materials, lighting, water, landscape detail | P1 |
| 05 | Android performance | [#47](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/47) | Voxel workers, mesh priority, mobile GPU budget | P0 |
| 06 | Mining and crafting | [#48](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/48) | Mining, edits, recipes, building, persistent inventory | P1 |
| 07 | Character movement | [#49](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/49) | Full 3D collision, caves, climbing, swimming | P0 |
| 08 | Melee combat | [#50](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/50) | Fists, swords, knives, blocking, combos | P2 |
| 09 | Ranged combat | [#51](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/51) | In-game guns, explosives, hit detection and visual effects | P2 |
| 10 | Cars and trucks | [#52](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/52) | Driving, suspension, collision, vehicle saves | P2 |
| 11 | Aircraft | [#53](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/53) | Game flight mechanics, takeoff/landing, controls | P2 |
| 12 | Drones | [#54](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/54) | Remote scouting, battery, camera, return-home | P2 |
| 13 | Birds and wildlife | [#55](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/55) | Ecosystems, flocks, AI creatures, spawning | P2 |
| 14 | NPCs and stealth | [#56](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/56) | Patrols, perception, factions, hiding and combat AI | P1 |
| 15 | Multiplayer and QA | [#57](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/57) | State sync, server validation, saving, security, release gates | P0 |

The machine-readable source of role names, issue IDs, GitHub research queries, dependency edges and owner paths is [`DEVELOPMENT_COUNCIL.json`](DEVELOPMENT_COUNCIL.json).

## Project delivery order

**Stage A — protect and stabilize the engine (P0).** Owner 01 sequences and integrates; owners 02 and 05 assess dependencies and real Android performance; owners 07 and 15 harden 3D player/world physics and multiplayer state boundaries. Goal: stable first-person controller and consistent saved state under realistic movement and load.

**Stage B — make the world interactive (P1).** Owners 03, 04 and 06 expand terrain realism, deterministic editable blocks, resources, crafting and building. Owner 14 establishes stealth and NPC entity interfaces. Goal: complete a seed-stable gameplay loop, not just a beautiful static map.

**Stage C — feature modules (P2).** Owners 08–13 develop modular melee, guns/explosion gameplay, cars, planes, drones and wildlife. These should begin as independently testable simulations. They can be implemented in parallel but must not be attached to the playable world until the P0 interfaces and integration tests exist.

**Stage D — integration and release.** Owner 01 coordinates feature flags, owner 15 checks server-authoritative state and regression tests, and the user reviews all final merge requests. No scheduled scanner may directly change `main`.

## Candidate libraries worth evaluating

These are candidates, **not installed dependencies**. Confirm actual LICENSE files, transitive dependencies, version compatibility, WebGL1/Android performance and final bundle size before any import.

| Candidate | Potential use | Repository-reported license | Caution |
|---|---|---|---|
| [Three.js](https://github.com/mrdoob/three.js) | Graphics and glTF handling | MIT | A full rendering migration could break the existing native WebGL1 voxel game |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | More complete 3D game rendering stack | Apache-2.0 | Evaluate only in a separate benchmark; avoid replacing a working engine blindly |
| [Rapier](https://github.com/dimforge/rapier) | Character and vehicle physics | Apache-2.0 | WASM startup, memory and Android integration costs need measurement |
| [Yuka game AI](https://github.com/Mugen87/yuka) | NPC steering, navigation, perception | MIT | Check actual maintenance and lightweight modular import options |
| [geckos.io](https://github.com/geckosio/geckos.io) | WebRTC-based real-time state transport | BSD-3-Clause | WebRTC/UDP server infrastructure is more involved than static GitHub Pages |

## Hard safety and quality boundaries

1. **One world and backward compatibility.** No parallel replacement map. The current 132 seeded biomes and prior save data remain readable. Do not remove the original Solo entry.
2. **One responsibility per PR.** Each code-writing agent creates a separate workstream-specific branch and clearly documents the merge dependency. Avoid editing someone else's owner path without coordination through #43.
3. **Always run tests first.** At minimum `npm test`, `npm run check`, and both the original-game and first-person Chromium browser smoke tests on the exact PR head.
4. **Security first.** Server authority for multiplayer inventories, damage, world edits and vehicle state; input validation; limit CPU/GPU/worker budgets; no credential or signing-key persistence in game saves.
5. **Game-only weapons.** Guns, swords, knives, explosives and drones are fictional game mechanics, not real-world instructions.
6. **No copyrighted code/assets without permission.** Only import code/assets after license review and attribution. Prefer original game materials and models.
7. **No automatic merging.** Automated scans produce project research; coding agents produce reviewable PRs; only reviewed and green branches may be merged.

## Operations

- Monitor scheduled runs under [GitHub Actions](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/workflows/meme-city-council.yml).
- Review active tasks under [Issues](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues?q=is%3Aissue+is%3Aopen+%22Council%22).
- ChatGPT owns five hourly scheduled automations covering all 15 workstreams, due to the active-task limit. These are distinct from the now manual-only GitHub scanner.
- To start an eligible GitHub Copilot coding agent, open a numbered issue, choose **Assignees → Copilot**, and review its created PR. Availability depends on the repository and GitHub Copilot plan.
- Pause research by disabling `meme-city-council.yml` in GitHub Actions or removing its scheduled trigger. Scheduled GitHub Actions runs are not precise real-time timers.
