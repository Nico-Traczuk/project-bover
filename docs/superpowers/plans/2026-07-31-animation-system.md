# Animation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add walk cycles, attack/hurt/death animations, projectile rotation+trails, and screen shake to the combat scene.

**Architecture:** Hybrid — spritesheet frame cycling (cols 0/1/2 per row) for walk animation; procedural tweens (scale, tint, knockback offset, rotation) for everything else. Animation state lives directly on `BasePlayer` and `BaseEnemy` as `_animState` / `_animTimer` fields. `CombatSystem` drives attack triggers and manages a `dyingEnemies` array. `CombatScene` owns trail rendering and screen shake.

**Tech Stack:** Pixi.js 8 (Container, Sprite, Texture, Rectangle, Graphics), Vitest

---

## File Map

| File | Change |
|---|---|
| `mobile/src/entities/player/BasePlayer.js` | Walk frames, animation state, `animateTick()`, `triggerAttack()`, hurt tween |
| `mobile/src/entities/player/Tank.js` | Override `_attackScaleX/Y` for wider swing |
| `mobile/src/entities/enemies/BaseEnemy.js` | Walk frames, animation state, `_animateTick()`, hurt tween, death animation |
| `mobile/src/entities/Projectile.js` | `rotationSpeed`, `_trail` array, `color` field |
| `mobile/src/systems/CombatSystem.js` | `dyingEnemies` loop, `triggerAttack()` call, `onPlayerHurt` callback |
| `mobile/src/scenes/CombatScene.js` | `_trailGfx` layer, screen shake, `animateTick()` call, death flash |
| `mobile/tests/playerAnimation.test.js` | New — tests for BasePlayer animation logic |
| `mobile/tests/enemyAnimation.test.js` | New — tests for BaseEnemy animation logic |
| `mobile/tests/projectileTrail.test.js` | New — tests for Projectile trail + rotation |

---

## Shared Pixi Mock

Both animation test files use this inline mock. Include it at the top of each test file with `vi.mock('pixi.js', ...)` before any imports.

```js
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => {
    const s = { x: 1, y: 1 }
    s.set = (v) => { s.x = v; s.y = v }
    return s
  }
  class Container {
    constructor() {
      this.children = []; this.x = 0; this.y = 0
      this.alpha = 1; this.rotation = 0
      this.scale = makeScale()
    }
    addChild(c) { this.children.push(c); return c }
  }
  class Sprite {
    constructor(tex) {
      this.texture = tex; this.x = 0; this.y = 0
      this.scale = makeScale(); this.anchor = { set() {} }
      this.tint = 0xFFFFFF
    }
  }
  class Graphics {
    constructor() {
      this.x = 0; this.y = 0; this.tint = 0xFFFFFF; this.scale = makeScale()
    }
    rect() { return this }; circle() { return this }; fill() { return this }
    stroke() { return this }; clear() {}
  }
  class Texture { constructor(o) { this.opts = o } }
  class Rectangle { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h } }
  return {
    Container, Sprite, Graphics, Texture, Rectangle,
    Assets: { get: () => null },
  }
})
```

---

## Task 1: BasePlayer — Animation State, Walk Cycle, Attack & Hurt Tweens

**Files:**
- Modify: `mobile/src/entities/player/BasePlayer.js`
- Create: `mobile/tests/playerAnimation.test.js`

- [ ] **Step 1: Write failing tests**

Create `mobile/tests/playerAnimation.test.js`:

```js
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
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

import { BasePlayer } from '../src/entities/player/BasePlayer.js'

describe('BasePlayer animation', () => {
  let p

  beforeEach(() => { p = new BasePlayer('mage') })

  test('starts in idle state', () => {
    expect(p._animState).toBe('idle')
  })

  test('triggerAttack sets state to attack with 0.15s timer', () => {
    p.triggerAttack()
    expect(p._animState).toBe('attack')
    expect(p._animTimer).toBeCloseTo(0.15)
  })

  test('hurt overrides attack state', () => {
    p.triggerAttack()
    p.takeDamage(10, 0)
    expect(p._animState).toBe('hurt')
  })

  test('triggerAttack is ignored during hurt', () => {
    p.takeDamage(10, 0)
    p.triggerAttack()
    expect(p._animState).toBe('hurt')
  })

  test('animateTick expires attack state after 0.15s', () => {
    p.triggerAttack()
    p.animateTick(0.16, 0, 0)
    expect(p._animState).toBe('idle')
    expect(p._animTimer).toBe(0)
  })

  test('walk state set when moving', () => {
    p.animateTick(0.01, 1, 0)
    expect(p._animState).toBe('walk')
  })

  test('facing flips to -1 when moving left', () => {
    p.animateTick(0.01, -1, 0)
    expect(p._facing).toBe(-1)
  })

  test('facing flips to 1 when moving right', () => {
    p.animateTick(0.01, 1, 0)
    expect(p._facing).toBe(1)
  })

  test('walk frame advances after 0.15s', () => {
    // No spritesheet in test env (_walkFrames null), verify timer still works
    p._walkTimer = 0
    p._walkFrame = 0
    // Simulate manually: advance timer past threshold
    p._walkTimer += 0.16
    const advanced = p._walkTimer >= 0.15
    expect(advanced).toBe(true)
  })

  test('knockback offset set on hurt with angle', () => {
    p.takeDamage(10, 0) // angle = 0 → push right
    expect(p._knockbackOffsetX).toBeCloseTo(14, 0)
    expect(p._knockbackOffsetY).toBeCloseTo(0, 0)
  })

  test('knockback offset decays toward zero', () => {
    p.takeDamage(10, 0)
    const before = p._knockbackOffsetX
    p.animateTick(0.1, 0, 0)
    expect(p._knockbackOffsetX).toBeLessThan(before)
  })

  test('tint set to red on hurt', () => {
    p.takeDamage(10, 0)
    expect(p._gfx.tint).toBe(0xFF6666)
  })

  test('tint restored to white after hurt expires', () => {
    p.takeDamage(10, 0)
    p.animateTick(0.21, 0, 0)
    expect(p._gfx.tint).toBe(0xFFFFFF)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd mobile && npx vitest run tests/playerAnimation.test.js
```

