# Camera + Scrollable World Redesign

**Date:** 2026-08-04

## Goal

Replace the fixed 450×800 letterboxed canvas with a full-screen responsive canvas and a scrollable 450×1400 world. The camera follows the player in both prep (BattlefieldScene) and combat (WaveScene), giving an Archero-style feel where the world is larger than the visible viewport.

## Problems Solved

1. **Black bars** — Canvas was letterboxed inside the phone screen due to `Math.min` scaling.
2. **World too small** — The entire battlefield was visible at once; no sense of scale or exploration.
3. **Structure slot buttons not tappable** — No `eventMode` or pointer events wired up.

## Architecture

### Canvas + Scale

`main.js` initializes PixiJS at `window.innerWidth × window.innerHeight`. The stage scales uniformly by `window.innerWidth / 450` so all game logic uses the same logical 450-wide coordinate system. No letterboxing — canvas fills the full phone screen edge to edge.

```js
const WORLD_W = 450
const scale = window.innerWidth / WORLD_W

await app.init({ width: window.innerWidth, height: window.innerHeight, ... })
app.stage.scale.set(scale)
```

On window resize, re-scale the stage and update viewport height.

The `inputManager.init()` call is updated to pass `WORLD_W` and `viewportH` (not WORLD_H) so joystick and touch stay in screen space.

### World Dimensions

```
WORLD_W = 450   (logical units, same as before)
WORLD_H = 1400  (logical units, tunable constant)
```

Viewport height in logical units: `viewportH = window.innerHeight / scale = WORLD_W * (innerHeight / innerWidth)`

On a 720×1520 phone: `viewportH ≈ 950` — player sees ~950 of 1400 units at a time.

### World Layout (Y coordinates)

```
Y    0 –   15  →  Monster spawn zone (red band at very top)
Y   15 –  900  →  Open battlefield (paths, open ground)
Y  900 – 1100  →  Structure slots (Tower, Gate, Shrine)
Y 1100 – 1200  →  Castle wall (CASTLE_Y = 1100, CASTLE_H = 100)
Y 1200 – 1400  →  Below castle (out-of-bounds for player)

Player spawn:   x=225, y=600
SPAWN_POSITIONS: y=10 (same x positions as before)
```

### Camera System

Both scenes use identical camera logic. A `_worldContainer` (PixiJS Container) holds all world objects — background, paths, castle, player, enemies, projectiles, VFX. The HUD is added directly to the scene (not to `_worldContainer`) so it stays fixed.

Camera update every tick:

```js
const viewportH = sceneManager.viewportH   // logical units
const cameraY = Math.min(0, Math.max(viewportH - WORLD_H, viewportH / 2 - this._player.y))
this._worldContainer.y = cameraY
```

- Camera centers player vertically.
- Clamps at top: `cameraY <= 0` (never shows above world top).
- Clamps at bottom: `cameraY >= viewportH - WORLD_H` (never shows below world bottom).

### Aim Coordinate Fix

`WaveScene._getAimAngle()` currently uses raw mouse screen coordinates. With the camera offset, world-space Y = screen-Y − cameraY:

```js
const mx = inputManager.mouseWorld.x
const my = inputManager.mouseWorld.y - this._worldContainer.y
return Math.atan2(my - this._player.y, mx - this._player.x)
```

### Structure Slot Tap Events (BattlefieldScene)

Structure slots and the merchant marker are upgraded from decorative graphics to interactive containers with `eventMode = 'static'`. Each slot shows a label and fires a callback on `pointerup`. For this spec, tapping logs the slot name and shows a placeholder tooltip — full purchase UI is Plan 3/4 scope.

## SceneManager Changes

`sceneManager` stores `viewportH` (in logical units) so scenes don't need to recalculate it:

```js
sceneManager.viewportH  // updated on resize
```

## File Map

| File | Change |
|------|--------|
| `mobile/src/main.js` | Fill-screen canvas, stage scale, expose viewportH via sceneManager |
| `mobile/src/core/SceneManager.js` | Add `viewportH` property |
| `mobile/src/scenes/BattlefieldScene.js` | New world coords, `_worldContainer`, camera tick, interactive structure slots |
| `mobile/src/scenes/WaveScene.js` | New world coords, `_worldContainer`, camera tick, aim coord fix |
| `mobile/src/systems/WaveSystem.js` | Update `CASTLE_Y` constant to `1100` |

## Constants Summary

```js
// main.js
WORLD_W = 450

// BattlefieldScene.js + WaveScene.js
WORLD_H   = 1400
CASTLE_Y  = 1100
CASTLE_H  = 100
PLAYER_SPAWN = { x: 225, y: 600 }
SPAWN_POSITIONS = [
  { x: 150, y: 10 }, { x: 300, y: 10 },
  { x:  80, y: 10 }, { x: 370, y: 10 },
]
```

## Out of Scope

- Actual purchase UI for structure slots (Plan 3/4)
- Per-biome world backgrounds / tilesets
- World width scrolling (camera only follows Y)
- Variable WORLD_H per biome
