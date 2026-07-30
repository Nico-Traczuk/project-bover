import { BasePlayer } from './BasePlayer.js'

export class Mage extends BasePlayer {
  constructor(metaUpgrades = []) {
    super('mage', metaUpgrades)
  }

  getAttackData(targetAngle) {
    const count = 1 + (this.stats.extraProjectiles || 0)
    const spread = 0.18
    const projectiles = []
    for (let i = 0; i < count; i++) {
      const offset = (i - Math.floor(count / 2)) * spread
      projectiles.push({
        x: this.x,
        y: this.y,
        angle: targetAngle + offset,
        damage: this.stats.damage,
        speed: 320,
        color: 0x818CF8,
        radius: 6,
        burn: this.stats.burn || false,
        frostSlow: this.stats.frostSlow || false,
      })
    }
    return projectiles
  }
}
