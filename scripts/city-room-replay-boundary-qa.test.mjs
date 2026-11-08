import test from 'node:test';
import assert from 'node:assert/strict';
import {createRooms,RoomError} from '../server/city-rooms.mjs';

// A minimal authoritative engine fixture: the test exercises the actual room
// admission, input-sequence and action boundary, without a browser or network.
class Engine {
 static LAYOUT_VERSION=1;
 static CAPABILITIES={online:{actions:['interact']}};
 constructor(){this.players=new Map();this.calls=[];}
 join(id){this.players.set(id,{});}
 leave(id){this.players.delete(id);}
 snapshot(){return {ok:true};}
 input(id,x,y){this.calls.push(['move',id,x,y]);}
 trigger(id,fire,aimX,aimY){this.calls.push(['trigger',id,fire,aimX,aimY]);}
 action(id,body){this.calls.push(['action',id,body.type]);return 'ok';}
 tick(){}
}
test('multiplayer input sequence rejects replay without applying movement or fire',()=>{
 let clock=1000;
 const rooms=createRooms(Engine,{now:()=>clock});
 const joined=rooms.join({layoutVersion:1},'qa-ip');
 const session=rooms.auth(joined.session);
 const engine=rooms.first.engine;
 rooms.input(session,{seq:5,x:1,y:0,fire:true});
 const accepted=engine.calls.length;
 assert.equal(accepted,2);
 rooms.input(session,{seq:5,x:-1,y:0,fire:false});
 rooms.input(session,{seq:4,x:-1,y:0,fire:false});
 assert.equal(engine.calls.length,accepted,'replayed input must not change movement or firing');
 rooms.input(session,{seq:6,x:0,y:1,fire:false});
 assert.equal(engine.calls.length,accepted+2);
 assert.deepEqual(engine.calls.at(-2).slice(2),[0,1]);
 assert.throws(()=>rooms.input(session,{seq:7,x:Infinity,y:0}),RoomError);
 assert.throws(()=>rooms.input(session,{seq:-1,x:0,y:0}),RoomError);
 assert.throws(()=>rooms.input(session,{seq:7,x:0,y:0,aimX:NaN}),RoomError);
 assert.equal(engine.calls.length,accepted+2);
});
test('multiplayer action allowlist rejects unknown gameplay IDs before engine mutation',()=>{
 const rooms=createRooms(Engine);
 const joined=rooms.join({layoutVersion:1},'qa-ip');
 const session=rooms.auth(joined.session);
 const engine=rooms.first.engine;
 assert.throws(()=>rooms.action(session,{type:'grant-currency',amount:999999}),RoomError);
 assert.throws(()=>rooms.action(session,{type:'spawn-unregistered-item',id:'invalid'}),RoomError);
 assert.equal(engine.calls.length,0);
 assert.equal(rooms.action(session,{type:'interact'}).message,'ok');
 assert.deepEqual(engine.calls.at(-1).slice(2),['interact']);
});
