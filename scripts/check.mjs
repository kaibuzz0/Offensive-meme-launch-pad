import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const context={window:{}};vm.runInNewContext(read('tokens.js'),context);
const tokens=context.window.MEME_TOKENS;
assert.ok(tokens.length>=10,'At least 10 concepts are required');
assert.equal(new Set(tokens.map(t=>t.id)).size,tokens.length,'Unique token IDs');
for(const token of tokens){
  for(const field of ['id','name','ticker','category','description','context','art'])assert.ok(typeof token[field]==='string'&&token[field].length,`${token.id}: ${field}`);
  assert.ok(/^assets\/coins\/[a-z-]+\.webp$/.test(token.art),'Local artwork only');
  assert.ok(fs.existsSync(path.join(root,token.art)),`Missing art: ${token.art}`);
  assert.ok(token.mint===null||/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token.mint),'Mint must be null or a Solana address');
}
const html=read('beta.html');
for(const file of ['styles.css','app.js','tokens.js','assets/icon.svg','assets/coins/offensive.webp','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','manifest.webmanifest'])assert.ok(html.includes(file),`Missing asset reference: ${file}`);
for(const id of ['token-grid','search','token-dialog','dialog-content','empty','results','toast','platform-buy','platform-mint','reward-state','buy-token','load-swap','offensive-swap-root','swap-status','swap-fallback'])assert.ok(html.includes(`id="${id}"`),`Missing interaction target: ${id}`);
for (const file of ['app.js','launchpad-config.js','trade-core.js','trade.js','share-core.js','social.js','pwa.js','sw.js']) new vm.Script(read(file));
console.log(`PASS: ${tokens.length} unique listings, all artwork, mint format checks, asset references, interaction targets, and JS syntax.`);

// Global wallet entry must be present on every public website page, including token share pages.
for(const page of ['index.html','beta.html','creators.html','city.html','city-roadmap.html',...tokens.map(t=>'tokens/'+t.id+'/index.html'),'tokens/offensive/index.html']){
 const content=read(page);
 assert.ok(content.includes('pwa.js?v=27-auto-theme'),page+' must load shared wallet runtime');
 assert.ok(content.includes('styles.css?v=27-auto-theme')||content.includes('city.css?v=26-global-wallet'),page+' must load wallet controls CSS');
}
const walletJs=read('pwa.js');
for(const feature of ['OffensiveWallet','offensive-wallet-changed','global-wallet-trigger','disconnectWallet','walletLinks','walletKey'])
 assert.ok(walletJs.includes(feature),'Missing global wallet feature '+feature);
assert.ok(!/signature|privateKey|secret|seedPhrase/i.test(walletJs.split('\n').filter(l=>l.includes('localStorage.setItem(')).join('\n')),'No secret wallet material in persistent storage');


for(const file of ['index.html','creators.html']){
 const page=read(file);
 for(const asset of ['launchpad.css','launchpad.js','social.js','pwa.js'])assert.ok(page.includes(asset),`${file}: ${asset}`);
 assert.ok(!page.includes('src="trade.js"'),`${file} should not load trading UI`);
}
new vm.Script(read('launchpad.js'));
console.log('PASS: community pages, lightweight script boundaries, and application JS syntax.');

