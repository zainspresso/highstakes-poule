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
    ? await supabase.from("matches")
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
  const exact = rows.reduce((s, r) => s + (r.pred.points_exact ?? 0), 0);
  const finished = rows.filter((r) => r.match.home_score != null).length;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-base font-semibold text-brand-600">
            {session.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tightest">{session.name}</h1>
            <p className="text-sm text-ink-500">{finished} afgesloten wedstrijd{finished === 1 ? "" : "en"}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-ink-500">Totaal</div>
            <div className="text-3xl font-bold tabular-nums text-brand-600">{total}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Exact" value={exact} />
          <Stat label="Voorspeld" value={rows.length} />
          <Stat label="Beste" value={Math.max(0, ...rows.map((r) => r.pred.points_total ?? 0))} />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Wedstrijd</th>
              <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Voorspeld</th>
              <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Uitslag</th>
              <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500">Pt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ pred, match }) => {
              const home = match.home_team_id ? tmap.get(match.home_team_id) : "TBD";
              const away = match.away_team_id ? tmap.get(match.away_team_id) : "TBD";
              return (
                <tr key={pred.match_id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium text-ink-900">{home} – {away}</div>
                    <div className="text-[11px] text-ink-500">{stageLabel(match.stage)} · {fmtKickoff(match.kickoff_at)}</div>
                  </td>
                  <td className="px-3 py-3 font-mono tabular-nums text-ink-700">{pred.home_score}–{pred.away_score}</td>
                  <td className="px-3 py-3 font-mono tabular-nums">
                    {match.home_score != null ? <span className="text-ink-900">{match.home_score}–{match.away_score}</span> : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={pred.points_total > 0 ? "pill-brand" : "pill-muted"}>
                      {pred.points_total > 0 ? `+${pred.points_total}` : "0"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-ink-500">Nog geen voorspellingen.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-bg px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-ink-900">{value}</div>
    </div>
  );
}
