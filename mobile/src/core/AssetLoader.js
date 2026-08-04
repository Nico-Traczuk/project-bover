import { Assets } from 'pixi.js'

export class AssetLoader {
  async load(onProgress) {
    const BASE = '/assets/sprites/Human_Soldier_Sword_Shield/No_Shadows/Human_Soldier_Sword_Shield'
    await Assets.load([
      { alias: 'characters',       src: '/assets/sprites/characters.png' },
      { alias: 'minimap_dungeon',  src: '/assets/sprites/minimap/dungeon.png' },
      { alias: 'minimap_forest',   src: '/assets/sprites/minimap/forest.png' },
      { alias: 'minimap_inferno',  src: '/assets/sprites/minimap/inferno.png' },
      { alias: 'ui_panel_border', src: '/assets/ui/panel-border.png' },
      { alias: 'ui_panel_fill',   src: '/assets/ui/panel-fill.png' },
      { alias: 'ui_divider',      src: '/assets/ui/divider.png' },
      // Tank (Human Soldier) animation sheets
      { alias: 'tank_idle',   src: `${BASE}_Idle-Sheet.png` },
      { alias: 'tank_walk',   src: `${BASE}_Walk-Sheet.png` },
      { alias: 'tank_attack', src: `${BASE}_Attack1-Sheet.png` },
      { alias: 'tank_hurt',   src: `${BASE}_Hurt-Sheet.png` },
      { alias: 'tank_death',  src: `${BASE}_Death-Sheet.png` },
      // Enemy sprites
      { alias: 'enemy_goblin',          src: '/assets/sprites/grizzled treant/GrizzledTreant.png' },
      { alias: 'enemy_skeleton_archer', src: '/assets/sprites/novice pyromancer/NovicePyromancer.png' },
      { alias: 'enemy_dark_knight',     src: '/assets/sprites/iron golem/IronGolem.png' },
      { alias: 'enemy_shadow_mage',     src: '/assets/sprites/vile witch/VileWitch.png' },
      { alias: 'enemy_earth_elemental', src: '/assets/sprites/earth elemental/EarthElemental.png' },
      { alias: 'enemy_fire_elemental',  src: '/assets/sprites/fire elemental/FireElemental.png' },
      { alias: 'enemy_ice_golem',       src: '/assets/sprites/ice golem/IceGolem.png' },
      { alias: 'enemy_glowing_wisp',    src: '/assets/sprites/glowing wisp/GlowingWisp.png' },
      { alias: 'enemy_magical_fairy',   src: '/assets/sprites/magical fairy/MagicalFairy.png' },
      { alias: 'enemy_expert_druid',    src: '/assets/sprites/expert druid/ExpertDruid.png' },
      { alias: 'enemy_water_elemental', src: '/assets/sprites/water elemental/WaterElemental.png' },
    ])
    if (onProgress) onProgress(1.0)
    return {}
  }
}
