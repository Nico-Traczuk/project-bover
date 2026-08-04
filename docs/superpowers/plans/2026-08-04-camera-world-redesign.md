# Camera + Scrollable World Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed letterboxed 450×800 canvas with a full-screen responsive canvas and a 450×1400 scrollable world where the camera follows the player in both prep and combat phases.

**Architecture:** PixiJS canvas fills `window.innerWidth × window.innerHeight`; stage scales uniformly by `innerWidth / 450` so all game logic stays in 450-wide logical units. A `_worldContainer` holds all world objects (player, enemies, paths, castle); the HUD is a sibling container that never moves. Each tick, `_worldContainer.y` is updated to keep the player vertically centered, clamped at world edges.

**Tech Stack:** PixiJS v8, Vite, Vitest

---

## File Map

| File | Change |
|------|--------|
| `mobile/src/main.js` | Fill-screen canvas, stage scale, viewportH, remove fitCanvas |
| `mobile/src/core/SceneManager.js` | Add `viewportH` property |
| `mobile/src/systems/WaveSystem.js` | Update `CASTLE_Y` from `464` to `1100` |
| `mobile/src/scenes/BattlefieldScene.js` | New world coords, `_worldContainer`, camera, interactive slots |
| `mobile/src/scenes/WaveScene.js` | New world coords, `_worldContainer`, camera, aim + VFX coord fix |

---

### Task 1: Fill-screen canvas and stage scale

**Files:**
- Modify: `mobile/src/main.js`
- Modify: `mobile/src/core/SceneManager.js`

- [ ] **Step 1: Add `viewportH` to SceneManager**

Open `mobile/src/core/SceneManager.js`. Replace the entire file with:

```js
class SceneManager {
  init(app) {
    this.app = app
    this.current = null
    this.viewportH = 0
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
```

- [ ] **Step 2: Rewrite main.js**

Open `mobile/src/main.js`. Replace the entire file with:

```js
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
```

Note: `inputManager.init()` is now called inside `applyScale()` so the scale factors stay correct after resize.

- [ ] **Step 3: Run tests — all 96 must pass**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npm test
```

Expected: `Tests 96 passed (96)`

- [ ] **Step 4: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/main.js mobile/src/core/SceneManager.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: fill-screen canvas with stage scale and viewportH"
```

---

### Task 2: Update WaveSystem CASTLE_Y constant

**Files:**
- Modify: `mobile/src/systems/WaveSystem.js`

- [ ] **Step 1: Update the constant**

Open `mobile/src/systems/WaveSystem.js`. Find line 9:
```js
const CASTLE_Y = 464
```
Change it to:
```js
const CASTLE_Y = 1100
```

- [ ] **Step 2: Run tests — all 96 must pass**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npm test
```

Expected: `Tests 96 passed (96)`

- [ ] **Step 3: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/systems/WaveSystem.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: update WaveSystem CASTLE_Y to 1100 for new world layout"
```

---

### Task 3: Redesign BattlefieldScene with worldContainer and camera

**Files:**
- Modify: `mobile/src/scenes/BattlefieldScene.js`

This is a full rewrite of the scene. Read the current file first, then replace it entirely with the content below.

- [ ] **Step 1: Read the current file**

Read `mobile/src/scenes/BattlefieldScene.js` to confirm current state before replacing.

- [ ] **Step 2: Replace BattlefieldScene.js**

Write the following as the complete new `mobile/src/scenes/BattlefieldScene.js`:

```js
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
```

- [ ] **Step 3: Run tests — all 96 must pass**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npm test
```

Expected: `Tests 96 passed (96)`

- [ ] **Step 4: Commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/scenes/BattlefieldScene.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: redesign BattlefieldScene with worldContainer, camera, and 1400-unit world"
```

---

### Task 4: Redesign WaveScene with worldContainer, camera, and coordinate fixes

**Files:**
- Modify: `mobile/src/scenes/WaveScene.js`

This is a full rewrite of the scene. Read the current file first, then replace it entirely.

- [ ] **Step 1: Read the current file**

Read `mobile/src/scenes/WaveScene.js` to confirm current state before replacing.

- [ ] **Step 2: Replace WaveScene.js**

Write the following as the complete new `mobile/src/scenes/WaveScene.js`:

```js
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

    // Castle HP bar — fixed in HUD at bottom of panel
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
        // x, y are already world coordinates — no ARENA offset needed
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

      // Trail rendering (world coords — no ARENA offset)
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

      // Shake offset applied on top of camera
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
    // Announce text in screen space (HUD area bottom)
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
```

- [ ] **Step 3: Run tests — all 96 must pass**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npm test
```

Expected: `Tests 96 passed (96)`

- [ ] **Step 4: Start dev server and verify in browser**

```bash
cd /Users/nicotraczuk/Desktop/Projects/Projecto-Bover/mobile && npm run dev
```

Open on mobile or browser and verify:
- Canvas fills full screen with no black bars
- BattlefieldScene: player can walk around, camera scrolls vertically to follow
- Structure slot labels are visible near the castle (world Y ~950–1020)
- Tapping a slot logs to console
- START WAVE button visible at bottom of screen and tappable
- WaveScene: enemies spawn at top of world, camera follows player during combat
- Castle HP bar appears in the HUD strip (top of screen), not scrolling with world

- [ ] **Step 5: Stop server and commit**

```bash
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover add mobile/src/scenes/WaveScene.js
git -C /Users/nicotraczuk/Desktop/Projects/Projecto-Bover commit -m "feat: redesign WaveScene with worldContainer, camera, and coordinate fixes"
```
