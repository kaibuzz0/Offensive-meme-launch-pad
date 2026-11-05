# Meme City — camera and graphics milestone 1

**Status:** Rebased integration from original draft PR #30, review required; the canonical game stays in city.html. PR #29's 132-biome expansion and mining are already on main. Do not replace the existing 2D world or change signed wallet holder proofs.

## What actually works

1. A **Graphics** button in the live game tools and menu opens the same existing modal UI.
2. Top-down zoom options (**Wide, Classic, Detail**) change the original player's street and interior camera immediately. The quick zoom button cycles these modes, rather than resetting a user's preference.
3. Rendering quality is selectable (**Automatic, Performance 1x, Balanced 1.5x, High 2x**). It caps the existing Canvas device-pixel ratio to reduce fill rate on low-end Android phones, not the world geometry. The original avatar renderer, mining panels, overlays and controls are untouched.
4. Preferences are saved in a small, version-independent browser-local key: `offensive-meme-city-graphics-v1`. A failed/malformed/disabled storage read always falls back to classic settings. These settings never write to the protected `offensive-meme-city-v1-center` player save.
5. The Graphics panel includes an **optional real WebGL perspective prototype**: an interactive low-poly skull-inspired character stand-in wearing the currently selected token's color, block-built street geometry, and two actual perspective views (first-person eye-level with hands/tool; third-person camera behind character). This is not a new playable world or a photo-real avatar conversion. It draws on opening, perspective selection, or touch control actions, with no continuous render loop. It releases its WebGL resources on exit. WebGL-unavailable devices see an explanatory fallback.
6. No npm/CDN package, model download, or mod pack is required. Browser WebGL is a standard capability. The preview is generated entirely from code, not copied third-party artwork.

## What is NOT yet complete

- No live 3D streets, 3D world collision, bridge/terrain meshes, height raycasts, building interiors or **gameplay** first/third person character locomotion.
- The preview does not affect movement/aiming/shot physics, saves, player position, wallet holdings, or authoritative server state.
- The WebGL sample's procedural skull-like block avatar remains a placeholder and is not the current proprietary 2D skull character converted into a production skinned 3D skeleton.
- Physical Android FPS, graphics memory, battery/thermal and touch testing are not complete.
- No deploy or release of this prototype is authorized until review.

## External research

Reviewed upstream repositories and licenses:

| Upstream | License | Relevance | Integration choice |
|---|---|---|---|
| https://github.com/mrdoob/three.js | MIT | Production renderer, real scene graph, cameras, glTF loading | Preferred for eventual full 3D transition; no dependency yet for a small isolated preview. |
| https://github.com/hh-hang/three-player-controller | MIT | First-/third-person camera toggle, collision, joystick, camera obstruction | Strong candidate when world collision meshes and full 3D scene exist. |
| https://github.com/shrekshao/gltf-avatar-threejs | MIT code | Shared animated skeleton with swapable clothing skins | Adopt principles for token-skin character pipeline; example art separately licensed. |
| https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | CC0 | Fully rigged low-poly glTF/FBX avatars and animations | Optional temporary character assets; no binary model imported in this phase. |
| https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0 | CC0 | Skeleton characters and NPC animations | Research for unified future zombie/monk rig. |

**No upstream code/assets copied.** Camera test uses minimal original WebGL1 code to avoid adding a second full engine or increasing the main game's download and memory burden at this early stage.

## Next conversion milestones

1. Choose one reusable skeletal avatar model and verify model/animation/art licenses separately from software libraries.
2. Add a small, optional 3D test room attached to an existing location using the existing world coordinates, preserving the original 2D renderer as the baseline.
3. Author actual 3D terrain, building meshes and third-person character rotation; validate movement and collisions against the existing server-owned positions.
4. Implement camera obstruction, over-shoulder aiming, avatar animation, HUD reticle, and safe first-person transitions.
5. Benchmark physical Android devices before offering any live 3D camera toggle to players.

## Acceptance criteria

Run static checks, the complete existing Node suite, room benchmark and Chromium phone-sized smoke tests. The browser test must open the Graphics panel via the live game, exercise both preview perspectives, change the zoom/quality values, confirm the dedicated preference key updates and the protected player save stays byte-identical, then close the panel and keep playing the same world. Test a disabled WebGL context and corrupted storage behavior in Node.

Keep this integration in a new draft pull request until acceptance tests and owner approval.

## Milestone 2 — interactive preview-only character stage (2026-11-05)

This round advances the on-demand WebGL proof into an **interactive demonstration**, not full 3D gameplay. The existing first-/third-person views now follow a small finite local test avatar. The low-poly rig approximates the MEME CITY skull with eye sockets, teeth and token-colored clothing; its body, limbs and face share a consistent yaw and a bounded step animation.

