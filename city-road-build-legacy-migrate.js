// Non-destructive Solo migration coordinator. Call only after the canonical
// terrain and occupancy queries are ready; legacy localStorage is read-only.
// The caller must retain old saves and show quarantine status to the player.
import { inspectLegacyRoadBuild } from './city-road-build-legacy-preflight.js';
import { mapLegacyWorkbench } from './city-road-build-legacy-terrain-map.js';
import { activateLegacyWorkbench } from './city-road-build-legacy-activation.js';

export async function migrateLegacyRoadWorkbench({
  storage, seed, store, key, groundHeightAt, isOccupied
}) {
  if (typeof seed !== 'string' || !seed || typeof key !== 'string' || !key)
    throw new TypeError('world identity required');
  const preflight = inspectLegacyRoadBuild(storage, seed);
  if (preflight.status === 'absent' || preflight.status === 'quarantine')
    return preflight;
  let mapped;
  try { mapped = mapLegacyWorkbench(preflight, groundHeightAt, isOccupied); }
  catch (error) {
    return Object.freeze({ status: 'quarantine', reason: 'terrain-query-failed', detail: String(error.message) });
  }
  if (mapped.status !== 'mapped') return mapped;
  // A second occupancy check narrows the Solo race window. Multiplayer must
  // instead validate occupancy within the server-owned serialized world edit.
  const { x, y, z } = mapped.target;
  if (isOccupied(x, y, z) !== false)
    return Object.freeze({ status: 'quarantine', reason: 'occupied-target' });
  return activateLegacyWorkbench(store, key, mapped);
}
