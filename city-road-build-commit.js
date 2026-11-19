// Durable building boundary: a single compare-and-swap record owns inventory and edits.
// The adapter must implement atomic CAS (IndexedDB readwrite transaction in Solo,
// authoritative database transaction in multiplayer). localStorage is NOT an atomic CAS.
import { buildWorkbenchState } from './city-road-build-transaction.js';
import { validateBuildRecord } from './city-road-build-save-validation.js';

export async function commitWorkbenchBuild(store, key, action) {
  if (!store || typeof store.read !== 'function' || typeof store.compareAndSwap !== 'function')
    throw new TypeError('atomic building store required');
  if (typeof key !== 'string' || !key || key.length > 256)
    throw new TypeError('invalid building record key');
  if (!action || !Number.isSafeInteger(action.expectedRevision) || action.expectedRevision < 0)
    throw new TypeError('invalid building action revision');

  const before = await store.read(key);
  if (!before || before.revision !== action.expectedRevision)
    throw new Error('stale building action');
  // Reject corrupt snapshots even if a future storage adapter skips read validation.
  validateBuildRecord(before);
  // The pure reducer validates reach, occupancy, supplies and journal revision.
  const after = buildWorkbenchState(before, action);
  validateBuildRecord(after);
  // CAS MUST compare the durable record revision and atomically replace the
  // entire record; no separate inventory and journal writes are permitted.
  const committed = await store.compareAndSwap(key, before.revision, after);
  if (committed !== true) throw new Error('building transaction conflict');
  // Do not report a build as saved on a CAS acknowledgement alone. Read back
  // the durable winner before the caller projects geometry or inventory.
  const saved = await store.read(key);
  if (!saved) throw new Error('building commit readback missing');
  validateBuildRecord(saved);
  // Some storage adapters reorder object keys. Compare canonical content,
  // including supplies and voxel edits, rather than only the revision.
  const canonical = value => Array.isArray(value) ? value.map(canonical) :
    value && typeof value === 'object' ? Object.fromEntries(
      Object.keys(value).sort().map(name => [name, canonical(value[name])])) : value;
  if (JSON.stringify(canonical(saved)) !== JSON.stringify(canonical(after)))
    throw new Error('building commit readback mismatch');
  return structuredClone(saved);
}
