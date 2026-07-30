# Projecto Bover — Frontend Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete PixiJS v8 browser game client with scenes, entities, combat, and backend API integration.

**Architecture:** Scenes are PixiJS Containers managed by a singleton SceneManager; a singleton EventBus handles cross-scene messaging; pure-logic systems (MapSystem, UpgradeSystem) have no PixiJS dependency so they can be unit-tested in Node. Run state flows through a shared RunState module; all backend calls go through an API layer that reads the JWT from AuthState.

**Tech Stack:** PixiJS v8, Vite v5, Vitest v1, plain ES modules

**No git commands** — do not run git add, git commit, or any git command in this plan.

---

## File Structure

```
mobile/
├── src/
│   ├── core/
│   │   ├── EventBus.js         — singleton pub/sub
│   │   ├── SceneManager.js     — singleton, owns app.stage
│   │   ├── InputManager.js     — WASD + mouse + mobile joystick
│   │   ├── AssetLoader.js      — placeholder (returns colored rect descriptors)
│   │   ├── RunState.js         — mutable run state (gold, depth, class, etc.)
│   │   └── AuthState.js        — JWT + player profile, persisted to localStorage
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── MainMenuScene.js
│   │   ├── ClassSelectScene.js
│   │   ├── MapScene.js
│   │   ├── CombatScene.js
│   │   ├── UpgradeScene.js     — overlay, mounted inside CombatScene
│   │   ├── ChestScene.js
│   │   ├── GameOverScene.js
│   │   ├── BossVictoryScene.js
│   │   └── MetaUpgradeScene.js
│   ├── entities/
│   │   ├── player/
│   │   │   ├── BasePlayer.js
│   │   │   ├── Mage.js
│   │   │   └── Tank.js
│   │   ├── enemies/
│   │   │   ├── BaseEnemy.js
│   │   │   └── Goblin.js
│   │   └── Projectile.js
│   ├── systems/
│   │   ├── MapSystem.js        — pure JS, no pixi.js import
│   │   ├── UpgradeSystem.js    — pure JS, no pixi.js import
│   │   ├── CombatSystem.js
│   │   └── CollisionSystem.js
│   ├── ui/
│   │   ├── HealthBar.js
│   │   ├── GoldDisplay.js
│   │   ├── UpgradeCard.js
│   │   └── MapNode.js
│   ├── data/
│   │   ├── classes.js
│   │   ├── upgrades.js
│   │   ├── enemies.js
│   │   └── items.js
│   ├── api/
│   │   ├── player.api.js
│   │   └── run.api.js
│   └── main.js
├── tests/
│   ├── data.test.js
│   ├── mapSystem.test.js
│   └── upgradeSystem.test.js
├── index.html
├── vite.config.js
└── package.json
```

---

### Task 1: Project Setup

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/vite.config.js`
- Create: `mobile/index.html`
- Create: `mobile/src/main.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "projecto-bover-mobile",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "pixi.js": "^8.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Projecto Bover</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
    #game canvas { display: block; }
  </style>
</head>
<body>
  <div id="game"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create src/main.js stub**

```js
import { Application } from 'pixi.js'

const app = new Application()
await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a2e,
})
document.getElementById('game').appendChild(app.canvas)
```

- [ ] **Step 5: Install dependencies and verify dev server starts**

Run from `mobile/`:
```
npm install
npm run dev
```

Expected: Vite prints a local URL, browser shows a black canvas. No console errors.

- [ ] **Step 6: Verify tests run (empty suite is fine)**

Run:
```
npm test
```

Expected: `No test files found` or 0 tests, exit 0.

---

### Task 2: Core Engine + InputManager

**Files:**
- Create: `mobile/src/core/EventBus.js`
- Create: `mobile/src/core/SceneManager.js`
- Create: `mobile/src/core/RunState.js`
- Create: `mobile/src/core/AuthState.js`
- Create: `mobile/src/core/InputManager.js`
- Modify: `mobile/src/main.js`

- [ ] **Step 1: Create EventBus.js**

```js
class EventBus {
  constructor() {
    this._listeners = {}
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
  }

  off(event, fn) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter(l => l !== fn)
  }

  emit(event, data) {
    if (!this._listeners[event]) return
    this._listeners[event].forEach(fn => fn(data))
  }
}

export const eventBus = new EventBus()
```

- [ ] **Step 2: Create SceneManager.js**

```js
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
```

- [ ] **Step 3: Create RunState.js**

```js
export const runState = {
  selectedClass: null,
  goldEarned: 0,
  roomsCleared: 0,
  depthReached: 0,
  bossDefeated: false,

  reset() {
    this.selectedClass = null
    this.goldEarned = 0
    this.roomsCleared = 0
    this.depthReached = 0
    this.bossDefeated = false
  },

  addGold(amount) {
    this.goldEarned += amount
  },
}
```

- [ ] **Step 4: Create AuthState.js**

```js
const TOKEN_KEY = 'pb_token'

class AuthState {
  constructor() {
    this.token = null
    this.player = null // { id, username, gold, meta_upgrades }
  }

  setAuth(token, player) {
    this.token = token
    this.player = player
    localStorage.setItem(TOKEN_KEY, token)
  }

  loadFromStorage() {
    this.token = localStorage.getItem(TOKEN_KEY)
  }

  clear() {
    this.token = null
    this.player = null
    localStorage.removeItem(TOKEN_KEY)
  }

  isLoggedIn() {
    return !!this.token
  }
}

export const authState = new AuthState()
```

- [ ] **Step 5: Create InputManager.js**

```js
class InputManager {
  constructor() {
    this.keys = {}
    this.mouseWorld = { x: 0, y: 0 }
    this.isMobile = navigator.maxTouchPoints > 0
    this._joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 }
  }

  init(canvas) {
    window.addEventListener('keydown', e => { this.keys[e.code] = true })
    window.addEventListener('keyup', e => { this.keys[e.code] = false })
    canvas.addEventListener('pointermove', e => {
      const rect = canvas.getBoundingClientRect()
      this.mouseWorld.x = e.clientX - rect.left
      this.mouseWorld.y = e.clientY - rect.top
      if (this.isMobile && this._joystick.active) this._updateJoystick(e)
    })
    if (this.isMobile) {
      canvas.addEventListener('pointerdown', e => {
        if (e.clientX < canvas.clientWidth / 2) {
          this._joystick.active = true
          this._joystick.startX = e.clientX
          this._joystick.startY = e.clientY
        }
      })
      canvas.addEventListener('pointerup', () => {
        this._joystick.active = false
        this._joystick.dx = 0
        this._joystick.dy = 0
      })
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
  }

  // Returns { x, y } normalized -1..1
  getMovement() {
    if (this.isMobile) {
      return { x: this._joystick.dx, y: this._joystick.dy }
    }
    let x = 0
    let y = 0
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1
    const len = Math.sqrt(x * x + y * y)
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 }
  }

  isMoving() {
    const m = this.getMovement()
    return m.x !== 0 || m.y !== 0
  }
}

export const inputManager = new InputManager()
```

- [ ] **Step 6: Wire up main.js**

Replace `mobile/src/main.js` with:

```js
import { Application } from 'pixi.js'
import { sceneManager } from './core/SceneManager.js'
import { inputManager } from './core/InputManager.js'
import { authState } from './core/AuthState.js'

const app = new Application()
await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a2e,
  antialias: false,
})
document.getElementById('game').appendChild(app.canvas)

authState.loadFromStorage()
inputManager.init(app.canvas)
sceneManager.init(app)

// BootScene wired in Task 7
console.log('Engine ready. Screen:', app.screen.width, 'x', app.screen.height)
```

- [ ] **Step 7: Verify dev server still starts with no errors**

Run: `npm run dev`

Expected: Black canvas, console prints `Engine ready. Screen: 800 x 600`.

---

### Task 3: Data Files

**Files:**
- Create: `mobile/src/data/classes.js`
- Create: `mobile/src/data/upgrades.js`
- Create: `mobile/src/data/enemies.js`
- Create: `mobile/src/data/items.js`
- Create: `mobile/tests/data.test.js`

- [ ] **Step 1: Create classes.js**

```js
export const CLASSES = {
  mage: {
    id: 'mage',
    name: 'Mage',
    hp: 80,
    speed: 180,
    defense: 5,
    attackSpeed: 0.4,   // seconds between shots
    damage: 25,
    color: 0x8B5CF6,    // purple placeholder
    attackType: 'ranged',
  },
  tank: {
    id: 'tank',
    name: 'Tank',
    hp: 160,
    speed: 90,
    defense: 20,
    attackSpeed: 1.0,
    damage: 35,
    color: 0x6B7280,    // gray placeholder
    attackType: 'melee',
  },
}
```

- [ ] **Step 2: Create upgrades.js**

```js
// Mid-run level-up cards — class-specific
export const UPGRADE_POOL = {
  mage: [
    { key: 'extra_projectile', label: 'Extra Projectile', description: 'Fire an additional projectile' },
    { key: 'burn', label: 'Burn', description: 'Projectiles apply 5 DPS burn for 2s' },
    { key: 'frost_slow', label: 'Frost Slow', description: 'Slow enemies 30% on hit' },
    { key: 'blink', label: 'Blink', description: 'Dash 100px in move direction (2s cooldown)' },
    { key: 'chain_lightning', label: 'Chain Lightning', description: 'Projectiles jump to 1 extra enemy' },
    { key: 'mana_shield', label: 'Mana Shield', description: 'Block first hit taken per room' },
  ],
  tank: [
    { key: 'iron_skin', label: 'Iron Skin', description: '+15 defense' },
    { key: 'counter_strike', label: 'Counter Strike', description: 'Reflect 10% of damage taken' },
    { key: 'lifesteal', label: 'Lifesteal', description: 'Heal 10% of damage dealt' },
    { key: 'taunt', label: 'Taunt', description: 'Pull all enemies 80px closer' },
    { key: 'stun_strike', label: 'Stun Strike', description: 'Attacks stun for 0.5s' },
    { key: 'battle_rush', label: 'Battle Rush', description: '+20% speed for 3s after a kill' },
  ],
}

export const BASE_XP = 100

// XP needed to reach level n from level n-1
export function xpForLevel(level) {
  return Math.floor(BASE_XP * (1 + level * 0.3))
}
```

- [ ] **Step 3: Create enemies.js**

