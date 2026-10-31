import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createWorld2Vault} from '../server/city-world2-vault.mjs';
async function fixture(fn){
 const dir=await mkdtemp(path.join(tmpdir(),'world2-qa-vault-test-'));
 try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}
}
test('opt-in profile vault keeps 256-bit recovery credential secret and survives new instance',async()=>{
 await fixture(async dir=>{
  const a=createWorld2Vault(dir),original={schema:1,worldVersion:2,player:{credits:180},journey:0};
  const first=await a.create(original);
  assert.match(first.recoveryKey,/^[A-Za-z0-9_-]{43}$/);
  assert.match(first.id,/^[0-9a-f]{64}$/);
  assert.equal(first.revision,1);
  const disk=await readFile(path.join(dir,first.id+'.json'),'utf8');
  assert.equal(disk.includes(first.recoveryKey),false,'secret is never persisted or logged in JSON');
  const second=createWorld2Vault(dir);
  assert.equal((await second.load(first.recoveryKey)).progress.player.credits,180);
  await assert.rejects(second.load('definitely-not-a-key'),/Invalid recovery key/);
  const updated={...original,player:{credits:200}};
  assert.equal((await second.save(first.id,updated)).revision,2);
  assert.equal((await a.load(first.recoveryKey)).progress.player.credits,200);
  const prior=JSON.parse(await readFile(path.join(dir,first.id+'.bak'),'utf8'));
  assert.equal(prior.progress.player.credits,180,'previous verified revision is backed up');
  const names=await readdir(dir);
  assert.ok(names.every(n=>!n.includes(first.recoveryKey)));
 });
});
test('tampered QA records fail integrity checks and cannot be silently overwritten',async()=>{
 await fixture(async dir=>{
  const vault=createWorld2Vault(dir),p={schema:1,worldVersion:2,player:{credits:100}};
  const {id,recoveryKey}=await vault.create(p);
  const filename=path.join(dir,id+'.json'),doc=JSON.parse(await readFile(filename,'utf8'));
  doc.progress.player.credits=999999;
  await writeFile(filename,JSON.stringify(doc));
  await assert.rejects(vault.load(recoveryKey),/integrity check failed/);
  await assert.rejects(vault.save(id,{...p,player:{credits:5}}),/integrity check failed/);
  assert.equal(JSON.parse(await readFile(filename,'utf8')).progress.player.credits,999999);
 });
});
test('wrong key cannot read another profile and independent vault records have distinct digests',async()=>{
 await fixture(async dir=>{
  const vault=createWorld2Vault(dir),a=await vault.create({who:'A'}),b=await vault.create({who:'B'});
  assert.notEqual(a.recoveryKey,b.recoveryKey);assert.notEqual(a.id,b.id);
  assert.equal((await vault.load(a.recoveryKey)).progress.who,'A');
  assert.equal((await vault.load(b.recoveryKey)).progress.who,'B');
  const wrong=b.recoveryKey.slice(0,42)+(b.recoveryKey.endsWith('A')?'B':'A');
  await assert.rejects(vault.load(wrong),/Recovery key not found|integrity|Invalid recovery key/);
 });
});
test('save sequence rejects invalid path and bounds oversized records without corrupting latest',async()=>{
 assert.throws(()=>createWorld2Vault('relative/path'),/absolute QA save directory/);
 await fixture(async dir=>{
  const vault=createWorld2Vault(dir),a=await vault.create({v:1});
  await assert.rejects(vault.save(a.id,{blob:'x'.repeat(200000)}),/safe size limit/);
  assert.equal((await vault.load(a.recoveryKey)).progress.v,1);
  const versions=await Promise.all([vault.save(a.id,{v:2}),vault.save(a.id,{v:3})]);
  assert.deepEqual(versions.map(x=>x.revision),[2,3]);
  assert.equal((await vault.load(a.recoveryKey)).progress.v,3);
 });
});
