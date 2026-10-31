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
