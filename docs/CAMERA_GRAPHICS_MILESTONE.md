# Meme City — camera and graphics milestone 1

**Status:** Development branch only; the canonical game stays in city.html. PR #29's 132-biome expansion and mining are already on main. Do not replace the existing 2D world or change signed wallet holder proofs.

## What actually works

1. A **Graphics** button in the live game tools and menu opens the same existing modal UI.
2. Top-down zoom options (**Wide, Classic, Detail**) change the original player's street and interior camera immediately. The quick zoom button cycles these modes, rather than resetting a user's preference.
3. Rendering quality is selectable (**Automatic, Performance 1x, Balanced 1.5x, High 2x**). It caps the existing Canvas device-pixel ratio to reduce fill rate on low-end Android phones, not the world geometry. The original avatar renderer, mining panels, overlays and controls are untouched.
4. Preferences are saved in a small, version-independent browser-local key: `offensive-meme-city-graphics-v1`. A failed/malformed/disabled storage read always falls back to classic settings. These settings never write to the protected `offensive-meme-city-v1-center` player save.
5. The Graphics panel includes an **optional real WebGL perspective prototype**: a static low-poly character stand-in wearing the currently selected token's color, block-built street geometry, and two actual perspective views (first-person eye-level with hands/tool; third-person camera behind character). This is not a new playable world or a photo-real avatar conversion. It draws only when opened/selected, with no continuous render loop. It releases its WebGL resources on exit. WebGL-unavailable devices see an explanatory fallback.
6. No npm/CDN package, model download, or mod pack is required. Browser WebGL is a standard capability. The preview is generated entirely from code, not copied third-party artwork.

## What is NOT yet complete

- No live 3D streets, 3D collision, bridge/terrain meshes, height raycasts, building interiors or first/third person character locomotion.
- The preview does not affect movement/aiming/shot physics, saves, player position, wallet holdings, or authoritative server state.
- The WebGL sample's block avatar is intentionally a placeholder and not the current proprietary 2D skull character converted into a production 3D skeleton.
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

Keep this work in a new draft pull request until the owner explicitly approves a merge.
