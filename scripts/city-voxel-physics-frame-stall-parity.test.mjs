import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const sandbox = {};
runInNewContext(readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8'), sandbox);
const make = (detail) => sandbox.CityVoxelPhysics.createController({
  PLAYER_HEIGHT: 1.8,
  SEA_LEVEL: -100,
  renderDistance: detail === 'near' ? 2 : 32,
  visualDetail: detail,
  surfaceAt() { return {height: 0}; },
  gateRoad: {obstructs(x, y, z, height, radius) {
    return x + radius >= 2 && x - radius <= 2.25 && Math.abs(z) > 0.7;
  }},
}, {x: 0, z: 0});

test('long background stall bounds physics steps and discards excess elapsed time', () => {
  const player = make('near');
  const stalled = player.tickFrame({right: 1, yaw: 0}, 5);
  assert.ok(stalled.steps <= 6, 'unbounded physics catch-up');
  assert.ok(stalled.simulatedSeconds <= 0.1 + 1e-9);
  assert.ok(stalled.droppedSeconds >= 4.9 - 1e-9, 'background time was replayed');
  assert.ok(stalled.state.x < 2, 'stalled frame tunneled through wall');
  const next = player.tickFrame({right: 1, yaw: 0}, 1 / 60);
  assert.ok(next.steps <= 2, 'stale accumulated steps leaked into next frame');
});

test('fixed-step collision is identical across automatic render budgets', () => {
  const near = make('near'), far = make('far');
  const inputs = [
    {right: 1, yaw: 0},
    {forward: 1, right: 1, yaw: 0},
    {forward: -1, yaw: 0},
    {jump: true, right: 1, yaw: 0},
  ];
  for (let i = 0; i < 240; i++) {
    const input = inputs[Math.floor(i / 60)];
    const dt = i % 4 === 0 ? 1 / 30 : 1 / 120;
    const a = near.tickFrame(input, dt);
    const b = far.tickFrame(input, dt);
    assert.deepEqual({...a.state}, {...b.state}, 'visual LOD changed physical state');
    assert.equal(a.steps, b.steps);
    assert.equal(a.surfaceQueries, b.surfaceQueries);
    assert.equal(a.obstructionQueries, b.obstructionQueries);
  }
});