Accessible mobile/touch controls in the original Graphics panel allow **Turn left / Turn right / Walk forward / Walk backward / Reset preview** in either perspective. The camera follows the preview avatar. Walking uses safe 0.8-unit steps with a max input of 1, a road corridor within x = [-1.2, 1.2], z = [-3, 9], and single rotations <= pi radians. Non-finite inputs and out-of-bounds steps are rejected. Reset restores the initial preview-only state. No game world geometry, player position, authoritative room movement, wallet proofs, inventory or player save is changed. Closing the panel frees the WebGL buffers/shaders, and unsupported devices expose no-op controls with descriptive status rather than crashing.

**QA:** Added deterministic stage tests covering turning, direction-relative motion, collision-like corridor bounds, rejection of invalid inputs, reset, and state isolation. Phone-sized Chromium checks exercise the real panel buttons, unavailable-WebGL fallback, and byte-identical Solo save after walking the preview. No external code or artwork added.

**Limitations:** The preview corridor is an original block scene, **not a rendering of the actual 132-biome world**; the skull body uses simple boxes, **not a skinned glTF/VRM model**. There is no gameplay character locomotion, collision mesh, real inventory/skeleton animations, 3D physics, mining, first-person shooting, live 3D building interiors, or cross-device performance guarantee. The original Canvas game remains active and independent.

### Remaining priorities

1. Implement reusable avatar geometry/skinning in a standalone, properly licensed glTF pipeline (consider verified CC0 KayKit prototypes).
2. Create a bounded 3D room or street mesh mapped to actual existing Meme City objects without changing the canonical 2D simulation.
3. Replace preview-only movement with validated state-derived 3D camera-follow only after 3D collision and camera-occlusion tests.
4. Optimize models, material draw calls, and WebGL context lifecycle on physical Android hardware before any in-game camera toggle.

## Integration update (2026-11-05)

PR #31 merged a working camera selector and its `meme-city-camera-view-v1` preference. The updated integration **retains that setting**, and synchronizes it with `CityGraphics` zoom preferences rather than replacing the current user interface. Pixel ratio quality and optional WebGL preview remain isolated from the game engine. This integration supersedes the conflicting first draft in PR #30; this branch starts from the latest `main`.

## Milestone 3 — existing World V1 geometry in the perspective lab

The browser graphics panel now obtains the existing `CityInteriors.BUILDINGS` authored world footprints and the current player's coordinates **only as read-only inputs**. `CityGraphics.createWorldScene` validates/caps the source, chooses the nearest real named door, maps up to 16 nearby building footprints to a small 3D perspective layout (120 world units per preview unit), and displays the actual selected landmark and origin coordinates. Roofs and volumes use the real building footprints and existing theme/accent colors, rather than four invented generic blocks. The local walking stage rejects steps into those 3D preview footprints; it retains its corridor bounds and reset behavior.

This is a **rendered world-data sample**, not a 1:1 real-world 3D traversal. The preview stage origin intentionally begins south of the selected building door; moving the test character changes **only** preview-local x/z/yaw. There is no player teleport, no mutation of game collisions, saved coordinates, rooms, missions, miner state or wallet entitlements. Additional terrain meshes, working door portals, actual camera syncing, skeletal animations, 3D mining and authoritative first-/third-person gameplay remain incomplete.

QA adds direct tests against the real authored building registry, nearest-landmark selection, tampered/invalid geometry rejection, bounded geometry count, collision checking and browser UI labeling. Devices without WebGL retain the safe 2D gameplay and a descriptive fallback.

## Milestone 4 — 3D camera obstruction and building facades (2026-11-05)

The optional perspective laboratory now has a **real segment-versus-3D-building-AABB camera-obstruction query**. In third-person, the desired camera retracts along the avatar-to-camera sightline before it can pass through one of the sampled authored 3D building volumes. The query respects all three axes (including building height), handles parallel/outside rays, validates non-finite camera inputs, and uses a small stand-off margin. First-person eye height remains bound to the preview avatar; **nothing changes the playable top-down camera**. This is a minimal camera obstruction baseline for future actual third-person gameplay, not a production physics/camera controller.

Preview-only walking now uses 0.1-unit bounded swept substeps, preventing a full 0.8-unit control input from tunneling through narrow walls; a rejected movement is atomic. The same real World V1 footprint volumes receive inexpensive procedural front facades with door-shaped inset, lit window panels, roof coping and trim. These architectural details use only original programmatically generated WebGL boxes, not imported unlicensed art or mod packs. **Doors remain cosmetic and closed**—real traversable 3D entrances and interiors have not been implemented.

