import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1) }
  }
  class Sprite {
    constructor(tex) { this.texture = tex; this.x = 0; this.y = 0; this.scale = makeScale(); this.anchor = { set() {} }; this.tint = 0xFFFFFF }
  }
  class Graphics {
    constructor() { this.x = 0; this.y = 0; this.tint = 0xFFFFFF; this.scale = makeScale() }
    rect() { return this }; circle() { return this }; fill() { return this }; stroke() { return this }; clear() {}
  }
  class Texture { constructor(o) { this.opts = o } }
  class Rectangle { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h } }
  return { Container, Sprite, Graphics, Texture, Rectangle, Assets: { get: () => null } }
})

import { BaseEnemy } from '../src/entities/enemies/BaseEnemy.js'

describe('BaseEnemy spawn pop-in', () => {
  let e

  beforeEach(() => { e = new BaseEnemy('goblin', 1) })

  test('_spawnTimer initialised to 0.3', () => {
    expect(e._spawnTimer).toBeCloseTo(0.3)
  })

  test('scale is 0 at construction before first tick', () => {
    expect(e._gfx.scale.x).toBe(0)
    expect(e._gfx.scale.y).toBe(0)
  })

  test('_spawnTimer reaches 0 after 0.3s of ticking', () => {
    for (let i = 0; i < 20; i++) e.tick(0.016, 50, 50)
    expect(e._spawnTimer).toBeLessThanOrEqual(0)
  })

  test('scale.y is BASE_SCALE after pop-in completes', () => {
    for (let i = 0; i < 25; i++) e.tick(0.016, 50, 50)
    expect(e._gfx.scale.y).toBeCloseTo(3, 0)
  })
})

describe('BaseEnemy idle breathing', () => {
  let e

  beforeEach(() => {
    e = new BaseEnemy('goblin', 1)
    // Complete the spawn pop-in first
    for (let i = 0; i < 25; i++) e.tick(0.016, 50, 50)
  })

  test('_idleTimer starts at 0', () => {
    expect(e._idleTimer).toBe(0)
  })

  test('_idleTimer increments when idle', () => {
    e.x = 50; e.y = 50
    e._animateTick(0.1, 0, 0)
    expect(e._idleTimer).toBeGreaterThan(0)
  })

  test('_idleTimer resets when moving', () => {
    e.x = 50; e.y = 50
    e._animateTick(0.1, 0, 0)
    e._animateTick(0.1, 1, 0)
    expect(e._idleTimer).toBe(0)
  })
})
