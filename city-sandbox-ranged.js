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
  if (!actor || typeof actor.id !== 'string' || !actor.id || typeof actor.team !== 'string') throw new TypeError('invalid actor');
  return actor;
}
function eligible(target, actor, friendlyFire) {
  return target.id !== actor.id && (friendlyFire || target.team !== actor.team);
}
function normal(direction) {
  const d = vec(direction, 'direction');
  const len = Math.hypot(d.x, d.y, d.z);
  if (len < EPS) throw new RangeError('direction cannot be zero');
  return { x: d.x / len, y: d.y / len, z: d.z / len };
}
// Ray-sphere intersection: first nonnegative surface intersection, including origin inside sphere.
export function simulateRayHit({ origin, direction, maxRange, actor, targets, friendlyFire = false }) {
  const o = vec(origin, 'origin'), d = normal(direction), range = positive(maxRange, 'maxRange', MAX_RANGE);
  validActor(actor);
  if (typeof friendlyFire !== 'boolean') throw new TypeError('friendlyFire must be boolean');
  let best = null;
  for (const t of targetsOf(targets)) {
    if (!eligible(t, actor, friendlyFire)) continue;
    const delta = { x: o.x - t.center.x, y: o.y - t.center.y, z: o.z - t.center.z };
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
    const distance = Math.sqrt(distanceSquared(c, t.center));
    const surfaceDistance = Math.max(0, distance - t.radius);
    if (surfaceDistance > r) return null;
    return { targetId: t.id, distance: surfaceDistance, intensity: Math.max(0, 1 - surfaceDistance / r) };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance || a.targetId.localeCompare(b.targetId, 'en'));
}
