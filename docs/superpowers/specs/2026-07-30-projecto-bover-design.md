# Projecto Bover — Game Design Spec
**Date:** 2026-07-30

## Overview
A web-based medieval fantasy roguelite inspired by Archero. Built with PixiJS (frontend) and Node.js + PostgreSQL (backend). Pixel art aesthetic. Playable in browser with no install required. Mobile and desktop supported with adaptive controls.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Renderer | PixiJS v8 |
| Build tool | Vite |
| Backend | Node.js v20 LTS + Express v4 |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) |
| Password | bcrypt |

---

## Project Structure

```
projecto-bover/
├── mobile/                 — PixiJS frontend
│   ├── src/
│   │   ├── core/           — SceneManager, InputManager, AssetLoader, EventBus
│   │   ├── scenes/         — one file per screen
│   │   ├── entities/       — player/, enemies/, Projectile.js
│   │   ├── systems/        — CombatSystem, CollisionSystem, UpgradeSystem, MapSystem
│   │   ├── ui/             — HealthBar, GoldDisplay, UpgradeCard, MapNode
│   │   ├── data/           — classes.js, upgrades.js, enemies.js, items.js
│   │   ├── api/            — player.api.js, run.api.js
│   │   └── main.js
│   ├── assets/
│   │   ├── sprites/
│   │   ├── audio/
│   │   └── fonts/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/         — player.routes.js, run.routes.js
│   │   ├── controllers/    — player.controller.js, run.controller.js
│   │   ├── services/       — player.service.js, run.service.js
│   │   ├── models/         — player.model.js, run.model.js
│   │   ├── middleware/     — auth.middleware.js, error.middleware.js
│   │   ├── db/
│   │   │   ├── connection.js
│   │   │   └── migrations/
│   │   │       ├── 001_create_players.sql
│   │   │       ├── 002_create_meta_upgrades.sql
│   │   │       └── 003_create_runs.sql
│   │   └── app.js
│   ├── server.js
│   └── package.json
│
├── .env
└── .gitignore
```

---

## Classes (Prototype)

### Mage
```
hp: low | speed: high | defense: low
attackSpeed: fast | damage: high
autoAttack: magic projectile, straight line
skill1: Fireball — slow projectile, AOE explosion on hit
skill2: Frost Nova — freezes all nearby enemies briefly
```

### Tank
```
hp: high | speed: slow | defense: high
attackSpeed: slow | damage: medium
autoAttack: sword swing, melee arc
skill1: Shield Bash — short charge forward, stuns enemy
skill2: War Cry — temporary defense boost + pulls enemies closer
```

**5 planned classes total:** Tank, Rogue, Mage, Summoner, Healer

---

## Controls

- **Desktop:** WASD to move, mouse to aim, auto-fire
- **Mobile:** virtual joystick (left thumb), auto-attack when standing still
- Detection via `navigator.maxTouchPoints` on load

---

## Map Design

- 8 nodes, 4 depth layers, connected graph
- Player can backtrack freely through cleared nodes
- Fog of war on unvisited nodes
- **Only one hidden path leads to the Elite node → Boss** — randomized each run
- Player must explore to find it

### Node types
| Icon | Type | Reward |
|---|---|---|
| ⚔️ | Combat | XP, 5–10 gold per enemy |
| 📦 | Chest | Pick 1 of 3 items |
| 💀 | Elite | 15–25 gold + guaranteed rare item |
| 👑 | Boss | 40–60 gold + rare item, run ends |

### Node distribution per depth
- Depth 1–2: always combat
- Depth 3–4: 70% combat, 30% chest
- Depth 5–6: 50% combat, 30% chest, 20% elite
- Depth 7: always elite
- Depth 8: always boss

---

## Difficulty Progression

```
difficultyMultiplier = 1 + (depth - 1) * 0.15
```

| Depth | Multiplier |
|---|---|
| 1 | 1.00x |
| 2 | 1.15x |
| 3 | 1.30x |
| 4 | 1.45x |
| 5 | 1.60x |
| 6 | 1.75x |
| 7 (elite) | 2.00x |
| 8 (boss) | 2.50x |

