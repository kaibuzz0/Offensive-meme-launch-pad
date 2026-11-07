// Durable building boundary: a single compare-and-swap record owns inventory and edits.
// The adapter must implement atomic CAS (IndexedDB readwrite transaction in Solo,
// authoritative database transaction in multiplayer). localStorage is NOT an atomic CAS.
import { buildWorkbenchState } from './city-road-build-transaction.js';

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
  // The pure reducer validates reach, occupancy, supplies and journal revision.
  const after = buildWorkbenchState(before, action);
  // CAS MUST compare the durable record revision and atomically replace the
  // entire record; no separate inventory and journal writes are permitted.
  const committed = await store.compareAndSwap(key, before.revision, after);
  if (committed !== true) throw new Error('building transaction conflict');
  return after;
}
