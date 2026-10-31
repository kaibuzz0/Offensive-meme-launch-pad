/* Opt-in local-only world2 QA profile vault.
 * Recovery keys have 256 bits of entropy; only their SHA-256 digest names a profile file.
 * Records are HMAC authenticated and written by atomic same-directory rename.
 * This is a single-process development store, not an encrypted production identity system.
 */
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const TYPE='world2-qa-private-profile',VERSION=1,MAX_BYTES=128000;
const validKey=k=>typeof k==='string'&&/^[A-Za-z0-9_-]{43}$/.test(k)&&Buffer.from(k,'base64url').length===32;
const digest=k=>createHash('sha256').update(k).digest('hex');
const stable=x=>JSON.stringify(x);
export function createWorld2Vault(directory){
 if(typeof directory!=='string'||!path.isAbsolute(directory))throw Error('An explicit absolute QA save directory is required.');
 const folder=path.resolve(directory),signPath=path.join(folder,'.qa-signing-key'),locks=new Map();
 let signingKey=null;
 async function initialize(){
  await fs.mkdir(folder,{recursive:true,mode:0o700});
  try{await fs.writeFile(signPath,randomBytes(32),{flag:'wx',mode:0o600});}
  catch(e){if(e.code!=='EEXIST')throw e;}
  const data=await fs.readFile(signPath);
  if(data.length!==32)throw Error('QA signing key is invalid. Refusing unsafe writes.');
  signingKey=data;
 }
 const init=initialize();
 const filename=id=>path.join(folder,id+'.json');
 const backup=id=>path.join(folder,id+'.bak');
 const serialize=(id,rev,progress)=>{
  const payload={kind:TYPE,version:VERSION,id,revision:rev,progress};
  const mac=createHmac('sha256',signingKey).update(stable(payload)).digest('hex');
  const raw=stable({...payload,mac});
  if(Buffer.byteLength(raw)>MAX_BYTES)throw Error('QA profile save exceeds the safe size limit.');
  return raw;
 };
 const decode=(raw,id)=>{
  let doc;try{doc=JSON.parse(raw);}catch{throw Error('Saved world2 profile is corrupted.');}
  if(!doc||doc.kind!==TYPE||doc.version!==VERSION||doc.id!==id||
    !Number.isSafeInteger(doc.revision)||doc.revision<1||typeof doc.mac!=='string'||
    !/^[0-9a-f]{64}$/.test(doc.mac)||!doc.progress||typeof doc.progress!=='object')
   throw Error('Saved world2 profile is incompatible.');
  const payload={kind:doc.kind,version:doc.version,id:doc.id,revision:doc.revision,progress:doc.progress};
  const expected=createHmac('sha256',signingKey).update(stable(payload)).digest();
  if(!timingSafeEqual(expected,Buffer.from(doc.mac,'hex')))
   throw Error('Saved world2 profile integrity check failed.');
  return doc;
 };
 async function get(id){
  await init;
  if(!/^[0-9a-f]{64}$/.test(id))throw Error('Invalid private profile identifier.');
  const raw=await fs.readFile(filename(id),'utf8');
  if(Buffer.byteLength(raw)>MAX_BYTES)throw Error('Saved world2 profile is oversized.');
  return decode(raw,id);
 }
 function sequence(id,work){
  const before=locks.get(id)||Promise.resolve();
  const next=before.catch(()=>{}).then(work);
  locks.set(id,next);
  next.finally(()=>{if(locks.get(id)===next)locks.delete(id);}).catch(()=>{});
  return next;
 }
 async function atomicWrite(id,raw,hasOld){
  const temp=path.join(folder,'.'+id+'-'+randomBytes(8).toString('hex')+'.tmp');
  try{
   await fs.writeFile(temp,raw,{mode:0o600,flag:'wx'});
   if(hasOld)await fs.copyFile(filename(id),backup(id));
   await fs.rename(temp,filename(id));
  }finally{await fs.unlink(temp).catch(()=>{});}
 }
 async function create(progress){
  await init;const secret=randomBytes(32).toString('base64url'),id=digest(secret);
  return sequence(id,async()=>{
   const raw=serialize(id,1,progress);
   try{await fs.stat(filename(id));throw Error('Profile identifier collision.');}
   catch(e){if(e.code!=='ENOENT')throw e;}
   await atomicWrite(id,raw,false);
   return {id,recoveryKey:secret,revision:1};
  });
 }
 async function load(recoveryKey){
  if(!validKey(recoveryKey))throw Error('Invalid recovery key format.');
  const id=digest(recoveryKey);
  let doc;try{doc=await get(id);}
  catch(e){if(e.code==='ENOENT')throw Error('Recovery key not found.');throw e;}
  return {id,revision:doc.revision,progress:doc.progress};
 }
 async function save(id,progress){
  return sequence(id,async()=>{
   const previous=await get(id),rev=previous.revision+1;
   if(!Number.isSafeInteger(rev))throw Error('QA profile revision exhausted.');
   const raw=serialize(id,rev,progress);
   await atomicWrite(id,raw,true);
   return {revision:rev};
  });
 }
 return Object.freeze({create,load,save,ready:()=>init});
}
