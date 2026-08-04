import { BaseEnemy } from '../entities/enemies/BaseEnemy.js'
import { Projectile } from '../entities/Projectile.js'
import { CollisionSystem } from './CollisionSystem.js'
import {
  TOTAL_WAVES, WAVE_TIMER_SECONDS,
  spawnCountForWave, waveHpMultiplier, waveDamageMultiplier, waveGoldMultiplier,
  enemyPoolForWave,
} from '../data/biomes.js'

const CASTLE_Y = 1100
const SPAWN_POSITIONS = [
  { x: 150, y: 10 },
  { x: 300, y: 10 },
  { x: 80,  y: 10 },
  { x: 370, y: 10 },
]
const CASTLE_HIT_DAMAGE_FACTOR = 3

export class WaveSystem {
  constructor({
    player, upgradeSystem, stage,
    onWaveAnnounce, onCastleDamage, onRunWon, onPlayerDeath,
    onGoldEarned, onXpEarned, onPlayerHurt, onEffect,
    biomeKey,
  }) {
    this.player = player
    this.upgradeSystem = upgradeSystem
    this.stage = stage
    this.onWaveAnnounce = onWaveAnnounce
    this.onCastleDamage = onCastleDamage
    this.onRunWon = onRunWon
    this.onPlayerDeath = onPlayerDeath
    this.onGoldEarned = onGoldEarned
    this.onXpEarned = onXpEarned
    this.onPlayerHurt = onPlayerHurt
    this.onEffect = onEffect

    this.enemies = []
    this.dyingEnemies = []
    this.projectiles = []
    this.collision = new CollisionSystem()

    this.currentWave = 0
    this._waveTimer = 0
    this.runOver = false
    this._biomeKey = biomeKey ?? 'forest'
  }

  beginFirstWave() {
    this._spawnWave()
  }

  _spawnWave() {
    this.currentWave++
    this._waveTimer = WAVE_TIMER_SECONDS
    this.onWaveAnnounce?.(this.currentWave)

    const count = spawnCountForWave(this.currentWave)
    for (let i = 0; i < count; i++) {
      const enemy = this._makeEnemy()
      const slot = SPAWN_POSITIONS[i % SPAWN_POSITIONS.length]
      enemy.x = slot.x + (Math.random() - 0.5) * 50
      enemy.y = slot.y + Math.random() * 15
      this.enemies.push(enemy)
      this.stage.addChild(enemy)
    }
  }

  _makeEnemy() {
    const wave = this.currentWave
    const pool = enemyPoolForWave(this._biomeKey, wave)
    const typeKey = pool[Math.floor(Math.random() * pool.length)]
    const enemy = new BaseEnemy(typeKey)
    enemy.stats.hp = Math.round(enemy.stats.hp * waveHpMultiplier(wave))
    enemy.stats.maxHp = enemy.stats.hp
    enemy.stats.damage = Math.round(enemy.stats.damage * waveDamageMultiplier(wave))
    return enemy
  }

  tick(dt, playerX, playerY, aimAngle) {
    if (this.runOver) return

    this._waveTimer -= dt
    const allClear = this.enemies.length === 0 && this.dyingEnemies.length === 0

    if (allClear) {
      if (this.currentWave >= TOTAL_WAVES) {
        this.runOver = true
        this.onRunWon?.()
        return
      }
      this._spawnWave()
    } else if (this._waveTimer <= 0 && this.currentWave < TOTAL_WAVES) {
      this._spawnWave()
    }

    // Player attack
    this.player.tick(dt)
    if (this.player.isAttackReady() && this.enemies.length > 0) {
      this.player.triggerAttack()
      this.player.resetAttackCooldown()
      this.player.getAttackData(aimAngle).forEach(a => {
        const p = new Projectile(a)
        this.projectiles.push(p)
        this.stage.addChild(p)
      })
    }

    // Enemy update
    const castleBreaches = []
    this.enemies.forEach(e => {
      if (!e.isAlive()) return

      e.tick(dt, playerX, playerY)

      if (e.y > CASTLE_Y) {
        const dmg = Math.round(e.stats.damage * CASTLE_HIT_DAMAGE_FACTOR)
        this.onCastleDamage?.(dmg)
        castleBreaches.push(e)
        return
      }

      const attack = e.getAttack(playerX, playerY)
      if (attack) {
        if (attack.isMelee) {
          const angle = Math.atan2(playerY - e.y, playerX - e.x)
          const prevHp = this.player.stats.hp
          this.player.takeDamage(attack.damage, angle)
          if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
        } else {
          const p = new Projectile(attack)
          this.projectiles.push(p)
          this.stage.addChild(p)
        }
      }
    })

    castleBreaches.forEach(e => {
      this.enemies = this.enemies.filter(x => x !== e)
      this.stage.removeChild(e)
      e.destroy({ children: true })
    })

    this.projectiles.forEach(p => p.tick(dt))

    this.collision.checkProjectilesVsEnemies(this.projectiles, this.enemies).forEach(({ projectile, enemy }) => {
      const hitAngle = Math.atan2(projectile.vy, projectile.vx)
      enemy.takeDamage(projectile.damage, hitAngle)
      this.onEffect?.('damage', enemy.x, enemy.y, { amount: projectile.damage, maxHp: enemy.stats.maxHp })
      this.onEffect?.('impact', enemy.x, enemy.y, null)
      if (projectile.frostSlow) enemy.slow(1.5)
      if (!projectile.isMelee) projectile.lifetime = 0
      if (!enemy.isAlive()) {
        const gold = Math.round(
          (enemy.goldDrop() + (this.upgradeSystem?.stats.goldBonus || 0)) * waveGoldMultiplier(this.currentWave)
        )
        this.onGoldEarned?.(gold)
        this.onXpEarned?.(enemy.stats.xpReward)
        enemy.triggerDeath()
        this.dyingEnemies.push(enemy)
      }
    })

    this.collision.checkEnemyProjectilesVsPlayer(this.projectiles, this.player).forEach(p => {
      const hitAngle = Math.atan2(p.vy, p.vx)
      const prevHp = this.player.stats.hp
      this.player.takeDamage(p.damage, hitAngle)
      if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
      this.onEffect?.('impact', this.player.x, this.player.y, null)
      p.lifetime = 0
    })

    this.projectiles = this.projectiles.filter(p => {
      if (p.isExpired()) { this.stage.removeChild(p); return false }
      return true
    })

    this.enemies = this.enemies.filter(e => e.isAlive())

    this.dyingEnemies = this.dyingEnemies.filter(e => {
      e.tickDeath(dt)
      if (e._dyingTimer <= 0) { this.stage.removeChild(e); return false }
      return true
    })

    if (!this.player.isAlive()) {
      this.runOver = true
      this.onPlayerDeath?.()
    }
  }
}
