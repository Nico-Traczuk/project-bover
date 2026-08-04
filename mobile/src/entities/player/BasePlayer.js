import { Container, Graphics, Sprite, AnimatedSprite, Texture, Rectangle, Assets } from 'pixi.js'

import { CLASSES } from '../../data/classes.js'

const CHAR_FRAMES = {
  mage: { row: 0 },
}

const BASE_SCALE = 3

// Classes with per-animation spritesheets (96×96 frames, single row)
const CHAR_ANIM_CONFIG = {
  tank: {
    frameSize: 96,
    scale: 1.85,
    sheets: { idle: 'tank_idle', walk: 'tank_walk', attack: 'tank_attack', hurt: 'tank_hurt', death: 'tank_death' },
    speeds: { idle: 0.1, walk: 0.18, attack: 0.35, hurt: 0.25, death: 0.12 },
  },
}

function sliceSheet(texture, frameSize) {
  const cols = Math.floor(texture.width / frameSize)
  const frames = []
  for (let i = 0; i < cols; i++) {
    frames.push(new Texture({ source: texture.source, frame: new Rectangle(i * frameSize, 0, frameSize, frameSize) }))
  }
  return frames
}

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
    this._walkTimer = 0
    this._idleTimer = 0
    this._knockbackOffsetX = 0
    this._knockbackOffsetY = 0
    this._attackScaleX = 1.3
    this._attackScaleY = 1.3

    const animConfig = CHAR_ANIM_CONFIG[classKey]
    if (animConfig) {
      this._animConfig = animConfig
      this._currentAnim = null
      this._sheets = {}
      for (const [state, alias] of Object.entries(animConfig.sheets)) {
        const tex = Assets.get(alias)
        if (tex) this._sheets[state] = sliceSheet(tex, animConfig.frameSize)
      }
      const idleFrames = this._sheets.idle ?? []
      this._gfx = idleFrames.length > 0 ? new AnimatedSprite(idleFrames) : new Graphics()
      if (this._gfx instanceof AnimatedSprite) {
        this._gfx.anchor.set(0.5)
        this._gfx.scale.set(animConfig.scale)
        this._gfx.animationSpeed = animConfig.speeds.idle
        this._gfx.play()
        this._currentAnim = 'idle'
      }
    } else {
      this._animConfig = null
      const charTex = Assets.get('characters')
      if (charTex) {
        const { row } = CHAR_FRAMES[classKey] ?? { row: 0 }
        const tex = new Texture({ source: charTex.source, frame: new Rectangle(0, row * 17, 16, 16) })
        this._gfx = new Sprite(tex)
        this._gfx.anchor.set(0.5)
        this._gfx.scale.set(BASE_SCALE)
      } else {
        this._gfx = new Graphics()
        this._gfx.rect(-16, -24, 32, 32).fill(def.color)
      }
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

  _setAnimSheet(state) {
    if (!this._animConfig || !(this._gfx instanceof AnimatedSprite)) return
    if (this._currentAnim === state) return
    const frames = this._sheets[state] ?? this._sheets.idle
    if (!frames) return
    this._currentAnim = state
    this._gfx.textures = frames
    this._gfx.animationSpeed = this._animConfig.speeds[state] ?? 0.1
    this._gfx.loop = state !== 'attack' && state !== 'hurt' && state !== 'death'
    this._gfx.gotoAndPlay(0)
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

    if (this._animConfig) {
      // Real animated sprites — drive sheet swaps, skip manual bobs
      this._setAnimSheet(this._animState)
      const sc = this._animConfig.scale
      this._gfx.scale.x = this._facing * sc
      this._gfx.scale.y = sc
    } else {
      // Legacy scale-trick animation
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
    }

    this._knockbackOffsetX *= Math.max(0, 1 - dt * 12)
    this._knockbackOffsetY *= Math.max(0, 1 - dt * 12)
    if (Math.abs(this._knockbackOffsetX) < 0.1) this._knockbackOffsetX = 0
    if (Math.abs(this._knockbackOffsetY) < 0.1) this._knockbackOffsetY = 0
    const walkBob = (!this._animConfig && moving) ? Math.sin(this._walkTimer * Math.PI * 8) * 2 : 0
    this._gfx.x = this._knockbackOffsetX
    this._gfx.y = this._knockbackOffsetY + walkBob
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
