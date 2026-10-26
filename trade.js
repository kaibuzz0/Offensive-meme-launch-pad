'use strict';
(() => {
  const core = window.OffensiveTradeCore;
  const config = window.LAUNCHPAD_CONFIG;
  const platform = config.platformToken;
  const listed = core.eligibleTokens(window.MEME_TOKENS, platform);
  const select = document.querySelector('#buy-token');
  const status = document.querySelector('#swap-status');
  const loadButton = document.querySelector('#load-swap');
  const container = document.querySelector('#offensive-swap-root');
  const fallback = document.querySelector('#swap-fallback');
  let pluginPromise;
  let requestId = 0;
  let widgetRequested = false;
  let widgetInitialized = false;
  let lastTrigger;
  const current = () => listed.find(token => token.id === select.value);
  const showStatus = text => { status.textContent = text; };
  const setLink = (id, href) => { const link = document.querySelector(id); link.href = href; };
  const makeOption = (value, label, disabled = false) => {
    const option = document.createElement('option'); option.value = value; option.textContent = label; option.disabled = disabled; return option;
  };
  function renderPlatform() {
    document.querySelector('#platform-name').textContent = platform.name;
    document.querySelector('#platform-ticker').textContent = `$${platform.ticker} / PROPOSED SYMBOL`;
    document.querySelector('#platform-art').src = platform.art;
    const ready = core.mintValid(platform.mint);
    const buy = document.querySelector('#platform-buy');
    buy.disabled = !ready;
    buy.textContent = ready ? `Buy ${platform.name} with wallet ↗` : `Buy ${platform.name} — coming soon`;
    document.querySelector('#platform-launch-status').textContent = ready ? 'MINT CONFIGURED' : 'PRE-LAUNCH / NOT MINTED';
    document.querySelector('#platform-mint').textContent = ready ? platform.mint : 'Official mint address will appear here after launch.';
    document.querySelector('#platform-ticker').textContent = ready ? `$${platform.ticker}` : `$${platform.ticker} / PROPOSED SYMBOL`;
    const verified = ready && platform.rewards.status === 'verified' && /^https:\/\/pump\.fun\/coin\/[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(platform.rewards.evidenceUrl || '') && platform.rewards.evidenceUrl === core.pumpUrl(platform.mint);
    document.querySelector('#reward-state').textContent = verified ? 'HOLDER REWARDS / CONFIGURATION CHECKED' : 'PLANNED AT LAUNCH / NOT ACTIVE';
    document.querySelector('#reward-percent').textContent = `${platform.rewards.allocationPercent}%`;
    document.querySelector('#reward-note').textContent = verified
      ? 'Creator rewards are allocated to eligible token holders through pump.fun, net of distribution costs. Eligibility and payout timing follow pump.fun’s rules.'
      : 'Plan: select pump.fun Holder Rewards when creating this token. Creator rewards would go to eligible token holders, net of distribution costs. No rewards are active before launch.';
    const evidence = document.querySelector('#reward-evidence');
    evidence.hidden = !verified;
    if (verified) evidence.href = platform.rewards.evidenceUrl;
    buy.addEventListener('click', () => { if (ready) open(platform.id, buy); });
    document.querySelector('#download-platform-art').href = platform.art;
  }
  function updateSelection() {
    requestId++;
    const token = current();
    if (!token) {
      loadButton.disabled = true; fallback.hidden = true;
      showStatus('No token mint is configured yet.'); return;
    }
    loadButton.disabled = false;
    document.querySelector('#selected-token-name').textContent = `${token.name} / $${token.ticker}`;
    document.querySelector('#selected-mint').textContent = token.mint;
    fallback.hidden = false;
    const pump = core.pumpUrl(token.mint);
    setLink('#fallback-pump', pump);
    setLink('#fallback-phantom', core.browseUrl('phantom', pump, config.siteUrl));
    setLink('#fallback-solflare', core.browseUrl('solflare', pump, config.siteUrl));
    const inWallet = new URL(config.siteUrl);
    inWallet.searchParams.set('buy', token.mint); inWallet.hash = 'wallet-buy';
    setLink('#site-phantom', core.browseUrl('phantom', inWallet.href, config.siteUrl));
    setLink('#site-solflare', core.browseUrl('solflare', inWallet.href, config.siteUrl));
    if (widgetRequested) mount();
    else showStatus('Choose your token, then open the wallet swap.');
  }
  function loadPlugin() {
    if (window.Jupiter?.init) return Promise.resolve(window.Jupiter);
    if (pluginPromise) return pluginPromise;
    pluginPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://plugin.jup.ag/plugin-v1.js';
      script.async = true; script.id = 'jupiter-plugin-script';
      const timeout = setTimeout(() => fail(), 20000);
      const fail = () => {
        clearTimeout(timeout); script.remove(); pluginPromise = undefined;
        reject(new Error('The wallet swap could not load.'));
      };
      script.onerror = fail;
      script.onload = () => {
        clearTimeout(timeout);
        if (window.Jupiter?.init) resolve(window.Jupiter);
        else fail();
      };
      document.head.append(script);
    });
    return pluginPromise;
  }
  async function mount() {
    const token = current();
    if (!token) return;
    const generation = ++requestId;
    widgetRequested = true;
    loadButton.disabled = true;
    loadButton.textContent = 'Loading wallet swap…';
    showStatus('Loading Jupiter. Wallet connection is handled in the swap panel.');
    // Close the old form immediately when switching tokens, so it cannot show a stale quote.
    if (widgetInitialized) { window.Jupiter?.close?.(); widgetInitialized = false; }
    container.replaceChildren(); container.hidden = true;
    try {
      const plugin = await loadPlugin();
      if (generation !== requestId) return;
      container.hidden = false;
      plugin.init(core.swapConfig(token, listed, {
        onSuccess: ({ txid } = {}) => {
          if (generation !== requestId) return;
          showStatus('Jupiter reports the swap was submitted. Check its status in your wallet.');
          const receipt = document.querySelector('#swap-receipt');
          receipt.hidden = true;
          if (typeof txid === 'string' && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(txid)) {
            receipt.href = `https://solscan.io/tx/${encodeURIComponent(txid)}`; receipt.hidden = false;
          }
        },
        onSwapError: () => {
          if (generation === requestId) showStatus('Swap unavailable or not completed. If no route exists, use the pump.fun options below.');
        }
      }));
      widgetInitialized = true;
      showStatus(`Wallet swap opened for ${token.name}. Connect your wallet below to request a live quote. If Jupiter cannot route this token, use pump.fun.`);
      loadButton.textContent = 'Reload wallet swap';
    } catch {
      if (generation !== requestId) return;
      container.hidden = true;
      showStatus('Jupiter could not load. Try again, or buy through pump.fun using the wallet links below.');
      loadButton.textContent = 'Retry wallet swap';
    } finally {
      if (generation === requestId) loadButton.disabled = false;
    }
  }
  function open(id, trigger) {
    const token = listed.find(t => t.id === id);
    if (!token) return false;
    lastTrigger = trigger;
    select.value = token.id;
    document.querySelector('#swap-receipt').hidden = true;
    updateSelection();
    document.querySelector('#wallet-buy').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    select.focus({ preventScroll: true });
    if (!widgetRequested) mount();
    return true;
  }
  select.replaceChildren(...listed.map(token => makeOption(token.id, `${token.name} ($${token.ticker})`)));
  if (!core.mintValid(platform.mint)) select.append(makeOption('', `${platform.name} — not launched`, true));
  if (!listed.length) select.prepend(makeOption('', 'No launched tokens yet', true));
  const requested = new URLSearchParams(window.location.search).get('buy');
  const initial = listed.find(token => token.mint === requested);
  if (initial) select.value = initial.id;
  select.addEventListener('change', () => { document.querySelector('#swap-receipt').hidden = true; updateSelection(); });
  loadButton.addEventListener('click', mount);
  document.querySelector('#close-swap').addEventListener('click', () => {
    requestId++; widgetRequested = false;
    if (widgetInitialized) window.Jupiter?.close?.();
    widgetInitialized = false; container.replaceChildren(); container.hidden = true;
    document.querySelector('#swap-receipt').hidden = true;
    loadButton.textContent = 'Open wallet swap'; loadButton.disabled = !current();
    showStatus('Wallet swap closed. No transaction was requested by closing this panel.');
    if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  });
  renderPlatform();
  updateSelection();
  window.OffensiveSwap = Object.freeze({ open });
})();
