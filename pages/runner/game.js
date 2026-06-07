import { aabb, speedForScore, bestScore } from './mechanics.js';

const HERO_W = 17;          // assets/cursors/default.png natural size
const HERO_H = 25;
const HERO_X = 44;          // fixed horizontal position of the hero
const GROUND_Y = 150;       // y of the ground line (hero stands on it)
const GRAVITY = 0.7;        // downward accel per 60fps frame
const JUMP_V = -11;         // upward velocity applied on a jump
const OB_SIZE = 28;         // drawn obstacle size (icons are 32x32)
const SCORE_RATE = 0.25;    // score gained per 60fps frame while running
const MIN_GAP = 60;         // min frames between obstacle spawns
const MAX_GAP = 130;        // max frames between obstacle spawns
const HS_KEY = 'runner.highScore';

const HERO_SRC = 'assets/cursors/default.png';
const OBSTACLE_SRCS = [
  'assets/icons/folder.png',
  'assets/icons/computer.png',
  'assets/icons/desktop.png',
  'assets/icons/terminal.png',
  'assets/icons/wordpad.png',
  'assets/icons/mediaplayer.png',
  'assets/icons/ie.png',
];

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function readHighScore() {
  try {
    return Number(localStorage.getItem(HS_KEY)) || 0;
  } catch {
    return 0; // storage unavailable (private mode); session-only high score
  }
}

function writeHighScore(value) {
  try {
    localStorage.setItem(HS_KEY, String(value));
  } catch {
    /* storage unavailable; keep session-only */
  }
}

export class Game {
  constructor(canvas, windowEl) {
    this.canvas = canvas;
    this.windowEl = windowEl;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;

    this.hero = loadImage(HERO_SRC);
    this.obstacleImgs = OBSTACLE_SRCS.map(loadImage);

    this.high = readHighScore();
    this.lastTs = 0;
    this.reset();

    this._onKey = this._onKey.bind(this);
    this._onPointer = this._onPointer.bind(this);
    this._frame = this._frame.bind(this);
  }

  reset() {
    this.state = 'ready';                 // 'ready' | 'running' | 'over'
    this.heroY = GROUND_Y - HERO_H;
    this.heroVy = 0;
    this.onGround = true;
    this.obstacles = [];
    this.spawnTimer = MAX_GAP;
    this.score = 0;
  }

  start() {
    document.addEventListener('keydown', this._onKey);
    this.canvas.addEventListener('pointerdown', this._onPointer);
    requestAnimationFrame(this._frame);
  }

  // Jump / start / restart depending on current state.
  _action() {
    if (this.state === 'ready') {
      this.state = 'running';
    } else if (this.state === 'over') {
      this.reset();
      this.state = 'running';
    } else if (this.onGround) {
      this.heroVy = JUMP_V;
      this.onGround = false;
    }
  }

  _onKey(e) {
    if (e.key !== ' ' && e.key !== 'ArrowUp') return;
    // Only react when the runner window is focused, so we never steal keys from
    // other windows (e.g. the terminal).
    if (!this.windowEl.classList.contains('focused')) return;
    e.preventDefault();
    this._action();
  }

  _onPointer(e) {
    e.preventDefault();
    this._action();
  }

  _frame(ts) {
    requestAnimationFrame(this._frame);

    // Pause cleanly when the window is closed/hidden/minimized or the tab is
    // backgrounded. The module runs only once, so this is how reopening the
    // window via the Konami code resumes the same loop.
    if (this.canvas.offsetParent === null || document.hidden) {
      this.lastTs = ts;
      return;
    }

    const dt = this.lastTs ? ts - this.lastTs : 1000 / 60;
    this.lastTs = ts;
    const f = Math.min(dt / (1000 / 60), 2); // frame factor, capped vs tunneling

    if (this.state === 'running') this._update(f);
    this._draw();
  }

  _update(f) {
    // Hero physics
    this.heroVy += GRAVITY * f;
    this.heroY += this.heroVy * f;
    const floor = GROUND_Y - HERO_H;
    if (this.heroY >= floor) {
      this.heroY = floor;
      this.heroVy = 0;
      this.onGround = true;
    }

    // Obstacles: spawn, move, cull
    const speed = speedForScore(this.score);
    this.spawnTimer -= f;
    if (this.spawnTimer <= 0) {
      const img = this.obstacleImgs[Math.floor(Math.random() * this.obstacleImgs.length)];
      this.obstacles.push({ x: this.canvas.width, y: GROUND_Y - OB_SIZE, w: OB_SIZE, h: OB_SIZE, img });
      this.spawnTimer = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    }
    for (const o of this.obstacles) o.x -= speed * f;
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > 0);

    // Score (incremented before the collision check so the value saved as the
    // high score matches what is displayed on the death frame)
    this.score += SCORE_RATE * f;

    // Collision -> game over
    const heroBox = { x: HERO_X, y: this.heroY, w: HERO_W, h: HERO_H };
    if (this.obstacles.some((o) => aabb(heroBox, o))) {
      this.state = 'over';
      this.high = bestScore(this.high, Math.floor(this.score));
      writeHighScore(this.high);
    }
  }

  _draw() {
    const { ctx, canvas } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground line
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Obstacles
    for (const o of this.obstacles) {
      if (o.img.complete) ctx.drawImage(o.img, Math.round(o.x), o.y, o.w, o.h);
    }

    // Hero
    if (this.hero.complete) ctx.drawImage(this.hero, HERO_X, Math.round(this.heroY), HERO_W, HERO_H);

    // Score / high score (top-right)
    ctx.fillStyle = '#2b2b2b';
    ctx.font = '14px "MononokiNerdFont", monospace';
    ctx.textAlign = 'right';
    const hi = String(this.high).padStart(5, '0');
    const cur = String(Math.floor(this.score)).padStart(5, '0');
    ctx.fillText(`HI ${hi}  ${cur}`, canvas.width - 8, 22);

    // Ready / over overlay
    if (this.state !== 'running') {
      ctx.textAlign = 'center';
      const msg = this.state === 'ready'
        ? 'Press Space to start'
        : 'Game Over - Space to retry';
      ctx.fillText(msg, canvas.width / 2, GROUND_Y / 2);
      ctx.textAlign = 'right';
    }
  }
}
