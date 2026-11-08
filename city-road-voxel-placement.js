// Bridge roadside world coordinates to the canonical quarter-metre voxel journal.
// Does not spend resources or save independently; the integration owner must
// commit the inventory debit and edit snapshot together in one state record.
import { VOXEL_METRES } from './city-sandbox-mining.js';

const MAX_VOXEL = 2_000_000;
function index(metres) {
  if (!Number.isFinite(metres)) throw new RangeError('non-finite world position');
  const value = Math.floor(metres / VOXEL_METRES);
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_VOXEL)
    throw new RangeError('world position exceeds journal bounds');
  return value;
}

// World x/z are horizontal; journal y is vertical. Do not confuse the
// road's horizontal z with a voxel's vertical coordinate.
export function roadWorkbenchVoxel(position, groundHeight) {
  if (!position || typeof position !== 'object') throw new TypeError('position required');
  // Reject strings: `groundHeight + VOXEL_METRES` would concatenate rather
  // than add, silently moving the workbench to a different elevation.
  if (typeof groundHeight !== 'number' || !Number.isFinite(groundHeight))
    throw new RangeError('invalid ground height');
  return Object.freeze({
    x: index(position.x),
    y: index(groundHeight + VOXEL_METRES),
    z: index(position.z)
  });
}

export function placeRoadWorkbenchVoxel(journal, position, groundHeight, expectedRevision) {
  if (!journal || typeof journal.apply !== 'function') throw new TypeError('journal required');
  const target = roadWorkbenchVoxel(position, groundHeight);
  // Callers must verify reach, occupancy, and available inventory first.
  // A stale revision is rejected by the canonical journal.
  const result = journal.apply({ ...target, block: 'workbench' }, expectedRevision);
  return { ...result, target };
}
