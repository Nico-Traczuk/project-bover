# Biome-Specific Enemy Pools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each biome its own themed enemy pool that unlocks progressively across 15 waves, replacing the current hardcoded wave-gated list shared by all biomes.

**Architecture:** Add `enemyPool` arrays to each biome in `biomes.js` and export a pure `enemyPoolForWave(biomeKey, wave)` helper. `WaveSystem` receives `biomeKey` and calls that helper instead of its own hardcoded logic. `WaveScene` passes `runState.selectedBiome` as `biomeKey`.

**Tech Stack:** PixiJS v8, Vite, Vitest

---

## File Map

| File | Change |
|------|--------|
| `mobile/src/data/enemies.js` | Add 7 new enemy type definitions |
| `mobile/src/data/biomes.js` | Add `enemyPool` to each biome; export `enemyPoolForWave()` |
| `mobile/src/entities/enemies/BaseEnemy.js` | Add 7 entries to `ENEMY_SPRITE` map |
| `mobile/src/systems/WaveSystem.js` | Accept `biomeKey`; call `enemyPoolForWave()` |
| `mobile/src/scenes/WaveScene.js` | Pass `biomeKey: runState.selectedBiome` to `WaveSystem` |
| `mobile/tests/biomeEnemyPool.test.js` | New — unit tests for `enemyPoolForWave()` |

---

### Task 1: Add 7 new enemy types to enemies.js

**Files:**
- Modify: `mobile/src/data/enemies.js`

- [ ] **Step 1: Add the 7 new entries to `ENEMY_TYPES`**

Open `mobile/src/data/enemies.js`. Append inside the `ENEMY_TYPES` object after `shadow_mage`:

```js
  glowing_wisp: {
    key: 'glowing_wisp',
    name: 'Glowing Wisp',
    hp: 20, speed: 90, damage: 6,
    xpReward: 12, goldMin: 3, goldMax: 7,
    color: 0xA7F3D0, size: 14,
    behavior: 'melee_chase',
  },
  expert_druid: {
    key: 'expert_druid',
    name: 'Expert Druid',
    hp: 55, speed: 0, damage: 14,
    xpReward: 25, goldMin: 6, goldMax: 12,
    color: 0x65A30D, size: 20,
    behavior: 'ranged_stationary',
  },
  magical_fairy: {
    key: 'magical_fairy',
    name: 'Magical Fairy',
    hp: 40, speed: 65, damage: 10,
    xpReward: 22, goldMin: 5, goldMax: 10,
    color: 0xF9A8D4, size: 16,
    behavior: 'ranged_mobile',
  },
  ice_golem: {
    key: 'ice_golem',
    name: 'Ice Golem',
    hp: 100, speed: 35, damage: 25,
    xpReward: 40, goldMin: 8, goldMax: 15,
    color: 0xBAE6FD, size: 26,
    behavior: 'melee_chase',
  },
  fire_elemental: {
    key: 'fire_elemental',
    name: 'Fire Elemental',
    hp: 50, speed: 80, damage: 18,
    xpReward: 28, goldMin: 6, goldMax: 12,
    color: 0xF97316, size: 20,
    behavior: 'melee_chase',
  },
  earth_elemental: {
    key: 'earth_elemental',
    name: 'Earth Elemental',
    hp: 120, speed: 30, damage: 30,
    xpReward: 45, goldMin: 10, goldMax: 18,
    color: 0x78350F, size: 28,
    behavior: 'melee_chase',
  },
  water_elemental: {
    key: 'water_elemental',
    name: 'Water Elemental',
    hp: 65, speed: 55, damage: 15,
    xpReward: 32, goldMin: 7, goldMax: 13,
    color: 0x38BDF8, size: 22,
    behavior: 'ranged_mobile',
  },
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/data/enemies.js
git commit -m "feat: add 7 new enemy type definitions"
```

---

### Task 2: Add enemyPool arrays to biomes.js and export helper

**Files:**
- Modify: `mobile/src/data/biomes.js`
- Create: `mobile/tests/biomeEnemyPool.test.js`

- [ ] **Step 1: Add `enemyPool` to each biome and export `enemyPoolForWave`**

In `mobile/src/data/biomes.js`, add `enemyPool` inside each biome object and add the helper at the bottom.

For the `forest` biome, add after the `colors` block:
```js
    enemyPool: [
      { key: 'goblin',        fromWave: 1  },
      { key: 'glowing_wisp',  fromWave: 4  },
      { key: 'expert_druid',  fromWave: 8  },
      { key: 'magical_fairy', fromWave: 12 },
    ],
```

