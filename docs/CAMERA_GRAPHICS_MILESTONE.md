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
