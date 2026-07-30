import { Assets } from 'pixi.js'

export class AssetLoader {
  async load(onProgress) {
    await Assets.load([
      { alias: 'characters',       src: '/assets/sprites/characters.png' },
      { alias: 'minimap_dungeon',  src: '/assets/sprites/minimap/dungeon.png' },
      { alias: 'minimap_forest',   src: '/assets/sprites/minimap/forest.png' },
      { alias: 'minimap_inferno',  src: '/assets/sprites/minimap/inferno.png' },
      { alias: 'ui_panel_border', src: '/assets/ui/panel-border.png' },
      { alias: 'ui_panel_fill',   src: '/assets/ui/panel-fill.png' },
      { alias: 'ui_divider',      src: '/assets/ui/divider.png' },
    ])
    if (onProgress) onProgress(1.0)
    return {}
  }
}
