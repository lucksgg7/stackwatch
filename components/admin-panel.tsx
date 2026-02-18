"use client";

import { type ComponentType, FormEvent, useMemo, useState } from "react";
import {
  BarChart3,
  Cloud,
  Database,
  Gamepad2,
  GitBranch,
  Globe,
  Rocket,
  Server,
  Shield,
  Wrench
} from "lucide-react";
import type { MonitorTemplate, MonitorTemplateCategory, MonitorTemplateIcon } from "@/lib/monitor-templates";
import { resolveTemplateTarget } from "@/lib/monitor-templates";

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
  initialTemplates: MonitorTemplate[];
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

const panelClass = "rounded-3xl border border-[#e7c866] bg-white/90 p-5 shadow-[0_14px_35px_rgba(129,94,13,0.14)]";
const inputClass =
  "w-full rounded-xl border border-[#dabb67] bg-[#fff9e9] px-3 py-2 text-sm text-[#3f2f0a] placeholder:text-[#9f7f2d] outline-none transition focus:border-[#b8881f]";

const categoryLabel: Record<MonitorTemplateCategory, string> = {
  infra: "Infra",
  database: "Database",
  gaming: "Gaming",
  devops: "DevOps",
  platform: "Platform"
};

const iconMap: Record<MonitorTemplateIcon, ComponentType<{ className?: string }>> = {
  server: Server,
  globe: Globe,
  database: Database,
  shield: Shield,
  "bar-chart": BarChart3,
  "git-branch": GitBranch,
  wrench: Wrench,
  gamepad: Gamepad2,
  rocket: Rocket,
  cloud: Cloud
};

