# Meme City integration gate — 2026-11-06 17:00 UTC

## Verified exact-head PR status (GitHub Actions)

| PR | Head SHA (prefix) | Meme City validation | Failing test or gate |
| --- | --- | --- | --- |
| #59 | `9bb91570` | **failure** | Test 281: `underground jump is capped by solid gallery ceiling`; expected 0, actual 15.9 |
| #60 | `a21a7e42` | **failure** | Tests 372–375: `importScripts is not defined` in Node worker test harness |
| #61 | `abdc0fce` | **failure** | Tests 241–247: `spawnChunk`, `cappedFlockStep`, `spawnChunkOnTerrain` not exported/available to test |
| #62 | `8c9e5316` | **failure** | Test 244: snapshot revision assertion expects a different error contract than `snapshot revision is inconsistent` |
| #63 | `81bf214b` | **success** | Node validation green; aircraft is standalone, no player/browser integration verified |
| #64 | `1ab5d732` | **success** | Node validation green on previous documentation commit; **this updated head requires new CI** |
| #65 | `8df5352b` | **success** | Node validation green; ranged module integration and browser acceptance not verified |

The above results are from GitHub workflow run IDs #59 `42249766569`, #60 `42251997194`, #61 `42254614263`, #62 `42247226669`, #63 `42248510354`, #64 `42248598701`, #65 `42256326504`. Failed job logs confirm **different concrete failures**, not a proven shared CI infrastructure defect. Each owner should repair their own test/code mismatch and rerun the exact updated PR head. Do not disable failing tests.

## Critical-path coordination

1. **#59 P0 character physics** — fix gallery ceiling collision test failure and check surface/cave jump regressions; only then run legacy Solo and first-person Android Chromium, saves and chunk-transition smoke tests.
2. **#60 P0 Android worker** — correct the Node test harness worker globals or make worker bootstrap explicitly portable, preserving browser `importScripts`; verify worker transfer budgets, 24 MiB mesh cap and WebGL1 fallback.
3. **#62 P1 mining** — align revision validation error contract and assertion without weakening snapshot security; test seed-stable edits, corrupt saves and reload.
4. **#61 P2 wildlife** — repair export/adapter mismatch; test deterministic species and negative-coordinate chunk IDs.
5. **#63 aircraft, #65 ranged** — Node CI passes, but prototypes must remain unmerged until review, full browser acceptance and integration interfaces are verified.
6. **#46 graphics** — defer heavy PBR/shadow maps until Android device measurements and asset license audit; add one scoped feature-flagged renderer improvement and tests.
7. **#43 integration** — avoid overlapping source edits and merge only reviewed, updated-base, nonconflicting PRs with all acceptance gates. Prefer isolated docs PR #64 for coordination; do not mistake green Node CI for complete release readiness.

## Non-negotiable integration gates

Before any merge: review the exact diff and file overlap; confirm the head is current with main; pass exact-head Node validation and regression tests; pass original `city.html` Solo Chromium and `city.html?terrain=1` mobile first-person Chromium (including Android/WebGL1 where applicable); verify seeds, saved positions, 132 biomes, 0.25 m voxels, wallet/PWA behavior and the 24 MiB mesh budget. After a permitted merge verify resulting main SHA and Pages deployment. If any gate is unavailable, document it and **do not merge**.

## Next owner actions

- Physics owner (#49): fix PR #59 ceiling collision assertion or implementation and rerun CI.
- Engine QA owner (#47): fix PR #60 Node worker harness `importScripts` compatibility and rerun CI.
- Living World owner (#55): fix PR #61 wildlife module exports/loader and rerun CI.
- Mining owner (#48): fix PR #62 revision snapshot assertion and rerun CI.
- Graphics/Integration owner (#43/#46/#53): keep PR #64 current, validate aircraft #63 separately, and work on a bounded renderer improvement on a separate graphics PR.

**No PR is approved for merge based solely on this document.** These are observed CI facts and a coordination plan, not verified browser results, deployment evidence or a release announcement.
