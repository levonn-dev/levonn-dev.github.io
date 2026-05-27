// Single source of truth for the mobile/desktop boundary.
//
// IMPORTANT: keep MOBILE_QUERY in sync with the "=== Responsive ===" @media
// blocks in styles/main.css and the per-page CSS files (templates/wmp.css,
// templates/explorer.css, pages/games/game.css, etc.). JS and CSS must agree
// on where mobile mode begins.
const MOBILE_QUERY = '(max-width: 640px), (max-height: 480px) and (pointer: coarse)';

const mq = window.matchMedia(MOBILE_QUERY);

// True when the viewport should use the phone "fullscreen app" mode.
export function isMobile() {
  return mq.matches;
}

// Subscribe to mobile <-> desktop transitions. The callback receives the new
// boolean. Returns an unsubscribe function.
export function onViewportChange(callback) {
  const handler = (e) => callback(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
