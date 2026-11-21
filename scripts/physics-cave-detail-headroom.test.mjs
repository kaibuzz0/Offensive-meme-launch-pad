import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const physicsSource = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');

function controller(detail) {
  const context = {};
  runInNewContext(physicsSource, context);
  const world = {
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -10,
    visualDetail: detail,
    surfaceAt: () => ({ height: 0 }),
    // A solid-roof gallery begins under the next tile. Its low ceiling
    // intersects the standing player's head before their center enters.
    caveRoomAt: (x) => x >= 1
      ? { floor: 0, ceiling: 2, exposed: false }
      : null,
  };
  return context.CityVoxelPhysics.createController(world, { x: 0, z: 0 });
}

test('cave doorway headroom and capsule footprint are invariant under render detail', () => {
  const low = controller({ lod: 5, renderDistance: 2, resolutionScale: 0.5 });
  const high = controller({ lod: 0, renderDistance: 18, resolutionScale: 1 });
  for (let i = 0; i < 5; i++) {
    const input = { right: 1, forward: 0, yaw: 0 };
    const a = low.tick(input, 0.05);
    const b = high.tick(input, 0.05);
    assert.deepEqual({ ...a }, { ...b });
    assert.deepEqual({ ...low.profileLastTick() }, { ...high.profileLastTick() });
    assert.equal(low.profileLastTick().failed, false);
    assert.ok(low.profileLastTick().caveQueries > 0);
    assert.ok(a.x < 0.75, 'capsule head must not clip into the solid-roof gallery');
  }
  assert.equal(low.snapshot().y, 1, 'blocked doorway must not lift the player');
});
