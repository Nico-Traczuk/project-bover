# Wave Defense Redesign — Game Design Spec
**Date:** 2026-08-03

## Overview

Projecto Bover pivots from a roguelite room-to-room exploration model to a **wave defense arena** where the player defends a medieval castle on a single persistent battlefield. The player character is the primary defender — fast, powerful, doing 80%+ of the work — while the castle provides HP stakes and optional structural support unlocked through meta-progression.

The core motivation is two-layered: survive the wave run, and grow both yourself and your castle between runs. The castle visually evolves over multiple runs as you invest gold into it.

---

## Core Loop

```
PREP PHASE (free roam, no time limit)
    Walk to castle structure spots → restore / upgrade (spend gold)
    Walk to merchant NPC → buy hero passives, weapons, active skills
    Choose 2 active skills to equip for this run
    [START WAVE] → player decides when combat begins

COMBAT PHASE (waves 1–15, automatic, relentless)
    Waves run on a hidden timer — kill all enemies early = next wave starts sooner
    Timer expires with enemies alive = next wave spawns anyway (double wave pressure)
    Chests spawn mid-combat at fixed waves — grab while fighting
    Level up mid-wave → pick 1 of 3 upgrade cards (game pauses briefly)
    Castle structures assist (tower shoots, gate slows, shrine heals)
    Castle HP depletes if enemies reach it — castle death = run over

RUN ENDS (death or boss kill)
    Return to PREP PHASE
    Spend accumulated gold
    Start next run
```

---

## Map & Battlefield

The battlefield is a vertical arena — enemies spawn at the top, the castle sits at the bottom. The player roams the open field between them, intercepting enemies on 1–2 paths.

```
         ENEMY SPAWN ZONE (top)
                │
      PATH 1        PATH 2
        ↓              ↓
        ↓   [open field — player roams here]
        ↓              ↓
     [SLOT A]       [SLOT B]     ← castle structure slots
        ↓              ↓
    ████████[🏰 CASTLE]████████
             [HP bar]
              [SLOT C]           ← third structure slot (e.g. healing shrine)
```

- **1 path by default.** A second path opens when the player buys a gate for the second slot — more pressure but more defense too.
- **3 structure slots** on the field. Slots are empty (nothing visible) until the player buys a structure. Once purchased, the structure is present every run.
- **Merchant NPC** is located inside the castle — the player walks into the castle base to access hero upgrades.
- **Chests** spawn at fixed positions on the open field mid-combat during specific waves.

---

## Biomes

3 biomes, each with a distinct visual theme and enemy flavor. The castle and its meta-purchased structures always appear — only the backdrop and enemy palette change.

| Biome | Setting | Enemy Flavor | Boss |
|---|---|---|---|
| Forest | Green paths, trees as walls | Goblins, wolves, archers | Forest Witch |
| Dungeon | Stone corridors, torchlight | Skeletons, dark knights, liches | Lich King |
| Inferno | Cracked earth, lava edges | Demons, fire mages, titans | Demon Lord |

Biomes are unlocked progressively — Forest is available from the start. Dungeon unlocks after defeating the Forest Witch. Inferno unlocks after defeating the Lich King.

---

## Wave Structure

Each biome run is 15 waves with 2 elite encounters and 1 boss. Waves flow automatically on a hidden timer.

```
Wave  1 │ Normal
Wave  2 │ Normal
Wave  3 │ Normal + 📦 Chest spawns mid-wave
Wave  4 │ Normal
Wave  5 │ ⚔️  ELITE #1
Wave  6 │ Normal
Wave  7 │ Normal + 📦 Chest spawns mid-wave
Wave  8 │ Normal
Wave  9 │ Normal
Wave 10 │ ⚔️  ELITE #2 + 📦 Guaranteed chest drop on kill
Wave 11 │ Normal
Wave 12 │ Normal + 📦 Chest spawns mid-wave
Wave 13 │ Normal
Wave 14 │ Normal
Wave 15 │ 👑  MAIN BOSS
```

**4 chests per run guaranteed:** waves 3, 7, elite #2 kill drop, wave 12.

Chest contents are **temporary** — in-run boosts only. Lost on death. They do not count toward gold or meta-progression.

---

## Wave Composition

Enemies **accumulate across waves** — newly introduced types join the pool but old types never disappear. Each wave highlights a main enemy type while mixing in all previously introduced ones.

```
Wave  1–2  │ Goblins only
Wave  3    │ + Skeletons introduced — 📦 chest
Wave  4    │ + Bone Archers introduced
Wave  5    │ Goblin / Skeleton / Archer mix — ⚔️ ELITE #1
Wave  6    │ Full mix continues
Wave  7    │ Archer-heavy wave — 📦 chest
Wave  9    │ + Dark Knights introduced
Wave 10    │ All above — ⚔️ ELITE #2 + 📦 chest drop
Wave 12    │ + Shadow Mages introduced — 📦 chest
Wave 13–14 │ + Stone Trolls + Wraiths — full late-game pressure
Wave 15    │ 👑 MAIN BOSS
```

