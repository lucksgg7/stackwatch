import { NextResponse } from "next/server";
import { requireAdminOr401 } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { monitorCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const monitorId = Number(id);
  if (!Number.isFinite(monitorId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = monitorCreateSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const current = await query<{ id: number; name: string; type: "http" | "tcp" | "udp"; target: string; featured: boolean; sort_order: number; expected_status: number | null; timeout_ms: number; interval_sec: number; enabled: boolean }>(
    "SELECT id, name, type, target, featured, sort_order, expected_status, timeout_ms, interval_sec, enabled FROM monitors WHERE id = $1 LIMIT 1",
    [monitorId]
  );
  if (!current.rows[0]) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });

  const next = {
    name: parsed.data.name ?? current.rows[0].name,
    type: parsed.data.type ?? current.rows[0].type,
    target: parsed.data.target ?? current.rows[0].target,
    featured: parsed.data.featured ?? current.rows[0].featured,
    sortOrder: parsed.data.sortOrder ?? current.rows[0].sort_order,
    expectedStatus: parsed.data.expectedStatus ?? current.rows[0].expected_status ?? undefined,
    timeoutMs: parsed.data.timeoutMs ?? current.rows[0].timeout_ms,
    intervalSec: parsed.data.intervalSec ?? current.rows[0].interval_sec,
    enabled: parsed.data.enabled ?? current.rows[0].enabled
  };

  const fullValidation = monitorCreateSchema.safeParse(next);
  if (!fullValidation.success) {
    return NextResponse.json({ error: fullValidation.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const { rows } = await query(
    `UPDATE monitors
     SET name = $1, type = $2, target = $3, featured = $4, sort_order = $5, expected_status = $6, timeout_ms = $7, interval_sec = $8, enabled = $9
     WHERE id = $10
     RETURNING id, slug, name, type, target, featured, sort_order, expected_status, timeout_ms, interval_sec, enabled, created_at`,
    [next.name, next.type, next.target, next.featured, next.sortOrder, next.expectedStatus || null, next.timeoutMs, next.intervalSec, next.enabled, monitorId]
  );

  return NextResponse.json({ monitor: rows[0] });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr401();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const monitorId = Number(id);
  if (!Number.isFinite(monitorId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = await query("DELETE FROM monitors WHERE id = $1", [monitorId]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

