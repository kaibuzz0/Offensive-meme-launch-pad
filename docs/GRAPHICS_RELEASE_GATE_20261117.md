# Graphics/release gate — 2026-11-17 (integration #43, rendering #46, flight #53)

This is a scoped release handoff, not proof of deployed gameplay. The canonical game contract remains [CANONICAL_GAME_RELEASE_CONTRACT.md](CANONICAL_GAME_RELEASE_CONTRACT.md); this file records a testable next increment without changing runtime or superseding existing owner paths.

## Next incomplete rung: A, then B

**Blocking route:** homepage Play → wallet-free offline first-person Solo → recognizable fortress and mountain skyline → touch-look and touch-move through fortress gate → wooded road → lit interior → acquire/place an item → reload and confirm the same seed, inventory and edit. Run with WebGL1 and compatibility renderer against the *same* seeded world and player snapshot. Capture a screenshot and coordinates at each landmark. A green unit suite or browser bootstrap alone does not satisfy this route.

**Smallest cross-owner batch**
- **Physics #49:** repair or instrument touch-look heading restoration and gate collision/trigger traversal. Compare yaw with `atan2(sin(a-b), cos(a-b))` at *every* assertion, including the final assertion; log touch positions, yaw, player coordinates, collision and gate activation on timeout. Avoid masking a genuine traversal failure with larger timeouts.
- **Graphics #46 / integration #43:** own only scene visibility, renderer parity and release wiring. Confirm the gate, skyline, wooded road and lodge are recognizable from player-eye level, not just loaded in memory. Keep fallback gameplay geometry/interaction IDs identical. Do not add a new low-quality edition or independent controller.
- **Living World #45/#56:** expose stable gate/lodge/actor IDs and deterministic terrain-fit placement; reconcile the roadside content PR with current main before claiming it is available.
- **Sandbox #48:** test pickup, inventory ledger, placed edit and reload, including older saves without voxel-scale metadata; preserve original save bytes if a migration cannot map data.
- **QA #47/#57:** run exact-head `npm test`, `npm run check`, original Solo and mobile-viewport first-person Chromium, both renderers, and save/reload. Report physical Android data separately from Chromium emulation. Capture startup, p50/p95 frame time, long stalls, mesh/draw count and memory where measurable.

## Shared interfaces / ownership

- World identity: `{seed, worldgenVersion, chunkId, voxelScale, stableObjectId}`; terrain queries and collision must agree with both render backends. Generated content is deterministic; edits are a separate validated overlay.
- Player identity: one movement/pose/loadout/inventory/interaction state for offline Solo and multiplayer. Input devices emit actions, not alternate game rules.
- Rendering: consume immutable or versioned world snapshots plus player pose; automatic LOD, distance, resolution and effect scheduling may change only presentation, never world/collision/object identity.
- Persistence: copy → validate → activate with backup, repeat-safe migration, explicit quarantine for unknown fields and interruption recovery. Do not redirect historic URLs or remove original Solo until browser parity and save migration pass.
- Flight #53: **deferred behind** #52 seat/vehicle/controller/save contract and successful starter-route release; no separate flight world, camera-state store or controls.

## Merge order and acceptance

1. Review fresh exact-head status for Physics gate/touch-look fixes; resolve angular wrap and capture traversal evidence.
2. Review Sandbox historical-save compatibility and Living World branch conflicts; rebase/reconcile rather than blindly merge.
3. Run cross-owner integrated Chromium route, including compatibility renderer and repeated save migration.
4. Merge only reviewed, compatible, exact-head-green PRs in dependency order; follow GitHub Pages deployment and verify the *public* homepage-to-interior path.
5. Only after verified parity/migration retire duplicate public mode selectors and redirect old URLs.

**Research focus:** prioritize existing meshing/LOD/instancing utilities and previously vetted #44 candidates. Do not import a renderer or assets solely to address an input/test failure; evaluate license, revision, size and actual Android runtime cost before adopting any external code.

**Evidence labels required in release reports:** source implemented / PR-only / merged to main / Pages deployed / public browser visually verified / physical Android measured. Never conflate them.

## Exact-head Chromium failure triage — 2026-11-17 19:04 UTC

PR #198 head `b48a863a` failed [workflow 44154086847](https://github.com/kaibuzz0/Offensive-meme-launch-pad/actions/runs/44154086847), job 134289982636, at `scripts/city-terrain-browser-smoke.mjs:162`: **Timeout: walk under the fortress arch**. This is not the earlier heading-restoration timeout. Start: yaw 0.099229, position (16.021, 6.212). Timeout: position (38.707, 44.523), yaw 0.099229, inputForward -1, grounded true, WebGL, gateHidden true, suppliesHidden true, 89/89 chunks, 254k vertices, approximately 16 fps, reported GPU bytes 9,153,648, no uncaught errors. Movement and rendering occurred; the cause of the missing gate trigger is **not established**. Geometry, approach alignment, collision, trigger bounds and frame timing are hypotheses.

**Next bounded action:** Physics #49 and QA #47 reproduce with fixed seed, gate trigger bounds, capsule position/contact normals, input pulses, yaw and frame-step count. Compare passing #195 against #198 at the same viewport and seed; do not merely extend the timeout. Graphics #46 captures a player-eye screenshot at the failure position and checks gate geometry/interaction identity in WebGL and compatibility rendering. Sandbox #48 resumes persistence acceptance only after traversal passes. This failed workflow does not authorize merge or deploy.

## Release triage refinement — 2026-11-17 22:04 UTC

Fresh PR metadata still places main at `46914cd0`; #195 (`b0d60ea9`), #196, #197, #198 are mergeable **drafts**, while #161 is conflicted. Do not infer a deploy from a green workflow. Diff review confirms #195 restores yaw through actual mobile touch-look pulses and compares wrapped angles in the final assertion; the earlier angular-wrap concern is resolved in source. Its passing exact-head CI does **not** establish that #198's independent fortress-to-interior route passes.

**Important ambiguity in #198 timeout evidence:** `gateHidden=true` and `suppliesHidden=true` are DOM visibility flags, not proof that the gate was never activated or that supplies were collected. Before editing physics, log the actual gate activation flag, trigger bounds, player capsule position, collision obstruction response, and authoritative pickup ledger separately from element visibility. Record the exact wait predicate and whether the gate transition happened before the timeout. Compare the same seed, viewport, and PR head. Distinguish a wrong test predicate from an impassable gate, and do not relax acceptance merely to make CI green.

**Merge gate:** keep #198 draft until its own exact-head Chromium route succeeds and the screenshot/interaction evidence is reviewed. #196's rejection of missing voxel-scale metadata needs a non-destructive historical-save migration path; #197's journal-only tests cannot substitute for inventory/geometry/reload browser acceptance. No public visual or physical Android verification this checkpoint.
