import * as commandModules from './commands/registry.js';

// terminal.js is injected as <script type="module"> into the page after the
// terminal HTML has been fetched and inserted into .win98-content.
// It finds the terminal DOM elements by ID directly.

const output = document.getElementById('term-output');
const input  = document.getElementById('term-input');

if (output && input) init();

function init() {
  const commands = {};
  Object.values(commandModules).forEach(cmd => { commands[cmd.name] = cmd; });

  const terminal = {
    commands,
    print(text, type = '') {
      const line = document.createElement('span');
      line.className = `term-line${type ? ` ${type}` : ''}`;
      line.textContent = text;
      output.appendChild(line);
      output.appendChild(document.createElement('br'));
      output.scrollTop = output.scrollHeight;
    },
    clear() {
      output.innerHTML = '';
    },
    openWindow(id) {
      if (window.windowManager) window.windowManager.open(id);
    },
  };

  terminal.print('Windows 98 Desktop [Version 4.10.1998]');
  terminal.print('Type "help" for available commands.');
  terminal.print('');

  const history = [];
  let historyIdx = 0;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx > 0) {
        historyIdx--;
        input.value = history[historyIdx];
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx < history.length - 1) {
        historyIdx++;
        input.value = history[historyIdx];
      } else {
        historyIdx = history.length;
        input.value = '';
      }
      return;
    }
    if (e.key !== 'Enter') return;

    const raw = input.value.trim();
    input.value = '';
    if (!raw) return;

    history.push(raw);
    historyIdx = history.length;

    terminal.print(`C:\\> ${raw}`);

    const [name, ...args] = raw.split(/\s+/);
    const cmd = commands[name.toLowerCase()];
    if (cmd) {
      cmd.execute(args, terminal);
    } else {
      terminal.print(`'${name}' is not recognized as an internal or external command.`, 'error');
    }
    terminal.print('');
  });

  // Focus input on click, but not when the user has just made a text selection
  // (clicking releases a drag that selected text; focusing the input would clear it)
  output.addEventListener('click', () => {
    if (window.getSelection().toString() === '') input.focus();
  });
  input.focus();
}