```js
export const ENEMY_TYPES = {
  goblin: {
    key: 'goblin',
    name: 'Goblin',
    hp: 30,
    speed: 60,
    damage: 8,
    xpReward: 15,
    goldMin: 5,
    goldMax: 10,
    color: 0x22C55E,
    size: 20,
    behavior: 'melee_chase',
    minDepth: 1,
  },
  skeleton_archer: {
    key: 'skeleton_archer',
    name: 'Skeleton Archer',
    hp: 45,
    speed: 0,
    damage: 12,
    xpReward: 20,
    goldMin: 5,
    goldMax: 10,
    color: 0xF5F5DC,
    size: 20,
    behavior: 'ranged_stationary',
    minDepth: 3,
  },
  dark_knight: {
    key: 'dark_knight',
    name: 'Dark Knight',
    hp: 80,
    speed: 50,
    damage: 20,
    xpReward: 30,
    goldMin: 5,
    goldMax: 10,
    color: 0x1E1B4B,
    size: 24,
    behavior: 'melee_knockback',
    minDepth: 4,
  },
  shadow_mage: {
    key: 'shadow_mage',
    name: 'Shadow Mage',
    hp: 60,
    speed: 70,
    damage: 16,
    xpReward: 35,
    goldMin: 5,
    goldMax: 10,
    color: 0x7C3AED,
    size: 20,
    behavior: 'ranged_mobile',
    minDepth: 5,
  },
}

export function difficultyMultiplier(depth) {
  if (depth >= 7) return depth === 8 ? 2.5 : 2.0
  return 1 + (depth - 1) * 0.15
}

export function speedMultiplier(depth) {
  return 1 + (depth - 1) * 0.08
}

export function waveCount(depth) {
  if (depth <= 2) return 1
  if (depth <= 5) return 2
  return 3
}

export function enemyCountForWave(depth) {
  if (depth <= 2) return { min: 3, max: 4 }
  if (depth <= 5) return { min: 4, max: 6 }
  return { min: 5, max: 8 }
}

// Returns enemy types available at a given depth
export function enemiesForDepth(depth) {
  return Object.values(ENEMY_TYPES).filter(e => e.minDepth <= depth)
}
```

- [ ] **Step 4: Create items.js**

```js
// Chest room items — class-agnostic
export const ITEMS = {
  attack: [
    { key: 'shadow_blade', label: 'Shadow Blade', description: '+20% damage' },
    { key: 'cursed_dagger', label: 'Cursed Dagger', description: '+15% attack speed' },
    { key: 'storm_rune', label: 'Storm Rune', description: 'Chain hit to 1 extra enemy' },
    { key: 'gold_idol', label: 'Gold Idol', description: '+3 gold per enemy kill' },
  ],
  defense: [
    { key: 'amulet_of_thorns', label: 'Amulet of Thorns', description: 'Reflect 15 damage on hit' },
    { key: 'healing_flask', label: 'Healing Flask', description: 'Restore 30 HP immediately' },
    { key: 'ward_stone', label: 'Ward Stone', description: '+20 max HP' },
    { key: 'eternal_bandage', label: 'Eternal Bandage', description: 'Regen 2 HP per second' },
  ],
  utility: [
    { key: 'swiftboots', label: 'Swiftboots', description: '+15% movement speed' },
    { key: 'ancient_tome', label: 'Ancient Tome', description: 'Next level-up shows 4 choices' },
  ],
}

export function allItems() {
  return [...ITEMS.attack, ...ITEMS.defense, ...ITEMS.utility]
}
```

- [ ] **Step 5: Write the failing tests**

Create `mobile/tests/data.test.js`:

```js
import { CLASSES } from '../src/data/classes.js'
import { UPGRADE_POOL, xpForLevel } from '../src/data/upgrades.js'
import { ENEMY_TYPES, difficultyMultiplier, speedMultiplier, waveCount, enemiesForDepth } from '../src/data/enemies.js'
import { ITEMS, allItems } from '../src/data/items.js'

describe('CLASSES', () => {
  test('mage and tank are defined', () => {
    expect(CLASSES.mage).toBeDefined()
    expect(CLASSES.tank).toBeDefined()
  })

  test('mage has lower hp than tank', () => {
    expect(CLASSES.mage.hp).toBeLessThan(CLASSES.tank.hp)
  })

  test('mage has higher speed than tank', () => {
    expect(CLASSES.mage.speed).toBeGreaterThan(CLASSES.tank.speed)
  })
})

describe('xpForLevel', () => {
  test('level 1 requires base XP', () => {
    expect(xpForLevel(1)).toBe(130) // 100 * (1 + 1*0.3)
  })

  test('xp increases each level', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
    expect(xpForLevel(5)).toBeGreaterThan(xpForLevel(3))
  })
})

describe('UPGRADE_POOL', () => {
  test('mage has 6 upgrades', () => {
    expect(UPGRADE_POOL.mage).toHaveLength(6)
  })

  test('tank has 6 upgrades', () => {
    expect(UPGRADE_POOL.tank).toHaveLength(6)
  })

  test('every upgrade has key, label, description', () => {
    [...UPGRADE_POOL.mage, ...UPGRADE_POOL.tank].forEach(u => {
      expect(u.key).toBeTruthy()
      expect(u.label).toBeTruthy()
      expect(u.description).toBeTruthy()
    })
  })
})

describe('difficulty scaling', () => {
  test('depth 1 multiplier is 1.0', () => {
    expect(difficultyMultiplier(1)).toBe(1.0)
  })

  test('depth 8 multiplier is 2.5', () => {
    expect(difficultyMultiplier(8)).toBe(2.5)
  })

  test('depth 7 multiplier is 2.0', () => {
    expect(difficultyMultiplier(7)).toBe(2.0)
  })

  test('multiplier increases with depth', () => {
    for (let d = 1; d < 6; d++) {
      expect(difficultyMultiplier(d + 1)).toBeGreaterThan(difficultyMultiplier(d))
    }
  })

  test('waveCount is 1 at depth 1', () => {
    expect(waveCount(1)).toBe(1)
  })

  test('waveCount is 3 at depth 6', () => {
    expect(waveCount(6)).toBe(3)
  })
})

describe('enemiesForDepth', () => {
  test('only goblin available at depth 1', () => {
    const available = enemiesForDepth(1)
    expect(available).toHaveLength(1)
    expect(available[0].key).toBe('goblin')
  })

  test('goblin and skeleton_archer available at depth 3', () => {
    const keys = enemiesForDepth(3).map(e => e.key)
    expect(keys).toContain('goblin')
    expect(keys).toContain('skeleton_archer')
  })

  test('all 4 enemy types available at depth 5', () => {
    expect(enemiesForDepth(5)).toHaveLength(4)
  })
})

describe('ITEMS', () => {
  test('allItems returns all items across categories', () => {
    const items = allItems()
    expect(items.length).toBe(10)
  })

  test('every item has key, label, description', () => {
    allItems().forEach(i => {
      expect(i.key).toBeTruthy()
      expect(i.label).toBeTruthy()
      expect(i.description).toBeTruthy()
    })
  })
})
```

- [ ] **Step 6: Run tests — expect failure**

Run: `npm test`

Expected: Fails because test file doesn't match yet or imports fail. (If vitest can't resolve pixi.js in node env, that's expected — data files have no pixi.js imports so should import fine.)

- [ ] **Step 7: Run tests — expect all pass**

After creating all 4 data files, run: `npm test`

Expected: All tests pass. (If any fail, fix the data file values to match.)

---

### Task 4: MapSystem

**Files:**
- Create: `mobile/src/systems/MapSystem.js`
- Create: `mobile/tests/mapSystem.test.js`

The map is a connected graph: 8 nodes across 4 depth layers (2 nodes per layer). One node at depth 6 connects to the elite node (depth 7); the rest connect only among layers 1-6. Fog hides unvisited nodes. Player can backtrack through cleared nodes.

- [ ] **Step 1: Write the failing test**

Create `mobile/tests/mapSystem.test.js`:

```js
import { generateMap, getReachableNodes, getNodeType } from '../src/systems/MapSystem.js'

describe('generateMap', () => {
  test('returns 10 nodes total (8 regular + elite + boss)', () => {
    const { nodes } = generateMap(42)
    expect(nodes.size).toBe(10)
  })

  test('exactly one elite node', () => {
    const { nodes } = generateMap(42)
    const elites = [...nodes.values()].filter(n => n.type === 'elite')
    expect(elites).toHaveLength(1)
  })

  test('exactly one boss node', () => {
    const { nodes } = generateMap(42)
    const bosses = [...nodes.values()].filter(n => n.type === 'boss')
    expect(bosses).toHaveLength(1)
  })

  test('boss is only reachable through elite', () => {
    const { nodes } = generateMap(42)
    const boss = [...nodes.values()].find(n => n.type === 'boss')
    const bossConnections = boss.connections
    const allNonElite = [...nodes.values()].filter(n => n.type !== 'elite').map(n => n.id)
    bossConnections.forEach(connId => {
      const conn = nodes.get(connId)
      expect(conn.type).toBe('elite')
    })
  })

  test('start node is at depth 1', () => {
    const { nodes, startNodeId } = generateMap(42)
    expect(nodes.get(startNodeId).depth).toBe(1)
  })

  test('all nodes have id, type, depth, connections', () => {
    const { nodes } = generateMap(42)
    nodes.forEach(node => {
      expect(node.id).toBeTruthy()
      expect(node.type).toBeDefined()
      expect(node.depth).toBeGreaterThan(0)
      expect(Array.isArray(node.connections)).toBe(true)
    })
  })
})

describe('getReachableNodes', () => {
  test('only start node reachable at run start', () => {
    const { nodes, startNodeId } = generateMap(1)
    const reachable = getReachableNodes(nodes, null, new Set())
    expect(reachable).toContain(startNodeId)
  })

  test('clearing a node exposes its neighbors', () => {
    const { nodes, startNodeId } = generateMap(1)
    const cleared = new Set([startNodeId])
    const reachable = getReachableNodes(nodes, startNodeId, cleared)
    const startNode = nodes.get(startNodeId)
    startNode.connections.forEach(id => {
      expect(reachable).toContain(id)
    })
  })
})
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm test tests/mapSystem.test.js`

Expected: `Cannot find module '../src/systems/MapSystem.js'`

- [ ] **Step 3: Implement MapSystem.js**

