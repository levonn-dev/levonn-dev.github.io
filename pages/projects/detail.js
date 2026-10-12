import { loadExplorerTemplate } from '../../scripts/explorer.js';
import { projects } from './projects.js';
import { splitLinks } from './links.js';

const contentEl = document.querySelector(
  '.win98-window[data-window-id="projects"] .win98-content'
);

if (contentEl) {
  await loadExplorerTemplate(contentEl, {
    path: 'Projects',
    items: projects,
    onItemClick: openDetail,
  });
}

let detailTemplateCache = null;
const populated = new Set();

async function openDetail(project) {
  if (!detailTemplateCache) {
    try {
      const res = await fetch('pages/projects/detail.html');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      detailTemplateCache = await res.text();
    } catch (err) {
      console.error('Failed to load detail template:', err);
      return;
    }
  }

  const id = `project-detail-${project.id}`;
  await window.windowManager.openDynamic({
    id,
    title:  project.name,
    icon:   project.icon,
    width:  430,
    height: 310,   // initial; fitted to the content once populated
    html:   detailTemplateCache,
  });

  if (populated.has(id)) return;

  const content = document.querySelector(
    `.win98-window[data-window-id="${id}"] .win98-content`
  );
  if (!content) return;

  content.querySelector('#detail-icon').src                = project.icon;
  content.querySelector('#detail-name').textContent        = project.name;
  content.querySelector('#detail-year').textContent        = project.year;
  content.querySelector('#detail-url').href                = project.url;

  content.querySelector('#detail-description').replaceChildren(
    ...splitLinks(project.description).map(seg => {
      if (!seg.id) return seg.text;
      const link = document.createElement('a');
      link.textContent = seg.text;
      link.href = '#';
      link.addEventListener('click', e => {
        e.preventDefault();
        openDetail(projects.find(p => p.id === seg.id));
      });
      return link;
    })
  );

  const tagsEl = content.querySelector('#detail-tags');
  tagsEl.replaceChildren(
    ...project.tags.map(t => {
      const span = document.createElement('span');
      span.textContent = t;
      return span;
    })
  );

  window.windowManager.fitToContent(id);
  populated.add(id);
}
