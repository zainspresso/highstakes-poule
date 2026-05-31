"use client";

import { useEffect, useRef } from "react";
import { fmtDayShort, todayKey } from "@/lib/format";

export type Day = {
  key: string;
  count: number;
  predicted: number;
  points: number;
  hasFinished: boolean;
};

export function DayTabs({
  days, current, onPick,
}: { days: Day[]; current: string; onPick: (key: string) => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const today = todayKey();

  useEffect(() => {
    const el = scrollerRef.current; if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-day="${current}"]`);
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [current]);

  const idx = days.findIndex((d) => d.key === current);
  const prev = idx > 0 ? days[idx - 1] : null;
  const next = idx < days.length - 1 ? days[idx + 1] : null;

  return (
    <div className="sticky top-0 z-20 -mx-5 mb-5 border-b border-line bg-bg/90 backdrop-blur sm:top-14">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={() => prev && onPick(prev.key)} disabled={!prev}
          aria-label="Vorige dag" className="btn-icon shrink-0">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div ref={scrollerRef} className="scroll-x flex flex-1 items-stretch gap-1.5 overflow-x-auto">
          {days.map((d) => {
            const active = d.key === current;
            const isToday = d.key === today;
            const { weekday, day, month } = fmtDayShort(d.key);
            return (
              <button
                key={d.key} data-day={d.key} type="button" onClick={() => onPick(d.key)}
                className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-2xl px-3 py-2 transition ${
                  active
                    ? "bg-ink-900 text-white"
                    : "text-ink-700 hover:bg-bg"
                }`}
              >
                <span className={`text-[10px] font-medium uppercase tracking-wider ${active ? "text-white/70" : "text-ink-500"}`}>
                  {weekday}
                </span>
                <span className="text-[15px] font-bold leading-tight tabular-nums">
                  {day} {month}
                </span>
                <span className="mt-1 flex h-3 items-center">
                  {d.hasFinished && d.points > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums ${
                      active ? "bg-white/20 text-white" : "bg-brand-50 text-brand-600"
                    }`}>+{d.points}</span>
                  )}
                  {!d.hasFinished && d.predicted < d.count && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums ${
                      active ? "bg-white/20 text-white" : "bg-warn/10 text-warn"
                    }`}>{d.predicted}/{d.count}</span>
                  )}
                  {!d.hasFinished && d.predicted === d.count && d.count > 0 && (
                    <svg viewBox="0 0 24 24" className={`h-3 w-3 ${active ? "text-white" : "text-ok"}`} fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isToday && !active && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => next && onPick(next.key)} disabled={!next}
          aria-label="Volgende dag" className="btn-icon shrink-0">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
