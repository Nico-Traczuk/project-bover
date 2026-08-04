import { Container, Graphics, Text, Assets, NineSliceSprite } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'
import { inputManager } from '../core/InputManager.js'
import { BIOMES } from '../data/biomes.js'
import { Mage } from '../entities/player/Mage.js'
import { Tank } from '../entities/player/Tank.js'
import { UpgradeSystem } from '../systems/UpgradeSystem.js'
import { HealthBar } from '../ui/HealthBar.js'
import { GoldDisplay } from '../ui/GoldDisplay.js'
import { fadeToScene } from '../core/transition.js'

const WORLD_W = 450
const WORLD_H = 1400
const CASTLE_Y = 1100
const CASTLE_H = 100
const PLAYER_SPAWN = { x: 225, y: 600 }

function makePlayer(classKey, metaUpgrades) {
  if (classKey === 'mage') return new Mage(metaUpgrades)
  if (classKey === 'tank') return new Tank(metaUpgrades)
  throw new Error(`Unknown class: ${classKey}`)
}

export class BattlefieldScene extends Container {
  constructor() {
    super()
    this._tickerFn = null

    runState.reset()

    const biome = BIOMES[runState.selectedBiome] ?? BIOMES.forest
    this._biome = biome

    const metaUpgrades = authState.player?.meta_upgrades || []
    this._player = makePlayer(runState.selectedClass, metaUpgrades)

    if (!runState._upgradeSystem) {
      runState._upgradeSystem = new UpgradeSystem({ ...this._player.stats })
    }
    this._upgradeSystem = runState._upgradeSystem
    this._player.stats = { ...this._upgradeSystem.stats }

    this._build()
    this._startTicker()
  }

  _build() {
    const biome = this._biome

    this._worldContainer = new Container()
    this.addChild(this._worldContainer)

    // World background
    const bg = new Graphics()
    bg.rect(0, 0, WORLD_W, WORLD_H).fill(biome.colors.floor)
    this._worldContainer.addChild(bg)

    this._buildBattlefield(biome)

    this._player.x = PLAYER_SPAWN.x
    this._player.y = PLAYER_SPAWN.y
    this._worldContainer.addChild(this._player)

    // HUD (fixed — not in worldContainer)
    this._buildHUD()
    this._buildBottomUI()
  }

