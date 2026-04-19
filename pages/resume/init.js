import { loadIE6Template } from '../../scripts/ie6.js';

const contentEl = document.querySelector(
  '.win98-window[data-window-id="resume"] .win98-content'
);

if (contentEl) {
  const html = await (await fetch('pages/resume/content.html')).text();
  await loadIE6Template(contentEl, {
    url: 'file:///C:/Documents/Resume-v5.html',
    html,
  });
}
