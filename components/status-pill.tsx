export function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        ok
          ? "inline-flex items-center rounded-full border border-[#bde8d8] bg-[#e8f9f2] px-2.5 py-1 text-xs font-semibold text-[#0a7d53]"
          : "inline-flex items-center rounded-full border border-[#f6cccc] bg-[#fff0f0] px-2.5 py-1 text-xs font-semibold text-[#a02323]"
      }
    >
      {ok ? "UP" : "DOWN"}
    </span>
  );
}
