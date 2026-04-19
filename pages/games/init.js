import { loadExplorerTemplate } from '../../scripts/explorer.js';
import { games } from './games.js';

const contentEl = document.querySelector(
  '.win98-window[data-window-id="games"] .win98-content'
);

if (contentEl) {
  await loadExplorerTemplate(contentEl, {
    path: 'Games',
    items: games,
    onItemClick: (game) => {
      window.windowManager.openDynamic({
        id:     `game-${game.id}`,
        title:  game.name,
        icon:   game.icon,
        width:  game.width,
        height: game.height,
        src:    `pages/games/${game.id}/index.html`,
      });
    },
  });
}
