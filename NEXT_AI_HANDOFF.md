> **Round 5 server-authored world2 QA — October 31, 2026:** Draft PR #2 on branch codex/world2-territory-foundation now includes an unexposed, server-authoritative room prototype. Gameplay commit d508f757; [full Node 22 CI](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41226269497) **206/206 passed**. Production main and Render service unchanged.

## Next development priorities after Round 5

The new city-world2-authority.js implements a separate world2 Engine with authoritative shared movement/collision, guards/health, one active territory capture per room, private courier timers, indoor shop/medical validation and server-owned preview credits/gear. The server/city-world2-prototype.mjs VM-isolated loader passes this engine to the existing authenticated createRooms guest manager. Guest room state, session expiry, rate limits, input sequencing and filtered peer snapshots are tested with two guests.

The independent server/city-world2-local.mjs exposes an opt-in loopback-only QA API, 127.0.0.1:8788, with join/state/input/action/leave, origin and JSON body checks, and temporary bearer sessions. Start using npm run dev:world2; inspect server/WORLD2_LOCAL_QA.md. This local API is NOT mounted on Render, the main world1 server, or the current offline browser preview.

**Next:** (1) develop an explicit browser opt-in client that actually connects to the local v2 rooms, including real avatar/guard rendering and reconciliation of server snapshots; (2) prove two physical browsers and Android touch/camera/fire; (3) align service and combat behavior between client and server, improve per-player simultaneous capture and NPC movement; (4) gate an actual v2 online server route behind owner-reviewed feature flags, anti-cheat/privacy/rate testing and stable room persistence. Never automatically merge, deploy Render, overwrite world1 saves or conduct crypto transactions.

**Limitations:** the existing city-world2-preview.html still runs its own offline simulation. The new engine has server-owned mechanics but not a deployed v2 multiplayer client. Online guest progress remains nonpersistent and world2 server load/phone FPS have not been measured.

---

> **UPDATED October 31, 2026 — post-release world-v2 continuation:** PR #1 was merged into `main` at `08e6d169`, and GitHub Pages published the original world1 game with a separate experimental v2 preview. The next development branch is **`codex/world2-territory-foundation`**, **draft PR #2**: https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/2. Latest tested code `70f9a6ca`; [Node 22 CI](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41224951450) **189/189 tests passed**. This new PR is not merged or deployed.

## NEXT AI HANDOFF — post-release world2 work

**First task:** Fetch the current PR #2 head; preserve any newer commits. This supersedes old instructions to keep working on already-merged PR #1.

### What is implemented on PR #2

- **Six-neighborhood territorial gameplay** (`city-world2-territory.js`): selectable temporary faction, six canonical collision-safe control nodes, proximity-limited capture requiring an uninterrupted eight-second hold, nearby rival gang interruption, damage/distance cancellation, bounded one-time preview rewards and reset. Routes from fortress spawn to all six sites are covered by pathfinding regression tests. Public interiors and protected service buildings are never damaged or captured.
- **Confrontable NPC control guards:** each control node now has an actual gang NPC with corresponding neighborhood clan identity, HP and collision movement/attack. The player must defeat guards to remove contesting pressure. This is simulated only in the offline browser preview.
- **Courier contract** (`city-world2-contracts.js`): explicit acceptance near canonical `door:launch`, destination `checkpoint:1`, 210-second delivery window, exactly-once preview XP/play-credit payout, timeout, abort/cooldown and strict proximity. UI enables acceptance at the Launch House terminal, a route and street completion, but full world1 contracts are not ported.
- **Separate opt-in world2 preview persistence** (`city-world2-session.js`): explicit Save/Load buttons use `offensive-meme-city-world2-preview-v1` only. Round trips preserve validated world2-only character XP, preview play credits, inventory, plot/outposts, crew, clan and completed territory claims. The original `offensive-meme-city-v1` save key is untouched. Unsupported/corrupt saves fail closed, multi-tab writes use optimistic revision checks, incomplete courier/raids never resume. This is **not** a transactional multi-tab lock and **not** real world2 save activation.
- Updated `city-world2-preview.js/html`, local development server asset list and future Pages manifest. The original `city.html` production client remains unchanged.

### Required next vertical slices

1. **Actual browser/device acceptance:** use a checkout of PR #2 and `npm run dev` → `http://localhost:8787/city-world2-preview.html`. Verify six capture nodes, visible clan guards, shooting while walking, courier from Launch House interior to creator checkpoint, all 47 doors, four gates, mobile touch/keyboard and sandbox save/reload with two tabs. Inspect runtime console and handset frame pacing, not merely Node VM tests.
2. **Real gameplay server integration:** centralize world2 geometry/POI and authoritative combat, territory, contract timers, snapshots and state transitions under a shared server/client contract. Do not copy the current client-only preview reward logic into online rooms. Keep separate neutral online commons and instanced private solo fortresses.
3. **Finish functional services and durable play:** implement actual world2 shop/medic/arcade interactions, NPC/faction raids and defense cooldowns, protected public service terminals, safe plot/outpost load and rollback UI. Build idempotent world1-to-world2 migration with a user-facing review/restore procedure before a production replacement.
4. Only after parity and browser/multi-client tests: optional zombies, expanded territory destruction (never protected public services), live platform economy and verified holder cosmetics. No real token transactions, burns, or BAREIRON/Minecraft runtime.

