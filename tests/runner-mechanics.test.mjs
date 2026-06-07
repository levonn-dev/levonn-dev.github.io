import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aabb, speedForScore, bestScore } from '../pages/runner/mechanics.js';

test('aabb detects overlapping boxes', () => {
  assert.equal(aabb({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
});

test('aabb returns false for separated boxes', () => {
  assert.equal(aabb({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 }), false);
});

test('aabb treats edge-only contact as no collision', () => {
  assert.equal(aabb({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
});

test('speedForScore returns the base speed at score 0', () => {
  assert.equal(speedForScore(0), 4);
});

test('speedForScore increases with score but is capped', () => {
  assert.ok(speedForScore(1000) > speedForScore(0));
  assert.equal(speedForScore(400), 5);        // 4 + 400 * 0.0025 = 5 (exact slope)
  assert.ok(speedForScore(3199) < 12);        // just below the cap crossover
  assert.equal(speedForScore(3200), 12);      // cap reached exactly at crossover
  assert.equal(speedForScore(1_000_000), 12); // far past the cap
});

test('bestScore returns the larger value', () => {
  assert.equal(bestScore(3, 7), 7);
  assert.equal(bestScore(9, 2), 9);
});
