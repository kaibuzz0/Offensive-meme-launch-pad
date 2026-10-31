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


## Render infrastructure upgrade status — October 31, 2026

The owner authorized using **L's workspace** for the backend and proceeding toward a potentially paid disk. Existing service `offensive-meme-city-rooms` (`srv-dbhfhdlg1s2s739v1ih0`) is currently on the **Free** compute plan, with no disk or managed datastore. A `render.yaml` Blueprint candidate now declares the existing service on the paid **Starter** compute tier with a **1 GB persistent disk at `/var/data`**, plus the new guarded entry point. This is desired infrastructure-as-code, **not evidence that Render applied it**: a GitHub push does not necessarily sync an existing independently created Render service or change its billing plan.

**The connected Render app cannot edit service compute plan, attach a disk, or change the start command. These changes require an authorized Render Dashboard action.** Do not create a second paid web service or pretend the Blueprint has attached a disk.

1. Open the existing service in [Render Dashboard](https://dashboard.render.com/web/srv-dbhfhdlg1s2s739v1ih0). In **Compute**, upgrade the existing service from **Free** to **Starter**, checking the displayed price. The lowest Starter instance has historically been about $7 per month; the current Render pricing page lists persistent disk storage at **$0.25/GB/month**. Verify your actual bill before submitting.
2. On the same service, open **Disks** → **Add Disk**. Use mount path **`/var/data`**, disk name **`world2-player-profiles`**, size **1 GB**. Only data under the mount path survives redeploys. Adding this disk triggers a deploy and brief service downtime.
3. In **Settings**, change the start command from `node server/city-server.mjs` to **`node server/city-world2-guarded-entry.mjs`**. With `WORLD2_PRODUCTION_BACKEND=no`, the new entry serves the original world1 endpoints and keeps v2 inactive. Confirm `GET /api/city/health` returns HTTP 200 after this change.
4. Set (or merge) these service environment values without deleting existing settings:
   ```
   CITY_ALLOWED_ORIGINS=https://kaibuzz0.github.io
   WORLD2_PROD_ORIGIN=https://kaibuzz0.github.io
   WORLD2_PROD_SAVE_DIR=/var/data/world2
   WORLD2_DURABLE_VOLUME_CONFIRMED=no
   WORLD2_PRODUCTION_BACKEND=no
   WORLD2_PUBLIC_RELEASE_APPROVED=no
   ```
5. Once the Dashboard confirms the disk is attached, use **Shell** to inspect `/proc/self/mountinfo` (or `findmnt /var/data`) and independently verify the attached persistent mount. Only after confirming it, create the server-owned directory and marker:
   ```sh
   mkdir -p /var/data/world2
   printf '%s\n' world2-persistent-volume-approved-v1 > /var/data/world2/.durable-world2-volume
   ```
   Treat the marker as an operator assertion, **not** proof that a disk exists. Keep the whole `/var/data` volume, HMAC signing key, and backup safe.
6. Set `WORLD2_DURABLE_VOLUME_CONFIRMED=yes` and `WORLD2_PRODUCTION_BACKEND=yes` while retaining `WORLD2_PUBLIC_RELEASE_APPROVED=no`. The guarded startup fails closed if the marker or storage is missing; the new server hosts both `/api/city/*` and `/api/world2/*`. Validate both endpoint families. Perform authenticated create → save → leave → recover tests **and redeploy/restart the backend**, then repeat recovery. Back up the persistent volume and prove rollback.
7. **Do not set** `WORLD2_PUBLIC_RELEASE_APPROVED=yes` until the end-to-end persistence, authorization, abuse resistance, legacy-save policy and feature parity have been reviewed. Keep world1 the default and use `city.html?legacy=1` for rollback. There is no automatic trusted transfer of prior browser-local balances or XP.

If the service is not managed by a Blueprint, syncing `render.yaml` requires manual Dashboard onboarding. **Do not assume merely merging the YAML file will charge or provision anything.** The deployment's guarded V1 fallback is intentional, so staging infrastructure cannot silently replace legacy players with ephemeral accounts.
