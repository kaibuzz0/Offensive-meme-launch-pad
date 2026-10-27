# Meme City room service (temporary alpha)

The public GitHub Pages site runs solo. This service is a functioning optional multiplayer backend, not yet publicly hosted. It serves the same site plus authenticated streamed room snapshots and action endpoints. No wallet, tokens, money, or blockchain transactions are involved.

## Run

Node.js 22 or newer; no packages to install:

```
node server/city-server.mjs
```

Open `http://localhost:8787/city.html` in two browsers and click Enter in each. The Node host serves an enabled `city-network.js`; the GitHub Pages configuration stays disabled. Use `PORT` for your hosting platform. Deploy behind HTTPS, with streaming response buffering disabled. Set `CITY_ALLOWED_ORIGINS` to a comma-separated list of explicitly allowed frontend origins. The default launcher allows the existing GitHub Pages origin and its own origin.

For a separate HTTPS API host, edit the public `city-network.js` only after successful deployment:

```
window.MEME_CITY_NETWORK = Object.freeze({
  enabled: true,
  apiBase: 'https://YOUR-DEPLOYED-HOST/api/city'
});
```

Room updates stream as newline-delimited JSON over an authenticated fetch. Commands are JSON POST requests. Session tokens stay in memory and travel in Authorization headers, not URLs. Player IDs exposed in snapshots are separate from secret session tokens. There is one room, maximum 32 players. Movement and held fire stop after 500 ms without input; inactive sessions expire after 45 seconds. Join and request limits are basic alpha protections, not a complete abuse prevention system. Use a host-level connection/IP limit as well.

## Rules

The server owns positions, collision, XP, credits, route claims, inventory, equipment, market escrow, bot AI, health, wanted heat, projectile hits and arcade contract rewards. `city-arcade.js` is loaded after the core simulation on both server and browser. Actions cannot set balances. Shop/market actions require proximity. Listings move an actual owned item into escrow. Purchase debits the buyer, credits the seller and transfers the item synchronously; duplicate purchases fail. Sellers leaving invalidate their listings. Currency and inventory are temporary; room restart resets all state. Reconnecting creates a new guest character. This is intentional for the alpha and is displayed to players.

## Before public multiplayer launch

- Choose and deploy an HTTPS host; validate two devices, latency, streaming and reconnect behavior.
- Add durable accounts, server-owned persistence and atomic durable transactions. Do not carry solo localStorage into an online account.
- Add moderation, chat reporting/blocking, stronger rate limits and admission control, privacy/retention terms, logs and monitoring.
- Add wallet sign-in nonce verification and reliable server-side balance reads before any holding tier. Mints come from the existing beta catalog; no new game token is minted.
- Keep real-money settlement disabled until an independently reviewed design exists. Current items and play credits have no redemption or token value.

Tests: `node --test scripts/city*.test.mjs`.

Night Shift input accepts `fire` (boolean), `aimX`, and `aimY`; the shared simulation owns fire cooldowns, auto-aim and projectile creation. Mission actors are removed when their owning player leaves. Police pursuit, collision, attack windups and contract results run on the server.
