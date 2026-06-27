import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { dayKey } from "@/lib/format";
import type { MatchView, PredictionView, OtherPrediction } from "@/components/PredictionCard";
import type { Day } from "@/components/DayTabs";
import { PredictionsByDay } from "./predictions-by-day";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PredictionsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const supabase = db();

  const { data: matchesRaw, error } = await supabase
    .from("matches")
    .select(`
      id, stage, group_name, kickoff_at, status,
      home_team_id, away_team_id, home_placeholder, away_placeholder,
      home_score, away_score
    `)
    .order("kickoff_at", { ascending: true });
  if (error) throw new Error(error.message);

  const teamIds = new Set<number>();
  for (const m of matchesRaw ?? []) {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  }
  const { data: teams } = teamIds.size
    ? await supabase.from("teams").select("id, name, short_code, flag_url").in("id", [...teamIds])
    : { data: [] };
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));

  const { data: preds } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score, advancing_team_id, points_total")
    .eq("user_id", session.uid);
  const predMap = new Map<number, PredictionView>(
    (preds ?? []).map((p) => [p.match_id, {
      home_score: p.home_score,
      away_score: p.away_score,
      advancing_team_id: p.advancing_team_id,
      points_total: p.points_total,
    }])
  );

  // Fetch all predictions across users so we can show:
  // - before kickoff: only WHO has submitted (no scores)
  // - after kickoff:   each user's score
  // - after finished:  each user's points
  const [{ data: allPreds }, { data: usersAll }] = await Promise.all([
    supabase
      .from("predictions")
      .select("match_id, user_id, home_score, away_score, advancing_team_id, points_total"),
    supabase.from("users").select("id, display_name"),
  ]);
  const nameMap = new Map((usersAll ?? []).map((u) => [u.id, u.display_name]));
  const totalUsers = (usersAll ?? []).length;

  const othersByMatch: Record<number, OtherPrediction[]> = {};
  for (const p of allPreds ?? []) {
    const arr = othersByMatch[p.match_id] ?? [];
    arr.push({
      user_id: p.user_id,
      display_name: nameMap.get(p.user_id) ?? "?",
      home_score: p.home_score,
      away_score: p.away_score,
      advancing_team_id: p.advancing_team_id,
      points_total: p.points_total,
    });
    othersByMatch[p.match_id] = arr;
  }

  if ((matchesRaw ?? []).length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-base font-semibold text-ink-900">
          Nog geen wedstrijden ingeladen.
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Vraag de admin om de match-sync te draaien.
        </p>
      </div>
    );
  }

  const byDay = new Map<string, MatchView[]>();
  for (const m of matchesRaw ?? []) {
    const k = dayKey(m.kickoff_at);
    const arr = byDay.get(k) ?? [];
    arr.push({
      id: m.id,
      stage: m.stage,
      group_name: m.group_name,
      kickoff_at: m.kickoff_at,
      status: m.status,
      home_team: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
      away_team: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
      home_placeholder: m.home_placeholder,
      away_placeholder: m.away_placeholder,
      home_score: m.home_score,
      away_score: m.away_score,
    });
    byDay.set(k, arr);
  }

  const days: Day[] = [...byDay.keys()].sort().map((k) => {
    const ms = byDay.get(k)!;
    let predicted = 0;
    let points = 0;
    let hasFinished = false;
    for (const m of ms) {
      const p = predMap.get(m.id);
      if (p) predicted++;
      if (m.status === "FINISHED") hasFinished = true;
      points += p?.points_total ?? 0;
    }
    return { key: k, count: ms.length, predicted, points, hasFinished };
  });

  const matchesByDay: Record<string, MatchView[]> = {};
  for (const [k, v] of byDay.entries()) matchesByDay[k] = v;

  const predRecord: Record<number, PredictionView> = {};
  for (const [k, v] of predMap.entries()) predRecord[k] = v;

  return (
    <PredictionsByDay
      days={days}
      matchesByDay={matchesByDay}
      predictions={predRecord}
      othersByMatch={othersByMatch}
      currentUserId={session.uid}
      totalUsers={totalUsers}
    />
  );
}
