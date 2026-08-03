# VFX Animations Design

## Goal

Add six visual effects to the combat scene: floating damage numbers, hit impact flash, idle breathing, enemy spawn pop-in, projectile trail fade, and level-up burst.

## Architecture

### VFXLayer (`mobile/src/vfx/VFXLayer.js`)

A new `Container` subclass that owns all fire-and-forget visual effects. CombatScene creates one instance and adds it to `_stage` (above the player and trail graphics). CombatSystem notifies it via an `onEffect` callback wired in CombatScene.

```
_stage
  ├── enemies
  ├── player
  ├── _trailGfx (existing)
  └── _vfx: VFXLayer  ← new
```

**Interface:**
- `spawn(type, x, y, value)` — push a new effect onto the active array
- `tick(dt)` — called each frame from CombatScene's ticker; updates all active effects, removes expired ones

**Internal structure:**
- `_gfx: Graphics` — redrawn each tick for circles/rings (flashes, impact, level-up rings)
- `_effects: Array` — active effect objects, each: `{ type, x, y, timer, duration, ...data }`
- Text nodes for damage numbers are added/removed as children of VFXLayer directly

### onEffect callback

CombatSystem receives a new `onEffect` option:

```js
onEffect: (type, x, y, value) => this._vfx.spawn(type, x, y, value)
```

Dispatched from:
- `pHits` loop (projectile vs enemy): `'damage'` and `'impact'` at enemy position
- `eHits` loop (enemy projectile vs player): `'impact'` at player position (no damage number)
- CombatScene `_onXpEarned` on level increment: `'levelup'` at player position

## Effect Specifications

### 1. Floating damage numbers (`type: 'damage'`)

**Trigger:** Every hit on an enemy from any source (player projectile or melee).

**Value:** `{ amount: Number, maxHp: Number }` — damage dealt and enemy's max HP.

**Color (percentage of enemy max HP):**
- `< 25%` → white `0xFFFFFF`
- `25–50%` → yellow `0xFFD700`
- `> 50%` → orange-red `0xFF6B35`

**Font:** bold, size 14px, anchor `(0.5, 1)`.

**Animation:**
- Duration: 0.8s
- Position: rises 30px upward (`y -= 30 * (timer/duration)` each tick, interpolated)
- Alpha: full for first 0.5s, fades 1→0 over final 0.3s

**Cleanup:** Text child removed from VFXLayer when `timer <= 0`.

### 2. Hit impact flash (`type: 'impact'`)

**Trigger:** Every hit on an enemy or player projectile landing.

**Value:** unused.

**Animation (drawn via `_gfx`):**
- Duration: 0.12s
- Radius: expands from 4 → 14 linearly over 0.12s
- Alpha: fades from 0.7 → 0 linearly over 0.12s
- Color: white `0xFFFFFF`
- Fill circle at `(x, y)`

### 3. Idle breathing (BasePlayer + BaseEnemy)

**Trigger:** When `_animState === 'idle'` (player and enemy are stationary).

**Implementation:** A new `_idleTimer` field (initialized to 0). Accumulates only when idle, resets to 0 when movement starts.

**Scale formula applied to `_gfx.scale.y`:**
```js
const breathe = 1 + Math.sin(_idleTimer * 1.8) * 0.03
_gfx.scale.y = BASE_SCALE * breathe
```

3% vertical scale oscillation at 1.8 rad/s. `_gfx.scale.x` is not affected (no horizontal pulse).

### 4. Enemy spawn pop-in (BaseEnemy)

**Trigger:** Automatic — starts from enemy constructor.

**Implementation:** `_spawnTimer = 0.3` set in constructor. Counted down in `tick()`. While `_spawnTimer > 0`, the enemy scale is driven by:

```js
const t = 1 - (_spawnTimer / 0.3)       // 0→1 over 0.3s
let s
if (t < 0.7) {
  s = t / 0.7                            // scale 0→1 during first 70%
} else {
  const u = (t - 0.7) / 0.3             // 0→1 over overshoot phase
  s = 1 + 0.4 * u * (1 - u)            // parabola: 1.0 → 1.1 → 1.0
}
_gfx.scale.set(BASE_SCALE * Math.max(0, s))
```

When `_spawnTimer` reaches 0, normal animation resumes. No changes to CombatSystem or CombatScene.

### 5. Projectile trail fade (CombatScene ticker)

**Trigger:** Existing trail rendering in `_startTicker`.

**Change:** Replace the current linear alpha/radius formula with quadratic falloff:

```js
const frac = (6 - i) / 6           // 1.0 at head (i=0), ~0.17 at tail (i=5)
const alpha = frac * frac * 0.6    // quadratic: 0.60 at head → ~0.03 at tail
const r = Math.max(0.5, p.radius * frac * 0.7)
```

Two lines changed, no new files.

### 6. Level-up burst (`type: 'levelup'`)

**Trigger:** Each time `_level` increments in `CombatScene._onXpEarned`.

**Value:** unused. Position: player's current `(x, y)` in stage coordinates.

**Animation (drawn via `_gfx`):**

Outer ring:
- Duration: 0.4s
- Radius: 0 → 70 linearly
- Stroke: color `0xFFD700` (gold), width 3
- Alpha: 1 → 0 linearly

Inner ring:
- Duration: 0.25s
- Radius: 0 → 40 linearly
- Stroke: color `0xFFD700`, width 5
- Alpha: 1 → 0 linearly

Both rings are stored as a single `'levelup'` effect entry with two sub-timers. Drawn each tick via `_gfx.circle().stroke()`.

## Files Changed

| File | Action |
|------|--------|
| `mobile/src/vfx/VFXLayer.js` | Create |
| `mobile/src/systems/CombatSystem.js` | Add `onEffect` option, dispatch `'damage'` + `'impact'` |
| `mobile/src/scenes/CombatScene.js` | Create `_vfx`, wire `onEffect`, dispatch `'levelup'`, update trail formula |
| `mobile/src/entities/player/BasePlayer.js` | Add `_idleTimer`, idle breathing in `animateTick` |
| `mobile/src/entities/enemies/BaseEnemy.js` | Add `_idleTimer`, idle breathing; add `_spawnTimer`, pop-in in `tick` |
| `mobile/tests/vfxLayer.test.js` | Create (unit tests for VFXLayer) |
| `mobile/tests/enemySpawn.test.js` | Create (unit tests for pop-in) |

## Testing

**VFXLayer tests:**
- `spawn('damage', ...)` adds a Text child with correct color for each percentage tier
- `tick(dt)` moves the Text upward and fades alpha correctly
- `tick(dt)` removes expired effects
- `spawn('impact', ...)` entry present; removed after 0.12s
- `spawn('levelup', ...)` entry present; removed after 0.4s

**Enemy spawn tests:**
- `_spawnTimer` initialized to 0.3
- Scale is 0 at construction
- Scale reaches ~1.0 after 0.3s of ticking
- Normal animation resumes after pop-in completes

**Idle breathing tests:**
- `_idleTimer` increments when idle
- `_idleTimer` resets to 0 when movement starts
- `_gfx.scale.y` differs from `BASE_SCALE` while idle (breathing active)
