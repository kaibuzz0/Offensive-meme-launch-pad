'use strict';
/* Add the platform mint only after launch. Keep rewards.status planned until the
   Holder Rewards setting is checked on the actual pump.fun coin. */
window.LAUNCHPAD_CONFIG = {
  siteUrl: 'https://kaibuzz0.github.io/Offensive-meme-launch-pad/',
  platformToken: {
    id: 'offensive',
    name: 'OFFENSIVE',
    ticker: 'OFFENSIVE',
    mint: null,
    art: 'assets/coins/offensive.webp',
    rewards: {
      allocationPercent: 100,
      mode: 'holder-rewards',
      status: 'planned',
      evidenceUrl: null
    }
  }
};
