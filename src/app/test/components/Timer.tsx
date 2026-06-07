"use client";

import { useEffect, useRef, useState } from "react";
import { formatRemaining } from "@/lib/format-time";

/**
 * Counts down from the server-provided remaining time using the monotonic
 * performance clock (immune to device wall-clock changes / hidden-tab timer
 * throttling, since it recomputes from a fixed origin on every tick). Calls
 * onExpire exactly once when it reaches zero.
 */
export function Timer({
  remainingMs,
  onExpire,
}: {
  remainingMs: number;
  onExpire: () => void;
}) {
  const [display, setDisplay] = useState(remainingMs);
  const originPerf = useRef<number>(0);
  const startRemaining = useRef<number>(remainingMs);
  const fired = useRef(false);

  useEffect(() => {
    originPerf.current = performance.now();
    startRemaining.current = remainingMs;
    fired.current = false;

    const tick = () => {
      const elapsed = performance.now() - originPerf.current;
      const left = startRemaining.current - elapsed;
      setDisplay(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [remainingMs, onExpire]);

  const low = display <= 60_000;

  return (
    <div
      className={`tabular-nums text-lg font-bold ${low ? "text-red-600" : "text-accent"}`}
      aria-live="polite"
      aria-label="Time remaining"
    >
      ⏱ {formatRemaining(display)}
    </div>
  );
}
