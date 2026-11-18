import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context = {};
for (const file of ['city-worldgen.js', 'city-terrain-world.js', 'city-voxel-world.js']) {
  vm.runInNewContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context, {filename: file});
}
const groups = ['evergreen','desert','tundra','wetland','volcanic','alpine','tropical','grassland','salt','crystal','fungal','ruins'];
const catalog = Array.from({length: 132}, (_, i) => ({
  id: 'terrain-' + i, name: 'Biome ' + i, group: groups[Math.floor(i / 11)],
  material: 'topsoil', hue: (i * 19) % 360, sat: 30 + (i % 6) * 6, light: 40
}));
const create = seed => context.CityVoxelWorld.createVoxelWorld(context.CityTerrainWorld.createTerrain(seed, catalog));
const plain = value => JSON.parse(JSON.stringify(value));

test('structure fragments retain parent identity and unique chunk identity across regeneration', () => {
  for (const seed of ['fortress-road', 'fortress-highlands', 'fortress-snow']) {
    const world = create(seed);
    const source = world.gateRoad.parts;
    const chunks = new Set();
    for (const part of source) {
      const x0 = Math.floor(part.x / 16), x1 = Math.floor((part.x + part.w - 1e-9) / 16);
      const z0 = Math.floor(part.z / 16), z1 = Math.floor((part.z + part.d - 1e-9) / 16);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) chunks.add(cx + ',' + cz);
    }
    const collect = w => [...chunks].sort().flatMap(key => {
      const [cx, cz] = key.split(',').map(Number);
      const fragments = w.chunkAt(cx, cz).structures;
      assert.ok(Object.isFrozen(fragments));
      for (const fragment of fragments) {
        assert.ok(fragment.fragmentId && fragment.id && fragment.structureId);
        assert.ok(fragment.x >= cx * 16 && fragment.x + fragment.w <= (cx + 1) * 16);
        assert.ok(fragment.z >= cz * 16 && fragment.z + fragment.d <= (cz + 1) * 16);
        assert.ok(fragment.w > 0 && fragment.d > 0);
        assert.ok(Object.isFrozen(fragment));
      }
      return fragments.map(({id, fragmentId, structureId, x, z, w, d}) => ({id, fragmentId, structureId, x, z, w, d}));
    });
    const first = collect(world);
    assert.ok(first.length > 0);
    assert.equal(new Set(first.map(f => f.fragmentId)).size, first.length, 'no fragment identity collisions');
    assert.ok(first.some(f => first.filter(g => g.id === f.id).length > 1), 'cross-chunk parents keep a shared identity');
    for (let i = 0; i < 1200; i++) world.surfaceAt(100000 + i, -100000 - i);
    assert.deepEqual(plain(collect(world)), plain(first), 'cache churn cannot change fragment identity');
    assert.deepEqual(plain(collect(create(seed))), plain(first), 'same seed regenerates identical fragments');
  }
});