### Enemy speed scaling (softer)
```
speedMultiplier = 1 + (depth - 1) * 0.08
```

### Wave scaling
- Depth 1–2: 1 wave, 3–4 enemies
- Depth 3–5: 2 waves, 4–6 enemies
- Depth 6+: 3 waves, 5–8 enemies

### Enemy introduction order
| Depth | Enemy |
|---|---|
| 1–2 | Goblin — basic melee, slow |
| 3 | Skeleton Archer — ranged, stationary |
| 4 | Dark Knight — heavy melee, knockback |
| 5–6 | Shadow Mage — ranged magic, moves while shooting |
| 7 | Elite variants — golden tint, 2x HP, extra behavior |
| 8 | Boss — unique, 2 phases |

---

## Upgrade Flow

### Level Up (mid-combat, pauses game)
Pick 1 of 3 class-specific upgrades:

**Mage pool:** Extra Projectile, Burn, Frost Slow, Blink, Chain Lightning, Mana Shield

**Tank pool:** Iron Skin, Counter Strike, Lifesteal, Taunt, Stun Strike, Battle Rush

XP scaling: `baseXP * (1 + level * 0.3)`

### Chest Room (no combat)
Pick 1 of 3 class-agnostic items:

**Attack:** Shadow Blade, Cursed Dagger, Storm Rune, Gold Idol

**Defense:** Amulet of Thorns, Healing Flask, Ward Stone, Eternal Bandage

**Utility:** Swiftboots, Ancient Tome

### Meta Upgrades (between runs, permanent)
Purchased with gold:
- Vitality I / II / III — +10/20/30 starting HP
- Power I / II / III — +5/10/15% base damage
- Swiftness I / II — +5/10% starting speed
- Lucky Find I / II — chests show 4 cards instead of 3
- Gold Rush I / II — +2/4 gold per enemy
- Unlock Tank — costs 50 gold (Mage is free)

---

## Scene Flow

```
BootScene → MainMenuScene → ClassSelectScene → MapScene
  MapScene → CombatScene → (level up) → UpgradeScene (overlay)
  MapScene → ChestScene
  CombatScene (boss) → BossVictoryScene → MetaUpgradeScene
  CombatScene (death) → GameOverScene → MetaUpgradeScene
  MetaUpgradeScene → ClassSelectScene (new run)
```

Run result saved to backend only at GameOverScene or BossVictoryScene — never mid-run.

---

## Database Schema

### players
```sql
CREATE TABLE players (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  gold          INTEGER      DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT NOW(),
  updated_at    TIMESTAMP    DEFAULT NOW()
);
```

### meta_upgrades
```sql
CREATE TABLE meta_upgrades (
  id           SERIAL PRIMARY KEY,
  player_id    INTEGER     REFERENCES players(id) ON DELETE CASCADE,
  upgrade_key  VARCHAR(50) NOT NULL,
  purchased_at TIMESTAMP   DEFAULT NOW(),
  UNIQUE(player_id, upgrade_key)
);
```

### runs
```sql
CREATE TABLE runs (
  id            SERIAL PRIMARY KEY,
  player_id     INTEGER     REFERENCES players(id) ON DELETE CASCADE,
  class         VARCHAR(20) NOT NULL,
  gold_earned   INTEGER     DEFAULT 0,
  rooms_cleared INTEGER     DEFAULT 0,
  depth_reached INTEGER     DEFAULT 0,
  boss_defeated BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMP   DEFAULT NOW()
);
```

---

## API — 6 Endpoints

All responses follow: `{ success: true, data: {} }` or `{ success: false, error: { code, message } }`

```
POST  /api/auth/register       → { player, token }
POST  /api/auth/login          → { player, token }
GET   /api/players/me          → { id, username, gold, meta_upgrades[] }
POST  /api/meta-upgrades       → { upgrade_key, remaining_gold }
POST  /api/runs                → { run, new_total_gold }
GET   /api/runs/me             → { runs: [...] }
```

All routes except auth are protected by JWT middleware.

---

## Environment Variables

```
DATABASE_URL=postgresql://localhost:5432/projecto_bover
JWT_SECRET=your_secret_here
PORT=3000
CLIENT_URL=http://localhost:5173
```
