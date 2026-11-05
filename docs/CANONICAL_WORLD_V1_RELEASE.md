# Canonical Meme City World V1 — release record

**Updated:** November 5, 2026
**Playable entry:** https://kaibuzz0.github.io/Offensive-meme-launch-pad/city.html
**GitHub:** https://github.com/kaibuzz0/Offensive-meme-launch-pad
**Default branch:** `main` — one authoritative playable World V1
**Core merge:** [PR #34](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/34), commit `2fd58e4e1b98d62ccac29a9bc764d22bd50e8a5b`

## What is actually merged

| System | Current live scope |
|---|---|
| Game | Original `city.html` and `MemeCityCore.Engine`; 2D Canvas remains authoritative |
| World | Expanded 24,400 × 14,400 world; preserved original Center City; 132 named frontier biomes and map access |
| Vertical space | Height metadata −64 through +256; seven **Solo** 2.5D excavatable strata; permanent bedrock at −64 |
| Surface mining | Persistent validated local excavation journal, visible mine openings and unculled map waypoints; no play-credit or token payouts |
| Players and NPCs | One shared 360° solid avatar rig; original wallet-verified cosmetics and equipment passed into the underground cutaway |
| Optional graphics | Existing Graphics settings and opt-in Live 3D WebGL camera, first-/third-person views and a bounded read-only mirror of up to six nearby characters |
| Existing game | Original Solo, Together guest rooms, 47 public interiors, quests, factions, squad/fortress, monk and zombies; one site-wide wallet connection |
| Site | Homepage, game, token pages, PWA, QR, static assets, Pages packaging and Render-compatible room-service code |

These are distinct modules supporting **one playable game**; combining all scripts into one large source file would increase risk and is neither needed nor desirable.

## Exact release evidence

- [Integrated candidate CI #42081416917](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/42081416917): **325/325 Node tests passed**, static reference checks, deterministic multiplayer room benchmark, mobile-sized Chromium game acceptance, and real two-tab authenticated **local** room/reconnect checks.
- [GitHub Pages production deploy #42081764898](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/42081764898): **success**, deployed from merge commit `2fd58e4e`.
- [GitHub Pages build #42081762587](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/42081762587): **success** for the same main revision.
- The owner stated that gameplay works on Android and explicitly requested the merge. This is a user report, not an independent measured GPU/thermal or device-farm test.
- Current follow-up audit: the PWA dynamically imports `wallet-mobile.js`; the local Node room/static server now explicitly serves that file, matching the Pages copy manifest. Release-integrity tests protect published/local asset parity, loader order and World V1 scope.

## Branch disposition

At the last audit, there were **no open pull requests**. Most historical feature branches were ancestors of `main` and therefore had no unmerged commits. Two older branches — `codex/city-graphics-camera-prototype` and `codex/one-world-miner-avatar-rig` — still had commits diverging from `main`, but **their release functionality was integrated into and superseded by PR #34**, and their earlier draft PRs were closed. Neither old branch should be merged blindly, because its copies of `city.js`, asset pins and tests would overwrite the newer integration.

The abandoned World V2 branches and preview files are **historical or development-only**. They are not another live game or a required part of a World V1 merge. Existing redirect pages remain for old bookmarked URLs without changing or clearing save data.

## Important boundaries

- Live 3D is currently a read-only scene/camera overlay driven by the existing authoritative 2D simulation. It is **not** full first-person combat, collision, enterable WebGL interiors or a replacement physics engine.
- Solo mining is local 2.5D with a temporary miner position; the original surface character remains the persisted actor. Online authoritative excavation, resource trading and durable backend persistence are not implemented.
- Together rooms use temporary guest progress; the room backend's health and availability require separate operational monitoring. A separate real public-hosted two-client acceptance test remains useful even though local multi-client browser QA passed.
- Solo progression is saved in the browser. Do **not** clear website storage/cache data as a blanket troubleshooting step: that can erase local saves. Standard browser reload and closing/reopening the PWA are safer.
- Neither GitHub's successful Pages workflow nor this repository audit alone proves a phone GPU frame rate, public CDN cache propagation, or end-user page visuals in every browser.

## Release integrity and follow-on verification

1. Verify `city.html` loads `city-graphics.js`, `city-live-3d.js`, `city-mining.js`, `city-mine-visuals.js` and the same single `city.js`. The new `scripts/city-release-integrity.test.mjs` checks every static module against actual Pages and local-server asset allowlists.
2. Ensure the PWA module `wallet-mobile.js` is served by both build targets.
3. Validate new merges through the full Node, static, deterministic room and real Chromium suite; use the exact PR head, then verify Pages production workflow on `main`.
4. For user-reported rendering issues, collect the browser/device and feature steps without touching protected saves. Fix only the reported release feature and preserve the same one-world architecture.
