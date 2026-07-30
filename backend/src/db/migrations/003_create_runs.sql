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
