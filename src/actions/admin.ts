"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { recomputeBonusScores, recomputeMatchScores } from "@/lib/scoring";
import { syncMatches } from "@/lib/sync";

export async function adminCreateUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("display_name") ?? "").trim();
  const isAdmin = formData.get("is_admin") === "on";
  if (!name) return;
  await db().from("users").insert({ display_name: name, is_admin: isAdmin });
  revalidatePath("/admin");
}

export async function adminResetPin(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("user_id"));
  await db().from("users").update({ pin_hash: null }).eq("id", id);
  revalidatePath("/admin");
}

export async function adminDeleteUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("user_id"));
  await db().from("users").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function adminToggleAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("user_id"));
  const cur = await db().from("users").select("is_admin").eq("id", id).maybeSingle();
  if (!cur.data) return;
  await db().from("users").update({ is_admin: !cur.data.is_admin }).eq("id", id);
  revalidatePath("/admin");
}

const ScoringRow = z.object({ key: z.string(), points: z.coerce.number().int() });

export async function adminUpdateScoring(formData: FormData): Promise<void> {
  await requireAdmin();
  const updates: { key: string; points: number }[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("scoring__")) continue;
    const parsed = ScoringRow.safeParse({ key: k.slice("scoring__".length), points: v });
    if (parsed.success) updates.push(parsed.data);
  }
  for (const u of updates) {
    await db().from("scoring_config").update({ points: u.points }).eq("key", u.key);
  }
  revalidatePath("/admin");
}

export async function adminResolveBonus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("question_id"));
  const raw = String(formData.get("resolved_value") ?? "").trim();
  if (!raw) {
    await db().from("bonus_questions").update({ resolved_value: null }).eq("id", id);
  } else {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return; }
    await db().from("bonus_questions").update({ resolved_value: parsed }).eq("id", id);
  }
  await recomputeBonusScores();
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

export async function adminOverrideMatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("match_id"));
  const home = formData.get("home_score") === "" ? null : Number(formData.get("home_score"));
  const away = formData.get("away_score") === "" ? null : Number(formData.get("away_score"));
  const advancing = formData.get("advancing_team_id") === "" ? null : Number(formData.get("advancing_team_id"));
  const status = String(formData.get("status") ?? "FINISHED");

  const winner =
    home == null || away == null
      ? null
      : home > away ? "HOME_TEAM"
      : home < away ? "AWAY_TEAM"
      : "DRAW";

  await db().from("matches").update({
    home_score: home,
    away_score: away,
    advancing_team_id: advancing,
    status,
    winner,
  }).eq("id", id);

  await recomputeMatchScores(id);
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath(`/matches/${id}`);
}

export async function adminTriggerSync(): Promise<void> {
  await requireAdmin();
  await syncMatches();
  revalidatePath("/admin");
  revalidatePath("/predictions");
}
