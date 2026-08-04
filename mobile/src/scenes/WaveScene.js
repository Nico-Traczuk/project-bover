import { Container, Graphics, Text, Assets, NineSliceSprite } from 'pixi.js'
import { VFXLayer } from '../vfx/VFXLayer.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'
import { inputManager } from '../core/InputManager.js'
import { BIOMES, TOTAL_WAVES, isWaveElite } from '../data/biomes.js'
import { Mage } from '../entities/player/Mage.js'
import { Tank } from '../entities/player/Tank.js'
import { UpgradeSystem } from '../systems/UpgradeSystem.js'
import { WaveSystem } from '../systems/WaveSystem.js'
import { HealthBar } from '../ui/HealthBar.js'
import { GoldDisplay } from '../ui/GoldDisplay.js'
import { XpBar } from '../ui/XpBar.js'
import { fadeToScene } from '../core/transition.js'
import { xpForLevel } from '../data/upgrades.js'

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

export class WaveScene extends Container {
  constructor() {
    super()
    this._paused = false
    this._tickerFn = null
    this._shakeTimer = 0
    this._shakeIntensity = 5
    this._xp = 0
    this._level = 1
    this._xpToNext = xpForLevel(1)
    this._castleHp = runState.castleHp
    this._runEnded = false

    const biome = BIOMES[runState.selectedBiome] ?? BIOMES.forest
    this._biome = biome

    const metaUpgrades = authState.player?.meta_upgrades || []
    this._player = makePlayer(runState.selectedClass, metaUpgrades)

    if (runState._upgradeSystem) {
      this._upgradeSystem = runState._upgradeSystem
      this._player.stats = { ...this._upgradeSystem.stats }
    } else {
      this._upgradeSystem = new UpgradeSystem({ ...this._player.stats })
      runState._upgradeSystem = this._upgradeSystem
    }

    this._build()
    this._waveSystem.beginFirstWave()
  }

  _build() {
    const biome = this._biome

    // World container — everything that scrolls with the camera
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

    // Trail graphics (world space)
    this._trailGfx = new Graphics()
    this._worldContainer.addChild(this._trailGfx)

    // VFX layer (world space)
    this._vfx = new VFXLayer()
    this._worldContainer.addChild(this._vfx)

    // HUD (fixed — not in worldContainer)
    this._buildHUD()
    this._buildWaveSystem()
    this._startTicker()
  }

