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
  if('serviceWorker' in navigator&&window.isSecureContext){
    window.addEventListener('load',()=>{navigator.serviceWorker.register(new URL('sw.js',appRoot),{scope:appRoot.pathname,updateViaCache:'none'}).catch(()=>{/* Installation instructions still work if service workers are unavailable. */});});
  }
})();
