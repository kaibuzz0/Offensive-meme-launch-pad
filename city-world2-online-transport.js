/* World2 local QA transport: server-owned state, ephemeral credentials, no persistence.
 * Deliberately refuses non-loopback APIs. Never put tokens in a URL or browser storage.
 */
'use strict';
(function(root){
 const allowed=new Set(['http://127.0.0.1:8788/api/world2','http://localhost:8788/api/world2']);
 function create({base='http://127.0.0.1:8788/api/world2',request=root.fetch?.bind(root)}={}){
  if(!allowed.has(base)||typeof request!=='function')throw Error('World2 QA requires a loopback API and fetch.');
  let token=null,snapshot=null,seq=0,epoch=0,joining=false;
  function clear(){token=null;snapshot=null;seq=0;epoch++;}
  async function call(path,method='GET',body,secured=true){
   if(secured&&!token)throw Error('Join a world2 QA room first.');
   const current=epoch,headers={'Accept':'application/json'};
   if(secured)headers.Authorization='Bearer '+token;
   if(method==='POST')headers['Content-Type']='application/json';
   let response;
   try{response=await request(base+path,{method,headers,cache:'no-store',...(method==='POST'?{body:JSON.stringify(body||{})}:{})});}
   catch{throw Error('Local world2 QA server unavailable. Start npm run dev:world2.');}
   let data;try{data=await response.json();}catch{throw Error('World2 QA server sent invalid JSON.');}
   if(current!==epoch)throw Error('World2 QA session changed during request.');
   if(!response.ok){if(response.status===401&&secured)clear();throw Error(String(data?.error||'World2 request rejected.').slice(0,180));}
   return data;
  }
  function accept(s){if(!s||s.worldVersion!==2||!s.self||!Array.isArray(s.players)||!Array.isArray(s.guards)||!Array.isArray(s.territory))
   throw Error('Invalid world2 server snapshot.');
   if(snapshot&&snapshot.self?.id===s.self.id&&Number.isInteger(s.revision)&&Number.isInteger(snapshot.revision)&&s.revision<snapshot.revision)return snapshot;
   snapshot=s;return s;
  }
  async function join({name='Guest',avatar='offensive',code,createRoom=false}={}){
   if(token||joining)throw Error('A world2 QA join is already active.');
   joining=true;
   try{
    const data=await call('/join','POST',{name,avatar,...(code?{code}:{}),...(createRoom?{create:true}:{})},false);
    if(!/^[a-f0-9]{64}$/i.test(data?.session||''))throw Error('World2 QA server did not issue a valid session.');
    token=data.session;seq=0;
    try{return accept(data.state);}catch(e){clear();throw e;}
   }finally{joining=false;}
  }
  async function state(){const old=epoch,s=await call('/state');if(epoch!==old)throw Error('World2 QA session expired.');return accept(s);}
  async function input({x=0,y=0,fire=false,aimX=1,aimY=0}={}){
   if(![x,y,aimX,aimY].every(n=>Number.isFinite(n)&&Math.abs(n)<=1))throw Error('Invalid world2 input.');
   return call('/input','POST',{x,y,fire:fire===true,aimX,aimY,seq:++seq});
  }
  async function action(type,fields={}){
   if(typeof type!=='string'||!type||!fields||typeof fields!=='object'||Array.isArray(fields))throw Error('Invalid world2 action.');
   const result=await call('/action','POST',{...fields,type});
   if(result?.state)accept(result.state);
   return result;
  }
  async function leave(){
   if(!token)return;
   try{await call('/leave','POST',{});}finally{clear();}
  }
  return Object.freeze({join,state,input,action,leave,isJoined:()=>!!token,lastSnapshot:()=>snapshot,disconnect:clear});
 }
 root.CityWorld2OnlineTransport=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
