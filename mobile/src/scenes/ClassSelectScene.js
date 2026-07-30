import { Container, Graphics, Text, NineSliceSprite, Sprite, Texture, Rectangle, Assets } from 'pixi.js'
import { CLASSES } from '../data/classes.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'
import { fadeToScene } from '../core/transition.js'

const CHAR_FRAMES = {
  mage: { col: 0, row: 0 },
  tank: { col: 0, row: 4 },
}

const STAT_ICONS = { HP: '♥', SPD: '⚡', DEF: '🛡', DMG: '⚔' }

const CARD_W = 200
const CARD_H = 360
const CORNER = 12

function makeClassCard(classKey, classDef, x, y, onClick) {
  const c = new Container()
  c.x = x
  c.y = y

  // Card fill
  const fillTex = Assets.get('ui_panel_fill')
  const borderTex = Assets.get('ui_panel_border')

  if (fillTex) {
    const fill = new NineSliceSprite({ texture: fillTex, leftWidth: CORNER, topHeight: CORNER, rightWidth: CORNER, bottomHeight: CORNER })
    fill.width = CARD_W; fill.height = CARD_H; fill.tint = 0x0c1520
    c.addChild(fill)
  } else {
    const bg = new Graphics()
    bg.rect(0, 0, CARD_W, CARD_H).fill(0x1f2937)
    c.addChild(bg)
  }

  if (borderTex) {
    const border = new NineSliceSprite({ texture: borderTex, leftWidth: CORNER, topHeight: CORNER, rightWidth: CORNER, bottomHeight: CORNER })
    border.width = CARD_W; border.height = CARD_H; border.tint = 0xC8A857
    c.addChild(border)
  }

  // Character sprite avatar
  const charTex = Assets.get('characters')
  if (charTex) {
    const { col, row } = CHAR_FRAMES[classKey] ?? { col: 0, row: 0 }
    const frameTex = new Texture({
      source: charTex.source,
      frame: new Rectangle(col * 17, row * 17, 16, 16),
    })
    const avatar = new Sprite(frameTex)
    avatar.anchor.set(0.5)
    avatar.scale.set(4)               // 64×64
    avatar.x = CARD_W / 2
    avatar.y = 56
    c.addChild(avatar)
  } else {
    const avatar = new Graphics()
    avatar.rect(CARD_W / 2 - 32, 20, 64, 64).fill(classDef.color)
    c.addChild(avatar)
  }

  // Class name
  const nameText = new Text({ text: classDef.name.toUpperCase(), style: { fill: 0xFFFFFF, fontSize: 18, fontWeight: 'bold' } })
  nameText.anchor.set(0.5)
  nameText.x = CARD_W / 2
  nameText.y = 108
  c.addChild(nameText)

  // Attack type badge
  const badgeColor = classDef.attackType === 'ranged' ? 0x4F46E5 : 0x7C3AED
  const badge = new Graphics()
  badge.rect(CARD_W / 2 - 38, 122, 76, 20).fill(badgeColor)
  c.addChild(badge)
  const badgeText = new Text({ text: classDef.attackType.toUpperCase(), style: { fill: 0xC4B5FD, fontSize: 11, fontWeight: 'bold' } })
  badgeText.anchor.set(0.5)
  badgeText.x = CARD_W / 2
  badgeText.y = 132
  c.addChild(badgeText)

  // Divider
  const divTex = Assets.get('ui_divider')
  if (divTex) {
    const div = new Sprite(divTex)
    div.x = 14; div.y = 152; div.width = CARD_W - 28; div.height = 8; div.tint = 0xC8A857
    c.addChild(div)
  }

  // Stats
  const stats = [
    { label: 'HP', value: classDef.hp, color: 0xF87171 },
    { label: 'SPD', value: classDef.speed, color: 0x34D399 },
    { label: 'DEF', value: classDef.defense, color: 0x60A5FA },
    { label: 'DMG', value: classDef.damage, color: 0xFBBF24 },
  ]
  stats.forEach(({ label, value, color }, i) => {
    const row = Math.floor(i / 2)
    const col = i % 2
    const sx = 18 + col * 96
    const sy = 170 + row * 30

    const lbl = new Text({ text: `${STAT_ICONS[label]} ${label}`, style: { fill: 0x94A3B8, fontSize: 12 } })
    lbl.x = sx; lbl.y = sy
    c.addChild(lbl)

    const val = new Text({ text: String(value), style: { fill: color, fontSize: 13, fontWeight: 'bold' } })
    val.x = sx + 52; val.y = sy
    c.addChild(val)
  })

  // Select button
  if (fillTex) {
    const btn = new NineSliceSprite({ texture: fillTex, leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 })
    btn.width = CARD_W - 28; btn.height = 44; btn.x = 14; btn.y = CARD_H - 60; btn.tint = 0x1D4ED8
    c.addChild(btn)
    if (borderTex) {
      const btnB = new NineSliceSprite({ texture: borderTex, leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 })
      btnB.width = CARD_W - 28; btnB.height = 44; btnB.x = 14; btnB.y = CARD_H - 60; btnB.tint = 0xC8A857
      c.addChild(btnB)
    }
  } else {
    const btn = new Graphics()
    btn.rect(14, CARD_H - 60, CARD_W - 28, 44).fill(0x2563EB)
    c.addChild(btn)
  }
  const btnText = new Text({ text: 'SELECT', style: { fill: 0xF5DEB3, fontSize: 15, fontWeight: 'bold' } })
  btnText.anchor.set(0.5)
  btnText.x = CARD_W / 2
  btnText.y = CARD_H - 38
  c.addChild(btnText)

  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.on('pointerup', onClick)
  return c
}

