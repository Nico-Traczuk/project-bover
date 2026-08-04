import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { TOTAL_WAVES } from '../data/biomes.js'

export class BossVictoryScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'BOSS DEFEATED!', style: { fill: 0xF59E0B, fontSize: 36, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 200
    this.addChild(title)

    const stats = [
      `Waves cleared: ${TOTAL_WAVES} / ${TOTAL_WAVES}`,
      `Gold earned: ${runState.goldEarned}`,
      `Castle HP remaining: ${runState.castleHp}`,
    ]
    stats.forEach((s, i) => {
      const t = new Text({ text: s, style: { fill: 0x9CA3AF, fontSize: 20 } })
      t.anchor.set(0.5)
      t.x = 225
      t.y = 300 + i * 40
      this.addChild(t)
    })

    const btn = new Container()
    const btnBg = new Graphics()
    btnBg.rect(0, 0, 200, 50).fill(0x059669)
    btn.addChild(btnBg)
    const btnT = new Text({ text: 'CLAIM & UPGRADE', style: { fill: 0xffffff, fontSize: 16 } })
    btnT.anchor.set(0.5)
    btnT.x = 100
    btnT.y = 25
    btn.addChild(btnT)
    btn.x = 125
    btn.y = 460
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.on('pointerup', () => {
      import('./BattlefieldScene.js').then(({ BattlefieldScene }) => sceneManager.go(new BattlefieldScene()))
        .catch(err => console.error('Failed to load BattlefieldScene:', err))
    })
    this.addChild(btn)
  }
}
