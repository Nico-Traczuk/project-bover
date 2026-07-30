import { Container, Graphics, Sprite, Text, NineSliceSprite, Assets } from 'pixi.js'

const CORNER = 12
const CARD_W = 180
const CARD_H = 240

export class UpgradeCard extends Container {
  constructor(item, x, y, onClick) {
    super()

    // Dark fill background
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

    // Gold fantasy border overlay
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
      style: { fill: 0xFFFFFF, fontSize: 16, fontWeight: 'bold', wordWrap: true, wordWrapWidth: 156 },
    })
    label.x = 14
    label.y = 16
    this.addChild(label)

    const desc = new Text({
      text: item.description,
      style: { fill: 0xCBD5E1, fontSize: 13, wordWrap: true, wordWrapWidth: 152 },
    })
    desc.x = 14
    desc.y = 52
    this.addChild(desc)

    // Divider before button
    const dividerTex = Assets.get('ui_divider')
    if (dividerTex) {
      const div = new Sprite(dividerTex)
      div.x = 14
      div.y = 174
      div.width = 152
      div.height = 10
      div.tint = 0xC8A857
      this.addChild(div)
    }

    // Pick button
    const btnBorderTex = Assets.get('ui_panel_fill')
    if (btnBorderTex) {
      const btn = new NineSliceSprite({
        texture: btnBorderTex,
        leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8,
      })
      btn.width = 140
      btn.height = 44
      btn.x = 20
      btn.y = 185
      btn.tint = 0x1D4ED8
      this.addChild(btn)
    } else {
      const btn = new Graphics()
      btn.rect(20, 185, 140, 44).fill(0x2563EB)
      this.addChild(btn)
    }

    const btnText = new Text({ text: 'PICK', style: { fill: 0xffffff, fontSize: 14 } })
    btnText.anchor.set(0.5)
    btnText.x = 90
    btnText.y = 207
    this.addChild(btnText)

    this.x = x
    this.y = y
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointerup', () => onClick(item.key))
  }
}
