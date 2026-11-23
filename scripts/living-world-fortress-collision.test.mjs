import test from 'node:test';
import assert from 'node:assert/strict';
// The browser wildlife module publishes its API on globalThis; it has no ESM default export.
import '../city-sandbox-wildlife.js';
const wildlife = globalThis.CitySandboxWildlife;

const makeWorld = (obstructs) => ({
 seed: 1234, CHUNK_SIZE: 16, SEA_LEVEL: 0,
 gateRoad: { obstructs },
 surfaceAt: () => ({ height: 10, group: 'plains', biomeName: 'Plains', slope: 1, water: false, river: false })
});

test('terrestrial wildlife shares fortress solid-box collision contract', () => {
 const baseline = wildlife.spawnChunkOnTerrain(makeWorld(() => false), 0, 0);
 let checks = 0;
 const blocked = wildlife.spawnChunkOnTerrain(makeWorld(() => { checks++; return true; }), 0, 0);
 const flying = new Set(['songbird','hawk','owl','eagle','duck','seabird','bat']);
 assert.ok(baseline.length > 0, 'fixture seed must produce creatures');
 assert.ok(checks > 0, 'fixture must exercise terrestrial collision');
 assert.deepEqual(blocked.map(a => a.id), baseline.filter(a => flying.has(a.species)).map(a => a.id));
});

test('fortress collision filtering is deterministic across repeated chunk loads', () => {
 const world = makeWorld((x, y, z) => x > 8 && y < 20);
 assert.deepEqual(wildlife.spawnChunkOnTerrain(world, 0, 0), wildlife.spawnChunkOnTerrain(world, 0, 0));
});
