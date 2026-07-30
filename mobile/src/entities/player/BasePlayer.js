import { Container, Graphics, Sprite, Texture, Rectangle, Assets } from 'pixi.js'
import { CLASSES } from '../../data/classes.js'

// col=0 uses the pre-assembled character column of the Kenney roguelike sheet
const CHAR_FRAMES = {
  mage: { col: 0, row: 0 },
  tank: { col: 0, row: 4 },
}

export class BasePlayer extends Container {
  constructor(classKey, metaUpgrades = []) {
    super()
    const def = CLASSES[classKey]
    if (!def) throw new Error(`Unknown class: ${classKey}`)

    this.stats = {
      classKey,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      defense: def.defense,
      damage: def.damage,
      attackSpeed: def.attackSpeed,
      extraProjectiles: 0,
      goldBonus: 0,
    }
    this._applyMeta(metaUpgrades)

    this.attackCooldown = 0
    this.invincible = false
    this._invincibleTimer = 0
    this._invincibleDuration = 0.8

    const charTex = Assets.get('characters')
    if (charTex) {
      const { col, row } = CHAR_FRAMES[classKey] ?? { col: 0, row: 0 }
      const tex = new Texture({
        source: charTex.source,
        frame: new Rectangle(col * 17, row * 17, 16, 16),
      })
      this._gfx = new Sprite(tex)
      this._gfx.anchor.set(0.5)
      this._gfx.scale.set(2)
    } else {
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

  // Subclasses override: returns array of attack descriptors
  getAttackData(targetAngle) {
    return []
  }

  takeDamage(amount) {
    if (this.invincible) return
    const dmg = Math.max(1, amount - this.stats.defense)
    this.stats.hp = Math.max(0, this.stats.hp - dmg)
    this.invincible = true
    this._invincibleTimer = this._invincibleDuration
    this.alpha = 0.5
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

  isAlive() {
    return this.stats.hp > 0
  }

  isAttackReady() {
    return this.attackCooldown <= 0
  }

  resetAttackCooldown() {
    this.attackCooldown = this.stats.attackSpeed
  }
}
