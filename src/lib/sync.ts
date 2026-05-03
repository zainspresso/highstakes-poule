import "server-only";
import { db } from "./supabase";
import { deriveAdvancingTeamId, fetchAllMatches, type FootballDataMatch } from "./football-data";
import { recomputeMatchScores } from "./scoring";

export async function syncMatches(): Promise<{ teams: number; matches: number; rescored: number[] }> {
  const supabase = db();
  const apiMatches = await fetchAllMatches();

  const teams = new Map<number, { id: number; name: string; short_code: string | null; flag_url: string | null }>();
  for (const m of apiMatches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (t?.id != null && t.name) {
        teams.set(t.id, {
          id: t.id,
          name: t.name,
          short_code: t.tla ?? t.shortName ?? null,
          flag_url: t.crest ?? null,
        });
      }
    }
  }

  if (teams.size > 0) {
    const upT = await supabase.from("teams").upsert([...teams.values()], { onConflict: "id" });
    if (upT.error) throw new Error(`teams upsert: ${upT.error.message}`);
  }

  const rescored: number[] = [];

  const existingRes = await supabase.from("matches").select("id, status, home_score, away_score");
  if (existingRes.error) throw new Error(`matches read: ${existingRes.error.message}`);
  const existing = new Map<number, { status: string; home_score: number | null; away_score: number | null }>();
  for (const row of existingRes.data ?? []) existing.set(row.id, row);

  const rows = apiMatches.map((m) => mapMatch(m));
  if (rows.length > 0) {
    const upM = await supabase.from("matches").upsert(rows, { onConflict: "id" });
    if (upM.error) throw new Error(`matches upsert: ${upM.error.message}`);
  }

  for (const m of apiMatches) {
    const prev = existing.get(m.id);
    const newlyFinished = m.status === "FINISHED" && (!prev || prev.status !== "FINISHED");
    const scoreChanged =
      m.status === "FINISHED" &&
      prev?.status === "FINISHED" &&
      (prev.home_score !== m.score.fullTime.home || prev.away_score !== m.score.fullTime.away);

    if (newlyFinished || scoreChanged) {
      await recomputeMatchScores(m.id);
      rescored.push(m.id);
    }
  }

  return { teams: teams.size, matches: rows.length, rescored };
}

function mapMatch(m: FootballDataMatch) {
  return {
    id: m.id,
    stage: m.stage,
    group_name: m.group ? m.group.replace(/^GROUP_?/i, "") : null,
    home_team_id: m.homeTeam?.id ?? null,
    away_team_id: m.awayTeam?.id ?? null,
    home_placeholder: m.homeTeam?.id == null ? (m.homeTeam?.name ?? m.homeTeamPlaceholder ?? null) : null,
    away_placeholder: m.awayTeam?.id == null ? (m.awayTeam?.name ?? m.awayTeamPlaceholder ?? null) : null,
    kickoff_at: m.utcDate,
    status: m.status,
    home_score: m.score.fullTime.home,
    away_score: m.score.fullTime.away,
    winner: m.score.winner,
    advancing_team_id: deriveAdvancingTeamId(m),
  };
}
