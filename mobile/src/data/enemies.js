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
