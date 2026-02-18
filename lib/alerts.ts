import nodemailer from "nodemailer";
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

export type AlertSettings = {
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

type ChannelResult = {
  sent: boolean;
  status?: number;
  error?: string;
};

function normalizePayload(payload: AlertPayload) {
  return {
    ...payload,
    sentAt: new Date().toISOString(),
    source: "stackwatch"
  };
}

function toTelegramText(payload: AlertPayload) {
  const lines = [
    `StackWatch alert: ${payload.event}`,
    `Summary: ${payload.summary}`,
    payload.monitorName ? `Monitor: ${payload.monitorName}` : "",
    payload.monitorId ? `Monitor ID: ${payload.monitorId}` : "",
    payload.target ? `Target: ${payload.target}` : "",
    payload.startedAt ? `Started: ${payload.startedAt}` : "",
    payload.endedAt ? `Ended: ${payload.endedAt}` : "",
    `Sent: ${new Date().toISOString()}`
  ].filter(Boolean);
  return lines.join("\n");
}

function toEmailText(payload: AlertPayload) {
  return [
    `Event: ${payload.event}`,
    `Summary: ${payload.summary}`,
    payload.monitorName ? `Monitor: ${payload.monitorName}` : "",
    payload.monitorId ? `Monitor ID: ${payload.monitorId}` : "",
    payload.target ? `Target: ${payload.target}` : "",
    payload.startedAt ? `Started: ${payload.startedAt}` : "",
    payload.endedAt ? `Ended: ${payload.endedAt}` : "",
    `Sent at: ${new Date().toISOString()}`
  ]
    .filter(Boolean)
    .join("\n");
}

async function postJson(url: string, body: unknown): Promise<ChannelResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return { sent: response.ok, status: response.status };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Request failed" };
  }
}

async function sendWebhook(settings: AlertSettings, payload: AlertPayload): Promise<ChannelResult> {
  if (!settings.webhookUrl) return { sent: false, error: "not_configured" };
  return postJson(settings.webhookUrl, normalizePayload(payload));
}

async function sendDiscord(settings: AlertSettings, payload: AlertPayload): Promise<ChannelResult> {
  if (!settings.discordWebhookUrl) return { sent: false, error: "not_configured" };

  const content = [
    `**StackWatch ${payload.event}**`,
    payload.summary,
    payload.monitorName ? `Monitor: ${payload.monitorName}` : "",
    payload.target ? `Target: ${payload.target}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return postJson(settings.discordWebhookUrl, { content });
}

async function sendTelegram(settings: AlertSettings, payload: AlertPayload): Promise<ChannelResult> {
  if (!settings.telegramBotToken || !settings.telegramChatId) {
    return { sent: false, error: "not_configured" };
  }

  const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
  return postJson(url, {
    chat_id: settings.telegramChatId,
    text: toTelegramText(payload)
  });
}

async function sendEmail(settings: AlertSettings, payload: AlertPayload): Promise<ChannelResult> {
  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpFrom || !settings.smtpTo) {
    return { sent: false, error: "not_configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPass || "" } : undefined
    });

    const info = await transporter.sendMail({
      from: settings.smtpFrom,
      to: settings.smtpTo,
      subject: `[StackWatch] ${payload.event}: ${payload.summary}`,
      text: toEmailText(payload)
    });

    return { sent: Boolean(info.messageId) };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "SMTP send failed" };
  }
}

export async function getSettings(): Promise<AlertSettings> {
  const { rows } = await query<{
    webhook_url: string | null;
    alert_email: string | null;
    discord_webhook_url: string | null;
    telegram_bot_token: string | null;
    telegram_chat_id: string | null;
    smtp_host: string | null;
    smtp_port: number | null;
    smtp_secure: boolean | null;
    smtp_user: string | null;
    smtp_pass: string | null;
    smtp_from: string | null;
    smtp_to: string | null;
  }>(
    `SELECT webhook_url, alert_email, discord_webhook_url, telegram_bot_token, telegram_chat_id,
            smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from, smtp_to
     FROM settings WHERE id = 1 LIMIT 1`
  );

  return {
    webhookUrl: rows[0]?.webhook_url || "",
    alertEmail: rows[0]?.alert_email || "",
    discordWebhookUrl: rows[0]?.discord_webhook_url || "",
    telegramBotToken: rows[0]?.telegram_bot_token || "",
    telegramChatId: rows[0]?.telegram_chat_id || "",
    smtpHost: rows[0]?.smtp_host || "",
    smtpPort: Number(rows[0]?.smtp_port || 587),
    smtpSecure: Boolean(rows[0]?.smtp_secure || false),
    smtpUser: rows[0]?.smtp_user || "",
    smtpPass: rows[0]?.smtp_pass || "",
    smtpFrom: rows[0]?.smtp_from || "",
    smtpTo: rows[0]?.smtp_to || rows[0]?.alert_email || ""
  };
}

export async function updateSettings(input: Partial<AlertSettings>) {
  await query(
    `UPDATE settings
     SET webhook_url = $1,
         alert_email = $2,
         discord_webhook_url = $3,
         telegram_bot_token = $4,
         telegram_chat_id = $5,
         smtp_host = $6,
         smtp_port = $7,
         smtp_secure = $8,
         smtp_user = $9,
         smtp_pass = $10,
         smtp_from = $11,
         smtp_to = $12,
         updated_at = NOW()
     WHERE id = 1`,
    [
      input.webhookUrl || null,
      input.alertEmail || null,
      input.discordWebhookUrl || null,
      input.telegramBotToken || null,
      input.telegramChatId || null,
      input.smtpHost || null,
      input.smtpPort || 587,
      Boolean(input.smtpSecure),
      input.smtpUser || null,
      input.smtpPass || null,
      input.smtpFrom || null,
      input.smtpTo || null
    ]
  );
  return getSettings();
}

export async function sendAlert(payload: AlertPayload) {
  const settings = await getSettings();
  const [webhook, discord, telegram, email] = await Promise.all([
    sendWebhook(settings, payload),
    sendDiscord(settings, payload),
    sendTelegram(settings, payload),
    sendEmail(settings, payload)
  ]);

  return {
    webhook,
    discord,
    telegram,
    email,
    anySent: webhook.sent || discord.sent || telegram.sent || email.sent
  };
}

// Backward-compatible export name used by monitor-service.
export async function sendWebhookAlert(payload: AlertPayload) {
  return sendAlert(payload);
}
