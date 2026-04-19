# win98-desktop

A personal homepage styled as a Windows 98 desktop. Static site, no build step, no framework, hostable as-is.

## Quick Start

```bash
task check       # syntax-check all JS files (as ES modules)
task serve       # start local python HTTP server on localhost:8080
task open        # open the site in the default browser
task dev         # check + serve + open
```

Open `http://localhost:8080` in a modern browser.

> **Why a server?** ES modules (`import`/`export`) don't work over `file://`. A local HTTP server is required even for development.

## Tech Stack

- Vanilla HTML, CSS (custom properties), ES Modules
- No framework, no bundler, no build step
- Hostable on anywhere as-is (root or subdirectory)

## Architecture

Three layers, composed bottom-up:

1. **Desktop shell** (`scripts/main.js`): `WindowManager` builds Win98 window elements, `IconGrid` manages draggable desktop icons, `Taskbar` renders the Start menu and open-window buttons, `Clock` ticks the HH:MM readout.

2. **App chrome templates** (`templates/`): reusable Win98 application UIs, each a self-contained HTML + CSS pair. Current templates are `explorer` (Win98 file explorer), `ie6` (Internet Explorer 6), and `wordpad` (Wordpad editor). Each template declares its own CSS via a `<link>` tag at the top; when first loaded, that link is extracted into `<head>` (deduped).

3. **Page content** (`pages/<id>/`): the stuff that goes inside a window. Each page has an `index.html` that typically just declares a `<script type="module">` pointing to an `init.js`. The init script loads the appropriate chrome template and populates it.

The central registry is `scripts/windows.js`; pages do not declare themselves there, they are listed once as `{ id, title, icon, width, height, src, shortcut? }` entries.

## File Structure

```
www/
  index.html          desktop shell
  Taskfile.yml        task runner config (check, serve, open, dev)
  styles/
    main.css          global styles: theme, reset, desktop shell, window chrome, icons
  scripts/
    windows.js        static window registry
    main.js           WindowManager, IconGrid, Taskbar, Clock
    dom.js            shared utilities: extractAssets, templateLoader
    explorer.js       loadExplorerTemplate
    ie6.js            loadIE6Template
    wordpad.js        loadWordpadTemplate
  templates/          reusable Win98 app chrome, one HTML + CSS pair per template
    explorer.*        Win98 file explorer
    ie6.*             IE6 browser
    wordpad.*         Wordpad editor
  assets/
    fonts/            pixel font
    cursors/          custom cursors
    icons/            named after the Win98 app they depict
    wallpapers/       optional desktop wallpapers
  pages/
    info/             Wordpad page displaying meta site content
    terminal/         interactive terminal interface for the site
      commands/       each command for the terminal is a separate js file
        registry.js   static command registry
    resume/           IE6 page displaying current resume
    projects/         Explorer page with separate entries for each project
    games/            Explorer page with separate sub-pages for each game
    music/            Explorer page that will be populated later
```

## Adding Content

### New window

1. Add an entry to `scripts/windows.js`:
   ```js
   {
     id:     'blog',
     title:  'Blog',
     icon:   'assets/icons/wordpad.png',
     width:  600,
     height: 450,
     src:    'pages/blog/index.html',
   }
   ```
2. Create `pages/blog/index.html`. It should be a minimal fragment, no `<html>/<head>/<body>` tags. If the page needs its own script or stylesheet, declare them inline:
   ```html
   <link rel="stylesheet" href="pages/blog/style.css">
   <script type="module" src="pages/blog/init.js"></script>
   ```
   The desktop picks these up automatically and injects them into `<head>` (deduped).

That's it. The window appears in the Start menu and as a desktop icon.

### Use a shared app chrome template

Most pages wrap their content in a Win98 app chrome. The templates each have a single loader function with the same shape:

