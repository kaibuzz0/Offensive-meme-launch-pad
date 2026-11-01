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
  walletButton.addEventListener('click',()=>{renderWallet();if(!walletDialog.open)walletDialog.showModal();const a=window.OffensiveWallet?.state().address;if(a&&document.documentElement.dataset.walletTheme==='default')void refreshTheme(a);});
  walletClose.addEventListener('click',()=>walletDialog.close());
  walletConnect.addEventListener('click',()=>{connectWallet().catch(()=>{});});
  walletDisconnect.addEventListener('click',()=>{disconnectWallet().catch(()=>{});});
  const existingProvider=getProvider();
  if(existingProvider?.isConnected&&existingProvider.publicKey){
    const address=existingProvider.publicKey.toString();
    if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)){activeProvider=existingProvider;attachWallet(existingProvider);publishWallet(address);}
  }
  renderWallet();
  // The wallet is the ONE theme selector: connect once and apply the largest
  // supported project-token holding automatically. No second theme button.
  const themeTokens=[window.LAUNCHPAD_CONFIG?.platformToken,...(window.MEME_TOKENS||[])].filter(t=>t?.mint);
  const themeById=new Map(themeTokens.map(t=>[t.id,t]));
  const savedKey='offensive-wallet-theme-v1';
  const themeLine=document.createElement('p');themeLine.className='global-wallet-theme-status';
  themeLine.setAttribute('role','status');themeLine.setAttribute('aria-live','polite');
  walletDialog.insertBefore(themeLine,walletActions);
  let themeRequest=0,themeRefresh=null;
  // Distinctive themes, including an OFFENDED look different from default green.
  const themePalettes=Object.freeze({
    offensive:{accent:'#d2ff24',backdrop:'#171122',surface:'#252035',line:'#7255a0'},
    redacted:{accent:'#c45bfa',backdrop:'#1d1227',surface:'#2b1d3b',line:'#8945b9'},
    congress:{accent:'#f2c94c',backdrop:'#211a10',surface:'#322812',line:'#ac8532'},
    exit:{accent:'#17ddc5',backdrop:'#102421',surface:'#183a33',line:'#288f82'},
    'you-missed':{accent:'#ff7643',backdrop:'#25150f',surface:'#3d2319',line:'#a94a24'},
    maduro:{accent:'#ff525f',backdrop:'#251218',surface:'#3d1e28',line:'#a83d50'}
  });
  function paintTheme(id){
    const token=themeById.get(id),palette=themePalettes[token?.id];
    const root=document.documentElement;
    root.dataset.walletTheme=palette?token.id:'default';
    root.style.setProperty('--green',palette?.accent||'#b7f464');
    root.style.setProperty('--acid',palette?.accent||'#bdff56');
    root.style.setProperty('--theme-accent',palette?.accent||'#b7f464');
    root.style.setProperty('--theme-backdrop',palette?.backdrop||'#121510');
    root.style.setProperty('--theme-surface',palette?.surface||'#1c2417');
    root.style.setProperty('--theme-line',palette?.line||'#445237');
    root.style.setProperty('--bg',palette?.backdrop||'#121310');
    root.style.setProperty('--panel',palette?.surface||'#1c1e19');
    root.style.setProperty('--line',palette?.line||'#36392f');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',palette?.backdrop||'#121310');
    walletButton.dataset.theme=palette?token.id:'default';
  }
  let savedTheme=null;try{savedTheme=localStorage.getItem(savedKey);}catch{}
  // Keep the most recently chosen visual theme across ordinary page navigation,
  // but never infer wallet ownership from this cosmetic preference.
  paintTheme(savedTheme);
  // One backend lookup for the site, PWA and Android wallet browser.
  // The existing multiplayer Render host has CORS configured for GitHub Pages.
  const themeAPI=['localhost','127.0.0.1','terminal.local'].includes(location.hostname)
    ?'/api/city/theme':'https://offensive-meme-city-rooms.onrender.com/api/city/theme';
  async function themeFromBalances(publicKey){
    let response;
    try{response=await fetch(themeAPI+'?address='+encodeURIComponent(publicKey),{
      method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000),cache:'no-store'
    });}
    catch{throw Error('Balance service unreachable. Check your connection and retry.');}
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw Error(data?.error||'Balance service returned HTTP '+response.status);
    if(!data||!(data.themeId===null||themeById.has(data.themeId)))throw Error('Unexpected balance service response.');
    return data.themeId;
  }
  async function refreshTheme(publicKey){
    const request=++themeRequest;
    clearTimeout(themeRefresh);themeRefresh=null;
    // Do not display a previous holder's theme while checking a new account.
    paintTheme(null);
    try{localStorage.removeItem(savedKey);}catch{}
    if(!publicKey){
      themeLine.textContent='Default theme · Connect a wallet to match your largest supported token automatically.';
      return;
    }
    themeLine.textContent='Wallet connected. Checking your project-token holdings to apply a theme…';
    try{
      const id=await themeFromBalances(publicKey);
      if(request!==themeRequest||window.OffensiveWallet.state().address!==publicKey)return;
      paintTheme(id);
      if(id){try{localStorage.setItem(savedKey,id);}catch{}}
      const token=themeById.get(id);
      themeLine.textContent=token
        ?'Theme active: '+token.name+' (
    }catch(e){
      if(request!==themeRequest||window.OffensiveWallet.state().address!==publicKey)return;
      themeLine.textContent='Wallet connected, but theme lookup failed: '+(e.message||'network unavailable')+' Tap the wallet button to retry the theme check.';
    }
  }
  window.addEventListener('offensive-wallet-changed',event=>{void refreshTheme(event.detail?.address||null);});
  const connectedAddress=window.OffensiveWallet.state().address;
  if(connectedAddress)void refreshTheme(connectedAddress);
  else themeLine.textContent='Connect a wallet to apply the theme automatically.';
  if('serviceWorker' in navigator&&window.isSecureContext){
    window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',appRoot),{scope:appRoot.pathname,updateViaCache:'none'}).catch(()=>{/* Installation instructions still work if service workers are unavailable. */});});
  }
})();
+token.ticker+'). Your website colors now match your largest supported token holding.'
        :'Wallet connected. No supported project tokens found. Default theme active.';
      walletButton.textContent=token?'Wallet '+shortAddress(publicKey)+' ·
    }catch(e){
      if(request!==themeRequest||window.OffensiveWallet.state().address!==publicKey)return;
      themeLine.textContent='Wallet connected, but theme balance check failed: '+(e.message||'network unavailable')+' Default theme is active. Reconnect to retry.';
    }
  }
  window.addEventListener('offensive-wallet-changed',event=>{void refreshTheme(event.detail?.address||null);});
  const connectedAddress=window.OffensiveWallet.state().address;
  if(connectedAddress)void refreshTheme(connectedAddress);
  else themeLine.textContent='Connect a wallet to apply the theme automatically.';
  if('serviceWorker' in navigator&&window.isSecureContext){
    window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',appRoot),{scope:appRoot.pathname,updateViaCache:'none'}).catch(()=>{/* Installation instructions still work if service workers are unavailable. */});});
  }
})();
+token.ticker:walletButton.textContent;
    }catch(e){
      if(request!==themeRequest||window.OffensiveWallet.state().address!==publicKey)return;
      themeLine.textContent='Wallet connected, but theme balance check failed: '+(e.message||'network unavailable')+' Default theme is active. Reconnect to retry.';
    }
  }
  window.addEventListener('offensive-wallet-changed',event=>{void refreshTheme(event.detail?.address||null);});
  const connectedAddress=window.OffensiveWallet.state().address;
  if(connectedAddress)void refreshTheme(connectedAddress);
  else themeLine.textContent='Connect a wallet to apply the theme automatically.';
  if('serviceWorker' in navigator&&window.isSecureContext){
    window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',appRoot),{scope:appRoot.pathname,updateViaCache:'none'}).catch(()=>{/* Installation instructions still work if service workers are unavailable. */});});
  }
})();
