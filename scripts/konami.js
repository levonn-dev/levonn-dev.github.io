// Konami code detector. The pure matcher (createKonamiMatcher) carries no DOM
// dependency so it is unit-testable under `node --test`; initKonami is the thin
// browser wrapper that feeds real keydown events into it.

export const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];

// Single-character keys compare case-insensitively; named keys (ArrowUp, ...)
// are left as-is.
export function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key;
}

// Returns a push(key) function tracking a rolling buffer of the last
// sequence.length keys; calls onMatch() whenever the buffer equals the sequence.
export function createKonamiMatcher(onMatch, sequence = KONAMI_SEQUENCE) {
  const buf = [];
  return function push(key) {
    buf.push(normalizeKey(key));
    if (buf.length > sequence.length) buf.shift();
    if (buf.length === sequence.length && sequence.every((k, i) => k === buf[i])) {
      buf.length = 0;
      onMatch();
    }
  };
}

// Attaches a single passive, bubble-phase keydown listener. Passive => it never
// calls preventDefault, so normal typing (including the terminal's ArrowUp
// history) is untouched; it only observes.
export function initKonami(onTrigger) {
  const push = createKonamiMatcher(onTrigger);
  document.addEventListener('keydown', (e) => push(e.key), { passive: true });
}
