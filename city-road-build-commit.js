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
  // Reducers must only receive a detached candidate. Some storage adapters
  // return a live object from read(); a rejected transition must never mutate it.
  const after = transition(structuredClone(before));
  validateBuildRecord(after);
  if (after.revision !== before.revision + 1)
    throw new Error('invalid staged ' + label + ' revision');

  // A single durable record contains both inventory and voxel edits.
  // The adapter must not retain a mutable reference to the candidate.
  const candidate = structuredClone(after);
  if (await store.compareAndSwap(key, before.revision, candidate) !== true)
    throw new Error(label + ' transaction conflict');
  const saved = await store.read(key);
  if (!saved) throw new Error(label + ' commit readback missing');
  validateBuildRecord(saved);
  if (JSON.stringify(canonical(saved)) !== JSON.stringify(canonical(after)))
    throw new Error(label + ' commit readback mismatch');
  return structuredClone(saved);
}

export function commitWorkbenchBuild(store, key, action) {
  // Snapshot untrusted pointer/pose values before the first asynchronous read.
  // Otherwise a caller can mutate the action while storage is pending and
  // change the target or reach check after the user initiated the placement.
  const captured = action && {
    kind: action.kind,
    expectedRevision: action.expectedRevision,
    player: action.player && {x: action.player.x, y: action.player.y, z: action.player.z},
    position: action.position && {x: action.position.x, z: action.position.z},
    groundHeight: action.groundHeight,
    isOccupied: action.isOccupied
  };
  return commitRoadTransaction(store, key, captured?.expectedRevision,
    before => buildWorkbenchState(before, captured), 'building');
}

// The crate must come from the canonical seeded world and player pose must be
// resolved by the authoritative controller/server, never trusted from a client.
export function commitRoadSalvage(store, key, action) {
  // Capture the authoritative pose and seeded crate before any asynchronous
  // store read; mutable caller objects must not retarget a pending pickup.
  const captured = action && {
    expectedRevision: action.expectedRevision,
    player: action.player && { x: action.player.x, y: action.player.y, z: action.player.z },
    crate: action.crate && { x: action.crate.x, y: action.crate.y, z: action.crate.z }
  };
  return commitRoadTransaction(store, key, captured?.expectedRevision,
    before => salvageRoadSupplies(before, captured), 'salvage');
}
