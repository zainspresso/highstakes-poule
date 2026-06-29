import { redirect } from "next/navigation";
import { db, fetchAll } from "@/lib/supabase";
import { getSession } from "@/lib/session";

type PredRow = {
  user_id: string;
  points_total: number;
  points_exact: number;
  points_diff: number;
  points_outcome: number;
  points_advance: number;
};
type BonusRow = { user_id: string; points: number };

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const supabase = db();
  const [{ data: users }, preds, bonus] = await Promise.all([
    supabase.from("users").select("id, display_name"),
    fetchAll<PredRow>(() =>
      supabase
        .from("predictions")
        .select("user_id, points_total, points_exact, points_diff, points_outcome, points_advance")
    ),
    fetchAll<BonusRow>(() => supabase.from("bonus_predictions").select("user_id, points")),
  ]);

  const main = new Map<string, { name: string; total: number; exact: number; diff: number; outcome: number; advance: number; count: number; }>();
  for (const u of users ?? []) main.set(u.id, { name: u.display_name, total: 0, exact: 0, diff: 0, outcome: 0, advance: 0, count: 0 });
  for (const p of preds) {
    const e = main.get(p.user_id); if (!e) continue;
    e.total += p.points_total ?? 0;
    e.exact += p.points_exact ?? 0;
    e.diff += p.points_diff ?? 0;
    e.outcome += p.points_outcome ?? 0;
    e.advance += p.points_advance ?? 0;
    e.count += 1;
  }
  const mainRows = [...main.entries()].map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const bonusMap = new Map<string, number>();
  for (const u of users ?? []) bonusMap.set(u.id, 0);
  for (const b of bonus) bonusMap.set(b.user_id, (bonusMap.get(b.user_id) ?? 0) + (b.points ?? 0));
  const bonusRows = (users ?? []).map((u) => ({ id: u.id, name: u.display_name, total: bonusMap.get(u.id) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-3xl font-bold tracking-tightest">Klassement</h1>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="w-12 px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">#</th>
                <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Speler</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500">Punten</th>
                <th className="hidden px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500 sm:table-cell">Exact</th>
                <th className="hidden px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500 sm:table-cell">Saldo</th>
                <th className="hidden px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500 sm:table-cell">1/X/2</th>
                <th className="hidden px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500 md:table-cell">Door</th>
              </tr>
            </thead>
            <tbody>
              {mainRows.map((r, i) => (
                <tr key={r.id} className={`border-b border-line last:border-0 ${r.id === session.uid ? "bg-brand-50/40" : ""}`}>
                  <td className="px-3 py-3"><RankBadge rank={i + 1} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-bg text-[11px] font-semibold text-ink-700">
                        {initials(r.name)}
                      </span>
                      <span className="font-medium text-ink-900">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-xl font-bold tabular-nums text-ink-900">{r.total}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-ink-500 sm:table-cell">{r.exact}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-ink-500 sm:table-cell">{r.diff}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-ink-500 sm:table-cell">{r.outcome}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-ink-500 md:table-cell">{r.advance}</td>
                </tr>
              ))}
              {mainRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-ink-500">Nog geen punten.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tightest">Bonusklassement</h2>
        <p className="mb-3 mt-0.5 text-xs text-ink-500">Telt los — geen invloed op hoofdklassement.</p>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="w-12 px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">#</th>
                <th className="px-3 py-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">Speler</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-ink-500">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {bonusRows.map((r, i) => (
                <tr key={r.id} className={`border-b border-line last:border-0 ${r.id === session.uid ? "bg-brand-50/40" : ""}`}>
                  <td className="px-3 py-3"><RankBadge rank={i + 1} /></td>
                  <td className="px-3 py-3 font-medium text-ink-900">{r.name}</td>
                  <td className="px-3 py-3 text-right text-xl font-bold tabular-nums text-ink-900">{r.total}</td>
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
  if (rank === 1) return <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs font-bold text-white">1</span>;
  if (rank === 2) return <span className="grid h-7 w-7 place-items-center rounded-full bg-line2 text-xs font-bold text-ink-900">2</span>;
  if (rank === 3) return <span className="grid h-7 w-7 place-items-center rounded-full bg-bg text-xs font-bold text-ink-700 ring-1 ring-line">3</span>;
  return <span className="grid h-7 w-7 place-items-center text-sm font-medium text-ink-500">{rank}</span>;
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
