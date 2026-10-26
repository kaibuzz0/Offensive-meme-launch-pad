'use strict';
(() => {
  function payload(id, catalog, platform, siteUrl) {
    const site = new URL(siteUrl);
    if (site.protocol !== 'https:') throw new Error('Sharing requires a public HTTPS site URL.');
    site.search = ''; site.hash = '';
    if (!site.pathname.endsWith('/')) site.pathname += '/';
    if (!id) return {
      title: 'OFFENSIVE — Solana Meme Launchpad',
      text: 'OFFENSIVE: Solana meme tokens, wallet swaps, and unapologetic satire.',
      url: site.href,
      art: new URL(platform.art, site).href
    };
    const token = [...catalog, platform].find(t => t.id === id);
    if (!token || !/^[a-z-]+$/.test(token.id)) throw new Error('Unknown token.');
    const status = token.mint ? `Solana mint: ${token.mint}` : 'Concept / not launched.';
    return {
      title: `${token.name} ($${token.ticker}) | OFFENSIVE`,
      text: `${token.name} ($${token.ticker}) on OFFENSIVE.\n${token.description || 'The upcoming OFFENSIVE platform coin.'}\n${status}`,
      url: new URL(`tokens/${token.id}/`, site).href,
      art: new URL(token.art, site).href
    };
  }
  function links(data) {
    const make = (base, params) => { const url = new URL(base); for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value); return url.href; };
    return [
      ['X', make('https://twitter.com/intent/tweet', { text: data.text, url: data.url })],
      ['Facebook', make('https://www.facebook.com/sharer/sharer.php', { u: data.url })],
      ['WhatsApp', make('https://wa.me/', { text: `${data.text}\n${data.url}` })],
      ['Telegram', make('https://t.me/share/url', { url: data.url, text: data.text })],
      ['Reddit', make('https://www.reddit.com/submit', { url: data.url, title: data.title })],
      ['LinkedIn', make('https://www.linkedin.com/sharing/share-offsite/', { url: data.url })]
    ];
  }
  window.OffensiveShareCore = Object.freeze({ payload, links });
})();
