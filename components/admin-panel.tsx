"use client";

import Link from "next/link";
import { type ComponentType, FormEvent, useMemo, useRef, useState } from "react";
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
  type: "http" | "tcp" | "udp";
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
  discordWebhookUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpTo: string;
};

type AdminPanelProps = {
  initialMonitors: Monitor[];
  initialSettings: Settings;
  initialTemplates: MonitorTemplate[];
};

const defaultForm = {
  name: "",
  type: "http" as "http" | "tcp" | "udp",
  target: "",
  expectedStatus: 200,
  timeoutMs: 5000,
  intervalSec: 60,
  enabled: true
};

const panelClass = "rounded-3xl border border-[#e7c866] bg-white/90 p-5 shadow-[0_14px_35px_rgba(129,94,13,0.14)]";
const inputClass =
  "w-full rounded-xl border border-[#dabb67] bg-[#fff9e9] px-3 py-2 text-sm text-[#3f2f0a] placeholder:text-[#9f7f2d] outline-none transition focus:border-[#b8881f]";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[#c78a15] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(161,112,14,0.35)] transition hover:-translate-y-0.5 hover:bg-[#ae7710] hover:shadow-[0_10px_18px_rgba(161,112,14,0.35)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8881f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff9e9] disabled:cursor-not-allowed disabled:opacity-55";
const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-[#d9ba66] bg-[#fff6dd] px-4 py-2 text-sm font-semibold text-[#6b4f11] shadow-[0_3px_10px_rgba(161,112,14,0.15)] transition hover:-translate-y-0.5 hover:border-[#bc8b22] hover:bg-[#ffefc0] hover:shadow-[0_8px_14px_rgba(161,112,14,0.2)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8881f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff9e9] disabled:cursor-not-allowed disabled:opacity-55";
const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-[#e8b6b6] bg-[#fff1f1] px-2 py-1 text-xs font-semibold text-[#a12d2d] transition hover:-translate-y-0.5 hover:bg-[#ffe6e6] active:translate-y-0 active:scale-[0.98]";

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
  const [templateHint, setTemplateHint] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | MonitorTemplateCategory>("all");
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const hostInputRef = useRef<HTMLInputElement | null>(null);

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
      setSettings(
        data.settings || {
          webhookUrl: "",
          alertEmail: "",
          discordWebhookUrl: "",
          telegramBotToken: "",
          telegramChatId: "",
          smtpHost: "",
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: "",
          smtpPass: "",
          smtpFrom: "",
          smtpTo: ""
        }
      );
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
      setMessage(payload.error || "Could not save monitor.");
      return;
    }

    setForm(defaultForm);
    setEditingId(null);
    setMessage(editingId ? "Monitor updated." : "Monitor created.");
    await refreshData();
  };

  const deleteMonitor = async (id: number) => {
    if (!window.confirm("Delete monitor?")) return;
    const response = await fetch(`/api/admin/monitors/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Could not delete monitor.");
      return;
    }
    setMessage("Monitor deleted.");
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
      setMessage("Could not save settings.");
      return;
    }
    setMessage("Settings saved.");
  };

  const sendTestAlert = async () => {
    const response = await fetch("/api/admin/test-alert", { method: "POST" });
    if (!response.ok) {
      setMessage("Test alert failed.");
      return;
    }
    setMessage("Test alert sent.");
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const createFromTemplatePayload = (template: MonitorTemplate) => {
    if (!templateHost.trim()) {
      setTemplateHint("Enter a host/base first (example: status.lucasvicente.es).");
      hostInputRef.current?.focus();
      return null;
    }
    setTemplateHint("");

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
    setMessage(`Template ${template.name} applied to form.`);
  };

  const createTemplateOneClick = async (template: MonitorTemplate) => {
    const payload = createFromTemplatePayload(template);
    if (!payload) return;
    setCreatingTemplateId(template.id);

    const response = await fetch("/api/admin/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setMessage(data.error || `Could not create monitor for ${template.name}.`);
      setCreatingTemplateId(null);
      return;
    }

    setMessage(`Monitor ${template.name} created.`);
    setCreatingTemplateId(null);
    await refreshData();
  };

  return (
    <div className="space-y-6">
      <header className={`${panelClass} flex items-center justify-between`}>
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#3f2f0a]">Admin Panel</h1>
          <p className="text-sm text-[#6c5418]">Manage monitors, templates and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={btnSecondary}
          >
            Back to status
          </Link>
          <button
            onClick={logout}
            className={btnSecondary}
          >
            Sign out
          </button>
        </div>
      </header>

      {message && (
        <p className="rounded-xl border border-[#e7c866] bg-[#fff8df] p-3 text-sm text-[#6b4f11]">
          {message}
        </p>
      )}

      <section className={`${panelClass} space-y-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-[#4a370c]">Template Library</p>
            <p className="text-sm text-[#6c5418]">Prebuilt monitor presets for common stacks and game servers.</p>
          </div>
          <div className="w-full max-w-xs">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6c5418]">Host / base</label>
            <input
              ref={hostInputRef}
              className={inputClass}
              placeholder="e.g. status.lucasvicente.es"
              value={templateHost}
              onChange={(e) => {
                setTemplateHost(e.target.value);
                if (templateHint) setTemplateHint("");
              }}
            />
            <p className="mt-1 text-xs text-[#7b6222]">Required for template actions.</p>
          </div>
        </div>
        {templateHint && <p className="rounded-lg border border-[#f0d08a] bg-[#fff4cf] px-3 py-2 text-xs text-[#7a5a11]">{templateHint}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selectedCategory === "all" ? "bg-[#c78a15] text-white" : "border border-[#d8bb67] bg-[#fff6dd] text-[#6b4f11]"
            }`}
          >
            All
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
                    disabled={!templateHost.trim()}
                    className={`${btnSecondary} rounded-lg px-2.5 py-1.5 text-xs`}
                  >
                    Use in form
                  </button>
                  <button
                    type="button"
                    onClick={() => void createTemplateOneClick(template)}
                    disabled={!templateHost.trim() || creatingTemplateId === template.id}
                    className={`${btnPrimary} rounded-lg px-2.5 py-1.5 text-xs`}
                  >
                    {creatingTemplateId === template.id ? "Creating..." : "One-click create"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitMonitor} className={`${panelClass} space-y-3`}>
          <p className="text-base font-semibold text-[#4a370c]">{editingId ? "Edit monitor" : "Create monitor"}</p>
          <input
            className={inputClass}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "http" | "tcp" | "udp" }))}
          >
            <option value="http">HTTP</option>
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
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
              className={btnPrimary}
              type="submit"
            >
              {editingId ? "Save" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setEditingId(null);
                  setForm(defaultForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <form onSubmit={saveSettings} className={`${panelClass} space-y-3`}>
          <p className="text-base font-semibold text-[#4a370c]">Alerts</p>
          <p className="text-xs text-[#6c5418]">Legacy webhook</p>
          <input
            className={inputClass}
            placeholder="Webhook URL"
            value={settings.webhookUrl}
            onChange={(e) => setSettings((s) => ({ ...s, webhookUrl: e.target.value }))}
          />
          <input
            className={inputClass}
            placeholder="Legacy alert email (optional)"
            value={settings.alertEmail}
            onChange={(e) => setSettings((s) => ({ ...s, alertEmail: e.target.value }))}
          />
          <p className="pt-2 text-xs text-[#6c5418]">Discord</p>
          <input
            className={inputClass}
            placeholder="Discord webhook URL"
            value={settings.discordWebhookUrl}
            onChange={(e) => setSettings((s) => ({ ...s, discordWebhookUrl: e.target.value }))}
          />
          <p className="pt-2 text-xs text-[#6c5418]">Telegram</p>
          <input
            className={inputClass}
            placeholder="Telegram bot token"
            value={settings.telegramBotToken}
            onChange={(e) => setSettings((s) => ({ ...s, telegramBotToken: e.target.value }))}
          />
          <input
            className={inputClass}
            placeholder="Telegram chat ID"
            value={settings.telegramChatId}
            onChange={(e) => setSettings((s) => ({ ...s, telegramChatId: e.target.value }))}
          />
          <p className="pt-2 text-xs text-[#6c5418]">SMTP Email</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              placeholder="SMTP host"
              value={settings.smtpHost}
              onChange={(e) => setSettings((s) => ({ ...s, smtpHost: e.target.value }))}
            />
            <input
              type="number"
              className={inputClass}
              placeholder="SMTP port"
              value={settings.smtpPort}
              onChange={(e) => setSettings((s) => ({ ...s, smtpPort: Number(e.target.value || 587) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              placeholder="SMTP user (optional)"
              value={settings.smtpUser}
              onChange={(e) => setSettings((s) => ({ ...s, smtpUser: e.target.value }))}
            />
            <input
              type="password"
              className={inputClass}
              placeholder="SMTP password (optional)"
              value={settings.smtpPass}
              onChange={(e) => setSettings((s) => ({ ...s, smtpPass: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              placeholder="From email"
              value={settings.smtpFrom}
              onChange={(e) => setSettings((s) => ({ ...s, smtpFrom: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="To email"
              value={settings.smtpTo}
              onChange={(e) => setSettings((s) => ({ ...s, smtpTo: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#6c5418]">
            <input
              type="checkbox"
              checked={settings.smtpSecure}
              onChange={(e) => setSettings((s) => ({ ...s, smtpSecure: e.target.checked }))}
            />
            Use TLS/SSL (`smtpSecure`)
          </label>
          <div className="flex gap-2">
            <button
              className={btnPrimary}
              type="submit"
            >
              Save settings
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => void sendTestAlert()}
            >
              Send test alert
            </button>
          </div>
        </form>
      </section>

      <section className={panelClass}>
        <p className="text-base font-semibold text-[#4a370c]">Current monitors</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#3f2f0a]">
            <thead>
              <tr className="border-b border-[#ecd493] text-[#6c5418]">
                <th className="py-2">Name</th>
                <th className="py-2">Type</th>
                <th className="py-2">Target</th>
                <th className="py-2">Interval</th>
                <th className="py-2">State</th>
                <th className="py-2 text-right">Actions</th>
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
                      className={`${btnSecondary} mr-2 rounded-lg px-2 py-1 text-xs`}
                      onClick={() => startEdit(m)}
                    >
                      Edit
                    </button>
                    <button
                      className={btnDanger}
                      onClick={() => void deleteMonitor(m.id)}
                    >
                      Delete
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





