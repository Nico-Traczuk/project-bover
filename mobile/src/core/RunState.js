const CASTLE_BASE_HP = 300

export const runState = {
  selectedClass: null,
  selectedBiome: 'forest',   // persists across runs within a session
  goldEarned: 0,             // gold accumulated this run
  currentWave: 0,
  castleHp: CASTLE_BASE_HP,
  castleMaxHp: CASTLE_BASE_HP,
  bossDefeated: false,
  _upgradeSystem: null,

  reset() {
    this.selectedClass = null
    this.goldEarned = 0
    this.currentWave = 0
    this.castleHp = CASTLE_BASE_HP
    this.castleMaxHp = CASTLE_BASE_HP
    this.bossDefeated = false
    this._upgradeSystem = null
    // selectedBiome intentionally NOT reset — player returns to same biome
  },

  addGold(amount) {
    this.goldEarned += amount
  },

  damageCastle(amount) {
    this.castleHp = Math.max(0, this.castleHp - amount)
    return this.castleHp
  },
}
