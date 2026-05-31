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
    id: 'fox-weather',
    name: 'Fox Weather',
    icon: 'assets/icons/fox_weather.png',
    description: 'A Pebble watchface adapted from Pebble Adventure. The background scene changes with live weather' +
        ' (clear, cloudy, rain, thunder, snow) fetched from Open-Meteo via PebbleKit JS, with a pixel fox sitting or' +
        ' walking on the ground and the time, date, battery, and temperature overlaid on top.\n\n' +
        'Animates in short bursts after each minute change and on wrist-shake to stay easy on the battery.' +
        ' Configurable temperature unit and fox mode via a Clay settings page. Runs on both Pebble Time 2 (color)' +
        ' and Pebble 2 Duo (B&W).',
    url: 'https://apps.repebble.com/fox-weather_5841886baf734898822e2899',
    tags: ['c', 'js', 'pebble', 'watchface'],
    year: 2026,
  },
  {
    id: 'setup-pebble',
    name: 'Setup Pebble',
    icon: 'assets/icons/setup-pebble.png',
    description: 'A GitHub Action that sets up the Pebble (Core Devices) SDK build environment and, optionally,' +
        ' compiles a Pebble app or watchface into a .pbw. It behaves like setup-node or setup-go: it installs the' +
        ' toolchain so later steps can run pebble commands, and with build: true it runs pebble build and exposes' +
        ' the resulting .pbw as an output.',
    url: 'https://github.com/marketplace/actions/setup-pebble-sdk',
    tags: ['github-actions', 'pebble', 'ci', 'bash'],
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
    id: 'notepad',
    name: 'Multiplayer Notepad',
    icon: 'assets/icons/wordpad.png',
    description: 'A real-time collaborative notepad with four editor variants (rich text, plain code, Ace, and a' +
        ' user-list demo), all synced through the Firebase Realtime Database. Built as a stripped-down fork of' +
        " Google's now-archived Firepad examples page.\n\n" +
        'The page is gated behind Sign in with Google, with an email allowlist enforced entirely by Firebase' +
        ' Security Rules, so there is no server-side code. Zero build step: plain static HTML, CSS, and JS that' +
        ' deploys anywhere.',
    url: 'https://github.com/levonn-dev/notepad',
    tags: ['html', 'js', 'css', 'firebase', 'oauth'],
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