```js
// No pixi.js import — pure data logic

const NODE_TYPES_BY_DEPTH = {
  1: () => 'combat',
  2: () => 'combat',
  3: (rng) => rng() < 0.7 ? 'combat' : 'chest',
  4: (rng) => rng() < 0.7 ? 'combat' : 'chest',
  5: (rng) => { const r = rng(); return r < 0.5 ? 'combat' : r < 0.8 ? 'chest' : 'elite_candidate' },
  6: (rng) => { const r = rng(); return r < 0.5 ? 'combat' : r < 0.8 ? 'chest' : 'elite_candidate' },
}

function seededRng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

export function generateMap(seed = Date.now()) {
  const rng = seededRng(seed)
  const nodes = new Map()
  let idCounter = 1

  const makeId = () => `node_${idCounter++}`

  // 2 nodes per depth layer 1-6, then 1 elite (depth 7), 1 boss (depth 8) = 14 nodes
  // Simplified: 8 regular nodes + elite + boss = 10 total
  // Layout: layers 1-4 each have 2 nodes (depths 1,2,3,4,5,6 → we use 3 layers of 2 + 2 terminal)
  // Actual: depth 1: 2 nodes, depth 2: 2 nodes, depth 3: 2 nodes, depth 4: 2 nodes, depth 7: 1, depth 8: 1 = 10

  const layers = [1, 2, 3, 4]
  const layerNodes = {}

  layers.forEach(layer => {
    layerNodes[layer] = [makeId(), makeId()]
    layerNodes[layer].forEach(id => {
      const depth = layer * 1.5 < 5 ? layer : layer + 1
      const depthActual = layer <= 2 ? layer : layer + 1
      nodes.set(id, {
        id,
        depth: depthActual,
        type: NODE_TYPES_BY_DEPTH[depthActual] ? NODE_TYPES_BY_DEPTH[depthActual](rng) : 'combat',
        connections: [],
        visited: false,
        cleared: false,
      })
    })
  })

  // Fix up: layers map to depths 1,2,4,6 (to give room for 7 and 8)
  const depthMap = { 1: 1, 2: 2, 3: 4, 4: 6 }
  layers.forEach(layer => {
    layerNodes[layer].forEach(id => {
      const node = nodes.get(id)
      node.depth = depthMap[layer]
      const depthKey = node.depth
      node.type = NODE_TYPES_BY_DEPTH[depthKey] ? NODE_TYPES_BY_DEPTH[depthKey](rng) : 'combat'
    })
  })

  // Elite (depth 7) and boss (depth 8)
  const eliteId = makeId()
  const bossId = makeId()
  nodes.set(eliteId, { id: eliteId, depth: 7, type: 'elite', connections: [bossId], visited: false, cleared: false })
  nodes.set(bossId, { id: bossId, depth: 8, type: 'boss', connections: [], visited: false, cleared: false })

  // Connect layers: each node connects to 1-2 nodes in next layer
  const connectLayers = (fromLayer, toLayer) => {
    const from = layerNodes[fromLayer]
    const to = layerNodes[toLayer]
    // Each "from" node connects to at least 1 "to" node
    from.forEach(fid => {
      const target = pickRandom(to, rng)
      nodes.get(fid).connections.push(target)
      nodes.get(target).connections.push(fid)
    })
    // Ensure each "to" node has at least 1 connection back
    to.forEach(tid => {
      if (!nodes.get(tid).connections.some(c => from.includes(c))) {
        const source = pickRandom(from, rng)
        nodes.get(tid).connections.push(source)
        nodes.get(source).connections.push(tid)
      }
    })
  }

  connectLayers(1, 2)
  connectLayers(2, 3)
  connectLayers(3, 4)

  // One node from layer 4 connects to elite (hidden path)
  const eliteGate = pickRandom(layerNodes[4], rng)
  nodes.get(eliteGate).connections.push(eliteId)
  nodes.get(eliteId).connections.push(eliteGate)

  // Deduplicate connections
  nodes.forEach(node => {
    node.connections = [...new Set(node.connections)]
  })

  const startNodeId = layerNodes[1][0]
  return { nodes, startNodeId }
}

export function getReachableNodes(nodes, currentNodeId, clearedIds) {
  const reachable = new Set()

  if (!currentNodeId) {
    // Start of run: only show the two starting nodes
    nodes.forEach((node, id) => {
      if (node.depth === 1) reachable.add(id)
    })
    return reachable
  }

  // Any cleared node is reachable (backtracking)
  clearedIds.forEach(id => reachable.add(id))

  // Neighbors of cleared nodes are reachable
  clearedIds.forEach(id => {
    const node = nodes.get(id)
    node.connections.forEach(connId => reachable.add(connId))
  })

  // Also include neighbors of current node
  const current = nodes.get(currentNodeId)
  if (current) current.connections.forEach(connId => reachable.add(connId))

  return reachable
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `npm test tests/mapSystem.test.js`

Expected: All tests pass.

---

### Task 5: UpgradeSystem

**Files:**
- Create: `mobile/src/systems/UpgradeSystem.js`
- Create: `mobile/tests/upgradeSystem.test.js`

- [ ] **Step 1: Write the failing test**

Create `mobile/tests/upgradeSystem.test.js`:

```js
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js'

const baseMageStats = () => ({
  hp: 80, maxHp: 80, speed: 180, defense: 5,
  damage: 25, attackSpeed: 0.4, extraProjectiles: 0,
  goldBonus: 0, classKey: 'mage',
})

describe('UpgradeSystem', () => {
  test('pickRandomUpgrades returns 3 unique keys', () => {
    const sys = new UpgradeSystem(baseMageStats())
    const picks = sys.pickRandomUpgrades('mage', 3)
    expect(picks).toHaveLength(3)
    const keys = picks.map(u => u.key)
    expect(new Set(keys).size).toBe(3)
  })

  test('pickRandomUpgrades does not return already-applied upgrades', () => {
    const sys = new UpgradeSystem(baseMageStats())
    sys.applyUpgrade('extra_projectile')
    const picks = sys.pickRandomUpgrades('mage', 3)
    expect(picks.map(u => u.key)).not.toContain('extra_projectile')
  })

  test('iron_skin increases defense by 15', () => {
    const stats = { ...baseMageStats(), classKey: 'tank', defense: 20 }
    const sys = new UpgradeSystem(stats)
    sys.applyUpgrade('iron_skin')
    expect(sys.stats.defense).toBe(35)
  })

  test('applyItem shadow_blade increases damage by 20%', () => {
    const sys = new UpgradeSystem(baseMageStats())
    sys.applyItem('shadow_blade')
    expect(sys.stats.damage).toBeCloseTo(30)
  })

  test('applyItem ward_stone increases maxHp by 20', () => {
    const sys = new UpgradeSystem(baseMageStats())
    sys.applyItem('ward_stone')
    expect(sys.stats.maxHp).toBe(100)
  })

  test('applyItem swiftboots increases speed by 15%', () => {
    const sys = new UpgradeSystem(baseMageStats())
    sys.applyItem('swiftboots')
    expect(sys.stats.speed).toBeCloseTo(207)
  })

  test('pickRandomItems returns 3 unique items', () => {
    const sys = new UpgradeSystem(baseMageStats())
    const picks = sys.pickRandomItems(3)
    expect(picks).toHaveLength(3)
    expect(new Set(picks.map(i => i.key)).size).toBe(3)
  })
})
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm test tests/upgradeSystem.test.js`

Expected: `Cannot find module '../src/systems/UpgradeSystem.js'`

- [ ] **Step 3: Implement UpgradeSystem.js**

```js
// No pixi.js import — pure logic
import { UPGRADE_POOL } from '../data/upgrades.js'
import { allItems } from '../data/items.js'

function seededShuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function rng() {
  return Math.random()
}

export class UpgradeSystem {
  constructor(stats) {
    this.stats = { ...stats }
    this.appliedUpgrades = new Set()
    this.appliedItems = []
  }

  applyUpgrade(key) {
    if (this.appliedUpgrades.has(key)) return
    this.appliedUpgrades.add(key)
    const effects = {
      extra_projectile: s => { s.extraProjectiles = (s.extraProjectiles || 0) + 1 },
      iron_skin: s => { s.defense += 15 },
      counter_strike: s => { s.counterStrike = true },
      lifesteal: s => { s.lifesteal = true },
      taunt: s => { s.taunt = true },
      stun_strike: s => { s.stunStrike = true },
      battle_rush: s => { s.battleRush = true },
      burn: s => { s.burn = true },
      frost_slow: s => { s.frostSlow = true },
      blink: s => { s.blink = true },
      chain_lightning: s => { s.chainLightning = true },
      mana_shield: s => { s.manaShield = true },
    }
    if (effects[key]) effects[key](this.stats)
  }

  applyItem(key) {
    this.appliedItems.push(key)
    const effects = {
      shadow_blade: s => { s.damage = Math.round(s.damage * 1.2) },
      cursed_dagger: s => { s.attackSpeed = parseFloat((s.attackSpeed * 0.85).toFixed(4)) },
      storm_rune: s => { s.chainHit = (s.chainHit || 0) + 1 },
      gold_idol: s => { s.goldBonus = (s.goldBonus || 0) + 3 },
      amulet_of_thorns: s => { s.thorns = (s.thorns || 0) + 15 },
      healing_flask: s => { s.hp = Math.min(s.maxHp, s.hp + 30) },
      ward_stone: s => { s.maxHp += 20; s.hp += 20 },
      eternal_bandage: s => { s.regenPerSec = (s.regenPerSec || 0) + 2 },
      swiftboots: s => { s.speed = Math.round(s.speed * 1.15) },
      ancient_tome: s => { s.extraUpgradeChoice = true },
    }
    if (effects[key]) effects[key](this.stats)
  }

  pickRandomUpgrades(classKey, count = 3) {
    const pool = UPGRADE_POOL[classKey] || []
    const available = pool.filter(u => !this.appliedUpgrades.has(u.key))
    return seededShuffle(available, Math.random).slice(0, count)
  }

