import { Container, Graphics, Text, NineSliceSprite, Assets } from 'pixi.js'
import { VFXLayer } from '../vfx/VFXLayer.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'
import { inputManager } from '../core/InputManager.js'
import { Mage } from '../entities/player/Mage.js'
import { Tank } from '../entities/player/Tank.js'
import { UpgradeSystem } from '../systems/UpgradeSystem.js'
import { CombatSystem } from '../systems/CombatSystem.js'
import { HealthBar } from '../ui/HealthBar.js'
import { GoldDisplay } from '../ui/GoldDisplay.js'
import { MapOverlay } from '../ui/MapOverlay.js'
import { XpBar } from '../ui/XpBar.js'
import { fadeToScene } from '../core/transition.js'
import { getRoomData } from '../data/rooms.js'
import { xpForLevel } from '../data/upgrades.js'

const ARENA = { x: 0, y: 76, w: 450, h: 524 }

const DOOR_SLOTS = {
  east:  { rx: 410, ry: 192, rw: 40, rh: 80, cx: 430, cy: 232 },
  west:  { rx:   0, ry: 192, rw: 40, rh: 80, cx:  20, cy: 232 },
  north: { rx: 165, ry:   0, rw: 80, rh: 40, cx: 205, cy:  20 },
  south: { rx: 165, ry: 484, rw: 80, rh: 40, cx: 205, cy: 504 },
}

const TYPE_COLORS = {
  combat: 0xEF4444, chest: 0xF59E0B, elite: 0x8B5CF6,
  elite_candidate: 0xEF4444, boss: 0xEC4899,
}
const TYPE_LABELS = {
  combat: 'FIGHT', chest: 'CHEST', elite: 'ELITE',
  elite_candidate: 'FIGHT', boss: 'BOSS',
}

function makePlayer(classKey, metaUpgrades) {
  if (classKey === 'mage') return new Mage(metaUpgrades)
  if (classKey === 'tank') return new Tank(metaUpgrades)
  throw new Error(`Unknown class: ${classKey}`)
}

export class CombatScene extends Container {
  constructor(node) {
    super()
    this._node = node
    this._paused = false
    this._tickerFn = null
    this._roomCleared = false
    this._doors = []
    this._shakeTimer = 0
    this._shakeIntensity = 5

    const { name, modifier, theme } = getRoomData(node)
    this._modifier = modifier
    this._theme = theme
    this._xpMult = modifier?.xpMult ?? 1

    const metaUpgrades = authState.player?.meta_upgrades || []
    this._player = makePlayer(runState.selectedClass, metaUpgrades)

    if (runState._upgradeSystem) {
      this._upgradeSystem = runState._upgradeSystem
      this._player.stats = { ...this._upgradeSystem.stats }
    } else {
      this._upgradeSystem = new UpgradeSystem({ ...this._player.stats })
      runState._upgradeSystem = this._upgradeSystem
    }

    // Apply player-side modifiers on top of restored stats (room-only, doesn't touch upgrade system)
    if (modifier?.playerSpeedMult) {
      this._player.stats.speed = Math.round(this._player.stats.speed * modifier.playerSpeedMult)
    }
    if (modifier?.playerDamageMult) {
      this._player.stats.damage = Math.round(this._player.stats.damage * modifier.playerDamageMult)
    }

    this._xp = 0
    this._level = 1
    this._xpToNext = xpForLevel(1)

    this._build(node.depth)
    this._showRoomAnnouncement(name, modifier)
  }

  _build(depth) {
    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(this._theme.floor)
    this.addChild(bg)

    const arena = new Graphics()
    arena.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h).fill(this._theme.arena)
    this.addChild(arena)

