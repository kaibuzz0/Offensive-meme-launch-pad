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

1. Create a safe, isolated world/save schema migration utility and test old versions, invalid/corrupted data, multiple tabs, rollback and preserved earned assets. Integrate current save without changing any world positions.
2. Add a bounded collision-respecting route system using current stable POI IDs and actual `CityInteriors.door` entrances, with reachability tests for essential services and phone map hit-testing.
3. Design the center-origin/fortress and four-road plan as a feature-flagged manifest, with testable transforms for old player home, plot/outposts, quests, checkpoints and room entrances. **Do not move positions before migration/tests exist.**

For each complete batch: run `npm test`, `npm run check`, `git diff --check`, and benchmark as appropriate. **Commit and PUSH to the PR branch after each usable batch.** Update this handoff, the audit, status and PR body. Do not merge or deploy without owner review and actual browser/mobile acceptance. Keep holder verification noncustodial; avoid real trades/fees, token burning, BAREIRON code and imaginary permanent multiplayer claims.

## Known gaps to disclose

The map still directs toward a point, rather than navigating around collisions. Existing solo save is schema version 4 without rollback backup. Online players are temporary guests. Full eight-direction mobile visuals and multi-client service flow acceptance remain incomplete; shared-host CPU time is not handset FPS.
