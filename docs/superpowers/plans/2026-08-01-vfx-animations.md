# VFX Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add floating damage numbers, hit impact flash, idle breathing, enemy spawn pop-in, projectile trail fade, and level-up burst to the combat scene via a new VFXLayer class.

**Architecture:** A new `VFXLayer` (Container subclass in `mobile/src/vfx/VFXLayer.js`) owns all fire-and-forget effects. CombatScene creates it and adds it to `_stage`; CombatSystem notifies it via an `onEffect(type, x, y, value)` callback. Entity-side animations (breathing, spawn pop-in) live inside the entities themselves.

**Tech Stack:** Pixi.js 8 (Container, Graphics, Text), Vitest for tests.

---

### Task 1: VFXLayer — floating damage numbers, impact flash, level-up burst

**Files:**
- Create: `mobile/src/vfx/VFXLayer.js`
- Create: `mobile/tests/vfxLayer.test.js`

- [ ] **Step 1: Write the failing tests**

Create `mobile/tests/vfxLayer.test.js`:

```js
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1) }
  }
  class Graphics {
    constructor() { this.x = 0; this.y = 0; this.scale = makeScale() }
    circle() { return this }; fill() { return this }; stroke() { return this }; clear() {}
  }
  class Text {
    constructor({ text, style } = {}) {
      this.text = text ?? ''; this.style = style ?? {}
      this.x = 0; this.y = 0; this.alpha = 1
      this.anchor = { set() {} }
    }
  }
  return { Container, Graphics, Text }
})

import { VFXLayer } from '../src/vfx/VFXLayer.js'

describe('VFXLayer', () => {
  let vfx

  beforeEach(() => { vfx = new VFXLayer() })

  test('spawn damage < 25% gives white label', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    expect(vfx._effects[0].label.style.fill).toBe(0xFFFFFF)
  })

  test('spawn damage 25-50% gives yellow label', () => {
    vfx.spawn('damage', 100, 100, { amount: 3, maxHp: 10 })
    expect(vfx._effects[0].label.style.fill).toBe(0xFFD700)
  })

  test('spawn damage > 50% gives orange-red label', () => {
    vfx.spawn('damage', 100, 100, { amount: 6, maxHp: 10 })
    expect(vfx._effects[0].label.style.fill).toBe(0xFF6B35)
  })

  test('spawn damage adds Text as child', () => {
    vfx.spawn('damage', 100, 100, { amount: 5, maxHp: 10 })
    expect(vfx.children.length).toBe(2) // _gfx + label
  })

  test('tick moves damage label upward', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    const label = vfx._effects[0].label
    const startY = label.y
    vfx.tick(0.4)
    expect(label.y).toBeLessThan(startY)
  })

  test('tick fades damage label alpha after 0.5s', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    const label = vfx._effects[0].label
    vfx.tick(0.6)
    expect(label.alpha).toBeLessThan(1)
  })

  test('tick removes expired damage effect and its label', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    vfx.tick(0.9)
    expect(vfx._effects.length).toBe(0)
    expect(vfx.children.length).toBe(1) // only _gfx remains
  })

  test('spawn impact adds effect entry', () => {
    vfx.spawn('impact', 50, 50, null)
    expect(vfx._effects[0].type).toBe('impact')
  })

  test('tick removes impact after 0.12s', () => {
    vfx.spawn('impact', 50, 50, null)
    vfx.tick(0.13)
    expect(vfx._effects.length).toBe(0)
  })

  test('spawn levelup adds effect entry', () => {
    vfx.spawn('levelup', 225, 262, null)
    expect(vfx._effects[0].type).toBe('levelup')
  })

  test('tick removes levelup after 0.4s', () => {
    vfx.spawn('levelup', 225, 262, null)
    vfx.tick(0.41)
    expect(vfx._effects.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run tests/vfxLayer.test.js
```

Expected: FAIL — `Cannot find module '../src/vfx/VFXLayer.js'`

- [ ] **Step 3: Create VFXLayer**

Create `mobile/src/vfx/VFXLayer.js`:

