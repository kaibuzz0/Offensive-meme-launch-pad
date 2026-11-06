// Meme City: deterministic, engine-agnostic voxel edit journal.
// Coordinates are integer voxel indices (each voxel represents 0.25 world metres).
// This module does not mutate terrain generation or legacy player saves.
export const VOXEL_METRES = 0.25;
export const JOURNAL_VERSION = 1;
export const MAX_EDITS = 100_000;
const MAX_COORD = 2_000_000;
const MATERIAL = /^[a-z][a-z0-9_-]{0,31}$/;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);

function coordinate(value) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_COORD) {
    throw new RangeError('voxel coordinate must be a bounded safe integer');
  }
  return value;
}

export function voxelKey(x, y, z) {
  return [coordinate(x), coordinate(y), coordinate(z)].join(',');
}

function material(value) {
  if (value !== null && (typeof value !== 'string' || !MATERIAL.test(value) || RESERVED.has(value))) {
    throw new TypeError('material must be null or a safe material identifier');
  }
  return value;
}

function normalizedEdit(edit) {
  if (!edit || typeof edit !== 'object' || Array.isArray(edit)) throw new TypeError('invalid edit');
  const x = coordinate(edit.x);
  const y = coordinate(edit.y);
  const z = coordinate(edit.z);
  const block = material(edit.block);
  return { x, y, z, block };
}

function assertRevision(revision) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new RangeError('invalid revision');
  return revision;
}

export function createVoxelEditJournal(worldSeed, snapshot) {
  if (typeof worldSeed !== 'string' || !worldSeed || worldSeed.length > 128) {
    throw new TypeError('worldSeed must be a nonempty string up to 128 characters');
  }
  let revision = 0;
  const changes = new Map();
  if (snapshot !== undefined) {
    if (!snapshot || snapshot.version !== JOURNAL_VERSION || snapshot.worldSeed !== worldSeed ||
        !Array.isArray(snapshot.edits) || snapshot.edits.length > MAX_EDITS) {
      throw new Error('incompatible voxel edit snapshot');
    }
    revision = assertRevision(snapshot.revision);
    if (revision < snapshot.edits.length) throw new Error('snapshot revision is inconsistent');
    for (const raw of snapshot.edits) {
      const edit = normalizedEdit(raw);
      const key = voxelKey(edit.x, edit.y, edit.z);
      if (changes.has(key)) throw new Error('duplicate voxel in snapshot');
      changes.set(key, edit);
    }
  }

  return Object.freeze({
    get revision() { return revision; },
    get size() { return changes.size; },
    // undefined: unedited/generated terrain; null: intentionally mined air.
    get(x, y, z) { return changes.get(voxelKey(x, y, z))?.block; },
    has(x, y, z) { return changes.has(voxelKey(x, y, z)); },
    // Expected revision prevents stale concurrent clients from overwriting newer edits.
    apply(edit, expectedRevision = revision) {
      assertRevision(expectedRevision);
      if (expectedRevision !== revision) throw new Error('stale voxel edit revision');
      const next = normalizedEdit(edit);
      const key = voxelKey(next.x, next.y, next.z);
      if (!changes.has(key) && changes.size >= MAX_EDITS) throw new RangeError('voxel journal capacity reached');
      const previous = changes.get(key)?.block;
      if (changes.has(key) && previous === next.block) return { changed: false, revision, previous };
      const nextRevision = assertRevision(revision + 1);
      changes.set(key, next);
      revision = nextRevision;
      return { changed: true, revision, previous };
    },
    // Revert to procedural terrain without interpreting air as an unedited voxel.
    reset(x, y, z, expectedRevision = revision) {
      assertRevision(expectedRevision);
      if (expectedRevision !== revision) throw new Error('stale voxel edit revision');
      const key = voxelKey(x, y, z);
      if (!changes.has(key)) return { changed: false, revision };
      const nextRevision = assertRevision(revision + 1);
      changes.delete(key);
      revision = nextRevision;
      return { changed: true, revision };
    },
    snapshot() {
      return {
        version: JOURNAL_VERSION,
        worldSeed,
        revision,
        voxelMetres: VOXEL_METRES,
        edits: Array.from(changes.values(), edit => ({ ...edit }))
          .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z)
      };
    }
  });
}
