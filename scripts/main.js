import { WINDOWS } from './windows.js';
import { extractAssets } from './dom.js';

// Exposed globally so page scripts (e.g. terminal.js) can call windowManager.open()
window.windowManager = null;

document.addEventListener('DOMContentLoaded', () => {
  window.windowManager = new WindowManager(WINDOWS);
  const iconGrid = new IconGrid(WINDOWS, window.windowManager);
  const taskbar = new Taskbar(window.windowManager);
  const clock = new Clock(document.getElementById('taskbar-clock'));

  iconGrid.render();
  taskbar.render();
  clock.start();
});

// === WindowManager ============================================================
class WindowManager {
  constructor(configs) {
    this.configs = new Map(configs.map(c => [c.id, c]));
    this._windows = new Map(); // id -> { el, state, contentLoaded, prevRect }
    this._z = 100;
    this._container = document.getElementById('window-container');
    this._taskbarWindows = document.getElementById('taskbar-windows');

    // Close start menu on any desktop click
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('#start-area')) {
        document.getElementById('start-menu').classList.add('hidden');
      }
    });
  }

  // == Public API ============================================================

  open(id) {
    if (!this._windows.has(id)) {
      const config = this.configs.get(id);
      if (!config) return;
      this._initWindow(id, config);
    }
    this._show(id);
  }

  close(id) {
    const win = this._windows.get(id);
    if (!win) return;
    win.el.style.display = 'none';
    win.state = 'closed';
    this._hideTaskbarBtn(id);
    this._defocusAll();
  }

  focus(id) {
    this._defocusAll();
    const win = this._windows.get(id);
    if (!win) return;
    this._z++;
    win.el.style.zIndex = this._z;
    win.el.classList.add('focused');
    this._highlightTaskbarBtn(id);
  }

  openDynamic(config) {
    // For windows not in the static registry (game sub-pages, project details).
    // Dynamic configs are stored per-window, not in this.configs, so they don't
    // leak into surfaces that enumerate the static registry (e.g. the terminal).
    // config: { id, title, icon, width, height, src?, html? }
    if (!this._windows.has(config.id)) {
      this._initWindow(config.id, config);
    }
    this._show(config.id);
  }

  // == Private ===============================================================

  _show(id) {
    const win = this._windows.get(id);
    if (!win) return;
    if (win.state === 'closed' || win.state === 'minimized') {
      win.el.style.display = 'flex';
    }
    if (win.state !== 'maximized') {
      win.state = 'open';
    }
    this._showTaskbarBtn(id);
    this.focus(id);
    this._loadContent(id);
  }

  _initWindow(id, config) {
    const el = this._buildEl(id, config);
    this._container.appendChild(el);

    // Default position: cascade from top-left, wrap after 10 windows
    const offset = (this._windows.size * 24) % 240;
    el.style.left = `${60 + offset}px`;
    el.style.top  = `${40 + offset}px`;
    el.style.width  = `${config.width}px`;
    el.style.height = `${config.height}px`;

    this._windows.set(id, { el, state: 'closed', contentLoaded: false, prevRect: null, config });
    this._bindWindowEvents(id, el);
    this._bindDrag(id, el);
    this._bindResize(id, el);
  }

  _buildEl(id, config) {
    const el = document.createElement('div');
    el.className = 'win98-window';
    el.dataset.windowId = id;
    el.style.display = 'none';

    const titleBar = document.createElement('div');
    titleBar.className = 'win98-title-bar';

    const icon = document.createElement('img');
    icon.src = config.icon;
    icon.alt = '';

    const titleText = document.createElement('span');
    titleText.className = 'win98-title-text';
    titleText.textContent = config.title;

    const buttons = document.createElement('div');
    buttons.className = 'win98-title-buttons';
    for (const [cls, label] of [
      ['win98-minimize', 'Minimize'],
      ['win98-maximize', 'Maximize'],
      ['win98-close',    'Close'],
    ]) {
      const btn = document.createElement('button');
      btn.className = cls;
      btn.title = label;
      buttons.appendChild(btn);
    }

    titleBar.append(icon, titleText, buttons);

    const content = document.createElement('div');
    content.className = 'win98-content';

    el.append(titleBar, content);

    for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      const handle = document.createElement('div');
      handle.className = `win98-resize win98-resize-${dir}`;
      el.appendChild(handle);
    }

    return el;
  }

  _bindWindowEvents(id, el) {
    el.addEventListener('mousedown', () => this.focus(id));
    el.querySelector('.win98-close').addEventListener('click', (e) => { e.stopPropagation(); this.close(id); });
    el.querySelector('.win98-minimize').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(id); });
    el.querySelector('.win98-maximize').addEventListener('click', (e) => { e.stopPropagation(); this.maximize(id); });
  }

  _defocusAll() {
    this._windows.forEach(({ el }) => el.classList.remove('focused'));
    this._taskbarWindows.querySelectorAll('.taskbar-win-btn').forEach(b => b.classList.remove('active'));
  }

  _showTaskbarBtn(id) {
    if (this._taskbarWindows.querySelector(`[data-window-id="${id}"]`)) return;
    const config = this._windows.get(id).config;
    const btn = document.createElement('button');
    btn.className = 'taskbar-win-btn raised';
    btn.dataset.windowId = id;
    btn.textContent = config.title;
    btn.addEventListener('click', () => {
      const win = this._windows.get(id);
      if (win.state === 'minimized') {
        this.restore(id);
      } else if (win.el.classList.contains('focused')) {
        this.minimize(id);
      } else {
        this.focus(id);
      }
    });
    this._taskbarWindows.appendChild(btn);
  }

  _hideTaskbarBtn(id) {
    const btn = this._taskbarWindows.querySelector(`[data-window-id="${id}"]`);
    if (btn) btn.remove();
  }

  _highlightTaskbarBtn(id) {
    const btn = this._taskbarWindows.querySelector(`[data-window-id="${id}"]`);
    if (btn) btn.classList.add('active');
  }

  minimize(id) {
    const win = this._windows.get(id);
    if (!win || win.state === 'minimized') return;
    win.el.style.display = 'none';
    win.state = 'minimized';
    this._defocusAll();
    const btn = this._taskbarWindows.querySelector(`[data-window-id="${id}"]`);
    if (btn) btn.classList.remove('active');
  }

  maximize(id) {
    const win = this._windows.get(id);
    if (!win || win.state === 'minimized') return;
    if (win.state === 'maximized') {
      this.restore(id);
      return;
    }
    win.prevRect = {
      left:   win.el.style.left,
      top:    win.el.style.top,
      width:  win.el.style.width,
      height: win.el.style.height,
    };
    const desktop = document.getElementById('desktop');
    win.el.style.left   = '0px';
    win.el.style.top    = '0px';
    win.el.style.width  = `${desktop.clientWidth}px`;
    win.el.style.height = `${desktop.clientHeight}px`;
    win.state = 'maximized';
    win.el.querySelectorAll('.win98-resize').forEach(h => h.style.display = 'none');
  }

  restore(id) {
    const win = this._windows.get(id);
    if (!win) return;
    if (win.state === 'minimized') {
      win.el.style.display = 'flex';
      win.state = 'open';
      this.focus(id);
      return;
    }
    if (win.state === 'maximized' && win.prevRect) {
      Object.assign(win.el.style, win.prevRect);
      win.state = 'open';
      win.el.querySelectorAll('.win98-resize').forEach(h => h.style.display = '');
    }
  }

  _loadContent(id) {
    const win = this._windows.get(id);
    if (!win || win.contentLoaded) return Promise.resolve();
    if (win.loadingPromise) return win.loadingPromise;

    const config  = win.config;
    const content = win.el.querySelector('.win98-content');

    win.loadingPromise = (async () => {
      if (config.html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = config.html;
        extractAssets(tmp);
        content.innerHTML = tmp.innerHTML;
        return;
      }

      if (!config.src) return;

      try {
        const res = await fetch(config.src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // Pages can declare their own <link> and <script> tags; extract them
        // into document.head so pages remain self-contained.
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        extractAssets(tmp);

        content.innerHTML = tmp.innerHTML;
      } catch (err) {
        const p = document.createElement('p');
        p.style.cssText = 'padding:8px;color:red;';
        p.textContent = `Failed to load: ${config.src}`;
        content.innerHTML = '';
        content.appendChild(p);
      }
    })().then(() => { win.contentLoaded = true; });

    return win.loadingPromise;
  }
  _bindDrag(id, el) {
    const titleBar = el.querySelector('.win98-title-bar');

    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win98-title-buttons')) return;
      e.preventDefault();
      const startX    = e.clientX;
      const startY    = e.clientY;
      const startLeft = el.offsetLeft;
      const startTop  = el.offsetTop;

      const onMove = (e) => {
        el.style.left = `${startLeft + (e.clientX - startX)}px`;
        el.style.top  = `${startTop  + (e.clientY - startY)}px`;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
  _bindResize(id, el) {
    const handles = el.querySelectorAll('.win98-resize');
    handles.forEach(handle => {
      const cls = [...handle.classList].find(c => c.startsWith('win98-resize-') && c !== 'win98-resize');
      if (!cls) return;
      const dir = cls.replace('win98-resize-', '');

      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const startX  = e.clientX;
        const startY  = e.clientY;
        const startW  = el.offsetWidth;
        const startH  = el.offsetHeight;
        const startL  = el.offsetLeft;
        const startT  = el.offsetTop;
        const minW = 120, minH = 60;

        const onMove = (e) => {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          if (dir.includes('e')) el.style.width  = `${Math.max(minW, startW + dx)}px`;
          if (dir.includes('s')) el.style.height = `${Math.max(minH, startH + dy)}px`;
          if (dir.includes('w')) {
            const newW = Math.max(minW, startW - dx);
            el.style.width = `${newW}px`;
            el.style.left  = `${startL + (startW - newW)}px`;
          }
          if (dir.includes('n')) {
            const newH = Math.max(minH, startH - dy);
            el.style.height = `${newH}px`;
            el.style.top    = `${startT + (startH - newH)}px`;
          }
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }
}

// === IconGrid =================================================================
class IconGrid {
  constructor(configs, windowManager) {
    this._configs = configs;
    this._wm = windowManager;
    this._el = document.getElementById('icon-grid');
    this._GRID = 80;
  }

  render() {
    this._el.innerHTML = '';
    this._configs.forEach((config, i) => {
      const icon = this._buildIcon(config, i);
      this._el.appendChild(icon);
    });
    this._restorePositions();
  }

  _buildIcon(config, index) {
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.dataset.windowId = config.id;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'desktop-icon-image';

    const img = document.createElement('img');
    img.src = config.icon; img.alt = config.title; img.draggable = false;
    imgWrap.appendChild(img);

    if (config.shortcut) {
      const sc = document.createElement('img');
      sc.src = 'assets/icons/shortcut.png';
      sc.className = 'desktop-icon-shortcut';
      sc.draggable = false;
      imgWrap.appendChild(sc);
    }

    const label = document.createElement('span');
    label.textContent = config.title;

    el.appendChild(imgWrap);
    el.appendChild(label);

    el.style.left = `0px`;
    el.style.top  = `${index * this._GRID}px`;
    el.tabIndex   = 0;

    el.addEventListener('dblclick', () => this._wm.open(config.id));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._wm.open(config.id);
      }
    });
    this._bindIconDrag(el);
    return el;
  }

  _bindIconDrag(el) {
    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const startX    = e.clientX;
      const startY    = e.clientY;
      const startLeft = el.offsetLeft;
      const startTop  = el.offsetTop;
      el.classList.add('dragging');

      const onMove = (e) => {
        el.style.left = `${startLeft + (e.clientX - startX)}px`;
        el.style.top  = `${startTop  + (e.clientY - startY)}px`;
      };
      const onUp = () => {
        el.classList.remove('dragging');
        const container  = this._el;
        const maxLeft    = container.clientWidth  - el.offsetWidth;
        const maxTop     = container.clientHeight - el.offsetHeight;
        const snappedLeft = Math.round(el.offsetLeft / this._GRID) * this._GRID;
        const snappedTop  = Math.round(el.offsetTop  / this._GRID) * this._GRID;
        el.style.left = `${Math.min(maxLeft, Math.max(0, snappedLeft))}px`;
        el.style.top  = `${Math.min(maxTop,  Math.max(0, snappedTop))}px`;
        this._savePositions();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  _savePositions() {
    const positions = {};
    this._el.querySelectorAll('.desktop-icon').forEach(el => {
      positions[el.dataset.windowId] = { left: el.style.left, top: el.style.top };
    });
    localStorage.setItem('desktop-icon-positions', JSON.stringify(positions));
  }

  _restorePositions() {
    try {
      const saved = JSON.parse(localStorage.getItem('desktop-icon-positions') || '{}');
      this._el.querySelectorAll('.desktop-icon').forEach(el => {
        const pos = saved[el.dataset.windowId];
        if (pos) { el.style.left = pos.left; el.style.top = pos.top; }
      });
    } catch (_) { /* corrupt localStorage; ignore, use defaults */ }
  }
}

// === Taskbar ==================================================================
class Taskbar {
  constructor(windowManager) {
    this._wm = windowManager;
  }

  render() {
    const startBtn  = document.getElementById('start-btn');
    const startMenu = document.getElementById('start-menu');
    const menuItems = document.getElementById('start-menu-items');

    this._wm.configs.forEach((config) => {
      const item = document.createElement('button');
      item.className = 'start-menu-item';
      const menuImg = document.createElement('img');
      menuImg.src = config.icon; menuImg.alt = '';
      const menuLabel = document.createElement('span');
      menuLabel.textContent = config.title;
      item.appendChild(menuImg); item.appendChild(menuLabel);
      item.addEventListener('click', () => {
        this._wm.open(config.id);
        startMenu.classList.add('hidden');
      });
      menuItems.appendChild(item);
    });

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startMenu.classList.toggle('hidden');
    });
  }
}

// === Clock ====================================================================
class Clock {
  constructor(el) {
    this._el = el;
  }

  start() {
    this._tick();
    setInterval(() => this._tick(), 1000);
  }

  _tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this._el.textContent = `${hh}:${mm}`;
  }
}
