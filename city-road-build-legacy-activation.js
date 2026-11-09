// Solo-only activation of a validated legacy workbench into the durable journal.
// The caller must first inspect and terrain-map the untouched localStorage record.
// Never delete the original keys: quarantine remains recoverable.
import { validateBuildRecord } from './city-road-build-save-validation.js';
import { prepareLegacyWorkbenchImport } from './city-road-build-legacy-import.js';

export async function activateLegacyWorkbench(store, key, mapped, expectedSeed = null) {
  if (!store || typeof store.read !== 'function' ||
      typeof store.compareAndSwap !== 'function' ||
      typeof key !== 'string' || !key || key.length > 256)
    throw new TypeError('durable build store required');
  const current = await store.read(key);
  if (!current) return Object.freeze({ status: 'missing-canonical-record' });
  validateBuildRecord(current);
  // A storage key is not proof of world identity. Never migrate a legacy
  // structure into a different seeded world even when its record is empty.
  if (expectedSeed !== null && current.seed !== expectedSeed)
    return Object.freeze({ status: 'quarantine', reason: 'world-seed-mismatch' });
  // The pure importer refuses active journals, crafted torches and invalid mapping.
  // Treat these as quarantine rather than rewriting any existing player progress.
  let next;
  try { next = prepareLegacyWorkbenchImport(current, mapped); }
  catch (error) {
    return Object.freeze({ status: 'quarantine', reason: error.message });
  }
  // CAS is the sole activation point. A competing edit cannot be overwritten.
  const committed = await store.compareAndSwap(key, current.revision, next);
  if (!committed) return Object.freeze({ status: 'revision-conflict' });
  const saved = await store.read(key);
  if (!saved || saved.seed !== next.seed || saved.version !== next.version ||
      saved.revision !== next.revision ||
      JSON.stringify(saved.inventory) !== JSON.stringify(next.inventory) ||
      JSON.stringify(saved.journal) !== JSON.stringify(next.journal))
    throw new Error('legacy activation readback mismatch');
  return Object.freeze({ status: 'activated', revision: saved.revision });
}
