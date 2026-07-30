// Chest room items — class-agnostic
export const ITEMS = {
  attack: [
    { key: 'shadow_blade', label: 'Shadow Blade', description: '+20% damage' },
    { key: 'cursed_dagger', label: 'Cursed Dagger', description: '+15% attack speed' },
    { key: 'storm_rune', label: 'Storm Rune', description: 'Chain hit to 1 extra enemy' },
    { key: 'gold_idol', label: 'Gold Idol', description: '+3 gold per enemy kill' },
  ],
  defense: [
    { key: 'amulet_of_thorns', label: 'Amulet of Thorns', description: 'Reflect 15 damage on hit' },
    { key: 'healing_flask', label: 'Healing Flask', description: 'Restore 30 HP immediately' },
    { key: 'ward_stone', label: 'Ward Stone', description: '+20 max HP' },
    { key: 'eternal_bandage', label: 'Eternal Bandage', description: 'Regen 2 HP per second' },
  ],
  utility: [
    { key: 'swiftboots', label: 'Swiftboots', description: '+15% movement speed' },
    { key: 'ancient_tome', label: 'Ancient Tome', description: 'Next level-up shows 4 choices' },
  ],
}

export function allItems() {
  return [...ITEMS.attack, ...ITEMS.defense, ...ITEMS.utility]
}
