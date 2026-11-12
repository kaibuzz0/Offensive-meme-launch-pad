#!/usr/bin/env node
// Audit the actual homepage Play path against the current service-worker offline shell.
// This is a diagnostic, not proof that offline Solo works.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(resolve(root,p),'utf8');
const home=read('index.html'), sw=read('sw.js');
const play=home.match(/class="button primary game-direct-play" href="([^"]+)"/);
if(!play) throw new Error('Homepage primary Play entry not found');
const href=play[1].replaceAll('&amp;','&');
const page=href.split('?')[0];
if(!existsSync(resolve(root,page))) throw new Error('Homepage Play destination missing: '+page);
const html=read(page);
const assets=[...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(p=>!p.startsWith('http')&&!p.startsWith('//')&&!p.startsWith('data:')).map(p=>p.split('?')[0]);
const missing=assets.filter(p=>!existsSync(resolve(root,dirname(page),p)));
const shell=[...sw.matchAll(/'([^']+)'/g)].map(m=>m[1]);
const offlineAssets=assets.filter(p=>shell.includes(p));
const result={homepagePlay:href,entry:page,referencedAssets:assets.length,missingAssets:missing,assetsExplicitlyInServiceWorkerShell:offlineAssets,notInShell:assets.filter(p=>!shell.includes(p)),offlineSoloVerified:false,note:'HTML direct references only; dynamic imports, CSS dependencies and network cache behavior require browser verification.'};
console.log(JSON.stringify(result,null,2));
if(missing.length) process.exitCode=1;
