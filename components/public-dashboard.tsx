"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { StatusPill } from "@/components/status-pill";

type SummaryPayload = {
  allOperational: boolean;
  monitors: Array<{
    id: number;
    slug: string;
    name: string;
    type: string;
    target: string;
    uptime24h: number;
    status: "up" | "down";
  }>;
  stats: {
    cpu_percent: number;
    mem_used_mb: number;
    mem_avail_mb: number;
    disk_used_percent: number;
    load1: number;
    load5: number;
    load15: number;
    uptime_sec: string;
    checked_at: string;
  } | null;
  vpsHistory: Array<{
    cpu_percent: number;
    mem_used_mb: number;
    mem_avail_mb: number;
    disk_used_percent: number;
    load1: number;
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
      } catch {
        setError("No se pudieron cargar los datos de monitorización.");
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
        cpu: item.cpu_percent,
        disk: item.disk_used_percent,
        load: item.load1
      })),
    [data?.vpsHistory]
  );

  if (error) {
    return <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">{error}</p>;
  }

  if (!data) {
    return <p className="text-slate-300">Cargando estado...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estado general</p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {data.allOperational ? "All systems operational" : "Some systems are degraded"}
        </h1>
        <p className="mt-2 text-sm text-slate-300">Uptime VPS: {formatUptime(data.stats?.uptime_sec)}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="CPU" value={`${data.stats?.cpu_percent?.toFixed(1) || "0.0"}%`} />
        <Metric title="RAM usada" value={`${data.stats?.mem_used_mb || 0} MB`} />
        <Metric title="Disco" value={`${data.stats?.disk_used_percent?.toFixed(1) || "0.0"}%`} />
        <Metric title="Load (1m)" value={`${data.stats?.load1?.toFixed(2) || "0.00"}`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-white">CPU / Disco</p>
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuSeries}>
                <XAxis dataKey="t" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="cpu" stroke="#38bdf8" fill="#38bdf830" />
                <Area type="monotone" dataKey="disk" stroke="#f97316" fill="#f9731630" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-white">Load 1m</p>
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpuSeries}>
                <XAxis dataKey="t" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="load" stroke="#22c55e" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-sm font-semibold text-white">Monitores</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead>
              <tr className="text-slate-400">
                <th className="py-2">Nombre</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Target</th>
                <th className="py-2">Uptime 24h</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.monitors.map((monitor) => (
                <tr key={monitor.id} className="border-t border-slate-800">
                  <td className="py-2">
                    <Link className="text-sky-300 hover:text-sky-200" href={`/status/${monitor.slug}`}>
                      {monitor.name}
                    </Link>
                  </td>
                  <td className="py-2 uppercase">{monitor.type}</td>
                  <td className="py-2 text-slate-300">{monitor.target}</td>
                  <td className="py-2">{monitor.uptime24h.toFixed(2)}%</td>
                  <td className="py-2"><StatusPill ok={monitor.status === "up"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

