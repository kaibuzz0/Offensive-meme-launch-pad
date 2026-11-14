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


// A deterministic renderer reconciliation plan. This is presentation-only:
// the ledger remains authoritative, and repeated snapshots spend nothing.
export function diffCommittedConstruction(previous, next, expectedSeed) {
  const current = projectCommittedConstruction(next, expectedSeed);
  const prior = previous === null || previous === undefined
    ? null : projectCommittedConstruction(previous, expectedSeed);
  if (prior && current.revision < prior.revision)
    throw new Error('stale construction revision');
  // Same revision must identify the same committed state. Otherwise two tabs or
  // stale renderer callbacks could silently display divergent inventory/geometry.
  if (prior && current.revision === prior.revision &&
      (current.supplies !== prior.supplies ||
       current.edits.length !== prior.edits.length ||
       current.edits.some((edit, index) =>
         edit.id !== prior.edits[index].id || edit.block !== prior.edits[index].block)))
    throw new Error('conflicting construction snapshot at equal revision');
  const oldEdits = new Map((prior?.edits ?? []).map(edit => [edit.id, edit]));
  const newEdits = new Map(current.edits.map(edit => [edit.id, edit]));
  const remove = [...oldEdits.values()].filter(edit => !newEdits.has(edit.id));
  const upsert = current.edits.filter(edit => {
    const old = oldEdits.get(edit.id);
    return !old || old.block !== edit.block;
  });
  return Object.freeze({
    seed: current.seed,
    revision: current.revision,
    supplies: current.supplies,
    remove: Object.freeze(remove),
    upsert: Object.freeze(upsert)
  });
}
