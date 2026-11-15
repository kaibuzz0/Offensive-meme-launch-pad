// Renderer-neutral construction occupancy bridge. The committed journal is the
// sole authority; this index never spends supplies or writes a save.
// #43/#46 can pass hasBlock to their shared collision/placement queries.
import { projectCommittedConstruction } from './city-road-build-scene-projection.js';

export function createCommittedBuildOccupancy(expectedSeed) {
  if (typeof expectedSeed !== 'string' || !expectedSeed)
    throw new TypeError('construction seed required');
  let revision = -1;
  let cells = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  return Object.freeze({
    get revision() { return revision; },
    hasBlock(x, y, z) {
      if (![x, y, z].every(Number.isSafeInteger)) return false;
      return cells.has(key(x, y, z)) && cells.get(key(x, y, z)) !== null;
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
      const next = new Map();
      for (const edit of projected.edits) {
        const id = key(edit.x, edit.y, edit.z);
        if (next.has(id)) throw new Error('duplicate construction voxel');
        next.set(id, edit.block);
      }
      if (projected.revision === revision &&
          (next.size !== cells.size ||
           [...next].some(([id, block]) => cells.get(id) !== block)))
        throw new Error('conflicting construction occupancy revision');
      cells = next;
      revision = projected.revision;
      return revision;
    },
    clearPresentation() {
      // Renderer/context resets must restore from durable storage afterward.
      cells = new Map();
      revision = -1;
    }
  });
}
