# Meme City development status — 2026-10-30

Baseline: `3ec0c0cd3c68258290d689073525e565ec377ff5` (Alpha 11).
This review branch contains the Living Blocks / Alpha 12 increment. It is not a claim that the full polished-alpha handoff is complete. No production deployment or real financial transaction is part of this increment.

## Implemented

- Online courier delivery is admitted through the room service, with countdown, destination and duplicate reward checks.
- Night Market interior trading validates the actual building and terminal proximity before invoking the existing ownership, escrow, price and balance rules.
- Six neighborhood medics and the original outdoor Patch share supply rules. Equipment interiors buy and equip gear with correct location context.
- Shared online capabilities reject unsupported actions. The UI explains solo-only construction, companions and arena activities. Online journey chapters use supported activities; solo chapters remain unchanged.
- Discovery totals derive from building configuration; the visible release label uses shared metadata.
- Faction relationship data controls resident patrols, guards and hostility. Four additional clans have resident crews; remote ambient crews suspend expensive AI. Clan switching is blocked during jobs, wanted pursuit and active combat/challenges.
- Active firing retains aim direction; recoil decays continuously; remote snapshots carry firing state. Clothing remains recognizable around the existing continuous rig.
- Solo district outposts support bounded placement, collision, refunds and save restoration. Reputation unlocks decorative trim without tokens. These are private solo lots, not shared territorial ownership.
- Wallet disconnect revokes proofs and invalidates in-flight checks. Small USDC quote presets preserve exact token destinations and wallet deep links; no quote or low-cost route is guaranteed.

## Verification

`npm test`: **116 passed, 0 failed**.
`npm run check`: syntax, assets, script boundaries, control targets and deployment references passed.

New room-boundary tests load core, arcade, rising, interiors, clans and monk together. They exercise delivery, buying/equipping, market transfers, six medic services, outdoor restocking and all eight online chapter readiness/claim rules. Fixtures set simulation positions and achievements; these tests are not a physical travel playthrough.

Earlier browser review in this work covered faction/outpost/token panels and the quote handoff, before the final service repairs. A fresh browser recheck was blocked after the preview connection failed and the browser could not acquire authority for the error tab. No workaround was attempted. Final service changes therefore have automated verification only.

Not yet verified: full eight-direction gameplay appearance, fresh-player 15–20 minute journey, two simultaneous browser clients, touch-device gameplay, live wallet settlement, measured frame time or memory on Galaxy A15-class hardware. Online progress remains temporary guest state and is lost on server restart. Solo progress stays browser-local.

## Next milestones, in priority order

1. Complete browser acceptance for the repaired services and online journey using two clients. Exercise reconnect, delayed snapshots, server restart and unsupported panels; record latency and snapshot size. Resolve any browser-only defects before promotion.
2. Capture actual-game-scale poses in eight directions, full circular walking/idle/firing turns and reverse/blocked movement. Align authoritative projectile origin with a shared muzzle anchor. Test cover edges, aim transitions and remote poses.
3. Add one bounded district conflict event with state transitions, cooldown, visible resolution and validated participation rewards. Add retreat/regroup/investigation behavior and clearer targeting cues.
4. Improve navigation legend and obstacle-aware routes, useful arcade interiors, mission variants, solo placement previews and accessibility checks after construction. Prevent sealed entrances and trapping before expanding building features.
5. Profile mobile rendering and simulation on documented hardware, test portrait/landscape and pointer cancellation, then optimize measured hot spots. Add durable accounts/shared ownership only with database migrations, atomic operations, permissions and recovery tests.

The new purchase presets and wallet changes are review-only here: the supplied handoff explicitly excludes deploying financial changes as development testing. Keep the existing public release until review and the remaining acceptance checks are complete.
