import { loadExplorerTemplate } from '../../scripts/explorer.js';

const contentEl = document.querySelector(
  '.win98-window[data-window-id="music"] .win98-content'
);

if (contentEl) {
  await loadExplorerTemplate(contentEl, { path: 'Music', items: [] });
}
