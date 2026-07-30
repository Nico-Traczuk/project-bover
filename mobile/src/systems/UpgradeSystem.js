// No pixi.js import — pure logic
import { UPGRADE_POOL } from '../data/upgrades.js'
import { allItems } from '../data/items.js'

function seededShuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class UpgradeSystem {
  constructor(stats) {
    this.stats = { ...stats }
    this.appliedUpgrades = new Set()
    this.appliedItems = []
  }

  applyUpgrade(key) {
    if (this.appliedUpgrades.has(key)) return
    this.appliedUpgrades.add(key)
    const effects = {
      extra_projectile: s => { s.extraProjectiles = (s.extraProjectiles || 0) + 1 },
      iron_skin: s => { s.defense += 15 },
      counter_strike: s => { s.counterStrike = true },
      lifesteal: s => { s.lifesteal = true },
      taunt: s => { s.taunt = true },
      stun_strike: s => { s.stunStrike = true },
      battle_rush: s => { s.battleRush = true },
      burn: s => { s.burn = true },
      frost_slow: s => { s.frostSlow = true },
      blink: s => { s.blink = true },
      chain_lightning: s => { s.chainLightning = true },
      mana_shield: s => { s.manaShield = true },
    }
    if (effects[key]) effects[key](this.stats)
  }

  applyItem(key) {
    this.appliedItems.push(key)
    const effects = {
      shadow_blade: s => { s.damage = Math.round(s.damage * 1.2) },
      cursed_dagger: s => { s.attackSpeed = parseFloat((s.attackSpeed * 0.85).toFixed(4)) },
      storm_rune: s => { s.chainHit = (s.chainHit || 0) + 1 },
      gold_idol: s => { s.goldBonus = (s.goldBonus || 0) + 3 },
      amulet_of_thorns: s => { s.thorns = (s.thorns || 0) + 15 },
      healing_flask: s => { s.hp = Math.min(s.maxHp, s.hp + 30) },
      ward_stone: s => { s.maxHp += 20; s.hp += 20 },
      eternal_bandage: s => { s.regenPerSec = (s.regenPerSec || 0) + 2 },
      swiftboots: s => { s.speed = Math.round(s.speed * 1.15) },
      ancient_tome: s => { s.extraUpgradeChoice = true },
    }
    if (effects[key]) effects[key](this.stats)
  }

  pickRandomUpgrades(classKey, count = 3) {
    const pool = UPGRADE_POOL[classKey] || []
    const available = pool.filter(u => !this.appliedUpgrades.has(u.key))
    return seededShuffle(available).slice(0, count)
  }

  pickRandomItems(count = 3) {
    const available = allItems().filter(i => !this.appliedItems.includes(i.key))
    return seededShuffle(available).slice(0, count)
  }
}
