# World V1 — Center City Map Redesign

Status: **IMPLEMENTED ON PR #12 / NOT LIVE — OWNER VISUAL REVIEW REQUIRED** — see [PR #12](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/12).

## Verified implementation and build status (2026-10-31)

- The center-city branch is pushed, with the player-owned 16×10 fortress plot at the city center, six separately identifiable clan headquarters/territories, and six major businesses spread across four districts.
- Fixed hub scenery and NPC offsets, relocated fortress raid and arena wave spawns, defender patrols, and indoor shop services. Landmarks are snapped to accessible points within their original district.
- Existing World V1 browser saves are never overwritten: version 6 center-city data uses a separate key with an immutable original snapshot backup, plus fail-closed unsupported/corrupt-save handling.
- Shared multiplayer room joins now exchange and enforce `layoutVersion: 2`. The server rejects absent or mismatched layouts before admission, while the browser rejects incompatible room snapshots.
- **182/182 automated tests pass**, including the added 12-destination walking-navigation checks and 6-clan HQ/shop access coverage. Static packaging verification, the room benchmark, and real Chromium browser tests at **412 px mobile and 1440 px desktop** all pass. [Successful CI run](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/41240373617).
- This does **not** establish actual Android-device performance or verify that a live user's local-storage data migrates through a deploy. Those are separate manual release gates.

Owner request: centralize the **player's private base**, disperse shops, and give the six existing clans independent headquarters. This is a redesign of the **actual playable World V1 game**, not a revival of the discarded World V2 multiplayer prototype.

## Design map

5 × 5 zone system. Each district's existing local gameplay area remains **2,240 × 1,660 world units** with a **2,240-unit grid pitch**. Wide greenbelt gaps connect the districts; the total world is **11,200 × 11,200** units. The center private plot anchor is (5,080, 4,930), with a 16 × 10 buildable grid. New players spawn at the open south entrance to the fortress grounds.

```text
NORTH
          [OPEN]   [OPEN]      [OPEN]    [INSIDER]      [OPEN]
          [OPEN]   [OFFENDED]  [FOUNDER] [CREATOR]      [OPEN]
WEST      [SHOOTER][ARENA]     [PLAYER]  [SOCIAL]       [REDACTED]   EAST
          [OPEN]   [DELIVERY]  [OPEN]    [RUGMASTERS]   [OPEN]
          [OPEN]   [OPEN]      [OPEN]    [OPEN]         [OPEN]
SOUTH
```

Key: PLAYER = Fortress Heights / private 16 × 10 player plot; FOUNDER = the Founder Square public hub; CREATOR, ARENA, SOCIAL = existing non-combat/public activity districts; clan tiles are separate individual neighborhoods, not a bottom-edge row. The remaining cells are travel/greenbelt space for later roads, independent POIs and expansion.

### Business dispersal

| Business | Target area | Purpose |
|---|---|---|
| Launch House | Founder Square (north) | New-player mission entrance |
| Chaos Arcade | Founder Square (north) | Jobs, recreation |
| The Unfiltered | Social Boardwalk (east) | Social/clubs |
| Bad Taste Supply | Arena District (west) | Equipment/outfitter |
| Night Market | Creator Quarter (northeast) | Trading |
| Meme Motors | Social Boardwalk (east) | Vehicles / mobility |

Every clan still has its own **HQ building**, clan terminal, outfit exchange, arcade, workshop, medical annex and private 3×3 outpost build area. The new colored headquarters compounds are visual territorial markings with open pedestrian access, not impenetrable walls.

### Save safety

The existing `offensive-meme-city-v1` browser key and original World V1 gameplay remain untouched on the deployed website while this branch is under review. The draft introduces a separate `offensive-meme-city-v1-center` slot with schema v6, `worldVersion:1`, and `layoutVersion:2`; source raw bytes are copied to `offensive-meme-city-v1-center-source-backup` before migration. The new reader projects positions and defender posts by old district ID into the corresponding new district without changing earned XP, credits, purchased items, chapter claims, clan reputation, saved private plot tiles or outpost tiles. Unknown coordinates start at a safe central base spawn rather than writing old-world coordinates into new-world state.

The original game/source key continues to work after an emergency rollback. A fully qualified export/import and multi-tab conflict policy still need review before release. No automated test may run on a real player's browser save. Do not clear browser storage or remove any save slot.

### Release gates — automated checks passed; manual acceptance still required

1. **Original coordinate-dependent regressions — PASSED:** legacy mission, combat, crew, room, migration-preview and archived World V2 tests have been updated to named positions without bypassing the original gameplay assertions. The complete regression suite is green.
2. **Actual city route behavior:** ensure all shops, garages and marketplace counters are physically enterable, all station/mission interactions occur in their new district, guide NPCs align, all new clan HQ doors are accessible, and major roads permit continuous navigation.
3. **Save migration and reversibility:** test v1-v5 old data, protected backups, invalid/corrupt saves, quota failure, existing center saves, greenbelt fallback, old defender posts, plot/outpost ownership, quest state, room transitions and browser reload across deploys. Keep source keys immutable.
4. **Real browser visual QA:** take desktop and 412px/mobile screenshots showing centered player fortress, HUD, large map, separate clan compounds, shops and entrance visibility. Verify movement and touch navigation, actual Android hardware FPS, canvas memory and nav mesh budget. Do not assume Node tests validate the picture.
5. **Online room parity — HANDSHAKE PASSED:** client/server agree on layout version 2, and both reject mismatched versions. A staged server/client deployment must still be coordinated rather than assuming old online rooms remain compatible.
6. **Rendering performance:** the 11.2k×11.2k map is larger. Cache/draw only visible district scenery, road mesh and terrain layers. Do not add 25 empty chunks worth of rendering on every frame.
7. **Gameplay continuity:** player's solo start, original 360° avatars/NPCs, joystick, gun, HUD, fortress editor, clans, police behavior, missions, save recovery and return-to-solo button must all remain usable.

**Important:** Do not merge this PR, switch GitHub Pages, or redeploy Render unless these pass and the owner has reviewed the map visually. The previous attempted World V2 release failed by replacing a finished game with an incomplete prototype; do not repeat that.

## Design follow-ups

- More pedestrian paths/road junctions between districts, signage pointing to clan base entrances, and a city map key.
- Place additional stand-alone shops, clinics and gang businesses in unused areas after one fully tested store works outside Founder Square.
- Clan property identity via logo/banner, faction guard patrols, territorial boundaries, claimable sections and reputation benefits (with game-only credits).
- Distinguish the central player's privately buildable plot from surrounding **public** roads; no clan may lock the only bridge/path to the center.
- Optional transport or guided routes so trips between distant shops remain fun, not a long repetitive walk.

## Source links

Repository: https://github.com/kaibuzz0/Offensive-meme-launch-pad

Draft map work: https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/12

Stable original live game: https://kaibuzz0.github.io/Offensive-meme-launch-pad/city.html?release=world1
