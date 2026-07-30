import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'

const META_UPGRADES = [
  { key: 'vitality_1', label: 'Vitality I', description: '+10 starting HP', cost: 30 },
  { key: 'vitality_2', label: 'Vitality II', description: '+20 starting HP', cost: 60 },
  { key: 'vitality_3', label: 'Vitality III', description: '+30 starting HP', cost: 100 },
  { key: 'power_1', label: 'Power I', description: '+5% base damage', cost: 30 },
  { key: 'power_2', label: 'Power II', description: '+10% base damage', cost: 60 },
  { key: 'power_3', label: 'Power III', description: '+15% base damage', cost: 100 },
  { key: 'swiftness_1', label: 'Swiftness I', description: '+5% speed', cost: 40 },
  { key: 'swiftness_2', label: 'Swiftness II', description: '+10% speed', cost: 80 },
  { key: 'lucky_find_1', label: 'Lucky Find I', description: 'Chests show 4 cards', cost: 50 },
  { key: 'lucky_find_2', label: 'Lucky Find II', description: 'Chests show more cards', cost: 90 },
  { key: 'gold_rush_1', label: 'Gold Rush I', description: '+2 gold per enemy', cost: 45 },
  { key: 'gold_rush_2', label: 'Gold Rush II', description: '+4 gold per enemy', cost: 85 },
  { key: 'unlock_tank', label: 'Unlock Tank', description: 'Play as Tank class', cost: 50 },
]

export class MetaUpgradeScene extends Container {
  constructor() {
    super()
    this._savedRun = false
    this._build()
    this._saveRun()
  }

  _build() {
    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'META UPGRADES', style: { fill: 0xffffff, fontSize: 24 } })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 30
    this.addChild(title)

    this._goldText = new Text({
      text: `Gold: ${authState.player?.gold ?? 0}`,
      style: { fill: 0xF59E0B, fontSize: 16 },
    })
    this._goldText.x = 20
    this._goldText.y = 58
    this.addChild(this._goldText)

    this._errorText = new Text({ text: '', style: { fill: 0xEF4444, fontSize: 14 } })
    this._errorText.x = 20
    this._errorText.y = 750
    this.addChild(this._errorText)

    this._upgradeListContainer = new Container()
    this._upgradeListContainer.y = 84
    this.addChild(this._upgradeListContainer)

    this._renderUpgrades()

    const playBtn = new Container()
    const pb = new Graphics()
    pb.rect(0, 0, 200, 44).fill(0x059669)
    playBtn.addChild(pb)
    const pt = new Text({ text: 'PLAY AGAIN', style: { fill: 0xffffff, fontSize: 16 } })
    pt.anchor.set(0.5)
    pt.x = 100
    pt.y = 22
    playBtn.addChild(pt)
    playBtn.x = 125
    playBtn.y = 760
    playBtn.eventMode = 'static'
    playBtn.cursor = 'pointer'
    playBtn.on('pointerup', () => {
      import('./ClassSelectScene.js').then(({ ClassSelectScene }) => sceneManager.go(new ClassSelectScene()))
        .catch(err => console.error('Failed to load ClassSelectScene:', err))
    })
    this.addChild(playBtn)
  }

  _renderUpgrades() {
    this._upgradeListContainer.removeChildren()

    const owned = new Set(authState.player?.meta_upgrades || [])
    const cols = 2
    const cardW = 210
    const cardH = 88

    META_UPGRADES.forEach((upg, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = 15 + col * (cardW + 10)
      const y = row * (cardH + 8)

      const isPurchased = owned.has(upg.key)
      const bgColor = isPurchased ? 0x065F46 : 0x1e293b

      const c = new Container()

      const cbg = new Graphics()
      cbg.rect(0, 0, cardW, cardH).fill(bgColor)
      c.addChild(cbg)

      const labelText = new Text({ text: upg.label, style: { fill: 0xffffff, fontSize: 14, fontWeight: 'bold' } })
      labelText.x = 8
      labelText.y = 8
      c.addChild(labelText)

      const descText = new Text({ text: upg.description, style: { fill: 0x9CA3AF, fontSize: 12 } })
      descText.x = 8
      descText.y = 28
      c.addChild(descText)

      if (!isPurchased) {
        const costText = new Text({ text: `${upg.cost}g`, style: { fill: 0xF59E0B, fontSize: 13 } })
        costText.x = 8
        costText.y = 50
        c.addChild(costText)

        const buyBtn = new Graphics()
        buyBtn.rect(cardW - 58, cardH - 28, 52, 22).fill(0x2563EB)
        c.addChild(buyBtn)

        const buyT = new Text({ text: 'BUY', style: { fill: 0xffffff, fontSize: 12 } })
        buyT.anchor.set(0.5)
        buyT.x = cardW - 32
        buyT.y = cardH - 17
        c.addChild(buyT)

        c.eventMode = 'static'
        c.cursor = 'pointer'
        c.on('pointerup', () => this._purchase(upg.key))
      }

      c.x = x
      c.y = y
      this._upgradeListContainer.addChild(c)
    })
  }

  async _saveRun() {
    if (this._savedRun || !authState.isLoggedIn()) return
    this._savedRun = true
    try {
      const { saveRun } = await import('../api/run.api.js')
      const data = await saveRun({
        class: runState.selectedClass,
        gold_earned: runState.goldEarned,
        rooms_cleared: runState.roomsCleared,
        depth_reached: runState.depthReached,
        boss_defeated: runState.bossDefeated,
      })
      if (authState.player) {
        authState.player.gold = data.new_total_gold
        this._goldText.text = `Gold: ${data.new_total_gold}`
      }
    } catch (err) {
      this._errorText.text = `Failed to save run: ${err.message}`
    }
  }

  async _purchase(key) {
    if (!authState.isLoggedIn()) {
      this._errorText.text = 'Not logged in'
      return
    }
    try {
      const { purchaseMeta } = await import('../api/player.api.js')
      const data = await purchaseMeta(key)
      if (authState.player) {
        authState.player.gold = data.remaining_gold
        if (!authState.player.meta_upgrades) authState.player.meta_upgrades = []
        authState.player.meta_upgrades.push(key)
      }
      this._goldText.text = `Gold: ${data.remaining_gold}`
      this._renderUpgrades()
    } catch (err) {
      this._errorText.text = err.message
    }
  }
}