```js
import { Container, Graphics, Text } from 'pixi.js'

export class VFXLayer extends Container {
  constructor() {
    super()
    this._gfx = new Graphics()
    this.addChild(this._gfx)
    this._effects = []
  }

  spawn(type, x, y, value) {
    if (type === 'damage') {
      const pct = value.amount / value.maxHp
      const color = pct > 0.5 ? 0xFF6B35 : pct > 0.25 ? 0xFFD700 : 0xFFFFFF
      const label = new Text({ text: String(value.amount), style: { fill: color, fontSize: 14, fontWeight: 'bold' } })
      label.anchor.set(0.5, 1)
      label.x = x
      label.y = y
      this.addChild(label)
      this._effects.push({ type: 'damage', x, y, timer: 0.8, duration: 0.8, label })
    } else if (type === 'impact') {
      this._effects.push({ type: 'impact', x, y, timer: 0.12, duration: 0.12 })
    } else if (type === 'levelup') {
      this._effects.push({ type: 'levelup', x, y, timer: 0.4, duration: 0.4 })
    }
  }

  tick(dt) {
    this._gfx.clear()
    this._effects = this._effects.filter(e => {
      e.timer -= dt
      if (e.timer <= 0) {
        if (e.label) this.removeChild(e.label)
        return false
      }
      const progress = 1 - (e.timer / e.duration)
      if (e.type === 'damage') {
        e.label.y = e.y - 30 * progress
        e.label.alpha = e.timer > 0.3 ? 1 : e.timer / 0.3
      } else if (e.type === 'impact') {
        const r = 4 + 10 * progress
        const alpha = (e.timer / e.duration) * 0.7
        this._gfx.circle(e.x, e.y, r).fill({ color: 0xFFFFFF, alpha })
      } else if (e.type === 'levelup') {
        const outerAlpha = e.timer / e.duration
        this._gfx.circle(e.x, e.y, 70 * progress).stroke({ width: 3, color: 0xFFD700, alpha: outerAlpha })
        if (e.timer > e.duration - 0.25) {
          const innerElapsed = e.duration - e.timer
          const innerProgress = innerElapsed / 0.25
          this._gfx.circle(e.x, e.y, 40 * innerProgress).stroke({ width: 5, color: 0xFFD700, alpha: 1 - innerProgress })
        }
      }
      return true
    })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run tests/vfxLayer.test.js
```

Expected: 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/vfx/VFXLayer.js mobile/tests/vfxLayer.test.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: add VFXLayer with damage numbers, impact flash, level-up burst"
```

---

### Task 2: CombatSystem — dispatch onEffect on hits

**Files:**
- Modify: `mobile/src/systems/CombatSystem.js`

- [ ] **Step 1: Add `onEffect` to constructor and dispatch on hits**

In `mobile/src/systems/CombatSystem.js`, make these two changes:

**Change 1** — add `onEffect` to constructor (line 18, after `onPlayerHurt`):

```js
this.onPlayerHurt = onPlayerHurt ?? null
this.onEffect = onEffect ?? null
```

**Change 2** — dispatch after `enemy.takeDamage` in the `pHits.forEach` block (after line 103):

```js
pHits.forEach(({ projectile, enemy }) => {
  const hitAngle = Math.atan2(projectile.vy, projectile.vx)
  enemy.takeDamage(projectile.damage, hitAngle)
  if (projectile._hitEnemies) projectile._hitEnemies.add(enemy)
  this.onEffect?.('damage', enemy.x, enemy.y, { amount: projectile.damage, maxHp: enemy.stats.maxHp })
  this.onEffect?.('impact', enemy.x, enemy.y, null)
  if (projectile.frostSlow) enemy.slow(1.5)
  if (!projectile.isMelee) projectile.lifetime = 0
  if (!enemy.isAlive()) {
    const goldMult = this.modifier?.goldMult ?? 1
    const gold = Math.round((enemy.goldDrop() + (this.upgradeSystem?.stats.goldBonus || 0)) * goldMult)
    const xp = enemy.stats.xpReward
    enemy.triggerDeath()
    this.dyingEnemies.push(enemy)
    this.onGoldEarned(gold)
    this.onXpEarned(xp)
  }
})
```

**Change 3** — dispatch impact when enemy projectile hits player, in `eHits.forEach` (after `this.player.takeDamage`):

```js
eHits.forEach(p => {
  const hitAngle = Math.atan2(p.vy, p.vx)
  const prevHp = this.player.stats.hp
  this.player.takeDamage(p.damage, hitAngle)
  if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
  this.onEffect?.('impact', this.player.x, this.player.y, null)
  p.lifetime = 0
})
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run
```

Expected: all existing tests PASS (onEffect is optional so existing test setups without it are unaffected)

- [ ] **Step 3: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/systems/CombatSystem.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: dispatch onEffect from CombatSystem on hits"
```

---

### Task 3: CombatScene — wire VFXLayer, trail fade, level-up dispatch

**Files:**
- Modify: `mobile/src/scenes/CombatScene.js`

- [ ] **Step 1: Add VFXLayer import and create instance in `_build()`**

