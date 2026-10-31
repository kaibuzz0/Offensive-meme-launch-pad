# World2 server-authoritative local QA

**Development only.** Production city.html and Render multiplayer remain on world1; the current world2 browser preview is independently simulated. This server listens on 127.0.0.1:8788 only.

Run from the PR #2 checkout:

```sh
npm test
npm run check
npm run dev:world2
```

In a separate terminal use `curl http://127.0.0.1:8788/api/world2/health` and POST JSON to `/api/world2/join` with `{"name":"Tester","avatar":"offensive"}`. The reply contains a temporary private session token. Keep it secret.

Supply `Authorization: Bearer <session>` to the following routes:

- GET `/api/world2/state`: server-owned private character plus filtered public players, guards, and shared territory.
- POST `/api/world2/input`: JSON movement vector such as `{"x":0,"y":1,"seq":1}`, optional fire/aim.
- POST `/api/world2/action`: type-checked commands such as joinFaction, enterBuilding, buyGear, buyMedkit, startCourier, startCapture, and deliverCourier; location and credits are always verified by the server.
- POST `/api/world2/leave`: expires the guest token.

The existing createRooms service enforces room admission limits, temporary bearer credentials, rate limits, input sequencing and inactivity expiry. World2 runs entirely in memory; restart loses guest progress. The local server does NOT mount wallet or token transaction routes.

Tests verify two authenticated guest sessions, private room isolation, server-owned movement and rewards, canonical world2 indoor interactions, client forgery rejection, CORS and temporary guest credentials. These are Node/HTTP tests, not real Chrome/Android visual acceptance.

## Remaining release gates

Develop a deliberately opt-in browser room client against this API; demonstrate two concurrent browsers and Android movement/combat, consistent snapshots, bounded NPC/territory behavior, measured mobile FPS and server load. Add moderation, durable identity, persistence, explicit release flags, save rollback and owner review before switching production. No world1 save writes or cryptocurrency transactions occur in this prototype.


## Browser-authoritative multiplayer client — next QA pass

The PR #2 development branch also includes `city-world2-online.html` and `city-world2-online-transport.js` / `city-world2-online.js`. This page is **local-only**, separate from the offline `city-world2-preview.html`. It consumes authenticated server snapshots and **does not** simulate or save player balance, inventory, construction, capture rewards or positions itself.

Start two separate terminals in the PR #2 checkout:

```sh
npm run dev
npm run dev:world2
```

Open **http://127.0.0.1:8787/city-world2-online.html** in two independent Chrome tabs. Join the public room using two different display names, or create a private room in the first tab and enter its 18-character code in the second.

The test page supports server-sequenced WASD/arrow/touch movement; held F/Space/Fire shooting; mouse/touch aim; the same six territory zones and 47 interior doors as the canonical world2 geometry; entering/exiting rooms; gear, medkit and courier actions; and an on-screen server HUD with both players' observed positions. The browser never sends requested credits or arbitrary teleport coordinates. The local QA API must remain bound to `127.0.0.1:8788`; the page refuses non-loopback API origins.

The independent offline preview and world1 production game remain available as before. A local QA guest only has in-memory server progress and temporary session authentication; refreshing or restarting the server loses that progress.

### Automated real-browser smoke check

```sh
npm run qa:world2:browser
```

This starts both local servers and headless Chrome (requires installed Chrome/Chromium and Node 22). It runs two simultaneous Chrome tabs, one at an emulated mobile viewport, checks server-owned position synchronization, rejects forged remote item purchases, verifies cleanup and fails on uncaught browser exceptions. This is a real Chromium browser test but **not** a physical Android-device performance or touch test. It runs as an additional gate in the development CI workflow.

### Physical Android via USB reverse port forwarding

On a developer machine with Android Debug Bridge configured and USB debugging authorized:

```sh
adb reverse tcp:8787 tcp:8787
adb reverse tcp:8788 tcp:8788
```

Then open `http://127.0.0.1:8787/city-world2-online.html` in Android Chrome on the device. Do not expose 8788 publicly or change the loopback host restriction as a workaround. Inspect touch movement/aim, interruptions, mobile frame pacing, and guest expiry before any public beta. ADB reverse is a procedure to be *performed and verified* on a real device; it has not been physically validated by this automation.

### Remaining release conditions

This QA client still does not provide durable accounts, save migration, complete world1 gameplay parity, player moderation, rate/load benchmarking on real hardware, or production Render deployment. Keep draft PR #2 independent of main and world1 stored saves until reviewed.

### Round 7: private fortress construction QA

The **Personal fortress plot** fieldset on `city-world2-online.html` now lets a guest select a column (1–16), row (1–10), and a structure from the established `BUILD_KIT`, mark its canonical world2 location, and ask the server to build or demolish it. Game credits are debited server-side once; demolition refunds half the original cost, floored. Stand within 245 world units of the selected tile, not merely near the fortress district. The server enforces valid geometry, ownership, sufficient funds, blocked access, and the owner's own collision map. Client-supplied owner/credits/coordinates cannot authorize a remote purchase.

**These fortress lots are deliberately private guest instances**, NOT collaboratively visible construction. A different same-room player sees their own empty lot and is not blocked by another guest's walls. Construction exists only for an in-memory authenticated guest and is lost on room expiry/restart. Existing world1 permanent local saves and the separate v2 offline sandbox are not affected.

