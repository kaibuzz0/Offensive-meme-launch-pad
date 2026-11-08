# Meme City — 15-workstream development council

> **Current integration directive (2026-11-08; supersedes older stage/legacy-mode language below):** Ship ONE canonical first-person game with a single seeded world/state/gameplay/save contract and one homepage/PWA Play route. Offline Solo requires no wallet; multiplayer uses the same gameplay implementation. WebGL and compatibility rendering must consume the same world snapshot, geometry identifiers, collisions and interactions; automatic LOD/resolution/render distance are device adaptations, not separate game editions. Retain old URLs and original saves until versioned, idempotent, validated migration with recoverable backups and cross-renderer parity is demonstrated. The atlas remains an in-game control. The immediate release gate is homepage Play → fortress/mountain skyline → wooded road → lit interior → persistent interaction. #43 owns integration; #46 visual/rig/materials; #53 flight only after shared vehicle controls. #47/#57 measure budgets and browser acceptance; #49 owns physics; #48 owns workbench ledger; #45/#56 owns seeded settlements and NPC descriptors. Avoid competing rewrites. PR-only work is not deployed work; CI is not visual verification.


**Purpose:** Develop one original, expandable, Minecraft-scale *feature set* for Meme City without replacing the existing first-person wilderness or accidentally breaking the original Solo game. This is an independent game, not a Minecraft clone or a plan to use Minecraft code/assets.

**Current baseline (source-level, not public acceptance):** The existing first-person route is `city.html?terrain=1`, with seeded biomes, quarter-meter voxel definitions, caves, WebGL and a bounded meshing pipeline. These features must be verified in the current running build rather than assumed from documentation. Keep existing saves and old URLs recoverable **during migration**, not as permanent separate editions.

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

**Stage D — integration and release.** Owner 01 reviews exact-head CI, gameplay acceptance, save migration and release dependencies; owner 15 checks server-authoritative state and regressions. The integration owner may merge compatible reviewed green PRs and verify Pages plus the actual public path. The manual-only GitHub research scanner never merges.

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

1. **One world and backward compatibility.** No permanent parallel game editions. Preserve existing seeded biomes and prior save data; migrate Solo into the shared game while retaining wallet-free offline access. Redirect old URLs only after verified, recoverable migration and gameplay parity.
2. **One responsibility per PR.** Each code-writing agent creates a separate workstream-specific branch and clearly documents the merge dependency. Avoid editing someone else's owner path without coordination through #43.
3. **Always run tests first.** At minimum `npm test`, `npm run check`, and both the original-game and first-person Chromium browser smoke tests on the exact PR head.
4. **Security first.** Server authority for multiplayer inventories, damage, world edits and vehicle state; input validation; limit CPU/GPU/worker budgets; no credential or signing-key persistence in game saves.
5. **Game-only weapons.** Guns, swords, knives, explosives and drones are fictional game mechanics, not real-world instructions.
6. **No copyrighted code/assets without permission.** Only import code/assets after license review and attribution. Prefer original game materials and models.
7. **Release-controlled merging.** The integration owner may merge reviewed, compatible, exact-head-green PRs after required browser and migration acceptance. Research scanners never merge. Draft, failing, conflicting or visually unverified gameplay PRs remain blocked.

## Operations

- Monitor scheduled runs under [GitHub Actions](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/workflows/meme-city-council.yml).
- Review active tasks under [Issues](https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues?q=is%3Aissue+is%3Aopen+%22Council%22).
- ChatGPT owns five hourly scheduled automations covering all 15 workstreams, due to the active-task limit. These are distinct from the now manual-only GitHub scanner.
- To start an eligible GitHub Copilot coding agent, open a numbered issue, choose **Assignees → Copilot**, and review its created PR. Availability depends on the repository and GitHub Copilot plan.
- Pause research by disabling `meme-city-council.yml` in GitHub Actions or removing its scheduled trigger. Scheduled GitHub Actions runs are not precise real-time timers.

## Unified game contract — 2026-11-07 (supersedes permanent parallel-mode requirements)

**Current delivery rung: A → B.** Ship the homepage → first-person fortress/mountain skyline → wooded road → lit clan building → persistent gather/build interaction, then measure mobile frame-time and memory. Do not claim that a module or green test alone is a public visual release. The canonical first-person entry is currently `city.html?terrain=1`; `city.html` and historic query URLs remain recoverable until equivalent gameplay, saves, and entry redirects are tested. The public homepage must offer one prominent Play action and an accessible wallet-free offline Solo option. **Do not remove or redirect old entrypoints yet.**

