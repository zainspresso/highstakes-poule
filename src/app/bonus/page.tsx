import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { BonusForms } from "./bonus-forms";

export const dynamic = "force-dynamic";

export default async function BonusPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const supabase = db();

  const { data: questions } = await supabase
    .from("bonus_questions")
    .select("id, key, label, type, closes_at, resolved_value")
    .order("id");

  const { data: myPreds } = await supabase
    .from("bonus_predictions")
    .select("question_id, value, points")
    .eq("user_id", session.uid);

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_code")
    .order("name");

  const myMap = new Map((myPreds ?? []).map((p) => [p.question_id, p]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Bonusvragen</h1>
        <p className="text-sm text-slate-500">
          Telt los — eigen klassement, geen invloed op het hoofdklassement.
        </p>
      </div>
      <BonusForms
        questions={(questions ?? []).map((q) => ({
          ...q,
          my_value: myMap.get(q.id)?.value ?? null,
          my_points: myMap.get(q.id)?.points ?? 0,
        }))}
        teams={teams ?? []}
      />
    </div>
  );
}
