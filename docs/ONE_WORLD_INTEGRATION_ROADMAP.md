# MEME CITY — ONE PLAYABLE WORLD / ARCHIVED V2 FEATURE RECOVERY

**Baseline:** `main` at `549b628755b5f5717a3d535dcc75a8ab99d5de46` (major building graphics overhaul).  
**Canonical game:** `city.html`, the existing `MemeCityCore.Engine`, `city.js` Canvas HUD and rendering, `city-arcade.js` simulation and optional Render multiplayer.  
**Design reference:** User-supplied `MEME_CITY_WORLD_V2_COMPLETE_HISTORY_DESIGN_IDEAS_AND_FAILURE_REPORT.md` (October 31, 2026), sections 2–3, 6–9, 20, and archived master handoff (especially stages 3–10).

## Invariant: only one world

We are **not** building World V3, replacing `city.html`, switching `main` to `city-world2-production.html`, or shipping a developer debug canvas as the game. The archive is a backlog, not permission to revive the failed World V2 release. `city-world2-*` modules stay historical/reference-only until specific logic is adapted to the working game. The original `ENTER MEME CITY` solo experience, single player/rig, mobile controls, wallet connection, local save keys, stable building IDs, and optional Together must remain playable. Do not create any new world or alternate production game path.

**All new gameplay must use the current world positions**, collision `C.blocked()`, existing room/door definitions, `MemeCityCore.Engine`, `CityVisuals.person()`, and the current `city.js` draw queue. Solo works offline; multiplayer simulations derive state from the authoritative server. No new token burn/purchase/crypto payments. User approval is required before merging or public rollout, especially for changes affecting saves/controls.

## Code-verified current baseline (not the historical V2 prototype)

| Feature | Found in the current live game | What is still missing from the archived concept |
|---|---|---|
| One contiguous city | `C.WORLD`, fortress-centered current V1 region layout, four districts, six token neighborhoods and roads | More alley/ring-road detail, organic neighborhood life |
| Buildings | 47 interior entrances, functional room activity proximity; newly modernized 2.5D exteriors/interiors | More useful individual shop services, destructible *noncritical* rival property |
| Player/NPC rig | Shared 360° `CityVisuals.person()` for player, guards, cops, civilians, zombies and monk | Extra role gestures, varied equipment and mobile performance proof |
| Combat | Faction NPCs, shooting, patrols, heat, guards, fortress defense *drill* | Destructible staged siege/repair, lasting neighborhood influence |
| Basic undead | Up to 12 greenbelt walkers hostile to all factions; spawn protected from bases | Four archetypes, telegraphed ranged hazards, in-world quarantine event, bunker survival |
| Monk | Healing, fire tornadoes, bilingual verse dialogue and shared monk skin | Longer NPC stories, reaction to persistent world events |
| Economy | Play-credit gear, market functions and physical indoor service terminals | Secure persistent multiplayer trade/identity; *not* crypto rewards |
| Solo/online | One-tap local save, optional guest rooms, signed holder cosmetics | Durable online characters/backups and actual Android device acceptance |
| Chaos Arcade | An enterable building and activity panels | A fully playable original mini-game cabinet with touch, pause, score and safe reward |

## Integration order — each step changes only this world

1. **Quarantine population upgrade — first implemented batch on this branch.** Introduce Walker / Runner / Tank / Spitter into the **existing dead-zone spawn director**, with distinct health, movement, telegraphed melee/ranged hazards and four skins on the *existing* 360° rig. Keep cap 12, do not spawn in bases or city roads; do not grant credits from passive zombie farming. Add source, VM gameplay, and real Chromium checks; remain opt-in pending review.
2. **One actual quarantine event.** Add a marked in-city bunker/access point, player-enterable survival wave, preparation warning, retreat/defeat/victory and exactly-once play-credit/XP reward. Use current map pins/navigation, same game canvas, existing `MemeCityCore.Engine`, room authority and bounded NPC budget. All four types are already available by step 1. Add save-safe completion state where appropriate.
3. **Fortress siege with repair.** Extend existing `defenseDrill` and player `plot`/crew primitives rather than inventing new property systems. Introduce bounded structural HP and one repair action, a telegraphed gang raid and full victory/defeat cleanup. Protect mandatory roads and entrances.
4. **One actual playable Chaos Arcade cabinet.** Enter the existing arcade using the existing door; launch an original skill game from its indoor terminal; implement keyboard/touch, pause/focus, clean return, legitimate one-time play-credit transactions through the current authority, accessible score and retry. No betting.
5. **Territory conflict, patrol/civilian reactions and missions.** Reuse existing `city-clans.js`, `city-arcade.js` and city map; upgrade the live faction event and add one meaningful encounter before adding more districts.
6. **Navigation, environmental effects and polish.** Improve roads/lighting/discovery, preserve current 47+ door identities, add safer waypoints and routes, audit mobile frame pacing. Continue role-specific shared rig upgrades without replacing assets or controls.
7. **Durable online persistence** is separate and blocked on verified durable service, backup/restore, recovery and identity. A temporary Render room is not a persistent player account.
8. **Optional holder expansion** requires separate owner approval and strict read-only wallet proof. It is *not* another main world and must not gate the free core city.

## Non-negotiable release gates

- Homepage → `city.html` → a real playable solo character and unchanged HUD, even with Render offline.
- Native mobile controls, move/aim/shoot, interact/enter/exit, map and one-way route to every essential real door.
- No mutation of the existing `offensive-meme-city-v1-center` save schema or previous saves without backed-up reversible migration.
- All old gameplay regressions, new feature tests, static checks, benchmark, browser Canvas acceptance; physical Android review remains separately required.
- No uncontrolled zombie actors, duplicate rewards, auto-wallet transactions, uncapped projectiles/effects, or server/client-authority confusion.
- **Review on a PR, then explicit owner-approved merge/deploy**; green CI alone does not authorize production.

## Exact integration boundaries

**Current codebase:** `city-core.js` (world/collision), `city-arcade.js` (AI/combat), `city-visuals.js` (shared actor skins), `city.js` (render and controls), `city-interiors.js` and `city-room-visuals.js` (real doors), `city-map.js` / `city-nav.js`, `city-clans.js`, `server/city-rooms.mjs`.  
**Historical reference only:** `city-world2-*.js/html`, old prototype authority, migration candidates, debug pages and the archived V2 vault. Copy *concepts* only after matching current game rules. Never flip the public route.

## QA status on branch

The first batch has source/test changes for four zombie archetypes and shared-skin rendering. Its GitHub Actions and real mobile-sized Chromium validation status must be checked on the branch PR. This document is not proof of physical Android FPS or a complete quarantine wave event.
