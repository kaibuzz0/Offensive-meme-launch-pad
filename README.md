# OFFENSIVE — Solana meme showcase

A mobile-friendly, buildless static website for an independent, explicit satire token collection. Includes 10 original concepts and illustrated coin artwork, category filters, live search, accessible token detail dialogs, and a GitHub submission form.

## Current state

All 10 listings are **concepts**, with `mint: null`. No tokens are created, no wallet is connected, and no money or platform fees are collected by this site. The existing “You Missed Bitches” name is used as a proposed parody concept, with no claim of ownership of an existing token. Community token creation is future work, not an available feature.

## GitHub Pages

The `pages.yml` workflow validates the catalog and deploys a minimal public artifact on pushes to `main`. In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions** if Pages is not enabled yet. Then run the workflow or push a commit. The workflow requires Pages to be enabled for this repository.

## Add a launched token

1. Edit the matching listing in `tokens.js`.
2. Confirm the exact Solana mint with the creator and pump.fun listing. Set `mint` to that public address. Never add a wallet secret or seed phrase.
3. Update the artwork and copy as appropriate. Run `node scripts/check.mjs`.
4. Push to `main`. Valid configured mints enable a full-address display, copy button, and `https://pump.fun/coin/<mint>` trade link. Syntax checks do **not** verify on-chain identity, liquidity, ownership, or safety.

To add another concept, copy an object with a unique `id`, add local coin artwork, and leave `mint` null until confirmed. Category buttons are in `index.html`; update those if introducing a new category. The collection's introduction currently describes ten original concepts and should be updated as the catalog grows.

## Local preview and validation

Serve this directory with any static HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000`. No dependencies or build step are needed. Run `node scripts/check.mjs` with Node 22 or newer to check catalog integrity, artwork, references, mint format, and script syntax.

Only `index.html`, `styles.css`, `app.js`, `tokens.js`, `.nojekyll`, and `assets/` are deployed. Google Fonts are optional; local fallbacks work without them. The site uses no analytics, cookies, wallet SDK, backend, or private API keys.

## Community roadmap

- Available: curated static collection, concept details, address-gated pump.fun links, GitHub issue submission template.
- Next: reviewed community listings.
- Future: wallet-based launch tooling, published fees, and backend/on-chain services as necessary. A static showcase alone does not create tokens or route platform fees.

## Content

Political/public-figure and institutional satire is welcome. Submissions must not include threats, private information, protected-group attacks, impersonation, or fraudulent token claims. Original SVG posters are retained as backups; AI-generated illustrated icons are in `assets/coins/`. Prompt notes are in `ARTWORK.md`. Coin art is provided as satire, without implying endorsement by any depicted person. Contributors must check artwork and naming rights before a commercial launch. Posters and icons are included; contributors must have rights to submitted artwork.

The Maduro concept references his **capture**, not a killing. Context: [Reuters, January 3, 2026](https://www.reuters.com/business/aerospace-defense/mock-house-cia-source-special-forces-us-operation-capture-maduro-2026-01-03/). Other slogans are parody, not authenticated quotes or factual allegations.
