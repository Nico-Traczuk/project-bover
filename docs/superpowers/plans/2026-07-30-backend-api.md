# Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Projecto Bover backend REST API — auth, player profile, meta upgrades, and run tracking — with PostgreSQL persistence.

**Architecture:** Express REST API with strict layered architecture: routes define endpoints only, controllers handle HTTP only, services contain all business logic, models touch the database only. Nothing bleeds between layers. JWT protects all routes except auth.

**Tech Stack:** Node.js v20, Express v4, PostgreSQL, pg, jsonwebtoken, bcrypt, dotenv, cors, Jest, Supertest

---

## File Map

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.routes.js           — POST /register, POST /login
│   │   ├── player.routes.js         — GET /me
│   │   ├── metaUpgrade.routes.js    — POST /
│   │   └── run.routes.js            — POST /, GET /me
│   ├── controllers/
│   │   ├── auth.controller.js       — register, login handlers
│   │   ├── player.controller.js     — getMe handler
│   │   ├── metaUpgrade.controller.js — purchase handler
│   │   └── run.controller.js        — saveRun, getHistory handlers
│   ├── services/
│   │   ├── auth.service.js          — register/login logic + JWT signing
│   │   ├── player.service.js        — getProfile (player + upgrades in one query)
│   │   ├── metaUpgrade.service.js   — purchaseUpgrade with gold deduction
│   │   └── run.service.js           — saveRun (run + gold update atomically)
│   ├── models/
│   │   ├── player.model.js          — createPlayer, findByEmail, findById, addGold, deductGold
│   │   ├── metaUpgrade.model.js     — findByPlayerId, purchase
│   │   └── run.model.js             — createRun, findByPlayerId
│   ├── middleware/
│   │   ├── auth.middleware.js       — JWT verification, sets req.playerId
│   │   └── error.middleware.js      — global error → { success, error } shape
│   ├── db/
│   │   ├── connection.js            — pg Pool singleton
│   │   ├── migrate.js               — runs all migration files in order
│   │   └── migrations/
│   │       ├── 001_create_players.sql
│   │       ├── 002_create_meta_upgrades.sql
│   │       └── 003_create_runs.sql
│   └── app.js                       — Express setup, routes mounted, error middleware last
├── tests/
│   ├── env.js                       — loads .env.test before any module import
│   ├── setup.js                     — cleans DB between tests, closes pool after all
│   ├── auth.test.js
│   ├── player.test.js
│   ├── metaUpgrade.test.js
│   └── run.test.js
├── server.js                        — entry point, starts HTTP server
├── package.json
├── .env.example
└── .env.test                        — test DB credentials (not committed)
```

---

## Task 1: Project Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/.env.test`
- Create: `backend/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "projecto-bover-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node src/db/migrate.js",
    "test": "jest --runInBand",
    "test:watch": "jest --watch --runInBand"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.4",
    "supertest": "^7.0.0"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFiles": ["./tests/env.js"],
    "setupFilesAfterEnv": ["./tests/setup.js"],
    "testTimeout": 10000
  }
}
```

- [ ] **Step 2: Create .env.example**

```
DATABASE_URL=postgresql://localhost:5432/projecto_bover
JWT_SECRET=change_me_to_a_long_random_string
PORT=3000
CLIENT_URL=http://localhost:5173
```

- [ ] **Step 3: Create .env.test** (use your local Postgres credentials)

```
DATABASE_URL=postgresql://localhost:5432/projecto_bover_test
JWT_SECRET=test_secret_key_not_for_production
PORT=3001
CLIENT_URL=http://localhost:5173
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
.env
.env.test
```

- [ ] **Step 5: Create the full folder structure**

Run:
```bash
cd backend && mkdir -p src/routes src/controllers src/services src/models src/middleware src/db/migrations tests
```

- [ ] **Step 6: Install dependencies**

