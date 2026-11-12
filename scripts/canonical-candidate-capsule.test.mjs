import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), context);
function world(ceiling, obstructs = () => false) {
  return {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    surfaceAt(x) { return { height: x >= 1 ? 0 : -1 }; },
    caveRoomAt(x) { return x >= 1 ? { floor: 1, ceiling, exposed: false } : null; },
    gateRoad: { obstructs },
  };
}
test('low raised roof rejects grounded step', () => {
  const p = context.CityVoxelPhysics.createController(world(7.6), { x: .4, z: 0 });
  for (let i = 0; i < 10; i++) p.tick({ right: 1 }, .05);
  assert.ok(p.snapshot().x < .73);
  assert.equal(p.snapshot().y, 0);
});
test('sufficient raised roof accepts grounded step', () => {
  const p = context.CityVoxelPhysics.createController(world(9), { x: .4, z: 0 });
  for (let i = 0; i < 10; i++) p.tick({ right: 1 }, .05);
  assert.ok(p.snapshot().x > 1.1);
  assert.equal(p.snapshot().y, 1);
});
test('airborne structural clearance uses actual feet rather than raised terrain', () => {
  const observed = [];
  const p = context.CityVoxelPhysics.createController(world(20, (x, y) => {
    if (x >= .73) observed.push(y);
    return false;
  }), { x: .4, z: 0 });
  p.tick({ jump: true }, .05);
  const before = p.snapshot();
  assert.equal(before.grounded, false);
  p.tick({ right: 1 }, .05);
  assert.ok(observed.length > 0, 'must query the raised boundary');
  for (const y of observed) assert.ok(Math.abs(y - before.y) < 1e-9);
});

test('visual detail changes do not alter shared controller movement or collision', () => {
  const low = world(9);
  const high = world(9);
  low.visualDetail = 'compatibility';
  high.visualDetail = 'accelerated';
  const a = context.CityVoxelPhysics.createController(low, { x: .4, z: 0 });
  const b = context.CityVoxelPhysics.createController(high, { x: .4, z: 0 });
  const sequence = [
    [{ right: 1 }, .05],
    [{ right: 1, forward: 1, yaw: .3 }, .05],
    [{ jump: true, right: 1 }, .05],
    [{ forward: 1, yaw: -.4 }, .05],
    [{ right: -1 }, .05],
  ];
  for (const [input, dt] of sequence) {
    assert.deepEqual({ ...a.tick(input, dt) }, { ...b.tick(input, dt) });
  }
});

test('oversized frame delta cannot advance more than the bounded controller step', () => {
  const a = context.CityVoxelPhysics.createController(world(20), { x: .4, z: 0 });
  const b = context.CityVoxelPhysics.createController(world(20), { x: .4, z: 0 });
  assert.deepEqual({ ...a.tick({ right: 1 }, 3) }, { ...b.tick({ right: 1 }, .05) });
});

test('fast diagonal motion cannot tunnel through a narrow gate boundary', () => {
  const hits = [];
  const w = world(20, (x, y, z) => {
    hits.push([x, y, z]);
    return x >= .73 && x < 1.05;
  });
  const p = context.CityVoxelPhysics.createController(w, { x: .4, z: 0 });
  for (let i = 0; i < 6; i++) p.tick({ right: 1, forward: 1 }, .05);
  assert.ok(hits.length > 0, 'must query the gate collision geometry');
  assert.ok(p.snapshot().x < .73, 'quarter-voxel sweep must not skip a thin obstruction');
  assert.ok(p.snapshot().z > 0, 'unblocked axis should still slide forward');
});

test('teleport to invalid coordinates leaves the player state unchanged', () => {
  const p = context.CityVoxelPhysics.createController(world(20), { x: .4, z: 0 });
  const before = { ...p.snapshot() };
  assert.equal(p.teleport(1000000, 0), false);
  assert.deepEqual({ ...p.snapshot() }, before);
});
