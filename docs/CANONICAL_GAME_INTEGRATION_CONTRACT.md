# Canonical Game Integration Contract — graphics/release checkpoint (2026-11-08)

Status: **proposed integration contract, not shipped gameplay**. Baseline main `8f0e6d1`. This document supplements `docs/DEVELOPMENT_COUNCIL.md` and issue #43; current implementation must be inventoried before binding names or changing public URLs.

## Single entry and invariants

- One primary homepage/PWA Play action enters the first-person game. Offline Solo requires no wallet. Multiplayer is a session of the same game, not a second gameplay engine.
- Canonical world identity: `{worldSeed, generatorVersion, worldId}`. All renderers consume one immutable-per-frame world snapshot and the same authoritative collision/interactions. Rendering quality changes only presentation, never terrain height, object IDs, collision, item ledgers, or player progression.
- State ownership: world generation owns seeded base content; sandbox owns validated edit/inventory transactions; physics owns bounded fixed-step movement and seat/control contracts; living world owns stable NPC/landmark identities; graphics owns presentation/rig/material adaptation; QA owns parity and budget evidence. No owner independently rewrites the entrypoint, save format or world generator.
- A render adapter accepts the same snapshot, camera, visible object list and quality budget, and returns presentation metrics. WebGL failure may switch adapter **in place** without spawning a different world or save. Compatibility rendering is not a flat-map fallback.
- Content definitions carry stable IDs, schema version, category, references to geometry/material/rig/sockets, optional capabilities, provenance and safe defaults. Instance state is stored separately. Unknown content IDs remain recoverable.

## Save migration (release blocking)

1. Enumerate legacy localStorage/IndexedDB keys and active save versions; preserve original raw records and export/backup before any writes.
2. Decode old records into a **new staging slot**, preserving unknown IDs and untranslatable data in a namespaced legacy payload. Never delete originals.
3. Validate coordinates, seed/generator identity, inventory ledger, placed edits and object IDs; reject invalid staging data without modifying the active save.
4. Commit with a version marker only after successful validation. Re-running migration is idempotent; failures restore original active slot.
5. Verify offline Solo reload, duplicate-input protection, world edits, avatar/equipment and compatibility renderer against old-save fixtures before redirecting legacy entry URLs. Keep rollback instructions and atlas access.

## Smallest complete player-facing batch (rungs A → B)

| Owner | Scoped deliverable | Acceptance |
| --- | --- | --- |
| Graphics #46 / release #43 | Single Play route; shared renderer snapshot; bounded scenery at fortress-road-to-lodge; coordinate PR #81/#82 | Desktop + mobile-emulated screenshots from identical seed, no blank startup; WebGL and compatibility display same landmarks and interactions |
| Physics #49 | Fortress gate/road/headroom and touch traversal | Fixed-step collision identical at every detail setting, no clipping or trapped spawn |
| Living World #45/#56 | Stable lodge, road and trader IDs | Terrain-fitted, enterable lit lodge, reproducible seed and collision |
| Sandbox #48 | Roadside gather → craft/place → save/reload | One atomic inventory/placement ledger, repeat-safe transactions, persistent edits |
| QA #47/#57 | Baseline and release evidence | `npm test`, `npm run check`, Chromium public Play path, offline reload, Android emulation explicitly distinguished from physical device |

Release order: verify canonical startup and backups → reconcile #81 lodge and #82 workbench conflicts with current main → integrate physics and shared renderer parity → complete gather/build/reload → validate public Pages and PWA → only then retire duplicate selectors. Do not merge draft or conflicting PRs solely because unit tests pass.

## Graphics, content and flight sequencing

- Begin wardrobe with a small set of free headgear/clothing choices; use existing firing rig and shared equipment IDs for first-person hands and world avatar. Preview/equip/reload and collision/clipping checks are required before claiming shipped customization.
- Extend existing modular building kits and instanced/batched scenery; stream/cull by measured distance and release obsolete buffers. Record frame-time percentiles, draw/mesh counts, memory and startup bytes in quiet and crowded paths. Targets are provisional until physical Android measurements.
- Flight #53 depends on Physics #52 shared seat/enter/exit/control/save contract. Flight samples the same seeded geometry and collision queries, never a separate map. Require takeoff, landing, reload, touch controls and bounded streaming before release.
- Research candidates go only in issue #44 with exact version/license, dependency/bundle/runtime evidence, integration effort, owner and adopt/defer/reject decision. Do not import BAREIRON or proprietary assets without license review.

## Release evidence template

Report separately: **implemented in branch**, **PR green**, **merged**, **Pages deployed**, **public player-eye-level verified**, and **physical Android measured**. Include exact SHA, Play URL, seed/viewpoint, interaction tried, save migration fixture, before/after performance evidence and remaining blockers. CI success alone is not proof of visible gameplay.