Run:
```bash
cd backend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Create the test and production databases in PostgreSQL**

Run:
```bash
psql -U postgres -c "CREATE DATABASE projecto_bover;"
psql -U postgres -c "CREATE DATABASE projecto_bover_test;"
```

Expected: `CREATE DATABASE` output for each. If you use a different Postgres user, replace `postgres` with your username.

- [ ] **Step 8: Commit**

```bash
cd backend && git init && git add package.json .env.example .gitignore && git commit -m "feat: backend project setup"
```

---

## Task 2: Database Connection + Migrations

**Files:**
- Create: `backend/src/db/connection.js`
- Create: `backend/src/db/migrate.js`
- Create: `backend/src/db/migrations/001_create_players.sql`
- Create: `backend/src/db/migrations/002_create_meta_upgrades.sql`
- Create: `backend/src/db/migrations/003_create_runs.sql`

- [ ] **Step 1: Create connection.js**

```javascript
// backend/src/db/connection.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

module.exports = pool;
```

- [ ] **Step 2: Create 001_create_players.sql**

```sql
CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  gold          INTEGER      DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT NOW(),
  updated_at    TIMESTAMP    DEFAULT NOW()
);
```

- [ ] **Step 3: Create 002_create_meta_upgrades.sql**

```sql
CREATE TABLE IF NOT EXISTS meta_upgrades (
  id           SERIAL PRIMARY KEY,
  player_id    INTEGER      REFERENCES players(id) ON DELETE CASCADE,
  upgrade_key  VARCHAR(50)  NOT NULL,
  purchased_at TIMESTAMP    DEFAULT NOW(),
  UNIQUE(player_id, upgrade_key)
);
```

- [ ] **Step 4: Create 003_create_runs.sql**

```sql
CREATE TABLE IF NOT EXISTS runs (
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

- [ ] **Step 5: Create migrate.js**

```javascript
// backend/src/db/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running: ${file}`);
    await pool.query(sql);
  }

  console.log('Migrations complete');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 6: Run migrations on both databases**

```bash
cd backend && npm run migrate
DATABASE_URL=postgresql://localhost:5432/projecto_bover_test node src/db/migrate.js
```

Expected output for each:
```
Running: 001_create_players.sql
Running: 002_create_meta_upgrades.sql
Running: 003_create_runs.sql
Migrations complete
```

- [ ] **Step 7: Commit**

```bash
git add src/db/ && git commit -m "feat: database connection and migrations"
```

---

## Task 3: Express App Shell + Error Middleware

**Files:**
- Create: `backend/src/middleware/error.middleware.js`
- Create: `backend/src/app.js`
- Create: `backend/server.js`

- [ ] **Step 1: Create error.middleware.js**

```javascript
// backend/src/middleware/error.middleware.js
function errorMiddleware(err, req, res, next) {
  const status  = err.status  || 500;
  const code    = err.code    || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong';

  res.status(status).json({
    success: false,
    error: { code, message }
  });
}

module.exports = errorMiddleware;
```

- [ ] **Step 2: Create app.js** (routes mounted here as they are created in later tasks)

```javascript
// backend/src/app.js
const express = require('express');
const cors    = require('cors');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Routes mounted here as they are built
// app.use('/api/auth',          require('./routes/auth.routes'));
// app.use('/api/players',       require('./routes/player.routes'));
// app.use('/api/meta-upgrades', require('./routes/metaUpgrade.routes'));
// app.use('/api/runs',          require('./routes/run.routes'));

app.use(errorMiddleware);

module.exports = app;
```

- [ ] **Step 3: Create server.js**

```javascript
// backend/server.js
require('dotenv').config();
const app  = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 4: Verify server starts**

Run:
```bash
cd backend && cp .env.example .env && node server.js
```

Expected: `Server running on port 3000`

Stop the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/app.js src/middleware/ server.js && git commit -m "feat: express app shell and error middleware"
```

---

## Task 4: Test Infrastructure

**Files:**
- Create: `backend/tests/env.js`
- Create: `backend/tests/setup.js`

- [ ] **Step 1: Create tests/env.js**

This file runs before any module is imported by Jest, ensuring the test database URL is set before `connection.js` creates the Pool.

```javascript
// backend/tests/env.js
require('dotenv').config({ path: '.env.test' });
```

- [ ] **Step 2: Create tests/setup.js**

