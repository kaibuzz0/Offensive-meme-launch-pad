// Pure, engine-independent fictional combat hit simulation.
// All coordinates and distances are in game-world metres. No rendering or world writes.
const MAX_TARGETS = 512;
const MAX_RANGE = 512;
const MAX_RADIUS = 64;
const EPS = 1e-9;
function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(name + ' must be finite');
  return value;
}
function vec(v, name) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new TypeError(name + ' must be a vector');
  return { x: finite(v.x, name + '.x'), y: finite(v.y, name + '.y'), z: finite(v.z, name + '.z') };
}
function positive(value, name, max) {
  finite(value, name);
  if (value <= 0 || value > max) throw new RangeError(name + ' outside supported bounds');
  return value;
}
function targetsOf(targets) {
  if (!Array.isArray(targets) || targets.length > MAX_TARGETS) throw new RangeError('invalid target list');
  const seen = new Set();
  return targets.map(t => {
    if (!t || typeof t.id !== 'string' || !t.id || t.id.length > 128 || seen.has(t.id)) throw new TypeError('invalid or duplicate target id');
    seen.add(t.id);
    if (typeof t.team !== 'string' || t.team.length > 64) throw new TypeError('invalid team');
    return { id: t.id, team: t.team, center: vec(t.center, 'target.center'), radius: positive(t.radius, 'target.radius', 128) };
  });
}
function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}
function validActor(actor) {
  if (!actor || typeof actor.id !== 'string' || !actor.id || actor.id.length > 128 ||
      typeof actor.team !== 'string' || actor.team.length > 64) throw new TypeError('invalid actor');
  return actor;
}
function eligible(target, actor, friendlyFire) {
  return target.id !== actor.id && (friendlyFire || target.team !== actor.team);
}
function normal(direction) {
  const d = vec(direction, 'direction');
  // Scale before taking the norm: hypot(1e308, 1e308) overflows to
  // Infinity even though the finite direction is mathematically valid.
  const scale = Math.max(Math.abs(d.x), Math.abs(d.y), Math.abs(d.z));
  if (scale === 0) throw new RangeError('direction cannot be zero');
  const x = d.x / scale, y = d.y / scale, z = d.z / scale;
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
}
// Ray-sphere intersection: first nonnegative surface intersection, including origin inside sphere.
export function simulateRayHit({ origin, direction, maxRange, actor, targets, friendlyFire = false }) {
  const o = vec(origin, 'origin'), d = normal(direction), range = positive(maxRange, 'maxRange', MAX_RANGE);
  validActor(actor);
  if (typeof friendlyFire !== 'boolean') throw new TypeError('friendlyFire must be boolean');
  let best = null;
  for (const t of targetsOf(targets)) {
    if (!eligible(t, actor, friendlyFire)) continue;
    // A target farther than range + radius on any axis cannot intersect.
    // Reject before squaring enormous world-space deltas, which can overflow
    // and produce NaN discriminants even for otherwise finite inputs.
    const dx = o.x - t.center.x, dy = o.y - t.center.y, dz = o.z - t.center.z;
    const bound = range + t.radius;
    if (Math.abs(dx) > bound || Math.abs(dy) > bound || Math.abs(dz) > bound) continue;
    const delta = { x: dx, y: dy, z: dz };
    const b = delta.x * d.x + delta.y * d.y + delta.z * d.z;
    const c = distanceSquared(o, t.center) - t.radius ** 2;
    const disc = b * b - c;
    if (disc < 0) continue;
    const entry = -b - Math.sqrt(disc);
    const exit = -b + Math.sqrt(disc);
    if (exit < 0) continue;
    const distance = Math.max(0, entry);
    if (distance > range) continue;
    if (!best || distance < best.distance - EPS || (Math.abs(distance - best.distance) <= EPS && t.id < best.targetId)) {
      best = { targetId: t.id, distance, point: { x: o.x + d.x * distance, y: o.y + d.y * distance, z: o.z + d.z * distance } };
    }
  }
  return best;
}
// AoE returns potential hits, NOT authorized damage or voxel edits. The authoritative
// game server must validate origin, ownership, occlusion and damage before applying effects.
export function simulateAreaHits({ center, radius, actor, targets, friendlyFire = false }) {
  const c = vec(center, 'center'), r = positive(radius, 'radius', MAX_RADIUS);
  validActor(actor);
  if (typeof friendlyFire !== 'boolean') throw new TypeError('friendlyFire must be boolean');
  return targetsOf(targets).filter(t => eligible(t, actor, friendlyFire)).map(t => {
    // Reject outside the sphere-expanded axis bounds before computing a
    // distance. This bounds expensive hypot calls in crowded/distant scenes.
    const dx = c.x - t.center.x, dy = c.y - t.center.y, dz = c.z - t.center.z;
    const bound = r + t.radius;
    if (Math.abs(dx) > bound || Math.abs(dy) > bound || Math.abs(dz) > bound) return null;
    // hypot avoids squaring large finite world-space deltas into Infinity.
    const distance = Math.hypot(dx, dy, dz);
    const surfaceDistance = Math.max(0, distance - t.radius);
    if (surfaceDistance > r) return null;
    return { targetId: t.id, distance: surfaceDistance, intensity: Math.max(0, 1 - surfaceDistance / r) };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance || (a.targetId < b.targetId ? -1 : a.targetId > b.targetId ? 1 : 0));
}
