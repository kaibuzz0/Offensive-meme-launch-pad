import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityServer} from '../server/city-server.mjs';
test('HTTP rooms authenticate, stream real peers, reject forged actions and isolate server files',async t=>{
 const {server}=createCityServer({origins:['https://allowed.example']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 async function post(route,body,token,origin){return fetch(base+'/api/city'+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});}
 const denied=await post('/join',{name:'X',avatar:'offensive'},null,'https://bad.example');assert.equal(denied.status,403);
 const a=await (await post('/join',{name:'Alice',avatar:'offensive'})).json();
 const b=await (await post('/join',{name:'Bob',avatar:'maduro'})).json();assert.equal(b.state.players.length,2);assert.notEqual(a.session,a.state.self.id);
 assert.equal((await fetch(base+'/api/city/state')).status,401);
 assert.equal((await post('/action',{type:'setCredits',credits:100000},a.session)).status,400);
 for(const action of [{type:'travel',area:'fortress'},{type:'hire',role:'sentry'},{type:'crewOrder',id:'fake',mode:'follow'},{type:'defenseDrill'}])assert.equal((await post('/action',action,a.session)).status,400);
 assert.equal((await post('/input',{x:1,y:0},a.session)).status,200);
 const abort=new AbortController();const stream=await fetch(base+'/api/city/events',{headers:{Authorization:`Bearer ${a.session}`},signal:abort.signal});
 assert.equal(stream.status,200);const read=await stream.body.getReader().read();const snapshot=JSON.parse(new TextDecoder().decode(read.value).trim().split('\n')[0]);assert.equal(snapshot.players.length,2);assert.equal(JSON.stringify(snapshot).includes(a.session),false);abort.abort();
 assert.equal((await fetch(base+'/server/city-server.mjs')).status,404);
 assert.equal((await fetch(base+'/.git/config')).status,404);
 assert.match(await (await fetch(base+'/city-network.js')).text(),/enabled:true/);
 assert.equal((await fetch(base+'/city.html')).status,200);
 assert.equal((await fetch(base+'/city-districts.js')).status,200);
 await post('/leave',{},a.session);assert.equal((await fetch(base+'/api/city/state',{headers:{Authorization:`Bearer ${a.session}`}})).status,401);
});

test('trailer serves playable video, a poster and seekable byte ranges',async t=>{
 const {server}=createCityServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}/assets/media/`;
 const head=await fetch(base+'meme-city-trailer.mp4',{method:'HEAD'});
 assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'video/mp4');assert.equal(head.headers.get('accept-ranges'),'bytes');
 const total=Number(head.headers.get('content-length'));assert.ok(total>0);
 const start=await fetch(base+'meme-city-trailer.mp4',{headers:{Range:'bytes=0-31'}});
 assert.equal(start.status,206);assert.equal(start.headers.get('content-range'),`bytes 0-31/${total}`);assert.equal((await start.arrayBuffer()).byteLength,32);
 const tail=await fetch(base+'meme-city-trailer.mp4',{headers:{Range:'bytes=-16'}});
 assert.equal(tail.status,206);assert.equal((await tail.arrayBuffer()).byteLength,16);
 assert.equal((await fetch(base+'meme-city-trailer.mp4',{headers:{Range:`bytes=${total}-`}})).status,416);
 const poster=await fetch(base+'meme-city-trailer-poster.jpg');assert.equal(poster.status,200);assert.equal(poster.headers.get('content-type'),'image/jpeg');
});
