"use client";

import { useEffect, useState } from "react";

/** Live mm:ss until the hold runs out. */
export function useCountdown(until: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!until) return null;
  const left = Math.max(0, new Date(until).getTime() - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return { left, text: h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, "0")}` };
}
