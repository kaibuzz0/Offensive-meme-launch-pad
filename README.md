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
