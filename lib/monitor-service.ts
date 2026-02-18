import net from "net";
import dgram from "dgram";
import { env } from "@/lib/env";
import { query } from "@/lib/db";
import { sendWebhookAlert } from "@/lib/alerts";
import { getVpsSnapshot } from "@/lib/system-stats";

type DbMonitor = {
  id: number;
  slug: string;
  name: string;
  type: "http" | "tcp" | "udp";
  target: string;
  expected_status: number | null;
  timeout_ms: number;
  interval_sec: number;
  enabled: boolean;
  fail_streak: number;
  ok_streak: number;
  last_state_ok: boolean | null;
  created_at: string;
};

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  };
}

async function runHttpCheck(monitor: DbMonitor) {
  const started = Date.now();
  const { signal, clear } = withTimeoutSignal(monitor.timeout_ms);
  try {
    const response = await fetch(monitor.target, { method: "GET", signal, cache: "no-store" });
    const expected = monitor.expected_status || 200;
    const ok = response.status === expected;
    return {
      ok,
      statusCode: response.status,
      latencyMs: Date.now() - started,
      error: ok ? null : `Expected ${expected}, got ${response.status}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return { ok: false, statusCode: null, latencyMs: Date.now() - started, error: message };
  } finally {
    clear();
  }
}

async function runTcpCheck(monitor: DbMonitor) {
  const [host, portRaw] = monitor.target.split(":");
  const port = Number(portRaw);
  const started = Date.now();

  return new Promise<{ ok: boolean; statusCode: number | null; latencyMs: number; error: string | null }>((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, statusCode: null, latencyMs: Date.now() - started, error: "TCP timeout" });
    }, monitor.timeout_ms);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true, statusCode: null, latencyMs: Date.now() - started, error: null });
    });

    socket.once("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, statusCode: null, latencyMs: Date.now() - started, error: err.message || "TCP error" });
    });
  });
}

async function runUdpCheck(monitor: DbMonitor) {
  const [host, portRaw] = monitor.target.split(":");
  const port = Number(portRaw);
  const started = Date.now();

  return new Promise<{ ok: boolean; statusCode: number | null; latencyMs: number; error: string | null }>((resolve) => {
    const socket = dgram.createSocket("udp4");
    let done = false;

    const finish = (result: { ok: boolean; statusCode: number | null; latencyMs: number; error: string | null }) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.close();
      resolve(result);
    };

    const timer = setTimeout(() => {
      // UDP is connectionless; if no send error occurs within timeout we consider host reachable.
      finish({ ok: true, statusCode: null, latencyMs: Date.now() - started, error: null });
    }, monitor.timeout_ms);

    socket.once("error", (err) => {
      finish({ ok: false, statusCode: null, latencyMs: Date.now() - started, error: err.message || "UDP error" });
    });

    const ping = Buffer.from([0x01]);
    socket.send(ping, port, host, (err) => {
      if (err) {
        finish({ ok: false, statusCode: null, latencyMs: Date.now() - started, error: err.message || "UDP send failed" });
      }
    });
  });
}

async function openIncidentIfNeeded(monitor: DbMonitor) {
  const { rows: openRows } = await query<{ id: number }>(
    "SELECT id FROM incidents WHERE monitor_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    [monitor.id]
  );
  if (openRows[0]) return;

  const summary = `${monitor.name} is DOWN`;
  const { rows } = await query<{ id: number; started_at: string }>(
    "INSERT INTO incidents (monitor_id, started_at, summary) VALUES ($1, NOW(), $2) RETURNING id, started_at",
    [monitor.id, summary]
  );

  await sendWebhookAlert({
    event: "incident_opened",
    monitorId: monitor.id,
    monitorName: monitor.name,
    target: monitor.target,
    summary,
    startedAt: rows[0]?.started_at
  });
}

async function closeIncidentIfNeeded(monitor: DbMonitor) {
  const { rows: openRows } = await query<{ id: number; started_at: string; summary: string }>(
    "SELECT id, started_at, summary FROM incidents WHERE monitor_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    [monitor.id]
  );
  if (!openRows[0]) return;

  const incident = openRows[0];
  await query("UPDATE incidents SET ended_at = NOW() WHERE id = $1", [incident.id]);

  await sendWebhookAlert({
    event: "incident_closed",
    monitorId: monitor.id,
    monitorName: monitor.name,
    target: monitor.target,
    summary: `${monitor.name} recovered`,
    startedAt: incident.started_at,
    endedAt: new Date().toISOString()
  });
}

export async function runChecksCycle() {
  const { rows: monitors } = await query<DbMonitor>(
    "SELECT * FROM monitors WHERE enabled = TRUE ORDER BY id ASC"
  );

  const stats = await getVpsSnapshot();
  await query(
    `INSERT INTO vps_stats (
      cpu_percent, mem_used_mb, mem_avail_mb, disk_used_percent,
      load1, load5, load15, net_rx_bytes, net_tx_bytes, uptime_sec
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      stats.cpuPercent,
      stats.memUsedMb,
      stats.memAvailMb,
      stats.diskUsedPercent,
      stats.load1,
      stats.load5,
      stats.load15,
      stats.netRxBytes,
      stats.netTxBytes,
      stats.uptimeSec
    ]
  );

  const results: Array<{ monitorId: number; ok: boolean }> = [];

  for (const monitor of monitors) {
    const last = await query<{ checked_at: string }>(
      "SELECT checked_at FROM check_results WHERE monitor_id = $1 ORDER BY checked_at DESC LIMIT 1",
      [monitor.id]
    );

    if (last.rows[0]) {
      const lastTime = new Date(last.rows[0].checked_at).getTime();
      const elapsedSec = (Date.now() - lastTime) / 1000;
      if (elapsedSec < monitor.interval_sec) {
        continue;
      }
    }

    const check =
      monitor.type === "http"
        ? await runHttpCheck(monitor)
        : monitor.type === "tcp"
          ? await runTcpCheck(monitor)
          : await runUdpCheck(monitor);

    await query(
      "INSERT INTO check_results (monitor_id, ok, status_code, latency_ms, error, checked_at) VALUES ($1,$2,$3,$4,$5,NOW())",
      [monitor.id, check.ok, check.statusCode, check.latencyMs, check.error]
    );

    const failStreak = check.ok ? 0 : monitor.fail_streak + 1;
    const okStreak = check.ok ? monitor.ok_streak + 1 : 0;

    await query(
      "UPDATE monitors SET fail_streak = $1, ok_streak = $2, last_state_ok = $3 WHERE id = $4",
      [failStreak, okStreak, check.ok, monitor.id]
    );

    if (!check.ok && failStreak >= env.checkFailThreshold) {
      await openIncidentIfNeeded(monitor);
    }

    if (check.ok && okStreak >= env.checkRecoveryThreshold) {
      await closeIncidentIfNeeded(monitor);
    }

    results.push({ monitorId: monitor.id, ok: check.ok });
  }

  return {
    checked: results.length,
    totalEnabled: monitors.length,
    statsSaved: true
  };
}