  pickRandomItems(count = 3) {
    const available = allItems().filter(i => !this.appliedItems.includes(i.key))
    return seededShuffle(available, Math.random).slice(0, count)
  }
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `npm test`

Expected: All tests across all 3 test files pass.

---

### Task 6: AssetLoader + BootScene + MainMenuScene

**Files:**
- Create: `mobile/src/core/AssetLoader.js`
- Create: `mobile/src/scenes/BootScene.js`
- Create: `mobile/src/scenes/MainMenuScene.js`
- Modify: `mobile/src/main.js`

- [ ] **Step 1: Create AssetLoader.js**

All graphics are placeholder colored rectangles. AssetLoader returns a resolved promise immediately.

```js
export class AssetLoader {
  async load(onProgress) {
    // No real assets to load in prototype
    // Placeholder: simulate a brief load then resolve
    if (onProgress) onProgress(1.0)
    return {}
  }
}
```

- [ ] **Step 2: Create BootScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { AssetLoader } from '../core/AssetLoader.js'

export class BootScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x1a1a2e)
    this.addChild(bg)

    const label = new Text({ text: 'Loading...', style: { fill: 0xffffff, fontSize: 24 } })
    label.anchor.set(0.5)
    label.x = 400
    label.y = 300
    this.addChild(label)

    this._boot(label)
  }

  async _boot(label) {
    const loader = new AssetLoader()
    await loader.load(p => {
      label.text = `Loading... ${Math.round(p * 100)}%`
    })
    const { MainMenuScene } = await import('./MainMenuScene.js')
    sceneManager.go(new MainMenuScene())
  }
}
```

- [ ] **Step 3: Create MainMenuScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { authState } from '../core/AuthState.js'

function makeButton(label, x, y, w, h, color, onClick) {
  const c = new Container()
  const bg = new Graphics()
  bg.rect(0, 0, w, h).fill(color)
  c.addChild(bg)
  const t = new Text({ text: label, style: { fill: 0xffffff, fontSize: 18 } })
  t.anchor.set(0.5)
  t.x = w / 2
  t.y = h / 2
  c.addChild(t)
  c.x = x
  c.y = y
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.on('pointerup', onClick)
  return c
}

export class MainMenuScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x1a1a2e)
    this.addChild(bg)

    const title = new Text({ text: 'PROJECTO BOVER', style: { fill: 0xF59E0B, fontSize: 40, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 160
    this.addChild(title)

    const sub = new Text({ text: 'A Medieval Roguelite', style: { fill: 0x9CA3AF, fontSize: 18 } })
    sub.anchor.set(0.5)
    sub.x = 400
    sub.y = 210
    this.addChild(sub)

    this._buildButtons()
  }

  _buildButtons() {
    if (authState.isLoggedIn()) {
      this.addChild(makeButton('PLAY', 300, 290, 200, 50, 0x059669, () => this._goPlay()))
      this.addChild(makeButton('LOGOUT', 300, 360, 200, 50, 0x6B7280, () => this._logout()))
    } else {
      this.addChild(makeButton('LOGIN', 220, 290, 160, 50, 0x2563EB, () => this._showLogin()))
      this.addChild(makeButton('REGISTER', 420, 290, 160, 50, 0x059669, () => this._showRegister()))
    }
  }

  _goPlay() {
    import('./ClassSelectScene.js').then(({ ClassSelectScene }) => {
      sceneManager.go(new ClassSelectScene())
    })
  }

  _logout() {
    authState.clear()
    sceneManager.go(new MainMenuScene())
  }

  _showLogin() {
    this._showAuthForm('LOGIN', async (email, password) => {
      const { login } = await import('../api/player.api.js')
      const data = await login(email, password)
      authState.setAuth(data.token, data.player)
      sceneManager.go(new MainMenuScene())
    })
  }

  _showRegister() {
    this._showAuthForm('REGISTER', async (email, password, username) => {
      const { register } = await import('../api/player.api.js')
      const data = await register(username, email, password)
      authState.setAuth(data.token, data.player)
      sceneManager.go(new MainMenuScene())
    })
  }

  _showAuthForm(mode, onSubmit) {
    // Overlay a simple HTML form since PixiJS text input is complex
    const form = document.createElement('div')
    form.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1f2937;padding:32px;border-radius:8px;z-index:10;display:flex;flex-direction:column;gap:12px;min-width:280px'
    const isRegister = mode === 'REGISTER'
    form.innerHTML = `
      <h2 style="color:#fff;margin:0">${mode}</h2>
      ${isRegister ? '<input id="pb-username" placeholder="Username" style="padding:8px;border-radius:4px;border:none"/>' : ''}
      <input id="pb-email" type="email" placeholder="Email" style="padding:8px;border-radius:4px;border:none"/>
      <input id="pb-password" type="password" placeholder="Password" style="padding:8px;border-radius:4px;border:none"/>
      <p id="pb-error" style="color:#EF4444;margin:0;font-size:14px"></p>
      <button id="pb-submit" style="padding:10px;background:#2563EB;color:#fff;border:none;border-radius:4px;cursor:pointer">${mode}</button>
      <button id="pb-cancel" style="padding:8px;background:#374151;color:#fff;border:none;border-radius:4px;cursor:pointer">Cancel</button>
    `
    document.body.appendChild(form)
    document.getElementById('pb-cancel').onclick = () => document.body.removeChild(form)
    document.getElementById('pb-submit').onclick = async () => {
      const email = document.getElementById('pb-email').value
      const password = document.getElementById('pb-password').value
      const username = isRegister ? document.getElementById('pb-username').value : undefined
      try {
        await onSubmit(email, password, username)
        document.body.removeChild(form)
      } catch (err) {
        document.getElementById('pb-error').textContent = err.message
      }
    }
  }
}
```

- [ ] **Step 4: Update main.js to boot into BootScene**

Replace `mobile/src/main.js`:

```js
import { Application } from 'pixi.js'
import { sceneManager } from './core/SceneManager.js'
import { inputManager } from './core/InputManager.js'
import { authState } from './core/AuthState.js'
import { BootScene } from './scenes/BootScene.js'

const app = new Application()
await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x1a1a2e,
  antialias: false,
})
document.getElementById('game').appendChild(app.canvas)

authState.loadFromStorage()
inputManager.init(app.canvas)
sceneManager.init(app)
sceneManager.go(new BootScene())
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`

Expected: Black canvas briefly shows "Loading... 100%", then transitions to the main menu with title "PROJECTO BOVER" and Login/Register buttons (or Play button if already logged in).

---

### Task 7: ClassSelectScene

**Files:**
- Create: `mobile/src/scenes/ClassSelectScene.js`

- [ ] **Step 1: Create ClassSelectScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { CLASSES } from '../data/classes.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'

function makeClassCard(classDef, x, y, onClick) {
  const c = new Container()

  const bg = new Graphics()
  bg.rect(0, 0, 200, 260).fill(0x1f2937)
  c.addChild(bg)

  const avatar = new Graphics()
  avatar.rect(60, 20, 80, 80).fill(classDef.color)
  c.addChild(avatar)

  const nameText = new Text({ text: classDef.name, style: { fill: 0xffffff, fontSize: 22, fontWeight: 'bold' } })
  nameText.anchor.set(0.5)
  nameText.x = 100
  nameText.y = 120
  c.addChild(nameText)

  const stats = [
    `HP: ${classDef.hp}`,
    `SPD: ${classDef.speed}`,
    `DEF: ${classDef.defense}`,
    `DMG: ${classDef.damage}`,
  ]
  stats.forEach((s, i) => {
    const t = new Text({ text: s, style: { fill: 0x9CA3AF, fontSize: 14 } })
    t.x = 20
    t.y = 148 + i * 20
    c.addChild(t)
  })

  const btn = new Graphics()
  btn.rect(20, 228, 160, 22).fill(0x2563EB)
  c.addChild(btn)
  const btnText = new Text({ text: 'SELECT', style: { fill: 0xffffff, fontSize: 14 } })
  btnText.anchor.set(0.5)
  btnText.x = 100
  btnText.y = 239
  c.addChild(btnText)

  c.x = x
  c.y = y
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.on('pointerup', onClick)
  return c
}

export class ClassSelectScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x111827)
    this.addChild(bg)

    const title = new Text({ text: 'Choose Your Class', style: { fill: 0xffffff, fontSize: 32 } })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 80
    this.addChild(title)

    // Meta upgrade gold display
    if (authState.player) {
      const gold = new Text({
        text: `Gold: ${authState.player.gold}`,
        style: { fill: 0xF59E0B, fontSize: 18 },
      })
      gold.x = 20
      gold.y = 20
      this.addChild(gold)
    }

    const classKeys = Object.keys(CLASSES)
    const totalWidth = classKeys.length * 200 + (classKeys.length - 1) * 40
    const startX = (800 - totalWidth) / 2

    classKeys.forEach((key, i) => {
      const classDef = CLASSES[key]
      const x = startX + i * 240
      const card = makeClassCard(classDef, x, 180, () => this._selectClass(key))
      this.addChild(card)
    })

    const backBtn = new Text({ text: '← Back', style: { fill: 0x9CA3AF, fontSize: 16 } })
    backBtn.x = 20
    backBtn.y = 560
    backBtn.eventMode = 'static'
    backBtn.cursor = 'pointer'
    backBtn.on('pointerup', () => {
      import('./MainMenuScene.js').then(({ MainMenuScene }) => sceneManager.go(new MainMenuScene()))
    })
    this.addChild(backBtn)
  }

  _selectClass(classKey) {
    runState.reset()
    runState.selectedClass = classKey
    import('./MapScene.js').then(({ MapScene }) => sceneManager.go(new MapScene()))
  }
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`, log in, click Play.

Expected: Class Select screen shows Mage and Tank cards with colored placeholders, stats, and Select buttons. Clicking a class card navigates to MapScene (shows blank/error until Task 8 is done — that's fine).

---

### Task 8: MapScene

**Files:**
- Create: `mobile/src/ui/MapNode.js`
- Create: `mobile/src/scenes/MapScene.js`

- [ ] **Step 1: Create ui/MapNode.js**

```js
import { Container, Graphics, Text } from 'pixi.js'

const TYPE_COLORS = {
  combat: 0xDC2626,
  chest: 0xF59E0B,
  elite: 0x7C3AED,
  boss: 0x991B1B,
}

const TYPE_LABELS = {
  combat: '⚔',
  chest: '▣',
  elite: '☠',
  boss: '♛',
}

