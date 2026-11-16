import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoxelEditJournal } from '../city-sandbox-mining.js';
import { projectCommittedConstruction } from '../city-road-build-scene-projection.js';

test('committed scene projection is read-only, seed-scoped and repeatable', () => {
  const journal = createVoxelEditJournal('starter');
  journal.apply({ x: 4, y: 2, z: -8, block: 'workbench' });
  const record = { version: 1, seed: 'starter', revision: 1,
    inventory: { supplies: 0 }, journal: journal.snapshot() };
  const before = structuredClone(record);
  const projected = projectCommittedConstruction(record, 'starter');
  assert.equal(projected.edits[0].worldX, 1);
  assert.equal(projected.edits[0].worldY, 0.5);
  assert.equal(projected.edits[0].worldZ, -2);
  assert.equal(projected.edits[0].block, 'workbench');
  assert.deepEqual(projectCommittedConstruction(record, 'starter'), projected);
  assert.deepEqual(record, before);
  assert.ok(Object.isFrozen(projected.edits[0]));
  assert.throws(() => projectCommittedConstruction(record, 'other'), /seed mismatch/);
  const corrupt = structuredClone(record);
  corrupt.journal.revision = 0;
  assert.throws(() => projectCommittedConstruction(corrupt, 'starter'), /revision mismatch/);
});


test('renderer delta reconciles edits without duplicate spending or stale replay', async () => {
  const { diffCommittedConstruction } = await import('../city-road-build-scene-projection.js');
  const make = (revision, edits, supplies) => {
    const journal = createVoxelEditJournal('starter');
    for (const edit of edits) journal.apply(edit);
    return { version: 1, seed: 'starter', revision,
      inventory: { supplies }, journal: journal.snapshot() };
  };
  const block = { x: 4, y: 2, z: -8, block: 'workbench' };
  const first = make(1, [block], 4);
  const next = make(2, [{ ...block, block: 'stone' }], 3);
  const initial = diffCommittedConstruction(null, first, 'starter');
  assert.equal(initial.upsert.length, 1);
  assert.equal(initial.remove.length, 0);
  assert.equal(initial.supplies, 4);
  const repeated = diffCommittedConstruction(first, first, 'starter');
  assert.equal(repeated.upsert.length, 0);
  assert.equal(repeated.remove.length, 0);
  const changed = diffCommittedConstruction(first, next, 'starter');
  assert.equal(changed.upsert.length, 1);
  assert.equal(changed.upsert[0].block, 'stone');
  assert.equal(changed.supplies, 3);
  assert.throws(() => diffCommittedConstruction(next, first, 'starter'), /stale/);
  assert.throws(() => diffCommittedConstruction(first, next, 'different'), /seed mismatch/);
});


test('equal-revision renderer snapshots cannot silently diverge', async () => {
  const { diffCommittedConstruction } = await import('../city-road-build-scene-projection.js');
  const make = (supplies, block) => {
    const journal = createVoxelEditJournal('starter');
    journal.apply({ x: 4, y: 2, z: -8, block });
    return { version: 1, seed: 'starter', revision: 1,
      inventory: { supplies }, journal: journal.snapshot() };
  };
  const original = make(4, 'workbench');
  assert.throws(() => diffCommittedConstruction(original, make(3, 'workbench'), 'starter'), /conflicting construction snapshot/);
  assert.throws(() => diffCommittedConstruction(original, make(4, 'stone'), 'starter'), /conflicting construction snapshot/);
  assert.deepEqual(diffCommittedConstruction(original, structuredClone(original), 'starter').upsert, []);
});

test('equal-revision scene replay rejects divergence outside rendered fields', async () => {
  const { diffCommittedConstruction } = await import('../city-road-build-scene-projection.js');
  const journal = createVoxelEditJournal('starter');
  const base = { version: 1, seed: 'starter', revision: 0,
    inventory: { supplies: 8, crafted: 0 }, journal: journal.snapshot(),
    provenance: { source: 'road-crate' } };
  const altered = structuredClone(base);
  altered.inventory.crafted = 1;
  assert.throws(() => diffCommittedConstruction(base, altered, 'starter'),
    /conflicting construction snapshot/);
  const changedMetadata = structuredClone(base);
  changedMetadata.provenance.source = 'other-crate';
  assert.throws(() => diffCommittedConstruction(base, changedMetadata, 'starter'),
    /conflicting construction snapshot/);
  const reordered = { provenance: { source: 'road-crate' },
    journal: structuredClone(base.journal), inventory: { crafted: 0, supplies: 8 },
    revision: 0, seed: 'starter', version: 1 };
  assert.deepEqual(diffCommittedConstruction(base, reordered, 'starter').upsert, []);
});
