import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runChecksCycle } from "@/lib/monitor-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("x-worker-token") || "";
  if (token !== env.workerToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runChecksCycle();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

