import Link from "next/link";
import { PublicDashboard } from "@/components/public-dashboard";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <nav className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 shadow-[0_10px_30px_rgba(15,45,90,0.08)] backdrop-blur">
        <div>
          <p className="font-display text-lg font-semibold tracking-[0.18em] text-[#16345c]">STACKWATCH</p>
          <p className="text-xs text-[var(--muted)]">Real-time VPS and service telemetry</p>
        </div>
        <Link href="/admin" className="rounded-xl border border-[#b8c9e4] bg-white px-4 py-2 text-sm font-semibold text-[#173761] transition hover:-translate-y-0.5 hover:border-[#7fa7da] hover:shadow-sm">
          Admin
        </Link>
      </nav>
      <PublicDashboard />
    </main>
  );
}
