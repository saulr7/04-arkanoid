# SPEC 01 — Arkanoid MVP

> **Status:** Draft
> **Depends on:** None
> **Date:** 2026-10-10
> **Objective:** A playable single-level Arkanoid in the browser where the player controls a paddle, bounces a ball to break all blocks, and has 3 lives.

## Scope

**In:**

- `index.html`, `style.css` and `game.js` in the project root, plain browser JS with no build step and no modules.
- Reuse of `assets/spritesheet.js` (`loadSpritesheet`, `drawSprite`, `drawFrame`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) and of both mp3 files.
- One 800x600 canvas with a 10x7 block grid, one color per row.
- Paddle control with keyboard (Left/Right arrows or A/D) and mouse (paddle follows mouse X).
- Ball launch with Space or click, and a ball that sticks to the paddle before launch and after losing a life.
- Ball bounce angle that depends on where it hits the paddle, at constant speed.
- Gray blocks that take 2 hits; all other blocks take 1 hit.
- Block break animation using `EXPLOSION_FRAMES` (150 ms).
- Sound effects: `ball-bounce.mp3` on wall/paddle/surviving-block hits, `break-sound.mp3` when a block is destroyed.
- 3 lives, shown on screen as text (`Lives: N`).
- "You win" and "Game over" overlays on the canvas, with Space or Enter to restart.

**Out of scope (for future specs):**

- Score and high scores.
- Multiple levels or level editor.
- Power-ups, lasers, multi-ball, enemies.
- Pause.
- Touch / mobile controls.
- Volume control or mute toggle.
- Persistence of any kind.
- Automated tests, linting, bundler, `package.json`.

## Data model

All state lives in `game.js` as plain objects. Coordinates have origin top-left, in canvas pixels. Velocities are in pixels per second and positions advance by `vx * dt` using a delta time in seconds.

```js
const CANVAS_W = 800;
const CANVAS_H = 600;

const state = {
  phase: 'ready',   // 'ready' (ball stuck to paddle) | 'playing' | 'won' | 'lost'
  lives: 3,
  paddle: { x: 340, y: 560, w: 120, h: 14, speed: 600 },
  ball:   { x: 0, y: 0, r: 8, vx: 0, vy: 0, speed: 420 },
  blocks: [],       // see Block below
  explosions: [],   // see Explosion below
};

// One entry per grid cell, built by buildBlocks()
// { x, y, w: 64, h: 24, color: 'gray'|'red'|..., hp: 2 (gray) or 1, alive: true }

// Created when a block is destroyed, removed after EXPLOSION_DURATION ms
// { x, y, w, h, color, startedAt }  // startedAt from performance.now()
```

Conventions:

- Grid: 10 columns x 7 rows, block size 64x24, no gap, grid left edge at x = 80, top edge at y = 60.
- Row colors, top to bottom: `gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`.
- Ball speed is constant. After every bounce, `(vx, vy)` is renormalized to `ball.speed`.
- Paddle hit angle: `offset = (ball.x - paddleCenterX) / (paddle.w / 2)` clamped to [-1, 1]; launch angle from vertical is `offset * 60°`, and the ball always leaves the paddle upward.
- Explosion frame shown = `floor(elapsed / (EXPLOSION_DURATION / 4))`, clamped to frames 0–3. `EXPLOSION_DURATION` is treated as the total duration of one animation.
- Draw sizes: paddle 120x14 (scaled from 162x14), ball 16x16, blocks 64x24 (scaled from 32x16).

## Implementation plan

1. Create `index.html` (canvas 800x600, loads `style.css`, `assets/spritesheet.js`, `game.js` in that order) and `style.css` (dark background, canvas centered). `game.js` calls `loadSpritesheet` and clears the canvas. Check: page opens with no console errors.
2. In `game.js`, add the `requestAnimationFrame` loop with delta time (capped at 50 ms), `state`, and rendering of the paddle, ball (stuck to paddle) and the block grid with `drawSprite`. Check: static scene visible.
3. Add paddle input: arrows/A-D with held-key tracking, and mouse X, clamped to the canvas. The ball follows the paddle while `phase === 'ready'`. Check: paddle moves, ball rides it.
4. Add launch (Space or click) and ball movement with wall bounces on left, right and top. Check: ball bounces around and leaves through the bottom without any other effect yet.
5. Add paddle collision with the angle-by-offset rule and speed renormalization. Check: hitting the paddle edges sends the ball steeply, the center sends it straight up.
6. Add block collision (axis-resolved against the AABB of the nearest overlapping alive block), `hp` decrement, and removal when `hp` reaches 0. Check: blocks disappear after the right number of hits; gray needs 2.
7. Add explosion animation on destroyed blocks using `EXPLOSION_FRAMES[color]` and `drawFrame`. Check: 4 frames play over 150 ms.
8. Add sounds: load both mp3 with `new Audio(...)`, play `ball-bounce.mp3` on wall/paddle/surviving-block hits and `break-sound.mp3` on block destruction; reset `currentTime` before each play and swallow rejected `play()` promises. Check: sounds play on the right events.
9. Add lives and phases: ball below the canvas costs a life and returns to `ready`; 0 lives gives `lost`; no alive blocks gives `won`. Draw `Lives: N` and the overlays. Check: both end states reachable.
10. Add restart on Space or Enter in `won`/`lost`: rebuild blocks, reset lives to 3 and phase to `ready`. Check: a full second game works without reloading.

