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

test('official platform token is buyable; unminted concepts stay excluded',()=>{
  assert.equal(listed.length,6);
  assert.ok(listed.every(t=>t.mint&&core.mintValid(t.mint)));
  assert.ok(listed.some(t=>t.id==='offensive'&&t.ticker==='OFFENDED'));
  assert.ok(!listed.some(t=>t.id==='rug'));
  assert.equal(core.eligibleTokens([...catalog,catalog[0]],platform).length,6);
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
  assert.throws(()=>core.swapConfig({...platform,mint:null},listed));
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
test('official platform mint and SOL reward announcement match the creator details',()=>{
  assert.equal(platform.mint,'A4gTwKUpL64nVTFDMSfDZxKcQRJNwwZ95X1MgoZPpump');
  assert.equal(platform.ticker,'OFFENDED');
  assert.equal(platform.rewards.status,'creator-reported');
  assert.equal(platform.rewards.allocationPercent,100);
  assert.equal(platform.rewards.mode,'holder-rewards');
  assert.equal(platform.rewards.payoutAsset,'SOL');
  assert.equal(platform.rewards.evidenceUrl,core.pumpUrl(platform.mint));
  assert.equal(context.window.LAUNCHPAD_CONFIG.telegramUrl,'https://t.me/+a-qL277g18UwMjIx');
});
test('resetting a platform mint to null removes it from wallet purchasing',()=>{
  const beforeLaunch={...platform,mint:null};
  const withoutPlatform=core.eligibleTokens(catalog,beforeLaunch);
  assert.equal(withoutPlatform.length,5);
  assert.throws(()=>core.swapConfig(beforeLaunch,withoutPlatform));
});
test('small USDC presets use atomic units, retain exact mint and require wallet approval',()=>{for(const [budget,units]of [['0.50','500000'],['1.00','1000000']]){const cfg=core.swapConfig(listed[0],listed,{}, {budget});assert.equal(cfg.formProps.initialAmount,units);assert.equal(cfg.formProps.initialInputMint,'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');assert.equal(cfg.formProps.fixedMint,listed[0].mint);assert.equal(cfg.autoConnect,false);}assert.ok(!core.swapConfig(listed[0],listed,{}, {budget:'99999'}).formProps.initialAmount);});
