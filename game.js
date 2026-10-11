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

function update(dt) {
  if (state.phase === "ready") stickBallToPaddle();
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  for (const b of state.blocks) {
    if (b.alive) drawSprite(ctx, "block_" + b.color, b.x, b.y, b.w, b.h);
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
