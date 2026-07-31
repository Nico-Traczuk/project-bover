# Animation System Design

**Date:** 2026-07-31
**Scope:** Combat scene — player, enemies, projectiles
**Approach:** Hybrid (spritesheet walk frames + procedural tweens)

---

## Overview

All characters and enemies are currently static sprites. This spec covers adding:

- Walk cycle via spritesheet frame cycling
- Attack lunge (procedural scale tween)
- Hurt flash + knockback (tint + position tween)
- Death animation (spin + scale-down + fade)
- Projectile rotation + trail rendering
- Screen shake on player hit

The spritesheet (`characters.png`, 918×203, 17px cell grid) already contains walk frames at col 0 (idle), col 1 (walk-1), col 2 (walk-2) on each character row.

---

## Animation State Machine

Each entity tracks two fields:

```js
this._animState = 'idle'   // 'idle' | 'walk' | 'attack' | 'hurt'
this._animTimer = 0        // counts down; when <= 0, state expires
```

Priority: `hurt > attack > walk > idle`

Timed states expire back to walk/idle automatically:
- `attack`: 0.15s
- `hurt`: 0.20s

No separate class is needed — state lives directly on `BasePlayer` and `BaseEnemy`.

---

## Walk Cycle

### Setup (constructor)
Pre-build 3 `Texture` objects from the spritesheet at cols 0, 1, 2 on the entity's row:

```js
this._walkFrames = [0, 1, 2].map(col =>
  new Texture({ source: charTex.source, frame: new Rectangle(col * 17, row * 17, 16, 16) })
)
this._walkFrame = 0
this._walkTimer = 0
```

Falls back gracefully to a single-frame Graphics sprite if `Assets.get('characters')` is not ready.

### Each tick
- If moving (`|moveX| + |moveY| > 0`): advance `_walkTimer += dt`; when it exceeds **0.15s**, increment `_walkFrame % 3` and swap `this._gfx.texture`
- If not moving: reset `_walkFrame = 0`, restore idle texture

### Facing
```js
this._gfx.scale.x = moveX < 0 ? -2 : 2
```
Mirrors the sprite horizontally when moving left, preserving the existing 2× scale.

**Player:** `moveX/moveY` come from `inputManager.getMovement()`, passed in from `CombatScene._updatePlayer()`.

**Enemies:** `moveX/moveY` derived from the `dx/dy` computed in `_behaviorTick()`.

---

## Attack Animation

**Trigger:** called as `triggerAttack()` on the entity, invoked from `CombatSystem` just before `resetAttackCooldown()`.

**Tween:**
- Scale from `2 → 2.6` over 0.07s
- Scale back to `2` over 0.08s
- Total duration: 0.15s → sets `_animState = 'attack'`, `_animTimer = 0.15`

**Tank variant:** `scaleX` goes to `3.0` (wider horizontal swing) while `scaleY` goes to `2.4`.

Scale is driven by `_animTimer` progress each tick — no external tween library needed.

---

## Hurt Animation

**Trigger:** inside `takeDamage(amount, knockbackAngle = null)`, only when damage lands (not during invincibility).

**Two simultaneous effects:**

1. **Tint flash** — `this._gfx.tint = 0xFF6666` immediately; restore to `0xFFFFFF` after 0.1s
2. **Knockback** — shift entity `14px` in `knockbackAngle` direction over 0.06s, spring back over 0.12s; stored as `_knockbackOffsetX/Y` applied on top of real position

**`knockbackAngle` sources:**
- Projectile hits → pass `Math.atan2(projectile.vy, projectile.vx)`
- Melee hits → pass `Math.atan2(enemy.y - player.y, enemy.x - player.x)` (toward enemy)
- Unknown → skip knockback offset

Sets `_animState = 'hurt'`, `_animTimer = 0.2`.

---

## Death Animation

### Enemies
When `hp` reaches 0, the enemy enters a dying state instead of being removed immediately.

```js
this._dying = false
this._dyingTimer = 0
```

`triggerDeath()` sets `_dying = true`, `_dyingTimer = 0.35`.

Each tick while dying:
- `rotation += (Math.PI * 2 / 0.35) * dt` (one full spin over 0.35s)
- `scale.set(progress * 2)` where `progress = _dyingTimer / 0.35` (shrinks to 0)
- `alpha = progress`

**`CombatSystem` changes:**
- Adds `this.dyingEnemies = []`
- On enemy death: call `enemy.triggerDeath()`, move to `dyingEnemies` instead of removing
- Each tick: tick `dyingEnemies`, remove from stage + array when `_dyingTimer <= 0`
- `dyingEnemies` excluded from all combat logic (attacks, collisions, wave-clear)

### Player
On `onPlayerDeath` callback: flash the arena overlay to white at 60% alpha, then fire the scene transition after **0.4s**.

---

## Projectile Effects

### Rotation
Each `Projectile` gets a `rotationSpeed` set at construction:
- Player projectiles: `+4 rad/s`
- Enemy projectiles: `−3 rad/s`

Applied in `tick()`: `this.rotation += this.rotationSpeed * deltaSeconds`

### Trails
`Projectile` stores a rolling array of the last **6 positions**:

```js
this._trail = []   // [{ x, y }, ...]
```

Updated each tick: `_trail.unshift({ x: this.x, y: this.y })`, capped at length 6.

`CombatScene` owns a single `_trailGfx: Graphics` layer (added to `_stage`). Each tick:
1. `_trailGfx.clear()`
2. For each live projectile, draw its trail — 6 dots, alpha from `0.05` (oldest) to `0.25` (newest), radius from `1` to `projectile.radius * 0.6`, same color as the projectile

No extra display objects created — just redrawn geometry each frame.

---

## Screen Shake

`CombatSystem` gets a new constructor option: `onPlayerHurt`.

When `player.takeDamage()` lands, `CombatSystem` fires `this.onPlayerHurt?.()`.

`CombatScene` responds by setting:
```js
this._shakeTimer = 0.3
this._shakeIntensity = 5
```

Each tick while `_shakeTimer > 0`:
```js
const t = this._shakeTimer / 0.3           // 1 → 0
const mag = this._shakeIntensity * t
this._stage.x = ARENA.x + (Math.random() * 2 - 1) * mag
this._stage.y = ARENA.y + (Math.random() * 2 - 1) * mag
this._shakeTimer -= dt
```

When `_shakeTimer <= 0`, restore `_stage.x = ARENA.x`, `_stage.y = ARENA.y`.

---

## Files Changed

| File | What changes |
|---|---|
| `mobile/src/entities/player/BasePlayer.js` | Walk frames, `_animState`, attack/hurt triggers, animation tick |
| `mobile/src/entities/enemies/BaseEnemy.js` | Walk frames, `_animState`, hurt trigger, death animation |
| `mobile/src/entities/Projectile.js` | `rotationSpeed`, trail positions array |
| `mobile/src/systems/CombatSystem.js` | `triggerAttack()` call, `dyingEnemies` loop, `onPlayerHurt` callback |
| `mobile/src/scenes/CombatScene.js` | Pass move to player anim, `_trailGfx` layer, screen shake |

No new files. No changes to data files, routes, or backend.

---

## Out of Scope

- Idle breathing bob (low value, adds continuous noise to positions)
- Projectile impact burst (can be added later as a `ParticleSystem`)
- Sprite-sheet attack/death frames (sheet has no attack frames — procedural tween is the right call)
