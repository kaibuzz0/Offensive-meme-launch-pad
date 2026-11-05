import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('city.html');
const server=read('server/city-server.mjs');
const pages=read('.github/workflows/pages.yml');
const filenames=Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g),m=>m[1].split('?')[0]);
const served=new Set(Array.from(server.match(/const files=new Set\(\[([\s\S]*?)\]\);/)?.[1].matchAll(/'([^']+)'/g)||[],m=>m[1]));
const published=new Set(pages.match(/\bcp\s+([\s\S]*?)\s+_site\//)?.[1].split(/\s+/).filter(Boolean)||[]);

test('single World V1 entry contains every asset in the GitHub Pages and local-room-server manifests',()=>{
 assert.ok(filenames.length>=28,'the canonical one-world game must load the complete core / camera / mine pipeline');
 assert.equal(filenames.length,new Set(filenames).size,'do not double-load a game module into the shared player engine');
 for(const src of filenames){
  assert.match(src,/^[\w-]+\.js$/,'script URLs must be same-origin static game modules');
  assert.ok(fs.existsSync(new URL('../'+src,import.meta.url)),src+' must exist in the repository');
  assert.ok(served.has(src),src+' must be accessible from the real local test server');
  assert.ok(published.has(src),src+' must be included in the actual published Pages artifact');
 }
 for(const src of ['city-graphics.js','city-live-3d.js','city-mining.js','city-mine-visuals.js','city.js']){
  assert.ok(filenames.includes(src),'integrated release missing '+src);
 }
 const order=src=>filenames.indexOf(src);
 assert.ok(order('city-visuals.js')<order('city.js'),'unified avatar painter must load before World V1 game');
 assert.ok(order('city-mining.js')<order('city-mine-visuals.js'),'mining data must load before renderer');
 assert.ok(order('city-mine-visuals.js')<order('city.js'),'mining renderer must load before game entry');
 assert.ok(order('city-graphics.js')<order('city.js'),'camera painter must load before game entry');
 assert.ok(order('city-live-3d.js')<order('city.js'),'live viewport must load before game entry');
 assert.ok(!filenames.some(s=>s.startsWith('city-world2')),'abandoned World V2 may not become a live game dependency');
});

test('wallet adapter dynamically imported by the PWA is shipped and served with the same World V1 site',()=>{
 const pwa=read('pwa.js');
 assert.match(pwa,/import\('\.\/wallet-mobile\.js\?v=30-android-wallet'\)/);
 assert.ok(fs.existsSync(new URL('../wallet-mobile.js',import.meta.url)));
 assert.ok(published.has('wallet-mobile.js'),'wallet bridge must ship with Pages artifact');
 assert.ok(served.has('wallet-mobile.js'),'wallet bridge must be accessible from local room server');
 assert.ok(pages.includes('sw.js')&&pages.includes('pwa.js'));
});

test('released camera and mining scripts use cache-busted versions without touching legacy saves',()=>{
 assert.match(html,/city-graphics\.js\?v=61-live-crowd/);
 assert.match(html,/city-live-3d\.js\?v=61-live-crowd/);
 assert.match(html,/city-mine-visuals\.js\?v=62-unified-miner/);
 assert.match(html,/city\.js\?v=62-unified-miner/);
 assert.match(html,/SOLO \/ LOCAL SAVE/);
 const miner=read('city.js'),visual=read('city-mine-visuals.js');
 assert.ok(miner.includes('MV.slice(cave.getContext(\'2d\'),miningStore,entry,position,drawMiner)'));
 assert.ok(miner.includes('V.person(c,{id:\'solo-miner-\''));
 assert.ok(visual.includes('function slice(ctx,store,entry,player,drawAvatar)'));
 assert.ok(read('sw.js').includes('event.respondWith(fetch(request).catch('),'game navigation must always attempt network before offline fallback');
 assert.ok(!read('sw.js').includes('city.js'),'do not cache stale game code in offline service worker');
});
