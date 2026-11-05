# Meme City — Development Runway

This guide is for getting more **working, tested game progress per development session** without weakening the safeguards around the single playable World V1.

## One session = one usable vertical slice

1. **Inspect current truth.** Fetch latest `main`, the active PR head and CI before editing. Read current `DEVELOPMENT_STATUS.md` and the relevant component. Do not assume an older summary or another AI's work is the current state.
2. **Choose one vertical slice with visible acceptance criteria.** A slice should include its actual gameplay/render change, necessary UI, tests, and short documentation. Work on 2–3 closely related changes in one batch when safe, rather than completing one tiny cosmetic adjustment per session.
3. **Build directly in existing World V1.** Preserve `city.html`, Solo Play, wallet links, saved data, 132 frontier regions, mining, HUD and server-authoritative multiplayer. Keep experimental 3D behind the optional Graphics panel until it meets live-game acceptance.
4. **Run the smallest relevant tests after edits.** Fix errors before pushing. Use the focused commands below; they run existing Node test files only, not browser tests. Scope matching is deterministic by filename and is printed by `npm run test:scopes`.
5. **Push a coherent batch** with an explanatory commit/PR note. Avoid pushing after every one-line change: each push launches expensive CI and makes concurrent handoffs harder. Never force-push over newer work; fetch the branch head again before editing.
6. **Run the full acceptance gate on the final candidate.** A clean scoped check is a feedback loop, not release certification. Full tests, static integrity, multiplayer simulation benchmark and real Chromium smoke acceptance remain required for gameplay changes. Check the exact pushed commit's CI result.
7. **Handoff only verified facts.** Record finished features, tests, latest commit, known limitations, next concrete vertical slice, and whether the change is merged/deployed. Do not claim prototype views are live gameplay.

## Fast local commands

| Intent | Command | Coverage |
|---|---|---|
| Discover the scope list | `npm run test:scopes` | Lists matching test files, no tests run |
| Camera, avatar, rendering | `npm run test:graphics` | Graphics-focused Node regression tests |
| Biomes, map, navigation, mining | `npm run test:world` | World-focused Node regression tests |
| Engine, combat, saves, multiplayer | `npm run test:systems` | Systems-focused Node regression tests |
| All automated Node and static checks | `npm run verify:all` | Full Node suite plus static integrity |
| Release candidate / browser acceptance | `npm run verify:full` | All checks, room benchmark, real headless Chromium |

`verify:full` requires a working local Chrome/Chromium installation; GitHub Actions runs the browser acceptance separately. The public deploy pipeline and original `npm test` / `npm run check` are unchanged. **The development runway does not bypass CI.**

## Efficient task allocation

For a new 3D feature, prefer a *single cohesive change* like:

- Draw an actual nearby gameplay entity using authoritative position; update camera, frame presentation and tests in the same batch.
- Integrate world geometry in one confined viewport area, including collision, entry/exit behavior and proof that the original save is unchanged.
- Instrument and reduce a real rendering bottleneck with before/after draw statistics and phone-sized Chromium coverage.

Avoid creating parallel world engines, adding speculative systems or changing save schema when the same current world can supply the data. Work incrementally toward the next usable third-person neighborhood **inside the existing game**, not a new throwaway showcase.

## Definition of done

A batch is only called **completed** when its code is pushed; its existing gameplay route still loads; changed behavior is covered by tests; full CI is green at the exact head; regression and save-isolation claims are substantiated; and its PR clearly describes any prototype-only limitations. Draft experimental graphics work must remain draft/unmerged until explicitly approved for production.

When merging completed work, review conflicts against the latest `main`, check exact-head CI and use a normal reviewable merge. Do not squash away another contributor's unreviewed updates.

## Suggested next vertical slice

A continuously read-only camera feed **while the original player keeps moving** in a safely framed in-world viewport, with no new authority, no wallet interaction and browser acceptance. Once this works, attach input/aiming to the same existing engine under an explicit feature flag and test combat/collision before making 3D a primary view.