export class MapNode extends Container {
  constructor(node, visited, reachable, onClick) {
    super()

    const color = !visited && !reachable ? 0x374151 : TYPE_COLORS[node.type] ?? 0x6B7280
    const alpha = !visited && !reachable ? 0.3 : 1

    const circle = new Graphics()
    circle.circle(0, 0, 24).fill(color)
    circle.alpha = alpha
    this.addChild(circle)

    if (visited || reachable) {
      const label = new Text({ text: TYPE_LABELS[node.type] ?? '?', style: { fill: 0xffffff, fontSize: 18 } })
      label.anchor.set(0.5)
      this.addChild(label)
    }

    if (node.cleared) {
      const check = new Graphics()
      check.circle(0, 0, 26).stroke({ width: 2, color: 0x22C55E })
      this.addChild(check)
    }

    if (reachable && !node.cleared) {
      this.eventMode = 'static'
      this.cursor = 'pointer'
      this.on('pointerup', () => onClick(node))
    }
  }
}
```

- [ ] **Step 2: Create MapScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { generateMap, getReachableNodes } from '../systems/MapSystem.js'
import { MapNode } from '../ui/MapNode.js'

const LAYOUT = {
  1: [{ x: 300, y: 500 }, { x: 500, y: 500 }],
  2: [{ x: 250, y: 390 }, { x: 550, y: 390 }],
  4: [{ x: 220, y: 280 }, { x: 580, y: 280 }],
  6: [{ x: 240, y: 170 }, { x: 560, y: 170 }],
  7: [{ x: 400, y: 80 }],
  8: [{ x: 400, y: 20 }],
}

export class MapScene extends Container {
  constructor() {
    super()
    this._mapData = generateMap(Date.now())
    this._clearedIds = new Set(runState._clearedNodeIds || [])
    this._currentNodeId = runState._currentNodeId || null
    this._nodePositions = new Map()

    this._build()
  }

  _build() {
    this.removeChildren()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x111827)
    this.addChild(bg)

    const title = new Text({ text: 'MAP', style: { fill: 0xffffff, fontSize: 20 } })
    title.x = 20
    title.y = 20
    this.addChild(title)

    const goldText = new Text({ text: `Gold: ${runState.goldEarned}`, style: { fill: 0xF59E0B, fontSize: 16 } })
    goldText.x = 680
    goldText.y = 20
    this.addChild(goldText)

    const { nodes, startNodeId } = this._mapData
    const reachable = getReachableNodes(nodes, this._currentNodeId, this._clearedIds)

    // Assign positions to nodes by depth
    const depthGroups = {}
    nodes.forEach((node, id) => {
      if (!depthGroups[node.depth]) depthGroups[node.depth] = []
      depthGroups[node.depth].push(id)
    })

    nodes.forEach((node, id) => {
      const depthLayout = LAYOUT[node.depth]
      if (!depthLayout) return
      const depthIds = depthGroups[node.depth]
      const idx = depthIds.indexOf(id)
      const pos = depthLayout[idx] || depthLayout[0]
      this._nodePositions.set(id, pos)
    })

    // Draw edges
    const edgeG = new Graphics()
    nodes.forEach((node, id) => {
      const fromPos = this._nodePositions.get(id)
      if (!fromPos) return
      node.connections.forEach(connId => {
        const toPos = this._nodePositions.get(connId)
        if (!toPos) return
        const visible = (reachable.has(id) || this._clearedIds.has(id)) &&
                        (reachable.has(connId) || this._clearedIds.has(connId))
        edgeG.moveTo(fromPos.x, fromPos.y)
          .lineTo(toPos.x, toPos.y)
          .stroke({ width: 2, color: visible ? 0x4B5563 : 0x1f2937 })
      })
    })
    this.addChild(edgeG)

    // Draw nodes
    nodes.forEach((node, id) => {
      const pos = this._nodePositions.get(id)
      if (!pos) return
      const visited = this._clearedIds.has(id) || id === this._currentNodeId
      const isReachable = reachable.has(id)
      const mapNode = new MapNode(node, visited, isReachable, (n) => this._enterNode(n))
      mapNode.x = pos.x
      mapNode.y = pos.y
      this.addChild(mapNode)
    })
  }

  _enterNode(node) {
    runState._currentNodeId = node.id
    runState._clearedNodeIds = [...this._clearedIds]
    runState._mapData = this._mapData

    if (node.type === 'chest') {
      import('./ChestScene.js').then(({ ChestScene }) => sceneManager.go(new ChestScene(node)))
    } else {
      import('./CombatScene.js').then(({ CombatScene }) => sceneManager.go(new CombatScene(node)))
    }
  }
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, start a run.

Expected: Map screen shows nodes as colored circles connected by lines. Reachable nodes are clickable. Fog nodes are dimmed. Clicking a node navigates to CombatScene or ChestScene (placeholder errors are expected until those scenes exist).

---

### Task 9: Player Entities

**Files:**
- Create: `mobile/src/entities/player/BasePlayer.js`
- Create: `mobile/src/entities/player/Mage.js`
- Create: `mobile/src/entities/player/Tank.js`

- [ ] **Step 1: Create BasePlayer.js**

```js
import { Container, Graphics } from 'pixi.js'
import { CLASSES } from '../../data/classes.js'

export class BasePlayer extends Container {
  constructor(classKey, metaUpgrades = []) {
    super()
    const def = CLASSES[classKey]
    if (!def) throw new Error(`Unknown class: ${classKey}`)

    // Apply meta upgrades to base stats
    this.stats = {
      classKey,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      defense: def.defense,
      damage: def.damage,
      attackSpeed: def.attackSpeed,
      extraProjectiles: 0,
      goldBonus: 0,
    }
    this._applyMeta(metaUpgrades)

    this.attackCooldown = 0
    this.invincible = false
    this._invincibleTimer = 0
    this._invincibleDuration = 0.8 // seconds of i-frames after hit

    // Placeholder graphic
    this._gfx = new Graphics()
    this._gfx.rect(-16, -24, 32, 32).fill(def.color)
    this.addChild(this._gfx)
  }

  _applyMeta(upgrades) {
    const bonuses = {
      vitality_1: () => { this.stats.hp += 10; this.stats.maxHp += 10 },
      vitality_2: () => { this.stats.hp += 20; this.stats.maxHp += 20 },
      vitality_3: () => { this.stats.hp += 30; this.stats.maxHp += 30 },
      power_1: () => { this.stats.damage = Math.round(this.stats.damage * 1.05) },
      power_2: () => { this.stats.damage = Math.round(this.stats.damage * 1.10) },
      power_3: () => { this.stats.damage = Math.round(this.stats.damage * 1.15) },
      swiftness_1: () => { this.stats.speed = Math.round(this.stats.speed * 1.05) },
      swiftness_2: () => { this.stats.speed = Math.round(this.stats.speed * 1.10) },
      gold_rush_1: () => { this.stats.goldBonus += 2 },
      gold_rush_2: () => { this.stats.goldBonus += 4 },
    }
    upgrades.forEach(key => { if (bonuses[key]) bonuses[key]() })
  }

  // Returns array of { x, y, angle, damage, speed } for each projectile to spawn
  // Subclasses override this
  getAttackData(targetAngle) {
    return []
  }

  takeDamage(amount) {
    if (this.invincible) return
    const dmg = Math.max(1, amount - this.stats.defense)
    this.stats.hp = Math.max(0, this.stats.hp - dmg)
    this.invincible = true
    this._invincibleTimer = this._invincibleDuration
    this.alpha = 0.5
  }

  tick(deltaSeconds) {
    if (this.attackCooldown > 0) this.attackCooldown -= deltaSeconds
    if (this.invincible) {
      this._invincibleTimer -= deltaSeconds
      if (this._invincibleTimer <= 0) {
        this.invincible = false
        this.alpha = 1
      }
    }
  }

  isAlive() {
    return this.stats.hp > 0
  }

  isAttackReady() {
    return this.attackCooldown <= 0
  }

  resetAttackCooldown() {
    this.attackCooldown = this.stats.attackSpeed
  }
}
```

- [ ] **Step 2: Create Mage.js**

```js
import { BasePlayer } from './BasePlayer.js'

export class Mage extends BasePlayer {
  constructor(metaUpgrades = []) {
    super('mage', metaUpgrades)
  }

  getAttackData(targetAngle) {
    const projectiles = []
    const count = 1 + (this.stats.extraProjectiles || 0)
    const spread = 0.18 // radians between extra projectiles
    for (let i = 0; i < count; i++) {
      const offset = (i - Math.floor(count / 2)) * spread
      projectiles.push({
        x: this.x,
        y: this.y,
        angle: targetAngle + offset,
        damage: this.stats.damage,
        speed: 320,
        color: 0x818CF8,
        radius: 6,
        burn: this.stats.burn,
        frostSlow: this.stats.frostSlow,
      })
    }
    return projectiles
  }
}
```

- [ ] **Step 3: Create Tank.js**

```js
import { BasePlayer } from './BasePlayer.js'
import { Graphics } from 'pixi.js'

export class Tank extends BasePlayer {
  constructor(metaUpgrades = []) {
    super('tank', metaUpgrades)
  }

  // Tank melee: returns a "swing" descriptor instead of a projectile
  getAttackData(targetAngle) {
    return [{
      x: this.x,
      y: this.y,
      angle: targetAngle,
      damage: this.stats.damage,
      speed: 0,           // not a traveling projectile
      color: 0xD1D5DB,
      radius: 48,         // melee arc radius
      isMelee: true,
      arcWidth: Math.PI * 0.8,
      stun: this.stats.stunStrike,
    }]
  }
}
```

---

### Task 10: Enemy + Projectile

**Files:**
- Create: `mobile/src/entities/enemies/BaseEnemy.js`
- Create: `mobile/src/entities/enemies/Goblin.js`
- Create: `mobile/src/entities/Projectile.js`

- [ ] **Step 1: Create BaseEnemy.js**

```js
import { Container, Graphics } from 'pixi.js'
import { ENEMY_TYPES, difficultyMultiplier, speedMultiplier } from '../../data/enemies.js'

export class BaseEnemy extends Container {
  constructor(typeKey, depth = 1) {
    super()
    const def = ENEMY_TYPES[typeKey]
    if (!def) throw new Error(`Unknown enemy type: ${typeKey}`)

    const dm = difficultyMultiplier(depth)
    const sm = speedMultiplier(depth)

    this.stats = {
      typeKey,
      hp: Math.round(def.hp * dm),
      maxHp: Math.round(def.hp * dm),
      speed: Math.round(def.speed * sm),
      damage: Math.round(def.damage * dm),
      xpReward: def.xpReward,
      goldMin: def.goldMin,
      goldMax: def.goldMax,
    }

    this.behavior = def.behavior
    this.attackCooldown = 0
    this.stunTimer = 0
    this._slowTimer = 0

    this._gfx = new Graphics()
    this._gfx.rect(-def.size / 2, -def.size / 2, def.size, def.size).fill(def.color)
    this.addChild(this._gfx)
  }

  isAlive() {
    return this.stats.hp > 0
  }

  takeDamage(amount) {
    this.stats.hp = Math.max(0, this.stats.hp - amount)
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration)
  }

  slow(duration) {
    this._slowTimer = Math.max(this._slowTimer, duration)
  }

  tick(deltaSeconds, playerX, playerY) {
    if (this.stunTimer > 0) {
      this.stunTimer -= deltaSeconds
      return
    }
    if (this._slowTimer > 0) this._slowTimer -= deltaSeconds
    if (this.attackCooldown > 0) this.attackCooldown -= deltaSeconds
    this._behaviorTick(deltaSeconds, playerX, playerY)
  }

  _behaviorTick(deltaSeconds, playerX, playerY) {
    // Subclasses override or base handles by behavior string
    const speed = this._slowTimer > 0 ? this.stats.speed * 0.5 : this.stats.speed
    if (this.behavior === 'melee_chase' || this.behavior === 'melee_knockback' || this.behavior === 'ranged_mobile') {
      const dx = playerX - this.x
      const dy = playerY - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 2) {
        this.x += (dx / dist) * speed * deltaSeconds
        this.y += (dy / dist) * speed * deltaSeconds
      }
    }
    // ranged_stationary: don't move
  }

  // Returns attack data if ready, null otherwise
  getAttack(playerX, playerY) {
    if (this.attackCooldown > 0 || this.stunTimer > 0) return null
    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const isRanged = this.behavior === 'ranged_stationary' || this.behavior === 'ranged_mobile'
    const meleeRange = 40
    if (!isRanged && dist > meleeRange) return null
    if (isRanged && dist > 300) return null
    this.attackCooldown = 1.5
    const angle = Math.atan2(dy, dx)
    return {
      x: this.x,
      y: this.y,
      angle,
      damage: this.stats.damage,
      speed: isRanged ? 180 : 0,
      color: 0xFF4444,
      radius: 5,
      isEnemyProjectile: true,
      isMelee: !isRanged,
    }
  }

  goldDrop() {
    return this.stats.goldMin + Math.floor(Math.random() * (this.stats.goldMax - this.stats.goldMin + 1))
  }
}
```

- [ ] **Step 2: Create Goblin.js**

```js
import { BaseEnemy } from './BaseEnemy.js'

export class Goblin extends BaseEnemy {
  constructor(depth = 1) {
    super('goblin', depth)
  }
}
```

- [ ] **Step 3: Create Projectile.js**

```js
import { Container, Graphics } from 'pixi.js'

