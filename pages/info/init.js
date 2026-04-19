import { loadWordpadTemplate } from '../../scripts/wordpad.js';

const contentEl = document.querySelector(
  '.win98-window[data-window-id="info"] .win98-content'
);

if (contentEl) {
  const html = await (await fetch('pages/info/content.html')).text();
  await loadWordpadTemplate(contentEl, { html });
}
