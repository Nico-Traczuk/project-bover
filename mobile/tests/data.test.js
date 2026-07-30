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
