import { Container, Graphics, Text } from 'pixi.js'

const TYPE_COLORS = {
  combat: 0xDC2626,
  chest: 0xF59E0B,
  elite: 0x7C3AED,
  boss: 0x991B1B,
}

const TYPE_LABELS = {
  combat: 'X',
  chest: 'C',
  elite: 'E',
  boss: 'B',
}

export class MapNode extends Container {
  constructor(node, visited, reachable, onClick) {
    super()

    const color = (!visited && !reachable) ? 0x374151 : (TYPE_COLORS[node.type] ?? 0x6B7280)
    const alpha = (!visited && !reachable) ? 0.3 : 1

    const circle = new Graphics()
    circle.circle(0, 0, 24).fill(color)
    circle.alpha = alpha
    this.addChild(circle)

    if (visited || reachable) {
      const label = new Text({ text: TYPE_LABELS[node.type] ?? '?', style: { fill: 0xffffff, fontSize: 16, fontWeight: 'bold' } })
      label.anchor.set(0.5)
      this.addChild(label)
    }

    if (node.cleared) {
      const ring = new Graphics()
      ring.circle(0, 0, 28).stroke({ width: 2, color: 0x22C55E })
      this.addChild(ring)
    }

    if (reachable && !node.cleared) {
      this.eventMode = 'static'
      this.cursor = 'pointer'
      this.on('pointerup', () => onClick(node))
    }
  }
}
