# SPEC 02 — Block destruction effects

> **Status:** approved
> **Depends on:** SPEC 01
> **Date:** 2026-10-11
> **Objective:** Add debris particles to block destruction, and a white flash plus a few particles to the first hit on gray blocks, on top of the existing 4-frame sprite explosion.

## Why this spec exists

SPEC 01 already ships a 4-frame sprite explosion (150 ms) when a block is destroyed (`state.explosions`, `drawFrame`). This spec does not replace it. It makes destruction feel more impactful with particles, and gives gray blocks visible feedback on their non-destroying hit, which SPEC 01 explicitly left without any.

## Scope

**In:**

- Debris particles spawned when any block is destroyed (~8 per block).
- White flash (~80 ms) plus 3 gray particles on the first hit of a gray block (the hit that does not destroy it).
- A global cap of 200 live particles.
- Particle update and drawing in `game.js`, with a hardcoded color map.
- Particles are cleared on restart.
- The existing sprite explosion stays unchanged (4 frames, `EXPLOSION_DURATION` = 150 ms).

**Out of scope (for future specs):**

- Screen shake.
- Scale/fade of the explosion sprite.
- Any change to collisions, ball physics or block `hp`; effects are visual only and a destroyed block is not solid during the animation.
- New sounds or new assets; no changes to `assets/spritesheet.js` or the spritesheet.
- Particles for wall or paddle hits, or on losing a life.
- Score, power-ups, pause, persistence.

## Data model

New structures in `game.js`. Same conventions as SPEC 01: origin top-left, pixels, velocities in px/s, positions advance by `vx * dt`.

```js
const PARTICLES_PER_BLOCK = 8;
const PARTICLES_PER_GRAY_HIT = 3;
const MAX_PARTICLES = 200;
const PARTICLE_LIFE = 500; // ms
const PARTICLE_GRAVITY = 600; // px/s^2
const PARTICLE_SPEED_MIN = 80; // px/s
const PARTICLE_SPEED_MAX = 260; // px/s
const PARTICLE_SIZE_MIN = 3; // px
const PARTICLE_SIZE_MAX = 5; // px
const FLASH_DURATION = 80; // ms

const PARTICLE_COLORS = {
  gray: "#b0b0b0",
  red: "#e53935",
  yellow: "#fdd835",
  cyan: "#00e5ff",
  magenta: "#d500f9",
  hotpink: "#ff4081",
  green: "#43a047",
};

state.particles = []; // see Particle below

// Particle, created on block destruction and on the first hit of a gray block
// { x, y, vx, vy, size, color, startedAt }  // color is a CSS string from PARTICLE_COLORS; startedAt from performance.now()

// Block gains one optional field, set only on the non-destroying hit of a gray block
// block.hitAt  // performance.now() of that hit
```

Conventions:

- Spawn position: the center of the block. Direction is a random angle in [0, 2π); speed is random in [`PARTICLE_SPEED_MIN`, `PARTICLE_SPEED_MAX`].
- Each frame: `vy += PARTICLE_GRAVITY * dt`, then `x += vx * dt`, `y += vy * dt`.
- Alpha = `1 - elapsed / PARTICLE_LIFE`, clamped to [0, 1]. A particle is removed when `elapsed >= PARTICLE_LIFE`.
- When adding particles would exceed `MAX_PARTICLES`, the oldest particles are dropped first.
- Flash: while `now - block.hitAt < FLASH_DURATION`, a white rect with alpha `1 - elapsed / FLASH_DURATION` is drawn over the block sprite.
- Particles are updated and drawn in every phase, including `won` and `lost`, so the burst from the last block finishes.
- Draw order: blocks, flash, sprite explosions, particles, paddle, ball, HUD, overlays.

## Implementation plan

