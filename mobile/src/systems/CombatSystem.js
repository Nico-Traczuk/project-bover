import { Goblin } from '../entities/enemies/Goblin.js'
import { Projectile } from '../entities/Projectile.js'
import { CollisionSystem } from './CollisionSystem.js'
import { enemiesForDepth, waveCount, enemyCountForWave } from '../data/enemies.js'

export class CombatSystem {
  constructor({ player, upgradeSystem, depth, stage, modifier, onWaveCleared, onRoomCleared, onPlayerDeath, onGoldEarned, onXpEarned, onPlayerHurt }) {
    this.player = player
    this.upgradeSystem = upgradeSystem
    this.depth = depth
    this.stage = stage
    this.modifier = modifier ?? null
    this.onWaveCleared = onWaveCleared
    this.onRoomCleared = onRoomCleared
    this.onPlayerDeath = onPlayerDeath
    this.onGoldEarned = onGoldEarned
    this.onXpEarned = onXpEarned
    this.onPlayerHurt = onPlayerHurt ?? null

    this.enemies = []
    this.dyingEnemies = []
    this.projectiles = []
    this.collision = new CollisionSystem()
    this.currentWave = 0
    this.totalWaves = waveCount(depth)
    this._spawnNext = true
    this.roomOver = false
  }

  _spawnWave() {
    this.currentWave++
    const { min, max } = enemyCountForWave(this.depth)
    const count = min + Math.floor(Math.random() * (max - min + 1)) + (this.modifier?.extraEnemies ?? 0)
    const available = enemiesForDepth(this.depth)

    for (let i = 0; i < count; i++) {
      const def = available[Math.floor(Math.random() * available.length)]
      const enemy = this._makeEnemy(def.key)
      const edge = Math.floor(Math.random() * 4)
      const margin = 60, w = 700, h = 440
      if (edge === 0) { enemy.x = margin + Math.random() * (w - margin * 2); enemy.y = margin }
      else if (edge === 1) { enemy.x = w - margin; enemy.y = margin + Math.random() * (h - margin * 2) }
      else if (edge === 2) { enemy.x = margin + Math.random() * (w - margin * 2); enemy.y = h - margin }
      else { enemy.x = margin; enemy.y = margin + Math.random() * (h - margin * 2) }
      this.enemies.push(enemy)
      this.stage.addChild(enemy)
    }
    this._spawnNext = false
  }

  _makeEnemy(key) {
    const enemy = new Goblin(this.depth)
    if (this.modifier?.enemyHpMult) {
      enemy.stats.hp = Math.round(enemy.stats.hp * this.modifier.enemyHpMult)
      enemy.stats.maxHp = enemy.stats.hp
    }
    if (this.modifier?.enemySpeedMult) {
      enemy.stats.speed = Math.round(enemy.stats.speed * this.modifier.enemySpeedMult)
    }
    return enemy
  }

  tick(deltaSeconds, playerX, playerY, aimAngle) {
    if (this.roomOver) return
    if (this._spawnNext) this._spawnWave()

    this.player.tick(deltaSeconds)

    if (this.player.isAttackReady() && this.enemies.length > 0) {
      this.player.triggerAttack()
      this.player.resetAttackCooldown()
      const attackData = this.player.getAttackData(aimAngle)
      attackData.forEach(a => {
        const p = new Projectile(a)
        this.projectiles.push(p)
        this.stage.addChild(p)
      })
    }

    this.enemies.forEach(e => {
      if (!e.isAlive()) return
      e.tick(deltaSeconds, playerX, playerY)
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

    this.projectiles.forEach(p => p.tick(deltaSeconds))

    const pHits = this.collision.checkProjectilesVsEnemies(this.projectiles, this.enemies)
    pHits.forEach(({ projectile, enemy }) => {
      const hitAngle = Math.atan2(projectile.vy, projectile.vx)
      enemy.takeDamage(projectile.damage, hitAngle)
      if (projectile._hitEnemies) projectile._hitEnemies.add(enemy)
      if (projectile.frostSlow) enemy.slow(1.5)
      if (!projectile.isMelee) projectile.lifetime = 0
      if (!enemy.isAlive()) {
        const goldMult = this.modifier?.goldMult ?? 1
        const gold = Math.round((enemy.goldDrop() + (this.upgradeSystem?.stats.goldBonus || 0)) * goldMult)
        const xp = enemy.stats.xpReward
        enemy.triggerDeath()
        this.dyingEnemies.push(enemy)
        this.onGoldEarned(gold)
        this.onXpEarned(xp)
      }
    })

    const eHits = this.collision.checkEnemyProjectilesVsPlayer(this.projectiles, this.player)
    eHits.forEach(p => {
      const hitAngle = Math.atan2(p.vy, p.vx)
      const prevHp = this.player.stats.hp
      this.player.takeDamage(p.damage, hitAngle)
      if (this.player.stats.hp < prevHp) this.onPlayerHurt?.()
      p.lifetime = 0
    })

    this.projectiles = this.projectiles.filter(p => {
      if (p.isExpired()) { this.stage.removeChild(p); return false }
      return true
    })

    this.enemies = this.enemies.filter(e => e.isAlive())

    // Tick death animations; remove from stage when complete
    this.dyingEnemies = this.dyingEnemies.filter(e => {
      e.tickDeath(deltaSeconds)
      if (e._dyingTimer <= 0) { this.stage.removeChild(e); return false }
      return true
    })

    if (!this.player.isAlive()) {
      this.roomOver = true
      this.onPlayerDeath()
      return
    }

    if (this.enemies.length === 0 && this.dyingEnemies.length === 0 && !this._spawnNext) {
      if (this.currentWave < this.totalWaves) {
        this._spawnNext = true
        this.onWaveCleared(this.currentWave)
      } else {
        this.roomOver = true
        this.onRoomCleared()
      }
    }
  }
}
