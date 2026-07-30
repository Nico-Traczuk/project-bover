import { Container, Graphics, Text } from 'pixi.js'

export class XpBar extends Container {
  constructor(width = 200, height = 12) {
    super()
    this._width = width
    this._height = height

    this._bg = new Graphics()
    this._bg.rect(0, 0, width, height).fill(0x1f2937)
    this.addChild(this._bg)

    this._bar = new Graphics()
    this.addChild(this._bar)

    this._label = new Text({ text: '', style: { fill: 0xC4B5FD, fontSize: 11 } })
    this._label.x = 4
    this._label.y = 0
    this.addChild(this._label)
  }

  update(xp, xpToNext) {
    const ratio = xpToNext > 0 ? Math.min(1, xp / xpToNext) : 0
    this._bar.clear()
    this._bar.rect(0, 0, Math.round(this._width * ratio), this._height).fill(0x6366F1)
    this._label.text = `${xp}/${xpToNext}`
  }
}
