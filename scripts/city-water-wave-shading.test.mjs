import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../city-voxel-renderer.js', import.meta.url), 'utf8');

test('water wave normal and highlights use the same animated phases', () => {
  assert.match(source, /phaseX=vPosition\.x\*\.81\+uTime\*\.8/);
  assert.match(source, /phaseZ=vPosition\.z\*\.62-uTime\*\.7/);
  assert.match(source, /slopeX=\.065\*\.81\*cos\(phaseX\)\*sin\(phaseZ\)/);
  assert.match(source, /slopeZ=\.065\*\.62\*sin\(phaseX\)\*cos\(phaseZ\)/);
  assert.match(source, /waterNormal=normalize\(vec3\(-slopeX,1\.0,-slopeZ\)\)/);
});

test('water sun glint uses wave normal and camera direction without new textures', () => {
  assert.match(source, /sunGlint=pow\(max\(0\.0,dot\(reflect\(-sunDir,waterNormal\),toEye\)\),24\.0\)/);
  assert.match(source, /vec3\(\.22,\.20,\.16\)\*sunGlint/);
  assert.match(source, /if\(vWater>\.5\)\{[^}]*float phaseX=/s);
  assert.match(source, /gl_FragColor=vec4\(mix\(color,haze,fog\),1\.0\)/);
});

test('analytic water perturbation remains bounded and finite over a full wave period', () => {
  for (let i = 0; i <= 256; i++) {
    const x = i * Math.PI * 2 / 256;
    const z = (i * 7 % 257) * Math.PI * 2 / 257;
    const dx = .065 * .81 * Math.cos(x) * Math.sin(z);
    const dz = .065 * .62 * Math.sin(x) * Math.cos(z);
    const length = Math.hypot(dx, 1, dz);
    assert.ok(Number.isFinite(length) && length >= 1 && length < 1.003);
    assert.ok(1 / length > .997);
  }
});
