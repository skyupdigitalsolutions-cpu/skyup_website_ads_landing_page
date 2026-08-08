CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  name       TEXT NOT NULL,
  business   TEXT,
  phone      TEXT NOT NULL,
  budget     TEXT,
  timeline   TEXT,
  source     TEXT,
  ip         TEXT,
  ua         TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);