Verify using `npm test`, `npm run check`, and `npm run qa:world2:browser`. The Chromium script moves an authenticated guest into range using a server-owned test fixture after first proving that remote placement fails. It then exercises the real browser controls and checks a second tab receives no private plot state. Physical Android touch/retina performance was not tested.

### Round 9 — city orientation and waypoint NPC navigation

Once connected to the local online QA world2 client, the **City orientation** display reports the next of four ordered destinations. Press **Mark next objective** to mark the canonical point on the world map, walk there, and use **Claim at destination**. A claim must be made within 135 world units, outdoors and alive. The server privately tracks each guest's progress and awards preview XP/credits exactly once: 45 XP / 35 credits for the first three objectives and 135 XP / 100 credits for the last. The browser cannot supply an alternate step, position or reward. Closing the temporary guest room permanently loses this progress.

Server-owned private squad defenders and fortress raid NPCs now use bounded, cached `CityNav` routes when walls block line of sight. Failed route searches back off, instead of recalculating each frame. This is **not** a full citywide advanced NPC AI, and the CI browser test does not validate physical Android frame pacing.

**Acceptance:** `npm test`, `npm run check`, `npm run qa:world2:browser`. Tests include four-stage ordered claims, double-claim rejection, forged position/funds rejection, HTTP guest isolation, a real Chromium journey control check, and deterministic NPC route/backoff cases. Never activate this browser QA client on public Pages or make payments using preview credits.


## Round 10 — opt-in local profile persistence and recovery

**Only the loopback development QA server supports this.** By default, temporary guests still disappear when the server exits. To enable a separate private server-side profile store for local testing:

```sh
# Terminal 1: local static page on 127.0.0.1:8787
npm run dev
# Terminal 2: separate opt-in server directory, explicitly NOT a public wallet/account
WORLD2_QA_SAVE_DIR="$PWD/.local-world2-qa" npm run dev:world2
```

The `.local-world2-qa/` directory is explicitly `.gitignore`d. Create or recover a character from **http://127.0.0.1:8787/city-world2-online.html**. After joining a guest room, press **Create saved QA character**. Copy the newly displayed **private recovery key immediately** to a secure place. It is only shown by the create operation; it cannot be reissued if lost. The browser holds it only in the current page and never writes it to localStorage or sessionStorage. The key is a **credential**: anyone possessing it can load the saved QA character after its existing session exits/expires. Never share it, put it in Git, a URL, screenshots, chat, or public logs.

**Save progress now** writes through the authenticated server. Gameplay actions trigger checkpoints, plus approximately four-second periodic saves and a final save on an orderly leave/shutdown. The profile vault uses SHA-256 filenames rather than raw keys, HMAC-SHA-256 integrity checks, private file permissions, atomic temporary-file renames and a previous-revision `.bak` copy. It is **not encrypted at rest**, not a distributed transactional store, and not a production identity provider. Treat the server directory and signing key as sensitive local files; losing either can make saved QA profiles unrecoverable. Unexpected power loss or disk failure is not guaranteed to preserve the very latest tick.

To restore after a fresh QA server start, paste the key into **Existing private QA recovery key** before joining. A recovered character gets a fresh temporary guest session; only one active session may use a saved profile at a time. Recovery is validated against the server-side save format, permitted world2 equipment, exact owned gear, plot access rules, credit/XP limits, defender unit types and bounded mission stages. Corrupted or incompatible records are rejected rather than silently overwritten.

**Persisted individually:** character name/avatar, position if still safe, HP/credits/XP/ammo, faction affiliation/reputation, purchased and equipped gear, medkits, fortress construction, defender roster and completed orientation steps. Personal mission progress cannot be replayed to claim earlier rewards again.

**Deliberately not persisted:** temporary room membership, other players, shared territory control, active raids/raiders, active courier timers, session bearer tokens, onchain holdings, real cryptocurrency rewards, or world1 production/browser saves. An active raid is not resumed; only completed raid count/defender progression is retained. Restarting QA is not migrating world1 accounts.

Test coverage includes `scripts/city-world2-vault.test.mjs` and `scripts/city-world2-persistence-http.test.mjs` for stored-record integrity, recovery secrets, rejected overlapping sessions, full server-restart restoration and bad saves; browser controls plus real Chrome are checked by `npm run qa:world2:browser`.

**Remaining release gates:** power-loss-grade durability (fsync/journaling), encrypted backups and credential reset, hardened public identity and moderation, concurrent durable account transactions across processes, migration/rollback of real world1 saves, and physical Android input/FPS measurements. Never deploy this local vault/API to Render or public Pages.

### Production cutover staging — not local QA

A separate production bootstrap (`npm run start:world2:production`) co-hosts original world1 and world2 APIs only after an explicit persistent-volume marker and approved HTTPS origin. It is **not** activated by `npm run dev:world2` or current `render.yaml`. The public static `city.html` only redirects when the production API reports explicit `releaseReady:true`; otherwise it stays on world1. See `docs/WORLD2_PRODUCTION_ROLLOUT.md`. Existing `offensive-meme-city-v1` saves must remain untouched until a safe migration and rollback policy is established.
