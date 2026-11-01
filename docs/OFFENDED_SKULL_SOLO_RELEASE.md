# OFFENDED skull — signed solo-play holder release

**Status:** Staged in [PR #21](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/21). **Do not consider it deployed until both the Render game API and GitHub Pages are updated.**

## Player behavior

- The existing **one site-wide Connect Wallet** remains the only wallet connector on the website, game and Android PWA. No second wallet button, seed phrase collection, spending signature or token transfer is needed.
- Players enter **Meme City → Avatar → Verify holder skin in solo**. The same Avatar panel also supports online rooms; solo verification never creates a room.
- Sign one nonce-bound, limited-life ownership message. The Render API checks the specified token mint and wallet address on Solana, returning a cosmetic tier. A positive verified OFFENDED balance replaces the real in-world avatar head with the ivory skull (including in wardrobe, moving, walking and firing). Verification does **not** change the player's game credits, gameplay strength or account.
- Proof handles exist only in browser/server memory. The original `offensive-meme-city-v1` and Center City `offensive-meme-city-v1-center` save keys are unchanged. Reload requires wallet reconnection/re-verification; no wallet authorization key is persisted.
- Successful signed proofs use fresh balance checks every 60 seconds and a sliding 12-minute idle expiry, capped at eight hours after the original signature. Wallet disconnect/account switch clears the visible skin and revokes the proof immediately. Failed refresh or zero balance removes the cosmetic.

## Release ordering and verification

1. Confirm the intended Render workspace and service. Inspect that it is the existing `offensive-meme-city-rooms` API (not an unrelated service), with the expected GitHub repository/branch and `https://kaibuzz0.github.io` in the allowed origins. **No new paid service or environment modification is authorized by this document.**
2. Deploy the updated backend first, or otherwise coordinate backend and frontend cutover so the Pages game never points at a server without `POST /api/city/solo-wallet/challenge`, `POST /api/city/solo-wallet/check`, and `POST /api/city/solo-wallet/revoke`. A health endpoint alone does not prove the new routes are present. Use harmless invalid-input requests for route readiness, not a real wallet signature.
3. Confirm the existing HTTPS `SOLANA_RPC_URL` and RPC provider respond. Production RPC failure must fail visibly and must **not** fake ownership. No transactions or wallet secret handling.
4. After the API is ready, merge PR #21 and confirm GitHub Pages serves the new `city.html`, `city.js`, `city-visuals.js`, and `pwa.js`. Verify the PWA service worker/cache does not retain stale scripts.
5. On a real Android phone, exercise the existing Solana Mobile Wallet Adapter or supported wallet browser: one connection, ownership-message signing, solo Avatar skull unlock, full-circle motion/firing, disconnect revocation, account switch, screen rotation, and successful solo save reload. Test a non-holder account remains locked. No real transaction is needed.
6. Repeat on desktop with Phantom/Solflare: solo and Together must have independent proof flows. Verify wrong signatures, expired proofs, revoked sessions and RPC outages cannot unlock anything.

## Automated evidence and scope

The branch contains Ed25519 challenge/balance integration tests, proof-refresh/expiry coverage, 24-yaw skull geometry assertions, and a real Chromium phone/desktop game smoke test including a simulated wallet signing a real message. These tests do **not** establish that a physical wallet app actually approves a signature or that Render has deployed the backend. Check the latest PR CI run rather than relying on a historical pass count.

## Rollback

If the new wallet routes or head rendering regress on the live release, revert the PR merge on `main` and redeploy matching old backend files. Preserve original browser saves; **never clear or rewrite user localStorage** as a rollback step. The new solo proof endpoints are independent from multiplayer game credits and room protocols.
