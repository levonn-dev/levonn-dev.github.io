import { Game } from './game.js';

const root = document.querySelector('.win98-window[data-window-id="runner"]');
const content = root?.querySelector('.win98-content');

if (content) {
  const canvas = document.createElement('canvas');
  canvas.className = 'runner-canvas';
  canvas.width = 600;
  canvas.height = 180;
  content.appendChild(canvas);

  if (canvas.getContext('2d')) {
    const game = new Game(canvas, root);
    game.start();
  }
}
