import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../city-voxel-renderer.js', import.meta.url), 'utf8');
const wave = (x, z, t) => .025 * Math.sin(x * .81 + t * .8) * Math.sin(z * .62 - t * .7);

test('water-only vertex displacement shares phase and amplitude with fragment normal', () => {
  assert.match(source, /uniform mat4 uMatrix;uniform vec3 uEye;uniform float uTime/);
  assert.match(source, /vWater=aNormal\.y< -1\.5\?1\.0:0\.0/);
  assert.match(source, /sin\(aPos\.x\*\.81\+uTime\*\.8\)\*sin\(aPos\.z\*\.62-uTime\*\.7\)/);
  assert.match(source, /vec3 surface=aPos\+vec3\(0\.0,vWater\*\.025\*wave,0\.0\)/);
  assert.match(source, /gl_Position=uMatrix\*vec4\(surface,1\.0\)/);
  assert.match(source, /vPosition=surface/);
  assert.match(source, /slopeX=\.025\*\.81\*cos\(phaseX\)\*sin\(phaseZ\)/);
  assert.match(source, /slopeZ=\.025\*\.62\*sin\(phaseX\)\*cos\(phaseZ\)/);
});

test('shared chunk boundaries have identical heights at any timestamp', () => {
  for (const t of [0, 1.75, 90.25, 10000]) {
    for (let z = -32; z <= 32; z += 3.5) {
      assert.equal(wave(16, z, t), wave(16 - 16 + 16, z, t), 'shared x=16 edge');
      assert.equal(wave(-16, z, t), wave(0 - 16, z, t), 'shared x=-16 edge');
      assert.ok(Math.abs(wave(16, z, t)) <= .0250000001);
    }
  }
  // Displacement is based on global vertex positions, not chunk-local UVs.
  assert.doesNotMatch(source, /wave=sin\(\(aPos\.x\s*[-+]\s*cx\)/);
});

test('analytic wave normal is consistent with displaced surface derivative', () => {
  const eps = 1e-4;
  for (const t of [0, 2.5, 300]) {
    for (const [x,z] of [[0,0],[16,-16],[-29,31],[100,2]]) {
      const dx = (wave(x + eps, z, t) - wave(x - eps, z, t)) / (2 * eps);
      const dz = (wave(x, z + eps, t) - wave(x, z - eps, t)) / (2 * eps);
      const expectedX = .025 * .81 * Math.cos(x * .81 + t * .8) * Math.sin(z * .62 - t * .7);
      const expectedZ = .025 * .62 * Math.sin(x * .81 + t * .8) * Math.cos(z * .62 - t * .7);
      assert.ok(Math.abs(dx - expectedX) < 1e-8);
      assert.ok(Math.abs(dz - expectedZ) < 1e-8);
    }
  }
});

test('animated water cannot overtake raised shoreline foam geometry', () => {
  const foam = source.match(/const foam=\[[^\n]*fy=yy\+\.035/);
  assert.ok(foam, 'shoreline foam must remain 0.035 units above still water');
  assert.match(source, /vWater\*\.025\*wave/);
  for (const t of [0, .5, 1, 9, 100, 10000]) {
    for (const [x,z] of [[0,0],[16,16],[-31,18],[800,-800]]) {
      assert.ok(wave(x,z,t) < .035, 'foam must remain above wave crest');
    }
  }
});
