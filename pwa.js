'use strict';
(() => {
  const appRoot=new URL('.',document.currentScript.src);
  const buttons=[...document.querySelectorAll('[data-install-app]')];
  let deferredPrompt;
  let installed=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  let busy=false;
  const dialog=document.createElement('dialog');dialog.className='install-dialog';dialog.setAttribute('aria-labelledby','install-title');
  dialog.innerHTML='<button type="button" class="close-dialog" aria-label="Close install instructions">✕</button><h2 id="install-title">Keep the bad taste.</h2><p>Install OFFENSIVE on your home screen.</p><div id="install-instructions"></div><p class="install-help">If you are inside a wallet or social app, open this website in your phone’s main browser first. Installation options depend on the device and browser.</p><p id="install-status" role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  const status=dialog.querySelector('#install-status');
  function render(){buttons.forEach(b=>{b.textContent=installed?'App installed ✓':'Install app ↓';b.disabled=installed||busy;});}
  function showInstructions(){
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const android=/Android/.test(navigator.userAgent);
    const instructions=dialog.querySelector('#install-instructions');instructions.replaceChildren();
    const list=document.createElement('ol');
    const steps=ios?['Open this website in Safari.','Tap Share, then Add to Home Screen.','Tap Add to finish.']:android?['Open this website in Chrome or Samsung Internet.','Open the browser menu (⋮ or ☰).','Choose Install app or Add to Home screen, then confirm.']:['Open this website in Chrome, Edge, or another browser that supports installation.','Use the install icon in the address bar, or the browser menu’s Install option.','Confirm when your browser asks.'];
    for(const text of steps){const li=document.createElement('li');li.textContent=text;list.append(li);}instructions.append(list);status.textContent='';dialog.showModal();
  }
  document.querySelectorAll('[data-install-help]').forEach(button=>button.addEventListener('click',showInstructions));
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;render();});
  window.addEventListener('appinstalled',()=>{installed=true;deferredPrompt=undefined;busy=false;render();status.textContent='OFFENSIVE has been installed.';});
  buttons.forEach(button=>button.addEventListener('click',async()=>{
    if(installed||busy)return;
    if(!deferredPrompt){showInstructions();return;}
    const prompt=deferredPrompt;deferredPrompt=undefined;busy=true;render();
    try {await prompt.prompt();await prompt.userChoice;}
    catch {showInstructions();}
    finally {busy=false;render();}
  }));
  dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
  const offline=document.querySelector('#connection-status');
  function connection(){if(offline)offline.hidden=navigator.onLine!==false;}
  window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();render();
  // One wallet connection entry point across the whole website and installed PWA.
  // The saved address is a reconnect hint ONLY, never an authentication credential.
  const walletKey='offensive-wallet-last-public-v1';
  let activeProvider=null,activeAddress=null,walletBusy=false,attachedProvider=null;
  const walletHost=document.querySelector('.utility-bar>div')||document.querySelector('.utility-bar')||document.querySelector('.city-header')||document.querySelector('header')||document.body;
  const walletButton=document.createElement('button');walletButton.type='button';walletButton.className='global-wallet-trigger';walletButton.setAttribute('aria-haspopup','dialog');
  const walletDialog=document.createElement('dialog');walletDialog.className='global-wallet-dialog';walletDialog.setAttribute('aria-label','Connect Solana wallet');
  const walletHeading=document.createElement('h2');walletHeading.textContent='SOLANA WALLET';
  const walletDescription=document.createElement('p');walletDescription.textContent='Connect once from any page to display your public address and wallet-based site theme. This does not sign messages, send tokens, approve spending or grant holder-only game access.';
  const walletStatus=document.createElement('p');walletStatus.setAttribute('role','status');walletStatus.setAttribute('aria-live','polite');walletStatus.className='global-wallet-status';
  const walletActions=document.createElement('div');walletActions.className='global-wallet-actions';
  const walletConnect=document.createElement('button');walletConnect.type='button';walletConnect.textContent='Connect Solana wallet';
  const walletDisconnect=document.createElement('button');walletDisconnect.type='button';walletDisconnect.textContent='Disconnect';
  const walletClose=document.createElement('button');walletClose.type='button';walletClose.textContent='Close';
  const walletLinks=document.createElement('div');walletLinks.className='global-wallet-links';
  const walletHelp=document.createElement('p');walletHelp.className='global-wallet-help';
  walletHelp.textContent='Installed apps and regular mobile browsers may not expose a Solana wallet. For a connection, open this same page inside a wallet’s built-in browser. The installed app cannot silently gain access to your wallet.';
  const pageUrl=location.href,refUrl=new URL('.',appRoot).href;
  for(const [name,base] of [['Open in Phantom','https://phantom.com/ul/browse/'],['Open in Solflare','https://solflare.com/ul/v1/browse/']]){
    const link=document.createElement('a');link.className='global-wallet-app-link';link.textContent=name+' ↗';link.href=base+encodeURIComponent(pageUrl)+'?ref='+encodeURIComponent(refUrl);link.rel='noopener noreferrer';walletLinks.append(link);
  }
  walletActions.append(walletConnect,walletDisconnect,walletClose);walletDialog.append(walletHeading,walletDescription,walletStatus,walletActions,walletHelp,walletLinks);
  walletHost.append(walletButton);document.body.append(walletDialog);
  const getProvider=()=>window.phantom?.solana||window.solflare||window.solana||null;
  const shortAddress=a=>a.slice(0,4)+'…'+a.slice(-4);
  let remembered='';try{remembered=localStorage.getItem(walletKey)||'';}catch{}
  function walletState(){
    return {connected:!!activeAddress,address:activeAddress,remembered:activeAddress||remembered};
  }
  function renderWallet(){
    const connected=!!activeAddress;
    walletButton.textContent=connected?'Wallet '+shortAddress(activeAddress):remembered?'Reconnect wallet':'Connect wallet';
    walletButton.setAttribute('aria-label',connected?'Connected Solana wallet '+activeAddress:'Connect Solana wallet');
    walletButton.dataset.connected=String(connected);
    walletDisconnect.disabled=!connected||walletBusy;
    walletConnect.disabled=walletBusy;
    walletConnect.textContent=connected?'Wallet connected ✓':walletBusy?'Connecting…':'Connect Solana wallet';
    if(connected)walletStatus.textContent='Connected: '+activeAddress+' · Public address only. For restricted game areas, verify ownership in Together mode.';
    else if(!walletStatus.textContent||walletStatus.textContent.startsWith('Connected:'))walletStatus.textContent=remembered?'Previous wallet '+shortAddress(remembered)+' remembered. Reconnect to authorize this page.':'No wallet connected. Connect in a compatible wallet browser.';
  }
  function publishWallet(address){
    activeAddress=address||null;
    remembered=activeAddress||'';
    try{if(activeAddress)localStorage.setItem(walletKey,activeAddress);else localStorage.removeItem(walletKey);}catch{}
    renderWallet();
    window.dispatchEvent(new CustomEvent('offensive-wallet-changed',{detail:{address:activeAddress,connected:!!activeAddress}}));
  }
  function attachWallet(p){
    if(attachedProvider===p||!p?.on)return;attachedProvider=p;
    p.on('disconnect',()=>{if(activeProvider===p){activeProvider=null;publishWallet(null);walletStatus.textContent='Wallet disconnected.';}});
    p.on('accountChanged',pk=>{
      if(activeProvider!==p)return;
      const address=pk?.toString?.()||'';
      if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))publishWallet(address);
      else{activeProvider=null;publishWallet(null);}
    });
  }
  async function connectWallet(){
    if(walletBusy)return activeAddress;
    const p=getProvider();
    if(!p?.connect){walletStatus.textContent='No Solana wallet detected. Open this page inside Phantom or Solflare using the links below, then tap Connect wallet.';if(!walletDialog.open)walletDialog.showModal();throw Error('No compatible Solana wallet injected in this browser.');}
    walletBusy=true;walletStatus.textContent='Requesting wallet connection permission…';renderWallet();
    try{
      const result=await p.connect();
      const address=(result?.publicKey||p.publicKey)?.toString?.()||'';
      if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))throw Error('Wallet did not return a valid Solana public address.');
      activeProvider=p;attachWallet(p);publishWallet(address);
      return address;
    }catch(e){walletStatus.textContent=e.message||'Wallet connection cancelled.';throw e;}
    finally{walletBusy=false;renderWallet();}
  }
  async function disconnectWallet(){
    const p=activeProvider;activeProvider=null;
    try{await p?.disconnect?.();}catch{}
    publishWallet(null);walletStatus.textContent='Wallet disconnected. No site permissions are being retained.';
  }
  window.OffensiveWallet=Object.freeze({connect:connectWallet,disconnect:disconnectWallet,state:walletState,provider:getProvider});
  walletButton.addEventListener('click',()=>{renderWallet();if(!walletDialog.open)walletDialog.showModal();});
  walletClose.addEventListener('click',()=>walletDialog.close());
  walletConnect.addEventListener('click',()=>{connectWallet().catch(()=>{});});
  walletDisconnect.addEventListener('click',()=>{disconnectWallet().catch(()=>{});});
  const existingProvider=getProvider();
  if(existingProvider?.isConnected&&existingProvider.publicKey){
    const address=existingProvider.publicKey.toString();
    if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)){activeProvider=existingProvider;attachWallet(existingProvider);publishWallet(address);}
  }
  renderWallet();
  // Read-only wallet-led theme on both the website and the installed PWA.
  // No seed phrase, transaction or signature. A pasted address is visual preview only.
  const themeTokens=[window.LAUNCHPAD_CONFIG?.platformToken,...(window.MEME_TOKENS||[])].filter(t=>t?.mint);
  const themeById=new Map(themeTokens.map(t=>[t.id,t]));
  const savedKey='offensive-wallet-theme-v1';
  function paintTheme(id){
    const token=themeById.get(id);
    document.documentElement.dataset.walletTheme=token?.id||'default';
    document.documentElement.style.setProperty('--green',token?.color||'#b7f464');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',token?.color||'#121310');
  }
  try{paintTheme(localStorage.getItem(savedKey));}catch{paintTheme(null);}
  const themeButton=document.createElement('button');
  themeButton.type='button';themeButton.className='wallet-theme-trigger';themeButton.textContent='Wallet theme ◈';
  const themeHost=document.querySelector('.utility-bar>div')||document.querySelector('.utility-bar')||document.querySelector('.city-header')||document.querySelector('header');
  themeHost?.append(themeButton);
  if(themeHost){
    const themeDialog=document.createElement('dialog');themeDialog.className='wallet-theme-dialog';
    const title=document.createElement('h2');title.textContent='Theme from wallet';
    const note=document.createElement('p');note.textContent='Compare how many tokens you hold from this project (whole-token quantities, not dollar value). The largest eligible balance sets the site accent. Appearance only — this does not unlock holder-only areas.';
    const address=document.createElement('input');address.type='text';address.placeholder='Public Solana wallet address';address.maxLength=44;address.autocomplete='off';address.spellcheck=false;address.setAttribute('aria-label','Public Solana wallet address for a read-only theme preview');
    const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='wallet-theme-status';
    const controls=document.createElement('div');controls.className='wallet-theme-actions';
    const byWallet=document.createElement('button');byWallet.type='button';byWallet.textContent='Connect wallet & match';
    const byAddress=document.createElement('button');byAddress.type='button';byAddress.textContent='Preview public address';
    const reset=document.createElement('button');reset.type='button';reset.textContent='Use default';
    const close=document.createElement('button');close.type='button';close.textContent='Close';
    controls.append(byWallet,byAddress,reset,close);
    themeDialog.append(title,note,address,controls,status);document.body.append(themeDialog);
    themeButton.addEventListener('click',()=>themeDialog.showModal());
    close.addEventListener('click',()=>themeDialog.close());
    reset.addEventListener('click',()=>{paintTheme(null);try{localStorage.removeItem(savedKey);}catch{}status.textContent='Default theme restored.';});
    const rpc='https://api.mainnet-beta.solana.com';
    async function scan(publicKey,preview){
      const tokenMints=new Map(themeTokens.map(t=>[t.mint,t]));
      if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey))throw Error('Enter a valid public Solana wallet address.');
      status.textContent='Reading project token balances (no transaction or signature)…';
      const response=await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',params:[publicKey,{programId:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'},{encoding:'jsonParsed'}]}),signal:AbortSignal.timeout(12000),cache:'no-store'});
      if(!response.ok)throw Error('Solana balance lookup unavailable. Try again.');
      const data=await response.json();if(data.error||!Array.isArray(data.result?.value))throw Error('Could not retrieve token balances.');
      const balances=new Map();
      for(const row of data.result.value){
        const info=row.account?.data?.parsed?.info,t=info?.tokenAmount,token=tokenMints.get(info?.mint);
        if(!token||info.owner!==publicKey||!/^[0-9]+$/.test(t?.amount)||!Number.isInteger(t.decimals)||t.decimals<0||t.decimals>18)continue;
        const prev=balances.get(token.id);
        if(prev&&prev.decimals!==t.decimals)throw Error('Inconsistent token decimals.');
        balances.set(token.id,{id:token.id,units:(prev?.units||0n)+BigInt(t.amount),decimals:t.decimals});
      }
      const holdings=[...balances.values()].filter(x=>x.units>0n).sort((a,b)=>{
        const aa=a.units*10n**BigInt(b.decimals),bb=b.units*10n**BigInt(a.decimals);
        return aa===bb?a.id.localeCompare(b.id):aa>bb?-1:1;
      });
      const top=holdings[0];if(!top){paintTheme(null);status.textContent='No supported project tokens found. The default theme is active.';return;}
      paintTheme(top.id);try{localStorage.setItem(savedKey,top.id);}catch{}
      const t=themeById.get(top.id);
      status.textContent=[preview?'Public-address preview: ':'Connected wallet: ',t.name,' (',t.ticker,') has your largest supported token quantity. Accent shared across website and installed app.'].join('');
    }
    async function run(source){
      byWallet.disabled=byAddress.disabled=true;
      try{
        let publicKey;
        if(source==='wallet'){
          publicKey=window.OffensiveWallet.state().address;
          if(!publicKey){await window.OffensiveWallet.connect();return;} // the global connection event updates this theme
        }else{publicKey=address.value.trim();}
        await scan(publicKey,source==='address');
      }catch(e){status.textContent=e.message||'Wallet theme unavailable.';}
      finally{byWallet.disabled=byAddress.disabled=false;}
    }
    byWallet.addEventListener('click',()=>run('wallet'));
    byAddress.addEventListener('click',()=>run('address'));
    // Theme and wallet session stay synchronized on ALL pages, not just in Meme City.
    window.addEventListener('offensive-wallet-changed',event=>{
      const a=event.detail?.address;
      if(a)scan(a,false).catch(e=>{status.textContent='Wallet connected, but theme lookup failed: '+(e.message||'RPC unavailable');});
      else{paintTheme(null);try{localStorage.removeItem(savedKey);}catch{}status.textContent='Wallet disconnected; default theme restored.';}
    });
    const current=window.OffensiveWallet.state().address;
    if(current)scan(current,false).catch(e=>{status.textContent='Wallet connected; theme check unavailable: '+(e.message||'RPC unavailable');});
  }
  if('serviceWorker' in navigator&&window.isSecureContext){
    window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',appRoot),{scope:appRoot.pathname,updateViaCache:'none'}).catch(()=>{/* Installation instructions still work if service workers are unavailable. */});});
  }
})();
