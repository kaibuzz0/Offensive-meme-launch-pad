# Graphics/release integration checkpoint — 2026-11-07

This checkpoint supplements docs/DEVELOPMENT_COUNCIL.md and issue #43. **No second game, controller, world store, or render-specific physics.**

## Verified repository facts
- Main at inspection: `4f76857ba19abfcb82409c04b7e84eb852b0f644` (merged #98 seeded roadside foliage); #97 fortress chunk seams and #93 homepage canonical first-person link already merged.
- Canonical entry during migration: `city.html?terrain=1`. Preserve wallet-free original Solo, prior save keys and URLs until validated migration and feature parity.
- Pending #82 supplies/workbench reducer is not connected to renderer or durable storage. #99 starter trader is descriptor-only, not a visible NPC. #96 fallback test is CI-green but does not establish post-fallback interaction or physical Android parity.
- Historical #80 is a lead, not proof of deploy; inspect its present merge and CI status before action.

## Single-game interfaces and ownership
| Contract | Producer | Consumers / acceptance |
| --- | --- | --- |
| Seed, worldgen version, stable chunk/voxel/feature IDs, authoritative collision geometry and generated settlement descriptors | Living World #45/#55/#56 | Graphics renders identical geometry; Physics queries same world; Sandbox edits overlay same IDs |
| Fixed-step player pose, reach, collision, seat and movement state | Physics #49/#50/#52 | Graphics camera/rig; Sandbox reach; flight #53 extends shared seat/controller, never a parallel scene |
| Item ledger, equip slots, edit journal, validated transaction revision | Sandbox #48/#51/#54 | Graphics first-person/world-avatar same equipped ID; QA save/reload and multiplayer authority |
| Snapshot + change events (world, actors, items, edits) | Integration #43 | WebGL and compatibility renderer consume same snapshot; detail changes affect presentation only |
| Versioned save copy/validate/activate with backup and unknown-field quarantine | Integration #43 + QA #57 | Repeat-safe interruption, reload, legacy fixtures and cross-tab integrity |
| Runtime budget metrics and parity fixtures | QA #47/#44/#57 | Render LOD/distance/shadows/resolution adapt automatically; never drop collision or interactions |

## Next smallest complete cross-system release batch — rung A → B
1. #43: confirm homepage Play → terrain first-person and existing Solo; inventory exact storage keys and PR overlap. No legacy redirect until migration tests pass.
2. #48: expose #82 reducer through ONE validated durable transaction and one reachable workbench/torch placement, reusing existing supply pickup. Do not treat localStorage read/write as atomic.
3. #45/#56: expose existing lodge/trader descriptor to renderer; no new NPC controller. #46: show a terrain-fitted, lit roadside interior and visible placed workbench/torch through existing chunk geometry and shared renderer.
4. #49: prove reachable path, doorway headroom and placement collision at actual terrain elevation; no separate movement implementation.
5. #47/#57: exact-head npm test, npm run check, desktop and mobile-viewport Chromium action/reload, WebGL/fallback same-world screenshot and interaction, measured frame-time/memory; distinguish emulation from physical Android.
6. #43: merge only compatible green heads in dependency order; inspect Pages publication and public homepage-to-interaction route. Publish actual URL/commit/screenshots and failures.

## Wardrobe and flight follow-on
Once the complete gather/place/reload route is publicly verified, add 2–3 free visible outfits/headgear using the established firing rig, bounded slots and shared first-person/world-visible loadout IDs; persist and preview before adding a catalog. Flight #53 is deferred until a ground vehicle and seat contract is working; it will reuse the same world query, collision, state and mobile controls. Research #44 should first evaluate the existing mesher/instancing before adopting a new engine or asset dependency.

## Non-negotiable gates
No claim of rendered or deployed NPC/wardrobe/flight based on descriptors alone. Preserve old saves and unknown fields. Do not remove legacy paths, collapse WebGL fallback into a different world, merge unverified PRs, or claim physical-device performance without measurement.
