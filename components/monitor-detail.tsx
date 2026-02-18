"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatusPill } from "@/components/status-pill";

type MonitorPayload = {
  monitor: {
    id: number;
    slug: string;
    name: string;
    type: string;
    target: string;
    last_state_ok: boolean | null;
  };
  results: Array<{
    ok: boolean;
    status_code: number | null;
    latency_ms: number | null;
    error: string | null;
    checked_at: string;
  }>;
  incidents: Array<{
    id: number;
    started_at: string;
    ended_at: string | null;
    summary: string;
  }>;
  uptime24h: number;
};

export function MonitorDetail({ slug }: { slug: string }) {
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/public/monitor/${slug}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Monitor not found");
        setData((await res.json()) as MonitorPayload);
      } catch {
        setError("Could not load monitor data.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(timer);
  }, [slug]);

  const latencySeries = useMemo(
    () =>
      (data?.results || []).map((r) => ({
        t: new Date(r.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        latency: r.latency_ms || 0
      })),
    [data?.results]
  );

  if (error) return <p className="rounded-xl border border-[#f6cccc] bg-[#fff0f0] p-3 text-[#a02323]">{error}</p>;
  if (!data) return <p className="text-[var(--muted)]">Loading monitor...</p>;

  const isUp = data.monitor.last_state_ok !== false;

  return (
    <div className="space-y-5">
      <div className="grid-fade-in flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Monitor details</p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[#10213b]">{data.monitor.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data.monitor.type.toUpperCase()} | {data.monitor.target}
          </p>
        </div>
        <div className="space-y-2 text-right">
          <StatusPill ok={isUp} />
          <p className="text-sm text-[var(--muted)]">24h uptime: {data.uptime24h.toFixed(2)}%</p>
        </div>
      </div>

      <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4">
        <p className="font-display text-lg font-semibold">Latency timeline</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce6f4" />
              <XAxis dataKey="t" stroke="#6f85a9" />
              <YAxis stroke="#6f85a9" />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#0f6fd7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4">
        <p className="font-display text-lg font-semibold">Incident log</p>
        <div className="mt-3 space-y-2">
          {data.incidents.length === 0 && <p className="text-sm text-[var(--muted)]">No recent incidents.</p>}
          {data.incidents.map((incident) => (
            <article key={incident.id} className="rounded-xl border border-[#d7e1f0] bg-white p-3">
              <p className="font-medium text-[#173761]">{incident.summary}</p>
              <p className="text-xs text-[var(--muted)]">
                Start: {new Date(incident.started_at).toLocaleString()} | End: {incident.ended_at ? new Date(incident.ended_at).toLocaleString() : "Open"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <Link href="/" className="inline-flex rounded-xl border border-[#b8c9e4] bg-white px-3 py-2 text-sm font-semibold text-[#173761] hover:border-[#7fa7da]">
        Back to global status
      </Link>
    </div>
  );
}