```javascript
// backend/tests/setup.js
const db = require('../src/db/connection');

afterEach(async () => {
  await db.query('DELETE FROM runs');
  await db.query('DELETE FROM meta_upgrades');
  await db.query('DELETE FROM players');
});

afterAll(async () => {
  await db.end();
});
```

- [ ] **Step 3: Verify Jest can connect to the test DB**

Create a temporary test file `backend/tests/ping.test.js`:
```javascript
const db = require('../src/db/connection');

test('connects to test database', async () => {
  const result = await db.query('SELECT 1 AS value');
  expect(result.rows[0].value).toBe(1);
});
```

Run:
```bash
cd backend && npm test -- tests/ping.test.js
```

Expected: `PASS tests/ping.test.js`

- [ ] **Step 4: Delete the temporary test file**

```bash
rm backend/tests/ping.test.js
```

- [ ] **Step 5: Commit**

```bash
git add tests/env.js tests/setup.js && git commit -m "feat: test infrastructure with isolated test database"
```

---

## Task 5: Auth — Register + Login

**Files:**
- Create: `backend/src/models/player.model.js`
- Create: `backend/src/services/auth.service.js`
- Create: `backend/src/controllers/auth.controller.js`
- Create: `backend/src/routes/auth.routes.js`
- Modify: `backend/src/app.js` — uncomment auth route
- Create: `backend/tests/auth.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// backend/tests/auth.test.js
const request = require('supertest');
const app     = require('../src/app');

describe('POST /api/auth/register', () => {
  it('creates a player and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testplayer', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.player.username).toBe('testplayer');
    expect(res.body.data.player.password_hash).toBeUndefined();
  });

  it('returns 409 if email already exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'player1', email: 'dup@example.com', password: 'pass123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'player2', email: 'dup@example.com', password: 'pass123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'logintest', email: 'login@example.com', password: 'password123' });
  });

  it('returns token with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.player.email).toBe('login@example.com');
    expect(res.body.data.player.password_hash).toBeUndefined();
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 with unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npm test -- tests/auth.test.js
```

Expected: FAIL — `Cannot find module '../src/app'` or 404 on the route.

- [ ] **Step 3: Create player.model.js**