At the top of `mobile/src/scenes/CombatScene.js`, add the import after the existing imports:

```js
import { VFXLayer } from '../vfx/VFXLayer.js'
```

In `_build()`, after the existing `this._trailGfx = new Graphics()` and `this._stage.addChild(this._trailGfx)` lines, add:

```js
this._vfx = new VFXLayer()
this._stage.addChild(this._vfx)
```

- [ ] **Step 2: Wire `onEffect` into CombatSystem constructor call**

In `_build()`, the `new CombatSystem({...})` call currently has `onPlayerHurt` as the last option. Add `onEffect` after it:

```js
this._combatSystem = new CombatSystem({
  player: this._player,
  upgradeSystem: this._upgradeSystem,
  depth,
  stage: this._stage,
  modifier: this._modifier,
  onWaveCleared: (wave) => this._onWaveCleared(wave),
  onRoomCleared: () => this._onRoomCleared(),
  onPlayerDeath: () => this._onPlayerDeath(),
  onPlayerHurt: () => this._onPlayerHurt(),
  onGoldEarned: (g) => this._onGoldEarned(g),
  onXpEarned: (xp) => this._onXpEarned(xp),
  onEffect: (type, x, y, value) => this._vfx.spawn(type, x, y, value),
})
```

- [ ] **Step 3: Tick VFXLayer and fix trail fade in `_startTicker()`**

In the ticker function body, after `this._trailGfx.clear()` and the trail `forEach`, add:

```js
this._vfx.tick(dt)
```

Replace the two trail lines inside the `p._trail.forEach` with the quadratic falloff:

```js
this._combatSystem.projectiles.forEach(p => {
  p._trail.forEach((pos, i) => {
    const frac = (6 - i) / 6
    const alpha = frac * frac * 0.6
    const r = Math.max(0.5, p.radius * frac * 0.7)
    this._trailGfx.circle(pos.x, pos.y, r).fill({ color: p.color, alpha })
  })
})
```

- [ ] **Step 4: Dispatch level-up burst in `_onXpEarned()`**

In `_onXpEarned`, inside the `while (this._xp >= this._xpToNext)` loop, after `this._levelText.text = \`Level ${this._level}\``, add:

```js
this._vfx?.spawn('levelup', this._player.x, this._player.y, null)
```

The full updated `_onXpEarned` method:

```js
_onXpEarned(xp) {
  this._xp += Math.round(xp * this._xpMult)
  while (this._xp >= this._xpToNext) {
    this._xp -= this._xpToNext
    this._level++
    this._xpToNext = xpForLevel(this._level)
    this._levelText.text = `Level ${this._level}`
    this._vfx?.spawn('levelup', this._player.x, this._player.y, null)
    this._showUpgradeOverlay()
  }
  this._xpBar.update(this._xp, this._xpToNext)
}
```

- [ ] **Step 5: Run all tests**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/scenes/CombatScene.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: wire VFXLayer into CombatScene, add trail fade and level-up burst"
```

---

### Task 4: BasePlayer — idle breathing

**Files:**
- Modify: `mobile/src/entities/player/BasePlayer.js`
- Modify: `mobile/tests/playerAnimation.test.js`

- [ ] **Step 1: Add idle breathing tests to existing test file**

Add these three tests to `mobile/tests/playerAnimation.test.js` inside the `describe` block, after the last existing test:

```js
test('_idleTimer starts at 0', () => {
  expect(p._idleTimer).toBe(0)
})

test('_idleTimer increments when idle', () => {
  p.animateTick(0.1, 0, 0)
  expect(p._idleTimer).toBeGreaterThan(0)
})

test('_idleTimer resets to 0 when moving', () => {
  p.animateTick(0.1, 0, 0)   // idle → timer grows
  p.animateTick(0.1, 1, 0)   // moving → timer resets
  expect(p._idleTimer).toBe(0)
})

