import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { fmtKickoff, stageLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const supabase = db();

  const { data: match } = await supabase
    .from("matches")
    .select(`
      id, stage, group_name, kickoff_at, status,
      home_team_id, away_team_id, home_placeholder, away_placeholder,
      home_score, away_score, advancing_team_id
    `)
    .eq("id", matchId)
    .maybeSingle();

  if (!match) notFound();

  const teamIds = [match.home_team_id, match.away_team_id, match.advancing_team_id].filter((x): x is number => x != null);
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] };
  const tmap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const kickoffPassed = new Date(match.kickoff_at).getTime() <= Date.now();

  let predictions: { user_id: string; home_score: number; away_score: number; advancing_team_id: number | null; points_total: number }[] = [];
  let userMap = new Map<string, string>();

  if (kickoffPassed) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("user_id, home_score, away_score, advancing_team_id, points_total")
      .eq("match_id", matchId);
    predictions = preds ?? [];
    const { data: users } = await supabase.from("users").select("id, display_name");
    userMap = new Map((users ?? []).map((u) => [u.id, u.display_name]));
    predictions.sort((a, b) => b.points_total - a.points_total);
  }

  const homeName = match.home_team_id ? tmap.get(match.home_team_id) : (match.home_placeholder ?? "TBD");
  const awayName = match.away_team_id ? tmap.get(match.away_team_id) : (match.away_placeholder ?? "TBD");

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
          {stageLabel(match.stage)}{match.group_name ? ` · Groep ${match.group_name.replace(/^GROUP_?/i, "")}` : ""} · {fmtKickoff(match.kickoff_at)}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tightest text-ink-900">
          {homeName} <span className="text-ink-300">vs</span> {awayName}
        </h1>
        {match.home_score != null && match.away_score != null && (
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-xl bg-brand-50 px-3 py-1.5 text-2xl font-bold tabular-nums text-brand-600">
              {match.home_score} – {match.away_score}
            </span>
            {match.advancing_team_id && (
              <span className="pill-line">Door: {tmap.get(match.advancing_team_id)}</span>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-ink-900">Voorspellingen</h2>
        {!kickoffPassed ? (
          <p className="card p-4 text-sm text-warn">
            Verzegeld tot aftrap.
          </p>
        ) : predictions.length === 0 ? (
          <p className="text-sm text-ink-500">Niemand heeft voor deze wedstrijd voorspeld.</p>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Speler</th>
                  <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Voorspeld</th>
                  <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Door</th>
                  <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500">Pt</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr key={i} className={`border-b border-line last:border-0 ${p.user_id === session.uid ? "bg-brand-50/40" : ""}`}>
                    <td className="px-3 py-2.5 font-medium text-ink-900">{userMap.get(p.user_id) ?? "?"}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-ink-700">{p.home_score}–{p.away_score}</td>
                    <td className="px-3 py-2.5 text-ink-700">{p.advancing_team_id ? tmap.get(p.advancing_team_id) ?? "—" : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={p.points_total > 0 ? "pill-brand" : "pill-muted"}>
                        {p.points_total > 0 ? `+${p.points_total}` : "0"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
