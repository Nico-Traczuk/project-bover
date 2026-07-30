CREATE TABLE IF NOT EXISTS meta_upgrades (
  id           SERIAL PRIMARY KEY,
  player_id    INTEGER      REFERENCES players(id) ON DELETE CASCADE,
  upgrade_key  VARCHAR(50)  NOT NULL,
  purchased_at TIMESTAMP    DEFAULT NOW(),
  UNIQUE(player_id, upgrade_key)
);
