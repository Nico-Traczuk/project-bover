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
    enemyPool: [
      { key: 'goblin',        fromWave: 1  },
      { key: 'glowing_wisp',  fromWave: 4  },
      { key: 'expert_druid',  fromWave: 8  },
      { key: 'magical_fairy', fromWave: 12 },
    ],
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
    enemyPool: [
      { key: 'skeleton_archer', fromWave: 1  },
      { key: 'dark_knight',     fromWave: 4  },
      { key: 'ice_golem',       fromWave: 8  },
      { key: 'shadow_mage',     fromWave: 12 },
    ],
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
    enemyPool: [
      { key: 'fire_elemental',  fromWave: 1  },
      { key: 'earth_elemental', fromWave: 4  },
      { key: 'shadow_mage',     fromWave: 8  },
      { key: 'water_elemental', fromWave: 12 },
    ],
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

export function spawnCountForWave(wave) {
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

export function enemyPoolForWave(biomeKey, wave) {
  const biome = BIOMES[biomeKey]
  if (!biome?.enemyPool) return ['goblin']
  return biome.enemyPool
    .filter(e => wave >= e.fromWave)
    .map(e => e.key)
}
