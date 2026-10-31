# World-v2 guarded production cutover

This branch prepares, but **does not complete**, a public v2 replacement. World-v1 remains the default while the production API is unavailable or returns `releaseReady: false`.

## Existing public service and safe rollback

The existing Render blueprint is **free** and does not configure a persistent disk. Do **not** run v2 persistence there. The new `server/city-world2-production.mjs` entry point can host both legacy `/api/city/*` and v2 `/api/world2/*` on the **same listener**, retaining old clients and making rollback possible without dropping the v1 multiplayer API. The existing `render.yaml` has deliberately not been changed or deployed.

The public site `city.html` now includes a small `city-v2-release-gate.js` guard. It contacts only the pinned official HTTPS service; it redirects to `city-world2-production.html` **only** if its health response has all four properties: `worldVersion: 2`, `preview: false`, `persistence: true`, and `releaseReady: true`. If the request fails or the response is not eligible, world-v1 loads normally. `city.html?legacy=1` bypasses the gate even when v2 is ready. Neither the gate nor the v2 client modifies the `offensive-meme-city-v1` save key.

## Infrastructure setup (operator action required)

1. Select the correct Render workspace, confirm the target service, and ensure a durable mounted disk or equivalent **persists across instances and redeploys**. This may require a paid Render plan; do not incur charges without authorization. Avoid running two service instances against the same file vault. Back up the disk and signing key outside the service.
2. Use a dedicated durable absolute directory such as `/var/data/world2`. After verifying its volume mount, create a file `.durable-world2-volume` inside that directory containing exactly `world2-persistent-volume-approved-v1`. The marker is an **operator assertion**, not a technical guarantee the underlying filesystem is persistent.
3. Deploy the reviewed application with start command `npm run start:world2:production` and env: `WORLD2_PROD_SAVE_DIR=/var/data/world2`, `WORLD2_PROD_ORIGIN=https://kaibuzz0.github.io`, `WORLD2_DURABLE_VOLUME_CONFIRMED=yes`, `CITY_ALLOWED_ORIGINS=https://kaibuzz0.github.io`. Keep `WORLD2_PUBLIC_RELEASE_APPROVED` **unset** during live acceptance.
4. Verify `GET /api/city/health` and `GET /api/world2/health` from the official host. The latter must report `persistence:true`, `preview:false`, `releaseReady:false`. Test create → save → leave → recover and repeat **after an actual redeploy**. Independently verify volume backups and rollback.
5. Only after acceptance, established legacy-save policy, moderation/rate review and confirmation that the reduced feature set is acceptable should the operator set `WORLD2_PUBLIC_RELEASE_APPROVED=yes`. Then `city.html` changes to v2 automatically for users on the official HTTPS origin. To roll back, unset it; old world1 local saves and `?legacy=1` remain available.

## Outstanding limitations

- The v2 client currently lacks full world1 feature parity and is an experimental multiplayer user interface. Do not imply otherwise.
- **Legacy browser-local save integrity cannot be verified by the server.** Importing client-submitted credits, XP or inventory into an authoritative public economy would enable easy forgery. The original v1 browser save is preserved, but automatic conversion and anti-fraud review remain unfinished; this is not a complete v1 progress migration.
- Vault data are HMAC integrity-protected, **not encrypted at rest**. Lost 256-bit recovery keys cannot be reissued. Multi-instance transactions, durable backups and player account recovery need a production architecture review.
- Physical Android testing was explicitly waived by the project owner. Existing emulated mobile-width Chromium checks do not demonstrate physical-device performance or long-session behavior.
- Play credits are not cryptocurrency. No wallet/token routes are connected to the v2 authoritative prototype.

## CI

Run `npm test`, `npm run check`, `npm run qa:world2:browser`. CI verifies the fail-closed production startup, approved public API URL, original v1 API co-hosting, invalid origin refusal, v1 health-redirect fallback, and full existing game suite. Check current draft PR head and GitHub Actions status before release.
