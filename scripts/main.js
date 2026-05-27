import { WINDOWS } from './windows.js';
import { extractAssets } from './dom.js';
import { isMobile, onViewportChange } from './viewport.js';

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
    this._windows = new Map(); // id -> { el, state, contentLoaded, prevRect, config, idx }
    this._z = 100;
    this._container = document.getElementById('window-container');
    this._taskbarWindows = document.getElementById('taskbar-windows');

    this.mobile = isMobile();
    onViewportChange((mobile) => this._onModeChange(mobile));

    // Close start menu on any desktop tap
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#start-area')) {
        document.getElementById('start-menu').classList.add('hidden');
      }
    });

    // Keep maximized / fullscreen windows fitted to the desktop as it resizes.
    let resizeRAF = null;
    window.addEventListener('resize', () => {
      if (resizeRAF) return;
      resizeRAF = requestAnimationFrame(() => {
        resizeRAF = null;
        this._refit();
      });
    });
  }

  // == Public API ============================================================

  open(id) {
    if (!this._windows.has(id)) {
      const config = this.configs.get(id);
      if (!config) return;
      this._initWindow(id, config);
    }
    return this._show(id);
  }

  close(id) {
    const win = this._windows.get(id);
    if (!win) return;
    win.el.style.display = 'none';
    win.state = 'closed';
    this._hideTaskbarBtn(id);
    this._defocusAll();
    if (win.closeHandlers) {
      win.closeHandlers.forEach(cb => { try { cb(); } catch (_) { /* swallow */ } });
    }
    // Mobile: only one window is visible at a time, so closing the foreground
    // window must reveal the next one in the stack, not an empty launcher.
    if (this.mobile) {
      const next = this._topOpenWindow();
      if (next) { this._enterFullscreen(next); this.focus(next); }
    }
  }

  // Register a callback fired when the given window is closed. Multiple
  // handlers can be registered per window. Used by content scripts that need
  // to release resources (e.g. pause audio when the music window closes).
  onClose(id, callback) {
    const win = this._windows.get(id);
    if (!win) return;
    if (!win.closeHandlers) win.closeHandlers = [];
    win.closeHandlers.push(callback);
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
    return this._show(config.id);
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
    if (this.mobile) this._enterFullscreen(id);
    this._showTaskbarBtn(id);
    this.focus(id);
    return this._loadContent(id);
  }

  // Mobile: the given window fills the desktop and becomes the only visible one.
  _enterFullscreen(id) {
    const desktop = document.getElementById('desktop');
    this._windows.forEach((w, wid) => {
      if (wid !== id && (w.state === 'open' || w.state === 'maximized')) {
        w.el.style.display = 'none';
      }
    });
    const win = this._windows.get(id);
    win.el.style.display = 'flex';
    win.el.style.left    = '0px';
    win.el.style.top     = '0px';
    win.el.style.width   = `${desktop.clientWidth}px`;
    win.el.style.height  = `${desktop.clientHeight}px`;
    win.el.querySelectorAll('.win98-resize').forEach(h => h.style.display = 'none');
  }

  // The top-most window that is open (or maximized), by z-index, or null.
  // Used to pick which window becomes visible in mobile mode.
  _topOpenWindow() {
    const open = [...this._windows].filter(([, w]) => w.state === 'open' || w.state === 'maximized');
    if (!open.length) return null;
    open.sort((a, b) => (+b[1].el.style.zIndex || 0) - (+a[1].el.style.zIndex || 0));
    return open[0][0];
  }

  // Mobile "Home": minimize whatever app is foregrounded so the icon launcher shows.
  goHome() {
    this._windows.forEach((win, id) => {
      if (win.state === 'open' || win.state === 'maximized') this.minimize(id);
    });
  }

  // Restore a window to its clamped windowed rect (used when leaving mobile mode).
  _applyDefaultRect(id) {
    const win  = this._windows.get(id);
    const rect = this._clampRect(win.config, win.idx);
    win.el.style.left   = `${rect.left}px`;
    win.el.style.top    = `${rect.top}px`;
    win.el.style.width  = `${rect.width}px`;
    win.el.style.height = `${rect.height}px`;
  }

  _onModeChange(mobile) {
    this.mobile = mobile;
    const desktop = document.getElementById('desktop');

    if (mobile) {
      // The desktop Start menu has no place in mobile mode; dismiss it if open.
      document.getElementById('start-menu').classList.add('hidden');
      // Entering mobile: hide all resize handles, then fullscreen one app so the
      // "single visible app" invariant holds even when nothing is focused.
      this._windows.forEach((win) => {
        win.el.querySelectorAll('.win98-resize').forEach(h => h.style.display = 'none');
      });
      const focused = [...this._windows].find(([, w]) => w.el.classList.contains('focused'));
      const targetId = focused ? focused[0] : this._topOpenWindow();
      if (targetId) this._enterFullscreen(targetId);
    } else {
      // Leaving mobile: restore the windowed layout. Maximized windows stay
      // maximized (refit to the desktop, handles hidden); open windows return to
      // their clamped default rect with handles visible again.
      this._windows.forEach((win, id) => {
        const maximized = win.state === 'maximized';
        win.el.querySelectorAll('.win98-resize').forEach(h => h.style.display = maximized ? 'none' : '');
        if (maximized) {
          win.el.style.display = 'flex';
          win.el.style.left   = '0px';
          win.el.style.top    = '0px';
          win.el.style.width  = `${desktop.clientWidth}px`;
          win.el.style.height = `${desktop.clientHeight}px`;
        } else if (win.state === 'open') {
          win.el.style.display = 'flex';
          this._applyDefaultRect(id);
        }
      });
    }
  }

  _initWindow(id, config) {
    const el = this._buildEl(id, config);
    this._container.appendChild(el);

    const idx  = this._windows.size;            // creation order, used for cascade + restore
    const rect = this._clampRect(config, idx);
    el.style.left   = `${rect.left}px`;
    el.style.top    = `${rect.top}px`;
    el.style.width  = `${rect.width}px`;
    el.style.height = `${rect.height}px`;

    this._windows.set(id, { el, state: 'closed', contentLoaded: false, prevRect: null, config, idx });
    this._bindWindowEvents(id, el);
    this._bindDrag(id, el);
    this._bindResize(id, el);
  }

  // Default windowed rect: requested size clamped to the desktop, cascaded by
  // creation order, kept fully on-screen.
  _clampRect(config, idx) {
    const desktop = document.getElementById('desktop');
    const margin  = 8;
    const width   = Math.min(config.width,  desktop.clientWidth  - margin * 2);
    const height  = Math.min(config.height, desktop.clientHeight - margin * 2);
    const offset  = (idx * 24) % 240;
    const left    = Math.max(0, Math.min(60 + offset, desktop.clientWidth  - width));
    const top     = Math.max(0, Math.min(40 + offset, desktop.clientHeight - height));
    return { left, top, width, height };
  }

  // Re-fit windows that should track the desktop size: maximized windows always,
  // and every open window while in mobile fullscreen mode (Task 5).
  _refit() {
    const desktop = document.getElementById('desktop');
    this._windows.forEach((win) => {
      const tracks = win.state === 'maximized'
        || (this.mobile && (win.state === 'open' || win.state === 'maximized'));
      if (!tracks) return;
      win.el.style.left   = '0px';
      win.el.style.top    = '0px';
      win.el.style.width  = `${desktop.clientWidth}px`;
      win.el.style.height = `${desktop.clientHeight}px`;
    });
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
    el.addEventListener('pointerdown', () => this.focus(id));
    el.querySelector('.win98-close').addEventListener('click', (e) => { e.stopPropagation(); this.close(id); });
    el.querySelector('.win98-minimize').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(id); });
    el.querySelector('.win98-maximize').addEventListener('click', (e) => { e.stopPropagation(); if (this.mobile) return; this.maximize(id); });
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
    btn.title = config.title;   // tooltip when the label is truncated; accessible name when it's hidden (mobile)

    const btnImg = document.createElement('img');
    btnImg.src = config.icon; btnImg.alt = '';
    const btnLabel = document.createElement('span');
    btnLabel.className = 'taskbar-win-label';
    btnLabel.textContent = config.title;
    btn.append(btnImg, btnLabel);
    btn.addEventListener('click', () => {
      const win = this._windows.get(id);
      if (win.state === 'minimized') {
        this.restore(id);
        if (this.mobile) this._enterFullscreen(id);
      } else if (win.el.classList.contains('focused')) {
        this.minimize(id);                 // mobile: hides the app, revealing the launcher (Home)
      } else {
        this.focus(id);
        if (this.mobile) this._enterFullscreen(id);
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

    titleBar.addEventListener('pointerdown', (e) => {
      if (this.mobile) return;                         // no window dragging in mobile mode (Task 5)
      if (e.target.closest('.win98-title-buttons')) return;
      e.preventDefault();
      titleBar.setPointerCapture(e.pointerId);
      const startX    = e.clientX;
      const startY    = e.clientY;
      const startLeft = el.offsetLeft;
      const startTop  = el.offsetTop;

      const onMove = (e) => {
        el.style.left = `${startLeft + (e.clientX - startX)}px`;
        el.style.top  = `${startTop  + (e.clientY - startY)}px`;
      };
      const onUp = (e) => {
        if (titleBar.hasPointerCapture(e.pointerId)) titleBar.releasePointerCapture(e.pointerId);
        titleBar.removeEventListener('pointermove', onMove);
        titleBar.removeEventListener('pointerup', onUp);
        titleBar.removeEventListener('pointercancel', onUp);
      };
      titleBar.addEventListener('pointermove', onMove);
      titleBar.addEventListener('pointerup', onUp);
      titleBar.addEventListener('pointercancel', onUp);
    });
  }
  _bindResize(id, el) {
    const handles = el.querySelectorAll('.win98-resize');
    handles.forEach(handle => {
      const cls = [...handle.classList].find(c => c.startsWith('win98-resize-') && c !== 'win98-resize');
      if (!cls) return;
      const dir = cls.replace('win98-resize-', '');

      handle.addEventListener('pointerdown', (e) => {
        if (this.mobile) return;                       // no resizing in mobile mode (Task 5)
        e.stopPropagation();
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
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

        const onUp = (e) => {
          if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', onUp);
          handle.removeEventListener('pointercancel', onUp);
        };

        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
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
    const TAP_THRESHOLD = 6; // px of movement below which a press counts as a tap, not a drag

    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const startX    = e.clientX;
      const startY    = e.clientY;
      const startLeft = el.offsetLeft;
      const startTop  = el.offsetTop;
      const draggable = !this._wm.mobile;   // icons are free-positioned only on desktop/tablet
      let moved = 0;

      el.setPointerCapture(e.pointerId);
      if (draggable) el.classList.add('dragging');

      const onMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        if (!draggable) return;
        el.style.left = `${startLeft + dx}px`;
        el.style.top  = `${startTop  + dy}px`;
      };

      const onUp = (e) => {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);

        if (draggable) {
          el.classList.remove('dragging');
          const container   = this._el;
          const maxLeft     = container.clientWidth  - el.offsetWidth;
          const maxTop      = container.clientHeight - el.offsetHeight;
          const snappedLeft = Math.round(el.offsetLeft / this._GRID) * this._GRID;
          const snappedTop  = Math.round(el.offsetTop  / this._GRID) * this._GRID;
          el.style.left = `${Math.min(maxLeft, Math.max(0, snappedLeft))}px`;
          el.style.top  = `${Math.min(maxTop,  Math.max(0, snappedTop))}px`;
          this._savePositions();
        }

        // Touch/pen tap (or any tap in mobile) opens the app; mouse still uses dblclick.
        // A pointercancel (browser stole the gesture, e.g. a scroll) is NOT a tap.
        if (e.type !== 'pointercancel' && moved < TAP_THRESHOLD && (this._wm.mobile || e.pointerType !== 'mouse')) {
          this._wm.open(el.dataset.windowId);
        }
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
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
      if (this._wm.mobile) {
        this._wm.goHome();
      } else {
        startMenu.classList.toggle('hidden');
      }
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
    // Align to the next minute boundary, then tick once per minute thereafter.
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
      this._tick();
      setInterval(() => this._tick(), 60_000);
    }, msToNextMinute);
  }

  _tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this._el.textContent = `${hh}:${mm}`;
  }
}
