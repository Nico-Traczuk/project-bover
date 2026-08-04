# Wave Defense — Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the roguelite room-exploration loop with a wave defense arena: BiomeSelectScene → BattlefieldScene (prep phase, free roam) → WaveScene (15 timed waves) → back to BattlefieldScene.

**Architecture:** `RunState` is rewritten for wave/biome tracking. `ClassSelectScene` navigates to the new `BiomeSelectScene`. `BattlefieldScene` is the persistent prep hub — the player free-roams, then presses START WAVE. `WaveScene` runs 15 auto-timed waves using the new `WaveSystem`; enemies that reach the castle deal damage (new loss condition alongside player death). After death or boss kill, both return to `BattlefieldScene` for the next run. `MapScene`, `ChestScene` (standalone), and node-based flow are retired.

**Tech Stack:** PixiJS v8, Vite — follow existing Container + ticker patterns from `CombatScene`.

---

## Sub-plan decomposition

This spec covers 5 independent sub-plans. Implement them in order:

| Plan | Scope |
|---|---|
| **Plan 1 (this file)** | Core loop — RunState, BiomeSelect, BattlefieldScene, WaveSystem, WaveScene |
| Plan 2 | Enemy roster — 7 enemy types, wave composition accumulation, scaling formulas |
| Plan 3 | Castle structures — Arrow Tower, Iron Gate, Healing Shrine, walk-to-interact |
| Plan 4 | Meta-progression — Weapons, Active Skills (buy 4 equip 2), Merchant NPC |
| Plan 5 | Backend — castle_structures table, biome/wave run fields, API endpoints |

---

## Layout constants (reference throughout)

```
Screen: 450 × 800
HUD top: y 0–76 (unchanged)
Stage: placed at x=0, y=76, dimensions 450 × 524
Castle zone (stage-relative): y > 464 (bottom 60px of stage)
Castle graphic: rect(50, 464, 350, 56)
Path 1 center: x=150
Path 2 center: x=300
Enemy spawn strip: y=0–20 (top of stage)
Player spawn: (225, 280)
```

---

## File map

| Action | File |
|---|---|
| **Rewrite** | `mobile/src/core/RunState.js` |
| **Create** | `mobile/src/data/biomes.js` |
| **Create** | `mobile/src/scenes/BiomeSelectScene.js` |
| **Create** | `mobile/src/scenes/BattlefieldScene.js` |
| **Create** | `mobile/src/systems/WaveSystem.js` |
| **Create** | `mobile/src/scenes/WaveScene.js` |
| **Modify** | `mobile/src/scenes/ClassSelectScene.js` (navigate to BiomeSelectScene) |
| **Modify** | `mobile/src/scenes/GameOverScene.js` (navigate to BattlefieldScene) |
| **Modify** | `mobile/src/scenes/BossVictoryScene.js` (navigate to BattlefieldScene) |

Files NOT touched in Plan 1: BasePlayer, Mage, Tank, BaseEnemy, Goblin, UpgradeSystem, UpgradeScene, VFXLayer, CollisionSystem, Projectile, HealthBar, GoldDisplay, XpBar, AuthState, InputManager, transition.js.

---

## Task 1: Rewrite RunState for wave-based runs

**Files:**
- Rewrite: `mobile/src/core/RunState.js`

- [ ] **Step 1: Replace the file contents**

```js
export const runState = {
  selectedClass: null,
  selectedBiome: 'forest',   // persists across runs within a session
  goldEarned: 0,             // gold accumulated this run
  currentWave: 0,
  castleHp: 300,
  castleMaxHp: 300,
  bossDefeated: false,
  _upgradeSystem: null,

  reset() {
    this.selectedClass = null
    this.goldEarned = 0
    this.currentWave = 0
    this.castleHp = 300
    this.castleMaxHp = 300
    this.bossDefeated = false
    this._upgradeSystem = null
    // selectedBiome intentionally NOT reset — player returns to same biome
  },

  addGold(amount) {
    this.goldEarned += amount
  },

  damageCastle(amount) {
    this.castleHp = Math.max(0, this.castleHp - amount)
    return this.castleHp
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/core/RunState.js
git commit -m "refactor: rewrite RunState for wave-based run tracking"
```

---

## Task 2: Create biomes.js

**Files:**
- Create: `mobile/src/data/biomes.js`

- [ ] **Step 1: Create the file**

