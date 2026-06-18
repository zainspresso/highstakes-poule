"use server";

import { db } from "@/lib/supabase";
import { requireSession } from "@/lib/session";

export type TeamHistoryMatch = {
  match_id: number;
  kickoff_at: string;
  stage: string;
  group_name: string | null;
  status: string;
  is_home: boolean;
  opponent_id: number | null;
  opponent_name: string;
  opponent_short: string | null;
  opponent_flag: string | null;
  team_score: number | null;
  opponent_score: number | null;
};

export type TeamHistory = {
  team_id: number;
  team_name: string;
  matches: TeamHistoryMatch[];
};

export async function getTeamHistory(teamId: number): Promise<TeamHistory | { error: string }> {
  await requireSession();

  const supabase = db();

  const { data: team, error: tErr } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle();
  if (tErr) return { error: tErr.message };
  if (!team) return { error: "Team niet gevonden." };

  const { data: rows, error: mErr } = await supabase
    .from("matches")
    .select(`
      id, stage, group_name, kickoff_at, status,
      home_team_id, away_team_id, home_score, away_score
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("status", "FINISHED")
    .order("kickoff_at", { ascending: false });
  if (mErr) return { error: mErr.message };

  const opponentIds = new Set<number>();
  for (const m of rows ?? []) {
    const oppId = m.home_team_id === teamId ? m.away_team_id : m.home_team_id;
    if (oppId != null) opponentIds.add(oppId);
  }

  const { data: opponents } = opponentIds.size
    ? await supabase
        .from("teams")
        .select("id, name, short_code, flag_url")
        .in("id", [...opponentIds])
    : { data: [] };
  const oppMap = new Map((opponents ?? []).map((t) => [t.id, t]));

  const matches: TeamHistoryMatch[] = (rows ?? []).map((m) => {
    const isHome = m.home_team_id === teamId;
    const oppId = isHome ? m.away_team_id : m.home_team_id;
    const opp = oppId != null ? oppMap.get(oppId) : null;
    return {
      match_id: m.id,
      kickoff_at: m.kickoff_at,
      stage: m.stage,
      group_name: m.group_name,
      status: m.status,
      is_home: isHome,
      opponent_id: oppId,
      opponent_name: opp?.name ?? "TBD",
      opponent_short: opp?.short_code ?? null,
      opponent_flag: opp?.flag_url ?? null,
      team_score: isHome ? m.home_score : m.away_score,
      opponent_score: isHome ? m.away_score : m.home_score,
    };
  });

  return { team_id: team.id, team_name: team.name, matches };
}
