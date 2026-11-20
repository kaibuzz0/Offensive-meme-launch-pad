/** Dependency-free deterministic arcade vehicle state; positions in world meters. */
export const VEHICLE_SAVE_VERSION = 1;
export const VEHICLE_PRESETS = Object.freeze({
  car: Object.freeze({wheelbase:2.6,maxSpeed:32,acceleration:7,braking:12,drag:0.018,rolling:0.8,steering:0.5,fuelCapacity:50}),
  truck: Object.freeze({wheelbase:3.7,maxSpeed:24,acceleration:4.2,braking:9,drag:0.024,rolling:1.1,steering:0.42,fuelCapacity:95})
});
const finite = (n,name) => {if(!Number.isFinite(n)) throw new TypeError(name+' must be finite'); return n;};
const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
const angle = a => Math.atan2(Math.sin(a),Math.cos(a));
export function createVehicle(type='car',position={x:0,y:0,z:0}){
  if(!Object.hasOwn(VEHICLE_PRESETS,type)) throw new RangeError('Unknown vehicle type');
  return {version:VEHICLE_SAVE_VERSION,type,position:{x:finite(position.x,'x'),y:finite(position.y,'y'),z:finite(position.z,'z')},heading:0,speed:0,fuel:VEHICLE_PRESETS[type].fuelCapacity,health:100,driverId:null};
}
export function loadVehicle(record){
  const d=typeof record==='string'?JSON.parse(record):record;
  if(!d||d.version!==VEHICLE_SAVE_VERSION||!Object.hasOwn(VEHICLE_PRESETS,d.type)) throw new RangeError('Unsupported vehicle save');
  const v=createVehicle(d.type,d.position),cfg=VEHICLE_PRESETS[v.type];
  v.heading=angle(finite(d.heading,'heading'));
  v.speed=clamp(finite(d.speed,'speed'),-cfg.maxSpeed*.35,cfg.maxSpeed);
  v.fuel=clamp(finite(d.fuel,'fuel'),0,cfg.fuelCapacity);
  v.health=clamp(finite(d.health,'health'),0,100);
  if(d.driverId!==null&&(typeof d.driverId!=='string'||d.driverId.length>128)) throw new TypeError('Invalid driverId');
  v.driverId=d.driverId;
  return v;
}
export function saveVehicle(vehicle){return JSON.stringify(loadVehicle(vehicle));}
/** Pure fixed-step transition; canOccupy(position, vehicle) is supplied by the world collision adapter. */
export function stepVehicle(vehicle,controls={},dt=1/60,environment={}){
  finite(dt,'dt');
  if(dt<=0||dt>0.1) throw new RangeError('dt must be in (0, 0.1]');
  const v=loadVehicle(vehicle),cfg=VEHICLE_PRESETS[v.type];
  const throttle=clamp(finite(controls.throttle??0,'throttle'),-1,1);
  const brake=clamp(finite(controls.brake??0,'brake'),0,1);
  const steer=clamp(finite(controls.steering??0,'steering'),-1,1);
  const active=v.health>0&&v.fuel>0;
  const drag=cfg.drag*v.speed*Math.abs(v.speed)+cfg.rolling*Math.sign(v.speed);
  let speed=v.speed+((active?throttle*cfg.acceleration:0)-drag-brake*cfg.braking*Math.sign(v.speed))*dt;
  if(Math.sign(speed)!==Math.sign(v.speed)&&throttle===0) speed=0;
  if(Math.abs(speed)<0.02&&throttle===0) speed=0;
  speed=clamp(speed,-cfg.maxSpeed*.35,cfg.maxSpeed);
  const heading=angle(v.heading+Math.tan(steer*cfg.steering)*speed/cfg.wheelbase*dt);
  const candidate={x:v.position.x+Math.sin(heading)*speed*dt,y:v.position.y,z:v.position.z+Math.cos(heading)*speed*dt};
  // Sweep the same quarter-meter spatial resolution as player movement.
  // Endpoint-only checks could tunnel a fast vehicle through a thin wall.
  // Keep the last safe position and stop at the first blocked sample.
  if(environment.canOccupy !== undefined){
    if(typeof environment.canOccupy!=='function') throw new TypeError('canOccupy must be a function');
    const distance=Math.hypot(candidate.x-v.position.x,candidate.z-v.position.z);
    const segments=Math.max(1,Math.ceil(distance/0.25));
    const origin=v.position;
    let blocked=false;
    // The collision adapter must see the proposed orientation, not the old one.
    // A blocked initial sweep must not rotate the vehicle into an obstacle.
    const previousHeading=v.heading;
    v.heading=heading;
    // Test the proposed footprint at the current location before translating.
    // Otherwise a steering change can rotate a vehicle into an adjacent wall.
    const originPermitted=environment.canOccupy(origin,v);
    if(typeof originPermitted!=='boolean') throw new TypeError('canOccupy must return a boolean');
    if(!originPermitted){
      v.heading=previousHeading;
      v.speed=0;
      return v;
    }
    for(let i=1;i<=segments;i++){
      const t=i/segments;
      const sample={x:origin.x+(candidate.x-origin.x)*t,y:origin.y,z:origin.z+(candidate.z-origin.z)*t};
      // A malformed world adapter must never silently permit travel.
      const permitted=environment.canOccupy(sample,v);
      if(typeof permitted!=='boolean') throw new TypeError('canOccupy must return a boolean');
      if(!permitted){blocked=true;break;}
      v.position=sample;
    }
    if(blocked){
      speed=0;
      if(v.position===origin) v.heading=previousHeading;
    }
  }else {v.position=candidate;v.heading=heading;}
  v.speed=speed;
  if(active) v.fuel=Math.max(0,v.fuel-Math.abs(throttle)*dt*.002);
  return v;
}