for(const file of ['city-world2-preview.js','city-world2-simulation.js','city-topology.js','city-migration.js','city-world2.js','city-world2-registry.js','city.js','city-map.js','city-nav.js','city-save.js','city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-room-visuals.js','city-rise-visuals.js','city-visuals.js','city-districts.js','city-network.js','city-room-client.js'])new vm.Script(read(file));
for(const file of ['city.html','city-roadmap.html','city.css','server/city-server.mjs'])assert.ok(fs.existsSync(path.join(root,file)),`Missing city release file: ${file}`);
assert.ok(read('index.html').includes('href="city.html"'),'Homepage must link to the playable city');
const networkContext={window:{}};vm.runInNewContext(read('city-network.js'),networkContext);const network=networkContext.window.MEME_CITY_NETWORK;assert.equal(typeof network.enabled,'boolean');if(network.enabled)assert.ok(/^https:\/\//.test(network.apiBase),'Public room service must use HTTPS');
console.log('PASS: Meme City assets, script syntax, homepage entry and public solo configuration.');

for(const id of ['pause-toggle','fullscreen-toggle','mission-kicker','mission-fill','quick-job','ready-countdown'])assert.ok(read('city.html').includes(`id="${id}"`),`Missing polished game control: ${id}`);
console.log('PASS: Night Shift control targets.');

assert.ok(read('city.html').includes('city-visuals.js'),'Clothing renderer must load before the game');
assert.ok(read('.github/workflows/pages.yml').includes('city-visuals.js'),'Clothing renderer must ship in Pages builds');
console.log('PASS: streetwear renderer and deployment references.');

assert.ok(read('city.html').includes('city-save.js'),'Save version guard must load');
assert.ok(read('.github/workflows/pages.yml').includes('city-save.js'),'Save version guard must deploy');
assert.ok(read('city.html').includes('city-map.js'),'World map destinations must load');
assert.ok(read('city.html').includes('city-nav.js'),'Street navigator must load');
assert.ok(read('.github/workflows/pages.yml').includes('city-nav.js'),'Street navigator must deploy');
assert.ok(read('.github/workflows/pages.yml').includes('city-map.js'),'World map destinations must deploy');
assert.ok(read('city.html').includes('city-districts.js'),'District renderer must load');
assert.ok(read('.github/workflows/pages.yml').includes('city-districts.js'),'District renderer must deploy');

for(const file of ['city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-room-visuals.js','city-rise-visuals.js']){assert.ok(read('city.html').includes(file));assert.ok(read('.github/workflows/pages.yml').includes(file));}
console.log('PASS: City Rising simulation and activity renderer ship with the game.');

// The public game is the original polished V1 solo release, not a V2 prototype.
const city=read('city.html'),landing=read('index.html'),pages=read('.github/workflows/pages.yml');
for(const id of ['city-canvas','start-button','city-intro','room-mode','hud-credits','hud-level','mission-title','health-value','joystick','fire'])
 assert.ok(city.includes('id="'+id+'"'),'Original playable V1 HUD or control missing: '+id);
assert.ok(city.includes('SOLO / LOCAL SAVE'),'Original V1 solo gameplay must be the default');
assert.ok(city.includes('city.js?v=25-thematic-expansion'),'Restored V1 playable engine must be loaded with the refreshed script version');
assert.ok(!city.includes('city-v2-release-gate.js'),'V1 entry must never force world2');
assert.ok(!city.includes('href="city-world2-preview.html"'),'Do not advertise V2 preview in the restored game');
const cardStart=landing.indexOf('<article class="home-portal game-portal"'),detailsStart=landing.indexOf('<details class="portal-details"',cardStart);
const soloCta=landing.indexOf('class="button primary game-direct-play"',cardStart);
assert.ok(cardStart>=0&&soloCta>cardStart&&detailsStart>soloCta,'Homepage must show an immediate Solo Play button without expanding the card');
assert.ok(landing.includes('href="city.html?release=center-city-v1"'),'Homepage Solo Play must open Center City');
assert.ok(pages.includes('city.html')&&pages.includes('city.js'),'Pages must publish original playable game files');
for(const oldPage of ['city-world2-preview.html','city-world2-production.html']){
 const redirect=read(oldPage);
 assert.ok(pages.includes(oldPage),'Old v2 URL redirect must be deployed: '+oldPage);
 assert.ok(redirect.includes('location.replace(\'city.html?release=center-city-v1\')'),'Old v2 URL must redirect to playable Center City: '+oldPage);
 assert.ok(!redirect.includes('localStorage'),'Redirect must not alter original browser saves');
}
for(const oldAsset of ['city-world2-preview.js','city-world2-simulation.js','city-world2.js','city-world2-registry.js'])
 assert.ok(!pages.includes(' '+oldAsset+' '),'Prototype script must not be published: '+oldAsset);
console.log('PASS: Center City homepage and game, visible Solo Play, stable save data, and retired V2 redirects.');
