> **Historical release-candidate checklist — completed merge.** The owner-authorized PR #34 merged into `main` as `2fd58e4e1b98d62ccac29a9bc764d22bd50e8a5b` on November 5, 2026. [Final candidate validation](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/42081416917) passed 325/325 tests plus browser/room checks; [GitHub Pages deployment](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/42081764898) passed. The pending checkboxes below document *pre-merge* conditions, not the current release status. See [canonical live release record](CANONICAL_WORLD_V1_RELEASE.md) for current state and continuing feature limitations.

# Meme City World V1 — Combined release candidate

**Release branch:** `codex/world1-camera-mining-release-candidate`
**Base:** already-merged `main` at `f4fb0ffe39aa71785592b69fc6d8ad478279ce0f`
**Integrated features:** [PR #32](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/32) native optional live WebGL camera (based on the exact head `9cedf3743ab912b1f256c7ffa8328fe09ab21160`) + [PR #33](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/33) shared-360° underground miner avatar.
**Earlier merged work:** PR #29's 132-biome frontier, shafts, sparse mining, corrected surface-opening cache.
**Status:** draft release candidate, not merged into main or deployed.

## Conflict resolution

The two open feature branches both changed `city.js`, `city.html`, `scripts/check.mjs`, several pinned-asset tests and browser QA. This branch starts from PR #32's newest full functionality and applies the minimal PR #33 mining avatar changes to its original mining panel. Do not replace PR #32's newer `city.js` with the older PR #33 version: that would remove the live 3D camera.

- `city-mine-visuals.js`: uses `drawAvatar` callback rather than hard-coded mannequin; the actual game delegates to canonical `CityVisuals.person`.
- `city.js`: mining passes current verified cosmetics, gear and last underground movement direction to original rig; leave newer WebGL camera tick, scene streaming, crowd sampling, GPU fallback, World V1 saves untouched.
- `city.html`, release checks: preserve the existing live `city-graphics.js` and `city-live-3d.js` assets; bump **only** the altered miner and game scripts.
- Mining Node and Chromium pixel comparison tests are combined with all newer camera/graphics Node and Chromium smoke tests. Do not alter player save, active wallet, economy, Solo or Together permissions.

## Release checklist

| Gate | Status / evidence |
|---|---|
| Existing World V1, old 47 entrances, Solo, Together, wallet, saves | Automated regression pending exact-head run |
| 132 frontier biomes, height −64 to +256, local Solo mining, sparse validation | Existing verified PR #29; combined exact-head run pending |
| Optional live first/third-person WebGL inset, read-only player/NPC mirroring, fallback | Previously green PR #32; combined exact-head run pending |
| Same 360° avatar in underground cutaway with verified outfits | Previously green PR #33; combined exact-head run pending |
| Combined full Node/static/server benchmark + real phone-sized Chromium | **Pending release-head CI** |
| Real Android device GPU, thermal, context-loss, touch, rotation | **UNVERIFIED — requires a physical device** |
| Hosted multiplayer cross-browser room/reconnect checks | **UNVERIFIED — add local multi-client test then hosted acceptance** |
| Final owner review and explicit permission to merge | **PENDING** |
| GitHub Pages main deployment + rollback smoke after merge | **PENDING; do not preemptively deploy** |

### Caveats

Merging this candidate produces **the original 2D playable game with an optional live 3D view and a Solo-only underground mining cutaway**. It does **not** produce free-roaming 3D collision/physics, shared online mine edits, tradable ore, a replacement World V2 or actual WebGL first-person player combat. The original map coordinates and save schema must remain compatible.

### Manual mobile acceptance steps (owner/device)

1. On a physical Android phone in Chrome/PWA, capture a backup of current local Solo save, launch `city.html`, verify controls and walk/fight in the existing World V1 with the 3D toggle OFF.
2. Enable Live 3D, verify first/third camera button, 2D controls remain responsive, no black screen, touch targets usable and no repeated context-loss crash.
3. Toggle GPU settings Automatic/Performance/Balanced/High and orientation portrait/landscape; note phone model, Android/browser version, measured FPS and GPU/memory/thermal symptoms.
4. Visit the frontier, mine/dig and move one tile, confirm same chosen player outfit/verified token skin in the cutaway, ascend, close and return to same 2D location.
5. Join Together from two actual devices/browsers through the production/test room host, walk and reconnect, verify same-world NPCs and camera updates; no unauthorized mining credits or wallet access.
6. Sign off or document failing steps before the merge approval.

Never mark a manual gate passed based solely on headless Chromium or Node tests.