  _buildBattlefield(biome) {
    const g = new Graphics()

    // Paths from top to castle
    g.rect(115, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })
    g.rect(265, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })

    // Castle wall
    g.rect(50, CASTLE_Y, 350, CASTLE_H).fill(biome.colors.castle)
    g.rect(50, CASTLE_Y, 350, CASTLE_H).stroke({ width: 2, color: 0xC8A857 })

    // Spawn zone indicator at very top
    g.rect(0, 0, WORLD_W, 10).fill({ color: 0xEF4444, alpha: 0.12 })

    this._worldContainer.addChild(g)

    const castleLabel = new Text({
      text: '🏰  CASTLE',
      style: { fill: 0xC8A857, fontSize: 16, fontWeight: 'bold' },
    })
    castleLabel.anchor.set(0.5)
    castleLabel.x = 225
    castleLabel.y = CASTLE_Y + CASTLE_H / 2
    this._worldContainer.addChild(castleLabel)

    const merchantMarker = new Text({
      text: '🛒 Merchant',
      style: { fill: 0x9CA3AF, fontSize: 12 },
    })
    merchantMarker.anchor.set(0.5)
    merchantMarker.x = 225
    merchantMarker.y = CASTLE_Y + 75
    merchantMarker.eventMode = 'static'
    merchantMarker.cursor = 'pointer'
    merchantMarker.on('pointerup', () => console.log('Merchant tapped — shop coming in Plan 4'))
    this._worldContainer.addChild(merchantMarker)

    this._buildStructureSlots()
  }

  _buildStructureSlots() {
    const slots = [
      { x: 150, y: CASTLE_Y - 150, label: '[Tower Slot]' },
      { x: 300, y: CASTLE_Y - 150, label: '[Gate Slot]' },
      { x: 225, y: CASTLE_Y - 80,  label: '[Shrine Slot]' },
    ]
    slots.forEach(({ x, y, label }) => {
      const slotC = new Container()
      slotC.x = x
      slotC.y = y
      slotC.eventMode = 'static'
      slotC.cursor = 'pointer'

      const slotG = new Graphics()
      slotG.rect(-32, -14, 64, 28).stroke({ width: 1, color: 0x4B5563, alpha: 0.8 })
      slotC.addChild(slotG)

      const slotTxt = new Text({ text: label, style: { fill: 0x6B7280, fontSize: 10 } })
      slotTxt.anchor.set(0.5, 0.5)
      slotC.addChild(slotTxt)

      slotC.on('pointerup', () => console.log(`${label} tapped — structures coming in Plan 3`))
      this._worldContainer.addChild(slotC)
    })
  }

  _buildHUD() {
    const hudPanelTex = Assets.get('ui_panel_fill')
    if (hudPanelTex) {
      const hudFill = new NineSliceSprite({ texture: hudPanelTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
      hudFill.width = WORLD_W; hudFill.height = 76; hudFill.tint = 0x0a0f1a
      this.addChild(hudFill)
      const hudBorderTex = Assets.get('ui_panel_border')
      if (hudBorderTex) {
        const hudBorder = new NineSliceSprite({ texture: hudBorderTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
        hudBorder.width = WORLD_W; hudBorder.height = 76; hudBorder.tint = 0x6B7280
        this.addChild(hudBorder)
      }
    }

    this._healthBar = new HealthBar(240, 16)
    this._healthBar.x = 8; this._healthBar.y = 32
    this.addChild(this._healthBar)

    this._goldDisplay = new GoldDisplay()
    this._goldDisplay.x = 310; this._goldDisplay.y = 8
    this.addChild(this._goldDisplay)

    const biomeLabel = new Text({ text: this._biome.name.toUpperCase(), style: { fill: 0x94A3B8, fontSize: 12 } })
    biomeLabel.x = 8; biomeLabel.y = 54
    this.addChild(biomeLabel)

    this._joystickGfx = new Graphics()
    this.addChild(this._joystickGfx)
  }

  _buildBottomUI() {
    const vh = sceneManager.viewportH
    const bottomY = vh - 160

    const bottomBg = new Graphics()
    bottomBg.rect(0, bottomY, WORLD_W, 160).fill(0x0a0f1a)
    this.addChild(bottomBg)

    const prepLabel = new Text({
      text: 'PREP PHASE — Upgrade your castle then press START WAVE',
      style: { fill: 0x9CA3AF, fontSize: 11 },
    })
    prepLabel.anchor.set(0.5)
    prepLabel.x = 225
    prepLabel.y = bottomY + 18
    this.addChild(prepLabel)

    const fillTex = Assets.get('ui_panel_fill')
    const borderTex = Assets.get('ui_panel_border')

    if (fillTex) {
      const btn = new NineSliceSprite({ texture: fillTex, leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 })
      btn.width = 220; btn.height = 52; btn.x = 115; btn.y = bottomY + 38; btn.tint = 0x15803D
      this.addChild(btn)
      if (borderTex) {
        const btnB = new NineSliceSprite({ texture: borderTex, leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 })
        btnB.width = 220; btnB.height = 52; btnB.x = 115; btnB.y = bottomY + 38; btnB.tint = 0xC8A857
        this.addChild(btnB)
      }
    } else {
      const btnBg = new Graphics()
      btnBg.rect(115, bottomY + 38, 220, 52).fill(0x15803D)
      this.addChild(btnBg)
    }

    const btnText = new Text({ text: '⚔  START WAVE', style: { fill: 0xF5DEB3, fontSize: 18, fontWeight: 'bold' } })
    btnText.anchor.set(0.5)
    btnText.x = 225; btnText.y = bottomY + 64
    btnText.eventMode = 'static'
    btnText.cursor = 'pointer'
    btnText.on('pointerup', () => this._startWave())
    this.addChild(btnText)
  }

  _startWave() {
    this._stopTicker()
    import('./WaveScene.js').then(({ WaveScene }) => {
      fadeToScene(sceneManager.app, () => sceneManager.go(new WaveScene()))
    }).catch(err => console.error('Failed to load WaveScene:', err))
  }

  _startTicker() {
    const { app } = sceneManager
    this._tickerFn = (ticker) => {
      const dt = ticker.deltaMS / 1000
      const move = inputManager.getMovement()
      const speed = this._player.stats.speed

      this._player.x = Math.max(16, Math.min(WORLD_W - 16, this._player.x + move.x * speed * dt))
      this._player.y = Math.max(50, Math.min(CASTLE_Y - 20, this._player.y + move.y * speed * dt))
      this._player.animateTick(dt, move.x, move.y)

      // Camera: keep player centered vertically, clamp at world edges
      const vh = sceneManager.viewportH
      const camY = Math.min(0, Math.max(vh - WORLD_H, vh / 2 - this._player.y))
      this._worldContainer.y = camY

      this._healthBar.update(this._player.stats.hp, this._player.stats.maxHp)
      this._goldDisplay.update(runState.goldEarned)
      this._drawJoystick()
    }
    app.ticker.add(this._tickerFn)
  }

  _drawJoystick() {
    this._joystickGfx.clear()
    if (!inputManager.isMobile) return
    const js = inputManager.getJoystick()
    if (!js.active) return
    this._joystickGfx.circle(js.gx, js.gy, 50).stroke({ width: 2, color: 0xffffff, alpha: 0.35 })
    this._joystickGfx.circle(js.cgx, js.cgy, 18).fill({ color: 0xffffff, alpha: 0.5 })
  }

  _stopTicker() {
    if (this._tickerFn) {
      sceneManager.app.ticker.remove(this._tickerFn)
      this._tickerFn = null
    }
  }

  destroy(opts) {
    this._stopTicker()
    super.destroy(opts)
  }
}