export class Projectile extends Container {
  constructor({ x, y, angle, damage, speed, color, radius = 6, isMelee = false, isEnemyProjectile = false, ...extras }) {
    super()
    Object.assign(this, extras) // burn, frostSlow, stun, etc.
    this.damage = damage
    this.speed = speed
    this.isMelee = isMelee
    this.isEnemyProjectile = isEnemyProjectile
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius = radius
    this.lifetime = isMelee ? 0.12 : 4.0 // melee hit lasts 1 frame effectively

    this.x = x
    this.y = y

    const g = new Graphics()
    if (isMelee) {
      g.circle(0, 0, radius).fill({ color, alpha: 0.5 })
    } else {
      g.circle(0, 0, radius).fill(color)
    }
    this.addChild(g)
  }

  tick(deltaSeconds) {
    this.x += this.vx * deltaSeconds
    this.y += this.vy * deltaSeconds
    this.lifetime -= deltaSeconds
  }

  isExpired() {
    const oob = this.x < -50 || this.x > 850 || this.y < -50 || this.y > 650
    return this.lifetime <= 0 || oob
  }
}
```

---

### Task 11: CombatSystem + CollisionSystem

**Files:**
- Create: `mobile/src/systems/CombatSystem.js`
- Create: `mobile/src/systems/CollisionSystem.js`

These systems have no PixiJS import for their core logic (they operate on entity objects). They are orchestrators, not unit-tested here (browser-dependent behavior).

- [ ] **Step 1: Create CollisionSystem.js**

```js
function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy < (ar + br) * (ar + br)
}

export class CollisionSystem {
  // Returns array of { projectile, enemy } collision pairs
  checkProjectilesVsEnemies(projectiles, enemies) {
    const hits = []
    projectiles.forEach(p => {
      if (p.isEnemyProjectile || p.isMelee) return
      enemies.forEach(e => {
        if (!e.isAlive()) return
        if (circlesOverlap(p.x, p.y, p.radius, e.x, e.y, 16)) {
          hits.push({ projectile: p, enemy: e })
        }
      })
    })
    return hits
  }

  // Returns array of enemies whose melee attack hit the player
  checkEnemyMeleeVsPlayer(attacks, player) {
    const hits = []
    attacks.forEach(a => {
      if (!a.isMelee || !a.isEnemyProjectile) return
      if (circlesOverlap(a.x, a.y, a.radius, player.x, player.y, 16)) {
        hits.push(a)
      }
    })
    return hits
  }

  // Returns array of enemy projectiles that hit the player
  checkEnemyProjectilesVsPlayer(projectiles, player) {
    return projectiles.filter(p => {
      if (!p.isEnemyProjectile || p.isMelee) return false
      return circlesOverlap(p.x, p.y, p.radius, player.x, player.y, 16)
    })
  }
}
```

- [ ] **Step 2: Create CombatSystem.js**

```js
import { Goblin } from '../entities/enemies/Goblin.js'
import { Projectile } from '../entities/Projectile.js'
import { CollisionSystem } from './CollisionSystem.js'
import { enemiesForDepth, waveCount, enemyCountForWave } from '../data/enemies.js'

export class CombatSystem {
  constructor({ player, upgradeSystem, depth, stage, onWaveCleared, onRoomCleared, onPlayerDeath, onGoldEarned, onXpEarned }) {
    this.player = player
    this.upgradeSystem = upgradeSystem
    this.depth = depth
    this.stage = stage
    this.onWaveCleared = onWaveCleared
    this.onRoomCleared = onRoomCleared
    this.onPlayerDeath = onPlayerDeath
    this.onGoldEarned = onGoldEarned
    this.onXpEarned = onXpEarned

    this.enemies = []
    this.projectiles = []
    this.collision = new CollisionSystem()
    this.currentWave = 0
    this.totalWaves = waveCount(depth)
    this.spawnNext = true
    this.roomOver = false
  }

  spawnWave() {
    this.currentWave++
    const { min, max } = enemyCountForWave(this.depth)
    const count = min + Math.floor(Math.random() * (max - min + 1))
    const available = enemiesForDepth(this.depth)

    for (let i = 0; i < count; i++) {
      const def = available[Math.floor(Math.random() * available.length)]
      const enemy = this._makeEnemy(def.key)
      // Spawn enemies at arena edges
      const edge = Math.floor(Math.random() * 4)
      const margin = 60
      if (edge === 0) { enemy.x = margin + Math.random() * (700 - margin * 2); enemy.y = margin }
      else if (edge === 1) { enemy.x = 700 - margin; enemy.y = margin + Math.random() * (500 - margin * 2) }
      else if (edge === 2) { enemy.x = margin + Math.random() * (700 - margin * 2); enemy.y = 500 - margin }
      else { enemy.x = margin; enemy.y = margin + Math.random() * (500 - margin * 2) }
      this.enemies.push(enemy)
      this.stage.addChild(enemy)
    }
    this.spawnNext = false
  }

  _makeEnemy(key) {
    // Extend to other enemy types as needed
    return new Goblin(this.depth)
  }

  tick(deltaSeconds, playerX, playerY, aimAngle) {
    if (this.roomOver) return
    if (this.spawnNext) this.spawnWave()

    // Move player (caller sets player position via inputManager, CombatSystem just ticks player)
    this.player.tick(deltaSeconds)

    // Player auto-attack
    if (this.player.isAttackReady() && this.enemies.some(e => e.isAlive())) {
      this.player.resetAttackCooldown()
      const attackData = this.player.getAttackData(aimAngle)
      attackData.forEach(a => {
        const p = new Projectile(a)
        this.projectiles.push(p)
        this.stage.addChild(p)
      })
    }

    // Tick enemies
    this.enemies.forEach(e => {
      if (!e.isAlive()) return
      e.tick(deltaSeconds, playerX, playerY)
      const attack = e.getAttack(playerX, playerY)
      if (attack) {
        if (attack.isMelee) {
          this.player.takeDamage(attack.damage)
        } else {
          const p = new Projectile(attack)
          this.projectiles.push(p)
          this.stage.addChild(p)
        }
      }
    })

    // Tick projectiles
    this.projectiles.forEach(p => p.tick(deltaSeconds))

    // Collisions: player projectiles → enemies
    const pHits = this.collision.checkProjectilesVsEnemies(this.projectiles, this.enemies)
    pHits.forEach(({ projectile, enemy }) => {
      enemy.takeDamage(projectile.damage)
      if (projectile.burn) { /* future: apply DoT */ }
      if (projectile.frostSlow) enemy.slow(1.5)
      if (!projectile.isMelee) {
        this.stage.removeChild(projectile)
        projectile.lifetime = 0
      }
      if (!enemy.isAlive()) {
        const gold = enemy.goldDrop() + (this.upgradeSystem?.stats.goldBonus || 0)
        const xp = enemy.stats.xpReward
        this.stage.removeChild(enemy)
        this.onGoldEarned(gold)
        this.onXpEarned(xp)
      }
    })

    // Collisions: enemy projectiles → player
    const eHits = this.collision.checkEnemyProjectilesVsPlayer(this.projectiles, this.player)
    eHits.forEach(p => {
      this.player.takeDamage(p.damage)
      this.stage.removeChild(p)
      p.lifetime = 0
    })

    // Clean up expired projectiles
    this.projectiles = this.projectiles.filter(p => {
      if (p.isExpired()) { this.stage.removeChild(p); return false }
      return true
    })

    // Clean up dead enemies
    this.enemies = this.enemies.filter(e => e.isAlive())

    // Check player death
    if (!this.player.isAlive()) {
      this.roomOver = true
      this.onPlayerDeath()
      return
    }

    // Check wave clear
    if (this.enemies.length === 0 && !this.spawnNext) {
      if (this.currentWave < this.totalWaves) {
        this.spawnNext = true
        this.onWaveCleared(this.currentWave)
      } else {
        this.roomOver = true
        this.onRoomCleared()
      }
    }
  }
}
```

---

### Task 12: CombatScene

**Files:**
- Create: `mobile/src/ui/HealthBar.js`
- Create: `mobile/src/ui/GoldDisplay.js`
- Create: `mobile/src/scenes/CombatScene.js`

- [ ] **Step 1: Create ui/HealthBar.js**

```js
import { Container, Graphics, Text } from 'pixi.js'

export class HealthBar extends Container {
  constructor(width = 200, height = 16) {
    super()
    this._width = width
    this._height = height

    this._bg = new Graphics()
    this._bg.rect(0, 0, width, height).fill(0x1f2937)
    this.addChild(this._bg)

    this._bar = new Graphics()
    this.addChild(this._bar)

    this._label = new Text({ text: '', style: { fill: 0xffffff, fontSize: 12 } })
    this._label.x = 4
    this._label.y = 1
    this.addChild(this._label)
  }

  update(hp, maxHp) {
    const ratio = Math.max(0, hp / maxHp)
    const color = ratio > 0.5 ? 0x22C55E : ratio > 0.25 ? 0xF59E0B : 0xEF4444
    this._bar.clear()
    this._bar.rect(0, 0, Math.round(this._width * ratio), this._height).fill(color)
    this._label.text = `${hp}/${maxHp}`
  }
}
```

- [ ] **Step 2: Create ui/GoldDisplay.js**

```js
import { Container, Text } from 'pixi.js'

export class GoldDisplay extends Container {
  constructor() {
    super()
    this._text = new Text({ text: 'Gold: 0', style: { fill: 0xF59E0B, fontSize: 16 } })
    this.addChild(this._text)
  }

