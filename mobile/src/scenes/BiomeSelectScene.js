import { Container, Graphics, Text, Assets, NineSliceSprite } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { BIOMES } from '../data/biomes.js'
import { fadeToScene } from '../core/transition.js'

const CARD_W = 380
const CARD_H = 120

function makeBiomeCard(biome, y, onClick) {
  const c = new Container()
  c.x = 35
  c.y = y

  const fillTex = Assets.get('ui_panel_fill')
  const borderTex = Assets.get('ui_panel_border')
  const isLocked = !biome.unlocked

  if (fillTex) {
    const fill = new NineSliceSprite({ texture: fillTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
    fill.width = CARD_W; fill.height = CARD_H
    fill.tint = isLocked ? 0x0a0a0a : 0x0c1520
    c.addChild(fill)
  } else {
    const bg = new Graphics()
    bg.rect(0, 0, CARD_W, CARD_H).fill(isLocked ? 0x111111 : 0x1f2937)
    c.addChild(bg)
  }

  if (borderTex) {
    const border = new NineSliceSprite({ texture: borderTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
    border.width = CARD_W; border.height = CARD_H
    border.tint = isLocked ? 0x374151 : 0xC8A857
    c.addChild(border)
  }

  const nameTxt = new Text({
    text: isLocked ? '🔒  ' + biome.name : biome.name,
    style: { fill: isLocked ? 0x4B5563 : 0xFFFFFF, fontSize: 20, fontWeight: 'bold' },
  })
  nameTxt.x = 20
  nameTxt.y = 22
  c.addChild(nameTxt)

  const descTxt = new Text({
    text: isLocked ? 'Defeat the previous boss to unlock' : biome.description,
    style: { fill: isLocked ? 0x374151 : 0x9CA3AF, fontSize: 14 },
  })
  descTxt.x = 20
  descTxt.y = 56
  c.addChild(descTxt)

  if (!isLocked) {
    const colorBar = new Graphics()
    colorBar.rect(0, CARD_H - 6, CARD_W, 6).fill(biome.colors.border)
    c.addChild(colorBar)

    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.on('pointerup', onClick)
  }

  return c
}

export class BiomeSelectScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'Choose Your Battlefield', style: { fill: 0xFFFFFF, fontSize: 22, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 60
    this.addChild(title)

    const subtitle = new Text({ text: 'Defend your castle from the incoming siege', style: { fill: 0x6B7280, fontSize: 14 } })
    subtitle.anchor.set(0.5)
    subtitle.x = 225
    subtitle.y = 92
    this.addChild(subtitle)

    Object.values(BIOMES).forEach((biome, i) => {
      const card = makeBiomeCard(biome, 140 + i * (CARD_H + 20), () => this._selectBiome(biome.key))
      this.addChild(card)
    })

    const backBtn = new Text({ text: '← Back', style: { fill: 0x6B7280, fontSize: 15 } })
    backBtn.x = 20
    backBtn.y = 748
    backBtn.eventMode = 'static'
    backBtn.cursor = 'pointer'
    backBtn.on('pointerup', () => {
      import('./ClassSelectScene.js').then(({ ClassSelectScene }) => sceneManager.go(new ClassSelectScene()))
        .catch(err => console.error('Failed to load ClassSelectScene:', err))
    })
    this.addChild(backBtn)
  }

  _selectBiome(biomeKey) {
    runState.reset()
    runState.selectedBiome = biomeKey
    import('./BattlefieldScene.js').then(({ BattlefieldScene }) => {
      fadeToScene(sceneManager.app, () => sceneManager.go(new BattlefieldScene()))
    }).catch(err => console.error('Failed to load BattlefieldScene:', err))
  }
}
