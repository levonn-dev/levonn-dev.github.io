import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createKonamiMatcher, normalizeKey, KONAMI_SEQUENCE } from '../scripts/konami.js';

test('normalizeKey lowercases single characters and preserves named keys', () => {
  assert.equal(normalizeKey('B'), 'b');
  assert.equal(normalizeKey('a'), 'a');
  assert.equal(normalizeKey('ArrowUp'), 'ArrowUp');
});

test('fires onMatch exactly once for the full sequence', () => {
  let count = 0;
  const push = createKonamiMatcher(() => { count += 1; });
  for (const key of KONAMI_SEQUENCE) push(key);
  assert.equal(count, 1);
});

test('accepts uppercase B/A via normalization', () => {
  let count = 0;
  const push = createKonamiMatcher(() => { count += 1; });
  const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'B', 'A'];
  for (const key of keys) push(key);
  assert.equal(count, 1);
});

test('does not fire on a wrong/incomplete sequence', () => {
  let count = 0;
  const push = createKonamiMatcher(() => { count += 1; });
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'b', 'a']) push(key);
  assert.equal(count, 0);
});

test('matches when preceded by noise (rolling buffer)', () => {
  let count = 0;
  const push = createKonamiMatcher(() => { count += 1; });
  for (const key of ['x', 'ArrowDown', 'ArrowUp']) push(key);
  for (const key of KONAMI_SEQUENCE) push(key);
  assert.equal(count, 1);
});

test('does not fire on a near-miss (one pair swapped)', () => {
  let count = 0;
  const push = createKonamiMatcher(() => { count += 1; });
  const wrong = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'b', 'a'];
  for (const key of wrong) push(key);
  assert.equal(count, 0);
});

test('fires again when the sequence is entered a second time', () => {
  let count = 0;
  const push = createKonamiMatcher(() => { count += 1; });
  for (const key of KONAMI_SEQUENCE) push(key);
  for (const key of KONAMI_SEQUENCE) push(key);
  assert.equal(count, 2);
});
