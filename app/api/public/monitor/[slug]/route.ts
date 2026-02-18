import { NextResponse } from "next/server";
import { getMonitorBySlug } from "@/lib/data-service";
import { takeRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = takeRateLimit(`public:monitor:${ip}`, env.publicRateLimitPerMin, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { slug } = await context.params;
  const data = await getMonitorBySlug(slug);
  if (!data) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

