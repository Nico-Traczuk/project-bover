// Visual theme per depth: outer floor, inner arena, border accent
export const THEMES = {
  1: { floor: 0x0f172a, arena: 0x1e293b, border: 0x475569 }, // stone dungeon
  2: { floor: 0x0f172a, arena: 0x1e293b, border: 0x475569 },
  4: { floor: 0x061208, arena: 0x0d2010, border: 0x2d6620 }, // forest cave
  6: { floor: 0x1a0800, arena: 0x281000, border: 0xAA3300 }, // inferno
  7: { floor: 0x0e0018, arena: 0x160025, border: 0x6600aa }, // void
  8: { floor: 0x160000, arena: 0x220000, border: 0xAA0000 }, // boss crimson
}

export const ROOM_NAMES = {
  combat: [
    'The Goblin Warren', 'Forgotten Crypt', 'The Dark Passage',
    'Bandit Hideout', 'The Fallen Barracks', 'Haunted Gallery',
    'The Narrow Path', 'Cursed Halls', 'The Bone Pit',
    'Shadowfell Crossing', 'The Rat Warrens', 'Crumbling Keep',
    'The Murky Depths', 'Ruined Chapel', 'The Iron Gate',
  ],
  chest: [
    'The Vault', 'Ancient Cache', "The Merchant's Stash",
    'Buried Treasure', 'The Hidden Alcove', 'Forgotten Treasury',
    'The Old Armory',
  ],
  elite: [
    "The Champion's Hall", "Warlord's Keep", "Death's Doorstep",
    'The Iron Gauntlet', "The Warden's Chamber",
  ],
  boss: [
    'The Final Chamber', 'Throne of Darkness', 'The Endless Abyss',
    "Lair of the Overlord", 'The Last Stand',
  ],
}

// Combat-only modifiers — each has a label, desc, type, and one or more effect fields
export const MODIFIER_POOL = [
  // Curses
  { key: 'swift_enemies',  label: 'Swift Enemies',  desc: 'Enemies move 30% faster',      type: 'curse', enemySpeedMult: 1.3 },
  { key: 'hardened_foes',  label: 'Hardened Foes',  desc: 'Enemies have 40% more HP',      type: 'curse', enemyHpMult: 1.4 },
  { key: 'cursed_ground',  label: 'Cursed Ground',  desc: 'Your speed reduced 25%',        type: 'curse', playerSpeedMult: 0.75 },
  { key: 'darkness',       label: 'Darkness',       desc: '+2 extra enemies per wave',     type: 'curse', extraEnemies: 2 },
  // Blessings
  { key: 'blessed_xp',     label: 'Blessed Ground', desc: 'Earn 75% more XP this room',   type: 'bless', xpMult: 1.75 },
  { key: 'gold_rush',      label: 'Gold Rush',      desc: 'Enemies drop double gold',      type: 'bless', goldMult: 2 },
  { key: 'empowered',      label: 'Empowered',      desc: 'Deal 25% more damage',          type: 'bless', playerDamageMult: 1.25 },
]

// Deterministic hash so the same node always gets the same name + modifier
function hashId(id) {
  let h = 5381
  for (let i = 0; i < id.length; i++) {
    h = (h * 33 ^ id.charCodeAt(i)) >>> 0
  }
  return h >>> 0
}

export function getRoomData(node) {
  const h = hashId(node.id)
  const type = node.type === 'elite_candidate' ? 'combat' : node.type
  const names = ROOM_NAMES[type] ?? ROOM_NAMES.combat
  const name = names[h % names.length]

  const isCombatRoom = type === 'combat' || type === 'elite' || type === 'boss'
  const modifier = (isCombatRoom && (h >> 4) % 10 < 6)
    ? MODIFIER_POOL[(h >> 8) % MODIFIER_POOL.length]
    : null

  const theme = THEMES[node.depth] ?? THEMES[1]
  return { name, modifier, theme }
}
