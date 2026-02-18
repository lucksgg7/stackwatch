import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export async function requireAdminOr401() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true as const };
}