**Required checks after each batch:** `npm test`, `npm run check`, diff whitespace, room benchmark and explicit browser/device QA when relevant. Commit and PUSH in reviewed batches to PR #2. **Do not merge/deploy `main`, overwrite world1 saves or redeploy the Render backend without user approval.** A passing Node benchmark on world1 is not handset FPS or multiplayer world2 proof.

---

> **Latest pushed and verified — October 31, 2026:** world2 offline gameplay preview is now wired to a limited collision-aware simulation with gangs, police heat response, fortress defender, simple raids, directional combat, preview-only checkpoint XP/credits and guarded staged character loading. Latest code `777a924b`. [Node 22 CI https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41223390175](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41223390175) **170/170 passed**. Draft PR #1 remains open. **Do not confuse this with integration into the production core/server, or claim physical browser/Android testing.**

## Immediate engineering priorities after round 3

1. **Verify the preview in a real browser and on Android:** run `npm run dev`, open `http://localhost:8787/city-world2-preview.html`, walk through all four fortress gates and around the 47 doors; enter/exit rooms, run the simple defense wave, try combat input while moving in all 8 directions, wall construction, staged old saves, phone touch and two-tab race recovery. Check for console errors, clipping, time spikes and inaccessible stations. Our last test was a Node mock-DOM, not a physical browser.
2. **Plan the authoritative engine transition:** the new `city-world2-simulation.js` is a *nonpersistent, local preview simulator*, not a replacement for `MemeCityCore.Engine` and not server-authoritative. Design a shared dependency-injected world2 geometry/POI contract for engine + online room server with synchronized movement, NPC police/factions, contracts, construction and interior activity, then verify genuine cross-client updates.
3. Finish real missions (courier, arena, gang raids, checkpoints), interior services and outpost/fortress defense in the authoritative world2 engine; avoid porting a client-only reward into real online room authority. Holder transformations, zombie waves, territorial warfare and arcade follow after the base world is actually playable.
4. Preserve world1 as default; do not activate a world2 save or overwrite recovery keys. A rollback/review UI, live collision-fallback and transactional multi-tab safeguards must precede any migration, merge or production deployment. Keep investor/holder claims noncustodial and no burns.

**Round 3 detailed test evidence and limitations:** see final section in `DEVELOPMENT_STATUS.md`. Always fetch latest remote branch head and preserve other agents' work. Commit and PUSH each tested batch to the existing draft PR; no main merge or Pages deployment without owner approval.

---

> **LATEST VERIFIED CODE — October 31, 2026:** draft PR `codex/living-blocks-handoff`, commit `bba9ef203f7d418a6ad6edce6f5629833fd3f28b`. World2 staged-save migration (`city-migration.js`) and inactive geometric world2 model (`city-world2.js`) implemented. CI [run 41221761283](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41221761283) **156/156 green** including 47 world2 door routes and four fortress gate routes. **No world2 browser integration, no merge/deploy.** Continue from latest actual remote head.

## Next engineer — execution priorities after world2 staging

1. **Make stable destinations canonical:** authored hub service doors differ from generic `CityTopology.point()`; reconcile `CityMigration`, `CityWorld2`, interiors, mission landmarks, routes and `CityNav` against a shared ID-indexed world2 registry. Include tests of all 47 door IDs and 14 essential service counters after migration.
2. **Create a real opt-in world2 browser/engine preview:** switch all world positions, physics, buildings, interiors, NPCs, mission destinations, construction and camera coherently, not only rendering. The existing `city-world2.js` is an inactive collision *prototype* loaded only by Node tests. Preserve default world1 and production.
3. Complete safe old-save staging/activation with review UI and rollback plus multi-tab revision guarantees. `CityMigration.stage()` currently writes only separate preview/backup keys and `inspectStage` checks drift; it does not transactionally activate world2 or implement an actual rollback button.
4. Run a real browser and Android playthrough of central gates, legacy construction, the 47 accessible doors, client input/aim and online room safety; then optimize. Keep online ownership transient and finance/token interactions noncustodial. Stage gang raids, zombie/wave, playable arcade and token character cosmetics only after world2 has real acceptance.

**Source details and evidence:** see the newest section of `DEVELOPMENT_STATUS.md`. Preserve the existing branch, draft PR #1 and all newer commits. **Commit and push every usable batch, run the full tests and checks, do not merge/deploy without approval.**

