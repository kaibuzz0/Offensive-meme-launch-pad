> **Round 3 architecture update (October 31, 2026):** world2 preview now uses `city-world2-simulation.js` for bounded local combat/defenders/police, checkpoint rewards and collision-mapped movement; [170/170 CI passed](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41223390175). These are **preview-only mechanisms**, not `MemeCityCore.Engine`/online room authoritative simulation. Production parity, real browser/Android QA, two-client proof, staged-save rollback UI and complete v2 interior/missions remain open.

> **October 31, 2026 update:** `city-migration.js` stages world-v2 save conversion without overwriting world1; `city-world2.js` models a physical central fortress, gates, roads and 47 route-reachable projected doors (GitHub CI 156/156 at `bba9ef2`). **P1 unresolved:** some authored hub doors intentionally differ from generic `CityTopology.point` coordinates, requiring a unified stable-ID destination map before any browser activation. Multi-tab checks are optimistic, not a transactional lock. Current physical browser/Android gameplay remains world1 only.

> **Update after audit:** `city-save.js` now writes schema v5/world1, retains the first v1–v4 recovery snapshot, blocks invalid/future saves and has 5 green regression tests (`62135ce4`, CI 136/136). The older save-v4 observation below describes the inspected baseline; future spatial migration, rollback UX and multitab conflict resolution remain open.

# Meme City — architecture and navigation audit
**Scope:** Stage 0 inspection and first Stage 1 slice, October 31, 2026. **Branch:** `codex/living-blocks-handoff`; draft PR #1. Findings distinguish code-confirmed behavior from unverified risks.

## Confirmed current architecture

| Evidence in current sources | Observation | Severity / required next action |
|---|---|---|
| `city-core.js`: `HUB`, `WORLD`, `NEIGHBORHOODS`, `DISTRICTS`, `PLOT`, `areaAt`, `oldPosition` | Fixed 6,720 × 6,720 world, fixed north/main hub, six southern token neighborhoods, scattered constants | P1 redesign; preserve geographic IDs and progression |
| `city-core.js`: `blocked()` | Each collision predicate scans world obstacles and building arrays, then player construction | P2 profile actual collision cost before adding a spatial index |
| `city.js`: `save()` and startup restore | Browser-local save accepts versions 1–4; v1 uses `oldPosition`, v2–4 retain world x/y; no separate worldVersion or rollback copy | P0 *migration risk*, not presently demonstrated data loss; add tested schema backup before recentering |
| `city-interiors.js`: `BUILDINGS`, `door()`, `P.action` | All exterior building entries are derived from `WORLD.buildings` plus district blocks. Room actions validate building/terminal contexts. | P1 keep doors, map, collision and server in sync through stable IDs |
| `city.js`: `track()`, beacon/compass, map dialog | Tracking highlights a straight-line destination; no obstacle-respecting route is calculated | P1 confirmed feature gap; add nav-lanes/A* and reroute budget |
| `server/city-rooms.mjs` / `server/city-holdings.mjs` | Server controls guest inputs and actions; wallet entitlement is a separate server-side, signed read-only flow | P0 scope guard: no client-only multiplayer ownership or token authorization |
| `city-visuals.js` and `scripts/city-avatar.test.mjs` | Shared weapon rig exists; initial Node baseline had a cross-realm assertion failure | Resolved by test correction `8eb83eb`; device-level animation acceptance remains open |
| `city-map.js` / `scripts/city-map.test.mjs` (new) | Map record IDs built deterministically from actual stations, room doors, landmarks and districts; scales CSS touch to world coordinates; hit tests bounded | Initial Stage 1 read-only adapter; 3 new tests pass; not yet a universal region manifest |

## New POI compatibility contract

The new map adapter uses `district:*`, `neighborhood:*`, `station:*`, `door:*` and `landmark:*` keys. Its records are frozen, coordinate-bounded and duplicate-checked. No save format changes; no new map authority is introduced. Actual service buttons are routed to `CityInteriors.door` entrances, not imaginary counter coordinates. **The selected waypoint is still a directional marker** until the routing graph is implemented.

## Risks requiring evidence before fixes

1. **Save migration**: future center-out moves could strand older local saves, construction and clan outposts. Build a restorable backup, world-version transform, idempotence and valid spawn/collision checks before the topology switch.
2. **Route accessibility**: verify all required markets/medics/mission doors from the real street nav graph, including changed gates and personal plot blockers. A straight-line map click is not a safe route.
3. **Multiplayer durability**: existing guest room identity is transient; any permanent shared-land claims are blocked until identity, authorization, transactions, backups and moderation exist.
4. **UI/gameplay proof**: test actual narrow browser tap targets, multi-client room movement and all-direction animations. Node VM fixtures and screenshot-free CI are not proof of the physical UI.
5. **Performance**: actor/collision enumeration could scale poorly in crowded zones. Profile camera draw, simulation, client memory and phone FPS separately before optimizing or choosing chunk size.

## Verification

GitHub Actions run [41219364022](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41219364022) (code commit `575bb620`) completed successfully: 131 Node tests passed; static/source checks passed; whitespace diff passed; room benchmark executed. Node 22 Linux shared host: 8 simulated players, 44 bots, median 0.688 ms, p95 1.630 ms, maximum 18.780 ms, 22,536-byte snapshot. Browser/mobile acceptance: **not run** this round.

## Next three vertical increments

1. **Versioned migration + rollback**. Create pure, testable save migration/validation with separate world/save version, backup, idempotence, corrupted-state fail-safe, exact material/quest preservation. Integrate without moving coordinates yet.
2. **Traversable routes**. Define walkable lane graph/nav grid from current collision and door anchors; add bounded A* (budgeted and cached); route around buildings; validate each essential service in real maps on phone and desktop.
3. **Center-out map behind a flag**. Write a stable old-to-new POI/plot transform and acceptance tests before recentering. Neutral online commons vs instanced solo player home. Preserve all six neighborhoods, existing services and faction/market mechanics.

**Explicit exclusions:** No BAREIRON/Minecraft server integration. No token burns. No unreviewed real purchase tests. No production deployment or shared persistent land claims.
