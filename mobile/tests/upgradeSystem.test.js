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
