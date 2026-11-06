/** Dependency-free, deterministic arcade flight simulation (metres, seconds). */
export const FLIGHT_DEFAULTS = Object.freeze({
  mass: 850, wingArea: 16, liftSlope: 4.2, dragBase: 0.035,
  inducedDrag: 0.055, airDensity: 1.225, maxThrust: 2800,
  gravity: 9.81, stallSpeed: 17, maxSpeed: 105,
  groundY: 0, ceilingY: 3000, maxStep: 1 / 60,
  pitchRate: 0.65, yawRate: 0.35, rollRate: 0.95,
});
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export function createAircraftState(overrides = {}) {
  const p = overrides.position || {};
  return {
    position: { x: finite(p.x), y: finite(p.y), z: finite(p.z) },
    speed: Math.max(0, finite(overrides.speed)),
    heading: wrap(finite(overrides.heading)),
    pitch: clamp(finite(overrides.pitch), -1.3, 1.3),
    roll: wrap(finite(overrides.roll)),
    verticalSpeed: finite(overrides.verticalSpeed),
    grounded: overrides.grounded !== false,
    elapsed: Math.max(0, finite(overrides.elapsed)),
  };
}
/** Controls: throttle/brake [0,1], pitch/yaw/roll [-1,1].
 * Optional terrainHeightAt(x,z) samples ground elevation in the same metre units.
 * The returned state is new; the caller's state is never mutated.
 */
export function stepAircraft(state, controls = {}, dt = 1 / 60, options = {}) {
  if (!Number.isFinite(dt) || dt < 0 || dt > 2) throw new RangeError('invalid aircraft timestep');
  const cfg = { ...FLIGHT_DEFAULTS, ...options };
  if (!(cfg.mass > 0 && cfg.maxStep > 0 && cfg.wingArea > 0 && cfg.ceilingY > cfg.groundY))
    throw new RangeError('invalid aircraft configuration');
  const c = {
    throttle: clamp(finite(controls.throttle), 0, 1),
    pitch: clamp(finite(controls.pitch), -1, 1),
    yaw: clamp(finite(controls.yaw), -1, 1),
    roll: clamp(finite(controls.roll), -1, 1),
    brake: clamp(finite(controls.brake), 0, 1),
  };
  if (options.terrainHeightAt != null && typeof options.terrainHeightAt !== 'function')
    throw new TypeError('terrainHeightAt must be a function');
  const groundAt = (x, z) => {
    const y = options.terrainHeightAt ? options.terrainHeightAt(x, z) : cfg.groundY;
    if (!Number.isFinite(y) || y >= cfg.ceilingY) throw new RangeError('invalid terrain elevation');
    return y;
  };
  const next = createAircraftState(state);
  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(cfg.maxStep, remaining);
    remaining -= h;
    next.pitch = clamp(next.pitch + c.pitch * cfg.pitchRate * h, -0.75, 0.75);
    next.roll = clamp(wrap(next.roll + c.roll * cfg.rollRate * h), -1.2, 1.2);
    next.heading = wrap(next.heading + (c.yaw * cfg.yawRate + Math.sin(next.roll) * 0.28) * h);
    const v = next.speed;
    const liftCoeff = clamp(cfg.liftSlope * next.pitch + 0.26, -1.1, 1.6);
    const q = 0.5 * cfg.airDensity * v * v * cfg.wingArea;
    const lift = q * liftCoeff * Math.cos(next.roll);
    const drag = q * (cfg.dragBase + cfg.inducedDrag * liftCoeff * liftCoeff);
    const rollingDrag = next.grounded ? (0.13 + c.brake * 0.7) * cfg.mass * cfg.gravity : 0;
    const acceleration = (cfg.maxThrust * c.throttle - drag - rollingDrag) / cfg.mass
      - (next.grounded ? 0 : cfg.gravity * Math.sin(next.pitch));
    next.speed = clamp(v + acceleration * h, 0, cfg.maxSpeed);
    const airborne = !next.grounded ||
      (next.speed >= cfg.stallSpeed && lift > cfg.mass * cfg.gravity && next.pitch > 0);
    if (airborne) {
      next.grounded = false;
      next.verticalSpeed = clamp(next.verticalSpeed + (lift / cfg.mass - cfg.gravity) * h, -65, 65);
      next.position.y += next.verticalSpeed * h;
    }
    // Resolve ground contact after horizontal motion: hills and runways
    // must use the aircraft's destination position, not its previous cell.
    if (next.position.y >= cfg.ceilingY) {
      next.position.y = cfg.ceilingY;
      next.verticalSpeed = Math.min(0, next.verticalSpeed);
    }
    const horizontal = next.speed * Math.cos(next.pitch) * h;
    next.position.x += Math.sin(next.heading) * horizontal;
    next.position.z += Math.cos(next.heading) * horizontal;
    const ground = groundAt(next.position.x, next.position.z);
    if (next.grounded || next.position.y <= ground) {
      next.position.y = ground;
      next.verticalSpeed = 0;
      next.grounded = true;
    }
    next.elapsed += h;
  }
  return next;
}
export function serializeAircraft(state) {
  return JSON.stringify({ version: 1, ...createAircraftState(state) });
}
export function restoreAircraft(serialized) {
  const parsed = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  if (!parsed || parsed.version !== 1) throw new Error('unsupported aircraft save version');
  return createAircraftState(parsed);
}
