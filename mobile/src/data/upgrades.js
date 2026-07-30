// Mid-run level-up cards — class-specific
export const UPGRADE_POOL = {
  mage: [
    { key: 'extra_projectile', label: 'Extra Projectile', description: 'Fire an additional projectile' },
    { key: 'burn', label: 'Burn', description: 'Projectiles apply 5 DPS burn for 2s' },
    { key: 'frost_slow', label: 'Frost Slow', description: 'Slow enemies 30% on hit' },
    { key: 'blink', label: 'Blink', description: 'Dash 100px in move direction (2s cooldown)' },
    { key: 'chain_lightning', label: 'Chain Lightning', description: 'Projectiles jump to 1 extra enemy' },
    { key: 'mana_shield', label: 'Mana Shield', description: 'Block first hit taken per room' },
  ],
  tank: [
    { key: 'iron_skin', label: 'Iron Skin', description: '+15 defense' },
    { key: 'counter_strike', label: 'Counter Strike', description: 'Reflect 10% of damage taken' },
    { key: 'lifesteal', label: 'Lifesteal', description: 'Heal 10% of damage dealt' },
    { key: 'taunt', label: 'Taunt', description: 'Pull all enemies 80px closer' },
    { key: 'stun_strike', label: 'Stun Strike', description: 'Attacks stun for 0.5s' },
    { key: 'battle_rush', label: 'Battle Rush', description: '+20% speed for 3s after a kill' },
  ],
}

export const BASE_XP = 100

// XP needed to reach level n from level n-1
export function xpForLevel(level) {
  return Math.floor(BASE_XP * (1 + level * 0.3))
}
