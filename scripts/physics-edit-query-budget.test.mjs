import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function controller(detail) {
  const context = {};
  runInNewContext(source, context);
  let edits = 0;
  const world = {
    PLAYER_HEIGHT: 7.2, SEA_LEVEL: -100,
    visualDetail: detail,
    surfaceAt: () => ({ height: 0 }),
    gateRoad: { obstructs: () => false },
    editObstructs: () => { edits++; return false; },
  };
  return { player: context.CityVoxelPhysics.createController(world, { x: 0, z: 0 }), edits: () => edits };
}

test('fixed-step telemetry includes committed-edit collision queries', () => {
  const { player, edits } = controller('low');
  const frame = player.tickFrame({ forward: 1 }, 1 / 30);
  assert.equal(frame.steps, 2);
  assert.ok(frame.editQueries > 0);
  assert.equal(frame.editQueries, edits());
  assert.equal(player.profileLastTick().editQueries > 0, true);
});

test('render detail cannot alter committed-edit query counts or player pose', () => {
  const low = controller('low'), high = controller('high');
  const a = low.player.tickFrame({ right: 1, forward: 1, yaw: 0.4 }, 1 / 30);
  const b = high.player.tickFrame({ right: 1, forward: 1, yaw: 0.4 }, 1 / 30);
  assert.equal(a.editQueries, b.editQueries);
  assert.deepEqual(JSON.parse(JSON.stringify(a.state)), JSON.parse(JSON.stringify(b.state)));
});

test('fixed-step catch-up caps edit query work after a long frame', () => {
  const { player, edits } = controller('high');
  const frame = player.tickFrame({ forward: 1 }, 10);
  assert.equal(frame.steps, player.MAX_SUBSTEPS);
  assert.ok(frame.discardedSeconds > 9);
  assert.equal(frame.editQueries, edits());
  const idle = player.tickFrame({}, 0);
  assert.equal(idle.steps, 0);
  assert.equal(idle.editQueries, 0);
});
