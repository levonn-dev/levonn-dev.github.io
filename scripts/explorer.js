// Loads the shared Win98 file explorer chrome from templates/explorer.html into a
// content element and populates the icon grid from the given items.
// config: { path, items, onItemClick }
//   path        - string shown in the address bar
//   items       - array of { icon, name, ... } objects
//   onItemClick - called with the clicked item

import { templateLoader } from './dom.js';

const loadTemplate = templateLoader('templates/explorer.html');

export async function loadExplorerTemplate(contentEl, { path, items = [], onItemClick } = {}) {
  const frag = await loadTemplate();

  const pathInput = frag.querySelector('.explorer-addressbar input');
  if (pathInput && path) pathInput.value = path;

  const grid = frag.querySelector('.win98-explorer');
  items.forEach(item => {
    const icon = document.createElement('div');
    icon.className = 'win98-explorer-icon';

    const img = document.createElement('img');
    img.src = item.icon;
    img.alt = item.name;

    const label = document.createElement('span');
    label.textContent = item.name;

    icon.appendChild(img);
    icon.appendChild(label);
    if (onItemClick) icon.addEventListener('click', () => onItemClick(item));
    grid.appendChild(icon);
  });

  const statusEl = frag.querySelector('.explorer-statusbar');
  if (statusEl) {
    const word = items.length === 1 ? 'object' : 'objects';
    statusEl.textContent = `${items.length} ${word}`;
  }

  contentEl.innerHTML = '';
  contentEl.appendChild(frag);
}
