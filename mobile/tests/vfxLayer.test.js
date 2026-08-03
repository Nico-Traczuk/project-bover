import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('pixi.js', () => {
  const makeScale = () => { const s = { x: 1, y: 1 }; s.set = (v) => { s.x = v; s.y = v }; return s }
  class Container {
    constructor() { this.children = []; this.x = 0; this.y = 0; this.alpha = 1; this.rotation = 0; this.scale = makeScale() }
    addChild(c) { this.children.push(c); return c }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1) }
  }
  class Graphics {
    constructor() { this.x = 0; this.y = 0; this.scale = makeScale() }
    circle() { return this }; fill() { return this }; stroke() { return this }; clear() {}
  }
  class Text {
    constructor({ text, style } = {}) {
      this.text = text ?? ''; this.style = style ?? {}
      this.x = 0; this.y = 0; this.alpha = 1
      this.anchor = { set() {} }
    }
  }
  return { Container, Graphics, Text }
})

import { VFXLayer } from '../src/vfx/VFXLayer.js'

describe('VFXLayer', () => {
  let vfx

  beforeEach(() => { vfx = new VFXLayer() })

  test('spawn damage < 25% gives white label', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    expect(vfx._effects[0].label.style.fill).toBe(0xFFFFFF)
  })

  test('spawn damage 25-50% gives yellow label', () => {
    vfx.spawn('damage', 100, 100, { amount: 3, maxHp: 10 })
    expect(vfx._effects[0].label.style.fill).toBe(0xFFD700)
  })

  test('spawn damage > 50% gives orange-red label', () => {
    vfx.spawn('damage', 100, 100, { amount: 6, maxHp: 10 })
    expect(vfx._effects[0].label.style.fill).toBe(0xFF6B35)
  })

  test('spawn damage adds Text as child', () => {
    vfx.spawn('damage', 100, 100, { amount: 5, maxHp: 10 })
    expect(vfx.children.length).toBe(2) // _gfx + label
  })

  test('tick moves damage label upward', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    const label = vfx._effects[0].label
    const startY = label.y
    vfx.tick(0.4)
    expect(label.y).toBeLessThan(startY)
  })

  test('tick fades damage label alpha after 0.5s', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    const label = vfx._effects[0].label
    vfx.tick(0.6)
    expect(label.alpha).toBeLessThan(1)
  })

  test('tick removes expired damage effect and its label', () => {
    vfx.spawn('damage', 100, 100, { amount: 2, maxHp: 10 })
    vfx.tick(0.9)
    expect(vfx._effects.length).toBe(0)
    expect(vfx.children.length).toBe(1) // only _gfx remains
  })

  test('spawn impact adds effect entry', () => {
    vfx.spawn('impact', 50, 50, null)
    expect(vfx._effects[0].type).toBe('impact')
  })

  test('tick removes impact after 0.12s', () => {
    vfx.spawn('impact', 50, 50, null)
    vfx.tick(0.13)
    expect(vfx._effects.length).toBe(0)
  })

  test('spawn levelup adds effect entry', () => {
    vfx.spawn('levelup', 225, 262, null)
    expect(vfx._effects[0].type).toBe('levelup')
  })

  test('tick removes levelup after 0.4s', () => {
    vfx.spawn('levelup', 225, 262, null)
    vfx.tick(0.41)
    expect(vfx._effects.length).toBe(0)
  })
})
