import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { sendWebhookAlert } from "@/lib/alerts";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  const result = await sendWebhookAlert({
    event: "test",
    summary: "This is a test alert from VPS Monitor"
  });
  return NextResponse.json({ ok: true, result });
}

