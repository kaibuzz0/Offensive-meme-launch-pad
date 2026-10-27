import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const script=fs.readFileSync(new URL('../launchpad.js',import.meta.url),'utf8');
function context(href,values){
 let handler,replaced;
 const link={hidden:true,focus(){this.focused=true;}};
 const status={textContent:''};
 const form={reportValidity:()=>true,addEventListener:(name,fn)=>handler=fn};
 const location=new URL(href);location.replace=url=>replaced=url;
 vm.runInNewContext(script,{URL,URLSearchParams,location,document:{querySelectorAll:()=>[],querySelector:s=>s==='#creator-form'?(values?form:null):s==='#application-link'?link:status},FormData:class{get(key){return values[key];}}});
 return {link,status,submit:()=>handler({preventDefault(){}}),redirect:()=>replaced};
}
test('legacy shared token and buy links reach the beta lab preserving state',()=>{
 for(const suffix of ['?token=maduro#collection','?buy=publicMint#wallet-buy','#platform-token']){
  const c=context('https://example.com/project/'+suffix);
  assert.equal(c.redirect(),'https://example.com/project/beta.html'+suffix);
 }
 assert.equal(context('https://example.com/project/#launches').redirect(),undefined);
});
test('creator application only prepares an encoded GitHub draft and sends nothing',()=>{
 const values={project:'Meme & test',profile:'https://example.com/creator',pitch:'Test\nPitch',audience:'Community',disclosures:'Public disclosures'};
 const c=context('https://example.com/project/creators.html',values);c.submit();
 assert.equal(c.link.hidden,false);assert.equal(c.link.focused,true);
 const url=new URL(c.link.href);assert.equal(url.origin,'https://github.com');
 assert.equal(url.pathname,'/kaibuzz0/Offensive-meme-launch-pad/issues/new');
 assert.equal(url.searchParams.get('title'),'[Launch application] Meme & test');
 assert.ok(url.searchParams.get('body').includes('Test\nPitch'));
 assert.ok(c.status.textContent.includes('Nothing has been sent'));
});
test('non-web creator profiles cannot become application links',()=>{
 const c=context('https://example.com/project/creators.html',{profile:'javascript:alert(1)'});c.submit();
 assert.equal(c.link.hidden,true);assert.match(c.status.textContent,/HTTP or HTTPS/);
});