## Acceptance criteria

- [ ] Opening `index.html` (directly or via a static server) shows the 800x600 canvas with 70 blocks and no console errors.
- [ ] The grid has 7 rows of 10 blocks, with row colors gray, red, yellow, cyan, magenta, hotpink, green from top to bottom.
- [ ] Before launch, the ball sits centered on top of the paddle and follows it.
- [ ] Left/Right arrows and A/D move the paddle, and the mouse X position also moves it; the paddle never leaves the canvas.
- [ ] Space or a mouse click launches the ball upward in `ready` phase and does nothing in `playing`.
- [ ] The ball bounces off the left, right and top walls.
- [ ] A ball hitting the paddle center goes (almost) straight up; hitting near an edge sends it at a steep angle toward that side.
- [ ] Ball speed is visually constant throughout play.
- [ ] A non-gray block is destroyed after 1 hit; a gray block survives the first hit and is destroyed on the second.
- [ ] A destroyed block plays a 4-frame explosion lasting about 150 ms and then disappears.
- [ ] `ball-bounce.mp3` plays on wall, paddle and surviving-gray-block hits; `break-sound.mp3` plays when a block is destroyed.
- [ ] Letting the ball fall decrements `Lives` by 1, and the ball returns to the paddle in `ready` phase.
- [ ] After the 3rd lost life, "Game over" is shown, and Space or Enter starts a fresh game with 70 blocks and 3 lives.
- [ ] Destroying all 70 blocks shows "You win", and Space or Enter starts a fresh game.
- [ ] A browser that blocks audio autoplay does not throw errors; the game still runs.

## Decisions

- **Yes:** Plain `<script>` tags, no modules or bundler. `assets/spritesheet.js` declares globals and hardcodes a page-relative path, so this matches how it was written.
- **No:** Vite / ES modules. Would require reworking the existing sprite file for no MVP benefit.
- **Yes:** Delta-time movement in pixels per second. Keeps speed identical on 60 Hz and 144 Hz displays.
- **Yes:** Angle-by-offset paddle bounce with a 60° max. Avoids the vertical-loop problem of pure mirror reflection and gives the player control.
- **No:** Simple `vy = -vy` paddle bounce. Rejected for the reasons above.
- **Yes:** Gray = 2 hits, others = 1 hit. Gives some variety with no new art.
- **Yes:** Gray blocks have no "damaged" sprite on the first hit, since the spritesheet has none. Feedback on that hit is the bounce sound only.
- **Yes:** Gray blocks reuse the red explosion frames, as already defined in `EXPLOSION_FRAMES.gray`.
- **Yes:** Treat `EXPLOSION_DURATION` (150 ms) as the total animation time, because CLAUDE.md marks per-frame vs. total as unclear and 150 ms total reads better in play.
- **Yes:** Mouse and keyboard both active at once; the most recent input wins since both just set `paddle.x`.
- **No:** Score. Deferred to keep the MVP loop minimal; it fits naturally in a later spec together with high scores.
- **No:** Pause. Not needed for a single short level.
- **Yes:** Verification is a manual browser checklist, consistent with the no-tooling setup.

## Risks

| Risk                                                         | Mitigation                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Ball tunnels through blocks or paddle at low frame rates     | Cap delta time at 50 ms; at 420 px/s the ball moves at most 21 px per frame, less than a block height. |
| Corner hits resolve on the wrong axis                        | Resolve using the smaller penetration overlap and only bounce on one axis per frame.        |
| `spritesheet-breakout.png` fails to load when opened via `file://` | Draw helpers are no-ops until loaded; the game starts only after `loadSpritesheet` callback. If canvas reads are blocked on `file://`, serve with a static server (e.g. `python3 -m http.server`). |
| Browser blocks audio before user interaction                 | Sounds are first played after launch (a user gesture); `play()` rejections are caught.      |
| Sounds overlap and cut each other off on rapid hits          | Reset `currentTime` to 0 before each play; acceptable for the MVP.                          |

## What is **not** in this spec

- Score, high scores or any persistence.
- Multiple levels, power-ups, enemies.
- Pause, mute, volume.
- Touch / mobile support.
- Tests, linting, build tooling.

Each one of those, if it lands, goes in its own spec.