test('scale.y deviates from BASE_SCALE while idle', () => {
  p.animateTick(2.0, 0, 0)   // let _idleTimer build so sin produces non-zero
  // scale.y = BASE_SCALE * (1 + sin(_idleTimer * 1.8) * 0.03)
  // After 2s idle the sin value will be non-zero, so scale.y != BASE_SCALE
  const BASE_SCALE = 3
  const breathe = 1 + Math.sin(p._idleTimer * 1.8) * 0.03
  expect(p._gfx.scale.y).toBeCloseTo(BASE_SCALE * breathe, 5)
})
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run tests/playerAnimation.test.js
```

Expected: 3-4 new tests FAIL — `_idleTimer is not defined`

- [ ] **Step 3: Add `_idleTimer` to BasePlayer constructor and breathing to `animateTick`**

In `mobile/src/entities/player/BasePlayer.js`, add `_idleTimer = 0` to the animation state block in the constructor (after `_walkTimer = 0`):

```js
this._animState = 'idle'
this._animTimer = 0
this._facing = 1
this._walkTimer = 0
this._idleTimer = 0
this._knockbackOffsetX = 0
this._knockbackOffsetY = 0
this._attackScaleX = 1.3
this._attackScaleY = 1.3
```

In `animateTick`, add the idle timer block and breathing to the scale section. The full updated `animateTick`:

```js
animateTick(dt, moveX, moveY) {
  const moving = Math.abs(moveX) + Math.abs(moveY) > 0.01

  if (moveX < 0) this._facing = -1
  else if (moveX > 0) this._facing = 1

  if (moving && this._animState !== 'hurt') {
    this._walkTimer += dt
  } else {
    this._walkTimer = 0
  }

  if (this._animTimer > 0) {
    this._animTimer -= dt
    if (this._animTimer <= 0) {
      this._animTimer = 0
      this._animState = moving ? 'walk' : 'idle'
      this._gfx.tint = 0xFFFFFF
    }
  } else {
    this._animState = moving ? 'walk' : 'idle'
  }

  if (this._animState === 'idle') {
    this._idleTimer += dt
  } else {
    this._idleTimer = 0
  }

  let sx = 1, sy = 1
  if (this._animState === 'attack') {
    const half = 0.08, full = 0.15
    const t = this._animTimer > half
      ? (full - this._animTimer) / (full - half)
      : this._animTimer / half
    sx = 1 + t * (this._attackScaleX - 1)
    sy = 1 + t * (this._attackScaleY - 1)
  } else if (this._animState === 'idle') {
    sy = 1 + Math.sin(this._idleTimer * 1.8) * 0.03
  }

  this._gfx.scale.x = this._facing * BASE_SCALE * sx
  this._gfx.scale.y = BASE_SCALE * sy

  const walkBob = moving ? Math.sin(this._walkTimer * Math.PI * 8) * 2 : 0
  this._gfx.x = this._knockbackOffsetX
  this._gfx.y = this._knockbackOffsetY + walkBob
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run tests/playerAnimation.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/entities/player/BasePlayer.js mobile/tests/playerAnimation.test.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: add idle breathing animation to BasePlayer"
```

---

### Task 5: BaseEnemy — idle breathing + spawn pop-in

**Files:**
- Modify: `mobile/src/entities/enemies/BaseEnemy.js`
- Create: `mobile/tests/enemySpawn.test.js`

- [ ] **Step 1: Write failing tests**

Create `mobile/tests/enemySpawn.test.js`:

```js
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1) }
  }
  class Sprite {
    constructor(tex) { this.texture = tex; this.x = 0; this.y = 0; this.scale = makeScale(); this.anchor = { set() {} }; this.tint = 0xFFFFFF }
  }
  class Graphics {
    constructor() { this.x = 0; this.y = 0; this.tint = 0xFFFFFF; this.scale = makeScale() }
    rect() { return this }; circle() { return this }; fill() { return this }; stroke() { return this }; clear() {}
  }
  class Texture { constructor(o) { this.opts = o } }
  class Rectangle { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h } }
  return { Container, Sprite, Graphics, Texture, Rectangle, Assets: { get: () => null } }
})

import { BaseEnemy } from '../src/entities/enemies/BaseEnemy.js'

describe('BaseEnemy spawn pop-in', () => {
  let e

  beforeEach(() => { e = new BaseEnemy('goblin', 1) })

  test('_spawnTimer initialised to 0.3', () => {
    expect(e._spawnTimer).toBeCloseTo(0.3)
  })

  test('scale is 0 at construction before first tick', () => {
    expect(e._gfx.scale.x).toBe(0)
    expect(e._gfx.scale.y).toBe(0)
  })

  test('_spawnTimer reaches 0 after 0.3s of ticking', () => {
    for (let i = 0; i < 20; i++) e.tick(0.016, 50, 50)
    expect(e._spawnTimer).toBeLessThanOrEqual(0)
  })

  test('scale.y is BASE_SCALE after pop-in completes', () => {
    for (let i = 0; i < 25; i++) e.tick(0.016, 50, 50)
    expect(e._gfx.scale.y).toBeCloseTo(3, 0)
  })
})

