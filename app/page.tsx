import Link from "next/link";
import { PublicDashboard } from "@/components/public-dashboard";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav className="mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
        <span className="text-sm font-semibold tracking-[0.2em] text-slate-300">VPS MONITOR</span>
        <Link href="/admin" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
          Admin
        </Link>
      </nav>
      <PublicDashboard />
    </main>
  );
}

