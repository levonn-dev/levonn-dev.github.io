// Loads the shared IE6 browser chrome from templates/ie6.html into a content element.
// config: { url, html } where url sets the address bar and html populates the viewport.
// Any <link> or <script type="module"> tags in html are extracted and injected into
// document.head so pages can ship their own dependencies inside content fragments.

import { templateLoader, extractAssets } from './dom.js';

const loadTemplate = templateLoader('templates/ie6.html');

export async function loadIE6Template(contentEl, { url, html } = {}) {
  const frag = await loadTemplate();

  const addressInput = frag.querySelector('.ie6-addressbar input');
  if (addressInput && url) addressInput.value = url;

  const viewport = frag.querySelector('.ie6-viewport');
  if (viewport && html) {
    viewport.innerHTML = html;
    extractAssets(viewport);
  }

  contentEl.innerHTML = '';
  contentEl.appendChild(frag);
}
