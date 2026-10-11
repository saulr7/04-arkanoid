const CANVAS_W = 800;
const CANVAS_H = 600;

const COLS = 10;
const ROWS = 7;
const BLOCK_W = 64;
const BLOCK_H = 24;
const GRID_X = 80;
const GRID_Y = 60;
const ROW_COLORS = ["gray", "red", "yellow", "cyan", "magenta", "hotpink", "green"];
const MAX_DT = 0.05; // seconds

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const state = {
  phase: "ready", // 'ready' (ball stuck to paddle) | 'playing' | 'won' | 'lost'
  lives: 3,
  paddle: { x: 340, y: 560, w: 120, h: 14, speed: 600 },
  ball: { x: 0, y: 0, r: 8, vx: 0, vy: 0, speed: 420 },
  blocks: [],
  explosions: [],
};

function buildBlocks() {
  const blocks = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = ROW_COLORS[row];
      blocks.push({
        x: GRID_X + col * BLOCK_W,
        y: GRID_Y + row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color,
        hp: color === "gray" ? 2 : 1,
        alive: true,
      });
    }
  }
  return blocks;
}

function stickBallToPaddle() {
  const { paddle, ball } = state;
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.r;
}

const keys = { left: false, right: false };

function setKey(e, down) {
  switch (e.code) {
    case "ArrowLeft":
    case "KeyA":
      keys.left = down;
      e.preventDefault();
      break;
    case "ArrowRight":
    case "KeyD":
      keys.right = down;
      e.preventDefault();
      break;
  }
}

window.addEventListener("keydown", (e) => setKey(e, true));
window.addEventListener("keyup", (e) => setKey(e, false));

function clampPaddle() {
  const { paddle } = state;
  paddle.x = Math.max(0, Math.min(CANVAS_W - paddle.w, paddle.x));
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
  state.paddle.x = mouseX - state.paddle.w / 2;
  clampPaddle();
});

function launch() {
  if (state.phase !== "ready") return;
  const { ball } = state;
  ball.vx = 0;
  ball.vy = -ball.speed;
  state.phase = "playing";
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat) launch();
  }
});
canvas.addEventListener("mousedown", launch);

function moveBall(dt) {
  const { ball } = state;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.r > CANVAS_W) {
    ball.x = CANVAS_W - ball.r;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
  }
}

const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;

function renormalizeBall() {
  const { ball } = state;
  const len = Math.hypot(ball.vx, ball.vy);
  if (len === 0) return;
  ball.vx = (ball.vx / len) * ball.speed;
  ball.vy = (ball.vy / len) * ball.speed;
}

function collidePaddle() {
  const { ball, paddle } = state;
  if (ball.vy <= 0) return;
  const hit =
    ball.x + ball.r > paddle.x &&
    ball.x - ball.r < paddle.x + paddle.w &&
    ball.y + ball.r > paddle.y &&
    ball.y - ball.r < paddle.y + paddle.h;
  if (!hit) return;

  const offset = Math.max(
    -1,
    Math.min(1, (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2))
  );
  const angle = offset * MAX_BOUNCE_ANGLE; // from vertical
  ball.vx = Math.sin(angle) * ball.speed;
  ball.vy = -Math.cos(angle) * ball.speed;
  renormalizeBall();
  ball.y = paddle.y - ball.r;
}

function collideBlocks() {
  const { ball, blocks } = state;

  // Nearest overlapping alive block (by center distance)
  let hit = null;
  let hitDist = Infinity;
  let hitOverlapX = 0;
  let hitOverlapY = 0;
  for (const b of blocks) {
    if (!b.alive) continue;
    const overlapX = Math.min(ball.x + ball.r, b.x + b.w) - Math.max(ball.x - ball.r, b.x);
    const overlapY = Math.min(ball.y + ball.r, b.y + b.h) - Math.max(ball.y - ball.r, b.y);
    if (overlapX <= 0 || overlapY <= 0) continue;
    const dist = Math.hypot(ball.x - (b.x + b.w / 2), ball.y - (b.y + b.h / 2));
    if (dist < hitDist) {
      hit = b;
      hitDist = dist;
      hitOverlapX = overlapX;
      hitOverlapY = overlapY;
    }
  }
  if (!hit) return;

  // Bounce on one axis only: the one with the smaller penetration
  if (hitOverlapX < hitOverlapY) {
    const fromLeft = ball.x < hit.x + hit.w / 2;
    ball.x += fromLeft ? -hitOverlapX : hitOverlapX;
    ball.vx = fromLeft ? -Math.abs(ball.vx) : Math.abs(ball.vx);
  } else {
    const fromTop = ball.y < hit.y + hit.h / 2;
    ball.y += fromTop ? -hitOverlapY : hitOverlapY;
    ball.vy = fromTop ? -Math.abs(ball.vy) : Math.abs(ball.vy);
  }
  renormalizeBall();

  hit.hp -= 1;
  if (hit.hp <= 0) {
    hit.alive = false;
    state.explosions.push({
      x: hit.x,
      y: hit.y,
      w: hit.w,
      h: hit.h,
      color: hit.color,
      startedAt: performance.now(),
    });
  }
}

function update(dt) {
  const { paddle } = state;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  paddle.x += dir * paddle.speed * dt;
  clampPaddle();

  if (state.phase === "ready") {
    stickBallToPaddle();
  } else if (state.phase === "playing") {
    moveBall(dt);
    collidePaddle();
    collideBlocks();
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  for (const b of state.blocks) {
    if (b.alive) drawSprite(ctx, "block_" + b.color, b.x, b.y, b.w, b.h);
  }

  const now = performance.now();
  state.explosions = state.explosions.filter((ex) => now - ex.startedAt < EXPLOSION_DURATION);
  for (const ex of state.explosions) {
    const frameCount = EXPLOSION_FRAMES[ex.color].length;
    const index = Math.min(
      frameCount - 1,
      Math.floor((now - ex.startedAt) / (EXPLOSION_DURATION / frameCount))
    );
    drawFrame(ctx, EXPLOSION_FRAMES[ex.color][index], ex.x, ex.y, ex.w, ex.h);
  }

  const { paddle, ball } = state;
  drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
  drawSprite(ctx, "ball", ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
}

let lastTime = 0;

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

loadSpritesheet(() => {
  state.blocks = buildBlocks();
  stickBallToPaddle();
  requestAnimationFrame((now) => {
    lastTime = now;
    frame(now);
  });
});
