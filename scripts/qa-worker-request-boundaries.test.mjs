import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-mesh-worker.js', import.meta.url), 'utf8');
function harness() {
  const replies = [];
  let generated = 0;
  const scope = {
    // The renderer stub runs in the host realm; share its typed-array constructor.
    // Real importScripts executes renderer and worker in the same realm.
    Float32Array,
    importScripts() {},
    performance: { now: () => 1 },
    postMessage(message, transfers = []) { replies.push({ message, transfers }); },
    CityTerrainWorld: { createTerrain: () => ({ biomes: Array(132) }) },
    CityVoxelWorld: { createVoxelWorld: () => ({ seed: 123 }) },
    CityVoxelRenderer: { generateMesh() {
      generated++;
      return { vertices: 3, tiles: 1, plants: 0, data: new Float32Array(27) };
    } },
  };
  scope.self = scope;
  runInNewContext(source, scope, { filename: 'city-voxel-mesh-worker.js' });
  return { send: data => scope.onmessage({ data }), replies, generated: () => generated };
}

test('mesh worker rejects uninitialized, malformed and out-of-range jobs without generating geometry', () => {
  const h = harness();
  h.send({ type: 'mesh', id: 1, cx: 0, cz: 0, stride: 1 });
  assert.equal(h.replies.at(-1).message.type, 'error');
  h.send({ type: 'init', seed: 'qa-seed', definitions: Array(132).fill(null) });
  assert.equal(h.replies.at(-1).message.type, 'ready');
  const invalid = [
    { cx: 62501, cz: 0, stride: 1, id: 1 },
    { cx: 0, cz: -62501, stride: 1, id: 1 },
    { cx: NaN, cz: 0, stride: 1, id: 1 },
    { cx: 0.5, cz: 0, stride: 1, id: 1 },
    { cx: 0, cz: 0, stride: 2, id: 1 },
    { cx: 0, cz: 0, stride: 1, id: 0 },
    { cx: 0, cz: 0, stride: 1, id: Number.MAX_SAFE_INTEGER + 1 },
  ];
  for (const job of invalid) {
    h.send({ type: 'mesh', ...job });
    assert.equal(h.replies.at(-1).message.type, 'error');
  }
  assert.equal(h.generated(), 0);
});

test('valid worker job transfers exactly its mesh buffer', () => {
  const h = harness();
  h.send({ type: 'init', seed: 'qa-seed', definitions: Array(132).fill(null) });
  h.send({ type: 'mesh', id: 7, cx: 0, cz: 0, stride: 4 });
  const { message, transfers } = h.replies.at(-1);
  assert.equal(message.type, 'mesh', message.message);
  assert.equal(message.id, 7);
  assert.equal(message.byteLength, 108);
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0], message.buffer);
  assert.equal(h.generated(), 1);
});
