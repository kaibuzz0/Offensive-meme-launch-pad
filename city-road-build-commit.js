// Durable shared roadside transaction boundary for Solo and server-authoritative play.
// Store.compareAndSwap MUST atomically compare revision and replace the entire record.
// localStorage read/write is not a valid CAS adapter.
import { buildWorkbenchState } from './city-road-build-transaction.js';
import { salvageRoadSupplies } from './city-road-salvage-transaction.js';
import { validateBuildRecord } from './city-road-build-save-validation.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

async function commitRoadTransaction(store, key, expectedRevision, transition, label) {
  if (!store || typeof store.read !== 'function' || typeof store.compareAndSwap !== 'function')
    throw new TypeError('atomic building store required');
  if (typeof key !== 'string' || !key || key.length > 256)
    throw new TypeError('invalid building record key');
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
    throw new TypeError('invalid building action revision');

  const before = await store.read(key);
  if (!before || before.revision !== expectedRevision) throw new Error('stale ' + label + ' action');
  validateBuildRecord(before);
  const after = transition(before);
  validateBuildRecord(after);
  if (after.revision !== before.revision + 1)
    throw new Error('invalid staged ' + label + ' revision');

  // A single durable record contains both inventory and voxel edits.
  if (await store.compareAndSwap(key, before.revision, after) !== true)
    throw new Error(label + ' transaction conflict');
  const saved = await store.read(key);
  if (!saved) throw new Error(label + ' commit readback missing');
  validateBuildRecord(saved);
  if (JSON.stringify(canonical(saved)) !== JSON.stringify(canonical(after)))
    throw new Error(label + ' commit readback mismatch');
  return structuredClone(saved);
}

export function commitWorkbenchBuild(store, key, action) {
  return commitRoadTransaction(store, key, action?.expectedRevision,
    before => buildWorkbenchState(before, action), 'building');
}

// The crate must come from the canonical seeded world and player pose must be
// resolved by the authoritative controller/server, never trusted from a client.
export function commitRoadSalvage(store, key, action) {
  return commitRoadTransaction(store, key, action?.expectedRevision,
    before => salvageRoadSupplies(before, action), 'salvage');
}
