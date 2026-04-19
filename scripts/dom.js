// Shared DOM utilities used across template loaders and the WindowManager.

// Extract <link rel="stylesheet"> and <script type="module"> tags from a
// container, inject them into document.head (deduped by href/src), and remove
// them from the container. Uses iteration rather than selector-with-interpolation
// for dedup so attribute values with quotes or special chars cannot break it.
export function extractAssets(container) {
  container.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !hasStylesheet(href)) {
      const el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = href;
      document.head.appendChild(el);
    }
    link.remove();
  });

  container.querySelectorAll('script[type="module"]').forEach(script => {
    const src = script.getAttribute('src');
    if (src && !hasScript(src)) {
      const el = document.createElement('script');
      el.type = 'module';
      el.src = src;
      document.head.appendChild(el);
    }
    script.remove();
  });
}

function hasStylesheet(href) {
  for (const el of document.head.querySelectorAll('link[rel="stylesheet"]')) {
    if (el.getAttribute('href') === href) return true;
  }
  return false;
}

function hasScript(src) {
  for (const el of document.head.querySelectorAll('script[type="module"]')) {
    if (el.getAttribute('src') === src) return true;
  }
  return false;
}

// Fetch an HTML template file, cache the parsed <template> contents as a
// DocumentFragment, and return a deep clone for each call. Any <link> or
// <script type="module"> tags in the template are extracted once (on first
// load) into document.head, so templates can ship self-contained CSS refs.
export function templateLoader(url) {
  let cached = null;
  return async function load() {
    if (!cached) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const t = document.createElement('template');
      t.innerHTML = await res.text();
      cached = t.content;
      extractAssets(cached);
    }
    return cached.cloneNode(true);
  };
}
