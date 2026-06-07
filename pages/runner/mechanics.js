// Pure game mechanics with no DOM dependency, unit-tested under `node --test`.

// Axis-aligned bounding-box overlap. Boxes are { x, y, w, h } with x,y at the
// top-left. Edge-only contact does not count as a collision.
export function aabb(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// World scroll speed (pixels per 60fps frame) as a function of score: starts at
// `base`, grows linearly, capped at `max` so the game stays playable.
export function speedForScore(score, base = 4, perPoint = 0.0025, max = 12) {
  return Math.min(max, base + score * perPoint);
}

// The larger of two scores; used to track the high score.
export function bestScore(a, b) {
  return Math.max(a, b);
}
