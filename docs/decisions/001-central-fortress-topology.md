# ADR 001 — Central fortress topology and online ownership

**Date:** October 31, 2026
**Status:** Proposed for Stage 2 implementation; no production world change has been shipped.

## Context
The current world uses positive 0..6,720 coordinates, a northern hub, southern token neighborhoods and a personal plot in Fortress Heights. The owner requests a central player fortress with four-direction sprawl. Shared rooms host up to eight temporary guests without durable identities or a transactional property store.

## Decision
1. **Solo:** personal fortress occupies the symbolic center with construction, guards and raids saved locally.
2. **Online with current guest rooms:** shared central plaza is neutral; guests **must not** independently own one global center plot. A personal parcel gate may lead to an explicitly session-scoped preview, or an instanced local space. No persistent or destructible online land claims without identity/storage/rollback.
3. **Coordinate transition:** introduce versioned authored regions, stable `district:*` and `door:*` IDs, plus a legacy landmark-to-new-region transformation. Do not swap coordinate constants in place. World-space `(0,0)` is a logical choice; existing positive canvas coordinates can use an adapter.
4. **Roads:** four primary traversable roads run north/south/east/west, linked by ring/secondary roads. Essential clinic, shop, market and quest doors must be accessible from free spawn; protect critical services from destruction.
5. **Persistence:** new schema v5/world1 guard and legacy raw backups are already present (`city-save.js`), but **not** a geometry conversion. Only activate world2 after plot, outpost, checkpoint, contract, discovered POI and inventory-preservation tests; make migration idempotent and recoverable.
6. **Economy/security:** no real-token burn, purchases, offline multiplayer raiding, persistent shared ownership or BAREIRON server implementation.

## Alternatives rejected
- Instantly shifting every existing coordinate by a fixed offset: breaks building entrances, POIs and construction.
- Treating the central plot as privately owned by eight guests in one authoritative room: conflicting ownership.
- Replacing the browser Canvas engine or running a Minecraft server: out of scope.

## Verification required before changing real world positions
- Automated reachable graph for all cardinal roads and public essential services, collision-safe spawn/checkpoints, complete old save migration/rollback and double migration.
- Browser: 5-minute new player walk/shop/clinic/home + reload, old user with construction/outposts + map route.
- Two guest clients: central neutral commons and explicit personal-parcel ownership boundary.
- Physical Android movement and frame-time capture; no unmeasured FPS claims.

**Implementation gate:** Do not activate the new topology until safe migrator, reachable route graph and acceptance are evidenced. Keep `main` unchanged until review.
