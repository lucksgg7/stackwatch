import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { createAdminSession, setAdminSessionCookie } from "@/lib/auth";
import { takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = takeRateLimit(`admin-login:${ip}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const input = String(body.password || "");

  let ok = false;
  if (env.adminPassword.startsWith("$2")) {
    ok = await bcrypt.compare(input, env.adminPassword);
  } else {
    ok = input === env.adminPassword;
  }

  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await createAdminSession();
  await setAdminSessionCookie(token);
  return NextResponse.json({ ok: true });
}

