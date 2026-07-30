import { Container, Text, NineSliceSprite, Assets } from 'pixi.js'

export class GoldDisplay extends Container {
  constructor() {
    super()

    const panelFillTex = Assets.get('ui_panel_fill')
    if (panelFillTex) {
      const fill = new NineSliceSprite({
        texture: panelFillTex,
        leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8,
      })
      fill.width = 130
      fill.height = 28
      fill.tint = 0x0f172a
      this.addChild(fill)

      const borderTex = Assets.get('ui_panel_border')
      if (borderTex) {
        const border = new NineSliceSprite({
          texture: borderTex,
          leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8,
        })
        border.width = 130
        border.height = 28
        border.tint = 0xC8A857
        this.addChild(border)
      }
    }

    this._text = new Text({ text: '⚙ 0', style: { fill: 0xF59E0B, fontSize: 15 } })
    this._text.x = 10
    this._text.y = 5
    this.addChild(this._text)
  }

  update(gold) {
    this._text.text = `Gold: ${gold}`
  }
}
