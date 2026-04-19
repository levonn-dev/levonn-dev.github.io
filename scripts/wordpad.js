// Loads the shared Wordpad editor chrome from templates/wordpad.html into a content element.
// config: { html } populates the .wordpad-page document area.
// Any <link> or <script type="module"> tags in html are extracted and injected into
// document.head so pages can ship their own dependencies inside content fragments.

import { templateLoader, extractAssets } from './dom.js';

const loadTemplate = templateLoader('templates/wordpad.html');

export async function loadWordpadTemplate(contentEl, { html } = {}) {
  const frag = await loadTemplate();

  const page = frag.querySelector('.wordpad-page');
  if (page && html) {
    page.innerHTML = html;
    extractAssets(page);
  }

  contentEl.innerHTML = '';
  contentEl.appendChild(frag);
}
