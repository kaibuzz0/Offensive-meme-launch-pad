# PR #32 — Merge readiness and release gates

**Target:** Safely merge an **optional, opt-in 3D camera** into the existing playable World V1, while retaining the 2D view as the default. This release target is **not** the full completion of a standalone 3D world or replacement for Canvas gameplay.

**Current position:** Development branch `codex/finish-camera-webgl-integration`, [draft PR #32](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/32). Do not mark ready or merge merely because green CI exists. The owner has not requested merging immediately.

## Acceptance matrix for the opt-in merge

| Merge gate | Evidence to accept | Status |
|---|---|---|
| 1. One real playable World V1 | Solo Play, 2D controls/HUD, original Canvas assets, wallet, save migration and mining remain intact | Implemented; automated/browser regression required at exact head |
| 2. Native 3D feature is opt-in | Default off, 2D continues while perspective inset operates, camera can close safely | Implemented; phone-sized Chromium acceptance required |
| 3. Authoritative player/NPC state only | Observes original player, aim and NPC arrays; no second engine, AI or network action | Implemented; deterministic source and behavior tests |
| 4. Bounded world/actor rendering | 64 terrain cells, up to 16 buildings, up to six nearby living NPCs, batched GPU draw calls | Implemented; resource bounds and real-browser inspection required |
| 5. Failure isolation | WebGL initialization, draw, context-loss or teardown cannot stop the original 2D frame loop | Implemented; fault-injection tests and hardware checks needed |
| 6. Complete automated gate | Node suite, asset/syntax check, multiplayer benchmark and phone-sized Chromium game acceptance | **Revalidate against exact final commit** |
| 7. Real Android hardware | Check WebGL support, mobile touch targets, FPS, memory, thermal, orientation and context-loss recovery on an actual Android device | **Not verified** |
| 8. Multiplayer browser acceptance | Actual hosted-room cross-client movement, nearby player/NPC visuals, reconnect and server-authoritative combat with opt-in 3D | **Not verified end-to-end** |
| 9. Final review / owner signoff | Check source diff, visuals, accessibility, performance and any new `main` commits; owner explicitly authorizes merge | **Pending** |

**Merge readiness is not a percentage of completed 3D gameplay.** The first six gates have implementations, but their completion must be based on exact-head CI and acceptance. Gates 7–9 remain unverified or require explicit approval. A provisional numerical readiness estimate for this *optional camera merge* may be offered in handoffs, but never as a measured completion percentage.

## Non-blocking future game features

Full-screen third-person control, true 3D movement/physics, mineable underground geometry, production rigged/animated models, enterable 3D interiors, destructible world pieces, 3D NPC combat interactions and large-scale LOD/streaming remain **separate feature milestones**. These are **not completed** by merging the opt-in preview, and must not be described as merged production gameplay.

## Final release procedure

1. Fetch latest `main` and PR #32 head; inspect conflict/mergeability status. Confirm no newer incompatible changes.
2. Test `npm run verify:full` on the exact release candidate, including static asset paths, genuine mobile Chromium input acceptance and original save-isolation tests.
3. Review Android hardware and actual multiplayer host/client QA results. Fix failures, add regression tests and repeat validation.
4. Review UI/graphics, security boundaries and the opt-in fallback with the owner; obtain **explicit release approval**.
5. Only then mark the draft ready and merge the verified exact head. After merge, verify the GitHub Pages deployment and live Solo Play. Keep rollback instructions and protect original saves.

## Next concrete batches

1. Complete mobile GPU/thermal and WebGL context-loss recovery diagnostics, with hardware testing.
2. Add hosted multiplayer live-3D browser QA and reconnect/resume tests with the existing room server.
3. Run the final diff and release checklist, refresh exact-head CI and request merge approval.

This document tracks acceptance, not a promise that testing or merging happened.
