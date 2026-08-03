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
