// Renderer-neutral construction occupancy bridge. The committed journal is the
// sole authority; this index never spends supplies or writes a save.
// #43/#46 can pass hasBlock to their shared collision/placement queries.
import { projectCommittedConstruction } from './city-road-build-scene-projection.js';

export function createCommittedBuildOccupancy(expectedSeed) {
  if (typeof expectedSeed !== 'string' || !expectedSeed)
    throw new TypeError('construction seed required');
  let revision = -1;
  let cells = new Map();
  let committedIdentity = null;
  // Equal revisions must also match inventory and metadata, not only voxel cells.
  const canonical = value => Array.isArray(value) ? value.map(canonical) :
    value && typeof value === 'object' ?
      Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  const key = (x, y, z) => `${x},${y},${z}`;
  return Object.freeze({
    get revision() { return revision; },
    hasBlock(x, y, z) {
      if (![x, y, z].every(Number.isSafeInteger)) return false;
      return cells.has(key(x, y, z)) && cells.get(key(x, y, z)) !== null;
    },
    // A null edit explicitly removes generated terrain; absence means the
    // seeded generator still owns the cell. Collision callers must distinguish
    // these states rather than treating both as empty space.
    hasEdit(x, y, z) {
      if (![x, y, z].every(Number.isSafeInteger)) return false;
      return cells.has(key(x, y, z));
    },
    getEdit(x, y, z) {
      if (![x, y, z].every(Number.isSafeInteger)) return undefined;
      return cells.get(key(x, y, z));
    },
    // Resolve effective collision without confusing untouched seeded terrain
    // with an explicit mined-air edit. Unknown generator results fail closed.
    isSolid(x, y, z, generatedSolid) {
      if (![x, y, z].every(Number.isSafeInteger)) return true;
      const id = key(x, y, z);
      if (cells.has(id)) return cells.get(id) !== null;
      if (typeof generatedSolid !== 'function') return true;
      // A missing/unloaded chunk or failing generator must not become
      // traversable air. Retry after the terrain provider recovers.
      try {
        return generatedSolid(x, y, z) !== false;
      } catch {
        return true;
      }
    },
    getBlock(x, y, z) {
      if (![x, y, z].every(Number.isSafeInteger)) return null;
      return cells.get(key(x, y, z)) ?? null;
    },
    restore(record) {
      // Validate and construct a complete replacement before publishing it.
      // A malformed/stale record must never partially change collision.
      const projected = projectCommittedConstruction(record, expectedSeed);
      if (projected.revision < revision)
        throw new Error('stale construction occupancy revision');
      const identity = JSON.stringify(canonical(record));
      const next = new Map();
      for (const edit of projected.edits) {
        const id = key(edit.x, edit.y, edit.z);
        if (next.has(id)) throw new Error('duplicate construction voxel');
        next.set(id, edit.block);
      }
      if (projected.revision === revision &&
          (identity !== committedIdentity || next.size !== cells.size ||
           [...next].some(([id, block]) => cells.get(id) !== block)))
        throw new Error('conflicting construction occupancy revision');
      cells = next;
      committedIdentity = identity;
      revision = projected.revision;
      return revision;
    },
    clearPresentation() {
      // Renderer/context resets must restore from durable storage afterward.
      cells = new Map();
      committedIdentity = null;
      revision = -1;
    }
  });
}
