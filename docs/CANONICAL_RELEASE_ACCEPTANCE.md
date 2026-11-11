# Canonical game release acceptance — graphics/integration handoff (2026-11-10)

This is a **release gate**, not evidence that these features have shipped. Follow [DEVELOPMENT_COUNCIL.md](DEVELOPMENT_COUNCIL.md) and issue #43. This document supplements the existing contract; it does not create another game mode.

## Single-scene rendering interface

The canonical runtime produces one immutable-for-frame scene snapshot containing `worldSeed`, `worldgenVersion`, stable `chunkId` and `objectId`, terrain/edit revision, player pose, entity poses, equipment IDs, material IDs, light descriptors and interaction targets. The WebGL and compatibility backends consume the **same** snapshot and return rendering diagnostics; neither backend may own movement, collision, inventory, world generation or save mutations. Rendering quality changes view distance, mesh/texture LOD, resolution and effects only. A compatibility backend must preserve usable object IDs and interactive geometry, not silently switch to a flat alternate game.

## Save activation boundary

Before modifying existing storage: enumerate all old storage keys and versions with representative fixtures. Copy raw source bytes to a recoverable backup, convert into a new versioned key, validate seed, player pose, stable object/edit IDs, inventory ledger and unknown-field quarantine, then read back before activating. Re-running migration must be idempotent; failed conversion must leave the old save and active pointer untouched. Test interruption and reload. Only after browser acceptance and parity may old URLs redirect to the canonical entry. Offline Solo cannot require a wallet.

## Smallest player-visible A→B batch and owners

| Dependency | Owner | Concrete proof |
|---|---|---|
| Fortress/mountain skyline, wooded road, lit lodge identifiers and seeded viewpoint | #45/#56 | Same landmarks and geometry IDs after reload |
| Collect one resource, place one block, reload | #48/#51/#54 | Atomic ledger and edit replay; no duplicate rewards |
| Door/headroom, touch move/look and shared fixed-step controller | #49/#50/#52 | Fortress arch and lodge reached without collision bypass |
| WebGL/fallback materials, lighting, avatar and held-item sockets | #46/#53/#43 | Identical targets, visible pixels and interactions on both backends |
| Startup, p95 frame time, stall, mesh and RAM baseline | #47/#44/#57 | Exact-head desktop/mobile-emulated Chromium evidence; physical Android separately labeled |
| Integration, PR ordering, homepage Play and Pages publication | #43 | Exact SHA, successful tests, deployment ID, actual public screenshot and saved interaction |

No wardrobe or flight *release* until this route is verified. Flight prototypes must use the same vehicle seat/control/world/save contracts as ground vehicles, with no second camera/controller or separate map. Avoid touching other owners' modules without a #43 handoff.

## Release checklist (record results, do not assume)

1. `npm test` and `npm run check` on the exact proposed SHA.
2. Desktop and mobile-viewport Chromium: homepage Play → first-person fortress and mountains → wooded road → lit lodge/interior → collect/place → reload, with screenshot/pixel evidence and actual controller position.
3. WebGL and compatibility backend parity: same seed, scene IDs, collisions, inventory, equipment, placement and save. Capture before/after viewpoint.
4. Old-save fixtures: copy/validate/activate, repeat run, interrupted run, unknown IDs, and rollback. Original wallet-free Solo remains reachable until migration verified.
5. Measured startup, frame-time p50/p95/p99, long-task stalls, mesh/draw load, RAM/GPU estimates and long-travel cache behavior. No fabricated physical-device metrics.
6. Review all active PR exact-head checks and conflicts, merge only compatible green changes, verify Pages deploy SHA and inspect the public homepage/game route.

**Current status:** requirements documented only. No runtime implementation, npm/Chromium execution, mobile benchmark, PR merge or live visual verification is implied by this file.
