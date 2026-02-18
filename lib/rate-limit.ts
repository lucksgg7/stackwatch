const windows = new Map<string, { count: number; resetAt: number }>();

export function takeRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (current.count >= max) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  windows.set(key, current);
  return { ok: true, remaining: max - current.count, resetAt: current.resetAt };
}

