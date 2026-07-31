import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
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

describe('BaseEnemy animation', () => {
  let e

  beforeEach(() => { e = new BaseEnemy('goblin', 1) })

  test('starts in idle state', () => {
    expect(e._animState).toBe('idle')
  })

  test('tint set to red on takeDamage', () => {
    e.takeDamage(5, Math.PI)
    expect(e._gfx.tint).toBe(0xFF6666)
  })

  test('hurt state set on takeDamage', () => {
    e.takeDamage(5, Math.PI)
    expect(e._animState).toBe('hurt')
  })

  test('knockback offset set from angle on takeDamage', () => {
    e.takeDamage(5, 0)
    expect(e._knockbackOffsetX).toBeCloseTo(14, 0)
  })

  test('tint restored after hurt timer expires', () => {
    e.takeDamage(5, 0)
    e._animateTick(0.21, 0, 0)
    expect(e._gfx.tint).toBe(0xFFFFFF)
  })

  test('_lastMoveX/Y updated during chase tick', () => {
    e.x = 0; e.y = 0
    e.tick(0.016, 100, 0)
    expect(e._lastMoveX).toBeGreaterThan(0)
  })

  test('facing flips when moving left', () => {
    e._animateTick(0.016, -1, 0)
    expect(e._facing).toBe(-1)
  })
})