```js
// IE6 browser (pages/resume)
import { loadIE6Template } from '../../scripts/ie6.js';
const contentEl = document.querySelector('.win98-window[data-window-id="resume"] .win98-content');
await loadIE6Template(contentEl, { url: 'file:///C:/Documents/...', html: '<p>...</p>' });
```

```js
// Wordpad editor (pages/info)
import { loadWordpadTemplate } from '../../scripts/wordpad.js';
await loadWordpadTemplate(contentEl, { html: '<p>...</p>' });
```

```js
// File explorer (pages/projects, games, music)
import { loadExplorerTemplate } from '../../scripts/explorer.js';
await loadExplorerTemplate(contentEl, {
  path: 'Projects',
  items: [{ icon: '...', name: '...' }, /* ... */],
  onItemClick: (item) => { /* ... */ },
});
```

A typical init script fetches page content from a sibling `content.html` and passes it as `html`:

```js
const html = await (await fetch('pages/blog/content.html')).text();
await loadWordpadTemplate(contentEl, { html });
```

Any `<link>` or `<script type="module">` inside the content HTML is also extracted to `<head>` automatically.

### New project

Edit `pages/projects/projects.js` and add one object:

```js
{
  id:          'acme',
  name:        'Acme Widget',
  icon:        'assets/icons/folder.png',
  description: 'Short description.',
  url:         'https://github.com/you/acme',
  tags:        ['web', 'js'],
  year:        2025,
}
```

No other changes. The explorer grid and detail dialog populate from this config.

### New game

1. Add an entry to `pages/games/games.js`:
   ```js
   {
     id:     'sonic',
     name:   'Sonic the Hedgehog',
     icon:   'assets/icons/games.png',
     width:  600,
     height: 450,
   }
   ```
2. Create `pages/games/sonic/index.html`. It can be anything: a plain Win98 explorer view using `loadExplorerTemplate`, an IE6 page using `loadIE6Template`, something custom, or a direct-content fragment. Any stylesheet or script it needs should be declared inline in that file.

### New terminal command

1. Create `pages/terminal/commands/mycommand.js`:
   ```js
   export default {
     name:        'mycommand',
     description: 'What it does',
     execute(args, terminal) {
       terminal.print('Hello from mycommand.');
     },
   };
   ```
2. Add one line to `pages/terminal/commands/registry.js`:
   ```js
   export { default as mycommand } from './mycommand.js';
   ```

The terminal object exposes: `terminal.print(text, type?)` where `type` is `''`, `'error'`, or `'success'`; `terminal.clear()`; and `terminal.openWindow(id)`. Up/Down arrows cycle through command history.

## Theming

All colors are defined as CSS custom properties at the top of `styles/main.css`:

```css
:root {
  --desktop-bg-color: #008080;      /* teal desktop */
  --desktop-bg-image: none;         /* set to url(...) for a wallpaper */
  --window-bg:         #c0c0c0;
  --title-active-from: #000080;     /* title bar gradient start */
  --title-active-to:   #1084d0;     /* title bar gradient end */
  --title-inactive:    #808080;

  --border-light:   #ffffff;
  --border-mid:     #dfdfdf;
  --border-dark:    #808080;
  --border-darker:  #000000;

  --text:          #000000;
  --text-selected: #ffffff;
  --select-bg:     #000080;

  --taskbar-height: 32px;
}
```

All chrome (windows, explorer, IE6, Wordpad) reads from these. Edit only this block to retheme the entire site.

## Deployment

Push the repository. No build step required. All asset paths are root-relative and ES module imports are directory-relative (`../../scripts/...`), so deployment works whether the site lives at the root or in a project subdirectory.

## Development Notes

- **Icon positions** are saved to `localStorage` and persist across refreshes. Clear local storage to reset to defaults.
- **Window content is cached** per window entry. A page's HTML and assets are fetched on first open and reused on subsequent opens. Refresh the page to pick up content changes during development.
- **Dynamic windows** (project detail dialogs, game sub-windows) are tracked separately from the static window registry; they don't appear in terminal commands like `ls`.