---

## Enemy Roster

7 enemy types with distinct attack styles, introduced progressively.

| Enemy | Type | Behavior | Introduced |
|---|---|---|---|
| Goblin | Melee | Fast, low HP, swarms the player | Wave 1 |
| Skeleton | Melee | Medium HP, slow, consistent pressure | Wave 3 |
| Bone Archer | Ranged | Stationary, shoots from distance | Wave 4 |
| Dark Knight | Heavy melee | High HP, knockback on hit | Wave 9 |
| Shadow Mage | Ranged magic | Moves while shooting, unpredictable | Wave 12 |
| Stone Troll | AOE | Very high HP, slow, AOE ground slam — castle threat | Wave 13 |
| Wraith | Phasing | Fast, ignores gates, passes through structures | Wave 14 |

### Enemy Scaling Per Wave

Stats and gold drops scale progressively across waves:

| Stat | Formula |
|---|---|
| HP | `baseHP × (1 + wave × 0.12)` |
| Damage | `baseDMG × (1 + wave × 0.10)` |
| Gold drop | `baseGold × (1 + wave × 0.08)` |

Late waves are harder but more rewarding. A wave 14 Stone Troll drops meaningful gold.

### Gold Per Kill (base values)

| Enemy | Base Gold |
|---|---|
| Goblin | 3–4g |
| Skeleton | 4–5g |
| Bone Archer | 4–6g |
| Dark Knight | 6–8g |
| Shadow Mage | 7–9g |
| Stone Troll | 10–13g |
| Wraith | 8–10g |
| Elite | 25–40g |
| Main Boss | 60–80g |

---

## Boss & Elite Roster

3 biomes × 2 elites + 1 boss = 9 total special encounters.

| Biome | Elite #1 (Wave 5) | Elite #2 (Wave 10) | Main Boss (Wave 15) |
|---|---|---|---|
| Forest | Alpha Wolf | Goblin Warchief | Forest Witch |
| Dungeon | Dark Knight Champion | Bone Colossus | Lich King |
| Inferno | Fire Demon | Infernal Titan | Demon Lord |

All bosses have 2 phases. Main bosses drop the most gold in the game.

---

## Castle System

The castle sits at the bottom of the battlefield and has its own HP bar. If the castle HP reaches 0, the run ends regardless of the player's HP.

**Castle HP:** starts at 300. Meta upgrade "Fortify" increases this.

**3 Structure Slots** — each slot has a fixed location on the battlefield. Slots are empty until purchased. Once bought, the structure persists across all future runs.

| Structure | Slot | What it does |
|---|---|---|
| Arrow Tower | Right path | Auto-shoots nearest enemy, scaling damage |
| Iron Gate | Left path | Slows enemies that pass through it, unlocks 2nd path |
| Healing Shrine | Near castle base | Heals player 5 HP per second when standing near castle |

Each structure has up to 3 levels, purchased at the structure's map location during prep phase. Walk to the location → interact → spend gold.

---

## Hero Progression

### In-Run (temporary — lost on death)

**Level-up cards:** On leveling up, the game pauses and the player picks 1 of 3 class-specific upgrade cards. These boost the player for the current run only.

**Chest contents:** Each chest opened mid-wave offers 1 of 3 temporary boosts — attack speed, movement speed, damage multiplier, shield, etc.

---

### Meta-Progression (permanent — bought with gold at merchant)

#### Hero Passives

| Upgrade | Lvl 1 | Lvl 2 | Lvl 3 |
|---|---|---|---|
| Vitality (+HP) | 20g | 50g | 100g |
| Power (+dmg %) | 25g | 60g | 120g |
| Swiftness (+speed) | 20g | 50g | — |
| Gold Rush (+gold/kill) | 30g | 70g | — |
| Lucky Find (better chest options) | 40g | — | — |

#### Weapons (high cost — major commitment)

One weapon equipped at a time. Buying a new weapon replaces the current one.

| Weapon | Cost | Effect |
|---|---|---|
| Long Sword | 120g | +15% melee range |
| Battle Axe | 150g | Swing hits 2 enemies simultaneously |
| Crossbow | 140g | Adds ranged auto-attack (Tank class) |
| Spell Tome | 130g | Adds extra projectile (Mage class) |
| Poison Dagger | 110g | Attacks apply poison DoT |
| War Hammer | 160g | Slower attacks but stuns enemy on hit |

#### Active Skills

