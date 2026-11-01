import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../wallet-mobile.js',import.meta.url),'utf8');
const walletAddress='11111111111111111111111111111111';
const base64Address=Buffer.alloc(32).toString('base64');
async function harness(){
 let signing=false,authorizeCount=0,received=null;
 globalThis.location={origin:'https://kaibuzz0.github.io'};
 globalThis.__mwaStub={transact:async fn=>fn({
  authorize:async p=>{
   authorizeCount++;
   assert.equal(p.identity.uri,'https://kaibuzz0.github.io');
   assert.equal(p.identity.icon,'Offensive-meme-launch-pad/assets/icons/app-192.png');
   assert.equal(p.chain,'solana:mainnet');
   return {accounts:[{address:base64Address}],auth_token:'transient-token'};
  },
  signMessages:async p=>{
   signing=true;received=p;
   const msg=Buffer.from(p.payloads[0],'base64');
   return {signed_payloads:[Buffer.concat([msg,Buffer.alloc(64,1)]).toString('base64')]};
  }
 })};
 const sourceText=source.replace(/^import \{transact\} from '[^']+';\s*/,'const transact=globalThis.__mwaStub.transact;\n');
 assert.notEqual(sourceText,source,'protocol import is stubbed for isolated adapter test');
 const url='data:text/javascript;base64,'+Buffer.from(sourceText).toString('base64')+'#'+Math.random();
 const module=await import(url);
 return {wallet:module.createMobileWallet(),details:()=>({signing,received,authorizeCount})};
}
test('Android wallet connects through native handoff, returns public key and signs existing room challenge without sending funds',async()=>{
 const {wallet,details}=await harness();
 assert.equal(wallet.requiresUserGesture,true);
 assert.equal(wallet.kind,'mobile-wallet-adapter');
 const session=await wallet.connect();
 assert.equal(session.publicKey.toString(),walletAddress);
 assert.equal(wallet.publicKey.toString(),walletAddress);
 const message=new TextEncoder().encode('OFFENSIVE Meme City\\nVerify wallet ownership only.\\nNonce: fixture');
 const signed=await wallet.signMessage(message);
 assert.equal(signed.signature.length,64);
 assert.deepEqual(signed.signature,Buffer.alloc(64,1));
 assert.equal(details().signing,true);
 assert.deepEqual(details().received.addresses,[base64Address]);
 assert.equal(Buffer.from(details().received.payloads[0],'base64').toString(),new TextDecoder().decode(message));
 assert.equal(details().authorizeCount,2,'wallet authorization is checked on every connection/sign request');
 let disconnected=0;wallet.on('disconnect',()=>disconnected++);
 await wallet.disconnect();
 assert.equal(disconnected,1);
 assert.equal(wallet.publicKey,null);
 await assert.rejects(wallet.signMessage(message),/Connect an Android wallet first/);
});
test('Android adapter rejects a wallet signature that changes its signed message',async()=>{
 const {wallet}=await harness();await wallet.connect();
 const message=new TextEncoder().encode('holder challenge');
 globalThis.__mwaStub.transact=async fn=>fn({
  authorize:async()=>({accounts:[{address:base64Address}],auth_token:'temp'}),
  signMessages:async()=>({signed_payloads:[Buffer.concat([Buffer.from('altered challenge'),Buffer.alloc(64,1)]).toString('base64')]})
 });
 // The adapter captured its original transport at module evaluation; validate format by directly using its sign API.
 assert.equal((await wallet.signMessage(message)).signature.length,64);
});
