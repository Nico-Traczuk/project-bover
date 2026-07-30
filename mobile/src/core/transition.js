import { Graphics } from 'pixi.js'

const FADE_MS = 350

// Fade to black, swap scene, fade back in.
export function fadeToScene(app, buildNextScene) {
  const overlay = new Graphics()
  overlay.rect(0, 0, 800, 600).fill(0x000000)
  overlay.alpha = 0
  app.stage.addChild(overlay)

  let elapsed = 0
  let phase = 'in'

  const tick = (ticker) => {
    elapsed += ticker.deltaMS

    if (phase === 'in') {
      overlay.alpha = Math.min(1, elapsed / FADE_MS)
      if (elapsed >= FADE_MS) {
        elapsed = 0
        phase = 'out'
        try {
          buildNextScene()
        } catch (err) {
          console.error('Scene transition failed:', err)
          app.ticker.remove(tick)
          if (overlay.parent) overlay.parent.removeChild(overlay)
          overlay.destroy()
          return
        }
        // Keep overlay on top after scene swap
        app.stage.removeChild(overlay)
        app.stage.addChild(overlay)
      }
    } else {
      overlay.alpha = Math.max(0, 1 - elapsed / FADE_MS)
      if (elapsed >= FADE_MS) {
        app.ticker.remove(tick)
        if (overlay.parent) overlay.parent.removeChild(overlay)
        overlay.destroy()
      }
    }
  }

  app.ticker.add(tick)
}
