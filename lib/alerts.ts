import { query } from "@/lib/db";

type AlertPayload = {
  event: "incident_opened" | "incident_closed" | "test";
  monitorId?: number;
  monitorName?: string;
  target?: string;
  summary: string;
  startedAt?: string;
  endedAt?: string;
};

export async function getSettings() {
  const { rows } = await query<{ webhook_url: string | null; alert_email: string | null }>(
    "SELECT webhook_url, alert_email FROM settings WHERE id = 1 LIMIT 1"
  );
  return {
    webhookUrl: rows[0]?.webhook_url || "",
    alertEmail: rows[0]?.alert_email || ""
  };
}

export async function updateSettings(input: { webhookUrl?: string; alertEmail?: string }) {
  await query(
    "UPDATE settings SET webhook_url = $1, alert_email = $2, updated_at = NOW() WHERE id = 1",
    [input.webhookUrl || null, input.alertEmail || null]
  );
  return getSettings();
}

export async function sendWebhookAlert(payload: AlertPayload) {
  const settings = await getSettings();
  if (!settings.webhookUrl) return { sent: false };

  try {
    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        sentAt: new Date().toISOString(),
        source: "vps-monitor"
      })
    });
    return { sent: response.ok, status: response.status };
  } catch {
    return { sent: false, status: 0 };
  }
}

