import assert from 'node:assert';
import { test } from 'node:test';
import { getSuperCategory } from '../src/utils.js';

test('getSuperCategory matches build', () => {
  assert.strictEqual(getSuperCategory('my_build_pipeline'), 'Gradnja (Build)');
  assert.strictEqual(getSuperCategory('gradnja_cevovoda'), 'Gradnja (Build)');
});

test('getSuperCategory matches test', () => {
  assert.strictEqual(getSuperCategory('unit_tests'), 'Testiranje (Test)');
  assert.strictEqual(getSuperCategory('testiranje_aplikacije'), 'Testiranje (Test)');
});

test('getSuperCategory matches deploy', () => {
  assert.strictEqual(getSuperCategory('production_deploy'), 'Namestitev (Deploy)');
  assert.strictEqual(getSuperCategory('namestitev_aplikacije'), 'Namestitev (Deploy)');
});

test('getSuperCategory defaults to Ostalo', () => {
  assert.strictEqual(getSuperCategory('something_else'), 'Ostalo');
  assert.strictEqual(getSuperCategory(''), 'Ostalo');
  assert.strictEqual(getSuperCategory(null), 'Ostalo');
});
