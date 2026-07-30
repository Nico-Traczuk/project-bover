import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { AssetLoader } from '../core/AssetLoader.js'
import { authState } from '../core/AuthState.js'

export class BootScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x1a1a2e)
    this.addChild(bg)

    const label = new Text({ text: 'Loading...', style: { fill: 0xffffff, fontSize: 24 } })
    label.anchor.set(0.5)
    label.x = 400
    label.y = 300
    this.addChild(label)

    this._boot(label).catch(err => {
      label.text = 'Load failed'
      console.error(err)
    })
  }

  async _boot(label) {
    const loader = new AssetLoader()
    await loader.load(p => {
      label.text = `Loading... ${Math.round(p * 100)}%`
    })

    // Hydrate player profile if token is already in storage (page refresh)
    if (authState.token && !authState.player) {
      try {
        const { getProfile } = await import('../api/player.api.js')
        authState.player = await getProfile()
      } catch {
        // Token expired or invalid — clear it so MainMenu shows login form
        authState.clear()
      }
    }

    const { MainMenuScene } = await import('./MainMenuScene.js')
    sceneManager.go(new MainMenuScene())
  }
}
