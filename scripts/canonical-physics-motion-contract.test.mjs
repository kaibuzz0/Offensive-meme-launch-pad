import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

// Canonical controller contract: the visual renderer must never choose
// different world collision, and movement is bounded after long frames.
const source = readFileSync(new URL('../city-voxel-physics.js', import.meta.url), 'utf8');
function controller(overrides = {}) {
  const context = {};
  runInNewContext(source, context);
  return context.CityVoxelPhysics.createController({
    PLAYER_HEIGHT: 1.8,
    SEA_LEVEL: -100,
    surfaceAt: () => ({ height: -1 }),
    gateRoad: { obstructs: () => false },
    ...overrides,
  }, { x: 0, z: 0 });
}

test('diagonal movement remains normalized to cardinal movement', () => {
  const straight = controller();
  const diagonal = controller();
  straight.tick({ forward: 1 }, 1 / 60);
  diagonal.tick({ forward: 1, right: 1 }, 1 / 60);
  const a = straight.snapshot(), b = diagonal.snapshot();
  assert.ok(Math.abs(Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z)) < 1e-8);
});

test('wall collision permits sliding along the unblocked axis', () => {
  const c = controller({ gateRoad: { obstructs: (x) => x > 0.1 } });
  for (let i = 0; i < 10; i++) c.tick({ forward: 1, right: 1 }, 1 / 60);
  const p = c.snapshot();
  assert.ok(p.x <= 0.1 + 1e-8, 'cannot cross wall');
  assert.ok(p.z > 0.5, 'can slide along wall');
});

test('long stalled frame does not produce a large teleport-like displacement', () => {
  const stalled = controller(), bounded = controller();
  stalled.tick({ forward: 1 }, 30);
  bounded.tick({ forward: 1 }, 0.05);
  assert.ok(Math.abs(stalled.snapshot().z - bounded.snapshot().z) < 1e-8);
});

test('renderer-dependent metadata does not change canonical collision results', () => {
  const wall = (x) => x >= 1;
  const accelerated = controller({ gateRoad: { obstructs: wall }, visualDetail: 'high' });
  const compatible = controller({ gateRoad: { obstructs: wall }, visualDetail: 'low' });
  for (let i = 0; i < 12; i++) {
    const input = { forward: 1, yaw: Math.PI / 2 };
    accelerated.tick(input, 1 / 60);
    compatible.tick(input, 1 / 60);
  }
  const a = accelerated.snapshot(), b = compatible.snapshot();
  assert.deepEqual({ x: a.x, z: a.z, y: a.y }, { x: b.x, z: b.z, y: b.y });
  assert.ok(a.x < 1, 'wall must block both visual detail paths');
});
