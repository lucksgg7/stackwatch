export function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        ok
          ? "inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300"
          : "inline-flex items-center rounded-full border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300"
      }
    >
      {ok ? "UP" : "DOWN"}
    </span>
  );
}

