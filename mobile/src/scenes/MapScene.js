import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { generateMap, getReachableNodes } from '../systems/MapSystem.js'
import { MapNode } from '../ui/MapNode.js'

// Visual positions for each depth on screen (y increases downward)
const DEPTH_LAYOUT = {
  1: [{ x: 280, y: 500 }, { x: 520, y: 500 }],
  2: [{ x: 240, y: 400 }, { x: 560, y: 400 }],
  4: [{ x: 220, y: 280 }, { x: 580, y: 280 }],
  6: [{ x: 240, y: 170 }, { x: 560, y: 170 }],
  7: [{ x: 400, y: 80 }],
  8: [{ x: 400, y: 30 }],
}

export class MapScene extends Container {
  constructor() {
    super()

    // Restore or generate map
    if (!runState._mapData) {
      runState._mapData = generateMap(Date.now())
    }
    this._mapData = runState._mapData
    this._clearedIds = new Set(runState._clearedNodeIds || [])
    this._currentNodeId = runState._currentNodeId || null
    this._nodePositions = new Map()

    this._build()
  }

  _build() {
    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x111827)
    this.addChild(bg)

    const title = new Text({ text: 'MAP', style: { fill: 0xffffff, fontSize: 20 } })
    title.x = 20
    title.y = 20
    this.addChild(title)

    const goldText = new Text({ text: `Gold: ${runState.goldEarned}`, style: { fill: 0xF59E0B, fontSize: 16 } })
    goldText.x = 650
    goldText.y = 20
    this.addChild(goldText)

    const { nodes } = this._mapData
    const reachable = getReachableNodes(nodes, this._currentNodeId, this._clearedIds)

    // Assign visual positions by depth + index within depth
    const depthGroups = {}
    nodes.forEach((node, id) => {
      if (!depthGroups[node.depth]) depthGroups[node.depth] = []
      depthGroups[node.depth].push(id)
    })

    nodes.forEach((node, id) => {
      const layout = DEPTH_LAYOUT[node.depth]
      if (!layout) return
      const groupIds = depthGroups[node.depth]
      const idx = groupIds.indexOf(id)
      const pos = layout[idx] ?? layout[0]
      this._nodePositions.set(id, pos)
    })

    // Draw edges first (behind nodes)
    const edgeG = new Graphics()
    nodes.forEach((node, id) => {
      const fromPos = this._nodePositions.get(id)
      if (!fromPos) return
      node.connections.forEach(connId => {
        const toPos = this._nodePositions.get(connId)
        if (!toPos) return
        const fromVisible = reachable.has(id) || this._clearedIds.has(id)
        const toVisible = reachable.has(connId) || this._clearedIds.has(connId)
        const edgeColor = (fromVisible && toVisible) ? 0x4B5563 : 0x1f2937
        edgeG.moveTo(fromPos.x, fromPos.y)
          .lineTo(toPos.x, toPos.y)
          .stroke({ width: 2, color: edgeColor })
      })
    })
    this.addChild(edgeG)

    // Draw nodes
    nodes.forEach((node, id) => {
      const pos = this._nodePositions.get(id)
      if (!pos) return
      const visited = this._clearedIds.has(id) || id === this._currentNodeId
      const isReachable = reachable.has(id)
      const mapNode = new MapNode(node, visited, isReachable, (n) => this._enterNode(n))
      mapNode.x = pos.x
      mapNode.y = pos.y
      this.addChild(mapNode)
    })
  }

  _enterNode(node) {
    runState._currentNodeId = node.id
    runState._mapData = this._mapData

    if (node.type === 'chest') {
      import('./ChestScene.js').then(({ ChestScene }) => sceneManager.go(new ChestScene(node)))
        .catch(err => console.error('Failed to load ChestScene:', err))
    } else {
      import('./CombatScene.js').then(({ CombatScene }) => sceneManager.go(new CombatScene(node)))
        .catch(err => console.error('Failed to load CombatScene:', err))
    }
  }
}
