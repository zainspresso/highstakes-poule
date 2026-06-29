"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, fetchAll } from "@/lib/supabase";
import { requireAdmin, setAdminOverride } from "@/lib/session";
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

export async function adminToggleOverride(on: boolean): Promise<void> {
  await requireAdmin();
  await setAdminOverride(on);
  revalidatePath("/", "layout");
}

export async function adminTriggerSync(): Promise<void> {
  await requireAdmin();
  await syncMatches();
  revalidatePath("/admin");
  revalidatePath("/predictions");
}

/**
 * Herrekent punten voor ELKE afgeronde wedstrijd én bonusklassement.
 * Gebruik als puntentelling is aangepast of als scores hersteld zijn.
 */
export async function adminRecomputeAll(): Promise<void> {
  await requireAdmin();
  const supabase = db();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "FINISHED");
  if (error) throw new Error(error.message);

  for (const m of matches ?? []) {
    await recomputeMatchScores(m.id);
  }
  await recomputeBonusScores();

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/me");
  revalidatePath("/predictions");
}

/**
 * Diagnose: tel hoeveel voorspellingen er per gebruiker zijn, en hoeveel daarvan
 * verwijzen naar een match-id die niet (meer) in de matches-tabel staat.
 * Verweesde predictions wijzen op een football-data.org id-wijziging.
 */
export async function adminDiagnose(): Promise<{
  per_user: { name: string; total: number; orphaned: number }[];
  orphaned_match_ids: number[];
}> {
  await requireAdmin();
  const supabase = db();

  const [{ data: users }, preds, { data: matches }] = await Promise.all([
    supabase.from("users").select("id, display_name"),
    fetchAll<{ user_id: string; match_id: number }>(() =>
      supabase.from("predictions").select("user_id, match_id")
    ),
    supabase.from("matches").select("id"),
  ]);

  const matchSet = new Set((matches ?? []).map((m) => m.id));
  const userMap = new Map((users ?? []).map((u) => [u.id, u.display_name]));

  const perUser = new Map<string, { name: string; total: number; orphaned: number }>();
  for (const u of users ?? []) {
    perUser.set(u.id, { name: u.display_name, total: 0, orphaned: 0 });
  }
  const orphanedIds = new Set<number>();
  for (const p of preds) {
    const entry = perUser.get(p.user_id) ?? { name: userMap.get(p.user_id) ?? "?", total: 0, orphaned: 0 };
    entry.total += 1;
    if (!matchSet.has(p.match_id)) {
      entry.orphaned += 1;
      orphanedIds.add(p.match_id);
    }
    perUser.set(p.user_id, entry);
  }

  return {
    per_user: [...perUser.values()].sort((a, b) => a.name.localeCompare(b.name)),
    orphaned_match_ids: [...orphanedIds].sort((a, b) => a - b),
  };
}
