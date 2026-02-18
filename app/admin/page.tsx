import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminPanel } from "@/components/admin-panel";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/alerts";
import type { Monitor } from "@/lib/types";

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
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <AdminPanel initialMonitors={monitors} initialSettings={settings} />
    </main>
  );
}

