import "server-only";
import { db } from "./supabase";
import { deriveAdvancingTeamId, fetchAllMatches, type FootballDataMatch } from "./football-data";
import { recomputeMatchScores } from "./scoring";

type ExistingMatch = {
  id: number;
  status: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  winner: string | null;
  advancing_team_id: number | null;
};

export async function syncMatches(): Promise<{
  teams: number;
  matches: number;
  rescored: number[];
  preserved: { id: number; fields: string[] }[];
}> {
  const supabase = db();
  const apiMatches = await fetchAllMatches();

  // ---- Teams: upsert all teams seen in the API.
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

  // ---- Read existing matches so we can merge defensively.
  const existingRes = await supabase
    .from("matches")
    .select("id, status, home_team_id, away_team_id, home_score, away_score, winner, advancing_team_id");
  if (existingRes.error) throw new Error(`matches read: ${existingRes.error.message}`);
  const existing = new Map<number, ExistingMatch>();
  for (const row of existingRes.data ?? []) existing.set(row.id, row as ExistingMatch);

  // ---- Merge each API match with what we have. Never replace a known value with null.
  const rescored: number[] = [];
  const preserved: { id: number; fields: string[] }[] = [];
  const rows: ReturnType<typeof mergeMatch>["row"][] = [];

  for (const m of apiMatches) {
    const prev = existing.get(m.id);
    const merged = mergeMatch(m, prev);
    rows.push(merged.row);
    if (merged.preserved.length > 0) {
      preserved.push({ id: m.id, fields: merged.preserved });
      console.warn(`[sync] match ${m.id}: preserved ${merged.preserved.join(", ")} (API returned null/empty for previously-known values)`);
    }

    // Rescore triggers
    const apiHome = m.score.fullTime.home;
    const apiAway = m.score.fullTime.away;
    const finalHome = merged.row.home_score;
    const finalAway = merged.row.away_score;
    const finalStatus = merged.row.status;
    const finalAdvancing = merged.row.advancing_team_id;

    const wasFinished = prev?.status === "FINISHED";
    const isFinished = finalStatus === "FINISHED" && finalHome != null && finalAway != null;
    const scoreChanged =
      isFinished &&
      (prev?.home_score !== finalHome ||
       prev?.away_score !== finalAway ||
       prev?.advancing_team_id !== finalAdvancing);

    if ((!wasFinished && isFinished) || (wasFinished && scoreChanged)) {
      // Use the merged values; recomputeMatchScores reads them from the row we are
      // about to upsert, so trigger AFTER the upsert below.
      rescored.push(m.id);
    }

    // Suppress unused-var lint for vars only used for clarity above
    void apiHome; void apiAway;
  }

  if (rows.length > 0) {
    const upM = await supabase.from("matches").upsert(rows, { onConflict: "id" });
    if (upM.error) throw new Error(`matches upsert: ${upM.error.message}`);
  }

  for (const id of rescored) {
    await recomputeMatchScores(id);
  }

  return { teams: teams.size, matches: rows.length, rescored, preserved };
}

/**
 * Build the row we will upsert into `matches`. We never replace an existing
 * non-null value with null — this protects against transient API hiccups
 * (e.g. team-ids briefly missing on knock-out rounds, or a FINISHED match
 * suddenly returning null scores).
 */
function mergeMatch(m: FootballDataMatch, prev: ExistingMatch | undefined) {
  const apiHomeId = m.homeTeam?.id ?? null;
  const apiAwayId = m.awayTeam?.id ?? null;
  const apiHomeScore = m.score.fullTime.home;
  const apiAwayScore = m.score.fullTime.away;
  const apiAdvancing = deriveAdvancingTeamId(m);
  const apiWinner = m.score.winner;

  const home_team_id = apiHomeId ?? prev?.home_team_id ?? null;
  const away_team_id = apiAwayId ?? prev?.away_team_id ?? null;
  const home_score   = apiHomeScore ?? prev?.home_score ?? null;
  const away_score   = apiAwayScore ?? prev?.away_score ?? null;
  const advancing_team_id = apiAdvancing ?? prev?.advancing_team_id ?? null;
  const winner = apiWinner ?? prev?.winner ?? null;

  // If we now have a real team_id, drop the placeholder. Otherwise keep whatever
  // textual hint we had (API or previously-stored placeholder).
  const home_placeholder =
    home_team_id != null
      ? null
      : (apiHomeId == null ? (m.homeTeam?.name ?? m.homeTeamPlaceholder ?? null) : null);
  const away_placeholder =
    away_team_id != null
      ? null
      : (apiAwayId == null ? (m.awayTeam?.name ?? m.awayTeamPlaceholder ?? null) : null);

  const preserved: string[] = [];
  if (apiHomeId == null && prev?.home_team_id != null) preserved.push("home_team_id");
  if (apiAwayId == null && prev?.away_team_id != null) preserved.push("away_team_id");
  if (apiHomeScore == null && prev?.home_score != null) preserved.push("home_score");
  if (apiAwayScore == null && prev?.away_score != null) preserved.push("away_score");
  if (apiAdvancing == null && prev?.advancing_team_id != null) preserved.push("advancing_team_id");
  if (apiWinner == null && prev?.winner != null) preserved.push("winner");

  // Status: allow updates in both directions, BUT do NOT downgrade FINISHED to
  // something else if we still have scores. If the API rolls back to SCHEDULED
  // for an already-finished match, keep our FINISHED status so we don't trip
  // the scoring reset path.
  let status = m.status;
  if (prev?.status === "FINISHED" && m.status !== "FINISHED" && home_score != null && away_score != null) {
    status = "FINISHED";
    preserved.push(`status (was ${m.status})`);
  }

  return {
    row: {
      id: m.id,
      stage: m.stage,
      group_name: m.group ? m.group.replace(/^GROUP_?/i, "") : null,
      home_team_id,
      away_team_id,
      home_placeholder,
      away_placeholder,
      kickoff_at: m.utcDate,
      status,
      home_score,
      away_score,
      winner,
      advancing_team_id,
    },
    preserved,
  };
}
