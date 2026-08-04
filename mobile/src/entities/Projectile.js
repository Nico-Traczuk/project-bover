import { Container, Graphics } from 'pixi.js'

export class Projectile extends Container {
  constructor({ x, y, angle, damage, speed, color, radius = 6, isMelee = false, isEnemyProjectile = false, hidden = false, ...extras }) {
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
    this._hitEnemies = isMelee ? new Set() : null
    this.rotationSpeed = isEnemyProjectile ? -3 : 4
    this._trail = []

    this.x = x
    this.y = y

    if (!hidden) {
      const g = new Graphics()
      if (isMelee) {
        g.circle(0, 0, radius).fill({ color, alpha: 0.5 })
      } else {
        g.circle(0, 0, radius).fill(color)
      }
      this.addChild(g)
    }
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
