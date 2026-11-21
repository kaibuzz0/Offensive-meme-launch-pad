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
        (snapshot.voxelMetres !== undefined && snapshot.voxelMetres !== VOXEL_METRES) ||
        !Array.isArray(snapshot.edits) || snapshot.edits.length > MAX_EDITS) {
      throw new Error('incompatible voxel edit snapshot');
    }
    revision = assertRevision(snapshot.revision);
    // A single committed batch may contain up to 256 cells but advances one revision.
    // Reject snapshots containing more distinct cells than their revisions could commit.
    if (Math.ceil(snapshot.edits.length / 256) > revision) throw new Error('snapshot revision is inconsistent');
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
    // Validate the entire bounded construction edit before touching the journal.
    // One revision represents one committed batch; inventory transactions remain
    // the responsibility of the caller's durable, authoritative save boundary.
    applyBatch(edits, expectedRevision = revision) {
      assertRevision(expectedRevision);
      if (expectedRevision !== revision) throw new Error('stale voxel edit revision');
      if (!Array.isArray(edits) || edits.length < 1 || edits.length > 256) {
        throw new RangeError('voxel batch must contain 1..256 edits');
      }
      const pending = new Map();
      for (const raw of edits) {
        const edit = normalizedEdit(raw);
        const key = voxelKey(edit.x, edit.y, edit.z);
        if (pending.has(key)) throw new Error('duplicate voxel in batch');
        pending.set(key, edit);
      }
      let additions = 0;
      let changed = 0;
      for (const [key, edit] of pending) {
        if (!changes.has(key)) additions++;
        if (!changes.has(key) || changes.get(key).block !== edit.block) changed++;
      }
      if (changes.size + additions > MAX_EDITS) throw new RangeError('voxel journal capacity reached');
      if (!changed) return { changed: false, count: 0, revision };
      const nextRevision = assertRevision(revision + 1);
      for (const [key, edit] of pending) changes.set(key, edit);
      revision = nextRevision;
      return { changed: true, count: changed, revision };
    },
    // Produce a validated candidate for a durable inventory+world transaction.
    // This does not mutate the live journal: persist the candidate together with
    // inventory in one authoritative transaction, then restore after commit.
    previewBatch(edits, expectedRevision = revision) {
      assertRevision(expectedRevision);
      if (expectedRevision !== revision) throw new Error('stale voxel edit revision');
      if (!Array.isArray(edits) || edits.length < 1 || edits.length > 256) {
        throw new RangeError('voxel batch must contain 1..256 edits');
      }
      const pending = new Map();
      for (const raw of edits) {
        const edit = normalizedEdit(raw);
        const key = voxelKey(edit.x, edit.y, edit.z);
        if (pending.has(key)) throw new Error('duplicate voxel in batch');
        pending.set(key, edit);
      }
      let additions = 0;
      const delta = [];
      for (const [key, edit] of pending) {
        if (!changes.has(key)) additions++;
        const previous = changes.get(key)?.block;
        if (!changes.has(key) || previous !== edit.block) delta.push({ ...edit, previous });
      }
      const changed = delta.length;
      if (changes.size + additions > MAX_EDITS) throw new RangeError('voxel journal capacity reached');
      // A replay has no delta: avoid copying the entire map just to stage it.
      // Still return an independent, sorted snapshot for durable readback.
      if (!changed) return {
        changed: false, count: 0, revision, delta: [],
        snapshot: {
          version: JOURNAL_VERSION, worldSeed, revision, voxelMetres: VOXEL_METRES,
          edits: Array.from(changes.values(), edit => ({ ...edit }))
            .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z)
        }
      };
      // Stage only the bounded delta, not a second journal instance. Sort once
      // for the durable snapshot; the live map/revision remain untouched.
      const staged = new Map(changes);
      for (const [key, edit] of pending) staged.set(key, edit);
      const nextRevision = changed ? assertRevision(revision + 1) : revision;
      return {
        changed: changed > 0, count: changed, revision: nextRevision,
        // Apply only after the inventory+snapshot durable commit succeeds.
        // previous === undefined means generated terrain was not overridden.
        delta: delta.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z),
        snapshot: {
          version: JOURNAL_VERSION, worldSeed, revision: nextRevision,
          voxelMetres: VOXEL_METRES,
          edits: Array.from(staged.values(), edit => ({ ...edit }))
            .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z)
        }
      };
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