Technical limitations: max 16 nearby buildings and shallow facades in the optional lab only; static topology; no terrain height mesh, true world 3D materials, skeleton animations, dynamic world building or destructibility. Prototype camera positioning may still need smoothing, tighter near-camera clipping and mobile GPU optimization before becoming a released camera mode.

Regression tests cover real sampled World V1 geometry, low roofs, third-person camera obstruction, clear parallel rays, malformed coordinates, thin-wall non-tunneling, reset/fallback, and gameplay/save isolation. Updated graphics script cache key is `v=54-camera-occlusion`. The existing public 2D game remains unchanged.

## Milestone 6 — 135-biome source sampling and jointed procedural avatar (2026-11-05)

The optional WebGL lab now samples a capped **8×8 terrain grid (64 tiles)** from the exact `CityBiomes` and `CityFrontier` region queries used by the live 2D world: three older Center City biomes plus the 132-region frontier. For each tile, it converts existing authored region colors (or frontier HSL palette), material, and bounded procedural roughness into an inexpensive shallow 3D ground block. The renderer draws those tiles only when the Graphics panel is opened or its preview is manipulated. All 64 tile records are immutable and all palette inputs are validated. It introduces no new dependencies, downloads, wallet prompts, or mod packs.

When the real player is near a selected authored biome far from the downtown buildings, the camera sampler uses the player's read-only location and reports the actual biome name, instead of pretending a downtown building is local. Existing World V1 buildings still appear within urban sample scenes. The Graphics panel identifies the sampled terrain name and capped tile count. These tiles are **pure visual relief**: they do not alter the world's real terrain height, mining strata, water, navigation, physics, collisions, NPCs, save data, or server authority.

The skull-inspired WebGL preview avatar now uses a **procedural hierarchical box rig**: each arm has upper/lower segments with elbows and wrist, each leg has thigh/shin segments with knees/feet, and segment pitch is composed correctly with parent yaw. A deterministic walk-step pose drives opposing arm and leg swings, knee flex and head/torso bob. This is not a skinned glTF/VRM asset, real motion capture, continuous gait scheduler, or final shared NPC avatar; those remain future milestones. No third-party character model or unlicensed assets were imported.

Tests cover real named biome data across all 12 frontier families, material colors, 64-tile caps, immutable terrain, source-preserving scene origin, malformed inputs, procedural limb pose and safe no-op WebGL fallback. Real phone-sized Chromium acceptance also checks the terrain label and first frontier biome. `city-graphics.js` and `city.js` are cache-busted at `v=55-biome-rig`; the original 2D city continues as the default on `main`.

**Remaining:** Physical Android profiling, optimized mesh batching, real 3D height collision, enterable room geometry, gameplay camera handoff, proper skinned character/animation assets, biome obstacles, and production rendering benchmarks. Do not merge this draft experimental camera lab into `main` until approved.

## Milestone 7 — single-draw batched 3D scenery (2026-11-05)

The optional graphics laboratory now **bakes bounded static scenery into one interleaved GPU mesh** at preview creation rather than issuing an independent WebGL draw for every terrain tile, facade and building. `CityGraphics.createStaticMesh(scene)` takes the same validated World V1 scene as before, caps inputs to 64 terrain samples and 16 building samples and static primitive count to 240, and writes triangles as six float32 values per vertex (XYZ + normalized RGB). Geometry is uploaded once to a static VBO; a WebGL1 vertex-color shader renders the entire static batch with **one draw call per preview repaint**. The avatar's procedural jointed rig is still drawn separately, maintaining independently animated limbs and the existing first-/third-person camera behavior.

A small **GPU diagnostics line** in the existing Graphics panel reports static draw calls, animated draw calls, static cube count, static memory allocation in KiB and buffer upload count. These counts reflect the renderer's WebGL calls, not independent measured FPS or mobile memory usage. The feature makes no new network/CDN requests and uses no imported engine, textures, external models, or mod packs. Buffers/shaders are released when the panel is closed. Unavailable/lost WebGL contexts have a safe 2D fallback, and a lost context rejects redraws.

Regression coverage constructs deterministic RGB vertex buffers from real authored city scene data, checks per-vertex RGB and finite coordinates, prevents excessive buffer size, asserts one static scene draw, checks WebGL resource deletion and context-loss guard, and exercises the actual mobile-sized Chromium Graphics interface. This advances GPU efficiency in the experimental preview only; it is **not** a finished in-world 3D camera, working glTF skeletal model, terrain LOD engine or verified Android FPS optimization. The shipped 2D `main` game stays unchanged until explicit release approval. Cache-bust version: `v=56-static-batch`.

## Milestone 8 — reusable avatar rig and one dynamic draw (2026-11-05)

