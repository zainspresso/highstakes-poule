import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { fmtKickoff, stageLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const supabase = db();

  const { data: preds } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score, advancing_team_id, points_exact, points_diff, points_outcome, points_advance, points_total")
    .eq("user_id", session.uid);

  const matchIds = (preds ?? []).map((p) => p.match_id);
  const { data: matches } = matchIds.length
    ? await supabase
        .from("matches")
        .select("id, stage, kickoff_at, status, home_score, away_score, home_team_id, away_team_id")
        .in("id", matchIds)
    : { data: [] };

  const matchMap = new Map((matches ?? []).map((m) => [m.id, m]));

  const teamIds = new Set<number>();
  for (const m of matches ?? []) {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  }
  const { data: teams } = teamIds.size
    ? await supabase.from("teams").select("id, name").in("id", [...teamIds])
    : { data: [] };
  const tmap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const rows = (preds ?? [])
    .map((p) => ({ pred: p, match: matchMap.get(p.match_id) }))
    .filter((r): r is { pred: typeof r.pred; match: NonNullable<typeof r.match> } => !!r.match)
    .sort((a, b) => new Date(b.match.kickoff_at).getTime() - new Date(a.match.kickoff_at).getTime());

  const total = rows.reduce((s, r) => s + (r.pred.points_total ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="card relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-accent-500/30 to-accent-500/10 text-base font-bold text-accent-400 ring-1 ring-accent-500/30">
              {session.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
            </span>
            <h1 className="font-display text-2xl font-bold">{session.name}</h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Totaal</div>
            <div className="font-display text-4xl font-bold text-accent-400">{total}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">punten</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Wedstrijd</th>
              <th className="px-3 py-2.5">Voorspeld</th>
              <th className="px-3 py-2.5">Uitslag</th>
              <th className="px-3 py-2.5 text-right">Punten</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ pred, match }) => {
              const home = match.home_team_id ? tmap.get(match.home_team_id) : "TBD";
              const away = match.away_team_id ? tmap.get(match.away_team_id) : "TBD";
              return (
                <tr key={pred.match_id} className="border-t border-white/5">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-white">{home} – {away}</div>
                    <div className="text-xs text-slate-500">{stageLabel(match.stage)} · {fmtKickoff(match.kickoff_at)}</div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-300">{pred.home_score}–{pred.away_score}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {match.home_score != null ? <span className="text-white">{match.home_score}–{match.away_score}</span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={pred.points_total > 0 ? "pill-accent" : "pill-muted"}>
                      {pred.points_total > 0 ? `+${pred.points_total}` : "0"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Nog geen voorspellingen.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
