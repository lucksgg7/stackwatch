import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminPanel } from "@/components/admin-panel";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/alerts";
import type { Monitor } from "@/lib/types";
import { MONITOR_TEMPLATES } from "@/lib/monitor-templates";

type AdminMonitor = Monitor & {
  fail_streak: number;
  ok_streak: number;
  last_state_ok: boolean | null;
};

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) redirect("/admin/login");

  const [{ rows: monitors }, settings] = await Promise.all([
    query<AdminMonitor>(
      `SELECT id, slug, name, type, target, expected_status, timeout_ms, interval_sec,
              enabled, fail_streak, ok_streak, last_state_ok, created_at
       FROM monitors ORDER BY id ASC`
    ),
    getSettings()
  ]);

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-8"
      style={{
        backgroundImage:
          "radial-gradient(circle at 8% 5%, rgba(255, 232, 139, 0.7) 0%, transparent 28%), radial-gradient(circle at 90% 2%, rgba(255, 190, 60, 0.35) 0%, transparent 24%), linear-gradient(180deg, #fff9de 0%, #ffeeb5 100%)"
      }}
    >
      <AdminPanel initialMonitors={monitors} initialSettings={settings} initialTemplates={MONITOR_TEMPLATES} />
    </main>
  );
}

