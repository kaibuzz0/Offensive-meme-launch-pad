// Read-only bridge from the durable construction record to a renderer's scene.
// Renderers must consume this projection after commit/restore, never debit supplies.
import { validateBuildRecord } from './city-road-build-save-validation.js';
import { VOXEL_METRES } from './city-sandbox-mining.js';

export function projectCommittedConstruction(record, expectedSeed) {
  validateBuildRecord(record);
  if (typeof expectedSeed !== 'string' || record.seed !== expectedSeed)
    throw new Error('construction seed mismatch');
  const edits = record.journal.edits.map(({ x, y, z, block }) => Object.freeze({
    id: `edit:${record.seed}:${x},${y},${z}`,
    x, y, z, block,
    worldX: x * VOXEL_METRES,
    worldY: y * VOXEL_METRES,
    worldZ: z * VOXEL_METRES
  }));
  return Object.freeze({
    seed: record.seed,
    revision: record.revision,
    supplies: record.inventory.supplies,
    edits: Object.freeze(edits)
  });
}