```js
export const BIOMES = {
  forest: {
    key: 'forest',
    name: 'Enchanted Forest',
    description: 'Defend your castle from creatures of the wood',
    unlocked: true,
    colors: {
      floor: 0x1a2e1a,
      arena: 0x1e3520,
      border: 0x2d5a2d,
      castle: 0x5a3e1a,
      path: 0x2a4a1a,
    },
  },
  dungeon: {
    key: 'dungeon',
    name: 'Dark Dungeon',
    description: 'The undead march on your castle',
    unlocked: false,
    colors: {
      floor: 0x1a1a2e,
      arena: 0x1e1e35,
      border: 0x2d2d5a,
      castle: 0x3a3a5a,
      path: 0x1a1a3a,
    },
  },
  inferno: {
    key: 'inferno',
    name: 'Inferno',
    description: 'Demons pour from the depths below',
    unlocked: false,
    colors: {
      floor: 0x2e1a1a,
      arena: 0x351e1e,
      border: 0x5a2d2d,
      castle: 0x5a1a1a,
      path: 0x3a1a1a,
    },
  },
}

export const TOTAL_WAVES = 15
export const WAVE_TIMER_SECONDS = 20  // hidden timer — next wave forces in after this

export function isWaveElite(wave) {
  return wave === 5 || wave === 10
}

export function isWaveBoss(wave) {
  return wave === 15
}

export function isWaveChest(wave) {
  return wave === 3 || wave === 7 || wave === 12
}

export function enemyCountForWave(wave) {
  const base = 3 + Math.floor(wave * 0.6)
  return Math.min(base, 14)
}

export function waveHpMultiplier(wave) {
  return 1 + wave * 0.12
}

export function waveDamageMultiplier(wave) {
  return 1 + wave * 0.10
}

export function waveGoldMultiplier(wave) {
  return 1 + wave * 0.08
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/data/biomes.js
git commit -m "feat: add biomes data with wave timing and scaling constants"
```

---

## Task 3: BiomeSelectScene

**Files:**
- Create: `mobile/src/scenes/BiomeSelectScene.js`

- [ ] **Step 1: Create the file**

```js
import { Container, Graphics, Text, Assets, NineSliceSprite } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { BIOMES } from '../data/biomes.js'
import { fadeToScene } from '../core/transition.js'

const CARD_W = 380
const CARD_H = 120

function makeBiomeCard(biome, y, onClick) {
  const c = new Container()
  c.x = 35
  c.y = y

  const fillTex = Assets.get('ui_panel_fill')
  const borderTex = Assets.get('ui_panel_border')
  const isLocked = !biome.unlocked

  if (fillTex) {
    const fill = new NineSliceSprite({ texture: fillTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
    fill.width = CARD_W; fill.height = CARD_H
    fill.tint = isLocked ? 0x0a0a0a : 0x0c1520
    c.addChild(fill)
  } else {
    const bg = new Graphics()
    bg.rect(0, 0, CARD_W, CARD_H).fill(isLocked ? 0x111111 : 0x1f2937)
    c.addChild(bg)
  }

  if (borderTex) {
    const border = new NineSliceSprite({ texture: borderTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
    border.width = CARD_W; border.height = CARD_H
    border.tint = isLocked ? 0x374151 : 0xC8A857
    c.addChild(border)
  }

  const nameTxt = new Text({
    text: isLocked ? '🔒  ' + biome.name : biome.name,
    style: { fill: isLocked ? 0x4B5563 : 0xFFFFFF, fontSize: 20, fontWeight: 'bold' },
  })
  nameTxt.x = 20
  nameTxt.y = 22
  c.addChild(nameTxt)

  const descTxt = new Text({
    text: isLocked ? 'Defeat the previous boss to unlock' : biome.description,
    style: { fill: isLocked ? 0x374151 : 0x9CA3AF, fontSize: 14 },
  })
  descTxt.x = 20
  descTxt.y = 56
  c.addChild(descTxt)

  if (!isLocked) {
    const colorBar = new Graphics()
    colorBar.rect(0, CARD_H - 6, CARD_W, 6).fill(biome.colors.border)
    c.addChild(colorBar)

    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.on('pointerup', onClick)
  }

  return c
}

export class BiomeSelectScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'Choose Your Battlefield', style: { fill: 0xFFFFFF, fontSize: 22, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 60
    this.addChild(title)

    const subtitle = new Text({ text: 'Defend your castle from the incoming siege', style: { fill: 0x6B7280, fontSize: 14 } })
    subtitle.anchor.set(0.5)
    subtitle.x = 225
    subtitle.y = 92
    this.addChild(subtitle)

    Object.values(BIOMES).forEach((biome, i) => {
      const card = makeBiomeCard(biome, 140 + i * (CARD_H + 20), () => this._selectBiome(biome.key))
      this.addChild(card)
    })

    const backBtn = new Text({ text: '← Back', style: { fill: 0x6B7280, fontSize: 15 } })
    backBtn.x = 20
    backBtn.y = 748
    backBtn.eventMode = 'static'
    backBtn.cursor = 'pointer'
    backBtn.on('pointerup', () => {
      import('./ClassSelectScene.js').then(({ ClassSelectScene }) => sceneManager.go(new ClassSelectScene()))
        .catch(err => console.error('Failed to load ClassSelectScene:', err))
    })
    this.addChild(backBtn)
  }

  _selectBiome(biomeKey) {
    runState.reset()
    runState.selectedBiome = biomeKey
    import('./BattlefieldScene.js').then(({ BattlefieldScene }) => {
      fadeToScene(sceneManager.app, () => sceneManager.go(new BattlefieldScene()))
    }).catch(err => console.error('Failed to load BattlefieldScene:', err))
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/scenes/BiomeSelectScene.js
git commit -m "feat: add BiomeSelectScene with Forest/Dungeon/Inferno cards"
```

