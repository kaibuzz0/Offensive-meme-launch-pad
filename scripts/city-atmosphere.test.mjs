import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope={window:{}};
for(const f of ['city-core.js','city-rise.js','city-rise-visuals.js']){
 const source=fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 vm.runInNewContext(source,scope,{filename:f});
}
const C=scope.window.MemeCityCore,RV=scope.window.CityRisingVisuals;
const timeAt=hour=>((hour-18+24)%24)*20_000;
function paintRecorder(){
 const calls={gradients:0,rectangles:0,ellipses:0,strokes:0};
 const gradient={addColorStop(){}};
 const ctx={
  save(){},restore(){},beginPath(){},fill(){},moveTo(){},lineTo(){},
  ellipse(){calls.ellipses++;},stroke(){calls.strokes++;},
  fillRect(){calls.rectangles++;},
  createRadialGradient(){calls.gradients++;return gradient;},
  createLinearGradient(){return gradient;}
 };
 return {ctx,calls};
}

test('the same deterministic clock blends dawn and dusk without changing engine time',()=>{
 assert.equal(RV.lightingState(timeAt(12)).night,0,'midday has no artificial night tint');
 assert.equal(RV.lightingState(timeAt(18)).night,.5,'twilight ramps gradually');
 assert.equal(RV.lightingState(timeAt(19)).night,1,'night reaches full strength');
 assert.equal(RV.lightingState(timeAt(5)).night,1,'pre-dawn stays dark');
 assert.equal(RV.lightingState(timeAt(6)).night,.5,'dawn fades gradually');
 assert.equal(RV.lightingState(timeAt(7)).night,0,'morning is clear');
 assert.equal(RV.lightingState(NaN).hour,18,'invalid visual clock is finite and safe');
});

test('new streetlights follow the existing center-world Hub and stay capped',()=>{
 const player={x:C.HUB.x+645,y:C.HUB.y+482,plot:[]};
 const before=JSON.stringify(player);
 const night=paintRecorder(),painted=RV.streetLights(night.ctx,player,timeAt(22));
 assert.ok(painted>=1,'real current-world road has a lit fixture');
 assert.ok(painted<=8,'mobile rendering budget is hard-capped');
 assert.equal(night.calls.gradients,painted,'one world-space glow gradient per visible source');
 assert.equal(night.calls.rectangles,painted,'no unbounded Canvas fill loops');
 assert.equal(JSON.stringify(player),before,'lighting never mutates the character/save');
 const day=paintRecorder();
 assert.equal(RV.streetLights(day.ctx,player,timeAt(12)),0,'midday skips all bloom');
 assert.equal(day.calls.gradients,0,'midday creates no light gradients');
 const oldCoordinates=paintRecorder();
 assert.equal(RV.streetLights(oldCoordinates.ctx,{x:2830,y:570,plot:[]},timeAt(22)),0,
  'retired pre-center coordinates no longer attract light effects');
 const far=paintRecorder();
 assert.equal(RV.streetLights(far.ctx,{x:30,y:30,plot:[]},timeAt(22)),0,
  'invisible street lights must be culled');
});

test('user-built lamps draw only near the owner without persisting new data',()=>{
 const p={x:C.PLOT.x+3*C.PLOT.tile+32,y:C.PLOT.y+2*C.PLOT.tile+32,
  plot:[{kind:'lamp',col:3,row:2}]};
 const {ctx,calls}=paintRecorder();
 assert.ok(RV.streetLights(ctx,p,timeAt(21))>=1,'existing builder lamps retain illumination');
 assert.ok(calls.gradients<=8);
});

test('reduced-motion rain has no animated strokes, while full motion has bounded rain',()=>{
 const wet=timeAt(19)+80_000; // 23:00; 100 simulated seconds => rain interval
 assert.equal(RV.lightingState(wet).rain,true);
 const reduced=paintRecorder();
 const info=RV.atmosphere(reduced.ctx,360,700,wet,true);
 assert.equal(info.weather,'LIGHT RAIN');
 assert.equal(reduced.calls.strokes,0,'reduced motion suppresses falling rain animation');
 const moving=paintRecorder();
 RV.atmosphere(moving.ctx,360,700,wet,false);
 assert.ok(moving.calls.strokes>0&&moving.calls.strokes<=46,
  'normal weather uses a fixed mobile-friendly draw budget');
 const day=paintRecorder();
 RV.atmosphere(day.ctx,360,700,timeAt(12),true);
 assert.equal(day.calls.strokes,0);
});
