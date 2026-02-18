import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { MONITOR_TEMPLATES } from "@/lib/monitor-templates";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  return NextResponse.json({ templates: MONITOR_TEMPLATES });
}

