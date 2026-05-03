"use client";

import { useMemo, useState } from "react";
import { DayTabs, type Day } from "@/components/DayTabs";
import { PredictionCard, type MatchView, type OtherPrediction, type PredictionView } from "@/components/PredictionCard";
import { fmtDayLong, stageLabel, todayKey } from "@/lib/format";

export function PredictionsByDay({
  days,
  matchesByDay,
  predictions,
  othersByMatch,
  currentUserId,
}: {
  days: Day[];
  matchesByDay: Record<string, MatchView[]>;
  predictions: Record<number, PredictionView>;
  othersByMatch: Record<number, OtherPrediction[]>;
  currentUserId: string;
}) {
  const initial = useMemo(() => {
    const today = todayKey();
    if (matchesByDay[today]) return today;
    // pick first day >= today, else last day
    const upcoming = days.find((d) => d.key >= today);
    return upcoming?.key ?? days[days.length - 1]?.key ?? today;
  }, [days, matchesByDay]);

  const [current, setCurrent] = useState<string>(initial);

  const matches = matchesByDay[current] ?? [];
  const dayInfo = days.find((d) => d.key === current);

  // Group within a day by stage (mostly relevant for transition days like end of group stage)
  const byStage = new Map<string, MatchView[]>();
  for (const m of matches) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }

  return (
    <div>
      <DayTabs days={days} current={current} onPick={setCurrent} />

      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold capitalize">
            {fmtDayLong(current)}
          </h1>
          <p className="text-xs text-slate-500">
            {matches.length} wedstrijd{matches.length === 1 ? "" : "en"}
            {dayInfo && dayInfo.predicted < dayInfo.count && !dayInfo.hasFinished && (
              <span className="ml-2 text-warn-400">
                · {dayInfo.count - dayInfo.predicted} nog niet voorspeld
              </span>
            )}
          </p>
        </div>
        {dayInfo?.hasFinished && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Punten dag</div>
            <div className="font-display text-2xl font-bold text-accent-400">+{dayInfo.points}</div>
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="card text-center text-sm text-slate-400">Geen wedstrijden op deze dag.</p>
      ) : (
        <div className="space-y-4">
          {[...byStage.entries()].map(([stage, ms]) => (
            <div key={stage}>
              {byStage.size > 1 && (
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {stageLabel(stage)}
                </h3>
              )}
              <div className="space-y-3">
                {ms.map((m) => (
                  <PredictionCard
                    key={m.id}
                    match={m}
                    prediction={predictions[m.id] ?? null}
                    others={othersByMatch[m.id]}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