For the `dungeon` biome:
```js
    enemyPool: [
      { key: 'skeleton_archer', fromWave: 1  },
      { key: 'dark_knight',     fromWave: 4  },
      { key: 'ice_golem',       fromWave: 8  },
      { key: 'shadow_mage',     fromWave: 12 },
    ],
```

For the `inferno` biome:
```js
    enemyPool: [
      { key: 'fire_elemental',  fromWave: 1  },
      { key: 'earth_elemental', fromWave: 4  },
      { key: 'shadow_mage',     fromWave: 8  },
      { key: 'water_elemental', fromWave: 12 },
    ],
```

At the bottom of `biomes.js`, add:
```js
export function enemyPoolForWave(biomeKey, wave) {
  const biome = BIOMES[biomeKey]
  if (!biome?.enemyPool) return ['goblin']
  return biome.enemyPool
    .filter(e => wave >= e.fromWave)
    .map(e => e.key)
}
```

- [ ] **Step 2: Write the test file**

Create `mobile/tests/biomeEnemyPool.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { enemyPoolForWave } from '../src/data/biomes.js'

describe('enemyPoolForWave — forest', () => {
  test('wave 1 returns only goblin', () => {
    expect(enemyPoolForWave('forest', 1)).toEqual(['goblin'])
  })
  test('wave 4 adds glowing_wisp', () => {
    const pool = enemyPoolForWave('forest', 4)
    expect(pool).toContain('goblin')
    expect(pool).toContain('glowing_wisp')
    expect(pool).not.toContain('expert_druid')
  })
  test('wave 8 adds expert_druid', () => {
    const pool = enemyPoolForWave('forest', 8)
    expect(pool).toContain('expert_druid')
    expect(pool).not.toContain('magical_fairy')
  })
  test('wave 12 adds magical_fairy', () => {
    const pool = enemyPoolForWave('forest', 12)
    expect(pool).toContain('magical_fairy')
  })
})

describe('enemyPoolForWave — dungeon', () => {
  test('wave 1 returns only skeleton_archer', () => {
    expect(enemyPoolForWave('dungeon', 1)).toEqual(['skeleton_archer'])
  })
  test('wave 4 adds dark_knight', () => {
    const pool = enemyPoolForWave('dungeon', 4)
    expect(pool).toContain('dark_knight')
  })
  test('wave 8 adds ice_golem', () => {
    const pool = enemyPoolForWave('dungeon', 8)
    expect(pool).toContain('ice_golem')
  })
  test('wave 12 adds shadow_mage', () => {
    const pool = enemyPoolForWave('dungeon', 12)
    expect(pool).toContain('shadow_mage')
  })
})

describe('enemyPoolForWave — inferno', () => {
  test('wave 1 returns only fire_elemental', () => {
    expect(enemyPoolForWave('inferno', 1)).toEqual(['fire_elemental'])
  })
  test('wave 4 adds earth_elemental', () => {
    const pool = enemyPoolForWave('inferno', 4)
    expect(pool).toContain('earth_elemental')
  })
  test('wave 8 adds shadow_mage', () => {
    const pool = enemyPoolForWave('inferno', 8)
    expect(pool).toContain('shadow_mage')
  })
  test('wave 12 adds water_elemental', () => {
    const pool = enemyPoolForWave('inferno', 12)
    expect(pool).toContain('water_elemental')
  })
})

describe('enemyPoolForWave — unknown biome', () => {
  test('falls back to goblin', () => {
    expect(enemyPoolForWave('unknown', 5)).toEqual(['goblin'])
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL (function not exported yet)**

```bash
cd mobile && npm test -- biomeEnemyPool
```

Expected: fail with "enemyPoolForWave is not a function" or import error.

- [ ] **Step 4: Run tests — expect PASS (after Step 1 is done)**

```bash
cd mobile && npm test -- biomeEnemyPool
```

Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/data/biomes.js mobile/tests/biomeEnemyPool.test.js
git commit -m "feat: add biome enemy pools and enemyPoolForWave helper"
```

---

### Task 3: Wire new sprite aliases in BaseEnemy.js

**Files:**
- Modify: `mobile/src/entities/enemies/BaseEnemy.js`

- [ ] **Step 1: Add 7 entries to `ENEMY_SPRITE`**

In `mobile/src/entities/enemies/BaseEnemy.js`, the `ENEMY_SPRITE` constant currently has 4 entries. Add the 7 new ones:

