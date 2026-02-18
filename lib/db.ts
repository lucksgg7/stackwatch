import { Pool } from "pg";
import { env } from "@/lib/env";

let pool: Pool | null = null;
let schemaReady = false;

function getPool() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 10,
      ssl: env.nodeEnv === "production" ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(sql: string, values: unknown[] = []) {
  const client = getPool();
  if (!schemaReady) {
    await ensureSchema();
  }
  return client.query<T extends object ? T : never>(sql, values);
}

export async function ensureSchema() {
  if (schemaReady) return;
  const client = getPool();

  await client.query(`
    CREATE TABLE IF NOT EXISTS monitors (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('http', 'tcp', 'udp')),
      target TEXT NOT NULL,
      expected_status INTEGER,
      timeout_ms INTEGER NOT NULL DEFAULT 5000,
      interval_sec INTEGER NOT NULL DEFAULT 60,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      fail_streak INTEGER NOT NULL DEFAULT 0,
      ok_streak INTEGER NOT NULL DEFAULT 0,
      last_state_ok BOOLEAN,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`ALTER TABLE monitors DROP CONSTRAINT IF EXISTS monitors_type_check;`);
  await client.query(`ALTER TABLE monitors ADD CONSTRAINT monitors_type_check CHECK (type IN ('http', 'tcp', 'udp'));`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS check_results (
      id BIGSERIAL PRIMARY KEY,
      monitor_id BIGINT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      ok BOOLEAN NOT NULL,
      status_code INTEGER,
      latency_ms INTEGER,
      error TEXT,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_check_results_monitor_time
    ON check_results (monitor_id, checked_at DESC);
  `);

  await client.query(`
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
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vps_stats_checked_at
    ON vps_stats (checked_at DESC);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id BIGSERIAL PRIMARY KEY,
      monitor_id BIGINT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ,
      summary TEXT NOT NULL
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_incidents_monitor_started
    ON incidents (monitor_id, started_at DESC);
  `);

  await client.query(`
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
  `);

  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_host TEXT;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN NOT NULL DEFAULT FALSE;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_user TEXT;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_pass TEXT;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_from TEXT;`);
  await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_to TEXT;`);

  await client.query(`
    INSERT INTO settings (id, webhook_url, alert_email)
    VALUES (1, NULL, NULL)
    ON CONFLICT (id) DO NOTHING;
  `);

  schemaReady = true;
}

