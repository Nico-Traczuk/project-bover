import { Container, Graphics, Sprite, Texture, Rectangle, Text, NineSliceSprite, Assets } from 'pixi.js'

// Left-to-right layout: depth 1 = leftmost, boss = rightmost
const DEPTH_X = { 1: 12, 2: 38, 4: 75, 6: 112, 7: 140, 8: 158 }
const DEPTH_Y = {
  1: [16, 52], 2: [16, 52], 4: [16, 52], 6: [16, 52],
  7: [34], 8: [34],
}

// Minimap tile col/row in the 5×5 packed sheet (8×8px each, no gaps)
const TILE = {
  current: { col: 0, row: 4 },  // orange marker
  cleared: { col: 0, row: 0 },  // dark floor
  combat:  { col: 1, row: 0 },  // room with lines
  chest:   { col: 3, row: 4 },  // S-shape
  boss:    { col: 4, row: 4 },  // X/skull
  elite:   { col: 0, row: 3 },  // yellow special
}

function depthStyle(depth) {
  if (depth <= 2) return 'minimap_dungeon'
  if (depth <= 4) return 'minimap_forest'
  return 'minimap_inferno'
}

function makeTile(baseTex, col, row) {
  const tex = new Texture({
    source: baseTex.source,
    frame: new Rectangle(col * 8, row * 8, 8, 8),
  })
  const s = new Sprite(tex)
  s.anchor.set(0.5)
  return s
}

export class MapOverlay extends Container {
  constructor() {
    super()
    const bg = new Graphics()
    bg.rect(0, 0, 170, 68).fill({ color: 0x0f172a, alpha: 0.9 })
    this.addChild(bg)

    // Fantasy border overlay
    const borderTex = Assets.get('ui_panel_border')
    if (borderTex) {
      const border = new NineSliceSprite({
        texture: borderTex,
        leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10,
      })
      border.width = 170
      border.height = 68
      border.tint = 0x6B7280
      this.addChild(border)
    }

    const label = new Text({ text: 'MAP', style: { fill: 0x9CA3AF, fontSize: 10 } })
    label.x = 6
    label.y = 3
    this.addChild(label)
  }

  update(mapData, currentNodeId, clearedNodeIds) {
    while (this.children.length > 2) this.removeChildAt(2)
    if (!mapData) return

    const { nodes } = mapData
    const clearedSet = new Set(clearedNodeIds || [])

    const currentNode = nodes.get(currentNodeId)
    const styleAlias = depthStyle(currentNode?.depth ?? 1)
    const baseTex = Assets.get(styleAlias)

    const depthGroups = {}
    nodes.forEach((node, id) => {
      if (!depthGroups[node.depth]) depthGroups[node.depth] = []
      depthGroups[node.depth].push(id)
    })

    const posMap = new Map()
    nodes.forEach((node, id) => {
      const group = depthGroups[node.depth]
      const idx = group.indexOf(id)
      const x = DEPTH_X[node.depth] ?? 80
      const ys = DEPTH_Y[node.depth] ?? [34]
      posMap.set(id, { x, y: ys[idx] ?? ys[0] })
    })

    // Edges
    const edgeG = new Graphics()
    nodes.forEach((node, id) => {
      const from = posMap.get(id)
      if (!from) return
      node.connections.forEach(connId => {
        const to = posMap.get(connId)
        if (!to) return
        const visible = clearedSet.has(id) || id === currentNodeId || clearedSet.has(connId) || connId === currentNodeId
        edgeG.moveTo(from.x, from.y).lineTo(to.x, to.y)
          .stroke({ width: 1, color: visible ? 0x4B5563 : 0x1e293b })
      })
    })
    this.addChild(edgeG)

    // Nodes
    nodes.forEach((node, id) => {
      const pos = posMap.get(id)
      if (!pos) return
      const isCurrent = id === currentNodeId
      const isCleared = clearedSet.has(id)
      const isRevealed = isCurrent || isCleared
        || (currentNodeId && nodes.get(currentNodeId)?.connections.includes(id))
        || [...clearedSet].some(cid => nodes.get(cid)?.connections.includes(id))

      const alpha = isRevealed ? 1 : 0.15

      if (baseTex) {
        const tileDef = isCurrent ? TILE.current
          : isCleared ? TILE.cleared
          : node.type === 'boss' ? TILE.boss
          : node.type === 'chest' ? TILE.chest
          : node.type === 'elite' ? TILE.elite
          : TILE.combat
        const tile = makeTile(baseTex, tileDef.col, tileDef.row)
        tile.x = pos.x
        tile.y = pos.y
        tile.alpha = alpha
        this.addChild(tile)
      } else {
        // Fallback: colored circles
        const color = isCurrent ? 0xffffff
          : isCleared ? 0x6B7280
          : node.type === 'boss' ? 0xEC4899
          : node.type === 'chest' ? 0xF59E0B
          : node.type === 'elite' ? 0x8B5CF6
          : 0xEF4444
        const dot = new Graphics()
        dot.circle(pos.x, pos.y, isCurrent ? 5 : 3.5).fill({ color, alpha })
        this.addChild(dot)
      }
    })
  }
}
