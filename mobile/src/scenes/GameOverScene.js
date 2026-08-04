import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'

function makeButton(label, x, y, w, h, color, onClick) {
  const c = new Container()
  const bg = new Graphics()
  bg.rect(0, 0, w, h).fill(color)
  c.addChild(bg)
  const t = new Text({ text: label, style: { fill: 0xffffff, fontSize: 16 } })
  t.anchor.set(0.5)
  t.x = w / 2
  t.y = h / 2
  c.addChild(t)
  c.x = x
  c.y = y
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.on('pointerup', onClick)
  return c
}

export class GameOverScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'GAME OVER', style: { fill: 0xEF4444, fontSize: 44, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 220
    this.addChild(title)

    const stats = [
      `Wave reached: ${runState.currentWave} / 15`,
      `Gold earned: ${runState.goldEarned}`,
      runState.castleHp <= 0 ? 'Castle destroyed!' : 'Hero fell in battle',
    ]
    stats.forEach((s, i) => {
      const t = new Text({ text: s, style: { fill: 0x9CA3AF, fontSize: 20 } })
      t.anchor.set(0.5)
      t.x = 225
      t.y = 340 + i * 40
      this.addChild(t)
    })

    this.addChild(makeButton('TRY AGAIN', 125, 570, 200, 50, 0x7C3AED, () => {
      import('./BattlefieldScene.js').then(({ BattlefieldScene }) => sceneManager.go(new BattlefieldScene()))
        .catch(err => console.error('Failed to load BattlefieldScene:', err))
    }))
  }
}
