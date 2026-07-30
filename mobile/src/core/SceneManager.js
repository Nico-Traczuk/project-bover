class SceneManager {
  init(app) {
    this.app = app
    this.current = null
  }

  go(scene) {
    if (this.current) {
      this.app.stage.removeChild(this.current)
      if (typeof this.current.destroy === 'function') this.current.destroy({ children: true })
    }
    this.current = scene
    this.app.stage.addChild(scene)
  }
}

export const sceneManager = new SceneManager()
