import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const page=fs.readFileSync(new URL('../city-world2-production.html',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../city-world2-online.js',import.meta.url),'utf8');
test('public game entrance is a foreground overlay with the original one-tap wording',()=>{
 assert.match(page,/<button[^>]+id="enter-game"[^>]*>ENTER MEME CITY/);
 assert.match(page,/<div class="game-entry" id="game-entry">/);
 assert.ok(page.indexOf('id="game-entry"')<page.indexOf('id="play-controls"'));
 assert.ok(page.indexOf('id="game"')<page.indexOf('id="game-menu"'));
 assert.match(page,/<div id="play-controls" hidden>/);
 assert.match(page,/<details id="game-menu" class="game-menu">/);
 assert.match(page,/<div id="live-hud"[^>]+hidden/);
 assert.match(client, /\$\('enter-game'\)\.addEventListener\('click',\(\)=>join\(false\)\)/);
 assert.match(client, /\$\('game-entry'\)\.hidden=joined/);
 assert.match(client, /\$\('play-controls'\)\.hidden=!joined/);
});
test('public gameplay uses a compact viewport and keeps loss-of-progress disclosure readable',()=>{
 assert.match(page, /@media\(max-width:800px\)/);
 assert.match(page, /#game\{height:min\(67dvh,700px\)/);
 assert.match(page, /<details class="release-note">/);
 assert.match(page,/PROGRESS IS TEMPORARY/);
 assert.match(page,/may reset when the server restarts/);
 assert.doesNotMatch(page,/Join the local world2 server/);
 assert.match(client,/Show actual V2 geography behind the start screen/);
});
