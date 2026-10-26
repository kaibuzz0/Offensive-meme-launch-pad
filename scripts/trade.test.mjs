import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const context={window:{},URL};
for (const file of ['tokens.js','launchpad-config.js','trade-core.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const core=context.window.OffensiveTradeCore;
const catalog=context.window.MEME_TOKENS;
const platform=context.window.LAUNCHPAD_CONFIG.platformToken;
const listed=core.eligibleTokens(catalog,platform);

test('only configured tokens are buyable; unminted platform and concepts stay excluded',()=>{
  assert.equal(listed.length,5);
  assert.ok(listed.every(t=>t.mint&&core.mintValid(t.mint)));
  assert.ok(!listed.some(t=>t.id==='offensive'));
  assert.ok(!listed.some(t=>t.id==='rug'));
  assert.equal(core.eligibleTokens([...catalog,catalog[0]],platform).length,5);
});
test('mint validation rejects malformed strings and Base58 that is not a 32-byte public key',()=>{
  for(const value of [null,undefined,'',{},'11111111111111111111111111111111111111111111','0'.repeat(44),'https://evil.example','<script>',' '+catalog[0].mint])assert.equal(core.mintValid(value),false,String(value));
  assert.equal(core.mintValid(core.SOL),true);
});
test('each swap fixes the selected mint, starts with SOL and requires wallet action',()=>{
  for(const token of listed){
    const config=core.swapConfig(token,listed);
    assert.equal(config.formProps.initialOutputMint,token.mint);
    assert.equal(config.formProps.fixedMint,token.mint);
    assert.equal(config.formProps.initialInputMint,core.SOL);
    assert.equal(config.autoConnect,false);
    assert.equal(config.enableWalletPassthrough,false);
    assert.equal(config.displayMode,'integrated');
    assert.ok(!('referralAccount' in config.formProps));
    assert.ok(!('referralFee' in config.formProps));
    assert.ok(!('initialAmount' in config.formProps));
  }
});
test('unlisted mints and renamed identities cannot enter the swap builder',()=>{
  assert.throws(()=>core.swapConfig(platform,listed));
  assert.throws(()=>core.swapConfig({...catalog[0],mint:catalog[1].mint},listed));
  assert.throws(()=>core.swapConfig({...catalog[0],id:'unlisted'},listed));
  assert.throws(()=>core.pumpUrl('not a mint'));
});
test('mobile wallet links preserve the exact token destination and requesting site',()=>{
  const ref=context.window.LAUNCHPAD_CONFIG.siteUrl;
  for(const wallet of ['phantom','solflare'])for(const token of listed){
    const target=core.pumpUrl(token.mint);
    const result=new URL(core.browseUrl(wallet,target,ref));
    assert.equal(result.searchParams.get('ref'),ref);
    assert.equal(decodeURIComponent(result.pathname.split('/').at(-1)),target);
    assert.equal(new URL(target).pathname,`/coin/${token.mint}`);
  }
  assert.throws(()=>core.browseUrl('other','https://pump.fun',ref));
  assert.throws(()=>core.browseUrl('phantom','javascript:alert(1)',ref));
});
test('platform rewards remain explicitly planned until an actual launch is configured',()=>{
  assert.equal(platform.mint,null);
  assert.equal(platform.rewards.status,'planned');
  assert.equal(platform.rewards.allocationPercent,100);
  assert.equal(platform.rewards.mode,'holder-rewards');
  assert.equal(platform.rewards.evidenceUrl,null);
});
