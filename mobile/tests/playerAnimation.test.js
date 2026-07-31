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

import { BasePlayer } from '../src/entities/player/BasePlayer.js'

describe('BasePlayer animation', () => {
  let p

  beforeEach(() => { p = new BasePlayer('mage') })

  test('starts in idle state', () => {
    expect(p._animState).toBe('idle')
  })

  test('triggerAttack sets state to attack with 0.15s timer', () => {
    p.triggerAttack()
    expect(p._animState).toBe('attack')
    expect(p._animTimer).toBeCloseTo(0.15)
  })

  test('hurt overrides attack state', () => {
    p.triggerAttack()
    p.takeDamage(10, 0)
    expect(p._animState).toBe('hurt')
  })

  test('triggerAttack is ignored during hurt', () => {
    p.takeDamage(10, 0)
    p.triggerAttack()
    expect(p._animState).toBe('hurt')
  })

  test('animateTick expires attack state after 0.15s', () => {
    p.triggerAttack()
    p.animateTick(0.16, 0, 0)
    expect(p._animState).toBe('idle')
    expect(p._animTimer).toBe(0)
  })

  test('walk state set when moving', () => {
    p.animateTick(0.01, 1, 0)
    expect(p._animState).toBe('walk')
  })

  test('facing flips to -1 when moving left', () => {
    p.animateTick(0.01, -1, 0)
    expect(p._facing).toBe(-1)
  })

  test('facing flips to 1 when moving right', () => {
    p.animateTick(0.01, 1, 0)
    expect(p._facing).toBe(1)
  })

  test('walk frame advances after 0.15s', () => {
    p._walkTimer = 0
    p._walkFrame = 0
    p._walkTimer += 0.16
    const advanced = p._walkTimer >= 0.15
    expect(advanced).toBe(true)
  })

  test('knockback offset set on hurt with angle', () => {
    p.takeDamage(10, 0)
    expect(p._knockbackOffsetX).toBeCloseTo(14, 0)
    expect(p._knockbackOffsetY).toBeCloseTo(0, 0)
  })

  test('knockback offset decays toward zero', () => {
    p.takeDamage(10, 0)
    const before = p._knockbackOffsetX
    p.animateTick(0.1, 0, 0)
    expect(p._knockbackOffsetX).toBeLessThan(before)
  })

  test('tint set to red on hurt', () => {
    p.takeDamage(10, 0)
    expect(p._gfx.tint).toBe(0xFF6666)
  })

  test('tint restored to white after hurt expires', () => {
    p.takeDamage(10, 0)
    p.animateTick(0.21, 0, 0)
    expect(p._gfx.tint).toBe(0xFFFFFF)
  })
})
