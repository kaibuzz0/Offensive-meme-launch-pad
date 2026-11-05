import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const cli=resolve(root,'scripts/dev-runway.mjs');
const invoke=(arg)=>execFileSync(process.execPath,[cli,arg],{cwd:root,encoding:'utf8'});

test('development runway lists fast, nonempty project test scopes without running them',()=>{
 const listing=invoke('--list');
 for(const scope of ['graphics','world','systems']){
  const match=listing.match(new RegExp('^'+scope+': (\\d+) test files','m'));
  assert.ok(match&&Number(match[1])>=1,scope+' needs at least one real test');
 }
 assert.match(listing,/city-graphics\.test\.mjs/);
 assert.match(listing,/city-mining\.test\.mjs/);
 assert.match(listing,/all\/full: \d+ test files/);
 assert.doesNotMatch(listing,/# pass |# fail |TAP version/,'scope listing must not execute tests');
});

test('development runway supports explicit full verification and fails closed on unknown scopes',()=>{
 const help=invoke('--help');
 for(const mode of ['graphics','world','systems','all','full'])assert.ok(help.includes(mode),mode);
 assert.match(help,/Chromium/);
 for(const invalid of ['unknown','constructor','__proto__']){
  const proc=spawnSync(process.execPath,[cli,invalid],{cwd:root,encoding:'utf8'});
  assert.equal(proc.status,2,'unsupported scope '+invalid+' must fail without starting tests');
 }
 const badArgs=spawnSync(process.execPath,[cli,'graphics','extra'],{cwd:root,encoding:'utf8'});
 assert.equal(badArgs.status,2);
});

test('development package provides fast scopes and one full-release command',()=>{
 const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
 assert.equal(pkg.scripts['test:graphics'],'node scripts/dev-runway.mjs graphics');
 assert.equal(pkg.scripts['test:world'],'node scripts/dev-runway.mjs world');
 assert.equal(pkg.scripts['test:systems'],'node scripts/dev-runway.mjs systems');
 assert.equal(pkg.scripts['verify:all'],'node scripts/dev-runway.mjs all');
 assert.equal(pkg.scripts['verify:full'],'node scripts/dev-runway.mjs full');
 assert.equal(pkg.scripts.test,'node --test scripts/*.test.mjs',
  'the original CI regression entry point stays intact');
});