    const border = new Graphics()
    border.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h).stroke({ width: 2, color: this._theme.border })
    this.addChild(border)

    this._stage = new Container()
    this._stage.x = ARENA.x
    this._stage.y = ARENA.y
    this.addChild(this._stage)

    this._player.x = ARENA.w / 2
    this._player.y = ARENA.h / 2
    this._stage.addChild(this._player)
    this._trailGfx = new Graphics()
    this._stage.addChild(this._trailGfx)
    this._vfx = new VFXLayer()
    this._stage.addChild(this._vfx)

    // Top HUD panel — full width, 76px tall
    const hudPanelTex = Assets.get('ui_panel_fill')
    if (hudPanelTex) {
      const hudFill = new NineSliceSprite({ texture: hudPanelTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
      hudFill.width = 450; hudFill.height = 76; hudFill.x = 0; hudFill.y = 0
      hudFill.tint = 0x0a0f1a
      this.addChild(hudFill)
      const hudBorderTex = Assets.get('ui_panel_border')
      if (hudBorderTex) {
        const hudBorder = new NineSliceSprite({ texture: hudBorderTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
        hudBorder.width = 450; hudBorder.height = 76; hudBorder.x = 0; hudBorder.y = 0
        hudBorder.tint = 0x6B7280
        this.addChild(hudBorder)
      }
    }

    this._levelText = new Text({ text: 'Level 1', style: { fill: 0xF5DEB3, fontSize: 13 } })
    this._levelText.x = 8
    this._levelText.y = 8
    this.addChild(this._levelText)

    this._xpBar = new XpBar(180, 10)
    this._xpBar.x = 74
    this._xpBar.y = 10
    this.addChild(this._xpBar)
    this._xpBar.update(0, xpForLevel(1))

    this._healthBar = new HealthBar(240, 16)
    this._healthBar.x = 8
    this._healthBar.y = 32
    this.addChild(this._healthBar)

    const depthText = new Text({ text: `Depth ${depth}`, style: { fill: 0x94A3B8, fontSize: 12 } })
    depthText.x = 8
    depthText.y = 54
    this.addChild(depthText)

    this._goldDisplay = new GoldDisplay()
    this._goldDisplay.x = 310
    this._goldDisplay.y = 8
    this.addChild(this._goldDisplay)

    // Bottom HUD strip
    const bottomBg = new Graphics()
    bottomBg.rect(0, 600, 450, 200).fill(0x0a0f1a)
    this.addChild(bottomBg)

    // Mini-map in bottom HUD
    this._mapOverlay = new MapOverlay()
    this._mapOverlay.x = 270
    this._mapOverlay.y = 614
    this.addChild(this._mapOverlay)
    this._mapOverlay.update(runState._mapData, runState._currentNodeId, runState._clearedNodeIds)

    // Joystick visual (drawn each frame on mobile)
    this._joystickGfx = new Graphics()
    this.addChild(this._joystickGfx)

    this._combatSystem = new CombatSystem({
      player: this._player,
      upgradeSystem: this._upgradeSystem,
      depth,
      stage: this._stage,
      modifier: this._modifier,
      onWaveCleared: (wave) => this._onWaveCleared(wave),
      onRoomCleared: () => this._onRoomCleared(),
      onPlayerDeath: () => this._onPlayerDeath(),
      onPlayerHurt: () => this._onPlayerHurt(),
      onGoldEarned: (g) => this._onGoldEarned(g),
      onXpEarned: (xp) => this._onXpEarned(xp),
      onEffect: (type, x, y, value) => this._vfx.spawn(type, x, y, value),
    })

    this._startTicker()
  }

  _startTicker() {
    const { app } = sceneManager
    this._tickerFn = (ticker) => {
      if (this._paused) return
      const dt = ticker.deltaMS / 1000

      this._updatePlayer(dt)

      // Trail rendering
      this._trailGfx.clear()
      this._combatSystem.projectiles.forEach(p => {
        p._trail.forEach((pos, i) => {
          const frac = (6 - i) / 6
          const alpha = frac * frac * 0.6
          const r = Math.max(0.5, p.radius * frac * 0.7)
          this._trailGfx.circle(pos.x, pos.y, r).fill({ color: p.color, alpha })
        })
      })
      this._vfx.tick(dt)

      if (this._roomCleared) {
        this._checkDoorCollisions(this._player.x, this._player.y)
      } else {
        this._combatSystem.tick(dt, this._player.x, this._player.y, this._getAimAngle())
      }

      // Screen shake
      if (this._shakeTimer > 0) {
        this._shakeTimer -= dt
        const t = Math.max(0, this._shakeTimer / 0.3)
        const mag = this._shakeIntensity * t
        this._stage.x = ARENA.x + (Math.random() * 2 - 1) * mag
        this._stage.y = ARENA.y + (Math.random() * 2 - 1) * mag
        if (this._shakeTimer <= 0) {
          this._stage.x = ARENA.x
          this._stage.y = ARENA.y
        }
      }

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

  _updatePlayer(dt) {
    const move = inputManager.getMovement()
    const speed = this._player.stats.speed
    this._player.x = Math.max(16, Math.min(ARENA.w - 16, this._player.x + move.x * speed * dt))
    this._player.y = Math.max(24, Math.min(ARENA.h - 16, this._player.y + move.y * speed * dt))
    this._player.animateTick(dt, move.x, move.y)
  }

  _getAimAngle() {
    const enemies = this._combatSystem.enemies
    if (inputManager.isMobile || !inputManager.isMoving()) {
      let nearest = null
      let nearDistSq = Infinity
      enemies.forEach(e => {
        if (!e.isAlive()) return
        const dx = e.x - this._player.x
        const dy = e.y - this._player.y
        const d = dx * dx + dy * dy
        if (d < nearDistSq) { nearDistSq = d; nearest = e }
      })
      if (nearest) return Math.atan2(nearest.y - this._player.y, nearest.x - this._player.x)
      return 0
    }
    const mx = inputManager.mouseWorld.x - ARENA.x
    const my = inputManager.mouseWorld.y - ARENA.y
    return Math.atan2(my - this._player.y, mx - this._player.x)
  }

  _onGoldEarned(gold) {
    runState.addGold(gold)
  }

  _onXpEarned(xp) {
    this._xp += Math.round(xp * this._xpMult)
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

  _onPlayerHurt() {
    this._shakeTimer = 0.3
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

  _showRoomAnnouncement(name, modifier) {
    const bannerH = modifier ? 82 : 46
    const c = new Container()
    c.x = (450 - 320) / 2
    c.y = 92

    const bg = new Graphics()
    bg.rect(0, 0, 320, bannerH).fill({ color: 0x000000, alpha: 0.65 })
    c.addChild(bg)

    const nameTxt = new Text({ text: name, style: { fill: 0xffffff, fontSize: 20, fontWeight: 'bold' } })
    nameTxt.anchor.set(0.5)
    nameTxt.x = 160
    nameTxt.y = 22
    c.addChild(nameTxt)

    if (modifier) {
      const badgeColor = modifier.type === 'curse' ? 0xEF4444 : 0x16A34A
      const badge = new Graphics()
      badge.rect(60, 40, 200, 22).fill(badgeColor)
      c.addChild(badge)

      const badgeTxt = new Text({ text: modifier.label, style: { fill: 0xffffff, fontSize: 13, fontWeight: 'bold' } })
      badgeTxt.anchor.set(0.5)
      badgeTxt.x = 160
      badgeTxt.y = 51
      c.addChild(badgeTxt)

      const descColor = modifier.type === 'curse' ? 0xFCA5A5 : 0x86EFAC
      const descTxt = new Text({ text: modifier.desc, style: { fill: descColor, fontSize: 12 } })
      descTxt.anchor.set(0.5)
      descTxt.x = 160
      descTxt.y = 70
      c.addChild(descTxt)
    }

    this.addChild(c)
    setTimeout(() => { if (c.parent) c.parent.removeChild(c); c.destroy({ children: true }) }, 3000)
  }

  _onWaveCleared(waveNum) {
    const msg = new Text({ text: `Wave ${waveNum} cleared!`, style: { fill: 0x22C55E, fontSize: 20 } })
    msg.anchor.set(0.5)
    msg.x = 225
    msg.y = 560
    this.addChild(msg)
    setTimeout(() => { if (msg.parent) msg.parent.removeChild(msg) }, 2000)
  }

  _onRoomCleared() {
    if (this._roomCleared) return
    runState.roomsCleared++
    runState.depthReached = Math.max(runState.depthReached, this._node.depth)
    if (!runState._clearedNodeIds) runState._clearedNodeIds = []
    runState._clearedNodeIds.push(runState._currentNodeId)

    if (this._node.type === 'boss') {
      this._stopTicker()
      runState.bossDefeated = true
      import('./BossVictoryScene.js').then(({ BossVictoryScene }) => sceneManager.go(new BossVictoryScene()))
        .catch(err => console.error('Failed to load BossVictoryScene:', err))
    } else {
      this._roomCleared = true
      this._mapOverlay.update(runState._mapData, runState._currentNodeId, runState._clearedNodeIds)
      this._spawnExitDoors()
      this._showRoomClearedMsg()
    }
  }

  _spawnExitDoors() {
    const mapData = runState._mapData
    if (!mapData) return

    const currentNode = mapData.nodes.get(runState._currentNodeId)
    if (!currentNode) return

    const connections = currentNode.connections
      .map(id => mapData.nodes.get(id))
      .filter(Boolean)

    // Forward (higher depth) → east/north; backward (lower/same) → west/south
    const forward = connections.filter(n => n.depth >= currentNode.depth)
      .sort((a, b) => b.depth - a.depth)
    const backward = connections.filter(n => n.depth < currentNode.depth)
      .sort((a, b) => b.depth - a.depth)

    const pairs = [
      ...forward.slice(0, 2).map((n, i) => ({ node: n, wall: ['east', 'north'][i] })),
      ...backward.slice(0, 2).map((n, i) => ({ node: n, wall: ['west', 'south'][i] })),
    ]

    pairs.forEach(({ node, wall }) => {
      const door = this._createDoor(node, wall)
      this._doors.push(door)
    })
  }

  _createDoor(node, wall) {
    const isCleared = (runState._clearedNodeIds || []).includes(node.id)
    const color = isCleared ? 0x4B5563 : (TYPE_COLORS[node.type] ?? 0x374151)
    const label = TYPE_LABELS[node.type] ?? '?'
    const p = DOOR_SLOTS[wall]

    const bg = new Graphics()
    bg.rect(p.rx, p.ry, p.rw, p.rh).fill(color)
    this._stage.addChild(bg)

    const txt = new Text({ text: label, style: { fill: 0xffffff, fontSize: 10, fontWeight: 'bold' } })
    txt.anchor.set(0.5)
    txt.x = p.cx
    txt.y = p.cy
    this._stage.addChild(txt)

    return { node, cx: p.cx, cy: p.cy, triggerDist: 50 }
  }

  _checkDoorCollisions(px, py) {
    for (const door of this._doors) {
      const dx = px - door.cx
      const dy = py - door.cy
      if (dx * dx + dy * dy <= door.triggerDist * door.triggerDist) {
        this._doors = []
        this._enterNode(door.node)
        return
      }
    }
  }

  _enterNode(node) {
    this._stopTicker()
    runState._currentNodeId = node.id
    const { app } = sceneManager
    if (node.type === 'chest') {
      import('./ChestScene.js').then(({ ChestScene }) => {
        fadeToScene(app, () => sceneManager.go(new ChestScene(node)))
      }).catch(err => console.error('Failed to load ChestScene:', err))
    } else {
      import('./CombatScene.js').then(({ CombatScene }) => {
        fadeToScene(app, () => sceneManager.go(new CombatScene(node)))
      }).catch(err => console.error('Failed to load CombatScene:', err))
    }
  }

  _showRoomClearedMsg() {
    const msg = new Text({
      text: 'Room Cleared! Walk to a door',
      style: { fill: 0x22C55E, fontSize: 16 },
    })
    msg.anchor.set(0.5)
    msg.x = 225
    msg.y = 560
    this.addChild(msg)
  }

  _onPlayerDeath() {
    this._stopTicker()
    const flash = new Graphics()
    flash.rect(0, 0, 450, 800).fill({ color: 0xFFFFFF, alpha: 0.6 })
    this.addChild(flash)
    setTimeout(() => {
      import('./GameOverScene.js').then(({ GameOverScene }) => sceneManager.go(new GameOverScene()))
        .catch(err => console.error('Failed to load GameOverScene:', err))
    }, 400)
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
