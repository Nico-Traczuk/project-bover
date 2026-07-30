import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { UpgradeSystem } from '../systems/UpgradeSystem.js'
import { UpgradeCard } from '../ui/UpgradeCard.js'
import { fadeToScene } from '../core/transition.js'

const TYPE_COLORS = {
  combat: 0xEF4444, chest: 0xF59E0B, elite: 0x8B5CF6,
  elite_candidate: 0xEF4444, boss: 0xEC4899,
}
const TYPE_LABELS = {
  combat: 'FIGHT', chest: 'CHEST', elite: 'ELITE',
  elite_candidate: 'FIGHT', boss: 'BOSS',
}

export class ChestScene extends Container {
  constructor(node) {
    super()
    this._node = node
    this._cards = []

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x111827)
    this.addChild(bg)

    const title = new Text({
      text: 'CHEST ROOM — Pick an Item',
      style: { fill: 0xF59E0B, fontSize: 22 },
    })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 80
    this.addChild(title)

    const goldText = new Text({
      text: `Gold: ${runState.goldEarned}`,
      style: { fill: 0xF59E0B, fontSize: 16 },
    })
    goldText.x = 20
    goldText.y = 20
    this.addChild(goldText)

    // Use the run's persistent upgrade system so already-picked items are excluded
    const sys = runState._upgradeSystem ?? new UpgradeSystem({})
    const items = sys.pickRandomItems(3)
    const totalW = items.length * 130 + (items.length - 1) * 15
    const startX = (450 - totalW) / 2

    items.forEach((item, i) => {
      const card = new UpgradeCard(item, startX + i * 145, 130, (key) => this._pickItem(key))
      this._cards.push(card)
      this.addChild(card)
    })
  }

  _pickItem(key) {
    if (runState._upgradeSystem) {
      runState._upgradeSystem.applyItem(key)
    }

    if (!runState._clearedNodeIds) runState._clearedNodeIds = []
    runState._clearedNodeIds.push(runState._currentNodeId)
    runState.roomsCleared++

    this._cards.forEach(card => this.removeChild(card))
    this._cards = []

    this._showExits()
  }

  _showExits() {
    const mapData = runState._mapData
    if (!mapData) return

    const currentNode = mapData.nodes.get(runState._currentNodeId)
    const connections = currentNode
      ? currentNode.connections.map(id => mapData.nodes.get(id)).filter(Boolean)
      : []

    const prompt = new Text({
      text: 'Choose your next room:',
      style: { fill: 0x9CA3AF, fontSize: 18 },
    })
    prompt.anchor.set(0.5)
    prompt.x = 225
    prompt.y = 480
    this.addChild(prompt)

    const totalW = connections.length * 160 + (connections.length - 1) * 20
    const startX = (450 - totalW) / 2

    connections.forEach((node, i) => {
      const btn = this._makeExitBtn(node, startX + i * 180, 520)
      this.addChild(btn)
    })
  }

  _makeExitBtn(node, x, y) {
    const isCleared = (runState._clearedNodeIds || []).includes(node.id)
    const color = isCleared ? 0x4B5563 : (TYPE_COLORS[node.type] ?? 0x374151)
    const label = TYPE_LABELS[node.type] ?? '?'

    const c = new Container()
    const bg = new Graphics()
    bg.rect(0, 0, 160, 50).fill(color)
    c.addChild(bg)

    const t = new Text({ text: label, style: { fill: 0xffffff, fontSize: 18, fontWeight: 'bold' } })
    t.anchor.set(0.5)
    t.x = 80
    t.y = 25
    c.addChild(t)

    c.x = x
    c.y = y
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.on('pointerup', () => this._enterNode(node))
    return c
  }

  _enterNode(node) {
    runState._currentNodeId = node.id
    const { app } = sceneManager
    if (node.type === 'chest') {
      import('./ChestScene.js').then(({ ChestScene }) => {
        fadeToScene(app, () => sceneManager.go(new ChestScene(node)))
      }).catch(err => console.error('Failed to load ChestScene:', err))
    } else {
      import('./CombatScene.js').then(({ CombatScene }) => {
        fadeToScene(app, () => sceneManager.go(new CombatScene(node)))
      }).catch(err => console.error('Failed to load CombatScene:', err))
    }
  }
}
