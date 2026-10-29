# Meme City / Play Together (Alpha 09)

An authoritative Node 22+ service serves the game and up to eight separate rooms of eight guests each. GitHub Pages remains solo until a deployed HTTPS service is configured. No tokens, wallet transactions, blockchain rewards or client-supplied balances are accepted.

## Run or deploy

No dependencies are required:

```sh
node server/city-server.mjs
```

Open `http://localhost:8787/city.html`, enter the game, and choose **Together**. Quick play fills public rooms. Create friend room produces a random 18-character hex room code. Joining requires that exact code. Codes grant room admission, so don't publish private invites. Guest nicknames are not verified identities. Share the invite copied from Together with a second browser or device.

The root `render.yaml` is a deployment-ready free Render blueprint. Connect the repository in Render and apply the blueprint; the service serves `/city.html` and the API itself, with networking enabled automatically. Check `/api/city/health` for `protocol: 2`. Use a single instance: the rooms are in memory, with no multi-instance routing or durable accounts. Free hosting can sleep when idle and restart; all online progress resets on restart. Choose paid hosting separately if persistent uptime is needed; this blueprint starts no paid service.

To activate the existing GitHub Pages entry point after verifying the deployed service in two browsers, update `city-network.js`:

```js
window.MEME_CITY_NETWORK = Object.freeze({
  enabled: true,
  apiBase: 'https://YOUR-ACTUAL-DEPLOYED-HOST/api/city'
});
```

Use the actual returned hostname. Never put credentials or session tokens in this config or an invite URL. `CITY_ALLOWED_ORIGINS` accepts exact comma-separated frontend origins; it defaults to `https://kaibuzz0.github.io` and the service's own HTTP/HTTPS origin. HTTPS termination belongs at the hosting proxy. Disable proxy response buffering and caching for `/api/city/events`.

## Connection and trust boundary

The server runs simulation at 20 Hz and streams authenticated NDJSON snapshots at 10 Hz. Input is limited, normalized and sequenced; stale input stops movement/fire after 500 ms. Room clients smooth peer positions, reject backwards snapshot revisions and retry interrupted streams up to four consecutive failures. Reconnecting uses the same in-memory session token and guest character for up to two minutes without authenticated activity. Reloading creates a new guest: credentials aren't persisted. Leaving revokes that token. Closing the page stops input and the guest expires automatically.

Friends share city streets, the eleven interiors, bots, public appearance, chat, shop equipment, missions and play-credit trading. Online construction, hired defenders and fortress upgrades are rejected until shared plot ownership is implemented. Existing solo saves are isolated and never imported to the server. Player-vs-player damage remains disabled.

The server owns movement, collisions, HP, XP, credits, gear, mission claims and escrowed marketplace transactions. Peers cannot write balances or inventories; snapshots omit other players' inventory and credentials. Chat renders as text. Same-room interiors show peers; private rooms isolate chat, players, listings and bots. Caps bound rooms, guests, join-rate records, HTTP connections, headers, request bodies, action rates and stream backpressure. Origins are checked in addition to bearer authentication; origin checks alone do not stop non-browser clients. Join limits use the TCP peer address, so shared proxies can share a limit; add a trusted hosting-level admission/rate-limit layer before broad promotion.

## Limits before larger public release

This is a guest multiplayer alpha, not an independent security audit. There is no durable online account, save database, moderation/report system, advanced anti-bot admission or multi-region replication. Friend codes aren't passwords or verified accounts. Public rooms and chat need active moderation as the audience grows. Add durable authenticated accounts and transaction storage before treating online progression as permanent; never attach real-money rewards to temporary guest progress.

## Verify

`npm test` covers room isolation, limits, input sequencing and stale controls, reconnect/expiry, credential handling, shared interiors, action rejection and atomic marketplace transfers. Browser QA uses two real browser sessions: create room, join code, move, chat, then return to the separate solo save.