  update(gold) {
    this._text.text = `Gold: ${gold}`
  }
}
```

- [ ] **Step 3: Create CombatScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
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

const ARENA = { x: 50, y: 80, w: 700, h: 440 }

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

    const metaUpgrades = authState.player?.meta_upgrades || []
    this._player = makePlayer(runState.selectedClass, metaUpgrades)
    this._upgradeSystem = new UpgradeSystem({ ...this._player.stats })

    this._xp = 0
    this._level = 1
    this._xpToNext = 130 // xpForLevel(1)

    this._build(node.depth)
  }

  _build(depth) {
    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x0f172a)
    this.addChild(bg)

    // Arena floor
    const arena = new Graphics()
    arena.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h).fill(0x1e293b)
    this.addChild(arena)

    // Arena border
    const border = new Graphics()
    border.rect(ARENA.x, ARENA.y, ARENA.w, ARENA.h).stroke({ width: 2, color: 0x334155 })
    this.addChild(border)

    // Entity stage (children added here for combat)
    this._stage = new Container()
    this._stage.x = ARENA.x
    this._stage.y = ARENA.y
    this.addChild(this._stage)

    // Player starts at center of arena
    this._player.x = ARENA.w / 2
    this._player.y = ARENA.h / 2
    this._stage.addChild(this._player)

    // HUD
    this._healthBar = new HealthBar(200, 16)
    this._healthBar.x = 10
    this._healthBar.y = 10
    this.addChild(this._healthBar)

    this._goldDisplay = new GoldDisplay()
    this._goldDisplay.x = 580
    this._goldDisplay.y = 10
    this.addChild(this._goldDisplay)

    const depthText = new Text({ text: `Depth ${depth}`, style: { fill: 0x94A3B8, fontSize: 14 } })
    depthText.x = 340
    depthText.y = 10
    this.addChild(depthText)

    this._levelText = new Text({ text: 'Level 1', style: { fill: 0xffffff, fontSize: 14 } })
    this._levelText.x = 10
    this._levelText.y = 30
    this.addChild(this._levelText)

    const isBoss = this._node.type === 'boss'

    this._combatSystem = new CombatSystem({
      player: this._player,
      upgradeSystem: this._upgradeSystem,
      depth,
      stage: this._stage,
      onWaveCleared: (wave) => this._onWaveCleared(wave),
      onRoomCleared: () => this._onRoomCleared(),
      onPlayerDeath: () => this._onPlayerDeath(),
      onGoldEarned: (g) => this._onGoldEarned(g),
      onXpEarned: (xp) => this._onXpEarned(xp),
    })

    this._startTicker()
  }

  _startTicker() {
    const { app } = sceneManager
    this._tickerFn = (ticker) => {
      if (this._paused) return
      const dt = ticker.deltaMS / 1000
      this._updatePlayer(dt)
      this._updateCombat(dt)
      this._updateHUD()
    }
    app.ticker.add(this._tickerFn)
  }

  _updatePlayer(dt) {
    const move = inputManager.getMovement()
    const speed = this._player.stats.speed
    this._player.x = Math.max(16, Math.min(ARENA.w - 16, this._player.x + move.x * speed * dt))
    this._player.y = Math.max(24, Math.min(ARENA.h - 16, this._player.y + move.y * speed * dt))
  }

  _getAimAngle() {
    if (inputManager.isMobile || !inputManager.isMoving()) {
      // Aim at nearest enemy
      let nearest = null
      let nearDist = Infinity
      this._combatSystem.enemies.forEach(e => {
        const dx = e.x - this._player.x
        const dy = e.y - this._player.y
        const dist = dx * dx + dy * dy
        if (dist < nearDist) { nearDist = dist; nearest = e }
      })
      if (nearest) return Math.atan2(nearest.y - this._player.y, nearest.x - this._player.x)
      return 0
    }
    // Desktop: aim toward mouse
    const mx = inputManager.mouseWorld.x - ARENA.x
    const my = inputManager.mouseWorld.y - ARENA.y
    return Math.atan2(my - this._player.y, mx - this._player.x)
  }

  _updateCombat(dt) {
    const aimAngle = this._getAimAngle()
    this._combatSystem.tick(dt, this._player.x, this._player.y, aimAngle)
  }

  _updateHUD() {
    this._healthBar.update(this._player.stats.hp, this._player.stats.maxHp)
    this._goldDisplay.update(runState.goldEarned)
  }

  _onGoldEarned(gold) {
    runState.addGold(gold)
  }

  _onXpEarned(xp) {
    this._xp += xp
    while (this._xp >= this._xpToNext) {
      this._xp -= this._xpToNext
      this._level++
      this._xpToNext = Math.floor(100 * (1 + this._level * 0.3))
      this._levelText.text = `Level ${this._level}`
      this._showUpgradeOverlay()
    }
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
    })
  }

  _onWaveCleared(waveNum) {
    const msg = new Text({ text: `Wave ${waveNum} cleared!`, style: { fill: 0x22C55E, fontSize: 20 } })
    msg.anchor.set(0.5)
    msg.x = 400
    msg.y = 560
    this.addChild(msg)
    setTimeout(() => { if (msg.parent) msg.parent.removeChild(msg) }, 2000)
  }

  _onRoomCleared() {
    this._stopTicker()
    runState.roomsCleared++
    runState.depthReached = Math.max(runState.depthReached, this._node.depth)

    // Mark node cleared in runState
    if (!runState._clearedNodeIds) runState._clearedNodeIds = []
    runState._clearedNodeIds.push(runState._currentNodeId)

    if (this._node.type === 'boss') {
      runState.bossDefeated = true
      import('./BossVictoryScene.js').then(({ BossVictoryScene }) => sceneManager.go(new BossVictoryScene()))
    } else {
      import('./MapScene.js').then(({ MapScene }) => sceneManager.go(new MapScene()))
    }
  }

  _onPlayerDeath() {
    this._stopTicker()
    import('./GameOverScene.js').then(({ GameOverScene }) => sceneManager.go(new GameOverScene()))
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

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`, start a run.

Expected: Combat scene shows the arena floor, player (colored rectangle) moving with WASD/joystick, projectiles firing toward nearest enemy, enemy goblins chasing player. Health bar updates on damage. Gold counter increments on kills.

---

### Task 13: UpgradeScene + ChestScene

**Files:**
- Create: `mobile/src/ui/UpgradeCard.js`
- Create: `mobile/src/scenes/UpgradeScene.js`
- Create: `mobile/src/scenes/ChestScene.js`

- [ ] **Step 1: Create ui/UpgradeCard.js**

```js
import { Container, Graphics, Text } from 'pixi.js'

export class UpgradeCard extends Container {
  constructor(item, x, y, onClick) {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 180, 220).fill(0x1e293b)
    this.addChild(bg)

    const border = new Graphics()
    border.rect(0, 0, 180, 220).stroke({ width: 2, color: 0x3B82F6 })
    this.addChild(border)

    const label = new Text({ text: item.label, style: { fill: 0xffffff, fontSize: 16, fontWeight: 'bold', wordWrap: true, wordWrapWidth: 160 } })
    label.x = 10
    label.y = 10
    this.addChild(label)

    const desc = new Text({ text: item.description, style: { fill: 0x9CA3AF, fontSize: 13, wordWrap: true, wordWrapWidth: 160 } })
    desc.x = 10
    desc.y = 50
    this.addChild(desc)

    const btn = new Graphics()
    btn.rect(20, 185, 140, 26).fill(0x2563EB)
    this.addChild(btn)
    const btnText = new Text({ text: 'PICK', style: { fill: 0xffffff, fontSize: 14 } })
    btnText.anchor.set(0.5)
    btnText.x = 90
    btnText.y = 198
    this.addChild(btnText)

    this.x = x
    this.y = y
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointerup', () => onClick(item.key))
  }
}
```

- [ ] **Step 2: Create UpgradeScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { UpgradeCard } from '../ui/UpgradeCard.js'

export class UpgradeScene extends Container {
  constructor(upgradeSystem, classKey, onPick) {
    super()

    // Semi-transparent overlay
    const overlay = new Graphics()
    overlay.rect(0, 0, 800, 600).fill({ color: 0x000000, alpha: 0.75 })
    this.addChild(overlay)

    const title = new Text({ text: 'LEVEL UP — Choose an Upgrade', style: { fill: 0xF59E0B, fontSize: 24 } })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 160
    this.addChild(title)

    const options = upgradeSystem.pickRandomUpgrades(classKey, 3)
    const totalW = options.length * 180 + (options.length - 1) * 30
    const startX = (800 - totalW) / 2

    options.forEach((opt, i) => {
      const card = new UpgradeCard(opt, startX + i * 210, 210, (key) => onPick(key))
      this.addChild(card)
    })
  }
}
```

- [ ] **Step 3: Create ChestScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { UpgradeCard } from '../ui/UpgradeCard.js'

export class ChestScene extends Container {
  constructor(node) {
    super()
    this._node = node

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x111827)
    this.addChild(bg)

    const title = new Text({ text: '📦 CHEST ROOM — Pick an Item', style: { fill: 0xF59E0B, fontSize: 28 } })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 100
    this.addChild(title)

    // We need upgradeSystem from runState — pull it from current run data
    // For prototype, create a fresh one and pick random items
    import('../systems/UpgradeSystem.js').then(({ UpgradeSystem }) => {
      const sys = new UpgradeSystem({})
      const items = sys.pickRandomItems(3)
      const totalW = items.length * 180 + (items.length - 1) * 30
      const startX = (800 - totalW) / 2
      items.forEach((item, i) => {
        const card = new UpgradeCard(item, startX + i * 210, 200, () => this._pickItem())
        this.addChild(card)
      })
    })
  }

  _pickItem() {
    // Mark node cleared
    if (!runState._clearedNodeIds) runState._clearedNodeIds = []
    runState._clearedNodeIds.push(runState._currentNodeId)
    runState.roomsCleared++

    import('./MapScene.js').then(({ MapScene }) => sceneManager.go(new MapScene()))
  }
}
```

- [ ] **Step 4: Verify in browser**

Expected: Killing enough enemies triggers a level-up overlay with 3 upgrade cards. Clicking a card resumes combat. Entering a chest node shows 3 item cards.

---

### Task 14: GameOverScene + BossVictoryScene + MetaUpgradeScene

**Files:**
- Create: `mobile/src/scenes/GameOverScene.js`
- Create: `mobile/src/scenes/BossVictoryScene.js`
- Create: `mobile/src/scenes/MetaUpgradeScene.js`

- [ ] **Step 1: Create GameOverScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'

function makeButton(label, x, y, w, h, color, onClick) {
  const c = new Container()
  const bg = new Graphics()
  bg.rect(0, 0, w, h).fill(color)
  c.addChild(bg)
  const t = new Text({ text: label, style: { fill: 0xffffff, fontSize: 16 } })
  t.anchor.set(0.5)
  t.x = w / 2
  t.y = h / 2
  c.addChild(t)
  c.x = x; c.y = y
  c.eventMode = 'static'; c.cursor = 'pointer'
  c.on('pointerup', onClick)
  return c
}

export class GameOverScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'GAME OVER', style: { fill: 0xEF4444, fontSize: 48, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 160
    this.addChild(title)

    const stats = [
      `Depth reached: ${runState.depthReached}`,
      `Rooms cleared: ${runState.roomsCleared}`,
      `Gold earned: ${runState.goldEarned}`,
    ]
    stats.forEach((s, i) => {
      const t = new Text({ text: s, style: { fill: 0x9CA3AF, fontSize: 20 } })
      t.anchor.set(0.5)
      t.x = 400
      t.y = 260 + i * 35
      this.addChild(t)
    })

    this.addChild(makeButton('UPGRADES', 300, 420, 200, 50, 0x7C3AED, () => {
      import('./MetaUpgradeScene.js').then(({ MetaUpgradeScene }) => sceneManager.go(new MetaUpgradeScene()))
    }))
  }
}
```

- [ ] **Step 2: Create BossVictoryScene.js**

```js
import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'

export class BossVictoryScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'BOSS DEFEATED!', style: { fill: 0xF59E0B, fontSize: 40, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 140
    this.addChild(title)