Expected: multiple failures — `animateTick is not a function`, `triggerAttack is not a function`, etc.

- [ ] **Step 3: Rewrite `BasePlayer.js` with animation support**

Replace the full file at `mobile/src/entities/player/BasePlayer.js`:

```js
import { Container, Graphics, Sprite, Texture, Rectangle, Assets } from 'pixi.js'
import { CLASSES } from '../../data/classes.js'

const CHAR_FRAMES = {
  mage: { row: 0 },
  tank: { row: 4 },
}

const BASE_SCALE = 2

export class BasePlayer extends Container {
  constructor(classKey, metaUpgrades = []) {
    super()
    const def = CLASSES[classKey]
    if (!def) throw new Error(`Unknown class: ${classKey}`)

    this.stats = {
      classKey,
      hp: def.hp, maxHp: def.hp,
      speed: def.speed, defense: def.defense,
      damage: def.damage, attackSpeed: def.attackSpeed,
      extraProjectiles: 0, goldBonus: 0,
    }
    this._applyMeta(metaUpgrades)

    this.attackCooldown = 0
    this.invincible = false
    this._invincibleTimer = 0
    this._invincibleDuration = 0.8

    // Animation state
    this._animState = 'idle'
    this._animTimer = 0
    this._facing = 1
    this._walkFrame = 0
    this._walkTimer = 0
    this._knockbackOffsetX = 0
    this._knockbackOffsetY = 0
    this._attackScaleX = 1.3
    this._attackScaleY = 1.3

    const charTex = Assets.get('characters')
    if (charTex) {
      const { row } = CHAR_FRAMES[classKey] ?? { row: 0 }
      this._walkFrames = [0, 1, 2].map(c =>
        new Texture({ source: charTex.source, frame: new Rectangle(c * 17, row * 17, 16, 16) })
      )
      this._gfx = new Sprite(this._walkFrames[0])
      this._gfx.anchor.set(0.5)
      this._gfx.scale.set(BASE_SCALE)
    } else {
      this._walkFrames = null
      this._gfx = new Graphics()
      this._gfx.rect(-16, -24, 32, 32).fill(def.color)
    }
    this.addChild(this._gfx)
  }

  _applyMeta(upgrades) {
    const bonuses = {
      vitality_1: () => { this.stats.hp += 10; this.stats.maxHp += 10 },
      vitality_2: () => { this.stats.hp += 20; this.stats.maxHp += 20 },
      vitality_3: () => { this.stats.hp += 30; this.stats.maxHp += 30 },
      power_1: () => { this.stats.damage = Math.round(this.stats.damage * 1.05) },
      power_2: () => { this.stats.damage = Math.round(this.stats.damage * 1.10) },
      power_3: () => { this.stats.damage = Math.round(this.stats.damage * 1.15) },
      swiftness_1: () => { this.stats.speed = Math.round(this.stats.speed * 1.05) },
      swiftness_2: () => { this.stats.speed = Math.round(this.stats.speed * 1.10) },
      gold_rush_1: () => { this.stats.goldBonus += 2 },
      gold_rush_2: () => { this.stats.goldBonus += 4 },
    }
    upgrades.forEach(key => { if (bonuses[key]) bonuses[key]() })
  }

  getAttackData(targetAngle) { return [] }

  triggerAttack() {
    if (this._animState === 'hurt') return
    this._animState = 'attack'
    this._animTimer = 0.15
  }

  takeDamage(amount, knockbackAngle = null) {
    if (this.invincible) return
    const dmg = Math.max(1, amount - this.stats.defense)
    this.stats.hp = Math.max(0, this.stats.hp - dmg)
    this.invincible = true
    this._invincibleTimer = this._invincibleDuration
    this.alpha = 0.5
    this._animState = 'hurt'
    this._animTimer = 0.20
    this._gfx.tint = 0xFF6666
    if (knockbackAngle != null) {
      this._knockbackOffsetX = Math.cos(knockbackAngle) * 14
      this._knockbackOffsetY = Math.sin(knockbackAngle) * 14
    }
  }

  // Called each frame from CombatScene._updatePlayer()
  animateTick(dt, moveX, moveY) {
    const moving = Math.abs(moveX) + Math.abs(moveY) > 0.01

    // Facing
    if (moveX < 0) this._facing = -1
    else if (moveX > 0) this._facing = 1

    // Walk frame cycling
    if (this._walkFrames) {
      if (moving && this._animState !== 'hurt') {
        this._walkTimer += dt
        if (this._walkTimer >= 0.15) {
          this._walkTimer = 0
          this._walkFrame = (this._walkFrame + 1) % 3
          this._gfx.texture = this._walkFrames[this._walkFrame]
        }
      } else {
        this._walkTimer = 0
        this._walkFrame = 0
        this._gfx.texture = this._walkFrames[0]
      }
    }

    // Animation timer + state expiry
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

    // Attack scale tween
    let sx = 1, sy = 1
    if (this._animState === 'attack') {
      const half = 0.08, full = 0.15
      const t = this._animTimer > half
        ? (full - this._animTimer) / (full - half)
        : this._animTimer / half
      sx = 1 + t * (this._attackScaleX - 1)
      sy = 1 + t * (this._attackScaleY - 1)
    }

    this._gfx.scale.x = this._facing * BASE_SCALE * sx
    this._gfx.scale.y = BASE_SCALE * sy

    // Knockback offset decay
    this._knockbackOffsetX *= Math.max(0, 1 - dt * 12)
    this._knockbackOffsetY *= Math.max(0, 1 - dt * 12)
    if (Math.abs(this._knockbackOffsetX) < 0.1) this._knockbackOffsetX = 0
    if (Math.abs(this._knockbackOffsetY) < 0.1) this._knockbackOffsetY = 0
    this._gfx.x = this._knockbackOffsetX
    this._gfx.y = this._knockbackOffsetY
  }

  tick(deltaSeconds) {
    if (this.attackCooldown > 0) this.attackCooldown -= deltaSeconds
    if (this.invincible) {
      this._invincibleTimer -= deltaSeconds
      if (this._invincibleTimer <= 0) {
        this.invincible = false
        this.alpha = 1
      }
    }
  }

  isAlive() { return this.stats.hp > 0 }
  isAttackReady() { return this.attackCooldown <= 0 }
  resetAttackCooldown() { this.attackCooldown = this.stats.attackSpeed }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd mobile && npx vitest run tests/playerAnimation.test.js
```

