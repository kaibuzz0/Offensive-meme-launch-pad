# Meme City integration gate — 2026-11-06 16:02 UTC

## Observed pull request queue

| PR | Scope | Observed exact-head workflow | Integration decision |
| --- | --- | --- | --- |
| #59 | Physics cave collision | Meme City validation: **failure** | Blocked; inspect failing CI and rerun on updated main |
| #60 | Worker transfer bounds | Meme City validation: **failure** | Blocked; inspect failing CI |
| #61 | Wildlife/fauna | Meme City validation: **failure** | Blocked; inspect failing CI |
| #62 | Mining edit journal | Meme City validation: **failure** | Blocked; inspect failing CI |
| #63 | Aircraft simulation | Meme City validation: **in progress** | Draft, do not merge |

These results were retrieved from GitHub workflow runs keyed to each PR's head SHA, not inferred from local tests. The connector did not expose individual failed steps in this pass; the common failure might be shared infrastructure or individual code failures. Do **not** assume either without logs.

## Integration priority and dependency order

1. **P0 CI triage**: identify the exact failing job/step on #59–#62; determine whether the baseline on main passes; fix any shared test-runner or dependency problem in its own PR. Preserve all checks rather than disabling them.
2. **P0 physics #59**: after CI is green, verify legacy Solo and mobile first-person Chromium cave entry, collision, and save restoration on exact head; merge only after review.
3. **P0 worker #60**: validate actual Web Worker transfer limits, signed chunk boundaries, context loss, WebGL1 and 24 MiB mesh buffer; rebase and verify against merged physics if necessary.
4. **P1 mining #62**: verify deterministic edit persistence, seed stability and no save regression; integrate after stable terrain collision/worker baseline.
5. **P2 wildlife #61 and aircraft #63**: maintain modular prototype PRs until world and player interfaces stabilize. Aircraft currently has no browser integration and should remain draft.
6. **P1 graphics #46**: defer expensive shadow maps/PBR atlas until physical Android frame-time/memory baseline and licensed asset inventory exist. Implement independent renderer improvements behind a feature flag.

## Non-negotiable release gates

Every merge requires exact-head Node checks, existing Solo Chromium, first-person mobile Chromium, review of nonconflicting changes, updated base, verified merged SHA, and successful GitHub Pages deployment. No force-merges or blanket test exemptions.

## Next coordination pass

Inspect workflow logs for #59–#62 and identify the common failing step. Track exact fixes in the respective PRs. If a shared baseline failure is confirmed, assign it to Engine QA (#47/#57) before any integration attempt. Review #63's workflow completion, then create an aircraft-to-player-controls adapter in a later scoped PR.

This file is an integration snapshot, not evidence of production readiness or successful deployment.
