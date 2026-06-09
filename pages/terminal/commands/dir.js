export default {
  name: 'dir',
  description: 'List available windows',
  execute(_args, terminal) {
    terminal.print('Windows:');
    if (window.windowManager) {
      window.windowManager.configs.forEach(config => {
        terminal.print(`  ${config.id.padEnd(14)} ${config.title}`);
      });
    }
  },
};
