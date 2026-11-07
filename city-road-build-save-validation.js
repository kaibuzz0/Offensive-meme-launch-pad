// Validate complete Solo building records before they enter or leave durable storage.
// Preserve incompatible legacy saves rather than coercing or overwriting them.
import { createVoxelEditJournal, VOXEL_METRES } from './city-sandbox-mining.js';
import { BUILD_STATE_VERSION } from './city-road-build-transaction.js';

export function validateBuildRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
      record.version !== BUILD_STATE_VERSION ||
      typeof record.seed !== 'string' || !record.seed || record.seed.length > 128 ||
      !Number.isSafeInteger(record.revision) || record.revision < 0 ||
      !record.inventory || typeof record.inventory !== 'object' ||
      !Number.isSafeInteger(record.inventory.supplies) || record.inventory.supplies < 0)
    throw new Error('invalid durable building record');
  // A record from another voxel scale cannot be safely replayed into this world.
  // Reject it without altering the original save; migration must be explicit.
  if (!record.journal || record.journal.voxelMetres !== VOXEL_METRES)
    throw new Error('durable voxel scale mismatch');
  const journal = createVoxelEditJournal(record.seed, record.journal);
  if (journal.revision !== record.revision)
    throw new Error('durable inventory/journal revision mismatch');
  return record;
}
