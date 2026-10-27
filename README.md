# OFFENSIVE — Solana meme showcase

A mobile-friendly, buildless static website for an independent, explicit satire token collection. Includes 10 original concepts and illustrated coin artwork, category filters, live search, accessible token detail dialogs, and a GitHub submission form.

## Current state

Five listings have public token mints supplied by the project owner: You Missed Bitches ($SHOOTER), Special Delivery ($TAKEN), Redacted As Fuck ($FINEPRINT), Insider ($CUNTS), and Exit Liquidity ($RUGGEDAF). Their details show the full mint, copy controls, and direct pump.fun links. The other five remain concepts with `mint: null`. Address format checks do not independently verify on-chain metadata or ownership. The site does not create tokens or collect a platform fee. Wallet connection and swap quotes are provided by the lazily loaded official Jupiter Plugin; users approve transactions in their own wallets. Community token creation is future work, not an available feature.

## GitHub Pages

The `pages.yml` workflow validates the catalog and deploys a minimal public artifact on pushes to `main`. In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions** if Pages is not enabled yet. Then run the workflow or push a commit. The workflow requires Pages to be enabled for this repository.

## Add a launched token

1. Edit the matching listing in `tokens.js`.
2. Confirm the exact Solana mint with the creator and pump.fun listing. Set `mint` to that public address. Never add a wallet secret or seed phrase.
3. Update the artwork and copy as appropriate. Run `node scripts/check.mjs`.
4. Push to `main`. Valid configured mints enable a full-address display, copy button, and `https://pump.fun/coin/<mint>` trade link. Syntax checks do **not** verify on-chain identity, liquidity, ownership, or safety.

To add another concept, copy an object with a unique `id`, add local coin artwork, and leave `mint` null until confirmed. Category buttons are in `index.html`; update those if introducing a new category. Update the collection introduction as the catalog grows or more tokens are listed.

## Local preview and validation

Serve this directory with any static HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000`. No local dependencies or build step are needed. Run `node scripts/check.mjs` and `node --test scripts/trade.test.mjs` with Node 22 or newer. The trade tests cover allowlisting, invalid mints, configured output tokens, zero added referral fees, pre-launch gating, and mobile wallet URL encoding.

Only the HTML, styles, application/catalog/config/trade scripts, `.nojekyll`, and `assets/` are deployed by the custom workflow. Google Fonts are optional. The official `https://plugin.jup.ag/plugin-v1.js` script is loaded after a user requests a wallet swap; it supplies wallet adapters, quotes, and transaction submission. Jupiter may use browser storage for wallet and form preferences and makes network calls to its services. No wallet secrets, backend, or private API keys are used by this site. No referral fee is configured. Network, venue, and Jupiter fees still apply.

## Community roadmap

- Available: curated collection, token details, wallet swaps through Jupiter, pump.fun fallback links, mobile Phantom/Solflare browse links, and GitHub submissions.
- Next: reviewed community listings.
- Future: wallet-based launch tooling, published fees, and backend/on-chain services as necessary. The static site does not create tokens, set pump.fun reward modes, or distribute holder rewards itself.

## Content

Political/public-figure and institutional satire is welcome. Submissions must not include threats, private information, protected-group attacks, impersonation, or fraudulent token claims. Original SVG posters are retained as backups; AI-generated illustrated icons are in `assets/coins/`. Prompt notes are in `ARTWORK.md`. Coin art is provided as satire, without implying endorsement by any depicted person. Contributors must check artwork and naming rights before a commercial launch. Posters and icons are included; contributors must have rights to submitted artwork.

