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

for(const file of ['index.html','creators.html']){
 const page=read(file);
 for(const asset of ['launchpad.css','launchpad.js','social.js','pwa.js'])assert.ok(page.includes(asset),`${file}: ${asset}`);
 assert.ok(!page.includes('src="trade.js"'),`${file} should not load trading UI`);
}
new vm.Script(read('launchpad.js'));
console.log('PASS: community pages, lightweight script boundaries, and application JS syntax.');

for(const file of ['city-world2-preview.js','city-world2-territory.js','city-world2-contracts.js','city-world2-session.js','city-world2-services.js','city-world2-simulation.js','city-topology.js','city-migration.js','city-world2.js','city-world2-registry.js','city.js','city-map.js','city-nav.js','city-save.js','city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-clans.js','city-monk.js','city-room-visuals.js','city-rise-visuals.js','city-visuals.js','city-districts.js','city-network.js','city-room-client.js'])new vm.Script(read(file));
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

for(const script of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js','city-world2-registry.js','city-migration.js','city-world2-territory.js','city-world2-services.js','city-world2-simulation.js','city-visuals.js','city-world2-preview.js'])
 assert.ok(read('city-world2-preview.html').includes('src="'+script+'"'),'Preview missing script '+script);
for(const p of ['city-world2-preview.html','city-world2-preview.js','city-world2-territory.js','city-world2-contracts.js','city-world2-session.js','city-world2-services.js','city-world2-simulation.js','city-topology.js','city-migration.js','city-world2.js','city-world2-registry.js'])
 assert.ok(read('.github/workflows/pages.yml').includes(p),'Preview resource missing from future Pages package: '+p);
assert.ok(read('city-world2-preview.html').includes('Isolated geometry playtest'),'Preview must disclose isolated behavior');
console.log('PASS: world2 isolated preview script wiring, future deployment assets and limitations.');
assert.ok(read('city.html').includes('href="city-world2-preview.html"'),'Public city must label and link its optional world2 preview');
assert.ok(read('README.md').includes('world-v2 sandbox'),'Release notes must distinguish experimental preview from live game');
console.log('PASS: Public website links to clearly labeled world2 sandbox and release documentation.');

assert.ok(read('city-world2-preview.html').includes('src="city-world2-services.js"'),'Preview must load indoor services before the simulation');
assert.ok(read('.github/workflows/pages.yml').includes('city-world2-services.js'),'Future Pages preview package must ship services');
console.log('PASS: Preview-only indoor services load and ship with sandbox assets.');

assert.ok(fs.existsSync(path.join(root,'city-world2-authority.js')),'World2 authority must exist');
assert.ok(fs.existsSync(path.join(root,'server/city-world2-prototype.mjs')),'World2 server factory must exist');
assert.ok(fs.existsSync(path.join(root,'server/city-world2-local.mjs')),'World2 local HTTP harness must exist');
assert.ok(!read('server/city-server.mjs').includes('city-world2-prototype.mjs'),'Unreviewed world2 activation in production server');
new vm.Script(read('city-world2-authority.js'));
console.log('PASS: World2 authority and local QA remain isolated from production.');

for(const file of ['city-world2-online.js','city-world2-online-transport.js'])
 new vm.Script(read(file),{filename:file});
const online=read('city-world2-online.html');
for(const file of ['city-core.js','city-arcade.js','city-rise.js','city-interiors.js','city-topology.js','city-nav.js','city-world2.js',
 'city-world2-registry.js','city-world2-territory.js','city-visuals.js','city-world2-online-transport.js','city-world2-online.js'])
 assert.ok(online.includes('src="'+file+'"'),'Local-only world2 online client must load '+file);
assert.ok(online.includes('Local development only.'),'Local world2 QA must disclose its release boundary');
const serverFiles=read('server/city-server.mjs');
for(const file of ['city-world2-online.html','city-world2-online.js','city-world2-online-transport.js'])
 assert.ok(serverFiles.includes("'"+file+"'"),'Development server must serve '+file);
assert.ok(!read('.github/workflows/pages.yml').includes('city-world2-online.js'),
 'Loopback-only QA browser client must not be deployed into production Pages assets');
console.log('PASS: local-only world2 authenticated QA client assets and production isolation.');

assert.ok(fs.existsSync(path.join(root,'city-world2-journey.js')),'Authoritative world2 journey must exist');
new vm.Script(read('city-world2-journey.js'));
assert.ok(read('server/city-world2-prototype.mjs').includes("'city-world2-journey.js'"),'Room loader must include server journey');
assert.ok(online.includes('id="claim-journey"')&&online.includes('id="mark-journey"'),'QA client must expose city journey controls');
assert.ok(!read('.github/workflows/pages.yml').includes('city-world2-journey.js'),'Local-only server journey cannot deploy publicly yet');
console.log('PASS: server-authoritative orientation journey and isolated QA controls.');

assert.ok(read('city-world2-production.html').includes('city-world2-public-config.js'),'Public v2 candidate requires explicit HTTPS API opt-in');
assert.ok(!read('.github/workflows/pages.yml').includes('city-world2-production.html'),'Public v2 candidate cannot deploy before backend acceptance');
assert.ok(read('server/city-world2-production.mjs').includes('WORLD2_DURABLE_VOLUME_CONFIRMED'),'Public v2 must require explicit durable storage approval');
console.log('PASS: world2 public candidate isolated from production until explicit promotion.');
