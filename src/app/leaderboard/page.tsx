import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const supabase = db();

  const [{ data: users }, { data: preds }, { data: bonus }] = await Promise.all([
    supabase.from("users").select("id, display_name"),
    supabase.from("predictions").select("user_id, points_total, points_exact, points_diff, points_outcome, points_advance"),
    supabase.from("bonus_predictions").select("user_id, points"),
  ]);

  const main = new Map<string, {
    name: string;
    total: number;
    exact: number;
    diff: number;
    outcome: number;
    advance: number;
    count: number;
  }>();

  for (const u of users ?? []) {
    main.set(u.id, { name: u.display_name, total: 0, exact: 0, diff: 0, outcome: 0, advance: 0, count: 0 });
  }
  for (const p of preds ?? []) {
    const e = main.get(p.user_id);
    if (!e) continue;
    e.total += p.points_total ?? 0;
    e.exact += p.points_exact ?? 0;
    e.diff += p.points_diff ?? 0;
    e.outcome += p.points_outcome ?? 0;
    e.advance += p.points_advance ?? 0;
    e.count += 1;
  }

  const mainRows = [...main.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const bonusMap = new Map<string, number>();
  for (const u of users ?? []) bonusMap.set(u.id, 0);
  for (const b of bonus ?? []) bonusMap.set(b.user_id, (bonusMap.get(b.user_id) ?? 0) + (b.points ?? 0));

  const bonusRows = (users ?? [])
    .map((u) => ({ id: u.id, name: u.display_name, total: bonusMap.get(u.id) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 font-display text-2xl font-bold">Klassement</h1>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-3 py-2.5 w-10">#</th>
                <th className="px-3 py-2.5">Speler</th>
                <th className="px-3 py-2.5 text-right">Punten</th>
                <th className="hidden px-3 py-2.5 text-right sm:table-cell">Exact</th>
                <th className="hidden px-3 py-2.5 text-right sm:table-cell">Saldo</th>
                <th className="hidden px-3 py-2.5 text-right sm:table-cell">1/X/2</th>
                <th className="hidden px-3 py-2.5 text-right md:table-cell">Door</th>
              </tr>
            </thead>
            <tbody>
              {mainRows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-t border-white/5 ${
                    r.id === session.uid ? "bg-accent-500/5" : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent-500/20 to-accent-500/5 text-xs font-bold text-accent-400 ring-1 ring-accent-500/20">
                        {initials(r.name)}
                      </span>
                      <span className="font-medium text-white">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-display text-lg font-bold tabular-nums text-white">{r.total}</td>
                  <td className="hidden px-3 py-3 text-right text-slate-400 tabular-nums sm:table-cell">{r.exact}</td>
                  <td className="hidden px-3 py-3 text-right text-slate-400 tabular-nums sm:table-cell">{r.diff}</td>
                  <td className="hidden px-3 py-3 text-right text-slate-400 tabular-nums sm:table-cell">{r.outcome}</td>
                  <td className="hidden px-3 py-3 text-right text-slate-400 tabular-nums md:table-cell">{r.advance}</td>
                </tr>
              ))}
              {mainRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nog geen punten.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-xl font-bold">Bonusklassement</h2>
        <p className="mb-3 text-xs text-slate-500">
          Telt los — geen invloed op het hoofdklassement.
        </p>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-3 py-2.5 w-10">#</th>
                <th className="px-3 py-2.5">Speler</th>
                <th className="px-3 py-2.5 text-right">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {bonusRows.map((r, i) => (
                <tr key={r.id} className={`border-t border-white/5 ${r.id === session.uid ? "bg-accent-500/5" : ""}`}>
                  <td className="px-3 py-3"><RankBadge rank={i + 1} /></td>
                  <td className="px-3 py-3 font-medium text-white">{r.name}</td>
                  <td className="px-3 py-3 text-right font-display text-lg font-bold tabular-nums text-white">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="grid h-7 w-7 place-items-center rounded-full bg-yellow-400/20 text-xs font-bold text-yellow-400 ring-1 ring-yellow-400/40">1</span>;
  }
  if (rank === 2) {
    return <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-300/20 text-xs font-bold text-slate-300 ring-1 ring-slate-300/40">2</span>;
  }
  if (rank === 3) {
    return <span className="grid h-7 w-7 place-items-center rounded-full bg-orange-400/20 text-xs font-bold text-orange-400 ring-1 ring-orange-400/40">3</span>;
  }
  return <span className="text-sm font-semibold text-slate-500">{rank}</span>;
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