---

## Task 4: BattlefieldScene (prep phase)

The prep hub — player free-roams the battlefield, visits structure slots, walks to merchant, then taps START WAVE when ready. No enemies are present. This scene is re-entered after every run (death or boss kill).

**Files:**
- Create: `mobile/src/scenes/BattlefieldScene.js`

- [ ] **Step 1: Create the file**

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

const ARENA = { x: 0, y: 76, w: 450, h: 524 }
const CASTLE_Y = 464       // stage-relative: castle starts here
const CASTLE_H = 56
const PLAYER_SPAWN = { x: 225, y: 280 }

function makePlayer(classKey, metaUpgrades) {
  if (classKey === 'mage') return new Mage(metaUpgrades)
  if (classKey === 'tank') return new Tank(metaUpgrades)
  throw new Error(`Unknown class: ${classKey}`)
}

export class BattlefieldScene extends Container {
  constructor() {
    super()
    this._tickerFn = null

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

    // Background
    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(biome.colors.floor)
    this.addChild(bg)

    // Arena area
    const arena = new Graphics()
    arena.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h).fill(biome.colors.arena)
    this.addChild(arena)

    this._stage = new Container()
    this._stage.x = ARENA.x
    this._stage.y = ARENA.y
    this.addChild(this._stage)

    this._buildBattlefield(biome)
    this._buildHUD()

    // Player
    this._player.x = PLAYER_SPAWN.x
    this._player.y = PLAYER_SPAWN.y
    this._stage.addChild(this._player)

