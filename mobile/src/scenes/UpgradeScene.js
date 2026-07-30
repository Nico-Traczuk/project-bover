import { Container, Graphics, Sprite, Text, NineSliceSprite, Assets } from 'pixi.js'
import { UpgradeCard } from '../ui/UpgradeCard.js'

export class UpgradeScene extends Container {
  constructor(upgradeSystem, classKey, onPick) {
    super()

    const overlay = new Graphics()
    overlay.rect(0, 0, 800, 600).fill({ color: 0x000000, alpha: 0.82 })
    this.addChild(overlay)

    const fillTex = Assets.get('ui_panel_fill')
    const borderTex = Assets.get('ui_panel_border')

    // Title panel
    if (fillTex) {
      const tf = new NineSliceSprite({ texture: fillTex, leftWidth: 12, topHeight: 12, rightWidth: 12, bottomHeight: 12 })
      tf.width = 480; tf.height = 58; tf.x = 160; tf.y = 60; tf.tint = 0x080e1a
      this.addChild(tf)
    }
    if (borderTex) {
      const tb = new NineSliceSprite({ texture: borderTex, leftWidth: 12, topHeight: 12, rightWidth: 12, bottomHeight: 12 })
      tb.width = 480; tb.height = 58; tb.x = 160; tb.y = 60; tb.tint = 0xC8A857
      this.addChild(tb)
    }

    const title = new Text({
      text: '✦  LEVEL UP  ✦',
      style: { fill: 0xF59E0B, fontSize: 26, fontWeight: 'bold' },
    })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 89
    this.addChild(title)

    // Subtitle
    const sub = new Text({
      text: 'Choose an upgrade to empower your hero',
      style: { fill: 0x94A3B8, fontSize: 15 },
    })
    sub.anchor.set(0.5)
    sub.x = 400
    sub.y = 136
    this.addChild(sub)

    // Divider under title area
    const divTex = Assets.get('ui_divider')
    if (divTex) {
      const div = new Sprite(divTex)
      div.width = 400; div.height = 10; div.x = 200; div.y = 150; div.tint = 0xC8A857
      this.addChild(div)
    }

    // Cards
    const options = upgradeSystem.pickRandomUpgrades(classKey, 3)
    const totalW = options.length * 180 + (options.length - 1) * 30
    const startX = (800 - totalW) / 2

    options.forEach((opt, i) => {
      const card = new UpgradeCard(opt, startX + i * 210, 178, (key) => onPick(key))
      this.addChild(card)
    })
  }
}
