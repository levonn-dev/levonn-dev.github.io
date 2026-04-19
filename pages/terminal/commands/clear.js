export default {
  name: 'clear',
  description: 'Clear the terminal output',
  execute(_args, terminal) {
    terminal.clear();
  },
};