describe('BaseEnemy idle breathing', () => {
  let e

  beforeEach(() => {
    e = new BaseEnemy('goblin', 1)
    // Complete the spawn pop-in first
    for (let i = 0; i < 25; i++) e.tick(0.016, 50, 50)
  })

  test('_idleTimer starts at 0', () => {
    expect(e._idleTimer).toBe(0)
  })

  test('_idleTimer increments when idle', () => {
    // Enemy at same position as player won't move (dist <= 2)
    e.x = 50; e.y = 50
    e._animateTick(0.1, 0, 0)
    expect(e._idleTimer).toBeGreaterThan(0)
  })

  test('_idleTimer resets when moving', () => {
    e.x = 50; e.y = 50
    e._animateTick(0.1, 0, 0)   // idle
    e._animateTick(0.1, 1, 0)   // moving
    expect(e._idleTimer).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run tests/enemySpawn.test.js
```

Expected: FAIL — `_spawnTimer is not defined`, `_idleTimer is not defined`

- [ ] **Step 3: Add `_idleTimer`, `_spawnTimer`, idle breathing, and spawn pop-in to BaseEnemy**

In `mobile/src/entities/enemies/BaseEnemy.js`:

**Constructor — add fields** (add after `_lastMoveY = 0`):

```js
this._idleTimer = 0

// Death animation
this._dying = false
this._dyingTimer = 0

// Spawn pop-in
this._spawnTimer = 0.3
```

**Constructor — set initial scale to 0** (after the sprite/graphics setup block, right before `this.addChild(this._gfx)`):

```js
this._gfx.scale.set(0)
this.addChild(this._gfx)
```

**`_animateTick` — add idle timer and breathing** (full updated method):

```js
_animateTick(dt, moveX, moveY) {
  const moving = Math.abs(moveX) + Math.abs(moveY) > 0.01

  if (moveX < 0) this._facing = -1
  else if (moveX > 0) this._facing = 1

  if (moving && this._animState !== 'hurt') {
    this._walkTimer += dt
  } else {
    this._walkTimer = 0
  }

  if (this._animTimer > 0) {
    this._animTimer -= dt
    if (this._animTimer <= 0) {
      this._animTimer = 0
      this._animState = moving ? 'walk' : 'idle'
      this._gfx.tint = 0xFFFFFF
    }
  } else {
    this._animState = moving ? 'walk' : 'idle'
  }

  if (this._animState === 'idle') {
    this._idleTimer += dt
  } else {
    this._idleTimer = 0
  }

  let sy = 1
  if (this._animState === 'idle') {
    sy = 1 + Math.sin(this._idleTimer * 1.8) * 0.03
  }

  this._gfx.scale.x = this._facing * BASE_SCALE
  this._gfx.scale.y = BASE_SCALE * sy

  const walkBob = moving ? Math.sin(this._walkTimer * Math.PI * 8) * 2 : 0
  this._knockbackOffsetX *= Math.max(0, 1 - dt * 12)
  this._knockbackOffsetY *= Math.max(0, 1 - dt * 12)
  if (Math.abs(this._knockbackOffsetX) < 0.1) this._knockbackOffsetX = 0
  if (Math.abs(this._knockbackOffsetY) < 0.1) this._knockbackOffsetY = 0
  this._gfx.x = this._knockbackOffsetX
  this._gfx.y = this._knockbackOffsetY + walkBob
}
```

**`tick` — add spawn pop-in at the end** (full updated method):

```js
tick(deltaSeconds, playerX, playerY) {
  if (this.stunTimer > 0) {
    this.stunTimer -= deltaSeconds
    this._animateTick(deltaSeconds, 0, 0)
  } else {
    if (this._slowTimer > 0) this._slowTimer -= deltaSeconds
    if (this.attackCooldown > 0) this.attackCooldown -= deltaSeconds
    this._behaviorTick(deltaSeconds, playerX, playerY)
    this._animateTick(deltaSeconds, this._lastMoveX, this._lastMoveY)
  }
  if (this._spawnTimer > 0) {
    this._spawnTimer -= deltaSeconds
    const t = Math.max(0, 1 - (Math.max(0, this._spawnTimer) / 0.3))
    const s = t < 0.7
      ? t / 0.7
      : 1 + 0.4 * ((t - 0.7) / 0.3) * (1 - (t - 0.7) / 0.3)
    const scale = BASE_SCALE * Math.max(0, s)
    this._gfx.scale.x = this._facing * scale
    this._gfx.scale.y = scale
  }
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run tests/enemySpawn.test.js
```

Expected: 7 tests PASS

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npx vitest run
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/entities/enemies/BaseEnemy.js mobile/tests/enemySpawn.test.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: add idle breathing and spawn pop-in to BaseEnemy"
```
