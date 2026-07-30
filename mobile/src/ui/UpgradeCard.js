import { Container, Graphics, Sprite, Text, NineSliceSprite, Assets } from 'pixi.js'

const CORNER = 10
const CARD_W = 130
const CARD_H = 240

export class UpgradeCard extends Container {
  constructor(item, x, y, onClick) {
    super()

    const panelFillTex = Assets.get('ui_panel_fill')
    if (panelFillTex) {
      const fill = new NineSliceSprite({
        texture: panelFillTex,
        leftWidth: CORNER, topHeight: CORNER,
        rightWidth: CORNER, bottomHeight: CORNER,
      })
      fill.width = CARD_W
      fill.height = CARD_H
      fill.tint = 0x0f172a
      this.addChild(fill)
    } else {
      const bg = new Graphics()
      bg.rect(0, 0, CARD_W, CARD_H).fill(0x1e293b)
      this.addChild(bg)
    }

    const panelBorderTex = Assets.get('ui_panel_border')
    if (panelBorderTex) {
      const border = new NineSliceSprite({
        texture: panelBorderTex,
        leftWidth: CORNER, topHeight: CORNER,
        rightWidth: CORNER, bottomHeight: CORNER,
      })
      border.width = CARD_W
      border.height = CARD_H
      border.tint = 0xC8A857
      this.addChild(border)
    }

    const label = new Text({
      text: item.label,
      style: { fill: 0xFFFFFF, fontSize: 13, fontWeight: 'bold', wordWrap: true, wordWrapWidth: 106 },
    })
    label.x = 12
    label.y = 12
    this.addChild(label)

    const desc = new Text({
      text: item.description,
      style: { fill: 0xCBD5E1, fontSize: 11, wordWrap: true, wordWrapWidth: 106 },
    })
    desc.x = 12
    desc.y = 44
    this.addChild(desc)

    const dividerTex = Assets.get('ui_divider')
    if (dividerTex) {
      const div = new Sprite(dividerTex)
      div.x = 12
      div.y = 178
      div.width = 106
      div.height = 8
      div.tint = 0xC8A857
      this.addChild(div)
    }

    const btnFillTex = Assets.get('ui_panel_fill')
    if (btnFillTex) {
      const btn = new NineSliceSprite({
        texture: btnFillTex,
        leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8,
      })
      btn.width = 106
      btn.height = 44
      btn.x = 12
      btn.y = 188
      btn.tint = 0x1D4ED8
      this.addChild(btn)
    } else {
      const btn = new Graphics()
      btn.rect(12, 188, 106, 44).fill(0x2563EB)
      this.addChild(btn)
    }

    const btnText = new Text({ text: 'PICK', style: { fill: 0xffffff, fontSize: 14 } })
    btnText.anchor.set(0.5)
    btnText.x = 65
    btnText.y = 210
    this.addChild(btnText)

    this.x = x
    this.y = y
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointerup', () => onClick(item.key))
  }
}
