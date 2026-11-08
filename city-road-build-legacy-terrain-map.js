// Read-only mapping of validated legacy horizontal workbench coordinates.
// Does not spend supplies, mutate storage, or activate a migrated save.
// Integration must validate occupancy and commit a copied record separately.
import { roadWorkbenchVoxel } from './city-road-voxel-placement.js';

export function mapLegacyWorkbench(preflight, groundHeightAt, isOccupied) {
  if (!preflight || preflight.status !== 'needs-terrain-mapping' ||
      !preflight.workbench || typeof groundHeightAt !== 'function' ||
      typeof isOccupied !== 'function')
    throw new TypeError('validated legacy preflight and world queries required');
  const { x, z } = preflight.workbench;
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z))
    throw new RangeError('invalid legacy workbench position');
  const height = groundHeightAt(x, z);
  const target = roadWorkbenchVoxel({ x, z }, height);
  // A journal edit may already occupy the cell. Never overwrite it.
  if (isOccupied(target.x, target.y, target.z) !== false)
    return Object.freeze({ status: 'quarantine', reason: 'occupied-target' });
  return Object.freeze({
    status: 'mapped',
    target,
    craftedTorch: preflight.craftedTorch === true
  });
}