export class ClassSelectScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x0f172a)
    this.addChild(bg)

    // Decorative lines
    const topLine = new Graphics()
    topLine.rect(0, 72, 450, 2).fill({ color: 0xC8A857, alpha: 0.3 })
    this.addChild(topLine)
    const botLine = new Graphics()
    botLine.rect(0, 726, 450, 2).fill({ color: 0xC8A857, alpha: 0.3 })
    this.addChild(botLine)

    // Title panel
    const fillTex = Assets.get('ui_panel_fill')
    const borderTex = Assets.get('ui_panel_border')
    if (fillTex) {
      const tf = new NineSliceSprite({ texture: fillTex, leftWidth: 12, topHeight: 12, rightWidth: 12, bottomHeight: 12 })
      tf.width = 400; tf.height = 60; tf.x = 25; tf.y = 26; tf.tint = 0x080e1a
      this.addChild(tf)
    }
    if (borderTex) {
      const tb = new NineSliceSprite({ texture: borderTex, leftWidth: 12, topHeight: 12, rightWidth: 12, bottomHeight: 12 })
      tb.width = 400; tb.height = 60; tb.x = 25; tb.y = 26; tb.tint = 0xC8A857
      this.addChild(tb)
    }
    const title = new Text({ text: 'Choose Your Class', style: { fill: 0xFFFFFF, fontSize: 24, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 56
    this.addChild(title)

    if (authState.player) {
      const gold = new Text({
        text: `Gold: ${authState.player.gold}`,
        style: { fill: 0xF59E0B, fontSize: 15 },
      })
      gold.x = 20
      gold.y = 22
      this.addChild(gold)
    }

    // Class cards — 2 side by side: 2×200 + 20 gap = 420, startX=15
    const classKeys = Object.keys(CLASSES)
    const totalW = classKeys.length * CARD_W + (classKeys.length - 1) * 20
    const startX = (450 - totalW) / 2

    classKeys.forEach((key, i) => {
      const classDef = CLASSES[key]
      const cardX = startX + i * (CARD_W + 20)
      const card = makeClassCard(key, classDef, cardX, 108, () => this._selectClass(key))
      this.addChild(card)
    })

    const backBtn = new Text({ text: '← Back', style: { fill: 0x6B7280, fontSize: 15 } })
    backBtn.x = 20
    backBtn.y = 748
    backBtn.eventMode = 'static'
    backBtn.cursor = 'pointer'
    backBtn.on('pointerup', () => {
      import('./MainMenuScene.js').then(({ MainMenuScene }) => sceneManager.go(new MainMenuScene()))
        .catch(err => console.error('Failed to load MainMenuScene:', err))
    })
    this.addChild(backBtn)
  }

  _selectClass(classKey) {
    runState.reset()
    runState.selectedClass = classKey

    Promise.all([
      import('../systems/MapSystem.js'),
      import('./CombatScene.js'),
    ]).then(([{ generateMap }, { CombatScene }]) => {
      const mapData = generateMap(Date.now())
      runState._mapData = mapData
      runState._currentNodeId = mapData.startNodeId
      const startNode = mapData.nodes.get(mapData.startNodeId)
      fadeToScene(sceneManager.app, () => sceneManager.go(new CombatScene(startNode)))
    }).catch(err => console.error('Failed to start run:', err))
  }
}
