class InputManager {
  constructor() {
    this.keys = {}
    this.mouseWorld = { x: 0, y: 0 }
    this.isMobile = navigator.maxTouchPoints > 0
    this._joystick = {
      active: false,
      startX: 0, startY: 0,   // CSS pixels (for delta calc)
      dx: 0, dy: 0,            // normalised -1..1 direction
      gx: 0, gy: 0,            // game-coord origin
      cgx: 0, cgy: 0,          // game-coord current thumb position
    }
    this._gameW = 800
    this._gameH = 600
    this._canvas = null
  }

  init(canvas, gameW = 800, gameH = 600) {
    this._canvas = canvas
    this._gameW = gameW
    this._gameH = gameH

    window.addEventListener('keydown', e => { this.keys[e.code] = true })
    window.addEventListener('keyup', e => { this.keys[e.code] = false })

    canvas.addEventListener('pointermove', e => {
      const { gx, gy } = this._toGame(e.clientX, e.clientY)
      this.mouseWorld.x = gx
      this.mouseWorld.y = gy
      if (this.isMobile && this._joystick.active) this._updateJoystick(e)
    })

    if (this.isMobile) {
      canvas.addEventListener('pointerdown', e => {
        const { gx, gy } = this._toGame(e.clientX, e.clientY)
        if (gx < this._gameW / 2) {
          this._joystick.active = true
          this._joystick.startX = e.clientX
          this._joystick.startY = e.clientY
          this._joystick.gx = gx
          this._joystick.gy = gy
          this._joystick.cgx = gx
          this._joystick.cgy = gy
        }
      })
      canvas.addEventListener('pointerup', () => {
        this._joystick.active = false
        this._joystick.dx = 0
        this._joystick.dy = 0
      })
    }
  }

  _toGame(clientX, clientY) {
    const rect = this._canvas.getBoundingClientRect()
    const scaleX = this._gameW / rect.width
    const scaleY = this._gameH / rect.height
    return {
      gx: (clientX - rect.left) * scaleX,
      gy: (clientY - rect.top) * scaleY,
    }
  }

  _updateJoystick(e) {
    const dx = e.clientX - this._joystick.startX
    const dy = e.clientY - this._joystick.startY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = 60
    const clamped = Math.min(dist, maxDist)
    this._joystick.dx = dist > 0 ? (dx / dist) * clamped / maxDist : 0
    this._joystick.dy = dist > 0 ? (dy / dist) * clamped / maxDist : 0
    // Track thumb position in game coords for visual
    const { gx, gy } = this._toGame(e.clientX, e.clientY)
    this._joystick.cgx = gx
    this._joystick.cgy = gy
  }

  getMovement() {
    if (this.isMobile) {
      return { x: this._joystick.dx, y: this._joystick.dy }
    }
    let x = 0, y = 0
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1
    const len = Math.sqrt(x * x + y * y)
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 }
  }

  getJoystick() {
    return this._joystick
  }

  isMoving() {
    const m = this.getMovement()
    return m.x !== 0 || m.y !== 0
  }
}

export const inputManager = new InputManager()
