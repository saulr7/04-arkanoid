# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Early-stage Arkanoid/Breakout browser game. So far the repo contains only assets (no `index.html`, game loop, package.json, build, lint, or tests yet). `README.md` is just an empty "# Objective" heading. Not a git repository.

Presumably plain browser JS (no modules or bundler): `assets/spritesheet.js` declares top-level globals and uses `document`/`Image`, so it is meant to be loaded via a `<script>` tag, with paths resolved relative to the HTML page.

## Assets

- `assets/spritesheet-breakout.png` — single spritesheet; all sprite coordinates live in `assets/spritesheet.js`.
- `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` — sound effects.

## Sprite system (`assets/spritesheet.js`)

- `SPRITES` maps `paddle`, `ball`, and `blocks.<color>` to `{ sx, sy, sw, sh }` source rects. Block colors: gray, red, yellow, cyan, magenta, hotpink, green.
- `EXPLOSION_FRAMES.<color>` holds 4-frame break animations (32x16 each); `EXPLOSION_DURATION` is 150 (ms, presumably per animation). Note `gray` reuses the red frames.
- `loadSpritesheet(cb)` loads `assets/spritesheet-breakout.png` (hardcoded path relative to the page) and copies it to an offscreen canvas; callbacks queue until loaded. Draw helpers are no-ops until then.
- `drawSprite(ctx, name, x, y, w, h)` draws by name; blocks use the `block_<color>` prefix (e.g. `block_red`). `drawFrame(ctx, frame, x, y, w, h)` draws an explicit frame such as an explosion frame. Both scale the source rect to the destination `w`/`h`.
