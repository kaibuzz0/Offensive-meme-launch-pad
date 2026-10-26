'use strict';
(() => {
  const core=window.OffensiveShareCore;
  const config=window.LAUNCHPAD_CONFIG;
  let data;
  let trigger;
  const make=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
  const dialog=make('dialog','share-dialog');dialog.id='share-dialog';dialog.setAttribute('aria-labelledby','share-title');
  const close=make('button','close-dialog','✕');close.type='button';close.setAttribute('aria-label','Close sharing');
  const title=make('h2','','Share the bad taste.');title.id='share-title';
  const subject=make('p','share-subject');
  const preview=make('textarea','share-caption');preview.readOnly=true;preview.rows=5;preview.setAttribute('aria-label','Share caption and link');
  const platforms=make('div','share-platforms');
  const actions=make('div','share-actions');
  const native=make('button','button primary','More apps / phone share ↗');native.type='button';
  const copyLink=make('button','button secondary','Copy link');copyLink.type='button';
  const copyCaption=make('button','button secondary','Copy caption');copyCaption.type='button';
  const art=make('a','button secondary','Download artwork ↓');
  const note=make('p','share-help','For Instagram, TikTok, Discord, or another app: use your phone’s share sheet, or copy the caption and attach the downloaded artwork. Available targets depend on your device.');
  const status=make('p','share-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  actions.append(native,copyLink,copyCaption,art);
  dialog.append(close,title,subject,platforms,preview,actions,note,status);document.body.append(dialog);
  function dismiss(){dialog.close();}
  close.addEventListener('click',dismiss);
  dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();}});
  async function copy(text){
    try {await navigator.clipboard.writeText(text);status.textContent='Copied. Ready to paste into your post.';}
    catch {preview.value=text;preview.focus();preview.select();status.textContent='Select and copy the text above using your browser’s Copy command.';}
  }
  copyLink.addEventListener('click',()=>copy(data.url));
  copyCaption.addEventListener('click',()=>copy(`${data.text}\n${data.url}`));
  native.addEventListener('click',async()=>{
    if(!navigator.share){status.textContent='Phone sharing is unavailable in this browser. Use a platform button or copy the caption.';return;}
    try {await navigator.share({title:data.title,text:data.text,url:data.url});status.textContent='Share sheet closed.';}
    catch(error){if(error.name!=='AbortError')status.textContent='Sharing could not open. Use a platform button or copy the caption.';}
  });
  function open(id,source){
    try {data=core.payload(id,window.MEME_TOKENS,config.platformToken,config.siteUrl);}catch{return false;}
    trigger=source;subject.textContent=data.title;preview.value=`${data.text}\n${data.url}`;status.textContent='';
    platforms.replaceChildren(...core.links(data).map(([label,href])=>{const a=make('a','share-platform',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`Share on ${label}`);return a;}));
    // Resolve artwork locally as well, so download is same-origin in preview and on share pages.
    const token=id?[...window.MEME_TOKENS,config.platformToken].find(t=>t.id===id):config.platformToken;
    const scriptRoot=new URL('.',document.querySelector('script[src$="social.js"]').src);
    art.href=new URL(token.art,scriptRoot).href;art.download=`${token.id}.webp`;
    if(!dialog.open)dialog.showModal();return true;
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-share-token],[data-share-site]');
    if(button){event.preventDefault();open(button.dataset.shareToken||null,button);}
  });
  window.OffensiveShare=Object.freeze({open});
})();
