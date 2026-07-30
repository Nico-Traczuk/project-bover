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
