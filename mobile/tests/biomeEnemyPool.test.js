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