    this._buildStartWaveButton()
  }

  _buildBattlefield(biome) {
    const g = new Graphics()

    // Path 1 (left)
    g.rect(115, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })
    // Path 2 (right)
    g.rect(265, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })

    // Castle base
    g.rect(50, CASTLE_Y, 350, CASTLE_H).fill(biome.colors.castle)
    g.rect(50, CASTLE_Y, 350, CASTLE_H).stroke({ width: 2, color: 0xC8A857 })

    // Castle label
    this._stage.addChild(g)

    const castleLabel = new Text({ text: '🏰  CASTLE', style: { fill: 0xC8A857, fontSize: 16, fontWeight: 'bold' } })
    castleLabel.anchor.set(0.5)
    castleLabel.x = 225
    castleLabel.y = CASTLE_Y + CASTLE_H / 2
    this._stage.addChild(castleLabel)

    // Structure slot markers (empty for now — Plan 3 adds real structures)
    this._buildStructureSlots()

    // Merchant NPC marker (inside castle)
    const merchantMarker = new Text({ text: '🛒 Merchant', style: { fill: 0x9CA3AF, fontSize: 12 } })
    merchantMarker.x = 175
    merchantMarker.y = CASTLE_Y + 38
    this._stage.addChild(merchantMarker)
  }

  _buildStructureSlots() {
    const slots = [
      { x: 140, y: CASTLE_Y - 50, label: '[Tower Slot]' },
      { x: 270, y: CASTLE_Y - 50, label: '[Gate Slot]' },
      { x: 210, y: CASTLE_Y - 20, label: '[Shrine Slot]' },
    ]
    slots.forEach(({ x, y, label }) => {
      const slotG = new Graphics()
      slotG.rect(x - 28, y - 10, 56, 28).stroke({ width: 1, color: 0x374151, alpha: 0.6 })
      this._stage.addChild(slotG)
      const slotTxt = new Text({ text: label, style: { fill: 0x374151, fontSize: 9 } })
      slotTxt.anchor.set(0.5)
      slotTxt.x = x
      slotTxt.y = y + 4
      this._stage.addChild(slotTxt)
    })
  }

  _buildHUD() {
    // HUD panel (same pattern as CombatScene)
    const hudPanelTex = Assets.get('ui_panel_fill')
    if (hudPanelTex) {
      const hudFill = new NineSliceSprite({ texture: hudPanelTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
      hudFill.width = 450; hudFill.height = 76; hudFill.tint = 0x0a0f1a
      this.addChild(hudFill)
      const hudBorderTex = Assets.get('ui_panel_border')
      if (hudBorderTex) {
        const hudBorder = new NineSliceSprite({ texture: hudBorderTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
        hudBorder.width = 450; hudBorder.height = 76; hudBorder.tint = 0x6B7280
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

    // Bottom strip
    const bottomBg = new Graphics()
    bottomBg.rect(0, 600, 450, 200).fill(0x0a0f1a)
    this.addChild(bottomBg)

    const prepLabel = new Text({ text: 'PREP PHASE — Upgrade your castle then press START WAVE', style: { fill: 0x9CA3AF, fontSize: 11 } })
    prepLabel.anchor.set(0.5)
    prepLabel.x = 225
    prepLabel.y = 618
    this.addChild(prepLabel)

    // Joystick gfx
    this._joystickGfx = new Graphics()
    this.addChild(this._joystickGfx)
  }

  _buildStartWaveButton() {
    const fillTex = Assets.get('ui_panel_fill')
    const borderTex = Assets.get('ui_panel_border')

    if (fillTex) {
      const btn = new NineSliceSprite({ texture: fillTex, leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 })
      btn.width = 220; btn.height = 52; btn.x = 115; btn.y = 638; btn.tint = 0x15803D
      this.addChild(btn)
      if (borderTex) {
        const btnB = new NineSliceSprite({ texture: borderTex, leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 })
        btnB.width = 220; btnB.height = 52; btnB.x = 115; btnB.y = 638; btnB.tint = 0xC8A857
        this.addChild(btnB)
      }
    } else {
      const btnBg = new Graphics()
      btnBg.rect(115, 638, 220, 52).fill(0x15803D)
      this.addChild(btnBg)
    }

    const btnText = new Text({ text: '⚔  START WAVE', style: { fill: 0xF5DEB3, fontSize: 18, fontWeight: 'bold' } })
    btnText.anchor.set(0.5)
    btnText.x = 225; btnText.y = 664
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

      this._player.x = Math.max(16, Math.min(ARENA.w - 16, this._player.x + move.x * speed * dt))
      this._player.y = Math.max(24, Math.min(CASTLE_Y - 20, this._player.y + move.y * speed * dt))
      this._player.animateTick(dt, move.x, move.y)

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

- [ ] **Step 2: Commit**

```bash
git add mobile/src/scenes/BattlefieldScene.js
git commit -m "feat: add BattlefieldScene prep phase with castle layout and START WAVE button"
```

---

## Task 5: WaveSystem

Replaces `CombatSystem`'s wave logic. Enemies spawn from the top of the stage. A hidden 20s timer forces the next wave even if enemies remain (stacking). Enemies that reach `y > CASTLE_Y` deal castle damage and are removed.

**Files:**
- Create: `mobile/src/systems/WaveSystem.js`

- [ ] **Step 1: Create the file**

```js
import { Goblin } from '../entities/enemies/Goblin.js'
import { Projectile } from '../entities/Projectile.js'
import { CollisionSystem } from './CollisionSystem.js'
import {
  TOTAL_WAVES, WAVE_TIMER_SECONDS, isWaveElite, isWaveBoss,
  enemyCountForWave, waveHpMultiplier, waveDamageMultiplier, waveGoldMultiplier,
} from '../data/biomes.js'

const CASTLE_Y = 464   // stage-relative: enemies crossing this hit the castle
const SPAWN_POSITIONS = [
  { x: 150, y: 10 },
  { x: 300, y: 10 },
  { x: 80,  y: 10 },
  { x: 370, y: 10 },
]
const CASTLE_HIT_DAMAGE_FACTOR = 3   // enemy.damage × factor = castle HP loss

export class WaveSystem {
  constructor({
    player, upgradeSystem, stage,
    onWaveAnnounce, onCastleDamage, onRunWon, onPlayerDeath,
    onGoldEarned, onXpEarned, onPlayerHurt, onEffect,
  }) {
    this.player = player
    this.upgradeSystem = upgradeSystem
    this.stage = stage
    this.onWaveAnnounce = onWaveAnnounce
    this.onCastleDamage = onCastleDamage
    this.onRunWon = onRunWon
    this.onPlayerDeath = onPlayerDeath
    this.onGoldEarned = onGoldEarned
    this.onXpEarned = onXpEarned
    this.onPlayerHurt = onPlayerHurt
    this.onEffect = onEffect

    this.enemies = []
    this.dyingEnemies = []
    this.projectiles = []
    this.collision = new CollisionSystem()

    this.currentWave = 0
    this._waveTimer = 0
    this._waveSpawning = false   // true while a wave is in progress
    this.runOver = false
  }

  // Called once from WaveScene after setup
  beginFirstWave() {
    this._spawnWave()
  }

  _spawnWave() {
    this.currentWave++
    this._waveTimer = WAVE_TIMER_SECONDS
    this._waveSpawning = true
    this.onWaveAnnounce?.(this.currentWave)

    const count = enemyCountForWave(this.currentWave)
    for (let i = 0; i < count; i++) {
      const enemy = this._makeEnemy()
      const slot = SPAWN_POSITIONS[i % SPAWN_POSITIONS.length]
      enemy.x = slot.x + (Math.random() - 0.5) * 50
      enemy.y = slot.y + Math.random() * 15
      this.enemies.push(enemy)
      this.stage.addChild(enemy)
    }
  }

  _makeEnemy() {
    const wave = this.currentWave
    const hpMult = waveHpMultiplier(wave)
    const dmgMult = waveDamageMultiplier(wave)
    // Plan 2 will swap Goblin for the correct type per wave
    const enemy = new Goblin(1)
    enemy.stats.hp   = Math.round(enemy.stats.hp * hpMult)
    enemy.stats.maxHp = enemy.stats.hp
    enemy.stats.damage = Math.round(enemy.stats.damage * dmgMult)
    return enemy
  }

  tick(dt, playerX, playerY, aimAngle) {
    if (this.runOver) return

    // Wave timer — force next wave when it expires
    this._waveTimer -= dt
    const allClear = this.enemies.length === 0 && this.dyingEnemies.length === 0

    if (allClear) {
      if (this.currentWave >= TOTAL_WAVES) {
        this.runOver = true
        this.onRunWon?.()
        return
      }
      this._spawnWave()
    } else if (this._waveTimer <= 0 && this.currentWave < TOTAL_WAVES) {
      this._spawnWave()  // stack next wave on top of current
    }

    // Player attack
    this.player.tick(dt)
    if (this.player.isAttackReady() && this.enemies.length > 0) {
      this.player.triggerAttack()
      this.player.resetAttackCooldown()
      this.player.getAttackData(aimAngle).forEach(a => {
        const p = new Projectile(a)
        this.projectiles.push(p)
        this.stage.addChild(p)
      })
    }

    // Enemy update
    const deadEnemies = []
    this.enemies.forEach(e => {
      if (!e.isAlive()) return

      e.tick(dt, playerX, playerY)

      // Castle breach
      if (e.y > CASTLE_Y) {
        const dmg = Math.round(e.stats.damage * CASTLE_HIT_DAMAGE_FACTOR)
        this.onCastleDamage?.(dmg)
        e.stats.hp = 0
        deadEnemies.push(e)
        return
      }

      // Enemy attacks on player
      const attack = e.getAttack(playerX, playerY)
      if (attack) {
        if (attack.isMelee) {
          const angle = Math.atan2(playerY - e.y, playerX - e.x)
          const prevHp = this.player.stats.hp
          this.player.takeDamage(attack.damage, angle)
          if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
        } else {
          const p = new Projectile(attack)
          this.projectiles.push(p)
          this.stage.addChild(p)
        }
      }
    })
    deadEnemies.forEach(e => { this.stage.removeChild(e); e.destroy({ children: true }) })

    this.projectiles.forEach(p => p.tick(dt))

    // Projectiles vs enemies
    this.collision.checkProjectilesVsEnemies(this.projectiles, this.enemies).forEach(({ projectile, enemy }) => {
      const hitAngle = Math.atan2(projectile.vy, projectile.vx)
      enemy.takeDamage(projectile.damage, hitAngle)
      this.onEffect?.('damage', enemy.x, enemy.y, { amount: projectile.damage, maxHp: enemy.stats.maxHp })
      this.onEffect?.('impact', enemy.x, enemy.y, null)
      if (projectile.frostSlow) enemy.slow(1.5)
      if (!projectile.isMelee) projectile.lifetime = 0
      if (!enemy.isAlive()) {
        const goldMult = waveGoldMultiplier(this.currentWave)
        const gold = Math.round((enemy.goldDrop() + (this.upgradeSystem?.stats.goldBonus || 0)) * goldMult)
        this.onGoldEarned?.(gold)
        this.onXpEarned?.(enemy.stats.xpReward)
        enemy.triggerDeath()
        this.dyingEnemies.push(enemy)
      }
    })

    // Enemy projectiles vs player
    this.collision.checkEnemyProjectilesVsPlayer(this.projectiles, this.player).forEach(p => {
      const hitAngle = Math.atan2(p.vy, p.vx)
      const prevHp = this.player.stats.hp
      this.player.takeDamage(p.damage, hitAngle)
      if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
      this.onEffect?.('impact', this.player.x, this.player.y, null)
      p.lifetime = 0
    })

    // Cleanup
    this.projectiles = this.projectiles.filter(p => {
      if (p.isExpired()) { this.stage.removeChild(p); return false }
      return true
    })
    this.enemies = this.enemies.filter(e => e.isAlive())
    this.dyingEnemies = this.dyingEnemies.filter(e => {
      e.tickDeath(dt)
      if (e._dyingTimer <= 0) { this.stage.removeChild(e); return false }
      return true
    })

    if (!this.player.isAlive()) {
      this.runOver = true
      this.onPlayerDeath?.()
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/systems/WaveSystem.js
git commit -m "feat: add WaveSystem with time-based wave stacking and castle breach detection"
```

---

## Task 6: WaveScene (combat)

The combat scene. Mirrors `CombatScene`'s structure but uses `WaveSystem`, adds a castle HP bar, and returns to `BattlefieldScene` (not `MapScene`) on end.

**Files:**
- Create: `mobile/src/scenes/WaveScene.js`

- [ ] **Step 1: Create the file**

```js
import { Container, Graphics, Text, Assets, NineSliceSprite } from 'pixi.js'
import { VFXLayer } from '../vfx/VFXLayer.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'
import { inputManager } from '../core/InputManager.js'
import { BIOMES, TOTAL_WAVES } from '../data/biomes.js'
import { Mage } from '../entities/player/Mage.js'
import { Tank } from '../entities/player/Tank.js'
import { UpgradeSystem } from '../systems/UpgradeSystem.js'
import { WaveSystem } from '../systems/WaveSystem.js'
import { HealthBar } from '../ui/HealthBar.js'
import { GoldDisplay } from '../ui/GoldDisplay.js'
import { XpBar } from '../ui/XpBar.js'
import { fadeToScene } from '../core/transition.js'
import { xpForLevel } from '../data/upgrades.js'

const ARENA = { x: 0, y: 76, w: 450, h: 524 }
const CASTLE_Y = 464
const CASTLE_H = 56
const PLAYER_SPAWN = { x: 225, y: 280 }
const CASTLE_MAX_HP = 300

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
    this._castleHp = CASTLE_MAX_HP
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

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(biome.colors.floor)
    this.addChild(bg)

    const arena = new Graphics()
    arena.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h).fill(biome.colors.arena)
    this.addChild(arena)

    const border = new Graphics()
    border.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h).stroke({ width: 2, color: biome.colors.border })
    this.addChild(border)

    this._stage = new Container()
    this._stage.x = ARENA.x
    this._stage.y = ARENA.y
    this.addChild(this._stage)

    this._buildBattlefield(biome)

    this._player.x = PLAYER_SPAWN.x
    this._player.y = PLAYER_SPAWN.y
    this._stage.addChild(this._player)

    this._trailGfx = new Graphics()
    this._stage.addChild(this._trailGfx)

    this._vfx = new VFXLayer()
    this.addChild(this._vfx)

    this._buildHUD()
    this._buildWaveSystem()
    this._startTicker()
  }

  _buildBattlefield(biome) {
    const g = new Graphics()
    g.rect(115, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })
    g.rect(265, 0, 70, CASTLE_Y).fill({ color: biome.colors.path, alpha: 0.5 })
    g.rect(50, CASTLE_Y, 350, CASTLE_H).fill(biome.colors.castle)
    g.rect(50, CASTLE_Y, 350, CASTLE_H).stroke({ width: 2, color: 0xC8A857 })
    this._stage.addChild(g)

    const castleLabel = new Text({ text: '🏰  CASTLE', style: { fill: 0xC8A857, fontSize: 14, fontWeight: 'bold' } })
    castleLabel.anchor.set(0.5)
    castleLabel.x = 225
    castleLabel.y = CASTLE_Y + 20
    this._stage.addChild(castleLabel)

    // Enemy spawn zone indicator (subtle)
    const spawnG = new Graphics()
    spawnG.rect(0, 0, 450, 8).fill({ color: 0xEF4444, alpha: 0.15 })
    this._stage.addChild(spawnG)
  }

  _buildHUD() {
    const hudPanelTex = Assets.get('ui_panel_fill')
    const hudBorderTex = Assets.get('ui_panel_border')

    if (hudPanelTex) {
      const hudFill = new NineSliceSprite({ texture: hudPanelTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
      hudFill.width = 450; hudFill.height = 76; hudFill.tint = 0x0a0f1a
      this.addChild(hudFill)
      if (hudBorderTex) {
        const hudBorder = new NineSliceSprite({ texture: hudBorderTex, leftWidth: 10, topHeight: 10, rightWidth: 10, bottomHeight: 10 })
        hudBorder.width = 450; hudBorder.height = 76; hudBorder.tint = 0x6B7280
        this.addChild(hudBorder)
      }
    }

    // Wave counter (top left)
    this._waveText = new Text({ text: 'Wave 0 / 15', style: { fill: 0xF5DEB3, fontSize: 13 } })
    this._waveText.x = 8; this._waveText.y = 8
    this.addChild(this._waveText)

    // Level text
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

    // Castle HP bar (bottom of arena)
    this._castleHpBar = new HealthBar(350, 12)
    this._castleHpBar.x = 50
    this._castleHpBar.y = 76 + CASTLE_Y + 4
    this.addChild(this._castleHpBar)
    this._castleHpBar.update(CASTLE_MAX_HP, CASTLE_MAX_HP)

    // Bottom HUD
    const bottomBg = new Graphics()
    bottomBg.rect(0, 600, 450, 200).fill(0x0a0f1a)
    this.addChild(bottomBg)

    this._joystickGfx = new Graphics()
    this.addChild(this._joystickGfx)
  }

  _buildWaveSystem() {
    this._waveSystem = new WaveSystem({
      player: this._player,
      upgradeSystem: this._upgradeSystem,
      stage: this._stage,
      onWaveAnnounce: (wave) => this._onWaveAnnounce(wave),
      onCastleDamage: (dmg) => this._onCastleDamage(dmg),
      onRunWon: () => this._onRunWon(),
      onPlayerDeath: () => this._onPlayerDeath(),
      onGoldEarned: (g) => this._onGoldEarned(g),
      onXpEarned: (xp) => this._onXpEarned(xp),
      onPlayerHurt: () => this._onPlayerHurt(),
      onEffect: (type, x, y, value) => {
        const vy = type === 'damage' ? ARENA.y + y - 28 : ARENA.y + y
        this._vfx.spawn(type, ARENA.x + x, vy, value)
      },
    })
  }

  _startTicker() {
    const { app } = sceneManager
    this._tickerFn = (ticker) => {
      if (this._paused) return
      const dt = ticker.deltaMS / 1000

      this._updatePlayer(dt)

      this._trailGfx.clear()
      this._waveSystem.projectiles.forEach(p => {
        p._trail.forEach((pos, i) => {
          const frac = (6 - i) / 6
          const alpha = frac * frac * 0.6
          const r = Math.max(0.5, p.radius * frac * 0.7)
          this._trailGfx.circle(pos.x, pos.y, r).fill({ color: p.color, alpha })
        })
      })

      this._vfx.tick(dt)
      this._waveSystem.tick(dt, this._player.x, this._player.y, this._getAimAngle())

      if (this._shakeTimer > 0) {
        this._shakeTimer -= dt
        const t = Math.max(0, this._shakeTimer / 0.3)
        const mag = this._shakeIntensity * t
        this._stage.x = ARENA.x + (Math.random() * 2 - 1) * mag
        this._stage.y = ARENA.y + (Math.random() * 2 - 1) * mag
        if (this._shakeTimer <= 0) { this._stage.x = ARENA.x; this._stage.y = ARENA.y }
      }

      this._healthBar.update(this._player.stats.hp, this._player.stats.maxHp)
      this._castleHpBar.update(this._castleHp, CASTLE_MAX_HP)
      this._goldDisplay.update(runState.goldEarned)
      this._waveText.text = `Wave ${this._waveSystem.currentWave} / ${TOTAL_WAVES}`
      this._drawJoystick()
    }
    app.ticker.add(this._tickerFn)
  }

  _updatePlayer(dt) {
    const move = inputManager.getMovement()
    const speed = this._player.stats.speed
    this._player.x = Math.max(16, Math.min(ARENA.w - 16, this._player.x + move.x * speed * dt))
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
    const mx = inputManager.mouseWorld.x - ARENA.x
    const my = inputManager.mouseWorld.y - ARENA.y
    return Math.atan2(my - this._player.y, mx - this._player.x)
  }

  _onWaveAnnounce(wave) {
    runState.currentWave = wave
    const waveMsg = wave === 5 || wave === 10 ? `⚔  ELITE WAVE ${wave}!` : `Wave ${wave}`
    const color = wave === 5 || wave === 10 ? 0x8B5CF6 : 0xF5DEB3
    const msg = new Text({ text: waveMsg, style: { fill: color, fontSize: 20, fontWeight: 'bold' } })
    msg.anchor.set(0.5); msg.x = 225; msg.y = 120
    this.addChild(msg)
    setTimeout(() => { if (msg.parent) msg.parent.removeChild(msg) }, 2500)
  }

  _onCastleDamage(dmg) {
    this._castleHp = runState.damageCastle(dmg)
    this._shakeTimer = 0.2

    const msg = new Text({ text: `-${dmg} CASTLE`, style: { fill: 0xEF4444, fontSize: 14 } })
    msg.anchor.set(0.5); msg.x = 225; msg.y = 76 + CASTLE_Y - 10
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
      this._vfx?.spawn('levelup', ARENA.x + this._player.x, ARENA.y + this._player.y, null)
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
    flash.rect(0, 0, 450, 800).fill({ color: won ? 0xF59E0B : 0xFFFFFF, alpha: 0.5 })
    this.addChild(flash)

    const msg = new Text({ text: message, style: { fill: won ? 0xF59E0B : 0xEF4444, fontSize: 32, fontWeight: 'bold' } })
    msg.anchor.set(0.5); msg.x = 225; msg.y = 380
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

- [ ] **Step 2: Commit**

```bash
git add mobile/src/scenes/WaveScene.js
git commit -m "feat: add WaveScene using WaveSystem with castle HP bar and wave announcements"
```

---

## Task 7: Wire the scene flow

Update 3 existing files to complete the new flow:
- `ClassSelectScene` → navigates to `BiomeSelectScene` (not `CombatScene`)
- `GameOverScene` → navigates to `BattlefieldScene` (not `MetaUpgradeScene`)
- `BossVictoryScene` → navigates to `BattlefieldScene` (not `MetaUpgradeScene`)

**Files:**
- Modify: `mobile/src/scenes/ClassSelectScene.js:208-222`
- Modify: `mobile/src/scenes/GameOverScene.js:37-54`
- Modify: `mobile/src/scenes/BossVictoryScene.js:42-50`

- [ ] **Step 1: Update `ClassSelectScene._selectClass`**

Replace the `_selectClass` method (lines 208–222):

```js
  _selectClass(classKey) {
    runState.reset()
    runState.selectedClass = classKey
    import('./BiomeSelectScene.js').then(({ BiomeSelectScene }) => {
      fadeToScene(sceneManager.app, () => sceneManager.go(new BiomeSelectScene()))
    }).catch(err => console.error('Failed to load BiomeSelectScene:', err))
  }
```

- [ ] **Step 2: Update `GameOverScene` stats + navigation**

Replace lines 37–54 of `GameOverScene.js`:

```js
    const stats = [
      `Wave reached: ${runState.currentWave} / 15`,
      `Gold earned: ${runState.goldEarned}`,
      runState.castleHp <= 0 ? 'Castle destroyed!' : 'Hero fell in battle',
    ]
    stats.forEach((s, i) => {
      const t = new Text({ text: s, style: { fill: 0x9CA3AF, fontSize: 20 } })
      t.anchor.set(0.5)
      t.x = 225
      t.y = 340 + i * 40
      this.addChild(t)
    })

    this.addChild(makeButton('TRY AGAIN', 125, 570, 200, 50, 0x7C3AED, () => {
      import('./BattlefieldScene.js').then(({ BattlefieldScene }) => sceneManager.go(new BattlefieldScene()))
        .catch(err => console.error('Failed to load BattlefieldScene:', err))
    }))
```

- [ ] **Step 3: Update `BossVictoryScene` navigation**

Replace the button `pointerup` handler in `BossVictoryScene.js` (line 44):

```js
    btn.on('pointerup', () => {
      import('./BattlefieldScene.js').then(({ BattlefieldScene }) => sceneManager.go(new BattlefieldScene()))
        .catch(err => console.error('Failed to load BattlefieldScene:', err))
    })
```

Also update `BossVictoryScene` stats (replace the stats array around line 19):

```js
    const stats = [
      `Waves cleared: ${TOTAL_WAVES} / ${TOTAL_WAVES}`,
      `Gold earned: ${runState.goldEarned}`,
      `Castle HP remaining: ${runState.castleHp}`,
    ]
```

Add the import at the top of `BossVictoryScene.js`:

```js
import { TOTAL_WAVES } from '../data/biomes.js'
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/scenes/ClassSelectScene.js mobile/src/scenes/GameOverScene.js mobile/src/scenes/BossVictoryScene.js
git commit -m "feat: wire new scene flow — ClassSelect→BiomeSelect→Battlefield→Wave→back"
```

---

## Task 8: Smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd mobile && npm run dev
```

Expected: Vite starts, no compile errors.

- [ ] **Step 2: Walk the full flow**

1. Login → ClassSelectScene: click Mage or Tank  
2. BiomeSelectScene loads: Forest card is clickable, Dungeon/Inferno show lock icon  
3. Click Forest → fade → BattlefieldScene  
4. Player spawns at center, WASD moves them, castle graphic visible at bottom  
5. Press START WAVE → fade → WaveScene  
6. Wave 1 announced, goblins spawn at top, walk toward player  
7. Player auto-attacks, enemies die, gold accumulates in HUD  
8. After 20s (or all enemies dead), Wave 2 spawns  
9. Wave counter in HUD increments  
10. If an enemy reaches bottom: castle HP bar decreases, red flash message  
11. Player death → "You have fallen!" → GameOverScene → TRY AGAIN → BattlefieldScene  
12. After wave 15 all cleared → "VICTORY!" → BossVictoryScene → BattlefieldScene  

- [ ] **Step 3: Commit clean state if any fixes were needed**

```bash
git add -p   # stage only relevant changes
git commit -m "fix: resolve issues found during smoke test"
```

---

## What Plan 2 adds

With Plan 1 complete, the core loop is playable but all waves spawn Goblins. Plan 2 adds:
- Full 7-enemy roster (Skeleton, Bone Archer, Dark Knight, Shadow Mage, Stone Troll, Wraith)
- Wave composition accumulation (enemies introduced per wave tier, old ones persist)
- Correct per-wave gold base values from the spec
- Elite marker waves (5, 10) spawn a boss-tier Goblin as a placeholder until Plan 5
