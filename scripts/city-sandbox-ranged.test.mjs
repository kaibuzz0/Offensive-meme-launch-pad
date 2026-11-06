import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRayHit, simulateAreaHits } from '../city-sandbox-ranged.js';

const actor = { id: 'player', team: 'blue' };
const target = (id, x, team = 'red', radius = 1) => ({ id, team, center: { x, y: 0, z: 0 }, radius });
const origin = { x: 0, y: 0, z: 0 };
const ray = (targets, extra = {}) => simulateRayHit({ origin, direction: { x: 5, y: 0, z: 0 }, maxRange: 100, actor, targets, ...extra });

test('nearest ray intersection is independent of target order and direction scale', () => {
  const a = target('far', 20), b = target('near', 10);
  assert.equal(ray([a, b]).targetId, 'near');
  assert.deepEqual(ray([a, b]), ray([b, a]));
  assert.equal(ray([a, b]).distance, 9);
});
test('friendly fire and self hits excluded unless explicitly enabled for teammate', () => {
  const teammate = target('friend', 3, 'blue');
  const self = target('player', 2, 'blue');
  assert.equal(ray([self, teammate, target('enemy', 8)]).targetId, 'enemy');
  assert.equal(ray([self, teammate], { friendlyFire: true }).targetId, 'friend');
  assert.equal(ray([self, teammate]), null);
});
test('rays behind origin, beyond range, or missing spheres are rejected', () => {
  assert.equal(ray([target('behind', -4)]), null);
  assert.equal(ray([target('far', 120)]), null);
  assert.equal(ray([{ ...target('offset', 5), center: { x: 5, y: 4, z: 0 } }]), null);
});
test('ray inside target begins at zero; ties are deterministic', () => {
  assert.equal(ray([target('inside', 0, 'red', 2)]).distance, 0);
  assert.equal(ray([target('z', 8), target('a', 8)]).targetId, 'a');
});
test('area effect falloff, surface distance and ordering are deterministic', () => {
  const options = { center: origin, radius: 10, actor, targets: [target('far', 8), target('near', 2), target('outside', 15)] };
  const hits = simulateAreaHits(options);
  assert.deepEqual(hits.map(h => h.targetId), ['near', 'far']);
  assert.equal(hits[0].intensity, 0.9);
  assert.deepEqual(hits, simulateAreaHits({ ...options, targets: [...options.targets].reverse() }));
});
test('area excludes friend and self unless explicitly permitted', () => {
  const targets = [target('player', 1, 'blue'), target('friend', 2, 'blue')];
  assert.deepEqual(simulateAreaHits({ center: origin, radius: 10, actor, targets }), []);
  assert.deepEqual(simulateAreaHits({ center: origin, radius: 10, actor, targets, friendlyFire: true }).map(x => x.targetId), ['friend']);
});
test('invalid and excessive untrusted inputs fail closed', () => {
  assert.throws(() => ray([], { direction: origin }), RangeError);
  assert.throws(() => ray([], { maxRange: Infinity }), TypeError);
  assert.throws(() => ray([], { maxRange: 513 }), RangeError);
  assert.throws(() => ray([target('same', 2), target('same', 4)]), TypeError);
  assert.throws(() => ray(Array.from({ length: 513 }, (_, i) => target(String(i), i + 2))), RangeError);
  assert.throws(() => simulateAreaHits({ center: origin, radius: 65, actor, targets: [] }), RangeError);
  assert.throws(() => ray([target('bad', 2, 'red', 0)]), RangeError);
  assert.throws(() => ray([], { friendlyFire: 1 }), TypeError);
});
