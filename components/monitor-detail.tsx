"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
        setError("No se pudo cargar el monitor.");
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

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!data) return <p className="text-slate-300">Cargando monitor...</p>;

  const isUp = data.monitor.last_state_ok !== false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Monitor</p>
          <h1 className="text-3xl font-bold text-white">{data.monitor.name}</h1>
          <p className="text-sm text-slate-300">{data.monitor.type.toUpperCase()} - {data.monitor.target}</p>
        </div>
        <StatusPill ok={isUp} />
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-sm font-semibold text-white">Latencia</p>
        <p className="text-xs text-slate-400">Uptime 24h: {data.uptime24h.toFixed(2)}%</p>
        <div className="mt-3 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencySeries}>
              <XAxis dataKey="t" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#38bdf8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-sm font-semibold text-white">Incidentes</p>
        <div className="mt-3 space-y-2">
          {data.incidents.length === 0 && <p className="text-sm text-slate-400">Sin incidentes recientes.</p>}
          {data.incidents.map((incident) => (
            <article key={incident.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-sm text-white">{incident.summary}</p>
              <p className="text-xs text-slate-400">
                Inicio: {new Date(incident.started_at).toLocaleString()} - Fin: {incident.ended_at ? new Date(incident.ended_at).toLocaleString() : "Abierto"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <Link href="/" className="text-sm text-sky-300 hover:text-sky-200">? Volver al estado general</Link>
    </div>
  );
}