  _buildBattlefield(biome) {
    const g = new Graphics()

    // Paths
    g.rect(115, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })
    g.rect(265, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })

    // Castle
    g.rect(50, CASTLE_Y, 350, CASTLE_H).fill(biome.colors.castle)
    g.rect(50, CASTLE_Y, 350, CASTLE_H).stroke({ width: 2, color: 0xC8A857 })

    // Spawn zone indicator
    g.rect(0, 0, WORLD_W, 8).fill({ color: 0xEF4444, alpha: 0.15 })

    this._worldContainer.addChild(g)

    const castleLabel = new Text({
      text: '🏰  CASTLE',
      style: { fill: 0xC8A857, fontSize: 14, fontWeight: 'bold' },
    })
    castleLabel.anchor.set(0.5)
    castleLabel.x = 225
    castleLabel.y = CASTLE_Y + 20
    this._worldContainer.addChild(castleLabel)
  }

  _buildHUD() {
    const hudPanelTex = Assets.get('ui_panel_fill')
    const hudBorderTex = Assets.get('ui_panel_border')

    if (hudPanelTex) {
      const hudFill = new NineSliceSprite({ texture: hudPanelTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
      hudFill.width = WORLD_W; hudFill.height = 76; hudFill.tint = 0x0a0f1a
      this.addChild(hudFill)
      if (hudBorderTex) {
        const hudBorder = new NineSliceSprite({ texture: hudBorderTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
        hudBorder.width = WORLD_W; hudBorder.height = 76; hudBorder.tint = 0x6B7280
        this.addChild(hudBorder)
      }
    }

    this._waveText = new Text({ text: 'Wave 0 / 15', style: { fill: 0xF5DEB3, fontSize: 13 } })
    this._waveText.x = 8; this._waveText.y = 8
    this.addChild(this._waveText)

    this._levelText = new Text({ text: 'Level 1', style: { fill: 0x94A3B8, fontSize: 11 } })
    this._levelText.x = 8; this._levelText.y = 24
    this.addChild(this._levelText)

    this._xpBar = new XpBar(160, 10)
    this._xpBar.x = 70; this._xpBar.y = 10
    this.addChild(this._xpBar)
    this._xpBar.update(0, xpForLevel(1))

    this._healthBar = new HealthBar(240, 16)
    this._healthBar.x = 8; this._healthBar.y = 38
    this.addChild(this._healthBar)

    this._goldDisplay = new GoldDisplay()
    this._goldDisplay.x = 310; this._goldDisplay.y = 8
    this.addChild(this._goldDisplay)

    // Castle HP bar fixed in HUD
    this._castleHpBar = new HealthBar(350, 12)
    this._castleHpBar.x = 50
    this._castleHpBar.y = 60
    this.addChild(this._castleHpBar)
    this._castleHpBar.update(runState.castleMaxHp, runState.castleMaxHp)

    this._joystickGfx = new Graphics()
    this.addChild(this._joystickGfx)
  }

  _buildWaveSystem() {
    this._waveSystem = new WaveSystem({
      player: this._player,
      upgradeSystem: this._upgradeSystem,
      stage: this._worldContainer,
      biomeKey: runState.selectedBiome,
      onWaveAnnounce: (wave) => this._onWaveAnnounce(wave),
      onCastleDamage: (dmg) => this._onCastleDamage(dmg),
      onRunWon: () => this._onRunWon(),
      onPlayerDeath: () => this._onPlayerDeath(),
      onGoldEarned: (g) => this._onGoldEarned(g),
      onXpEarned: (xp) => this._onXpEarned(xp),
      onPlayerHurt: () => this._onPlayerHurt(),
      onEffect: (type, x, y, value) => {
        // x, y are world coordinates — no ARENA offset needed
        const vy = type === 'damage' ? y - 28 : y
        this._vfx.spawn(type, x, vy, value)
      },
    })
  }

  _startTicker() {
    const { app } = sceneManager
    this._tickerFn = (ticker) => {
      if (this._paused) return
      const dt = ticker.deltaMS / 1000

      this._updatePlayer(dt)

      // Trail rendering (world coords)
      this._trailGfx.clear()
      this._waveSystem.projectiles.forEach(p => {
        if (p.isMelee) return
        p._trail.forEach((pos, i) => {
          const frac = (6 - i) / 6
          const alpha = frac * frac * 0.6
          const r = Math.max(0.5, p.radius * frac * 0.7)
          this._trailGfx.circle(pos.x, pos.y, r).fill({ color: p.color, alpha })
        })
      })

      this._vfx.tick(dt)
      this._waveSystem.tick(dt, this._player.x, this._player.y, this._getAimAngle())

      // Camera: center player vertically, clamp at world edges
      const vh = sceneManager.viewportH
      let camY = Math.min(0, Math.max(vh - WORLD_H, vh / 2 - this._player.y))

      // Shake applied on top of camera
      if (this._shakeTimer > 0) {
        this._shakeTimer -= dt
        const t = Math.max(0, this._shakeTimer / 0.3)
        const mag = this._shakeIntensity * t
        this._worldContainer.x = (Math.random() * 2 - 1) * mag
        camY += (Math.random() * 2 - 1) * mag
        if (this._shakeTimer <= 0) this._worldContainer.x = 0
      }
      this._worldContainer.y = camY

      this._healthBar.update(this._player.stats.hp, this._player.stats.maxHp)
      this._castleHpBar.update(this._castleHp, runState.castleMaxHp)
      this._goldDisplay.update(runState.goldEarned)
      this._waveText.text = `Wave ${this._waveSystem.currentWave} / ${TOTAL_WAVES}`
      this._drawJoystick()
    }
    app.ticker.add(this._tickerFn)
  }

  _updatePlayer(dt) {
    const move = inputManager.getMovement()
    const speed = this._player.stats.speed
    this._player.x = Math.max(16, Math.min(WORLD_W - 16, this._player.x + move.x * speed * dt))
    this._player.y = Math.max(24, Math.min(CASTLE_Y - 20, this._player.y + move.y * speed * dt))
    this._player.animateTick(dt, move.x, move.y)
  }

  _getAimAngle() {
    const enemies = this._waveSystem.enemies
    if (inputManager.isMobile || !inputManager.isMoving()) {
      let nearest = null, nearDistSq = Infinity
      enemies.forEach(e => {
        if (!e.isAlive()) return
        const dx = e.x - this._player.x, dy = e.y - this._player.y
        const d = dx * dx + dy * dy
        if (d < nearDistSq) { nearDistSq = d; nearest = e }
      })
      if (nearest) return Math.atan2(nearest.y - this._player.y, nearest.x - this._player.x)
      return 0
    }
    // Convert mouse screen-Y to world-Y by subtracting camera offset
    const mx = inputManager.mouseWorld.x
    const my = inputManager.mouseWorld.y - this._worldContainer.y
    return Math.atan2(my - this._player.y, mx - this._player.x)
  }

  _onWaveAnnounce(wave) {
    runState.currentWave = wave
    const isElite = isWaveElite(wave)
    const waveMsg = isElite ? `⚔  ELITE WAVE ${wave}!` : `Wave ${wave}`
    const color = isElite ? 0x8B5CF6 : 0xF5DEB3
    const msg = new Text({ text: waveMsg, style: { fill: color, fontSize: 20, fontWeight: 'bold' } })
    msg.anchor.set(0.5)
    msg.x = 225
    msg.y = sceneManager.viewportH / 2
    this.addChild(msg)
    setTimeout(() => { if (msg.parent) msg.parent.removeChild(msg) }, 2500)
  }

  _onCastleDamage(dmg) {
    this._castleHp = runState.damageCastle(dmg)
    this._shakeTimer = 0.2

    const msg = new Text({ text: `-${dmg} CASTLE`, style: { fill: 0xEF4444, fontSize: 14 } })
    msg.anchor.set(0.5)
    msg.x = 225
    msg.y = sceneManager.viewportH - 80
    this.addChild(msg)
    setTimeout(() => { if (msg.parent) msg.parent.removeChild(msg) }, 1500)

    if (this._castleHp <= 0 && !this._runEnded) {
      this._runEnded = true
      this._endRun(false, 'The castle has fallen!')
    }
  }

  _onGoldEarned(gold) { runState.addGold(gold) }

  _onXpEarned(xp) {
    this._xp += xp
    while (this._xp >= this._xpToNext) {
      this._xp -= this._xpToNext
      this._level++
      this._xpToNext = xpForLevel(this._level)
      this._levelText.text = `Level ${this._level}`
      this._vfx?.spawn('levelup', this._player.x, this._player.y, null)
      this._showUpgradeOverlay()
    }
    this._xpBar.update(this._xp, this._xpToNext)
  }

  _onPlayerHurt() { this._shakeTimer = 0.3 }

  _onPlayerDeath() {
    if (this._runEnded) return
    this._runEnded = true
    this._endRun(false, 'You have fallen!')
  }

  _onRunWon() {
    if (this._runEnded) return
    this._runEnded = true
    runState.bossDefeated = true
    this._endRun(true, 'VICTORY!')
  }

  _endRun(won, message) {
    this._stopTicker()
    const flash = new Graphics()
    flash.rect(0, 0, WORLD_W, sceneManager.viewportH).fill({ color: won ? 0xF59E0B : 0xFFFFFF, alpha: 0.5 })
    this.addChild(flash)

    const msg = new Text({ text: message, style: { fill: won ? 0xF59E0B : 0xEF4444, fontSize: 32, fontWeight: 'bold' } })
    msg.anchor.set(0.5)
    msg.x = 225
    msg.y = sceneManager.viewportH / 2
    this.addChild(msg)

    setTimeout(() => {
      if (won) {
        import('./BossVictoryScene.js').then(({ BossVictoryScene }) => sceneManager.go(new BossVictoryScene()))
          .catch(err => console.error('Failed to load BossVictoryScene:', err))
      } else {
        import('./GameOverScene.js').then(({ GameOverScene }) => sceneManager.go(new GameOverScene()))
          .catch(err => console.error('Failed to load GameOverScene:', err))
      }
    }, 1200)
  }

  _showUpgradeOverlay() {
    this._paused = true
    import('./UpgradeScene.js').then(({ UpgradeScene }) => {
      const overlay = new UpgradeScene(
        this._upgradeSystem,
        runState.selectedClass,
        (key) => {
          this._upgradeSystem.applyUpgrade(key)
          this._player.stats = { ...this._upgradeSystem.stats }
          this.removeChild(overlay)
          this._paused = false
        }
      )
      this.addChild(overlay)
    }).catch(err => console.error('Failed to load UpgradeScene:', err))
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
