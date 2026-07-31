import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
  }
  class Graphics {
    constructor() { this.x = 0; this.y = 0; this.scale = makeScale() }
    rect() { return this }; circle() { return this }; fill() { return this }; stroke() { return this }; clear() {}
  }
  return { Container, Graphics, Assets: { get: () => null } }
})

import { Projectile } from '../src/entities/Projectile.js'

const makeProjectile = (overrides = {}) => new Projectile({
  x: 100, y: 100, angle: 0, damage: 10, speed: 200,
  color: 0x818CF8, radius: 6, ...overrides,
})

describe('Projectile trail', () => {
  test('_trail starts empty', () => {
    const p = makeProjectile()
    expect(p._trail).toEqual([])
  })

  test('_trail records position after first tick', () => {
    const p = makeProjectile()
    p.tick(0.016)
    expect(p._trail.length).toBe(1)
    expect(p._trail[0]).toHaveProperty('x')
    expect(p._trail[0]).toHaveProperty('y')
  })

  test('_trail is capped at 6 entries', () => {
    const p = makeProjectile()
    for (let i = 0; i < 10; i++) p.tick(0.016)
    expect(p._trail.length).toBeLessThanOrEqual(6)
  })

  test('trail records position before moving', () => {
    const p = makeProjectile()
    const startX = p.x
    p.tick(0.016)
    expect(p._trail[0].x).toBeCloseTo(startX, 0)
  })
})

describe('Projectile rotation', () => {
  test('player projectile rotates positively', () => {
    const p = makeProjectile()
    expect(p.rotationSpeed).toBeGreaterThan(0)
    p.tick(0.016)
    expect(p.rotation).toBeGreaterThan(0)
  })

  test('enemy projectile rotates negatively', () => {
    const p = makeProjectile({ isEnemyProjectile: true })
    expect(p.rotationSpeed).toBeLessThan(0)
    p.tick(0.016)
    expect(p.rotation).toBeLessThan(0)
  })

  test('color is exposed on instance', () => {
    const p = makeProjectile({ color: 0xFF4444 })
    expect(p.color).toBe(0xFF4444)
  })
})
