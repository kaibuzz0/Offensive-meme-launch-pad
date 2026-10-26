'use strict';
(() => {
  const SOL = 'So11111111111111111111111111111111111111112';
  function mintValid(mint) {
    if (typeof mint !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) return false;
    // Decode Base58 to require a 32-byte public key, without an SDK dependency.
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let value = 0n;
    for (const char of mint) value = value * 58n + BigInt(alphabet.indexOf(char));
    let bytes = 0;
    while (value > 0n) { bytes++; value >>= 8n; }
    for (const char of mint) { if (char !== '1') break; bytes++; }
    return bytes === 32;
  }
  function eligibleTokens(catalog, platform) {
    const seen = new Set();
    return [...catalog, platform].filter(token => {
      if (!token || !mintValid(token.mint) || seen.has(token.mint)) return false;
      seen.add(token.mint); return true;
    });
  }
  function requireListed(token, listed) {
    if (!token || !mintValid(token.mint) || !listed.some(t => t.id === token.id && t.mint === token.mint)) {
      throw new Error('Choose a listed token with a configured mint.');
    }
  }
  function pumpUrl(mint) {
    if (!mintValid(mint)) throw new Error('Invalid token mint.');
    return `https://pump.fun/coin/${encodeURIComponent(mint)}`;
  }
  function swapConfig(token, listed, handlers = {}) {
    requireListed(token, listed);
    return {
      displayMode: 'integrated',
      integratedTargetId: 'offensive-swap-root',
      containerStyles: { width: '100%', height: '540px', borderRadius: '12px' },
      autoConnect: false,
      enableWalletPassthrough: false,
      localStoragePrefix: 'offensive-jupiter',
      formProps: {
        swapMode: 'ExactIn',
        initialInputMint: SOL,
        initialOutputMint: token.mint,
        fixedMint: token.mint
      },
      onSuccess: handlers.onSuccess,
      onSwapError: handlers.onSwapError
    };
  }
  function browseUrl(wallet, target, ref) {
    const bases = { phantom: 'https://phantom.com/ul/browse/', solflare: 'https://solflare.com/ul/v1/browse/' };
    if (!bases[wallet] || new URL(target).protocol !== 'https:' || new URL(ref).protocol !== 'https:') {
      throw new Error('Unsupported wallet or URL.');
    }
    return `${bases[wallet]}${encodeURIComponent(target)}?ref=${encodeURIComponent(ref)}`;
  }
  window.OffensiveTradeCore = Object.freeze({ SOL, mintValid, eligibleTokens, requireListed, pumpUrl, swapConfig, browseUrl });
})();