```javascript
// backend/src/models/player.model.js
const db = require('../db/connection');

async function createPlayer({ username, email, passwordHash }) {
  const result = await db.query(
    `INSERT INTO players (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, gold, created_at`,
    [username, email, passwordHash]
  );
  return result.rows[0];
}

async function findByEmail(email) {
  const result = await db.query(
    'SELECT * FROM players WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await db.query(
    'SELECT id, username, email, gold, created_at FROM players WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function addGold(id, amount) {
  const result = await db.query(
    `UPDATE players SET gold = gold + $1, updated_at = NOW()
     WHERE id = $2
     RETURNING gold`,
    [amount, id]
  );
  return result.rows[0];
}

async function deductGold(id, amount) {
  const result = await db.query(
    `UPDATE players SET gold = gold - $1, updated_at = NOW()
     WHERE id = $2 AND gold >= $1
     RETURNING gold`,
    [amount, id]
  );
  return result.rows[0] || null;
}

module.exports = { createPlayer, findByEmail, findById, addGold, deductGold };
```

- [ ] **Step 4: Create auth.service.js**

```javascript
// backend/src/services/auth.service.js
const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const playerModel = require('../models/player.model');

const SALT_ROUNDS = 12;

async function register({ username, email, password }) {
  const existing = await playerModel.findByEmail(email);
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    err.code   = 'EMAIL_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const player       = await playerModel.createPlayer({ username, email, passwordHash });
  const token        = jwt.sign({ playerId: player.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return { player, token };
}

async function login({ email, password }) {
  const player = await playerModel.findByEmail(email);
  if (!player) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code   = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, player.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code   = 'INVALID_CREDENTIALS';
    throw err;
  }

  const { password_hash, ...playerData } = player;
  const token = jwt.sign({ playerId: player.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return { player: playerData, token };
}

module.exports = { register, login };
```

- [ ] **Step 5: Create auth.controller.js**

```javascript
// backend/src/controllers/auth.controller.js
const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const data = await authService.register({ username, email, password });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const data = await authService.login({ email, password });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
```

- [ ] **Step 6: Create auth.routes.js**

```javascript
// backend/src/routes/auth.routes.js
const { Router }    = require('express');
const authController = require('../controllers/auth.controller');

const router = Router();

router.post('/register', authController.register);
router.post('/login',    authController.login);

module.exports = router;
```

- [ ] **Step 7: Mount auth route in app.js**

Replace the commented auth line in `backend/src/app.js`:
```javascript
// Before:
// app.use('/api/auth', require('./routes/auth.routes'));

// After:
app.use('/api/auth', require('./routes/auth.routes'));
```

- [ ] **Step 8: Run tests and confirm they pass**

```bash
cd backend && npm test -- tests/auth.test.js
```

Expected: `PASS tests/auth.test.js` — 5 tests passing.

- [ ] **Step 9: Commit**

```bash
git add src/models/player.model.js src/services/auth.service.js src/controllers/auth.controller.js src/routes/auth.routes.js src/app.js tests/auth.test.js && git commit -m "feat: auth register and login endpoints"
```

---

## Task 6: JWT Middleware + GET /api/players/me

**Files:**
- Create: `backend/src/middleware/auth.middleware.js`
- Create: `backend/src/services/player.service.js`
- Create: `backend/src/controllers/player.controller.js`
- Create: `backend/src/routes/player.routes.js`
- Modify: `backend/src/app.js` — mount player route
- Create: `backend/tests/player.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// backend/tests/player.test.js
const request = require('supertest');
const app     = require('../src/app');

async function registerAndGetToken() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'player', email: 'player@example.com', password: 'password123' });
  return res.body.data.token;
}

describe('GET /api/players/me', () => {
  it('returns player profile with empty meta upgrades', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('player');
    expect(res.body.data.gold).toBe(0);
    expect(res.body.data.meta_upgrades).toEqual([]);
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/players/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/players/me')
      .set('Authorization', 'Bearer not_a_real_token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npm test -- tests/player.test.js
```

Expected: FAIL — route not found (404).

- [ ] **Step 3: Create auth.middleware.js**

```javascript
// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' }
    });
  }

  const token = header.split(' ')[1];

  try {
    const payload  = jwt.verify(token, process.env.JWT_SECRET);
    req.playerId   = payload.playerId;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' }
    });
  }
}

module.exports = authMiddleware;
```

- [ ] **Step 4: Create metaUpgrade.model.js** (needed by player.service.js)

```javascript
// backend/src/models/metaUpgrade.model.js
const db = require('../db/connection');

async function findByPlayerId(playerId) {
  const result = await db.query(
    'SELECT upgrade_key FROM meta_upgrades WHERE player_id = $1',
    [playerId]
  );
  return result.rows.map(r => r.upgrade_key);
}

async function purchase(playerId, upgradeKey) {
  const result = await db.query(
    `INSERT INTO meta_upgrades (player_id, upgrade_key)
     VALUES ($1, $2)
     RETURNING upgrade_key, purchased_at`,
    [playerId, upgradeKey]
  );
  return result.rows[0];
}

module.exports = { findByPlayerId, purchase };
```

- [ ] **Step 5: Create player.service.js**

```javascript
// backend/src/services/player.service.js
const playerModel      = require('../models/player.model');
const metaUpgradeModel = require('../models/metaUpgrade.model');

async function getProfile(playerId) {
  const player = await playerModel.findById(playerId);
  if (!player) {
    const err = new Error('Player not found');
    err.status = 404;
    err.code   = 'PLAYER_NOT_FOUND';
    throw err;
  }

  const metaUpgrades = await metaUpgradeModel.findByPlayerId(playerId);
  return { ...player, meta_upgrades: metaUpgrades };
}

module.exports = { getProfile };
```

- [ ] **Step 6: Create player.controller.js**

```javascript
// backend/src/controllers/player.controller.js
const playerService = require('../services/player.service');

async function getMe(req, res, next) {
  try {
    const data = await playerService.getProfile(req.playerId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
```

- [ ] **Step 7: Create player.routes.js**

```javascript
// backend/src/routes/player.routes.js
const { Router }      = require('express');
const playerController = require('../controllers/player.controller');
const auth             = require('../middleware/auth.middleware');

const router = Router();

router.get('/me', auth, playerController.getMe);

module.exports = router;
```

- [ ] **Step 8: Mount player route in app.js**

```javascript
// Replace the commented player line in src/app.js:
app.use('/api/players', require('./routes/player.routes'));
```

- [ ] **Step 9: Run tests and confirm they pass**

```bash
cd backend && npm test -- tests/player.test.js
```

Expected: `PASS tests/player.test.js` — 3 tests passing.

- [ ] **Step 10: Commit**

```bash
git add src/middleware/auth.middleware.js src/models/metaUpgrade.model.js src/services/player.service.js src/controllers/player.controller.js src/routes/player.routes.js src/app.js tests/player.test.js && git commit -m "feat: JWT middleware and GET /api/players/me"
```

---

## Task 7: POST /api/meta-upgrades

**Files:**
- Create: `backend/src/services/metaUpgrade.service.js`
- Create: `backend/src/controllers/metaUpgrade.controller.js`
- Create: `backend/src/routes/metaUpgrade.routes.js`
- Modify: `backend/src/app.js` — mount meta-upgrades route
- Create: `backend/tests/metaUpgrade.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// backend/tests/metaUpgrade.test.js
const request = require('supertest');
const app     = require('../src/app');
const db      = require('../src/db/connection');

async function setupPlayer(gold = 100) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'upgrader', email: 'upgrader@example.com', password: 'password123' });

  const token    = res.body.data.token;
  const playerId = res.body.data.player.id;

  if (gold > 0) {
    await db.query('UPDATE players SET gold = $1 WHERE id = $2', [gold, playerId]);
  }

  return { token, playerId };
}

describe('POST /api/meta-upgrades', () => {
  it('purchases an upgrade and deducts gold', async () => {
    const { token } = await setupPlayer(100);

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.upgrade_key).toBe('vitality_1');
    expect(res.body.data.remaining_gold).toBe(70);
  });

  it('returns 400 if insufficient gold', async () => {
    const { token } = await setupPlayer(10);

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_GOLD');
  });

  it('returns 409 if upgrade already purchased', async () => {
    const { token } = await setupPlayer(200);

    await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_PURCHASED');
  });

  it('returns 400 for unknown upgrade key', async () => {
    const { token } = await setupPlayer(100);

    const res = await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'invalid_upgrade' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_UPGRADE');
  });

  it('upgrade appears in GET /api/players/me after purchase', async () => {
    const { token } = await setupPlayer(100);

    await request(app)
      .post('/api/meta-upgrades')
      .set('Authorization', `Bearer ${token}`)
      .send({ upgrade_key: 'vitality_1' });

    const res = await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.meta_upgrades).toContain('vitality_1');
    expect(res.body.data.gold).toBe(70);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npm test -- tests/metaUpgrade.test.js
```

Expected: FAIL — route not found.

- [ ] **Step 3: Create metaUpgrade.service.js**

```javascript
// backend/src/services/metaUpgrade.service.js
const metaUpgradeModel = require('../models/metaUpgrade.model');
const playerModel      = require('../models/player.model');

const UPGRADE_COSTS = {
  vitality_1:   30,
  vitality_2:   60,
  vitality_3:   100,
  power_1:      30,
  power_2:      60,
  power_3:      100,
  swiftness_1:  40,
  swiftness_2:  80,
  lucky_find_1: 50,
  lucky_find_2: 90,
  gold_rush_1:  45,
  gold_rush_2:  85,
  unlock_tank:  50,
};

async function purchaseUpgrade(playerId, upgradeKey) {
  const cost = UPGRADE_COSTS[upgradeKey];
  if (!cost) {
    const err = new Error('Unknown upgrade');
    err.status = 400;
    err.code   = 'UNKNOWN_UPGRADE';
    throw err;
  }

  const existing = await metaUpgradeModel.findByPlayerId(playerId);
  if (existing.includes(upgradeKey)) {
    const err = new Error('Upgrade already purchased');
    err.status = 409;
    err.code   = 'ALREADY_PURCHASED';
    throw err;
  }

  const result = await playerModel.deductGold(playerId, cost);
  if (!result) {
    const err = new Error('Not enough gold');
    err.status = 400;
    err.code   = 'INSUFFICIENT_GOLD';
    throw err;
  }

  await metaUpgradeModel.purchase(playerId, upgradeKey);
  return { upgrade_key: upgradeKey, remaining_gold: result.gold };
}

module.exports = { purchaseUpgrade };
```

- [ ] **Step 4: Create metaUpgrade.controller.js**

```javascript
// backend/src/controllers/metaUpgrade.controller.js
const metaUpgradeService = require('../services/metaUpgrade.service');

async function purchase(req, res, next) {
  try {
    const { upgrade_key } = req.body;
    const data = await metaUpgradeService.purchaseUpgrade(req.playerId, upgrade_key);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { purchase };
```

- [ ] **Step 5: Create metaUpgrade.routes.js**

```javascript
// backend/src/routes/metaUpgrade.routes.js
const { Router }            = require('express');
const metaUpgradeController = require('../controllers/metaUpgrade.controller');
const auth                  = require('../middleware/auth.middleware');

const router = Router();

router.post('/', auth, metaUpgradeController.purchase);

module.exports = router;
```

- [ ] **Step 6: Mount meta-upgrades route in app.js**

```javascript
// Replace commented line in src/app.js:
app.use('/api/meta-upgrades', require('./routes/metaUpgrade.routes'));
```

- [ ] **Step 7: Run tests and confirm they pass**

```bash
cd backend && npm test -- tests/metaUpgrade.test.js
```

Expected: `PASS tests/metaUpgrade.test.js` — 5 tests passing.

- [ ] **Step 8: Commit**

```bash
git add src/services/metaUpgrade.service.js src/controllers/metaUpgrade.controller.js src/routes/metaUpgrade.routes.js src/app.js tests/metaUpgrade.test.js && git commit -m "feat: POST /api/meta-upgrades endpoint"
```

---

## Task 8: POST /api/runs + GET /api/runs/me

**Files:**
- Create: `backend/src/models/run.model.js`
- Create: `backend/src/services/run.service.js`
- Create: `backend/src/controllers/run.controller.js`
- Create: `backend/src/routes/run.routes.js`
- Modify: `backend/src/app.js` — mount runs route
- Create: `backend/tests/run.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// backend/tests/run.test.js
const request = require('supertest');
const app     = require('../src/app');

async function setupPlayer() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'runner', email: 'runner@example.com', password: 'password123' });
  return res.body.data.token;
}

describe('POST /api/runs', () => {
  it('saves run and adds gold to player total', async () => {
    const token = await setupPlayer();

    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        class:         'mage',
        gold_earned:   45,
        rooms_cleared: 4,
        depth_reached: 4,
        boss_defeated: false
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.run.gold_earned).toBe(45);
    expect(res.body.data.run.class).toBe('mage');
    expect(res.body.data.new_total_gold).toBe(45);
  });

  it('accumulates gold across multiple runs', async () => {
    const token = await setupPlayer();

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'mage', gold_earned: 30, rooms_cleared: 2, depth_reached: 2, boss_defeated: false });

    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'mage', gold_earned: 50, rooms_cleared: 5, depth_reached: 5, boss_defeated: true });

    expect(res.body.data.new_total_gold).toBe(80);
  });

  it('returns 400 for invalid class', async () => {
    const token = await setupPlayer();

    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'wizard', gold_earned: 10, rooms_cleared: 1, depth_reached: 1, boss_defeated: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CLASS');
  });
});

describe('GET /api/runs/me', () => {
  it('returns run history in descending order', async () => {
    const token = await setupPlayer();

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'mage', gold_earned: 30, rooms_cleared: 3, depth_reached: 3, boss_defeated: false });

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${token}`)
      .send({ class: 'tank', gold_earned: 60, rooms_cleared: 6, depth_reached: 6, boss_defeated: true });

    const res = await request(app)
      .get('/api/runs/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.runs).toHaveLength(2);
    expect(res.body.data.runs[0].class).toBe('tank');
  });

  it('returns empty array when no runs', async () => {
    const token = await setupPlayer();

    const res = await request(app)
      .get('/api/runs/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.runs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npm test -- tests/run.test.js
```

Expected: FAIL — route not found.

- [ ] **Step 3: Create run.model.js**

```javascript
// backend/src/models/run.model.js
const db = require('../db/connection');

async function createRun({ playerId, className, goldEarned, roomsCleared, depthReached, bossDefeated }) {
  const result = await db.query(
    `INSERT INTO runs (player_id, class, gold_earned, rooms_cleared, depth_reached, boss_defeated)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [playerId, className, goldEarned, roomsCleared, depthReached, bossDefeated]
  );
  return result.rows[0];
}

async function findByPlayerId(playerId) {
  const result = await db.query(
    'SELECT * FROM runs WHERE player_id = $1 ORDER BY created_at DESC',
    [playerId]
  );
  return result.rows;
}

module.exports = { createRun, findByPlayerId };
```

- [ ] **Step 4: Create run.service.js**

```javascript
// backend/src/services/run.service.js
const runModel    = require('../models/run.model');
const playerModel = require('../models/player.model');

const VALID_CLASSES = ['mage', 'tank'];

async function saveRun(playerId, { class: className, gold_earned, rooms_cleared, depth_reached, boss_defeated }) {
  if (!VALID_CLASSES.includes(className)) {
    const err = new Error('Invalid class');
    err.status = 400;
    err.code   = 'INVALID_CLASS';
    throw err;
  }

  const run                       = await runModel.createRun({ playerId, className, goldEarned: gold_earned, roomsCleared: rooms_cleared, depthReached: depth_reached, bossDefeated: boss_defeated });
  const { gold: new_total_gold }  = await playerModel.addGold(playerId, gold_earned);

  return { run, new_total_gold };
}

async function getRunHistory(playerId) {
  return runModel.findByPlayerId(playerId);
}

module.exports = { saveRun, getRunHistory };
```

- [ ] **Step 5: Create run.controller.js**

```javascript
// backend/src/controllers/run.controller.js
const runService = require('../services/run.service');

async function saveRun(req, res, next) {
  try {
    const data = await runService.saveRun(req.playerId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const runs = await runService.getRunHistory(req.playerId);
    res.json({ success: true, data: { runs } });
  } catch (err) {
    next(err);
  }
}

module.exports = { saveRun, getHistory };
```

- [ ] **Step 6: Create run.routes.js**

```javascript
// backend/src/routes/run.routes.js
const { Router }  = require('express');
const runController = require('../controllers/run.controller');
const auth          = require('../middleware/auth.middleware');

const router = Router();

router.post('/',   auth, runController.saveRun);
router.get('/me',  auth, runController.getHistory);

module.exports = router;
```

- [ ] **Step 7: Mount runs route and finalize app.js**

Replace the commented runs line in `backend/src/app.js`. Final app.js should look like:

```javascript
// backend/src/app.js
const express = require('express');
const cors    = require('cors');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/players',       require('./routes/player.routes'));
app.use('/api/meta-upgrades', require('./routes/metaUpgrade.routes'));
app.use('/api/runs',          require('./routes/run.routes'));

app.use(errorMiddleware);

module.exports = app;
```

- [ ] **Step 8: Run tests and confirm they pass**

```bash
cd backend && npm test -- tests/run.test.js
```

Expected: `PASS tests/run.test.js` — 5 tests passing.

- [ ] **Step 9: Run full test suite**

```bash
cd backend && npm test
```

Expected: All 4 test files pass, 18+ tests total, 0 failures.

- [ ] **Step 10: Verify server starts and serves requests**

```bash
cd backend && node server.js
```

In a second terminal:
```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}' | python3 -m json.tool
```

Expected: JSON response with `success: true`, player object, and token.

- [ ] **Step 11: Commit**

```bash
git add src/models/run.model.js src/services/run.service.js src/controllers/run.controller.js src/routes/run.routes.js src/app.js tests/run.test.js && git commit -m "feat: POST /api/runs and GET /api/runs/me endpoints — backend complete"
```
