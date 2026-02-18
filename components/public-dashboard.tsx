"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { StatusPill } from "@/components/status-pill";

type SummaryPayload = {
  allOperational: boolean;
  monitors: Array<{
    id: number;
    slug: string;
    name: string;
    type: string;
    target: string;
    featured: boolean;
    sort_order: number;
    uptime24h: number;
    status: "up" | "down";
    recentChecks: boolean[];
  }>;
  totals: {
    total: number;
    up: number;
    down: number;
    uptimeAvg24h: number;
  };
  stats: {
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
  } | null;
  vpsHistory: Array<{
    cpu_percent: number;
    mem_used_mb: number;
    mem_avail_mb: number;
    disk_used_percent: number;
    load1: number;
    load5: number;
    load15: number;
    net_rx_bytes: string;
    net_tx_bytes: string;
    checked_at: string;
  }>;
};

function formatUptime(secondsRaw: string | number | null | undefined) {
  const seconds = Number(secondsRaw || 0);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatTimestamp(ts?: string | null) {
  if (!ts) return "No data";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "No data";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function PublicDashboard() {
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/public/summary", { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load data");
        const json = (await res.json()) as SummaryPayload;
        setData(json);
        setError("");
      } catch {
        setError("Could not load monitoring data.");
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  const cpuSeries = useMemo(
    () =>
      (data?.vpsHistory || []).map((item) => ({
        t: new Date(item.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        cpu: Number(item.cpu_percent || 0),
        disk: Number(item.disk_used_percent || 0),
        memUsed: Number(item.mem_used_mb || 0),
        load: Number(item.load1 || 0)
      })),
    [data?.vpsHistory]
  );

  const networkSeries = useMemo(() => {
    const history = data?.vpsHistory || [];
    if (history.length < 2) return [] as Array<{ t: string; inMbps: number; outMbps: number }>;

    return history
      .map((item, index) => {
        if (index === 0) return null;
        const prev = history[index - 1];
        const nowTs = new Date(item.checked_at).getTime();
        const prevTs = new Date(prev.checked_at).getTime();
        const elapsedSec = Math.max(1, (nowTs - prevTs) / 1000);

        const inDelta = Number(item.net_rx_bytes || 0) - Number(prev.net_rx_bytes || 0);
        const outDelta = Number(item.net_tx_bytes || 0) - Number(prev.net_tx_bytes || 0);

        return {
          t: new Date(item.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          inMbps: Math.max(0, (inDelta * 8) / elapsedSec / 1_000_000),
          outMbps: Math.max(0, (outDelta * 8) / elapsedSec / 1_000_000)
        };
      })
      .filter((entry): entry is { t: string; inMbps: number; outMbps: number } => Boolean(entry));
  }, [data?.vpsHistory]);

  const pieData = useMemo(
    () => [
      { name: "Up", value: data?.totals.up || 0, color: "#0ea96e" },
      { name: "Down", value: data?.totals.down || 0, color: "#e5484d" }
    ],
    [data?.totals.down, data?.totals.up]
  );

  if (error) {
    return <p className="rounded-2xl border border-[#f4c4c4] bg-[#fff1f1] p-4 text-[#8a1d1d]">{error}</p>;
  }

  if (!data) {
    return <p className="text-[var(--muted)]">Loading status...</p>;
  }

  const memUsed = Number(data.stats?.mem_used_mb || 0);
  const memAvail = Number(data.stats?.mem_avail_mb || 0);
  const memTotal = memUsed + memAvail;
  const memUsedPct = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;
  const netRx = Number(data.stats?.net_rx_bytes || 0);
  const netTx = Number(data.stats?.net_tx_bytes || 0);
  const featuredMonitors = data.monitors.filter((m) => m.featured).slice(0, 3);

  return (
    <div className="space-y-5">
      <section className="grid-fade-in priority-card rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-6 shadow-[0_20px_40px_rgba(12,36,79,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#446089]">Public Status</p>
            <h1 className="font-display priority-headline mt-2 text-3xl font-semibold md:text-4xl">
              {data.allOperational ? "All systems operational" : "Service degradation detected"}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              data.allOperational
                ? "status-pulse-ok bg-[#e4f8f0] text-[#0a7d53]"
                : "status-pulse-down bg-[#ffe8e8] text-[#a02323]"
            }`}
          >
            {data.allOperational ? "Healthy" : "Attention"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-4">
          <p>Host uptime: <span className="font-semibold text-[#16345c]">{formatUptime(data.stats?.uptime_sec)}</span></p>
          <p>Monitors active: <span className="font-semibold text-[#16345c]">{data.totals.total}</span></p>
          <p>Avg uptime 24h: <span className="font-semibold text-[#16345c]">{data.totals.uptimeAvg24h.toFixed(2)}%</span></p>
          <p>Last sample: <span className="font-semibold text-[#16345c]">{formatTimestamp(data.stats?.checked_at)}</span></p>
        </div>
      </section>

      <section className="grid-fade-in-delay grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric title="CPU" value={`${Number(data.stats?.cpu_percent || 0).toFixed(1)}%`} subtitle="Current usage" priority />
        <Metric title="RAM used" value={`${memUsed} MB`} subtitle={`${memUsedPct.toFixed(1)}% of total`} />
        <Metric title="RAM free" value={`${memAvail} MB`} subtitle="Available memory" />
        <Metric title="Disk used" value={`${Number(data.stats?.disk_used_percent || 0).toFixed(1)}%`} subtitle="Filesystem /" />
        <Metric title="Load 1m" value={`${Number(data.stats?.load1 || 0).toFixed(2)}`} subtitle={`5m: ${Number(data.stats?.load5 || 0).toFixed(2)} | 15m: ${Number(data.stats?.load15 || 0).toFixed(2)}`} priority />
        <Metric title="Network" value={formatBytes(netRx + netTx)} subtitle="RX + TX since boot" priority />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4 xl:col-span-8">
          <p className="font-display text-lg font-semibold">CPU vs Disk pressure</p>
          <p className="text-sm text-[var(--muted)]">Historic trend from saved snapshots</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuSeries}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f6fd7" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#0f6fd7" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="diskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f67f2b" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#f67f2b" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dce6f4" />
                <XAxis dataKey="t" stroke="#6f85a9" />
                <YAxis stroke="#6f85a9" />
                <Tooltip />
                <Area type="monotone" dataKey="cpu" stroke="#0f6fd7" fill="url(#cpuGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="disk" stroke="#f67f2b" fill="url(#diskGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="priority-card-soft rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4 xl:col-span-4">
          <p className="font-display text-lg font-semibold">Monitor health</p>
          <p className="text-sm text-[var(--muted)]">Current service state distribution</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={65} outerRadius={92} paddingAngle={4} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[#cde7dc] bg-[#eaf9f2] p-3 text-[#0a7d53]">
              <p className="font-semibold">Up</p>
              <p className="text-xl font-bold">{data.totals.up}</p>
            </div>
            <div className="rounded-xl border border-[#f6cccc] bg-[#fff0f0] p-3 text-[#a02323]">
              <p className="font-semibold">Down</p>
              <p className="text-xl font-bold">{data.totals.down}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4">
          <p className="font-display text-lg font-semibold">Load 1m trend</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpuSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dce6f4" />
                <XAxis dataKey="t" stroke="#6f85a9" />
                <YAxis stroke="#6f85a9" />
                <Tooltip />
                <Line type="monotone" dataKey="load" stroke="#0ea96e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4">
          <p className="font-display text-lg font-semibold">Network throughput</p>
          <p className="text-sm text-[var(--muted)]">Approximate in/out Mbps between snapshots</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={networkSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dce6f4" />
                <XAxis dataKey="t" stroke="#6f85a9" />
                <YAxis stroke="#6f85a9" />
                <Tooltip />
                <Line type="monotone" dataKey="inMbps" name="In Mbps" stroke="#0f6fd7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="outMbps" name="Out Mbps" stroke="#f67f2b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {featuredMonitors.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredMonitors.map((monitor) => (
            <article key={monitor.id} className="priority-card-soft rounded-3xl border border-[var(--stroke)] p-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold text-[#14345d]">{monitor.name}</p>
                <StatusPill ok={monitor.status === "up"} />
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{monitor.type}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{monitor.target}</p>
              <p className="mt-2 text-sm font-semibold text-[#16345c]">{monitor.uptime24h.toFixed(2)}% uptime (24h)</p>
              <div className="mt-3">
                <MonitorUptimeBars checks={monitor.recentChecks} />
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg font-semibold">Service monitors</p>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Updated every 20s</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#d7e1f0] text-[var(--muted)]">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2 pr-3">Uptime 24h</th>
                <th className="py-2 pr-3">Recent checks</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.monitors.length === 0 && (
                <tr>
                  <td className="py-6 text-[var(--muted)]" colSpan={6}>
                    No monitors configured yet. Create one from the admin panel.
                  </td>
                </tr>
              )}
              {data.monitors.map((monitor) => (
                <tr key={monitor.id} className="border-b border-[#e6edf8] last:border-0">
                  <td className="py-2 pr-3 font-semibold text-[#1a355a]">
                    <Link className="transition hover:text-[var(--accent)]" href={`/status/${monitor.slug}`}>
                      {monitor.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 uppercase text-[var(--muted)]">{monitor.type}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{monitor.target}</td>
                  <td className="py-2 pr-3">{monitor.uptime24h.toFixed(2)}%</td>
                  <td className="py-2 pr-3">
                    <MonitorUptimeBars checks={monitor.recentChecks} />
                  </td>
                  <td className="py-2 pr-3">
                    <StatusPill ok={monitor.status === "up"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, subtitle, priority }: { title: string; value: string; subtitle: string; priority?: boolean }) {
  return (
    <article className={`rounded-2xl border border-[var(--stroke)] bg-white p-4 shadow-[0_8px_20px_rgba(15,45,90,0.06)] ${priority ? "priority-card-soft" : ""}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{title}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-[#0f2d53]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
    </article>
  );
}

function MonitorUptimeBars({ checks }: { checks: boolean[] }) {
  const padded = checks.length >= 48 ? checks.slice(-48) : [...Array(48 - checks.length).fill(null), ...checks];

  return (
    <div className="flex items-center gap-1">
      {padded.map((ok, index) => (
        <span
          key={index}
          className={`inline-block h-8 w-1.5 rounded-sm ${
            ok === null ? "bg-[#d9e3f2]" : ok ? "bg-[#0ea96e]" : "bg-[#e5484d]"
          }`}
          title={ok === null ? "No data" : ok ? "Operational" : "Failure"}
        />
      ))}
    </div>
  );
}
