/* OFFENSIVE Android Mobile Wallet Adapter.
 * Uses the maintained Solana Mobile protocol. Only initialized on Android and
 * only launches a wallet from a direct user click. The existing Phantom/Solflare
 * injected provider path always takes precedence.
 * No private keys, signatures or authorization tokens go to localStorage.
 */
import {transact} from 'https://esm.sh/@solana-mobile/mobile-wallet-adapter-protocol@2.3.0?bundle';

const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase58(bytes){
  let n=0n;
  for(const byte of bytes)n=(n<<8n)+BigInt(byte);
  let s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n;}
  for(const byte of bytes){if(byte!==0)break;s='1'+s;}
  return s;
}
function from64(text){
  if(typeof text!=='string')throw Error('Unexpected wallet address encoding.');
  const clean=text.replace(/-/g,'+').replace(/_/g,'/');
  const bytes=atob(clean);
  return Uint8Array.from(bytes,ch=>ch.charCodeAt(0));
}
function to64(bytes){
  let str='';for(const byte of bytes)str+=String.fromCharCode(byte);
  return btoa(str);
}
function normalize(account){
  if(typeof account?.display_address==='string'&&account.display_address_format==='base58')return account.display_address;
  const address=account?.address;
  if(typeof address!=='string')throw Error('Mobile wallet did not return an account.');
  try{
    const raw=from64(address);
    if(raw.length===32)return toBase58(raw);
  }catch{}
  if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))return address;
  throw Error('Mobile wallet returned an unsupported Solana address.');
}
const identity={
  name:'OFFENSIVE / MEME CITY',
  uri:location.origin,
  // MWA identity icons must be path-relative to the HTTPS origin.
  icon:'Offensive-meme-launch-pad/assets/icons/app-192.png'
};

export function createMobileWallet(){
  const listeners=new Map();
  let authorization=null,address=null,account=null,active=false;
  const notify=(event,data)=>{for(const cb of listeners.get(event)||[])try{cb(data);}catch{}};
  async function authorize(wallet){
    const params={identity,chain:'solana:mainnet'};
    if(authorization?.auth_token)params.auth_token=authorization.auth_token;
    let next;
    try{next=await wallet.authorize(params);}
    catch(e){
      if(!params.auth_token)throw e;
      next=await wallet.authorize({identity,chain:'solana:mainnet'});
    }
    if(!next?.accounts?.length)throw Error('No Solana accounts authorized in the selected Android wallet.');
    let selected;
    if(address)selected=next.accounts.find(a=>normalize(a)===address);
    if(address&&!selected)throw Error('Wallet account has changed. Disconnect and connect the intended account.');
    selected ||=next.accounts[0];
    return {next,selected,address:normalize(selected)};
  }
  const publicKey=()=>address?{toString:()=>address}:null;
  return {
    kind:'mobile-wallet-adapter',
    requiresUserGesture:true,
    get isConnected(){return active;},
    get publicKey(){return publicKey();},
    on(event,callback){
      if(typeof callback!=='function')return;
      if(!listeners.has(event))listeners.set(event,new Set());
      listeners.get(event).add(callback);
    },
    off(event,callback){listeners.get(event)?.delete(callback);},
    async connect(){
      // transact must be initiated by an explicit click to allow Android's
      // solana-wallet: intent and chooser to open from Chrome/PWA.
      const a=await transact(async wallet=>authorize(wallet));
      authorization=a.next;account=a.selected;address=a.address;active=true;
      return {publicKey:publicKey()};
    },
    async signMessage(message){
      if(!active||!address)throw Error('Connect an Android wallet first.');
      const bytes=message instanceof Uint8Array?message:new Uint8Array(message);
      if(!bytes.length||bytes.length>8192)throw Error('Invalid ownership message size.');
      const expectedAddress=address;
      const signed=await transact(async wallet=>{
        const a=await authorize(wallet);
        if(a.address!==expectedAddress)throw Error('Wallet account changed before signing.');
        const r=await wallet.signMessages({addresses:[a.selected.address],payloads:[to64(bytes)]});
        if(!Array.isArray(r?.signed_payloads)||r.signed_payloads.length!==1)throw Error('Wallet did not sign the ownership message.');
        authorization=a.next;
        return from64(r.signed_payloads[0]);
      });
      if(signed.length!==64&&signed.length!==bytes.length+64)throw Error('Unexpected signed-message response length.');
      if(signed.length!==64)for(let i=0;i<bytes.length;i++)if(signed[i]!==bytes[i])throw Error('Wallet signed a different message. Rejected.');
      return {signature:signed.slice(-64),publicKey:publicKey()};
    },
    async disconnect(){
      authorization=null;account=null;address=null;active=false;
      notify('disconnect');
    }
  };
}
