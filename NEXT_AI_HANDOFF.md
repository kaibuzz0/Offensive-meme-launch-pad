> **Latest update:** code commit `62135ce4` adds `city-save.js`, safe v1–v4 backups, v5/world1 schema fields, blocked writes to corrupted/future saves and 5 regression tests. Full CI: **136/136 passed** at [run 41219705683](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41219705683). No world-space move yet; no production deploy.

# NEXT AI HANDOFF — Meme City
Date: October 31, 2026

## Where to continue

- Repository: `kaibuzz0/Offensive-meme-launch-pad`
- Open draft PR #1: https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/1
- Branch: `codex/living-blocks-handoff`. **Fetch latest remote HEAD first; never reset to a recorded commit.**
- Owner directive: `MEME_CITY_MASTER_DEVELOPMENT_HANDOFF.md` (provided in conversation), especially Stages 0–2.
- Full audit: `docs/CITY_ARCHITECTURE_AUDIT.md` and running log: `DEVELOPMENT_STATUS.md`.

## Shipped work and evidence

- PR-only CI workflow on Node 22: `.github/workflows/city-validation.yml`. Earlier shallow-fetch workflow bug fixed.
- Existing NPC cross-VM test failure corrected (not a gameplay behavior change), followed by full green **128 / 128** test baseline.
- First Stage 1 slice: `city-map.js` immutable real-POI adapter; touch/click service map markers; shop/market/medic entrance links; clear route; explicit directional-only wording. New map tests and deployment wiring.
- Confirmed full CI on map code commit `575bb620`: **131 / 131 tests passed**, `npm run check`, diff check, benchmark. https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41219364022
- No browser/Android gameplay acceptance in this round; PR **not merged/deployed**.

## Execute these next, in sequence

1. Extend the now-shipped v5/world1 save protection into a **fully tested geometric migration**: stable legacy-to-new POI mapping, plot/outpost transform, rollback UI, corrupted-world recovery, multiple-tab revision tests and proof that inventory/XP/credits/reputation survive. Do not move the actual map before these tests.
2. Add a bounded collision-respecting route system using current stable POI IDs and actual `CityInteriors.door` entrances, with reachability tests for essential services and phone map hit-testing.
3. Design the center-origin/fortress and four-road plan as a feature-flagged manifest, with testable transforms for old player home, plot/outposts, quests, checkpoints and room entrances. **Do not move positions before migration/tests exist.**

For each complete batch: run `npm test`, `npm run check`, `git diff --check`, and benchmark as appropriate. **Commit and PUSH to the PR branch after each usable batch.** Update this handoff, the audit, status and PR body. Do not merge or deploy without owner review and actual browser/mobile acceptance. Keep holder verification noncustodial; avoid real trades/fees, token burning, BAREIRON code and imaginary permanent multiplayer claims.

## Known gaps to disclose

The map still directs toward a point, rather than navigating around collisions. Existing solo save writes v5/world1 and backs up v1–v4 raw data; a full center-out migration and rollback UI are still pending. Online players are temporary guests. Full eight-direction mobile visuals and multi-client service flow acceptance remain incomplete; shared-host CPU time is not handset FPS.


## Most recent AI continuation (October 31, 2026)

Previous handoff stage completed further on this same branch. `city-nav.js` now provides obstacle-respecting click-to-route waypoints rendered in both city and full map; 14 essential markets/shops/medics have tested paths from old spawn. Waypoint following is **manual**, with limited off-route recalculation; the map will not auto-move players. `city-topology.js` is a testable but **inactive** world-v2 blueprint with the central fortress, four main road directions, region-aware projected coordinates and strict unknown-location refusal. This is not the redesigned playable map yet.

Validation: full PR CI green on the integrated navigation batch and topology test correction at `efe9b9e`, run https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41220526763. Source-level 47-door transform coverage is not post-migration reachability. Browser/mobile verification remains pending. Do not use the earlier failed CI runs at intermediate commits as final status.

### Next engineer: commit and PUSH by completed batches
1. Inspect latest remote branch and `city-topology.js`, `city-nav.js`, their tests, and `DEVELOPMENT_STATUS.md`. Preserve other newer changes.
2. Finish world-v2 migration coverage: v1 legacy local position conversion; greenbelt coordinates; active contract/arena/delivery/checkpoint data; saved crew and player state; all portals/building entries; rollback, backup and multi-tab save conflict guards. **Do not activate map v2 before all cases are tested.**
3. Build a real world2 collision/layout feature flag and all four safe cardinal roads, fortress gate, protected public buildings/markets/medics, visible clan neighborhoods and accessible doors. Validate collision/nav reachability from the new central spawn to all 47 entrances and main hubs.
4. Add optional playtest-only browser preview with a full walk/reload/device QA matrix, verifying original old saves, solo fortress and two shared online guests. Gate deployment on real-world acceptance.
5. Then expand autonomous defensive squads, faction wars and Insider-controlled police, hostile clan attacks, damageable control points/buildings (not protected services), zombie systems, accessible arcade games and verified holder cosmetics, before adding optional OFFENDED block-building play area. BAREIRON remains an efficiency reference only.

Run `npm test`, `npm run check`, `git diff --check`, benchmark and browser/device acceptance as appropriate; commit and **push** to the existing draft PR branch after each usable batch. Never merge/deploy or execute financial operations without owner review. Keep the website's existing 47 interiors and tokens, and retain backup compatibility.