    const stats = [
      `Gold earned: ${runState.goldEarned}`,
      `Rooms cleared: ${runState.roomsCleared}`,
    ]
    stats.forEach((s, i) => {
      const t = new Text({ text: s, style: { fill: 0x9CA3AF, fontSize: 20 } })
      t.anchor.set(0.5)
      t.x = 400
      t.y = 240 + i * 35
      this.addChild(t)
    })

    const btn = new Container()
    const btnBg = new Graphics()
    btnBg.rect(0, 0, 200, 50).fill(0x059669)
    btn.addChild(btnBg)
    const btnT = new Text({ text: 'CLAIM & UPGRADE', style: { fill: 0xffffff, fontSize: 16 } })
    btnT.anchor.set(0.5)
    btnT.x = 100; btnT.y = 25
    btn.addChild(btnT)
    btn.x = 300; btn.y = 380
    btn.eventMode = 'static'; btn.cursor = 'pointer'
    btn.on('pointerup', () => {
      import('./MetaUpgradeScene.js').then(({ MetaUpgradeScene }) => sceneManager.go(new MetaUpgradeScene()))
    })
    this.addChild(btn)
  }
}
```

- [ ] **Step 3: Create MetaUpgradeScene.js**

This scene saves the run and allows purchasing permanent upgrades.

```js
import { Container, Graphics, Text } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { runState } from '../core/RunState.js'
import { authState } from '../core/AuthState.js'

const META_UPGRADES = [
  { key: 'vitality_1', label: 'Vitality I', description: '+10 starting HP', cost: 30 },
  { key: 'vitality_2', label: 'Vitality II', description: '+20 starting HP', cost: 60 },
  { key: 'vitality_3', label: 'Vitality III', description: '+30 starting HP', cost: 100 },
  { key: 'power_1', label: 'Power I', description: '+5% base damage', cost: 30 },
  { key: 'power_2', label: 'Power II', description: '+10% base damage', cost: 60 },
  { key: 'power_3', label: 'Power III', description: '+15% base damage', cost: 100 },
  { key: 'swiftness_1', label: 'Swiftness I', description: '+5% speed', cost: 40 },
  { key: 'swiftness_2', label: 'Swiftness II', description: '+10% speed', cost: 80 },
  { key: 'lucky_find_1', label: 'Lucky Find I', description: 'Chests show 4 cards', cost: 50 },
  { key: 'lucky_find_2', label: 'Lucky Find II', description: 'Chests show 4 cards +', cost: 90 },
  { key: 'gold_rush_1', label: 'Gold Rush I', description: '+2 gold per enemy', cost: 45 },
  { key: 'gold_rush_2', label: 'Gold Rush II', description: '+4 gold per enemy', cost: 85 },
  { key: 'unlock_tank', label: 'Unlock Tank', description: 'Play as Tank class', cost: 50 },
]

export class MetaUpgradeScene extends Container {
  constructor() {
    super()
    this._savedRun = false
    this._build()
    this._saveRun()
  }

  _build() {
    const bg = new Graphics()
    bg.rect(0, 0, 800, 600).fill(0x0f172a)
    this.addChild(bg)

    const title = new Text({ text: 'META UPGRADES', style: { fill: 0xffffff, fontSize: 28 } })
    title.anchor.set(0.5)
    title.x = 400
    title.y = 30
    this.addChild(title)

    this._goldText = new Text({
      text: `Gold: ${authState.player?.gold ?? 0}`,
      style: { fill: 0xF59E0B, fontSize: 18 },
    })
    this._goldText.x = 20
    this._goldText.y = 60
    this.addChild(this._goldText)

    this._errorText = new Text({ text: '', style: { fill: 0xEF4444, fontSize: 14 } })
    this._errorText.x = 20
    this._errorText.y = 570
    this.addChild(this._errorText)

    this._renderUpgrades()

    const playBtn = new Container()
    const pb = new Graphics()
    pb.rect(0, 0, 160, 40).fill(0x059669)
    playBtn.addChild(pb)
    const pt = new Text({ text: 'PLAY AGAIN', style: { fill: 0xffffff, fontSize: 16 } })
    pt.anchor.set(0.5)
    pt.x = 80; pt.y = 20
    playBtn.addChild(pt)
    playBtn.x = 320; playBtn.y = 545
    playBtn.eventMode = 'static'; playBtn.cursor = 'pointer'
    playBtn.on('pointerup', () => {
      import('./ClassSelectScene.js').then(({ ClassSelectScene }) => sceneManager.go(new ClassSelectScene()))
    })
    this.addChild(playBtn)
  }

  _renderUpgrades() {
    if (this._upgradeList) this.removeChild(this._upgradeList)
    this._upgradeList = new Container()
    this._upgradeList.y = 90

    const owned = new Set(authState.player?.meta_upgrades || [])
    const cols = 3
    const cardW = 230
    const cardH = 80

    META_UPGRADES.forEach((upg, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = 20 + col * (cardW + 10)
      const y = row * (cardH + 8)

      const isPurchased = owned.has(upg.key)
      const bgColor = isPurchased ? 0x065F46 : 0x1e293b

      const c = new Container()
      const cbg = new Graphics()
      cbg.rect(0, 0, cardW, cardH).fill(bgColor)
      c.addChild(cbg)

      const label = new Text({ text: upg.label, style: { fill: 0xffffff, fontSize: 14, fontWeight: 'bold' } })
      label.x = 8; label.y = 8
      c.addChild(label)

      const desc = new Text({ text: upg.description, style: { fill: 0x9CA3AF, fontSize: 12 } })
      desc.x = 8; desc.y = 28
      c.addChild(desc)

      if (!isPurchased) {
        const costText = new Text({ text: `${upg.cost}g`, style: { fill: 0xF59E0B, fontSize: 13 } })
        costText.x = 8; costText.y = 50
        c.addChild(costText)

        const buyBtn = new Graphics()
        buyBtn.rect(cardW - 60, cardH - 26, 52, 20).fill(0x2563EB)
        c.addChild(buyBtn)
        const buyT = new Text({ text: 'BUY', style: { fill: 0xffffff, fontSize: 12 } })
        buyT.anchor.set(0.5)
        buyT.x = cardW - 34; buyT.y = cardH - 16
        c.addChild(buyT)

        c.eventMode = 'static'; c.cursor = 'pointer'
        c.on('pointerup', () => this._purchase(upg.key))
      }

      c.x = x; c.y = y
      this._upgradeList.addChild(c)
    })

    this.addChild(this._upgradeList)
  }

  async _saveRun() {
    if (this._savedRun || !authState.isLoggedIn()) return
    this._savedRun = true
    try {
      const { saveRun } = await import('../api/run.api.js')
      const data = await saveRun({
        class: runState.selectedClass,
        gold_earned: runState.goldEarned,
        rooms_cleared: runState.roomsCleared,
        depth_reached: runState.depthReached,
        boss_defeated: runState.bossDefeated,
      })
      if (authState.player) {
        authState.player.gold = data.new_total_gold
        this._goldText.text = `Gold: ${data.new_total_gold}`
      }
    } catch (err) {
      this._errorText.text = `Failed to save run: ${err.message}`
    }
  }

  async _purchase(key) {
    if (!authState.isLoggedIn()) { this._errorText.text = 'Not logged in'; return }
    try {
      const { purchaseMeta } = await import('../api/player.api.js')
      const data = await purchaseMeta(key)
      if (authState.player) {
        authState.player.gold = data.remaining_gold
        authState.player.meta_upgrades = [...(authState.player.meta_upgrades || []), key]
      }
      this._goldText.text = `Gold: ${data.remaining_gold}`
      this._renderUpgrades()
    } catch (err) {
      this._errorText.text = err.message
    }
  }
}
```

---

### Task 15: API Integration

**Files:**
- Create: `mobile/src/api/player.api.js`
- Create: `mobile/src/api/run.api.js`

- [ ] **Step 1: Create player.api.js**

```js
import { authState } from '../core/AuthState.js'

const BASE = 'http://localhost:3000/api'

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (authState.token) headers['Authorization'] = `Bearer ${authState.token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || 'Request failed')
  return json.data
}

export async function register(username, email, password) {
  return request('POST', '/auth/register', { username, email, password })
}

export async function login(email, password) {
  return request('POST', '/auth/login', { email, password })
}

export async function getProfile() {
  return request('GET', '/players/me')
}

export async function purchaseMeta(upgradeKey) {
  return request('POST', '/meta-upgrades', { upgrade_key: upgradeKey })
}
```

- [ ] **Step 2: Create run.api.js**

```js
import { authState } from '../core/AuthState.js'

const BASE = 'http://localhost:3000/api'

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (authState.token) headers['Authorization'] = `Bearer ${authState.token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || 'Request failed')
  return json.data
}

export async function saveRun({ class: classKey, gold_earned, rooms_cleared, depth_reached, boss_defeated }) {
  return request('POST', '/runs', { class: classKey, gold_earned, rooms_cleared, depth_reached, boss_defeated })
}

export async function getRunHistory() {
  return request('GET', '/runs/me')
}
```

- [ ] **Step 3: Wire getProfile into MainMenuScene login flow**

After a successful login or register, fetch the full profile (which includes `meta_upgrades[]`) and store it in authState.player. In `MainMenuScene._showLogin` and `MainMenuScene._showRegister`, after `authState.setAuth(data.token, data.player)`, add:

```js
const { getProfile } = await import('../api/player.api.js')
const profile = await getProfile()
authState.player = profile
```

The `_showLogin` callback becomes:
```js
async (email, password) => {
  const { login, getProfile } = await import('../api/player.api.js')
  const data = await login(email, password)
  authState.setAuth(data.token, data.player)
  const profile = await getProfile()
  authState.player = profile
  sceneManager.go(new MainMenuScene())
}
```

The `_showRegister` callback becomes:
```js
async (email, password, username) => {
  const { register, getProfile } = await import('../api/player.api.js')
  const data = await register(username, email, password)
  authState.setAuth(data.token, data.player)
  const profile = await getProfile()
  authState.player = profile
  sceneManager.go(new MainMenuScene())
}
```

- [ ] **Step 4: End-to-end verification**

Start the backend (`cd backend && node server.js`) and the frontend (`cd mobile && npm run dev`).

Test the full loop:
1. Open the game URL in a browser
2. Register a new account → main menu shows "PLAY" and logout
3. Click Play → class select → pick Mage
4. Enter a combat room → kill enemies → gold increments
5. Die → Game Over screen shows depth/rooms/gold
6. MetaUpgrade screen shows gold earned, upgrade list
7. Purchase an upgrade → gold updates, card turns green
8. Click Play Again → back to class select
9. In backend, run `npm test` → 18 tests still passing

Expected: All steps work without console errors. Run data saved to PostgreSQL on game end.

- [ ] **Step 5: Run all frontend tests one final time**

Run from `mobile/`: `npm test`

Expected: All tests pass (data, mapSystem, upgradeSystem).
