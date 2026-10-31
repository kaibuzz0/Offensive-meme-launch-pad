## Live game: Meme City Center City (October 31, 2026)

**Public release:** the full playable World V1 game now uses the expanded **Center City** map, 11,200 × 11,200 units, with the player's private fortress at the map center, six separately identified clan headquarters and surrounding territories, and equipment, trading, vehicles and entertainment spread across multiple districts.

**[Play Meme City now](city.html?release=center-city-v1).** From the homepage select **Enter Meme City**. The original camera, combat, full-circle character renderer, movement controls, HUD, building interiors, fortress construction and NPCs are retained.

**Save protection:** Center City saves to `offensive-meme-city-v1-center`, while the old `offensive-meme-city-v1` data remains unchanged. The first import creates a protected original backup. Do not clear browser site data; saved progress is local to the same device and browser. Game credits have no cash or token value.

**Multiplayer:** online guest rooms run the matching map version 2 backend and reject outdated clients to avoid coordinate desynchronization. Progress remains temporary between server restarts. If joining fails after an update, reload the game to update the client.

**Release verification:** 182 automated tests, static checks, a deterministic room benchmark, and real Chromium phone/desktop viewport smoke tests passed before merging [PR #12](https://github.com/kaibuzz0/Offensive-meme-launch-pad/pull/12). Real Android hardware FPS and a migrated save in the user's own browser have not yet been independently verified.

The separate, abandoned World V2 client is **not** being deployed: this release modifies the original playable World V1 game.

---

## Living Blocks / Alpha 12

The city keeps its square 11,200 × 11,200 Center City footprint and 47 public interiors. This update adds faction-aware targeting, two resident patrol members for each of the four non-police/non-Rug clans, and private 3 × 3 outposts in every token neighborhood. Residents wear their faction's meme. Each district has colored curb markings, crosswalks and a clan plaza mural. Ambient NPCs beyond 1,300 units of every outdoor player skip navigation/combat; nearby crews remain active while spectators watch. There are 44 ambient NPCs and a 64-NPC total mission admission cap.

Movement no longer overwrites an active firing pose. Recoil decays instead of toggling between two positions, and online peers receive firing/recoil state. The existing full-circle rig, fixed arm lengths and depth ordering remain. Active clan jobs now retain the HUD instead of being overwritten by journey guidance.

### District construction and access

Open Clans → Build a district outpost, follow the marker and build walls, towers, flags, lights or paving with play credits. Each of six private lots has nine cells; placement, collision, range, costs and one-time refunds are validated by the simulation. Solo saves include lots, reputation and preferred styles. Construction is solo-only. Shared rooms reject construction actions and explain this limitation before opening the workshop. The original fortress and squad remain available in solo.

Earned clan rank 1 unlocks neon outpost trim; rank 2 unlocks holographic trim. These earned appearances do not require token ownership. Wallet changes/disconnects request immediate server revocation; failed connections retain only the prior bounded expiry. In-flight checks cannot re-grant access after disconnect. Clan membership remains free.

### Purchases and dependencies

The Tokens menu includes 0.50 and 1.00 **USDC** quote links (not guaranteed USD totals). These prefill the existing Jupiter plugin in token atomic units and lock the selected output mint. Live routes, received tokens, network/account costs and fees are shown by the provider before wallet approval. A valid route or economical micro-purchase is not guaranteed, and no real transaction was executed during QA. Provider reference: https://plugin.jup.ag/index and https://github.com/jup-ag/docs/blob/main/tool-kits/plugin/customization.mdx .

Solo progress survives browser reloads in local storage. Online progress is still temporary: persistent authenticated accounts require a durable backend datastore; the free Render instance does not provide one. The browser never supplies authoritative token balances. Public Solana RPC remains subject to availability and rate limits.

### Adding a meme content package

Add the verified mint/art to tokens.js, a neighborhood row to city-core.js NEIGHBORHOODS, and its explicit allies/enemies/role in FACTIONS. Rows generate district coordinates, terminals, six venues, a private lot and a square world extent. Extend the resident spawn rules if a new role needs different behavior. Validate mint IDs, reachable doors/checkpoints, faction relationships and server holdings allowlists before publishing. Visuals, job templates and shops consume the same registry; avoid hardcoding a separate map.

Validation coverage includes full-circle input, fixed weapon geometry, faction relationships, NPC sleeping/waking, outpost collision/cost/refund/save behavior, holder expiry/revocation and small-purchase configuration. Browser review covers faction menus and outpost workshop. Live wallet settlement and physical-device performance remain untested.

Online service repairs: courier delivery is permitted with shared validation; Night Market interiors trade at their terminal; all six neighborhood medics sell supplies. Online players have an eight-chapter journey without solo construction or arena requirements. Capabilities, release metadata and discovery counts come from shared configuration.

Earlier release notes below describe their respective versions. See DEVELOPMENT_STATUS.md for unfinished milestones and verification limits.

## Street Life / Alpha 11

Armed avatars now retain meme prints on front, back and sides, trouser ticker/pattern panels, earned clan stripes and verified holder cuffs. Directional surface shading improves depth, and walking strides follow movement while strafing. The existing fixed-length grip rig remains depth-sorted through a full turn; a weapon is correctly occluded when aimed away.

Twelve walk-in Token Outfitters and Street Medic annexes bring the city to 47 public interiors, plus the player-built HQ. Each of the six neighborhoods now has two Insider security officers and two Rugmasters. The Clans menu can track a live NPC skirmish. Salvage Scramble adds four two-second crate stops and a return to the terminal; it pays 45 play credits, 35 XP and one clan reputation exactly once. Leaving a crate resets its collection progress.

The 6,720-square map, free clans, existing construction plot and server-verified holder tiers remain. Token purchases use live provider quotes and explicit wallet approval; $0.50/$1 token prices cannot be guaranteed. At the Alpha 11 release, construction outside the original fortress plot was not supported. Existing saves are retained.

Validation: 105 simulation, rendering-geometry, server and security tests; syntax/asset checks; browser review of solo scene and clan controls.

## Wandering Monk encounter

Rare shared event using two prayer excerpts from the owner-supplied `THE SONGS OF YESHUA.txt` (Psalm 147:3 and Psalm 104:4). After three active minutes, each minute has a 15% chance to summon a monk beside an injured outdoor player with nearby hostile NPCs. The encounter lasts 24 seconds, followed by a six-minute minimum cooldown. No purchase or wallet is required. Prayer appears as text, not recorded speech.

Within the unobstructed 155-unit blessing circle, players regain 6 HP/second, capped at 100. A golden fire tornado seeks nearby hostile ambient NPCs, respects cover and clan allegiance, and cannot hurt players. Owned mission/raid/boss enemies are excluded so the event cannot consume contract objectives. Monk KOs grant no player kill, XP or credit rewards. Reduced-motion mode removes spinning and sparks. Online timing and healing are server-controlled; solo timing resets on reload and cannot summon immediately.

## Alpha 10 — Block Wars

The connected world is now 6,720 × 6,720. Six southern token neighborhoods add 24 buildings (35 city interiors total), clan terminals, street circuits, delivery runs and timed block holds. Existing solo coordinates and saves remain compatible. Construction still uses the original private fortress plot; shared neighborhood construction is not implemented.

INSIDER security and RUGMASTERS fight autonomously. Mission enemies stay isolated from these ambient battles. Joining a clan is free; 3/6/9 completed jobs earn visible rank stripes. Rug clan members are ignored by ambient Rug enemies. Player damage remains PvE only.

Character aim now uses normalized, smoothed directions. Guns are carried beside and below the larger front/back clothing prints. The square map and minimap include all six new neighborhoods.

Optional real-token purchases still open the existing wallet swap flow with the exact catalog mint. In online rooms, a signed, nonce-bound wallet challenge plus a server-side Solana balance lookup grants temporary cosmetics at 1 / 1,000 / 10,000 whole tokens. These are token thresholds, not fixed dollar prices. The client refreshes every 60 seconds; verified cosmetics expire after 120 seconds without renewal. Failed balance queries remove them. No signatures authorize transactions, no private keys are requested, and no token holdings grant money, transferable game inventory, combat power or XP. Wallet ownership stays in session memory only. Public RPC may throttle: configure an HTTPS `SOLANA_RPC_URL` on the server for production reliability. Mobile verification requires a compatible wallet browser; no universal mobile wallet adapter is bundled.

Validation: automated simulation, room, collision, save, wallet-signature, replay, balance-revocation and failure checks; browser QA for game rendering and clan menus. Real-wallet approval and live funded token trades require user testing; no real trade was executed.

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

### Walk & Defend / Alpha 06

Meme City is now one continuous 6,720 × 3,320 world. Founder Square occupies the upper center; Fortress Heights is northwest, Creator Quarter northeast, Arena District southwest and Social Boardwalk southeast. Roads and garden paths cross their boundaries without teleports or scene changes. District and map buttons only set walking waypoints. All region solids, water, construction, bot steering and projectiles use global coordinates. Only nearby scene chunks render; district floor caches are bounded to three regional canvases rather than one oversized world bitmap.

Fortress Heights contains your solo 16 × 10 construction plot. Walls cost 8 play credits, tower 22, HQ 35, banner 6, tree 5, lamp 4, paving 2. Removal refunds the original price; the optional starter layout costs 157. Structures obstruct players, NPC defenders, raiders and shots. The Creator Quarter links six beta collections to the wardrobe. Street Sweep can start locally in the Arena; delivery and pursuit contracts start in the square. The Social Boardwalk has a waterfront, NPC pedestrians and local emotes.

Hire up to four persistent NPC defenders through Squad while in Fortress Heights: Block Sentry (20 credits, 110 HP), Street Ranger (55 credits, 95 HP) and Heavy Defender (90 credits, 180 HP). Orders are Hold here (your current position), Patrol fortress (the plot perimeter) and Follow me (physical movement across districts). Defenders target hostile gang bots, use cover-aware projectile combat, back away at close range and recover after 15 seconds when downed. No player-versus-player damage. Their roster, orders and guard positions save with your browser profile; transient HP/combat state does not persist. Ordinary squad KOs earn no passive play-credit rewards, while squad kills can assist an active bounty.

A manually started defense drill spawns four temporary raiders after a three-second ready countdown. Clearing the wave pays 60 play credits / 40 XP once, with a 45-second victory cooldown. Drills expire after two minutes or cancel on bust/explicit cancellation. Construction and the squad use play credits only; no real-money or token purchase is required. Plots are not NFTs or real-world property.

The character renderer now connects both shoulders and forearms to the rifle grips, draws recoil and muzzle effects, and adds articulated legs, weight shift and body bob during movement. Mouse movement aims; hold left click for manual firing. Space and the mobile Fire button retain enemy auto-aim. Projectiles start at the muzzle, with cover checks and a point-blank clamp to avoid overshooting nearby targets.

The existing save key remains compatible: version 1 local district coordinates migrate into version 2 world coordinates, retaining XP, credits, gear, style and construction. Private plots and hired NPCs are currently solo features. The optional room server allows walking around the expanded map but rejects construction, hiring, squad orders and defense drills. Public multiplayer hosting, connected player ownership, moderation and shared fortress visits remain future work.

Validation: catalog/static syntax checks, 60 Node tests covering continuous walking routes through every district, legacy position migration, construction accounting/collision, roster ownership/caps, follower movement, actual NPC combat, recovery, cover, point-blank shots, full squad defense, atomic rewards and no reward on a bust. Browser checks cover walking from the square to the fortress, hiring and orders, fortress/squad reload, a complete player-and-NPC defense drill, weapon poses, desktop controls and phone layout.


### City Rising / Alpha 07

`city-rise.js` adds an eight-chapter journey, twelve collectible landmarks, five scripted activity guides, a free accelerating hoverboard, medkits, three permanent fortress HQ upgrades, and three-wave survival ending in the Rug Baron. `city-rise-visuals.js` renders landmark diamonds, guides, recovery zones, hoverboard effects, a dusk/night clock, rain and streetlight reflections. `city-arcade.js` supports telegraphed ranged gang enemies and the boss without enabling player-versus-player damage.

- Open **Journey** (J) to track and claim chapter rewards. Each landmark pays 20 play credits and 20 XP once; chapters must be claimed in order.
- **V / Ride** mounts the free city-loaner board. Collision is shared with walking; firing/dashing dismounts. Active challenges and wanted pursuits prevent mounting.
- **H / Heal** restores 45 HP using one medkit. Two are granted when first entering this update; restock beside Patch for 25 play credits, with a carry limit of nine.
- **Menu → Upgrade fortress HQ** requires a home and four placed pieces. Upgrade prices are 120 / 220 / 350 play credits. Each level adds 20 max defender HP, idle squad recovery and an out-of-combat HQ healing zone.
- **Menu → Arena survival** marks Marshal in Arena District. Start nearby, survive 3 / 4 / 5 enemies across three waves and defeat the 420-HP Rug Baron within four minutes. Full clears award 180 play credits and 160 XP once per run. Leaving, abandonment, busting and expiration clean up the run without clear rewards. Following defenders can fight alongside you. Full-clear cooldown: 40 seconds.

The existing save key now stores version 3. Version 1/2 saves retain character, inventory, gear, plots, hired defenders, XP and play credits; journey data initializes separately. Only persistent progression is serialized: active arena runs, riding, HP, heat and weather clocks reset between sessions. The public release remains solo; multiplayer hosting and durable shared ownership are still separate milestones. All new progression is game-only and does not grant tokens or cash rewards.

### Open Doors / Alpha 08

Distance-driven jointed walk cycles, foot lift, arm swing, upper-body lean and eased stops preserve the arcade look. Trees, lamps, benches, ambient traffic and pedestrians now join the actor depth queue; tree trunks also have small collision footprints.

All eleven city buildings have walkable themed cutaway interiors, plus a built Meme HQ. Approach a marked front door and press E; walk to the rear activity terminal or the bottom exit. Furnishings block movement, first visits award 10 play credits / 15 XP, and each room has a one-time 25 XP memento. Discovery passports migrate with existing solo saves (version 4); reloading returns the player outside. Combat, challenges and hoverboards are disabled indoors. Public multiplayer remains pending hosting.

### Play Together / Alpha 09

The Together panel adds public matchmaking and private friend-code rooms (up to eight guests each, eight rooms total), with shared interiors, appearance, bots, chat and play-credit trading. The authoritative server validates actions and movement; credentials remain in memory and Authorization headers. Input sequencing, stale-input cutoff, bounded requests/streams and automatic same-session reconnects are covered by tests. Peer movement is smoothed and facing is synchronized. Solo saves are not imported or overwritten by online progression.

GitHub Pages remains solo until a real HTTPS room host is activated. `render.yaml` prepares a single-instance free Render deployment; the Node host automatically serves the game with networking enabled. See `server/README.md` for setup, exact limits and the GitHub Pages switch. No durable online accounts, public moderation service, shared fortress ownership, real-money settlement, blockchain rewards or security audit is claimed.

### Public room activation

Guest multiplayer is hosted at https://offensive-meme-city-rooms.onrender.com and connected to the GitHub Pages game. Open Together → Quick play or create/join a friend room. Service ID: `srv-dbhfhdlg1s2s739v1ih0`; one free Ohio instance, manual deploys. Free idle wake-up can take about a minute; joins allow up to 90 seconds. Guest progress is in memory and resets with a restart or deploy.

The Wandering Monk displays “Praise YHWH! Praise Yeshua!” throughout the encounter, alongside rotating prayer excerpts from the supplied THE SONGS OF YESHUA text. Prayers are on-screen text.
