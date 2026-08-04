import { Application } from 'pixi.js'

if (import.meta.hot) import.meta.hot.decline()
import { sceneManager } from './core/SceneManager.js'
import { inputManager } from './core/InputManager.js'
import { authState } from './core/AuthState.js'
import { BootScene } from './scenes/BootScene.js'

const WORLD_W = 450

;(async () => {
  const app = new Application()
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x0f172a,
    antialias: false,
    preference: 'webgl',
  })

  document.getElementById('game').appendChild(app.canvas)

  function applyScale() {
    const scale = window.innerWidth / WORLD_W
    app.stage.scale.set(scale)
    sceneManager.viewportH = window.innerHeight / scale
    inputManager.init(app.canvas, WORLD_W, sceneManager.viewportH)
  }

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    applyScale()
  })

  applyScale()

  authState.loadFromStorage()
  sceneManager.init(app)
  sceneManager.go(new BootScene())
})()
