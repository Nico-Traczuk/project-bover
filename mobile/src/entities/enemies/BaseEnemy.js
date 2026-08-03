import { Container, Graphics, Sprite, Texture, Rectangle, Assets } from 'pixi.js'
import { ENEMY_TYPES, difficultyMultiplier, speedMultiplier } from '../../data/enemies.js'

const ENEMY_FRAMES = {
  goblin: { row: 7 },
}

const BASE_SCALE = 3

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
    this._walkTimer = 0
    this._knockbackOffsetX = 0
    this._knockbackOffsetY = 0
    this._lastMoveX = 0
    this._lastMoveY = 0
    this._idleTimer = 0

    // Death animation
    this._dying = false
    this._dyingTimer = 0

    // Spawn pop-in
    this._spawnTimer = 0.3

    const charTex = Assets.get('characters')
    if (charTex) {
      const { row } = ENEMY_FRAMES[typeKey] ?? { row: 7 }
      const tex = new Texture({ source: charTex.source, frame: new Rectangle(0, row * 17, 16, 16) })
      this._gfx = new Sprite(tex)
      this._gfx.anchor.set(0.5)
      this._gfx.scale.set(BASE_SCALE)
    } else {
      this._gfx = new Graphics()
      this._gfx.rect(-def.size / 2, -def.size / 2, def.size, def.size).fill(def.color)
    }
    this._gfx.scale.set(0)
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

    this._knockbackOffsetX *= Math.max(0, 1 - dt * 12)
    this._knockbackOffsetY *= Math.max(0, 1 - dt * 12)
    if (Math.abs(this._knockbackOffsetX) < 0.1) this._knockbackOffsetX = 0
    if (Math.abs(this._knockbackOffsetY) < 0.1) this._knockbackOffsetY = 0
    const walkBob = moving ? Math.sin(this._walkTimer * Math.PI * 8) * 2 : 0
    this._gfx.x = this._knockbackOffsetX
    this._gfx.y = this._knockbackOffsetY + walkBob
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
