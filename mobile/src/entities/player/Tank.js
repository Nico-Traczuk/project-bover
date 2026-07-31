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
