export default {
  name: 'help',
  description: 'List available commands',
  execute(_args, terminal) {
    terminal.print('Available commands:');
    Object.values(terminal.commands).forEach(cmd => {
      terminal.print(`  ${cmd.name.padEnd(10)} ${cmd.description}`);
    });
  },
};
