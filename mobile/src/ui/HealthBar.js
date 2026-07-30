import { Container, Graphics, Text } from 'pixi.js'

export class HealthBar extends Container {
  constructor(width = 200, height = 16) {
    super()
    this._width = width
    this._height = height

    this._bg = new Graphics()
    this._bg.rect(0, 0, width, height).fill(0x1f2937)
    this.addChild(this._bg)

    this._bar = new Graphics()
    this.addChild(this._bar)

    this._label = new Text({ text: '', style: { fill: 0xffffff, fontSize: 12 } })
    this._label.x = 4
    this._label.y = 1
    this.addChild(this._label)
  }

  update(hp, maxHp) {
    const ratio = Math.max(0, hp / maxHp)
    const color = ratio > 0.5 ? 0x22C55E : ratio > 0.25 ? 0xF59E0B : 0xEF4444
    this._bar.clear()
    this._bar.rect(0, 0, Math.round(this._width * ratio), this._height).fill(color)
    this._label.text = `${hp}/${maxHp}`
  }
}
