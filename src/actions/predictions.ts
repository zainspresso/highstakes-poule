"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireSession } from "@/lib/session";

const PredSchema = z.object({
  match_id: z.coerce.number().int(),
  home_score: z.coerce.number().int().min(0).max(30),
  away_score: z.coerce.number().int().min(0).max(30),
  advancing_team_id: z.coerce.number().int().optional().nullable(),
});

export async function submitPrediction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const parsed = PredSchema.safeParse({
    match_id: formData.get("match_id"),
    home_score: formData.get("home_score"),
    away_score: formData.get("away_score"),
    advancing_team_id: formData.get("advancing_team_id") || null,
  });
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer." };

  const supabase = db();
  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, stage, kickoff_at, home_team_id, away_team_id")
    .eq("id", parsed.data.match_id)
    .maybeSingle();

  if (mErr) return { ok: false, error: mErr.message };
  if (!match) return { ok: false, error: "Wedstrijd niet gevonden." };

  if (match.home_team_id == null || match.away_team_id == null) {
    return { ok: false, error: "Teams nog niet bekend voor deze wedstrijd." };
  }
  if (new Date(match.kickoff_at).getTime() <= Date.now()) {
    return { ok: false, error: "Voorspellen is gesloten voor deze wedstrijd." };
  }

  const isKnockout = match.stage !== "GROUP_STAGE";
  let advancing: number | null = null;
  if (isKnockout) {
    const a = parsed.data.advancing_team_id ?? null;
    if (a !== match.home_team_id && a !== match.away_team_id) {
      return { ok: false, error: "Kies een geldig team dat doorgaat." };
    }
    advancing = a;
  }

  const upsert = await supabase.from("predictions").upsert(
    {
      user_id: session.uid,
      match_id: match.id,
      home_score: parsed.data.home_score,
      away_score: parsed.data.away_score,
      advancing_team_id: advancing,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" }
  );
  if (upsert.error) return { ok: false, error: upsert.error.message };

  revalidatePath("/predictions");
  revalidatePath(`/matches/${match.id}`);
  revalidatePath("/me");
  return { ok: true };
}

const BonusSchema = z.object({
  question_id: z.coerce.number().int(),
  value: z.string().min(1),
});

export async function submitBonus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const parsed = BonusSchema.safeParse({
    question_id: formData.get("question_id"),
    value: formData.get("value"),
  });
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer." };

  let value: unknown;
  try {
    value = JSON.parse(parsed.data.value);
  } catch {
    return { ok: false, error: "Ongeldige waarde." };
  }

  const supabase = db();
  const { data: q, error: qErr } = await supabase
    .from("bonus_questions")
    .select("id, closes_at")
    .eq("id", parsed.data.question_id)
    .maybeSingle();
  if (qErr) return { ok: false, error: qErr.message };
  if (!q) return { ok: false, error: "Vraag niet gevonden." };

  if (new Date(q.closes_at).getTime() <= Date.now()) {
    return { ok: false, error: "Deze bonusvraag is gesloten." };
  }

  const upsert = await supabase.from("bonus_predictions").upsert(
    {
      user_id: session.uid,
      question_id: q.id,
      value,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" }
  );
  if (upsert.error) return { ok: false, error: upsert.error.message };

  revalidatePath("/bonus");
  return { ok: true };
}