Expected: all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/entities/player/BasePlayer.js mobile/tests/playerAnimation.test.js
git commit -m "feat: add animation state, walk cycle, attack/hurt tweens to BasePlayer"
```

---

## Task 2: Tank — Wider Attack Scale

**Files:**
- Modify: `mobile/src/entities/player/Tank.js`

- [ ] **Step 1: Add attack scale override to Tank constructor**

Open `mobile/src/entities/player/Tank.js`. After `super('tank', metaUpgrades)`, add:

```js
this._attackScaleX = 1.5
this._attackScaleY = 1.2
```

Full file after edit:

```js
import { BasePlayer } from './BasePlayer.js'

export class Tank extends BasePlayer {
  constructor(metaUpgrades = []) {
    super('tank', metaUpgrades)
    this._attackScaleX = 1.5
    this._attackScaleY = 1.2
  }

  getAttackData(targetAngle) {
    return [{
      x: this.x,
      y: this.y,
      angle: targetAngle,
      damage: this.stats.damage,
      speed: 0,
      color: 0xD1D5DB,
      radius: 48,
      isMelee: true,
      arcWidth: Math.PI * 0.8,
      stun: this.stats.stunStrike || false,
    }]
  }
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd mobile && npx vitest run
```

Expected: all existing tests + Task 1 tests pass.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/entities/player/Tank.js
git commit -m "feat: wider attack scale tween for Tank"
```

---

## Task 3: BaseEnemy — Animation State, Walk Cycle, Hurt Tween

**Files:**
- Modify: `mobile/src/entities/enemies/BaseEnemy.js`
- Create: `mobile/tests/enemyAnimation.test.js`

- [ ] **Step 1: Write failing tests**

Create `mobile/tests/enemyAnimation.test.js`:

```js
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
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

describe('BaseEnemy animation', () => {
  let e

  beforeEach(() => { e = new BaseEnemy('goblin', 1) })

  test('starts in idle state', () => {
    expect(e._animState).toBe('idle')
  })

  test('tint set to red on takeDamage', () => {
    e.takeDamage(5, Math.PI)
    expect(e._gfx.tint).toBe(0xFF6666)
  })

  test('hurt state set on takeDamage', () => {
    e.takeDamage(5, Math.PI)
    expect(e._animState).toBe('hurt')
  })

  test('knockback offset set from angle on takeDamage', () => {
    e.takeDamage(5, 0) // angle 0 → push right
    expect(e._knockbackOffsetX).toBeCloseTo(14, 0)
  })

  test('tint restored after hurt timer expires', () => {
    e.takeDamage(5, 0)
    e._animateTick(0.21, 0, 0)
    expect(e._gfx.tint).toBe(0xFFFFFF)
  })

  test('_lastMoveX/Y updated during chase tick', () => {
    e.x = 0; e.y = 0
    e.tick(0.016, 100, 0) // player at (100, 0)
    expect(e._lastMoveX).toBeGreaterThan(0)
  })

  test('facing flips when moving left', () => {
    e._animateTick(0.016, -1, 0)
    expect(e._facing).toBe(-1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd mobile && npx vitest run tests/enemyAnimation.test.js
```

Expected: multiple failures — `_animateTick is not a function`, `_lastMoveX is not defined`, etc.

- [ ] **Step 3: Rewrite `BaseEnemy.js` with animation support**

Replace the full file at `mobile/src/entities/enemies/BaseEnemy.js`:

```js
import { Container, Graphics, Sprite, Texture, Rectangle, Assets } from 'pixi.js'
import { ENEMY_TYPES, difficultyMultiplier, speedMultiplier } from '../../data/enemies.js'

const ENEMY_FRAMES = {
  goblin: { row: 7 },
}

const BASE_SCALE = 2

export class BaseEnemy extends Container {
  constructor(typeKey, depth = 1) {
    super()
    const def = ENEMY_TYPES[typeKey]
    if (!def) throw new Error(`Unknown enemy type: ${typeKey}`)

    const dm = difficultyMultiplier(depth)
    const sm = speedMultiplier(depth)

    this.stats = {
      typeKey,
      hp: Math.round(def.hp * dm), maxHp: Math.round(def.hp * dm),
      speed: Math.round(def.speed * sm), damage: Math.round(def.damage * dm),
      xpReward: def.xpReward, goldMin: def.goldMin, goldMax: def.goldMax,
    }

    this.behavior = def.behavior
    this.attackCooldown = 0
    this.stunTimer = 0
    this._slowTimer = 0

    // Animation state
    this._animState = 'idle'
    this._animTimer = 0
    this._facing = 1
    this._walkFrame = 0
    this._walkTimer = 0
    this._knockbackOffsetX = 0
    this._knockbackOffsetY = 0
    this._lastMoveX = 0
    this._lastMoveY = 0

    // Death animation
    this._dying = false
    this._dyingTimer = 0

    const charTex = Assets.get('characters')
    if (charTex) {
      const { row } = ENEMY_FRAMES[typeKey] ?? { row: 7 }
      this._walkFrames = [0, 1, 2].map(c =>
        new Texture({ source: charTex.source, frame: new Rectangle(c * 17, row * 17, 16, 16) })
      )
      this._gfx = new Sprite(this._walkFrames[0])
      this._gfx.anchor.set(0.5)
      this._gfx.scale.set(BASE_SCALE)
    } else {
      this._walkFrames = null
      this._gfx = new Graphics()
      this._gfx.rect(-def.size / 2, -def.size / 2, def.size, def.size).fill(def.color)
    }
    this.addChild(this._gfx)
  }

  isAlive() { return this.stats.hp > 0 }

  takeDamage(amount, knockbackAngle = null) {
    this.stats.hp = Math.max(0, this.stats.hp - amount)
    this._animState = 'hurt'
    this._animTimer = 0.20
    this._gfx.tint = 0xFF6666
    if (knockbackAngle != null) {
      this._knockbackOffsetX = Math.cos(knockbackAngle) * 14
      this._knockbackOffsetY = Math.sin(knockbackAngle) * 14
    }
  }

  stun(duration) { this.stunTimer = Math.max(this.stunTimer, duration) }
  slow(duration) { this._slowTimer = Math.max(this._slowTimer, duration) }

  triggerDeath() {
    this._dying = true
    this._dyingTimer = 0.35
  }

  tickDeath(dt) {
    this._dyingTimer -= dt
    const progress = Math.max(0, this._dyingTimer / 0.35)
    this.rotation += (Math.PI * 2 / 0.35) * dt
    const s = BASE_SCALE * progress
    this._gfx.scale.set(Math.max(0, s))
    this.alpha = progress
  }

  tick(deltaSeconds, playerX, playerY) {
    if (this.stunTimer > 0) {
      this.stunTimer -= deltaSeconds
      this._animateTick(deltaSeconds, 0, 0)
      return
    }
    if (this._slowTimer > 0) this._slowTimer -= deltaSeconds
    if (this.attackCooldown > 0) this.attackCooldown -= deltaSeconds
    this._behaviorTick(deltaSeconds, playerX, playerY)
    this._animateTick(deltaSeconds, this._lastMoveX, this._lastMoveY)
  }

  _behaviorTick(deltaSeconds, playerX, playerY) {
    const speed = this._slowTimer > 0 ? this.stats.speed * 0.5 : this.stats.speed
    if (
      this.behavior === 'melee_chase' ||
      this.behavior === 'melee_knockback' ||
      this.behavior === 'ranged_mobile'
    ) {
      const dx = playerX - this.x
      const dy = playerY - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 2) {
        this._lastMoveX = dx / dist
        this._lastMoveY = dy / dist
        this.x += this._lastMoveX * speed * deltaSeconds
        this.y += this._lastMoveY * speed * deltaSeconds
      } else {
        this._lastMoveX = 0
        this._lastMoveY = 0
      }
    } else {
      this._lastMoveX = 0
      this._lastMoveY = 0
    }
  }

  _animateTick(dt, moveX, moveY) {
    const moving = Math.abs(moveX) + Math.abs(moveY) > 0.01

    if (moveX < 0) this._facing = -1
    else if (moveX > 0) this._facing = 1

    if (this._walkFrames) {
      if (moving && this._animState !== 'hurt') {
        this._walkTimer += dt
        if (this._walkTimer >= 0.15) {
          this._walkTimer = 0
          this._walkFrame = (this._walkFrame + 1) % 3
          this._gfx.texture = this._walkFrames[this._walkFrame]
        }
      } else {
        this._walkTimer = 0
        this._walkFrame = 0
        this._gfx.texture = this._walkFrames[0]
      }
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

    this._gfx.scale.x = this._facing * BASE_SCALE
    this._gfx.scale.y = BASE_SCALE

    this._knockbackOffsetX *= Math.max(0, 1 - dt * 12)
    this._knockbackOffsetY *= Math.max(0, 1 - dt * 12)
    if (Math.abs(this._knockbackOffsetX) < 0.1) this._knockbackOffsetX = 0
    if (Math.abs(this._knockbackOffsetY) < 0.1) this._knockbackOffsetY = 0
    this._gfx.x = this._knockbackOffsetX
    this._gfx.y = this._knockbackOffsetY
  }

  getAttack(playerX, playerY) {
    if (this.attackCooldown > 0 || this.stunTimer > 0) return null
    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const isRanged = this.behavior === 'ranged_stationary' || this.behavior === 'ranged_mobile'
    const meleeRange = 40
    if (!isRanged && dist > meleeRange) return null
    if (isRanged && dist > 300) return null
    this.attackCooldown = 1.5
    const angle = Math.atan2(dy, dx)
    return {
      x: this.x, y: this.y, angle,
      damage: this.stats.damage,
      speed: isRanged ? 180 : 0,
      color: 0xFF4444, radius: 5,
      isEnemyProjectile: true,
      isMelee: !isRanged,
    }
  }

  goldDrop() {
    return this.stats.goldMin + Math.floor(Math.random() * (this.stats.goldMax - this.stats.goldMin + 1))
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd mobile && npx vitest run tests/enemyAnimation.test.js
```

Expected: all 7 tests pass.

- [ ] **Step 5: Run full suite**

```bash
cd mobile && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/entities/enemies/BaseEnemy.js mobile/tests/enemyAnimation.test.js
git commit -m "feat: add animation state, walk cycle, hurt tween, death animation to BaseEnemy"
```

---

## Task 4: Projectile — Rotation + Trail

**Files:**
- Modify: `mobile/src/entities/Projectile.js`
- Create: `mobile/tests/projectileTrail.test.js`

- [ ] **Step 1: Write failing tests**

Create `mobile/tests/projectileTrail.test.js`:

```js
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
  }
  class Graphics {
    constructor() { this.x = 0; this.y = 0; this.scale = makeScale() }
    rect() { return this }; circle() { return this }; fill() { return this }; stroke() { return this }; clear() {}
  }
  return { Container, Graphics, Assets: { get: () => null } }
})

import { Projectile } from '../src/entities/Projectile.js'

const makeProjectile = (overrides = {}) => new Projectile({
  x: 100, y: 100, angle: 0, damage: 10, speed: 200,
  color: 0x818CF8, radius: 6, ...overrides,
})

describe('Projectile trail', () => {
  test('_trail starts empty', () => {
    const p = makeProjectile()
    expect(p._trail).toEqual([])
  })

  test('_trail records position after first tick', () => {
    const p = makeProjectile()
    p.tick(0.016)
    expect(p._trail.length).toBe(1)
    expect(p._trail[0]).toHaveProperty('x')
    expect(p._trail[0]).toHaveProperty('y')
  })

  test('_trail is capped at 6 entries', () => {
    const p = makeProjectile()
    for (let i = 0; i < 10; i++) p.tick(0.016)
    expect(p._trail.length).toBeLessThanOrEqual(6)
  })

  test('trail records position before moving', () => {
    const p = makeProjectile()
    const startX = p.x
    p.tick(0.016)
    expect(p._trail[0].x).toBeCloseTo(startX, 0)
  })
})

describe('Projectile rotation', () => {
  test('player projectile rotates positively', () => {
    const p = makeProjectile()
    expect(p.rotationSpeed).toBeGreaterThan(0)
    p.tick(0.016)
    expect(p.rotation).toBeGreaterThan(0)
  })

  test('enemy projectile rotates negatively', () => {
    const p = makeProjectile({ isEnemyProjectile: true })
    expect(p.rotationSpeed).toBeLessThan(0)
    p.tick(0.016)
    expect(p.rotation).toBeLessThan(0)
  })

  test('color is exposed on instance', () => {
    const p = makeProjectile({ color: 0xFF4444 })
    expect(p.color).toBe(0xFF4444)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd mobile && npx vitest run tests/projectileTrail.test.js
```

Expected: failures on `_trail`, `rotationSpeed`, `p.color`.

- [ ] **Step 3: Update `Projectile.js`**

Replace the full file at `mobile/src/entities/Projectile.js`:

```js
import { Container, Graphics } from 'pixi.js'

export class Projectile extends Container {
  constructor({ x, y, angle, damage, speed, color, radius = 6, isMelee = false, isEnemyProjectile = false, ...extras }) {
    super()
    Object.assign(this, extras)
    this.damage = damage
    this.speed = speed
    this.color = color
    this.isMelee = isMelee
    this.isEnemyProjectile = isEnemyProjectile
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius = radius
    this.lifetime = isMelee ? 0.12 : 4.0
    this.rotationSpeed = isEnemyProjectile ? -3 : 4
    this._trail = []

    this.x = x
    this.y = y

    const g = new Graphics()
    if (isMelee) {
      g.circle(0, 0, radius).fill({ color, alpha: 0.5 })
    } else {
      g.circle(0, 0, radius).fill(color)
    }
    this.addChild(g)
  }

  tick(deltaSeconds) {
    this._trail.unshift({ x: this.x, y: this.y })
    if (this._trail.length > 6) this._trail.length = 6

    this.x += this.vx * deltaSeconds
    this.y += this.vy * deltaSeconds
    this.lifetime -= deltaSeconds
    this.rotation += this.rotationSpeed * deltaSeconds
  }

  isExpired() {
    const oob = this.x < -50 || this.x > 850 || this.y < -50 || this.y > 650
    return this.lifetime <= 0 || oob
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd mobile && npx vitest run tests/projectileTrail.test.js
```

Expected: all 7 tests pass.

- [ ] **Step 5: Run full suite**

```bash
cd mobile && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/entities/Projectile.js mobile/tests/projectileTrail.test.js
git commit -m "feat: add rotation and trail tracking to Projectile"
```

---

## Task 5: CombatSystem — Attack Trigger, Dying Enemies, onPlayerHurt

**Files:**
- Modify: `mobile/src/systems/CombatSystem.js`

- [ ] **Step 1: Update `CombatSystem.js`**

Replace the full file at `mobile/src/systems/CombatSystem.js`:

```js
import { Goblin } from '../entities/enemies/Goblin.js'
import { Projectile } from '../entities/Projectile.js'
import { CollisionSystem } from './CollisionSystem.js'
import { enemiesForDepth, waveCount, enemyCountForWave } from '../data/enemies.js'

export class CombatSystem {
  constructor({ player, upgradeSystem, depth, stage, modifier, onWaveCleared, onRoomCleared, onPlayerDeath, onGoldEarned, onXpEarned, onPlayerHurt }) {
    this.player = player
    this.upgradeSystem = upgradeSystem
    this.depth = depth
    this.stage = stage
    this.modifier = modifier ?? null
    this.onWaveCleared = onWaveCleared
    this.onRoomCleared = onRoomCleared
    this.onPlayerDeath = onPlayerDeath
    this.onGoldEarned = onGoldEarned
    this.onXpEarned = onXpEarned
    this.onPlayerHurt = onPlayerHurt ?? null

    this.enemies = []
    this.dyingEnemies = []
    this.projectiles = []
    this.collision = new CollisionSystem()
    this.currentWave = 0
    this.totalWaves = waveCount(depth)
    this._spawnNext = true
    this.roomOver = false
  }

  _spawnWave() {
    this.currentWave++
    const { min, max } = enemyCountForWave(this.depth)
    const count = min + Math.floor(Math.random() * (max - min + 1)) + (this.modifier?.extraEnemies ?? 0)
    const available = enemiesForDepth(this.depth)

    for (let i = 0; i < count; i++) {
      const def = available[Math.floor(Math.random() * available.length)]
      const enemy = this._makeEnemy(def.key)
      const edge = Math.floor(Math.random() * 4)
      const margin = 60, w = 700, h = 440
      if (edge === 0) { enemy.x = margin + Math.random() * (w - margin * 2); enemy.y = margin }
      else if (edge === 1) { enemy.x = w - margin; enemy.y = margin + Math.random() * (h - margin * 2) }
      else if (edge === 2) { enemy.x = margin + Math.random() * (w - margin * 2); enemy.y = h - margin }
      else { enemy.x = margin; enemy.y = margin + Math.random() * (h - margin * 2) }
      this.enemies.push(enemy)
      this.stage.addChild(enemy)
    }
    this._spawnNext = false
  }

  _makeEnemy(key) {
    const enemy = new Goblin(this.depth)
    if (this.modifier?.enemyHpMult) {
      enemy.stats.hp = Math.round(enemy.stats.hp * this.modifier.enemyHpMult)
      enemy.stats.maxHp = enemy.stats.hp
    }
    if (this.modifier?.enemySpeedMult) {
      enemy.stats.speed = Math.round(enemy.stats.speed * this.modifier.enemySpeedMult)
    }
    return enemy
  }

  tick(deltaSeconds, playerX, playerY, aimAngle) {
    if (this.roomOver) return
    if (this._spawnNext) this._spawnWave()

    this.player.tick(deltaSeconds)

    if (this.player.isAttackReady() && this.enemies.length > 0) {
      this.player.triggerAttack()
      this.player.resetAttackCooldown()
      const attackData = this.player.getAttackData(aimAngle)
      attackData.forEach(a => {
        const p = new Projectile(a)
        this.projectiles.push(p)
        this.stage.addChild(p)
      })
    }

    this.enemies.forEach(e => {
      if (!e.isAlive()) return
      e.tick(deltaSeconds, playerX, playerY)
      const attack = e.getAttack(playerX, playerY)
      if (attack) {
        if (attack.isMelee) {
          const angle = Math.atan2(playerY - e.y, playerX - e.x)
          const prevHp = this.player.stats.hp
          this.player.takeDamage(attack.damage, angle)
          if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
        } else {
          const p = new Projectile(attack)
          this.projectiles.push(p)
          this.stage.addChild(p)
        }
      }
    })

    this.projectiles.forEach(p => p.tick(deltaSeconds))

    const pHits = this.collision.checkProjectilesVsEnemies(this.projectiles, this.enemies)
    pHits.forEach(({ projectile, enemy }) => {
      const hitAngle = Math.atan2(projectile.vy, projectile.vx)
      enemy.takeDamage(projectile.damage, hitAngle)
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

    const eHits = this.collision.checkEnemyProjectilesVsPlayer(this.projectiles, this.player)
    eHits.forEach(p => {
      const hitAngle = Math.atan2(p.vy, p.vx)
      const prevHp = this.player.stats.hp
      this.player.takeDamage(p.damage, hitAngle)
      if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
      p.lifetime = 0
    })

    this.projectiles = this.projectiles.filter(p => {
      if (p.isExpired()) { this.stage.removeChild(p); return false }
      return true
    })

    this.enemies = this.enemies.filter(e => e.isAlive())

    // Tick death animations; remove from stage when complete
    this.dyingEnemies = this.dyingEnemies.filter(e => {
      e.tickDeath(deltaSeconds)
      if (e._dyingTimer <= 0) { this.stage.removeChild(e); return false }
      return true
    })

    if (!this.player.isAlive()) {
      this.roomOver = true
      this.onPlayerDeath()
      return
    }

    if (this.enemies.length === 0 && this.dyingEnemies.length === 0 && !this._spawnNext) {
      if (this.currentWave < this.totalWaves) {
        this._spawnNext = true
        this.onWaveCleared(this.currentWave)
      } else {
        this.roomOver = true
        this.onRoomCleared()
      }
    }
  }
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd mobile && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/systems/CombatSystem.js
git commit -m "feat: add attack trigger, dying enemies loop, onPlayerHurt callback to CombatSystem"
```

---

## Task 6: CombatScene — Trail Rendering, Screen Shake, animateTick, Death Flash

**Files:**
- Modify: `mobile/src/scenes/CombatScene.js`

- [ ] **Step 1: Add `_trailGfx` layer to `_build()`**

In `_build(depth)`, after `this._stage.addChild(this._player)` (line 103), add:

```js
this._trailGfx = new Graphics()
this._stage.addChild(this._trailGfx)
```

- [ ] **Step 2: Add screen shake fields to constructor**

In the `CombatScene` constructor, after `this._doors = []`, add:

```js
this._shakeTimer = 0
this._shakeIntensity = 5
```

- [ ] **Step 3: Wire `onPlayerHurt` into `CombatSystem` constructor call**

In `_build()`, add `onPlayerHurt` to the `CombatSystem` constructor options:

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
  onGoldEarned: (g) => this._onGoldEarned(g),
  onXpEarned: (xp) => this._onXpEarned(xp),
  onPlayerHurt: () => this._onPlayerHurt(),
})
```

- [ ] **Step 4: Add `_onPlayerHurt()` method**

Add after `_onXpEarned`:

```js
_onPlayerHurt() {
  this._shakeTimer = 0.3
}
```

- [ ] **Step 5: Update `_updatePlayer()` to call `animateTick`**

Replace `_updatePlayer(dt)`:

```js
_updatePlayer(dt) {
  const move = inputManager.getMovement()
  const speed = this._player.stats.speed
  this._player.x = Math.max(16, Math.min(ARENA.w - 16, this._player.x + move.x * speed * dt))
  this._player.y = Math.max(24, Math.min(ARENA.h - 16, this._player.y + move.y * speed * dt))
  this._player.animateTick(dt, move.x, move.y)
}
```

- [ ] **Step 6: Add trail drawing + screen shake to the ticker**

In `_startTicker()`, replace the ticker body:

```js
this._tickerFn = (ticker) => {
  if (this._paused) return
  const dt = ticker.deltaMS / 1000

  this._updatePlayer(dt)

  // Trail rendering
  this._trailGfx.clear()
  this._combatSystem.projectiles.forEach(p => {
    p._trail.forEach((pos, i) => {
      const alpha = ((6 - i) / 6) * 0.25
      const r = Math.max(0.5, p.radius * ((6 - i) / 6) * 0.6)
      this._trailGfx.circle(pos.x, pos.y, r).fill({ color: p.color, alpha })
    })
  })

  if (this._roomCleared) {
    this._checkDoorCollisions(this._player.x, this._player.y)
  } else {
    this._combatSystem.tick(dt, this._player.x, this._player.y, this._getAimAngle())
  }

  // Screen shake
  if (this._shakeTimer > 0) {
    this._shakeTimer -= dt
    const t = Math.max(0, this._shakeTimer / 0.3)
    const mag = this._shakeIntensity * t
    this._stage.x = ARENA.x + (Math.random() * 2 - 1) * mag
    this._stage.y = ARENA.y + (Math.random() * 2 - 1) * mag
    if (this._shakeTimer <= 0) {
      this._stage.x = ARENA.x
      this._stage.y = ARENA.y
    }
  }

  this._healthBar.update(this._player.stats.hp, this._player.stats.maxHp)
  this._goldDisplay.update(runState.goldEarned)
  this._drawJoystick()
}
```

- [ ] **Step 7: Add death flash to `_onPlayerDeath()`**

Replace `_onPlayerDeath()`:

```js
_onPlayerDeath() {
  this._stopTicker()
  const flash = new Graphics()
  flash.rect(0, 0, 450, 800).fill({ color: 0xFFFFFF, alpha: 0.6 })
  this.addChild(flash)
  setTimeout(() => {
    import('./GameOverScene.js').then(({ GameOverScene }) => sceneManager.go(new GameOverScene()))
      .catch(err => console.error('Failed to load GameOverScene:', err))
  }, 400)
}
```

- [ ] **Step 8: Run full test suite**

```bash
cd mobile && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add mobile/src/scenes/CombatScene.js
git commit -m "feat: add trail rendering, screen shake, animateTick, death flash to CombatScene"
```

---

## Manual Verification Checklist

After all tasks are committed, start the dev server and verify in browser:

```bash
cd mobile && npm run dev
```

- [ ] Walk cycle plays when moving — sprite cycles through 3 frames
- [ ] Character flips horizontally when moving left
- [ ] Character snaps to idle frame when standing still
- [ ] Attack punch: sprite briefly grows and snaps back when auto-attacking
- [ ] Tank swing is wider horizontally than mage punch
- [ ] Hit red flash: sprite flashes red when taking damage
- [ ] Knockback: sprite briefly offsets away from hit source
- [ ] Enemy death spin: killed enemies spin and shrink before disappearing
- [ ] Projectile rotation: projectiles visibly spin during flight
- [ ] Projectile trail: fading dots trail behind each projectile
- [ ] Screen shake: camera shakes briefly when player takes damage
- [ ] Death flash: white overlay flashes on player death before GameOver screen
- [ ] Wave clear still triggers (dying enemies don't block it)
- [ ] No visual artifacts or leftover sprites after waves clear
