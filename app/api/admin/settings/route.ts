import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { getSettings, updateSettings } from "@/lib/alerts";
import { settingsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  const raw = await request.json().catch(() => ({}));
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const settings = await updateSettings({
    webhookUrl: parsed.data.webhookUrl || "",
    alertEmail: parsed.data.alertEmail || "",
    discordWebhookUrl: parsed.data.discordWebhookUrl || "",
    telegramBotToken: parsed.data.telegramBotToken || "",
    telegramChatId: parsed.data.telegramChatId || "",
    smtpHost: parsed.data.smtpHost || "",
    smtpPort: parsed.data.smtpPort || 587,
    smtpSecure: Boolean(parsed.data.smtpSecure),
    smtpUser: parsed.data.smtpUser || "",
    smtpPass: parsed.data.smtpPass || "",
    smtpFrom: parsed.data.smtpFrom || "",
    smtpTo: parsed.data.smtpTo || ""
  });

  return NextResponse.json({ settings });
}

