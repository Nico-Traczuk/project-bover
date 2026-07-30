import { Container, Graphics, Sprite, Texture, Rectangle, Assets } from 'pixi.js'
import { ENEMY_TYPES, difficultyMultiplier, speedMultiplier } from '../../data/enemies.js'

const ENEMY_FRAMES = {
  goblin: { col: 0, row: 7 },
}

export class BaseEnemy extends Container {
  constructor(typeKey, depth = 1) {
    super()
    const def = ENEMY_TYPES[typeKey]
    if (!def) throw new Error(`Unknown enemy type: ${typeKey}`)

    const dm = difficultyMultiplier(depth)
    const sm = speedMultiplier(depth)

    this.stats = {
      typeKey,
      hp: Math.round(def.hp * dm),
      maxHp: Math.round(def.hp * dm),
      speed: Math.round(def.speed * sm),
      damage: Math.round(def.damage * dm),
      xpReward: def.xpReward,
      goldMin: def.goldMin,
      goldMax: def.goldMax,
    }

    this.behavior = def.behavior
    this.attackCooldown = 0
    this.stunTimer = 0
    this._slowTimer = 0

    const charTex = Assets.get('characters')
    if (charTex) {
      const { col, row } = ENEMY_FRAMES[typeKey] ?? { col: 0, row: 7 }
      const tex = new Texture({
        source: charTex.source,
        frame: new Rectangle(col * 17, row * 17, 16, 16),
      })
      this._gfx = new Sprite(tex)
      this._gfx.anchor.set(0.5)
      this._gfx.scale.set(2)
    } else {
      this._gfx = new Graphics()
      this._gfx.rect(-def.size / 2, -def.size / 2, def.size, def.size).fill(def.color)
    }
    this.addChild(this._gfx)
  }

  isAlive() {
    return this.stats.hp > 0
  }

  takeDamage(amount) {
    this.stats.hp = Math.max(0, this.stats.hp - amount)
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration)
  }

  slow(duration) {
    this._slowTimer = Math.max(this._slowTimer, duration)
  }

  tick(deltaSeconds, playerX, playerY) {
    if (this.stunTimer > 0) {
      this.stunTimer -= deltaSeconds
      return
    }
    if (this._slowTimer > 0) this._slowTimer -= deltaSeconds
    if (this.attackCooldown > 0) this.attackCooldown -= deltaSeconds
    this._behaviorTick(deltaSeconds, playerX, playerY)
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
        this.x += (dx / dist) * speed * deltaSeconds
        this.y += (dy / dist) * speed * deltaSeconds
      }
    }
    // ranged_stationary: no movement
  }

  // Returns attack data if ready to attack, null otherwise
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
      x: this.x,
      y: this.y,
      angle,
      damage: this.stats.damage,
      speed: isRanged ? 180 : 0,
      color: 0xFF4444,
      radius: 5,
      isEnemyProjectile: true,
      isMelee: !isRanged,
    }
  }

  goldDrop() {
    return this.stats.goldMin + Math.floor(Math.random() * (this.stats.goldMax - this.stats.goldMin + 1))
  }
}
