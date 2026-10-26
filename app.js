'use strict';
(() => {
  const tokens = window.MEME_TOKENS;
  const grid = document.querySelector('#token-grid');
  const search = document.querySelector('#search');
  const dialog = document.querySelector('#token-dialog');
  const filters = [...document.querySelectorAll('[data-filter]')];
  let category = 'All';
  let returnFocus;
  const mintValid = window.OffensiveTradeCore.mintValid;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function render() {
    const query = search.value.trim().toLowerCase();
    const visible = tokens.filter(t => (category === 'All' || t.category === category) && [t.name,t.ticker,t.category,t.description].join(' ').toLowerCase().includes(query));
    grid.replaceChildren();
    for (const t of visible) {
      const card = el('article','token-card');
      const art = el('button','art-button');
      art.type = 'button'; art.dataset.tokenId=t.id; art.setAttribute('aria-label',`View ${t.name} token details`);
      const img = el('img'); img.src=t.art; img.alt=`${t.name} satire coin artwork`; img.width=420; img.height=420; img.loading='lazy';
      art.append(img,el('span','card-status',mintValid(t.mint)?'BETA TEST / NOT AUDITED':'BETA CONCEPT / NOT LAUNCHED'));
      art.addEventListener('click',()=>open(t,art));
      const content = el('div','card-content');
      const meta = el('div','card-category'); meta.append(el('span','',t.category),el('span','','SOLANA ↗'));
      content.append(meta,el('h3','',t.name),el('p','',t.description));
      const bottom = el('div','card-bottom');
      const details = el('button','detail-button','View details ↗'); details.type='button'; details.setAttribute('aria-label',`Details for ${t.name}`); details.addEventListener('click',()=>open(t,details));
      bottom.append(el('code','',`$${t.ticker}`),details);
      if (mintValid(t.mint)) { const buy=el('button','card-buy','Buy with wallet'); buy.type='button'; buy.setAttribute('aria-label',`Buy ${t.name} with wallet`); buy.addEventListener('click',()=>window.OffensiveSwap.open(t.id,buy)); bottom.append(buy); }
      const share=el('button','card-share','Share ↗');share.type='button';share.dataset.shareToken=t.id;share.setAttribute('aria-label',`Share ${t.name}`);bottom.append(share);
      content.append(bottom);card.append(art,content);grid.append(card);
    }
    document.querySelector('#empty').hidden=visible.length>0;
    document.querySelector('#results').textContent=`${visible.length} ${visible.length===1?'meme':'memes'} shown`;
    const allListings=[...tokens,window.LAUNCHPAD_CONFIG.platformToken];
    const launched = allListings.filter(t=>mintValid(t.mint)).length;
    document.querySelector('.ticker span:last-child').textContent=`${allListings.length} LISTINGS / ${launched} CONFIGURED MINTS`;
  }
  function open(t,trigger) {
    returnFocus=trigger;
    const content=document.querySelector('#dialog-content'); content.replaceChildren();
    const layout=el('div','detail-layout'); const img=el('img');img.src=t.art;img.alt=`${t.name} satire coin artwork`;img.width=420;img.height=420;
    const info=el('div');const heading=el('h2','',t.name);heading.id='dialog-title';
    info.append(el('p','eyebrow',`${t.category} / $${t.ticker}`),heading,el('p','',t.description),el('p','',t.context));
    if (mintValid(t.mint)) {
      info.append(el('span','mint-label','SOLANA TOKEN MINT'),el('code','mint',t.mint));
      const copy=el('button','button secondary','Copy mint address');copy.type='button';
      copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(t.mint);toast('Mint address copied.');}catch{toast('Copy unavailable. Select the address above to copy.');}});
      const trade=el('a','button primary','Open on pump.fun ↗');trade.href=`https://pump.fun/coin/${encodeURIComponent(t.mint)}`;trade.target='_blank';trade.rel='noopener noreferrer';
      const walletBuy=el('button','button primary','Buy with wallet ↗');walletBuy.type='button';walletBuy.addEventListener('click',()=>{close();window.OffensiveSwap.open(t.id,trigger);});
      info.append(walletBuy,copy,trade,el('p','','Compare the full address with the creator’s announcement before trading.'));
    } else {
      info.append(el('div','launch-pending','CONCEPT ONLY — No official token mint has been configured. Trading is unavailable.'));
    }
    const download=el('a','button secondary','Download coin art ↓');download.href=t.art;download.download=`${t.id}.webp`;info.append(download);const share=el('button','button secondary','Share token ↗');share.type='button';share.dataset.shareToken=t.id;info.append(share);
    layout.append(img,info);content.append(layout);dialog.showModal();
  }
  function close(){dialog.close();if(returnFocus?.isConnected)returnFocus.focus();}
  let toastTimer;
  function toast(message){const box=document.querySelector('#toast');box.textContent=message;box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),3500);}
  document.querySelector('.close-dialog').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});
  filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
  search.addEventListener('input',render);
  render();
  const requested=new URLSearchParams(window.location.search).get('token');
  const requestedToken=tokens.find(t=>t.id===requested);
  if(requestedToken){const trigger=grid.querySelector(`[data-token-id="${requestedToken.id}"]`);open(requestedToken,trigger);}
})();
