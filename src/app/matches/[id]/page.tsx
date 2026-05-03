import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { fmtKickoff, stageLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

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
      <div className="card">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          {stageLabel(match.stage)}{match.group_name ? ` · Groep ${match.group_name}` : ""} · {fmtKickoff(match.kickoff_at)}
        </div>
        <div className="mt-2 font-display text-2xl font-bold text-white">{homeName} <span className="text-slate-500">vs</span> {awayName}</div>
        {match.home_score != null && match.away_score != null && (
          <div className="mt-3 flex items-center gap-3">
            <span className="font-display text-3xl font-bold tabular-nums text-accent-400">
              {match.home_score} – {match.away_score}
            </span>
            {match.advancing_team_id && (
              <span className="pill-accent">Door: {tmap.get(match.advancing_team_id)}</span>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Voorspellingen</h2>
        {!kickoffPassed ? (
          <p className="rounded-xl bg-warn-500/10 p-3 text-sm text-warn-400 ring-1 ring-warn-500/30">
            Voorspellingen van anderen zijn pas zichtbaar na aftrap.
          </p>
        ) : predictions.length === 0 ? (
          <p className="text-sm text-slate-500">Niemand heeft voor deze wedstrijd voorspeld.</p>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Speler</th>
                  <th className="px-3 py-2.5">Voorspeld</th>
                  <th className="px-3 py-2.5">Door</th>
                  <th className="px-3 py-2.5 text-right">Punten</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr key={i} className={`border-t border-white/5 ${p.user_id === session.uid ? "bg-accent-500/5" : ""}`}>
                    <td className="px-3 py-2.5 font-medium text-white">{userMap.get(p.user_id) ?? "?"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-300">{p.home_score}–{p.away_score}</td>
                    <td className="px-3 py-2.5 text-slate-300">{p.advancing_team_id ? tmap.get(p.advancing_team_id) ?? "—" : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={p.points_total > 0 ? "pill-accent" : "pill-muted"}>
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
