export const projects = [
  {
    id: 'pebble',
    name: 'Pebble Adventure',
    icon: 'assets/icons/pebble_adventure.png',
    description: 'A game I created for Pebble smart watches. It is a virtual pet and RPG hybrid that progresses based on' +
        ' your real world step count as tracked by a background worker progress. It also includes multiple minigames,' +
        ' random encounters, biomes, fully integrated stats which effect all other aspects of the game, and a fully' +
        ' realized XP and Level progression system. Additionally it has nominal text input system based on the watch' +
        ' interface allowing for very quick binary-like search through full character sets.',
    url: 'https://apps.repebble.com/d50eaec84a5e410298a3d2c7',
    tags: ['c', 'pebble'],
    year: 2026,
  },
  {
    id: 'skills',
    name: 'Claude Code Skills',
    icon: 'assets/icons/gear.png',
    description: 'A collection of skills and plugins for Claude Code.',
    url: 'https://github.com/levonn-dev/skills',
    tags: ['claude-code', 'plugins', 'bash', 'markdown'],
    year: 2026,
  },
  {
    id: 'ro-builder',
    name: 'RO Builder',
    icon: 'assets/icons/ragnarok.png',
    description: 'An LLM-orchestrated build generator for Ragnarok Online. Given a class, server, playstyle, and a' +
        ' free-form description of what you want, it returns one or more build trajectories: ordered chains of' +
        ' stat, skill, and gear checkpoints from early game through max-level endgame, with deterministic combat' +
        ' numbers attached at the load-bearing checkpoints.\n\n' +
        'The LLM proposes builds and reasons over results; a deterministic calc backend does the math. The calc' +
        ' backend, the LLM provider, and the server profile are all pluggable.',
    url: 'https://github.com/levonn-dev/ro-builder',
    tags: ['go', 'typescript', 'llm', 'k8s'],
    year: 2026,
  },
  {
    id: 'www',
    name: 'This homepage',
    icon: 'assets/icons/computer.png',
    description: 'What originally started as multiple different small web projects combined into this homepage.\n\n' +
        'A completely static html/js/css site that can be deployed anywhere. Styled as a Win98 desktop with an' +
        ' interactive terminal. Includes content for professional and personal use.',
    url: 'https://github.com/levonn-dev/levonn-dev.github.io',
    tags: ['html', 'js', 'css'],
    year: 2026,
  },
];
