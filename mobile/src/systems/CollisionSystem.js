function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy < (ar + br) * (ar + br)
}

export class CollisionSystem {
  // Returns array of { projectile, enemy } collision pairs
  checkProjectilesVsEnemies(projectiles, enemies) {
    const hits = []
    projectiles.forEach(p => {
      if (p.isEnemyProjectile) return
      enemies.forEach(e => {
        if (!e.isAlive()) return
        if (p._hitEnemies?.has(e)) return
        if (circlesOverlap(p.x, p.y, p.radius, e.x, e.y, 16)) {
          hits.push({ projectile: p, enemy: e })
        }
      })
    })
    return hits
  }

  // Returns array of enemy projectiles that hit the player
  checkEnemyProjectilesVsPlayer(projectiles, player) {
    return projectiles.filter(p => {
      if (!p.isEnemyProjectile || p.isMelee) return false
      return circlesOverlap(p.x, p.y, p.radius, player.x, player.y, 16)
    })
  }
}
