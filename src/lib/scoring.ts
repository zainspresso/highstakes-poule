import "server-only";
import { db } from "./supabase";

export type ScoringConfig = {
  exact: number;
  goal_diff: number;
  outcome: number;
  advance: number;
  bonus_top3_each: number;
  bonus_top_scorer: number;
  bonus_final_goals: number;
};

export async function loadScoringConfig(): Promise<ScoringConfig> {
  const { data, error } = await db().from("scoring_config").select("key, points");
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const r of data ?? []) map.set(r.key, r.points);
  return {
    exact: map.get("exact") ?? 5,
    goal_diff: map.get("goal_diff") ?? 3,
    outcome: map.get("outcome") ?? 1,
    advance: map.get("advance") ?? 2,
    bonus_top3_each: map.get("bonus_top3_each") ?? 5,
    bonus_top_scorer: map.get("bonus_top_scorer") ?? 10,
    bonus_final_goals: map.get("bonus_final_goals") ?? 5,
  };
}

export type ScoreInput = {
  predHome: number;
  predAway: number;
  predAdvancing: number | null;
  realHome: number;
  realAway: number;
  realAdvancing: number | null;
  isKnockout: boolean;
};

export type ScoreBreakdown = {
  points_exact: number;
  points_diff: number;
  points_outcome: number;
  points_advance: number;
};

export function scorePrediction(i: ScoreInput, cfg: ScoringConfig): ScoreBreakdown {
  const out: ScoreBreakdown = {
    points_exact: 0,
    points_diff: 0,
    points_outcome: 0,
    points_advance: 0,
  };

  const exact = i.predHome === i.realHome && i.predAway === i.realAway;
  if (exact) {
    out.points_exact = cfg.exact;
  } else {
    const realDiff = i.realHome - i.realAway;
    const predDiff = i.predHome - i.predAway;
    if (realDiff === predDiff) {
      out.points_diff = cfg.goal_diff;
    } else if (Math.sign(realDiff) === Math.sign(predDiff)) {
      out.points_outcome = cfg.outcome;
    }
  }

  if (i.isKnockout && i.predAdvancing != null && i.realAdvancing != null) {
    if (i.predAdvancing === i.realAdvancing) out.points_advance = cfg.advance;
  }

  return out;
}

export async function recomputeMatchScores(matchId: number): Promise<void> {
  const supabase = db();

  const { data: m, error: mErr } = await supabase
    .from("matches")
    .select("id, stage, status, home_score, away_score, advancing_team_id")
    .eq("id", matchId)
    .maybeSingle();

  if (mErr) throw new Error(mErr.message);
  if (!m) return;

  if (m.status !== "FINISHED" || m.home_score == null || m.away_score == null) {
    await supabase
      .from("predictions")
      .update({ points_exact: 0, points_diff: 0, points_outcome: 0, points_advance: 0 })
      .eq("match_id", matchId);
    return;
  }

  const isKnockout = m.stage !== "GROUP_STAGE";
  const cfg = await loadScoringConfig();

  const { data: preds, error: pErr } = await supabase
    .from("predictions")
    .select("id, home_score, away_score, advancing_team_id")
    .eq("match_id", matchId);
  if (pErr) throw new Error(pErr.message);

  for (const p of preds ?? []) {
    const breakdown = scorePrediction(
      {
        predHome: p.home_score,
        predAway: p.away_score,
        predAdvancing: p.advancing_team_id ?? null,
        realHome: m.home_score!,
        realAway: m.away_score!,
        realAdvancing: m.advancing_team_id ?? null,
        isKnockout,
      },
      cfg
    );
    await supabase.from("predictions").update(breakdown).eq("id", p.id);
  }
}

export async function recomputeBonusScores(): Promise<void> {
  const supabase = db();
  const cfg = await loadScoringConfig();
  const { data: questions, error } = await supabase
    .from("bonus_questions")
    .select("id, key, type, resolved_value");
  if (error) throw new Error(error.message);

  for (const q of questions ?? []) {
    if (q.resolved_value == null) continue;
    const { data: preds } = await supabase
      .from("bonus_predictions")
      .select("id, value")
      .eq("question_id", q.id);

    for (const p of preds ?? []) {
      let points = 0;
      if (q.key === "top3" && q.type === "top3_teams") {
        const correct = q.resolved_value as { first?: string; second?: string; third?: string };
        const guess = p.value as { first?: string; second?: string; third?: string };
        const correctSet = new Set([correct.first, correct.second, correct.third].filter(Boolean));
        const guesses = [guess.first, guess.second, guess.third].filter(Boolean) as string[];
        const matches = guesses.filter((g) => correctSet.has(g)).length;
        points = matches * cfg.bonus_top3_each;
      } else if (q.key === "top_scorer" && q.type === "player_name") {
        const correct = String(q.resolved_value).trim().toLowerCase();
        const guess = String((p.value as { name?: string }).name ?? "").trim().toLowerCase();
        if (correct && guess && correct === guess) points = cfg.bonus_top_scorer;
      } else if (q.key === "final_goals" && q.type === "integer") {
        const correct = Number(q.resolved_value);
        const guess = Number((p.value as { count?: number }).count);
        if (Number.isFinite(correct) && Number.isFinite(guess) && correct === guess) {
          points = cfg.bonus_final_goals;
        }
      }
      await supabase.from("bonus_predictions").update({ points }).eq("id", p.id);
    }
  }
}
