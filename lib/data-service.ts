import { query } from "@/lib/db";

export async function getPublicSummary() {
  const [monitorsRes, statsRes] = await Promise.all([
    query<{
      id: number;
      slug: string;
      name: string;
      type: string;
      target: string;
      enabled: boolean;
      last_state_ok: boolean | null;
      created_at: string;
    }>(
      `SELECT id, slug, name, type, target, enabled, last_state_ok, created_at
       FROM monitors WHERE enabled = TRUE ORDER BY name ASC`
    ),
    query<{
      cpu_percent: number;
      mem_used_mb: number;
      mem_avail_mb: number;
      disk_used_percent: number;
      load1: number;
      load5: number;
      load15: number;
      net_rx_bytes: string;
      net_tx_bytes: string;
      uptime_sec: string;
      checked_at: string;
    }>(
      `SELECT cpu_percent, mem_used_mb, mem_avail_mb, disk_used_percent, load1, load5, load15,
              net_rx_bytes, net_tx_bytes, uptime_sec, checked_at
       FROM vps_stats ORDER BY checked_at DESC LIMIT 1`
    )
  ]);

  const monitorIds = monitorsRes.rows.map((m) => m.id);
  let uptimeMap = new Map<number, number>();
  if (monitorIds.length) {
    const uptimeRes = await query<{ monitor_id: number; uptime_pct: number }>(
      `SELECT monitor_id,
              COALESCE(ROUND(100.0 * AVG(CASE WHEN ok THEN 1 ELSE 0 END), 2), 0) AS uptime_pct
       FROM check_results
       WHERE monitor_id = ANY($1::bigint[])
         AND checked_at >= NOW() - INTERVAL '24 hours'
       GROUP BY monitor_id`,
      [monitorIds]
    );
    uptimeMap = new Map(uptimeRes.rows.map((r) => [r.monitor_id, Number(r.uptime_pct)]));
  }

  const monitors = monitorsRes.rows.map((m) => ({
    ...m,
    uptime24h: uptimeMap.get(m.id) ?? 100,
    status: m.last_state_ok === false ? "down" : "up"
  }));

  const allOperational = monitors.every((m) => m.status === "up");
  return {
    allOperational,
    monitors,
    stats: statsRes.rows[0] || null
  };
}

export async function getMonitorBySlug(slug: string) {
  const monitorRes = await query<{
    id: number;
    slug: string;
    name: string;
    type: string;
    target: string;
    expected_status: number | null;
    timeout_ms: number;
    interval_sec: number;
    enabled: boolean;
    last_state_ok: boolean | null;
    created_at: string;
  }>("SELECT * FROM monitors WHERE slug = $1 LIMIT 1", [slug]);

  const monitor = monitorRes.rows[0];
  if (!monitor) return null;

  const [resultsRes, incidentsRes, uptimeRes] = await Promise.all([
    query<{
      ok: boolean;
      status_code: number | null;
      latency_ms: number | null;
      error: string | null;
      checked_at: string;
    }>(
      `SELECT ok, status_code, latency_ms, error, checked_at
       FROM check_results WHERE monitor_id = $1
       ORDER BY checked_at DESC LIMIT 200`,
      [monitor.id]
    ),
    query<{
      id: number;
      started_at: string;
      ended_at: string | null;
      summary: string;
    }>(
      `SELECT id, started_at, ended_at, summary
       FROM incidents WHERE monitor_id = $1
       ORDER BY started_at DESC LIMIT 50`,
      [monitor.id]
    ),
    query<{ uptime_pct: number }>(
      `SELECT COALESCE(ROUND(100.0 * AVG(CASE WHEN ok THEN 1 ELSE 0 END), 2), 0) AS uptime_pct
       FROM check_results
       WHERE monitor_id = $1
         AND checked_at >= NOW() - INTERVAL '24 hours'`,
      [monitor.id]
    )
  ]);

  return {
    monitor,
    results: resultsRes.rows.reverse(),
    incidents: incidentsRes.rows,
    uptime24h: Number(uptimeRes.rows[0]?.uptime_pct || 0)
  };
}

export async function getVpsHistory(limit = 120) {
  const safeLimit = Math.max(10, Math.min(limit, 1000));
  const { rows } = await query<{
    cpu_percent: number;
    mem_used_mb: number;
    mem_avail_mb: number;
    disk_used_percent: number;
    load1: number;
    checked_at: string;
  }>(
    `SELECT cpu_percent, mem_used_mb, mem_avail_mb, disk_used_percent, load1, checked_at
     FROM vps_stats ORDER BY checked_at DESC LIMIT $1`,
    [safeLimit]
  );
  return rows.reverse();
}

