// Read-only legacy building migration preflight. Never delete or rewrite legacy keys.
// The old workbench has horizontal coordinates only; mapping to a 3D voxel requires
// the canonical terrain height/occupancy query, so this module does not guess Y.
export const LEGACY_BUILD_KEY = 'meme-city-road-build-v1:';
export const LEGACY_CRAFT_KEY = 'meme-city-road-craft-v1:';

export function inspectLegacyRoadBuild(storage, seed) {
  if (!storage || typeof storage.getItem !== 'function' ||
      typeof seed !== 'string' || !seed || seed.length > 128)
    throw new TypeError('invalid legacy migration input');
  const raw = storage.getItem(LEGACY_BUILD_KEY + seed);
  const craftRaw = storage.getItem(LEGACY_CRAFT_KEY + seed);
  if (raw === null && craftRaw === null) return Object.freeze({ status: 'absent' });
  if (raw === null) return Object.freeze({ status: 'quarantine', reason: 'orphan-craft' });
  let record;
  try { record = JSON.parse(raw); }
  catch { return Object.freeze({ status: 'quarantine', reason: 'invalid-json' }); }
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
      record.version !== 1 || record.seed !== seed || record.kind !== 'workbench' ||
      !Number.isSafeInteger(record.x) || !Number.isSafeInteger(record.z) ||
      Math.abs(record.x) >= 1000000 || Math.abs(record.z) >= 1000000)
    return Object.freeze({ status: 'quarantine', reason: 'unknown-workbench-schema' });
  if (craftRaw !== null && craftRaw !== 'torch-1')
    return Object.freeze({ status: 'quarantine', reason: 'unknown-craft-schema' });
  return Object.freeze({
    status: 'needs-terrain-mapping',
    workbench: Object.freeze({ x: record.x, z: record.z }),
    craftedTorch: craftRaw === 'torch-1'
  });
}
