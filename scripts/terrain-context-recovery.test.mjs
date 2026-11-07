import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the exact browser recovery handler, not a reimplemented copy.
// Extract only the small handler section so the entire game DOM is not needed.
const source=readFileSync(new URL('../city-terrain-mode.js',import.meta.url),'utf8');
const start=source.indexOf(' function recoverPerspective(factory){');
const end=source.indexOf(' function syncView(){',start);
assert.ok(start>0&&end>start,'terrain recovery handler exists');
const handler=source.slice(start,end);

function harness({fallbackFails=false,restoredFails=false}={}){
 const listeners={};
 const original={disposed:0,dispose(){this.disposed++;}};
 const status={dataset:{},textContent:''};
 const renderHint={textContent:'',hidden:true};
 const voxelCanvas={addEventListener(name,fn){listeners[name]=fn;}};
 const softwareCanvas={};
 const rendererApi={createCanvasRenderer(){if(fallbackFails)throw Error('Canvas unavailable');return {software:true,dispose(){}};}};
 const context={perspective:original,firstPerson:true,contextInterrupted:false,rendererApi,voxelCanvas,softwareCanvas,voxel:{},status,renderHint,syncCount:0,syncView(){this.syncCount++;},openPerspective(){if(restoredFails)throw Error('WebGL unavailable');return {software:false,dispose(){}};}};
 vm.createContext(context);
 // syncView is normally a function declaration following these handlers.
 vm.runInContext(handler.replaceAll('syncView();','globalThis.syncCount++;'),context);
 return {listeners,context,original,status};
}

test('context loss switches to Canvas2D without losing the player state',()=>{
 const h=harness();
 let prevented=false;
 h.listeners.webglcontextlost({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
 assert.equal(h.context.contextInterrupted,true);
 assert.equal(h.context.perspective.software,true);
 assert.equal(h.context.firstPerson,true);
 assert.equal(h.original.disposed,1);
 h.listeners.webglcontextrestored();
 assert.equal(h.context.contextInterrupted,false);
 assert.equal(h.context.perspective.software,false);
});

test('Canvas2D allocation failure keeps a safe 2D map path',()=>{
 const h=harness({fallbackFails:true});
 assert.doesNotThrow(()=>h.listeners.webglcontextlost({preventDefault(){}}));
 assert.equal(h.context.perspective,null);
 assert.equal(h.context.firstPerson,false);
 assert.match(h.status.textContent,/2D map/);
 assert.match(h.status.dataset.rendererError,/Canvas unavailable/);
 assert.equal(h.original.disposed,1);
});

test('failed WebGL restoration does not crash and allows another loss cycle',()=>{
 const h=harness({restoredFails:true});
 h.listeners.webglcontextlost({preventDefault(){}});
 assert.doesNotThrow(()=>h.listeners.webglcontextrestored());
 assert.equal(h.context.contextInterrupted,false);
 assert.equal(h.context.firstPerson,false);
 assert.match(h.status.dataset.rendererError,/WebGL unavailable/);
});

// Input-release persistence is essential on mobile/background-throttled browsers:
// the player must not lose the last movement segment while waiting for RAF.
test('movement key release saves position immediately, independently of the frame timer',()=>{
 assert.match(source,/window\.addEventListener\('keyup',e=>\{[\s\S]*?if\(keys\.delete\(key\)\)savePosition\(\);[\s\S]*?\}\);/);
});
