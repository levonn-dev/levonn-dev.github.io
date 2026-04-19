export default {
  name: 'open',
  description: 'Open a window by id  (e.g. open info)',
  execute(args, terminal) {
    const id = args[0];
    if (!id) { terminal.print('Usage: open <window-id>', 'error'); return; }
    if (!window.windowManager || !window.windowManager.configs.has(id)) {
      terminal.print(`Unknown window: "${id}"`, 'error');
      return;
    }
    window.windowManager.open(id);
    terminal.print(`Opened: ${id}`, 'success');
  },
};
