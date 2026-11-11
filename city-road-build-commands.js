// Solo construction command boundary: the durable record is the only authority.
// UI renders only the committed record returned here, never optimistic edits.
import { buildWorkbenchState } from './city-road-build-transaction.js';
import { salvageRoadSupplies } from './city-road-salvage-transaction.js';
import { validateBuildRecord } from './city-road-build-save-validation.js';

export function createSoloBuildCommands(store, key, resolveRoadCrate) {
  if (!store || typeof store.read !== 'function' ||
      typeof store.compareAndSwap !== 'function' ||
      typeof key !== 'string' || !key || key.length > 256)
    throw new TypeError('invalid durable build command store');
  // Capture coordinates before any asynchronous read or queued command yields.
  // Occupancy remains a live query; multiplayer must validate on the server.
  function capturePlacement(input) {
    if (!input || typeof input !== 'object') throw new TypeError('invalid placement');
    return {
      player: input.player && { x: input.player.x, y: input.player.y, z: input.player.z },
      position: input.position && { x: input.position.x, z: input.position.z },
      groundHeight: input.groundHeight,
      isOccupied: input.isOccupied
    };
  }
  // Serialize same-tab commands; IndexedDB CAS rejects stale cross-tab writes.
  let pending = Promise.resolve();
  function enqueue(command) {
    const result = pending.then(command);
    pending = result.catch(() => {});
    return result;
  }
  return Object.freeze({
    async read() {
      const record = await store.read(key);
      if (record !== null && record !== undefined) validateBuildRecord(record);
      // Do not expose the store-owned object to UI code: a mutable alias could
      // change inventory or edits without an atomic committed transaction.
      return record == null ? record : structuredClone(record);
    },
    collectRoadSupplies(player) {
      // The seeded-world resolver, not a caller-provided crate coordinate, owns
      // pickup identity. Capture player pose before queued asynchronous work.
      if (typeof resolveRoadCrate !== 'function')
        return Promise.reject(new Error('canonical road crate resolver required'));
      const captured = player && { x: player.x, y: player.y, z: player.z };
      return enqueue(async () => {
        const current = await store.read(key);
        if (!current) throw new Error('building record not initialized');
        validateBuildRecord(current);
        const crate = resolveRoadCrate(current.seed);
        if (!crate || typeof crate !== 'object') throw new Error('road crate unavailable');
        const next = salvageRoadSupplies(current, {
          player: captured,
          crate: { x: crate.x, y: crate.y, z: crate.z },
          expectedRevision: current.revision
        });
        // Reject malformed reducer output before it reaches durable storage.
        validateBuildRecord(next);
        const committed = await store.compareAndSwap(key, current.revision, next);
        if (committed !== true) throw new Error('building changed in another session; retry');
        return structuredClone(next);
      });
    },
    placeWorkbench(input) {
      const captured = capturePlacement(input);
      return enqueue(async () => {
        const current = await store.read(key);
        if (!current) throw new Error('building record not initialized');
        validateBuildRecord(current);
        // Never trust a revision or inventory supplied by a UI control.
        // Multiplayer must derive player pose and occupancy on the server.
        const next = buildWorkbenchState(current, {
          ...captured,
          kind: 'place-workbench',
          expectedRevision: current.revision
        });
        validateBuildRecord(next);
        const committed = await store.compareAndSwap(key, current.revision, next);
        if (committed !== true) throw new Error('building changed in another session; retry');
        // Return an isolated snapshot: adapters may retain the object passed to CAS.
        return structuredClone(next);
      });
    }
  });
}
