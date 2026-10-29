/* Authoritative, bounded guest rooms. No client balances or solo saves are accepted. */
import {randomBytes} from 'node:crypto';
export class RoomError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const allowed=new Set(['avatar','style','checkpoint','buy','equip','list','purchase','cancel','chat','fire','dash','contract','abandon','ride','medkit','restock','claimChapter','enterBuilding','exitBuilding']);
export function createRooms(Engine,{now=Date.now,capacity=8,maxRooms=8,sessionTTL=120000}={}){
 const rooms=new Map(),sessions=new Map(),joins=new Map();
 const make=(code,privateRoom)=>{const r={code,private:privateRoom,engine:new Engine(),revision:0};rooms.set(code,r);return r;};
 const first=make('public-1',false);let last=now();
 function snapshot(s){const r=rooms.get(s.room),state=r.engine.snapshot(s.id);return {...state,revision:r.revision,roomInfo:{code:r.code,private:r.private,capacity,players:r.engine.players.size}};}
 function reap(){const stamp=now();for(const [token,s] of sessions)if(stamp-s.lastSeen>sessionTTL){rooms.get(s.room)?.engine.leave(s.id);sessions.delete(token);}for(const [code,r]of rooms)if(code!=='public-1'&&!r.engine.players.size)rooms.delete(code);for(const [ip,l]of joins)if(stamp-l.start>600000)joins.delete(ip);}
 function join(body,ip){reap();const stamp=now();let l=joins.get(ip);if(!l){if(joins.size>=10000)throw new RoomError('Admission is busy. Try later.',503);joins.set(ip,l={start:stamp,count:0});}if(++l.count>12)throw new RoomError('Too many joins. Try again later.',429);
  if(body.create!==undefined&&typeof body.create!=='boolean')throw new RoomError('Invalid room choice.');
  let r;if(body.create){if(rooms.size>=maxRooms)throw new RoomError('All rooms are busy.',503);r=make(randomBytes(9).toString('hex').toUpperCase(),true);}
  else if(body.code){if(typeof body.code!=='string'||!/^([A-F0-9]{18}|public-[1-8])$/.test(body.code))throw new RoomError('Invalid room code.');r=rooms.get(body.code);if(!r)throw new RoomError('Room not found or closed.',404);}
  else {r=[...rooms.values()].find(r=>!r.private&&r.engine.players.size<capacity);if(!r){if(rooms.size>=maxRooms)throw new RoomError('All rooms are busy.',503);let i=1;while(rooms.has('public-'+i))i++;r=make('public-'+i,false);}}
  if(r.engine.players.size>=capacity)throw new RoomError('Room is full.',409);
  const id=randomBytes(8).toString('hex'),token=randomBytes(32).toString('hex');
  try{r.engine.join(id,body.name,body.avatar);}catch(e){if(r!==first&&!r.engine.players.size)rooms.delete(r.code);throw e;}
  const s={id,room:r.code,lastSeen:stamp,lastInput:stamp,window:stamp,count:0,seq:-1,actionWindow:stamp,actions:0};sessions.set(token,s);r.revision++;return {session:token,state:snapshot(s)};
 }
 function auth(token){const s=sessions.get(token);if(!s||now()-s.lastSeen>sessionTTL){if(s){rooms.get(s.room)?.engine.leave(s.id);sessions.delete(token);}throw new RoomError('Session expired. Join a room again.',401);}const stamp=now();if(stamp-s.window>=1000){s.window=stamp;s.count=0;}if(++s.count>35)throw new RoomError('Too many requests.',429);s.lastSeen=stamp;return s;}
 function input(s,b){if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||Math.abs(b.x)>1||Math.abs(b.y)>1)throw new RoomError('Invalid movement.');if(b.seq!==undefined&&(!Number.isSafeInteger(b.seq)||b.seq<0))throw new RoomError('Invalid input sequence.');if(b.seq!==undefined&&b.seq<=s.seq)return;if(!Number.isFinite(b.aimX??1)||!Number.isFinite(b.aimY??0))throw new RoomError('Invalid aim.');const e=rooms.get(s.room).engine;e.input(s.id,b.x,b.y);e.trigger(s.id,b.fire===true,b.aimX??1,b.aimY??0,b.manualAim===true);if(b.seq!==undefined)s.seq=b.seq;s.lastInput=now();}
 function action(s,b){if(!allowed.has(b.type))throw new RoomError('That action is unavailable in shared rooms. Fortress building and squads stay in solo.');const stamp=now();if(stamp-s.actionWindow>=1000){s.actionWindow=stamp;s.actions=0;}if(++s.actions>8)throw new RoomError('Slow down your actions.',429);const r=rooms.get(s.room),message=r.engine.action(s.id,b);r.revision++;return {message,state:snapshot(s)};}
 function leave(token){const s=sessions.get(token);if(s){rooms.get(s.room)?.engine.leave(s.id);sessions.delete(token);}}
 function advance(){const stamp=now(),elapsed=Math.max(0,Math.min(.25,(stamp-last)/1000));last=stamp;for(const s of sessions.values())if(stamp-s.lastInput>500){const e=rooms.get(s.room)?.engine;if(e?.players.has(s.id)){e.input(s.id,0,0);e.trigger(s.id,false);}}for(const r of rooms.values())if(r.engine.players.size){for(let t=elapsed;t>0;t-=.05)r.engine.tick(Math.min(.05,t));r.revision++;}}
 return {rooms,sessions,first,join,auth,input,action,leave,advance,reap,snapshot,health:()=>({status:'ok',protocol:2,mode:'temporary-play-credit-rooms',players:sessions.size,rooms:rooms.size,capacity,maxRooms})};
}