The Maduro concept references his **capture**, not a killing. Context: [Reuters, January 3, 2026](https://www.reuters.com/business/aerospace-defense/mock-house-cia-source-special-forces-us-operation-capture-maduro-2026-01-03/). Other slogans are parody, not authenticated quotes or factual allegations.

## Platform coin and wallet buying

`launchpad-config.js` defines the official **OFFENSIVE ($OFFENDED)** platform token separately from the meme catalog. Its creator-supplied mint is `A4gTwKUpL64nVTFDMSfDZxKcQRJNwwZ95X1MgoZPpump`. Both the featured wallet-buy button and direct pump.fun button are enabled. The artwork remains at `assets/coins/offensive.webp`.

The creator states that **100% of this token's creator rewards are allocated to eligible holders in SOL**. The UI distinguishes this announcement (`rewards.status: creator-reported`) from independently checked settings (`verified`). The pump.fun coin page is provided as the reference; the site's public-page lookup did not independently establish the per-token reward setting. Reward eligibility, distribution costs, and timing follow pump.fun's rules. No fixed yield is promised. This policy does not allocate every protocol/LP fee or unrelated tokens' fees.

Community chat: [Telegram](https://t.me/+a-qL277g18UwMjIx). The chat appears in the top utility bar, bottom community section, and token-share-page footers. The supplied pump.fun referral/profile link remains in its existing top and bottom positions.

If the platform mint is ever reset to `null`, its buy controls become disabled and the platform is removed from the active swap list. If reward settings are independently checked later, `rewards.status` can be changed to `verified` with the exact coin page as `evidenceUrl`.

`trade-core.js` validates 32-byte Base58 mints and constructs allowlisted trade configurations. `trade.js` loads the Jupiter Plugin only after a visitor clicks a buy/swap button. It preselects SOL as input and fixes the chosen token mint. Wallet connection, balances, quotes, fees, and signing stay with Jupiter and the user's wallet. A loaded swap form is not evidence that a token has a route. Unrouted/bonding-curve tokens can be purchased on pump.fun using the provided direct links or Phantom/Solflare in-app browsers. No trade or wallet connection was executed during automated verification.

Official integration references: [Jupiter HTML](https://developers.jup.ag/docs/tool-kits/plugin/html-app-example), [Plugin configuration](https://developers.jup.ag/docs/tool-kits/plugin/customization), [Phantom browse](https://docs.phantom.com/phantom-deeplinks/other-methods/browse), [Solflare browse](https://docs.solflare.com/solflare/technical/deeplinks/other-methods/browse), [Pump fees and Holder Rewards](https://pump.fun/docs/fees).

## Sharing, referrals, and installation

The top utility bar and bottom community section link to the owner's supplied referral/profile URL, `https://pump.fun/u/kaibuzz0`. These links are separate from token buy links; the site does not claim that merely visiting a profile guarantees referral attribution or discounts.

Share controls are available for the launchpad, platform coin, collection cards, and token details. Supported compose links: X, Facebook, WhatsApp, Telegram, Reddit, and LinkedIn. Native Web Share is used when available. Copy-link, copy-caption, and artwork-download options support other apps such as Instagram, TikTok, and Discord. Share links open the destination composer; the visitor chooses whether to publish. No accounts are connected and nothing is automatically posted.

Run `node scripts/build-share-pages.mjs` after changing token data or platform configuration, and commit the generated `tokens/<id>/index.html` files. These static pages provide per-token canonical/Open Graph/X-card metadata so preview crawlers do not need JavaScript. Shared token pages link back to the exact token on the launchpad. Platforms control preview caching and whether an image appears. Root social metadata uses the OFFENSIVE app icon.

`manifest.webmanifest` and PNG icons support standalone home-screen installation. **Install app** uses a retained browser install prompt where available; otherwise it shows Android, iOS, or desktop instructions. iPhone users can open in Safari, tap Share, then Add to Home Screen. In-app wallet/social browsers may require opening the site in the phone's normal browser first. Installing is always the visitor's choice.

The service worker precaches only an offline information page and app icons. HTML navigations are network-first with the offline page as fallback; token data, reward configuration, trade scripts, quote APIs, and third-party requests are not cached or replayed. Existing app windows are not force-reloaded on a worker update. Registration uses the project-relative scope, not the entire GitHub Pages origin.

Validation: `node scripts/build-share-pages.mjs`, `node scripts/check.mjs`, and `node --test scripts/*.test.mjs`. PWA/share tests cover unique canonical links, exact encoded payloads, all 11 share pages, referral placement, icon dimensions, manifest scope, and financial-request cache bypass. Native installation, posting to social accounts, and wallet transactions are not performed during verification.


## Community launch platform direction (proposal v0.1)
The homepage now introduces community launches and audience building. `beta.html` retains founder test tokens and existing wallet integrations; these are real mints, not audited community launches. `creators.html` publishes draft review stages, fee terms, and weekly creator pool eligibility. `launchpad.js` prepares a public GitHub issue application without sending it, and preserves old token/trade deep links.

Draft commercial terms are explicitly inactive: 0.1 SOL review, 0.5 SOL approved launch service; 20% of settled eligible service fees to the pool. Qualification requires 7 days live, 100 non-team holders, 20 SOL of screened 7-day volume on 4 days, 0.1 SOL cumulative attributable settled service fees, creator updates and review compliance. Screened-volume-weighted weekly payouts cap each project at 25%; excess and small balances roll forward. These are proposed product rules, not implemented financial services.

Before activating community launches: implement persistent project profiles and interest verification, review/audit evidence records, fee collection/refunds, on-chain data screening, public pool accounting, appeals, and payout infrastructure. Publish final agreed terms before collecting money. Existing platform-token holder reward statements remain separate from this proposed creator pool.


## Meme City alpha
`city.html` is the first playable neighborhood, linked from the homepage. Six configured beta mints provide avatar identities; there is no token gating, new contract, wallet balance verification, or real-money game economy. Solo mode includes keyboard/mobile movement, collision, three mission checkpoints, XP/levels, play credits, equipment shopping, inventory, cosmetic rendering, and versioned browser-local saves. `city-roadmap.html` publishes the larger milestones and release gates.

`city-core.js` is shared by the client and optional authoritative multiplayer service in `server/city-server.mjs`. The service supports room presence, streamed state, chat, missions, inventory, escrowed listings and play-credit trades. It is not deployed by the GitHub Pages workflow. See `server/README.md` for running, hosting, temporary-state limits, and production requirements. Public `city-network.js` stays disabled until an HTTPS room service is deployed.


### Mayhem Update / Alpha 02
`city-arcade.js` extends the shared simulation with hostile gang bots, police patrol/pursuit AI, a wanted meter with cooldown, server-owned projectile hits, health and respawning, dash cooldowns, health/credit pickups, and repeatable bounty, courier, and escape jobs. Everyone gets a starter arcade blaster; the shop blaster increases bot damage and boots increase movement speed. No PvP damage. In solo, opening a panel or hiding the tab pauses the simulation. Online rooms continue simulating. Health, heat, transient contracts and NPCs reset on reload; existing avatar/XP/inventory/play-credit saves remain compatible. KOs and completed-job counts now persist locally. Add `?solo=1` to explicitly choose solo play on a room-enabled host.

The renderer adds ambient traffic/pedestrians, roof details, street lights, a neon-night palette, health and heat HUDs, projectile/hit feedback, optional synthesized sound and a mobile thumbstick with hold-to-fire auto-aim. Ambient cars are not drivable. The in-game Tokens panel links the six creator-supplied beta mints to existing wallet buys and pump.fun; purchases are optional, require provider quotes and wallet approval, and do not grant game currency, items or verified holding perks. No microtransaction settlement or on-chain game contract is represented.


### Night Shift / Alpha 03 polish
Enemy pursuit uses bounded grid routing around solid buildings, the fountain and benches. Bots separate instead of stacking, telegraph attacks, and investigate last-seen positions. Police line of sight prevents heat decay; escaping requires cover. Temporary mission waves are cleaned up on completion, expiry, abandonment, death and room departure. Jobs start with a 2.5-second ready countdown and record result summaries. Dashes use the last facing direction even with movement released. Safe-plaza recovery restores health gradually.

The client includes mission results, a pause menu, optional fullscreen, a neighborhood map with trackable destinations, a compact six-button toolbar, rotating weapons, muzzle/hit effects, target reticles, attack telegraphs and KO streak display. Cached ground/building layers reduce redraw work; buildings and actors are ordered by depth. Held fire runs in simulation steps, including on the server, rather than depending on requestAnimationFrame rate. The room server stops both movement and held fire when controls go stale. Token purchase flow and its lack of game reward verification remain unchanged.


### Streetwear / Alpha 04 visuals
`city-visuals.js` provides cached, articulated human character art for players, enemy bots, police and pedestrians. Token artwork is applied only to clothing: front/back shirt prints, jacket graphics and optional repeating trouser motifs. Trouser designs can use ticker stripes or coin-name panels instead. Skin, hair, denim color and print choices are validated in the core, included in room appearance snapshots, and preserved in solo saves. Existing character saves default to the new appearance safely.

Avatar and Gear panels share a high-resolution wardrobe using the same character design as the world, with front/back views and readable equipped slots. The wardrobe is cosmetic and does not verify token holdings or introduce new purchase rewards. A camera Detail/Wide toggle helps inspect outfits. Streets gain fixed asphalt grain, puddles and reflections, curb/drain details, water shading and refined building facades, entrances and windows. Visual sprite caches are bounded, and large wardrobe previews render directly for sharper clothing details.

### Visual homepage introductions

The homepage has two animated entry cards for creators and Meme City. Accessible native dialogs summarize the creator vision and the playable city; decorative motion respects reduced-motion preferences. The game opens with a scrollable welcome screen explaining clothing, contracts, play credits and controls before starting. Public worldwide multiplayer and custom community collections remain clearly labeled as goals in development.

### Districts / Alpha 05

Founder Square has four corner gateways and a Districts transit menu. Fortress Heights is a private, solo 16 × 10 tile construction plot; Creator Quarter is a six-collection gallery linked to the wardrobe; Arena District has a terminal that returns players to the hub and starts an existing combat/courier/pursuit contract; Social Boardwalk is a waterfront with NPCs and local greeting emotes. The latter three establish creative, competitive and community connections as separate directions for future shared play.

Fortress construction uses only play credits: wall 8, tower 22, HQ 35, banner 6, tree 5, lamp 4, paving 2. Removal refunds the exact price. A fresh 180-credit character can optionally buy the 157-credit starter layout. The core validates bounds, piece types, duplicates, affordability and building under the player; solid construction blocks movement and dash. Starter placement is atomic. Plot data is validated and bounded on save restoration. No token purchase is required and plots have no real-world ownership or redemption value.

Travel requires no active contract and zero heat. Peaceful district players cannot shoot, start hub contracts, claim hub checkpoints or collect hub pickups; hub bots and bullets cannot hurt them. Travel clears owned projectiles. Private plots are not included in peer profiles. The optional multiplayer server rejects district construction/travel actions for now: use `city.html?solo=1` to access your separate browser save. Public visits, plot linking, hosted meetups, uploads, co-op events and moderation remain future work.

`city-districts.js` contains new architecture, textured stonework, layered landscaping, waterfront and construction rendering. The game remains a stylized 2D canvas implementation; this release does not claim full 3D graphics. Existing solo saves migrate without resetting XP, gear or credits.

Validation: catalog/static syntax checks and 49 Node tests including construction accounting, collision, save sanitization, private snapshots, district safety and HTTP isolation. Browser checks cover placement/refund, saved plot reload, district transit, collection wardrobe, challenge entry and phone layouts.
