# Biome-Specific Enemy Pools

**Date:** 2026-08-04

## Goal

Give each biome its own themed roster of enemies that unlock progressively across the 15 waves. Currently all biomes share the same wave-gated pool hardcoded in `WaveSystem`. This spec makes enemy composition biome-aware.

## Enemy Distribution

### Forest (Enchanted Forest)
| Wave | Enemy added | Sprite alias |
|------|-------------|--------------|
| 1    | Goblin (treant) | enemy_goblin |
| 4    | Glowing Wisp    | enemy_glowing_wisp |
| 8    | Expert Druid    | enemy_expert_druid |
| 12   | Magical Fairy   | enemy_magical_fairy |

### Dungeon (Dark Dungeon)
| Wave | Enemy added | Sprite alias |
|------|-------------|--------------|
| 1    | Skeleton Archer | enemy_skeleton_archer |
| 4    | Dark Knight     | enemy_dark_knight |
| 8    | Ice Golem       | enemy_ice_golem |
| 12   | Shadow Mage     | enemy_shadow_mage |

### Inferno
| Wave | Enemy added | Sprite alias |
|------|-------------|--------------|
| 1    | Fire Elemental  | enemy_fire_elemental |
| 4    | Earth Elemental | enemy_earth_elemental |
| 8    | Shadow Mage     | enemy_shadow_mage |
| 12   | Water Elemental | enemy_water_elemental |

## New Enemy Stats

All new types use `melee_chase`, `ranged_stationary`, or `ranged_mobile` behavior (same four already in `BaseEnemy`).

| Key | HP | Speed | Damage | XP | Behavior |
|-----|----|-------|--------|----|----------|
| glowing_wisp    | 20 | 90 | 6  | 12 | melee_chase |
| expert_druid    | 55 | 0  | 14 | 25 | ranged_stationary |
| magical_fairy   | 40 | 65 | 10 | 22 | ranged_mobile |
| ice_golem       | 100| 35 | 25 | 40 | melee_chase |
| fire_elemental  | 50 | 80 | 18 | 28 | melee_chase |
| earth_elemental | 120| 30 | 30 | 45 | melee_chase |
| water_elemental | 65 | 55 | 15 | 32 | ranged_mobile |

Gold drops: `goldMin: 5, goldMax: 12` for all new types (scaled by wave multiplier at runtime).

## Architecture Changes

### `enemies.js`
Add 7 new entries to `ENEMY_TYPES`.

### `biomes.js`
Add `enemyPool` array to each biome object:
```js
enemyPool: [
  { key: 'goblin',       fromWave: 1 },
  { key: 'glowing_wisp', fromWave: 4 },
  ...
]
```

### `WaveSystem.js`
- Accept `biomeKey` in constructor options
- Replace hardcoded `_enemyPoolForWave()` with biome-driven lookup:
```js
_enemyPoolForWave(wave) {
  return this._biomePool
    .filter(e => wave >= e.fromWave)
    .map(e => e.key)
}
```

### `BaseEnemy.js`
Add 7 new entries to the `ENEMY_SPRITE` map (aliases already loaded in `AssetLoader.js`).

### `WaveScene.js`
Pass `biomeKey: runState.selectedBiome` to `WaveSystem` constructor.

## Out of Scope
- Unique AI behaviors per new enemy (they reuse the four existing behaviors)
- Boss variants
- Balance tuning beyond initial stats
