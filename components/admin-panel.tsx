"use client";

import { FormEvent, useState } from "react";

type Monitor = {
  id: number;
  slug: string;
  name: string;
  type: "http" | "tcp";
  target: string;
  expected_status: number | null;
  timeout_ms: number;
  interval_sec: number;
  enabled: boolean;
  last_state_ok: boolean | null;
};

type Settings = {
  webhookUrl: string;
  alertEmail: string;
};

type AdminPanelProps = {
  initialMonitors: Monitor[];
  initialSettings: Settings;
};

const defaultForm = {
  name: "",
  type: "http" as "http" | "tcp",
  target: "",
  expectedStatus: 200,
  timeoutMs: 5000,
  intervalSec: 60,
  enabled: true
};

export function AdminPanel({ initialMonitors, initialSettings }: AdminPanelProps) {
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const refreshData = async () => {
    const [mRes, sRes] = await Promise.all([
      fetch("/api/admin/monitors", { cache: "no-store" }),
      fetch("/api/admin/settings", { cache: "no-store" })
    ]);
    if (mRes.ok) {
      const data = (await mRes.json()) as { monitors: Monitor[] };
      setMonitors(data.monitors || []);
    }
    if (sRes.ok) {
      const data = (await sRes.json()) as { settings: Settings };
      setSettings(data.settings || { webhookUrl: "", alertEmail: "" });
    }
  };

  const startEdit = (monitor: Monitor) => {
    setEditingId(monitor.id);
    setForm({
      name: monitor.name,
      type: monitor.type,
      target: monitor.target,
      expectedStatus: monitor.expected_status || 200,
      timeoutMs: monitor.timeout_ms,
      intervalSec: monitor.interval_sec,
      enabled: monitor.enabled
    });
  };

  const submitMonitor = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    const url = editingId ? `/api/admin/monitors/${editingId}` : "/api/admin/monitors";
    const method = editingId ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "No se pudo guardar monitor.");
      return;
    }

    setForm(defaultForm);
    setEditingId(null);
    setMessage(editingId ? "Monitor actualizado." : "Monitor creado.");
    await refreshData();
  };

  const deleteMonitor = async (id: number) => {
    if (!window.confirm("Eliminar monitor?")) return;
    const response = await fetch(`/api/admin/monitors/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("No se pudo eliminar monitor.");
      return;
    }
    setMessage("Monitor eliminado.");
    if (editingId === id) {
      setEditingId(null);
      setForm(defaultForm);
    }
    await refreshData();
  };

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    if (!response.ok) {
      setMessage("No se pudieron guardar settings.");
      return;
    }
    setMessage("Settings guardados.");
  };

  const sendTestAlert = async () => {
    const response = await fetch("/api/admin/test-alert", { method: "POST" });
    if (!response.ok) {
      setMessage("Fallo test alert.");
      return;
    }
    setMessage("Test alert enviado.");
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-slate-300">CRUD de monitores y alertas</p>
        </div>
        <button onClick={logout} className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
          Cerrar sesion
        </button>
      </header>

      {message && <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">{message}</p>}

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitMonitor} className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-white">{editingId ? "Editar monitor" : "Crear monitor"}</p>
          <input className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <select className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "http" | "tcp" }))}>
            <option value="http">HTTP</option>
            <option value="tcp">TCP</option>
          </select>
          <input className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder={form.type === "http" ? "https://api.example.com/health" : "host:port"} value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))} />
          {form.type === "http" && (
            <input type="number" className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={form.expectedStatus} onChange={(e) => setForm((p) => ({ ...p, expectedStatus: Number(e.target.value) }))} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={form.timeoutMs} onChange={(e) => setForm((p) => ({ ...p, timeoutMs: Number(e.target.value) }))} />
            <input type="number" className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" value={form.intervalSec} onChange={(e) => setForm((p) => ({ ...p, intervalSec: Number(e.target.value) }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} />
            Enabled
          </label>
          <div className="flex gap-2">
            <button className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500" type="submit">{editingId ? "Guardar" : "Crear"}</button>
            {editingId && (
              <button type="button" className="rounded-xl border border-slate-600 px-3 py-2 text-sm" onClick={() => { setEditingId(null); setForm(defaultForm); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <form onSubmit={saveSettings} className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-sm font-semibold text-white">Alertas</p>
          <input className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Webhook URL" value={settings.webhookUrl} onChange={(e) => setSettings((s) => ({ ...s, webhookUrl: e.target.value }))} />
          <input className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Email (opcional stub)" value={settings.alertEmail} onChange={(e) => setSettings((s) => ({ ...s, alertEmail: e.target.value }))} />
          <div className="flex gap-2">
            <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500" type="submit">Guardar settings</button>
            <button type="button" className="rounded-xl border border-slate-600 px-3 py-2 text-sm" onClick={() => void sendTestAlert()}>
              Test alert
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-sm font-semibold text-white">Monitores actuales</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead>
              <tr className="text-slate-400">
                <th className="py-2">Nombre</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Target</th>
                <th className="py-2">Interval</th>
                <th className="py-2">Estado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((m) => (
                <tr key={m.id} className="border-t border-slate-800">
                  <td className="py-2">{m.name}</td>
                  <td className="py-2 uppercase">{m.type}</td>
                  <td className="py-2">{m.target}</td>
                  <td className="py-2">{m.interval_sec}s</td>
                  <td className="py-2">{m.enabled ? "Enabled" : "Disabled"}</td>
                  <td className="py-2 text-right">
                    <button className="mr-2 rounded-lg border border-slate-600 px-2 py-1 text-xs" onClick={() => startEdit(m)}>Editar</button>
                    <button className="rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-300" onClick={() => void deleteMonitor(m.id)}>
                      Eliminar
                    </button>
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