---

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


## NEW: world2 canonical destinations and isolated preview (October 31, 2026)

Current work now includes `city-world2-registry.js` (canonical ID registry), stable-ID-aware optional staging in `city-migration.js`, and a new `city-world2-preview.html` / `city-world2-preview.js` **review-only browser explorer**. Its controls allow manual movement across world2 fortress gates and streets, selecting one of the actual 47 door destinations, entering a nontransactional room mock using the existing interior collision model, temporary preview-only wall placement, and safe read of a staged solo character. It is **not** a full gameplay release, server simulation, economy or proof of Android acceptance.

For local QA, checkout the latest `codex/living-blocks-handoff`, run `npm run dev`, open `http://localhost:8787/city-world2-preview.html`. Use the on-page controls and browser developer tools. Do not treat the page as a live/deployed URL while the PR is draft.

**Immediate implementation priority:** connect the canonical world2 registry to a feature-flagged *actual engine* and interior/mission/NPC simulation, not only the standalone explorer. Preserve all 47 entrances, 12 landmark points, stage/rollback copies and movement/collision semantics. Verify consistent client+server world topology before enabling online rooms. Have a real-browser specialist capture screenshots and test touch controls, the in-room terminal, construction collision, eight-way avatar poses, and a legacy save reload. Do not merge or deploy until owner review.

**Every batch:** fetch latest branch, test, commit and PUSH; keep the draft PR and `DEVELOPMENT_STATUS.md` current. Never reset newer remote commits. No token burns or Minecraft/BAREIRON runtime.


## Latest world2 continuation: shop, market and medkit terminals

PR #2 now includes `city-world2-services.js` (preview-only catalog-based equipment purchases, ownership/equipping, half-price salvage, medkits) wired to indoor terminal buttons in `city-world2-preview.html/js`, with upgraded boots speed and blaster damage actually applied in the world2 offline simulation. World1 live game, wallet payments, Render backend and canonical save key were not altered. Added service protection tests, mock UI tests, and sandbox save-roundtrip coverage.

**Next engineer:** fetch PR #2 head first. Validate actual browser interaction at shop and Night Market rear terminals, verify item equip/unequip and persistence after reload, then design a server-authoritative world2 service protocol (action validation, versioning, ownership, double-spend prevention) without promoting client-only preview rewards. Follow with mobile Android acceptance, multiplayer topology synchronization and reversible migration/rollback. Commit and push focused, passing batches; keep `main` untouched and PR draft until owner authorizes release.


## Round 6 current handoff — authoritative local browser multiplayer QA

The next engineer should fetch PR #2's **latest remote head**, not earlier `560d68c1`. The branch now contains a local-only client (`city-world2-online.html`, transport, browser script) that consumes `npm run dev:world2`'s authenticated room API rather than locally calculating world2 rewards. Local launch: terminal A `npm run dev`, terminal B `npm run dev:world2`; open `http://127.0.0.1:8787/city-world2-online.html` in two browser tabs, or use `npm run qa:world2:browser` for the automated real Chrome smoke harness. See `server/WORLD2_LOCAL_QA.md`.

The local client has temporary bearer guest join/leave, sequence-checked movement, fire/aim, canonical interiors/control zones, server-owned shop/medkits/gear and courier operations, shared player/guard snapshots and a mobile responsive UI. `city-world2-authority.js` now enforces server-owned equipped item effects. Distinct test files exercise transport security, mock browser events and actual two-session HTTP integration. **Run and confirm latest full CI including Chrome**, not just Node unit tests; intermediate browser harness failures were corrected.

Remaining before v2 beta: physical Chrome/Android touch/FPS acceptance, full interior activities, group NPC/raid systems, authoritative construction/companions, persistence and moderation; then owner-reviewed migration/rollback before replacing public world1. No new Render endpoints, wallet transactions, public rollout or force merges authorized by this handoff.


### Verified Round 6 final result — October 31, 2026

**Code commit `4aec1c8754855b43e95ac2be5b2678fe40e89c82` passed the complete CI pipeline:** [run 41227746512](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41227746512), **219 tests passed / zero failures**, static checks, regression benchmark and the new **real Chromium two-tab/mobile-viewport smoke test** all successful. Chromium verified joining public world2 rooms in two tabs, that Bob saw Alice's server-owned position change from the original spawn, no unexpected horizontal overflow at 412px emulated phone width, an unauthorized shop purchase rejected by the server, guest-session cleanup and no uncaught browser exceptions. Test harness intermediate failures were due to background tab scheduling and a mis-escaped position regex; corrected before this green result.

This real-browser milestone is **not** proof of Android hardware FPS or reliable mobile touch gestures. No durable shared gameplay backend was deployed, no existing game save was migrated, and no production `main` file was changed by PR #2. Keep developer QA local; the browser QA page is intentionally excluded from Pages production artifacts.
