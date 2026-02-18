import { NextResponse } from "next/server";
import { getPublicSummary, getVpsHistory } from "@/lib/data-service";
import { takeRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = takeRateLimit(`public:summary:${ip}`, env.publicRateLimitPerMin, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const [summary, history] = await Promise.all([getPublicSummary(), getVpsHistory(120)]);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    ...summary,
    vpsHistory: history
  });
}