### Contracts and owner boundaries

- **World:** one seeded coordinate/voxel/chunk identity, quarter-meter edit resolution, 132 clustered biome definitions, persistent landmarks and stable worldgen version. Living World (#45/#55/#56) owns generation, settlement/NPC content and world-query APIs; generated scenery and gameplay collision must use identical geometry IDs.
- **Player and state:** one authoritative movement/interaction/inventory/equipment model for Solo and multiplayer, with bounded fixed-step simulation. Physics (#49/#50/#52) owns movement, collision, seats and ground vehicles; Sandbox (#48/#51/#54) owns atomic edits, crafting, item ledger, ranged tools and drones. Never implement competing controllers or ledgers.
- **Rendering:** Graphics (#46) owns visual materials, first-person camera, avatar/held-item socket contract, building kits, detail scaling and compatibility rendering. Both WebGL1 and fallback backends must consume the same world objects, player pose and gameplay events; a fallback cannot silently replace gameplay with a different 2D game. Flight (#53) uses shared world/player/seating/save interfaces, not a second scene.
- **Quality and persistence:** QA (#47/#44/#57) owns reproducible startup, frame-time percentile, stalls, memory, mesh/draw, long-travel, save/reload and mobile-viewport baselines. Adapt LOD, render distance, resolution and effects automatically without changing collision, objects or progression. Maintain the 24 MiB mesh budget until a measured revision is reviewed.
- **Integration:** #43 owns shared bootstrap/homepage files, dependency graph, PR queue, schema/entry migrations and release gates. Coordinate any shared-file edits here before pushing. No unreviewed direct-to-main changes.

### Migration order and release gates

1. Inventory current entry URLs, rendering backends, world generators, stores, and active PRs; record a mapping of old save keys and schema versions before modifying them. Keep original saves recoverable.
2. Add a versioned, repeat-safe **copy/validate/activate** migration. Preserve the original save until successful readback; quarantine unmappable fields rather than silently deleting them. Test legacy fixtures, repeated migration, interruption and reload.
3. Unify world queries, player controller, inventory and interaction contracts behind the existing working terrain implementation; port useful original Solo mechanics in bounded playable slices. Require WebGL1 and fallback scene/interaction parity.
4. Ship one real player-eye-level route and persistent interaction, with desktop and mobile-viewport Chromium evidence; then promote first-person as the primary Play action. Keep offline Solo wallet-free.
5. Only after parity, migration and link checks redirect historic entry URLs to the canonical game and retire duplicate mode selectors/runtimes. Retain recoverable Git history and a rollback path.

### Current integration dependency queue

| Order | Deliverable | Owner | Gate |
| --- | --- | --- | --- |
| 1 | Homepage entry and fortress-road scene/interactions | #43 + #45 + #46 + #48 | Real public path; mobile/desktop pixel and interaction checks |
| 2 | Save inventory, versioned migration and replay | #57 + #48 + #43 | Old saves preserved, repeated migration and reload |
| 3 | Shared world/physics/render parity and automatic detail | #49 + #47 + #46 | Identical scene/collision/interaction across backends; measured budgets |
| 4 | Starter lodge/interior, workbench and first complete gather/build loop | #45 + #48 + #46 | Actual terrain geometry, door/collision, saved inventory/build |
| 5 | Curated free wardrobe and held-item loadout | #46 + #49 + #48 | Preview/equip/render/reload on touch and desktop |
| 6 | NPC encounter, vehicles, then aircraft | #56 + #52 + #53 | Same world/controller/save, bounded simulation |

**PR review rule:** record exact head SHA, merge conflicts, test and browser evidence, release dependency and Pages publication. Merge only reviewed green compatible PRs; verify public homepage, asset loads and actual interaction after deployment. Do not fabricate physical Android measurements from emulation. Update this queue when code or CI establishes a different blocker.

**Reuse research:** consult #44 before adding a dependency. Verify upstream revision, LICENSE and attribution, browser/WebGL1/PWA compatibility, size and measured runtime effect. Existing Three.js/Babylon/Rapier candidates are not approved engine replacements. User-provided reference archive `makethegameactuallylooklikethis.zip` is art direction, not licensed source content.
