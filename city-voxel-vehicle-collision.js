/** Canonical seeded-world occupancy for ground vehicles.
 * Coordinates and dimensions use the voxel world's logical units, not rendered LOD.
 * This adapter is deliberately independent of WebGL and vehicle simulation.
 */
export function createVoxelVehicleCollision(world, options = {}) {
  if (typeof world?.surfaceAt !== 'function' || typeof world?.gateRoad?.obstructs !== 'function')
    throw new TypeError('Canonical world surface and structure collision are required');
  const radius = options.radius ?? 1.2;
  const halfLength = options.halfLength ?? 2.4;
  const height = options.height ?? 2.2;
  const maxStep = options.maxStep ?? 1;
  for (const [name, value] of Object.entries({radius, halfLength, height, maxStep})) {
    if (!Number.isFinite(value) || (name === 'maxStep' ? value < 0 : value <= 0))
      throw new RangeError(name + ' must be finite and positive (maxStep may be zero)');
  }
  // The edit ledger may supply committed, authoritative solid-voxel queries.
  // Never inspect renderer meshes or uncommitted placement previews.
  // Default to the same committed-edit query consumed by player physics.
  // An explicit override remains available for tests and server authority.
  const editObstructs = options.editObstructs ?? world.editObstructs;
  if (editObstructs !== undefined && typeof editObstructs !== 'function')
    throw new TypeError('editObstructs must be a function');
  // Sample the oriented chassis rather than a circular center-only footprint.
  const footprint = [[0,0],[-halfLength,0],[halfLength,0],
    [-halfLength,-radius],[-halfLength,radius],[halfLength,-radius],[halfLength,radius],
    [0,-radius],[0,radius]];
  function canOccupy(position, vehicle) {
    if (![position?.x,position?.y,position?.z,vehicle?.heading].every(Number.isFinite))
      return false;
    const sin = Math.sin(vehicle.heading), cos = Math.cos(vehicle.heading);
    let low = Infinity, high = -Infinity;
    for (const [forward, side] of footprint) {
      const x = position.x + forward*sin + side*cos;
      const z = position.z + forward*cos - side*sin;
      const column = world.surfaceAt(Math.floor(x), Math.floor(z));
      if (!column || !Number.isFinite(column.height)) return false;
      const floor = column.height + 1;
      low = Math.min(low, floor); high = Math.max(high, floor);
      if (Math.abs(floor - position.y) > maxStep) return false;
      if (world.gateRoad.obstructs(x, position.y, z, height, radius * 0.25)) return false;
      if (editObstructs) {
        const blocked = editObstructs(x, position.y, z, height, radius * 0.25);
        if (typeof blocked !== 'boolean')
          throw new TypeError('editObstructs must return a boolean');
        if (blocked) return false;
      }
      const gallery = world.caveRoomAt?.(Math.floor(x), Math.floor(z));
      if (gallery && !gallery.exposed && position.y < gallery.ceiling &&
          position.y + height > gallery.ceiling) return false;
    }
    return high - low <= maxStep;
  }
  return Object.freeze({canOccupy, requireCollision:true});
}