export function AdminPanel({ initialMonitors, initialSettings, initialTemplates }: AdminPanelProps) {
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors);
  const [templates] = useState<MonitorTemplate[]>(initialTemplates);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [templateHost, setTemplateHost] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | MonitorTemplateCategory>("all");

  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) => {
        if (selectedCategory === "all") return true;
        return t.category === selectedCategory;
      }),
    [templates, selectedCategory]
  );

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

  const createFromTemplatePayload = (template: MonitorTemplate) => {
    if (!templateHost.trim()) {
      setMessage(`Indica host/base para usar la plantilla ${template.name}.`);
      return null;
    }

    const target = resolveTemplateTarget(template.targetPattern, templateHost);
    return {
      name: `${template.name} (${templateHost.trim()})`,
      type: template.type,
      target,
      expectedStatus: template.expectedStatus || 200,
      timeoutMs: template.timeoutMs,
      intervalSec: template.intervalSec,
      enabled: true
    };
  };

  const applyTemplateToForm = (template: MonitorTemplate) => {
    const payload = createFromTemplatePayload(template);
    if (!payload) return;

    setEditingId(null);
    setForm(payload);
    setMessage(`Plantilla ${template.name} aplicada al formulario.`);
  };

  const createTemplateOneClick = async (template: MonitorTemplate) => {
    const payload = createFromTemplatePayload(template);
    if (!payload) return;

    const response = await fetch("/api/admin/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setMessage(data.error || `No se pudo crear monitor para ${template.name}.`);
      return;
    }

    setMessage(`Monitor ${template.name} creado.`);
    await refreshData();
  };

  return (
    <div className="space-y-6">
      <header className={`${panelClass} flex items-center justify-between`}>
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#3f2f0a]">Admin Panel</h1>
          <p className="text-sm text-[#6c5418]">Gestion de monitores, plantillas y alertas</p>
        </div>
        <button
          onClick={logout}
          className="rounded-xl border border-[#d9ba66] bg-[#fff6dd] px-4 py-2 text-sm font-semibold text-[#6b4f11] transition hover:border-[#bc8b22] hover:bg-[#ffefc0]"
        >
          Cerrar sesion
        </button>
      </header>

      {message && (
        <p className="rounded-xl border border-[#e7c866] bg-[#fff8df] p-3 text-sm text-[#6b4f11]">
          {message}
        </p>
      )}

      <section className={`${panelClass} space-y-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-[#4a370c]">Plantillas rápidas</p>
            <p className="text-sm text-[#6c5418]">Crea monitores populares en segundos.</p>
          </div>
          <div className="w-full max-w-xs">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6c5418]">Host / base</label>
            <input
              className={inputClass}
              placeholder="ej: status.lucasvicente.es"
              value={templateHost}
              onChange={(e) => setTemplateHost(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selectedCategory === "all" ? "bg-[#c78a15] text-white" : "border border-[#d8bb67] bg-[#fff6dd] text-[#6b4f11]"
            }`}
          >
            Todas
          </button>
          {(Object.keys(categoryLabel) as MonitorTemplateCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                selectedCategory === category ? "bg-[#c78a15] text-white" : "border border-[#d8bb67] bg-[#fff6dd] text-[#6b4f11]"
              }`}
            >
              {categoryLabel[category]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => {
            const Icon = iconMap[template.icon] || Server;
            return (
              <article key={template.id} className="rounded-2xl border border-[#ecd493] bg-[#fff9e9] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffeab5] text-[#7c580f]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#3f2f0a]">{template.name}</p>
                      <p className="text-xs text-[#8c6b1f]">{categoryLabel[template.category]}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#6c5418]">{template.description}</p>
                <p className="mt-2 rounded-lg border border-[#f1dfaf] bg-[#fffdf3] px-2 py-1 text-xs text-[#7c5d17]">
                  {template.targetPattern.replace("{{host}}", template.targetHint)}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplateToForm(template)}
                    className="rounded-lg border border-[#d8bb67] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6b4f11]"
                  >
                    Usar en formulario
                  </button>
                  <button
                    type="button"
                    onClick={() => void createTemplateOneClick(template)}
                    className="rounded-lg bg-[#c78a15] px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Crear 1 clic
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitMonitor} className={`${panelClass} space-y-3`}>
          <p className="text-base font-semibold text-[#4a370c]">{editingId ? "Editar monitor" : "Crear monitor"}</p>
          <input
            className={inputClass}
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "http" | "tcp" }))}
          >
            <option value="http">HTTP</option>
            <option value="tcp">TCP</option>
          </select>
          <input
            className={inputClass}
            placeholder={form.type === "http" ? "https://api.example.com/health" : "host:port"}
            value={form.target}
            onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
          />
          {form.type === "http" && (
            <input
              type="number"
              className={inputClass}
              value={form.expectedStatus}
              onChange={(e) => setForm((p) => ({ ...p, expectedStatus: Number(e.target.value) }))}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className={inputClass}
              value={form.timeoutMs}
              onChange={(e) => setForm((p) => ({ ...p, timeoutMs: Number(e.target.value) }))}
            />
            <input
              type="number"
              className={inputClass}
              value={form.intervalSec}
              onChange={(e) => setForm((p) => ({ ...p, intervalSec: Number(e.target.value) }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#6c5418]">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
            />
            Enabled
          </label>
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-[#c78a15] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ae7710]"
              type="submit"
            >
              {editingId ? "Guardar" : "Crear"}
            </button>
            {editingId && (
              <button
                type="button"
                className="rounded-xl border border-[#d9ba66] bg-[#fff6dd] px-4 py-2 text-sm font-semibold text-[#6b4f11]"
                onClick={() => {
                  setEditingId(null);
                  setForm(defaultForm);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <form onSubmit={saveSettings} className={`${panelClass} space-y-3`}>
          <p className="text-base font-semibold text-[#4a370c]">Alertas</p>
          <input
            className={inputClass}
            placeholder="Webhook URL"
            value={settings.webhookUrl}
            onChange={(e) => setSettings((s) => ({ ...s, webhookUrl: e.target.value }))}
          />
          <input
            className={inputClass}
            placeholder="Email (opcional)"
            value={settings.alertEmail}
            onChange={(e) => setSettings((s) => ({ ...s, alertEmail: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-[#b47f14] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#996b0e]"
              type="submit"
            >
              Guardar settings
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#d9ba66] bg-[#fff6dd] px-4 py-2 text-sm font-semibold text-[#6b4f11]"
              onClick={() => void sendTestAlert()}
            >
              Test alert
            </button>
          </div>
        </form>
      </section>

      <section className={panelClass}>
        <p className="text-base font-semibold text-[#4a370c]">Monitores actuales</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#3f2f0a]">
            <thead>
              <tr className="border-b border-[#ecd493] text-[#6c5418]">
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
                <tr key={m.id} className="border-b border-[#f2e3bc] last:border-0">
                  <td className="py-2 font-semibold">{m.name}</td>
                  <td className="py-2 uppercase">{m.type}</td>
                  <td className="py-2">{m.target}</td>
                  <td className="py-2">{m.interval_sec}s</td>
                  <td className="py-2">{m.enabled ? "Enabled" : "Disabled"}</td>
                  <td className="py-2 text-right">
                    <button
                      className="mr-2 rounded-lg border border-[#d9ba66] bg-[#fff6dd] px-2 py-1 text-xs font-semibold text-[#6b4f11]"
                      onClick={() => startEdit(m)}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-lg border border-[#e8b6b6] bg-[#fff1f1] px-2 py-1 text-xs font-semibold text-[#a12d2d]"
                      onClick={() => void deleteMonitor(m.id)}
                    >
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

