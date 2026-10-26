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

`launchpad-config.js` defines the proposed OFFENSIVE platform token separately from the meme catalog. Its mint is deliberately `null`; the featured buy button is disabled. The artwork is ready at `assets/coins/offensive.webp`.

Before enabling platform-token purchases:

1. Create the coin on pump.fun and choose **Holder Rewards**. This must be a real launch setting, not just website copy. The user must create/approve the actual on-chain transaction in their wallet.
2. Supply the final name, ticker, and mint in `launchpad-config.js`. This enables the platform buy button and adds it to the swap selector.
3. Check that pump.fun shows the intended reward configuration for that mint. Only then set `rewards.status` to `verified` and `rewards.evidenceUrl` to that exact `https://pump.fun/coin/<mint>` page. This is a manual project-owner attestation; the site does not independently query the reward configuration.

The policy is **100% of this token's creator rewards allocated to eligible holders**, paid net of pump.fun distribution costs, subject to its eligibility and payout rules. It does not allocate every protocol/LP fee or the fees of unrelated collection tokens. Before launch, the site says the allocation is planned and inactive. The 100% allocation is not a rate of return.

`trade-core.js` validates 32-byte Base58 mints and constructs allowlisted trade configurations. `trade.js` loads the Jupiter Plugin only after a visitor clicks a buy/swap button. It preselects SOL as input and fixes the chosen token mint. Wallet connection, balances, quotes, fees, and signing stay with Jupiter and the user's wallet. A loaded swap form is not evidence that a token has a route. Unrouted/bonding-curve tokens can be purchased on pump.fun using the provided direct links or Phantom/Solflare in-app browsers. No trade or wallet connection was executed during automated verification.

Official integration references: [Jupiter HTML](https://developers.jup.ag/docs/tool-kits/plugin/html-app-example), [Plugin configuration](https://developers.jup.ag/docs/tool-kits/plugin/customization), [Phantom browse](https://docs.phantom.com/phantom-deeplinks/other-methods/browse), [Solflare browse](https://docs.solflare.com/solflare/technical/deeplinks/other-methods/browse), [Pump fees and Holder Rewards](https://pump.fun/docs/fees).