Each class has a pool of 4 purchasable active skills. The player buys them permanently at the merchant, then **equips 2 of their owned skills during prep phase** before each run. Different 2-skill combos create distinct playstyles.

**Mage Skill Pool:**
| Skill | Cost | Effect |
|---|---|---|
| Fireball | 80g | Slow AOE projectile, explodes on impact |
| Frost Nova | 90g | Freezes all nearby enemies briefly |
| Chain Lightning | 110g | Bounces between 3 enemies |
| Mana Shield | 100g | Absorbs next hit, 10s cooldown |

**Tank Skill Pool:**
| Skill | Cost | Effect |
|---|---|---|
| Shield Bash | 80g | Short charge, stuns enemy on contact |
| War Cry | 90g | Pulls nearby enemies, temp defense boost |
| Ground Slam | 100g | AOE melee, damages all in radius |
| Battle Rush | 110g | Dash through enemies dealing damage |

---

## Castle Meta-Upgrades

Bought at castle structure locations during prep phase. Progressive cost.

| Upgrade | Slot | Lvl 1 | Lvl 2 | Lvl 3 |
|---|---|---|---|---|
| Arrow Tower | Right path | 50g | 100g | 180g |
| Iron Gate | Left path | 40g | 90g | — |
| Healing Shrine | Near castle | 60g | 120g | — |
| Fortify (castle HP) | Castle | 45g | 95g | 160g |

---

## Prep Phase Detail

The prep phase is the only breathing room in the game. It has no time limit — the player explores the battlefield freely and starts waves when ready.

**What the player can do during prep:**
1. Walk to **castle structure spots** → interact to build or upgrade (spend gold)
2. Walk into the **castle base** → access merchant NPC → buy hero passives, weapons, unlock active skills
3. At the **start of each run** (not mid-run), the merchant NPC offers a **skill equip panel** → choose 2 active skills from your owned pool to use this run
4. Press **[START WAVE]** when ready

Structure slots are always visible on the map. Empty slots show a ruin or placeholder. Owned structures show their current level and condition. The player reads the battlefield state at a glance.

---

## Scene Flow

New scene flow replacing the existing MapScene-based navigation:

```
BootScene → MainMenuScene → ClassSelectScene → BiomeSelectScene
  BiomeSelectScene → BattlefieldScene (prep phase)
    BattlefieldScene → [START WAVE] → WaveScene (combat)
    WaveScene → UpgradeScene (level up overlay, pauses game)
    WaveScene → ChestScene (overlay when chest opened, pauses game)
    WaveScene (wave 15 boss dead) → BossVictoryScene → BattlefieldScene (prep)
    WaveScene (player/castle death) → GameOverScene → BattlefieldScene (prep)
```

**Scenes removed:** MapScene, ChestScene (standalone), BossVictoryScene (becomes overlay or brief screen before returning to prep)

**Scenes added:** BiomeSelectScene, BattlefieldScene (replaces MapScene as the hub)

---

## Database Schema Changes

### New columns on `players`

```sql
ALTER TABLE players ADD COLUMN castle_hp_level INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN equipped_weapon VARCHAR(50) DEFAULT NULL;
ALTER TABLE players ADD COLUMN active_skill_1 VARCHAR(50) DEFAULT NULL;
ALTER TABLE players ADD COLUMN active_skill_2 VARCHAR(50) DEFAULT NULL;
```

### New `castle_structures` table

```sql
CREATE TABLE castle_structures (
  id           SERIAL PRIMARY KEY,
  player_id    INTEGER     REFERENCES players(id) ON DELETE CASCADE,
  structure    VARCHAR(50) NOT NULL,  -- 'arrow_tower', 'iron_gate', 'healing_shrine'
  level        INTEGER     DEFAULT 1,
  purchased_at TIMESTAMP   DEFAULT NOW(),
  UNIQUE(player_id, structure)
);
```

### Updated `runs` table

```sql
ALTER TABLE runs ADD COLUMN biome VARCHAR(20) DEFAULT 'forest';
ALTER TABLE runs ADD COLUMN waves_survived INTEGER DEFAULT 0;
ALTER TABLE runs ADD COLUMN castle_hp_remaining INTEGER DEFAULT 0;
ALTER TABLE runs ADD COLUMN elites_defeated INTEGER DEFAULT 0;
```

---

## Classes

5 classes planned. Mage and Tank are built. Each class has its own active skill pool and weapon affinities.

| Class | HP | Speed | Defense | Attack Style |
|---|---|---|---|---|
| Mage | Low | High | Low | Magic projectiles |
| Tank | High | Slow | High | Melee arc |
| Rogue | Medium | Very High | Low | Fast melee + daggers |
| Summoner | Low | Medium | Low | Minions |
| Healer | Medium | Medium | Medium | Support + ranged |
