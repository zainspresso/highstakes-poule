"use client";

import { useEffect, useRef } from "react";
import { fmtDayShort, todayKey } from "@/lib/format";

export type Day = {
  key: string;             // YYYY-MM-DD
  count: number;           // matches that day
  predicted: number;       // predictions filled in by user
  points: number;          // points earned that day
  hasFinished: boolean;
};

export function DayTabs({
  days,
  current,
  onPick,
}: {
  days: Day[];
  current: string;
  onPick: (key: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const today = todayKey();

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-day="${current}"]`);
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [current]);

  const idx = days.findIndex((d) => d.key === current);
  const prev = idx > 0 ? days[idx - 1] : null;
  const next = idx < days.length - 1 ? days[idx + 1] : null;

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-3 border-b border-white/5 bg-ink-900/85 px-4 py-2 backdrop-blur sm:top-[57px]">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => prev && onPick(prev.key)}
          disabled={!prev}
          aria-label="Vorige dag"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div ref={scrollerRef} className="scroll-x flex flex-1 items-stretch gap-1 overflow-x-auto">
          {days.map((d) => {
            const active = d.key === current;
            const isToday = d.key === today;
            const { weekday, day, month } = fmtDayShort(d.key);
            return (
              <button
                key={d.key}
                data-day={d.key}
                type="button"
                onClick={() => onPick(d.key)}
                className={`relative flex min-w-[68px] shrink-0 flex-col items-center rounded-xl px-3 py-2 transition ${
                  active
                    ? "bg-accent-500/15 ring-1 ring-accent-500/40"
                    : "hover:bg-white/5"
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider ${active ? "text-accent-400" : "text-slate-500"}`}>
                  {weekday}
                </span>
                <span className={`text-base font-bold ${active ? "text-white" : "text-slate-200"}`}>
                  {day} {month}
                </span>
                <span className="mt-1 flex items-center gap-1">
                  {d.hasFinished && d.points > 0 && (
                    <span className="rounded-full bg-accent-500/20 px-1.5 py-0.5 text-[9px] font-bold text-accent-400">
                      +{d.points}
                    </span>
                  )}
                  {d.predicted < d.count && !d.hasFinished && (
                    <span className="rounded-full bg-warn-500/20 px-1.5 py-0.5 text-[9px] font-bold text-warn-400">
                      {d.predicted}/{d.count}
                    </span>
                  )}
                  {d.predicted === d.count && d.count > 0 && !d.hasFinished && (
                    <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-accent-500/20 text-accent-400">
                      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                </span>
                {isToday && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent-500" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => next && onPick(next.key)}
          disabled={!next}
          aria-label="Volgende dag"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}