1. Add the constants, `PARTICLE_COLORS` and `state.particles = []` to `game.js`, and reset `state.particles` in `restart()`. Check: page loads with no console errors and the game plays as before.
2. Add `spawnParticles(block, count)` implementing spawn position, random direction and speed, size, and the `MAX_PARTICLES` cap. Check: calling it from the console on a block adds particles to `state.particles` and never exceeds 200.
3. Add `updateParticles(dt)`, called from `update(dt)` outside the `phase === "playing"` branch, and `drawParticles(now)`, called in `render()` after the sprite explosions. Check: particles spawned from the console fly out, fall and fade over ~500 ms, then disappear from the array.
4. In `collideBlocks()`, call `spawnParticles(hit, PARTICLES_PER_BLOCK)` when a block is destroyed. Check: every destroyed block shows the sprite explosion plus 8 debris pieces in the block's color.
5. In `collideBlocks()`, on the non-destroying branch (gray block, first hit) set `hit.hitAt = performance.now()` and call `spawnParticles(hit, PARTICLES_PER_GRAY_HIT)`. Check: a gray block gets 3 gray particles on its first hit.
6. In `render()`, draw the white flash over any block with `hitAt` set and `now - hitAt < FLASH_DURATION`. Check: the gray block flashes white for ~80 ms on the first hit and returns to normal.
7. Verify `restart()` clears particles and that the last block's burst finishes during the "You win" overlay. Check: restarting mid-burst leaves no particles on the new game.

## Acceptance criteria

- [ ] Destroying a block spawns 8 particles in that block's color at the block's center, in addition to the existing 4-frame sprite explosion.
- [ ] Each particle moves outward, is pulled down by gravity, fades linearly, and disappears after about 500 ms.
- [ ] The sprite explosion still plays 4 frames over 150 ms, unchanged.
- [ ] The first hit on a gray block shows a white flash of about 80 ms and spawns 3 gray particles; the block is not destroyed and no explosion plays.
- [ ] The second hit on a gray block destroys it with the sprite explosion and 8 gray particles.
- [ ] `state.particles.length` never exceeds 200, including when many blocks are destroyed in quick succession.
- [ ] Ball trajectory, block `hp` and collision results are identical to SPEC 01 (particles and flash never affect collisions).
- [ ] Destroying the last block lets its particles finish animating while "You win" is shown.
- [ ] Restarting with Space or Enter leaves `state.particles` empty and no block flashing.
- [ ] Particles are drawn above the blocks and below the paddle and ball.
- [ ] No console errors during a full game, and frame rate stays smooth when several blocks break within a second.

## Decisions

- **Yes:** Keep the sprite explosion and add particles on top. The user chose a richer effect over replacing it.
- **Yes:** Keep `EXPLOSION_DURATION` at 150 ms. Matches SPEC 01 and keeps the effect fast; particles outlive it at 500 ms for the "debris falling" feel.
- **Yes:** Visual only. A destroyed block is not solid during the animation, so SPEC 01 collision rules are untouched.
- **Yes:** Flat colored rectangles for particles with a hardcoded `PARTICLE_COLORS` map. No spritesheet changes and no dependence on canvas pixel reads, which can fail on `file://`.
- **No:** Sampling colors from the spritesheet. Exact match is not worth the `file://` risk already noted in SPEC 01.
- **No:** Sprite-fragment particles. More code for little visible gain at 3–5 px.
- **Yes:** ~8 particles per block with a 200 cap, dropping the oldest. Readable effect with bounded cost.
- **Yes:** Burst plus gravity with a 500 ms life. Reads as debris falling and fading.
- **Yes:** Gray first hit gets a white flash plus 3 gray particles. This reverses the SPEC 01 decision that the first hit has only the bounce sound; the sound stays, and the effect is added.
- **No:** Screen shake and sprite scale/fade. Not selected; each can land in a later spec.
- **Yes:** Particles update in all phases. Otherwise the last block's burst would freeze on the "You win" screen.

## Risks

| Risk                                                                    | Mitigation                                                                                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Many simultaneous particles hurt frame rate                             | Hard cap of 200 live particles and flat `fillRect` drawing only.                                                        |
| Particles frozen or stale after restart                                 | `restart()` resets `state.particles`; `hitAt` lives on blocks, which `restart()` rebuilds through `buildBlocks()`.      |
| Delta time spikes make particles jump                                   | Reuse the existing 50 ms cap on `dt`; lifetime is measured with `performance.now()`, so particles still expire on time. |
| Flash and particles on gray hits make the first hit look like a destroy | Flash is 80 ms with only 3 particles and no sprite explosion, clearly weaker than destruction.                          |

## What is **not** in this spec

- Screen shake or sprite scale/fade on the explosion.
- Changes to collisions, ball physics, `hp` or block solidity during animations.
- New sounds, new assets or spritesheet changes.
- Effects for wall, paddle or life-loss events.
- Score, power-ups, pause or persistence.

Each one of those, if it lands, goes in its own spec.
