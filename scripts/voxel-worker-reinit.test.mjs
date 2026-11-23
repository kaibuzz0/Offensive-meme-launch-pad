import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../city-voxel-mesh-worker.js', import.meta.url), 'utf8');

test('failed worker reinitialization cannot serve stale seed geometry', () => {
  const replies = [];
  let meshCalls = 0;
  const scope = {
    Float32Array,
    performance: { now: () => 1 },
    importScripts: () => {},
    postMessage: (message) => replies.push(message),
    CityTerrainWorld: {
      createTerrain: (seed, definitions) => ({ seed, biomes: definitions }),
    },
    CityVoxelWorld: {
      createVoxelWorld: (atlas) => ({ seed: atlas.seed }),
    },
    CityVoxelRenderer: {
      generateMesh: () => {
        meshCalls += 1;
        return { vertices: 0, tiles: 0, plants: 0, data: new Float32Array(0) };
      },
    },
  };
  scope.self = scope;
  vm.runInNewContext(source, scope, { filename: 'city-voxel-mesh-worker.js' });
  const definitions = Array.from({ length: 132 }, (_, i) => ({ id: i }));
  scope.onmessage({ data: { type: 'init', seed: 'first', definitions } });
  assert.equal(replies.at(-1).type, 'ready');
  scope.onmessage({ data: { type: 'mesh', cx: 0, cz: 0, stride: 1, id: 1 } });
  assert.equal(replies.at(-1).type, 'mesh');
  assert.equal(meshCalls, 1);

  scope.onmessage({ data: { type: 'init', seed: 'invalid', definitions: [] } });
  assert.equal(replies.at(-1).type, 'error');
  scope.onmessage({ data: { type: 'mesh', cx: 0, cz: 0, stride: 1, id: 2 } });
  assert.equal(replies.at(-1).type, 'error');
  assert.match(replies.at(-1).message, /not initialized/i);
  assert.equal(meshCalls, 1, 'stale world must never generate more meshes');

  scope.onmessage({ data: { type: 'init', seed: 'second', definitions } });
  assert.equal(replies.at(-1).type, 'ready');
  scope.onmessage({ data: { type: 'mesh', cx: 0, cz: 0, stride: 1, id: 3 } });
  assert.equal(replies.at(-1).type, 'mesh');
  assert.equal(replies.at(-1).seedHash, 'second');
  assert.equal(meshCalls, 2);
});
