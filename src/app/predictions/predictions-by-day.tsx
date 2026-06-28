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
  totalUsers,
  adminOverride,
}: {
  days: Day[];
  matchesByDay: Record<string, MatchView[]>;
  predictions: Record<number, PredictionView>;
  othersByMatch: Record<number, OtherPrediction[]>;
  currentUserId: string;
  totalUsers: number;
  adminOverride?: boolean;
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

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold capitalize tracking-tightest text-ink-900">
            {fmtDayLong(current)}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {matches.length} wedstrijd{matches.length === 1 ? "" : "en"}
            {dayInfo && dayInfo.predicted < dayInfo.count && !dayInfo.hasFinished && (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn">
                {dayInfo.count - dayInfo.predicted} open
              </span>
            )}
          </p>
        </div>
        {dayInfo?.hasFinished && dayInfo.points > 0 && (
          <div className="rounded-2xl bg-brand-50 px-3 py-2 text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-brand-600">Punten</div>
            <div className="text-2xl font-bold tabular-nums text-brand-600">+{dayInfo.points}</div>
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-500">Geen wedstrijden op deze dag.</p>
      ) : (
        <div className="space-y-6">
          {[...byStage.entries()].map(([stage, ms]) => (
            <div key={stage}>
              {byStage.size > 1 && (
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
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
                    totalUsers={totalUsers}
                    adminOverride={adminOverride}
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
