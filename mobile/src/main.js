import { Application } from 'pixi.js'
import { sceneManager } from './core/SceneManager.js'
import { inputManager } from './core/InputManager.js'
import { authState } from './core/AuthState.js'
import { BootScene } from './scenes/BootScene.js'

const GAME_W = 450
const GAME_H = 800

;(async () => {
  const app = new Application()
  await app.init({
    width: GAME_W,
    height: GAME_H,
    backgroundColor: 0x0f172a,
    antialias: false,
    preference: 'webgl',
  })

  document.getElementById('game').appendChild(app.canvas)

  function fitCanvas() {
    const sw = window.innerWidth
    const sh = window.innerHeight
    const ratio = Math.min(sw / GAME_W, sh / GAME_H)
    const w = Math.floor(GAME_W * ratio)
    const h = Math.floor(GAME_H * ratio)
    app.canvas.style.width = `${w}px`
    app.canvas.style.height = `${h}px`
    app.canvas.style.position = 'absolute'
    app.canvas.style.left = `${Math.floor((sw - w) / 2)}px`
    app.canvas.style.top = `${Math.floor((sh - h) / 2)}px`
  }

  window.addEventListener('resize', fitCanvas)
  fitCanvas()

  authState.loadFromStorage()
  inputManager.init(app.canvas, GAME_W, GAME_H)
  sceneManager.init(app)
  sceneManager.go(new BootScene())
})()
