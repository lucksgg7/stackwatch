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
    alertEmail: parsed.data.alertEmail || ""
  });

  return NextResponse.json({ settings });
}