The optional 3D lab now exposes `CityGraphics.createAvatarRig(phase,mode,outfit)` as a **pure, immutable, reusable character definition**. Both first-person arms/tool and the third-person skull, jaw, eyes, torso, upper/lower arms with elbows and wrists, thighs/shins/knees/boots and blaster derive from the same deterministic `avatarPose` gait and cosmetics. Named joints and their local-space positions, dimensions, colors and pitch are available for reuse by future NPC skins or alternative renderers. This remains a **procedural block rig**, not a skinned glTF model or authored skeletal animation asset.

`createAvatarMesh(snapshot,mode,outfit)` transforms those joint parts into finite **world-space interleaved XYZ/RGB vertex data**, using the preview's yaw/position and stable gait phase. The rendered preview now uploads the changing character mesh to a preallocated dynamic WebGL1 buffer and draws the entire animated avatar with **one dynamic draw call per preview repaint**, in addition to the previously implemented **one static draw call** for biome terrain/buildings. The existing Graphics panel also reports live avatar vertex and pose-upload counters. Camera obstruction, terrain sampling and the canonical 2D gameplay remain unchanged.

Memory is capped at **56 avatar parts** and one preallocated dynamic buffer; WebGL resource teardown includes the avatar buffer. No third-party game engine, downloaded animation/model packs, wallet access, or new network dependencies are needed. The code still runs **on demand** on Graphics-panel interactions, not as a continuous animation loop; consequently real-time walking, gameplay avatar animation, online NPC synchronization, full glTF model ingestion, proper 3D camera/game state sharing and physical Android FPS profiling remain incomplete.

Tests validate unique stable rig part names, joint positions and immutability, deterministic mesh bytes across repeated poses, changing meshes under position/yaw/walking, first- versus third-person mesh selection, nonfinite input rejection, one avatar GPU draw and mobile-sized Chromium rendering. JS cache-bust release `v=57-avatar-batch` retains the existing CSS release and does not touch the live game on `main`.

## Milestone 9 — read-only real player coordinate and aiming camera bridge (2026-11-05)

The optional 3D Graphics preview can now align to the **actual current World V1 player's coordinates and aiming direction** on demand. `CityGraphics.samplePlayerCamera(scene,player,aim)` performs a pure, validated conversion from 2D world coordinates (X east, Y south) into the local preview space (X east, Z north) at the existing 120:1 world/preview scale; player aiming defines the 3D avatar's yaw. It explicitly rejects malformed, out-of-scene, or interior-only samples. All returned snapshots are frozen and never alter the original game player.

The Graphics panel now includes **Mirror current player position & aim** and **Return to demo avatar**. The former reads the existing `me` player object (including the latest server-supplied `me` in online rooms) and the original 2D `aim` vector, draws a read-only 3D representation at that location and reports the sampled game X/Y and heading. The independent preview walking/turning controls still work; a successful demo move leaves mirrored mode automatically, while reset returns the demo stage to its origin. Source-world terrain meshes, static GPU batching, token-colored appearance and first-/third-person selection remain intact.

**Important limitations:** This is an **on-demand, read-only pose snapshot**, not a continuous gameplay camera, a new player controller or a second world. Opening the modal still pauses normal in-game movement; the experimental 3D view doesn't fire weapons, enter buildings, grant rewards, mine blocks, save player coordinates or send authoritative game actions. The scene is a bounded, simplified world sample: a player far outside it must reopen the preview after moving to that area to resample local buildings/biomes. Real-time camera following, occlusion smoothing, multiplayer avatar state streams, 3D collision, full world mesh streaming, animation blending and physical Android profiling remain release blockers.

Node tests verify pixel/world axis conversion and heading in four cardinal directions, frozen outputs, bad-input rejection and non-mutation of the source player and aiming vector. The phone-sized Chromium test opens the real Graphics menu, activates the mirror and returns to demo mode, checks sampled coordinate reporting, checks invalid interior rejection and verifies the original Solo save remains unchanged. Only `city.js`/`city-graphics.js` cache-bust references change to `v=58-player-mirror`. No new dependencies or asset downloads.

### Center-world locality regression fix

Real phone-sized Chromium testing revealed the original Solo character could start at world `(5600,5940)`, while the earlier landmark-only sample incorrectly placed the 3D origin around `(7300,5517)`. That made a legitimate player fail the camera bridge's bounded-area validation. `createWorldScene` now uses the actual player's locality whenever the nearest authored building is more than 850 world units away **and the existing terrain query is valid**, including unnamed urban streets as well as the named frontier. Near an existing building, the original building-centric sample remains unchanged. A deterministic regression test locks this behavior to the actual Solo center-world spawn; the module is cache-busted to `city-graphics.js?v=59-locality-mirror`. No fake coordinates, teleportation, or player movement were added.
