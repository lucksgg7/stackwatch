-- 001_init.sql
CREATE TABLE IF NOT EXISTS monitors (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('http', 'tcp', 'udp')),
  target TEXT NOT NULL,
  interval_sec INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expected_status INTEGER,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  fail_streak INTEGER NOT NULL DEFAULT 0,
  ok_streak INTEGER NOT NULL DEFAULT 0,
  last_state_ok BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_results (
  id BIGSERIAL PRIMARY KEY,
  monitor_id BIGINT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  ok BOOLEAN NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vps_stats (
  id BIGSERIAL PRIMARY KEY,
  cpu_percent REAL NOT NULL,
  mem_used_mb INTEGER NOT NULL,
  mem_avail_mb INTEGER NOT NULL,
  disk_used_percent REAL NOT NULL,
  load1 REAL NOT NULL,
  load5 REAL NOT NULL,
  load15 REAL NOT NULL,
  net_rx_bytes BIGINT NOT NULL DEFAULT 0,
  net_tx_bytes BIGINT NOT NULL DEFAULT 0,
  uptime_sec BIGINT NOT NULL DEFAULT 0,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  monitor_id BIGINT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id SMALLINT PRIMARY KEY,
  webhook_url TEXT,
  alert_email TEXT,
  discord_webhook_url TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_from TEXT,
  smtp_to TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (id, webhook_url, alert_email)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