```js
const ENEMY_SPRITE = {
  goblin:          'enemy_goblin',
  skeleton_archer: 'enemy_skeleton_archer',
  dark_knight:     'enemy_dark_knight',
  shadow_mage:     'enemy_shadow_mage',
  // new
  glowing_wisp:    'enemy_glowing_wisp',
  expert_druid:    'enemy_expert_druid',
  magical_fairy:   'enemy_magical_fairy',
  ice_golem:       'enemy_ice_golem',
  fire_elemental:  'enemy_fire_elemental',
  earth_elemental: 'enemy_earth_elemental',
  water_elemental: 'enemy_water_elemental',
}
```

The aliases (`enemy_glowing_wisp`, etc.) are already loaded by `AssetLoader.js` — no change needed there.

- [ ] **Step 2: Run existing enemy tests to confirm nothing broke**

```bash
cd mobile && npm test -- enemySpawn enemyAnimation
```

Expected: all tests pass (same as before — mock returns `Assets.get() = null`, so Graphics fallback is used, which is fine).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/entities/enemies/BaseEnemy.js
git commit -m "feat: map 7 new enemy sprites in BaseEnemy"
```

---

### Task 4: Make WaveSystem biome-aware

**Files:**
- Modify: `mobile/src/systems/WaveSystem.js`

- [ ] **Step 1: Import `enemyPoolForWave` and accept `biomeKey`**

At the top of `mobile/src/systems/WaveSystem.js`, add `enemyPoolForWave` to the import from `biomes.js`:

```js
import {
  TOTAL_WAVES, WAVE_TIMER_SECONDS,
  spawnCountForWave, waveHpMultiplier, waveDamageMultiplier, waveGoldMultiplier,
  enemyPoolForWave,
} from '../data/biomes.js'
```

- [ ] **Step 2: Accept `biomeKey` in constructor**

In the constructor options destructuring, add `biomeKey`:

```js
constructor({
  player, upgradeSystem, stage,
  biomeKey,
  onWaveAnnounce, onCastleDamage, onRunWon, onPlayerDeath,
  onGoldEarned, onXpEarned, onPlayerHurt, onEffect,
}) {
  // ...existing assignments...
  this._biomeKey = biomeKey ?? 'forest'
```

- [ ] **Step 3: Replace `_enemyPoolForWave` and `_makeEnemy`**

Remove the old `_enemyPoolForWave` method entirely. Replace `_makeEnemy` to use the imported helper:

```js
_makeEnemy() {
  const wave = this.currentWave
  const pool = enemyPoolForWave(this._biomeKey, wave)
  const typeKey = pool[Math.floor(Math.random() * pool.length)]
  const enemy = new BaseEnemy(typeKey)
  enemy.stats.hp = Math.round(enemy.stats.hp * waveHpMultiplier(wave))
  enemy.stats.maxHp = enemy.stats.hp
  enemy.stats.damage = Math.round(enemy.stats.damage * waveDamageMultiplier(wave))
  return enemy
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd mobile && npm test
```

Expected: all tests pass. The `enemySpawn` tests use `Assets.get() = null` so BaseEnemy falls back to Graphics — no issue.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/systems/WaveSystem.js
git commit -m "feat: make WaveSystem biome-aware, use enemyPoolForWave"
```

---

### Task 5: Pass biomeKey from WaveScene and verify in browser

**Files:**
- Modify: `mobile/src/scenes/WaveScene.js`

- [ ] **Step 1: Pass `biomeKey` to WaveSystem**

In `mobile/src/scenes/WaveScene.js`, find `_buildWaveSystem()`. Add `biomeKey` to the constructor options object:

```js
_buildWaveSystem() {
  this._waveSystem = new WaveSystem({
    player: this._player,
    upgradeSystem: this._upgradeSystem,
    stage: this._stage,
    biomeKey: runState.selectedBiome,   // ← add this line
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
```

- [ ] **Step 2: Run full test suite**

```bash
cd mobile && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Start dev server and verify in browser**

```bash
cd mobile && npm run dev
```

Open `http://localhost:5173` (or whatever port Vite uses). Play through:
- Select **Forest** biome → verify only goblins in waves 1–3, wisps appear at wave 4
- Select **Dungeon** biome → verify skeleton archers from wave 1, no goblins
- Select **Inferno** biome → verify fire elementals from wave 1, no goblins

- [ ] **Step 4: Stop server and commit**

```bash
git add mobile/src/scenes/WaveScene.js
git commit -m "feat: wire biome-specific enemy pools per biome selection"
```
