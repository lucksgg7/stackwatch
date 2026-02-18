import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { monitorCreateSchema, slugify } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  const { rows } = await query(
    `SELECT id, slug, name, type, target, expected_status, timeout_ms, interval_sec,
            enabled, fail_streak, ok_streak, last_state_ok, created_at
     FROM monitors ORDER BY id ASC`
  );
  return NextResponse.json({ monitors: rows });
}

export async function POST(request: Request) {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  const raw = await request.json().catch(() => ({}));
  const parsed = monitorCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const input = parsed.data;
  let slug = slugify(input.name);
  if (!slug) slug = `monitor-${Date.now()}`;

  const check = await query<{ id: number }>("SELECT id FROM monitors WHERE slug = $1 LIMIT 1", [slug]);
  if (check.rows[0]) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const { rows } = await query(
    `INSERT INTO monitors (
      slug, name, type, target, expected_status, timeout_ms, interval_sec, enabled
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id, slug, name, type, target, expected_status, timeout_ms, interval_sec, enabled, created_at`,
    [slug, input.name, input.type, input.target, input.expectedStatus || null, input.timeoutMs, input.intervalSec, input.enabled]
  );

  return NextResponse.json({ monitor: rows[0] });
}

