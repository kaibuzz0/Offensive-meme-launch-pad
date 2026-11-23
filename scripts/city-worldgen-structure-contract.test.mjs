import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-worldgen.js', import.meta.url), 'utf8'), context);
const { createWorld } = context.CityWorldgen;

test('seeded settlement and building identities survive chunk order and reload', () => {
  const a = createWorld('living-world-structure-contract');
  const b = createWorld('living-world-structure-contract');
  const sites = [];
  for (let gy = -3; gy <= 3; gy++) for (let gx = -3; gx <= 3; gx++) {
    const site = a.settlementCell(gx, gy);
    if (site) sites.push(site);
  }
  assert.ok(sites.length, 'fixture seed must produce a settlement');
  const site = sites.find(s => a.chunkAt(Math.floor(s.x / 16), Math.floor(s.y / 16)).structures.length) || sites[0];
  assert.deepEqual(JSON.parse(JSON.stringify(a.settlementCell(
    Number(site.id.split(':').at(-2)), Number(site.id.split(':').at(-1))
  ))), JSON.parse(JSON.stringify(b.settlementCell(
    Number(site.id.split(':').at(-2)), Number(site.id.split(':').at(-1))
  ))));
  const cx = Math.floor(site.x / 16), cz = Math.floor(site.y / 16);
  const coords = [[cx, cz], [cx + 1, cz], [cx, cz + 1], [cx - 1, cz]];
  const snapshot = world => coords.map(([x, z]) => {
    const chunk = world.chunkAt(x, z);
    assert.ok(chunk);
    assert.equal(new Set(chunk.structures.map(s => s.id)).size, chunk.structures.length);
    for (const building of chunk.structures) {
      assert.ok(building.x < (x + 1) * 16 && building.x + building.w > x * 16);
      assert.ok(building.y < (z + 1) * 16 && building.y + building.h > z * 16);
    }
    return JSON.parse(JSON.stringify({ id: chunk.id, sites: chunk.sites, structures: chunk.structures }));
  });
  const expected = snapshot(a);
  coords.reverse().forEach(([x, z]) => b.chunkAt(x, z));
  assert.deepEqual(snapshot(b), expected);
});

test('terrain-only worlds do not emit settlements or buildings', () => {
  const world = createWorld('living-world-structure-contract', { terrainOnly: true });
  for (const [cx, cz] of [[0, 0], [-1, -1], [1, 0]]) {
    const chunk = world.chunkAt(cx, cz);
    assert.equal(chunk.sites.length, 0);
    assert.equal(chunk.structures.length, 0);
  }
});
