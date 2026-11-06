// Deterministic fictional scouting-drone simulation. No physical hardware interface.
// Positions are game-world meters; time is a fixed simulation step in seconds.
export const DRONE_SCHEMA = 1;
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const point = (p) => p && ['x','y','z'].every((k) => finite(p[k]));
const clone = (p) => ({ x: p.x, y: p.y, z: p.z });
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const approach = (a,b,maxStep) => {
  const d = distance(a,b);
  if (d <= maxStep || d === 0) return clone(b);
  const f = maxStep/d;
  return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f};
};
export function createDrone({id,home,capacity=120,speed=8,range=80}={}) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !point(home) ||
      !finite(capacity) || capacity<=0 || capacity>3600 || !finite(speed) || speed<=0 || speed>100 ||
      !finite(range) || range<=0 || range>10000) throw new TypeError('invalid drone configuration');
  return {schema:DRONE_SCHEMA,id,home:clone(home),position:clone(home),target:clone(home),
    capacity,battery:capacity,speed,range,mode:'docked',camera:false};
}
export function commandDrone(drone,command,{target}={}) {
  assertDrone(drone);
  if (command === 'launch') {
    if (drone.mode !== 'docked' || drone.battery <= 0) return drone;
    return {...drone,mode:'scouting',camera:true,target:clone(drone.position)};
  }
  if (command === 'return') return {...drone,mode:drone.mode==='docked'?'docked':'returning',camera:false,target:clone(drone.home)};
  if (command === 'scout') {
    if (drone.mode !== 'scouting' || !point(target) || distance(drone.home,target)>drone.range) throw new RangeError('scout target unavailable');
    // Reserve enough simulated flight time for the commanded outbound leg,
    // the trip back to home, and the same two-second emergency margin used
    // by stepDrone. Reject unreachable targets instead of stranding a drone.
    const required = (distance(drone.position,target)+distance(target,drone.home))/drone.speed+2;
    if (drone.battery < required) throw new RangeError('insufficient battery for scout and return');
    return {...drone,target:clone(target)};
  }
  if (command === 'camera') {
    if (drone.mode!=='scouting') throw new RangeError('camera requires scouting');
    return {...drone,camera:!drone.camera};
  }
  throw new RangeError('unknown drone command');
}
export function stepDrone(drone,seconds) {
  assertDrone(drone);
  if (!finite(seconds) || seconds<=0 || seconds>1) throw new RangeError('fixed step must be (0,1] seconds');
  if (drone.mode==='docked') return {...drone,battery:Math.min(drone.capacity,drone.battery+seconds*3)};
  // Movement consumes battery in simulated seconds: a depleted drone cannot
  // travel for free during the final fixed step (or after restoring a zero-charge save).
  const poweredSeconds=Math.min(seconds,drone.battery);
  const battery=Math.max(0,drone.battery-poweredSeconds);
  // Reserve enough charge to return from the current position; no magic battery refill.
  const reserve=distance(drone.position,drone.home)/drone.speed+2;
  const returning=drone.mode==='returning' || battery<=reserve;
  const target=returning?drone.home:drone.target;
  const position=approach(drone.position,target,drone.speed*poweredSeconds);
  const docked=returning && distance(position,drone.home)<1e-8;
  return {...drone,position,battery,mode:docked?'docked':returning?'returning':'scouting',
    target:clone(target),camera:!returning && drone.camera};
}
export function assertDrone(d) {
  if (!d || d.schema!==DRONE_SCHEMA || typeof d.id!=='string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(d.id) ||
    !point(d.home)||!point(d.position)||!point(d.target)||
    !['docked','scouting','returning'].includes(d.mode)||
    !finite(d.battery)||!finite(d.capacity)||d.capacity<=0||d.capacity>3600||
    d.battery<0||d.battery>d.capacity||
    !finite(d.speed)||d.speed<=0||d.speed>100||
    !finite(d.range)||d.range<=0||d.range>10000||
    typeof d.camera!=='boolean'||(d.mode!=='scouting'&&d.camera)) throw new TypeError('invalid drone state');
  return d;
}
export function serializeDrone(d) { assertDrone(d); return JSON.stringify(d); }
export function restoreDrone(json) {
  const raw=JSON.parse(json);
  assertDrone(raw);
  // Clone to prevent caller mutation of stored coordinates.
  return {...raw,home:clone(raw.home),position:clone(raw.position),target:clone(raw.target)};
}
