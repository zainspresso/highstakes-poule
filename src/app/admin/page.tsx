import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { fmtKickoff, stageLabel } from "@/lib/format";
import {
  adminCreateUser,
  adminDeleteUser,
  adminOverrideMatch,
  adminResetPin,
  adminResolveBonus,
  adminToggleAdmin,
  adminTriggerSync,
  adminUpdateScoring,
} from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.admin) {
    return <p className="card text-sm text-red-700">Geen toegang.</p>;
  }

  const supabase = db();
  const [{ data: users }, { data: scoring }, { data: questions }, { data: matches }] = await Promise.all([
    supabase.from("users").select("id, display_name, pin_hash, is_admin").order("display_name"),
    supabase.from("scoring_config").select("key, points, description").order("key"),
    supabase.from("bonus_questions").select("id, key, label, type, resolved_value, closes_at").order("id"),
    supabase
      .from("matches")
      .select("id, stage, kickoff_at, status, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, advancing_team_id")
      .order("kickoff_at", { ascending: true }),
  ]);

  const teamIds = new Set<number>();
  for (const m of matches ?? []) {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  }
  const { data: teams } = teamIds.size
    ? await supabase.from("teams").select("id, name").in("id", [...teamIds])
    : { data: [] };
  const tmap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin</h1>

      <section className="card space-y-4">
        <h2 className="font-bold">Match-sync</h2>
        <form action={adminTriggerSync}>
          <button className="btn">Nu synchroniseren</button>
        </form>
        <p className="text-xs text-slate-500">
          Cron draait elke 10 min op Vercel. Hier kun je hem handmatig triggeren.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">Deelnemers</h2>
        <form action={adminCreateUser} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Naam</label>
            <input name="display_name" className="input" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_admin" /> Admin
          </label>
          <button className="btn">Toevoegen</button>
        </form>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Naam</th>
                <th className="px-3 py-2">PIN</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{u.display_name}</td>
                  <td className="px-3 py-2 text-slate-600">{u.pin_hash ? "ingesteld" : "nog niet"}</td>
                  <td className="px-3 py-2 text-slate-600">{u.is_admin ? "ja" : "nee"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <form action={adminResetPin}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <button className="btn-secondary">Reset PIN</button>
                      </form>
                      <form action={adminToggleAdmin}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <button className="btn-secondary">Toggle admin</button>
                      </form>
                      <form action={adminDeleteUser}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <button className="btn-secondary text-red-600">Verwijder</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">Puntentelling</h2>
        <form action={adminUpdateScoring} className="space-y-2">
          {(scoring ?? []).map((s) => (
            <div key={s.key} className="grid grid-cols-[200px_100px_1fr] items-center gap-3">
              <span className="text-sm font-mono text-slate-600">{s.key}</span>
              <input
                type="number"
                name={`scoring__${s.key}`}
                defaultValue={s.points}
                className="input"
              />
              <span className="text-xs text-slate-500">{s.description}</span>
            </div>
          ))}
          <button className="btn mt-2">Opslaan</button>
        </form>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">Bonusvragen oplossen</h2>
        <p className="text-xs text-slate-500">
          Vul de juiste antwoord-JSON in. Voorbeelden:
          <br />
          <code>top3</code>: <code>{`{"first":"BRA","second":"ARG","third":"FRA"}`}</code>
          <br />
          <code>top_scorer</code>: <code>{`"Erling Haaland"`}</code>
          <br />
          <code>final_goals</code>: <code>{`3`}</code>
        </p>
        {(questions ?? []).map((q) => (
          <form key={q.id} action={adminResolveBonus} className="rounded border p-3">
            <input type="hidden" name="question_id" value={q.id} />
            <div className="mb-2 text-sm font-medium">{q.label} <span className="text-xs text-slate-500">({q.key})</span></div>
            <textarea
              name="resolved_value"
              rows={2}
              defaultValue={q.resolved_value == null ? "" : JSON.stringify(q.resolved_value)}
              className="input font-mono text-xs"
              placeholder="JSON"
            />
            <button className="btn mt-2">Opslaan & herrekenen</button>
          </form>
        ))}
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">Wedstrijd-uitslag handmatig overschrijven</h2>
        <p className="text-xs text-slate-500">
          Alleen gebruiken als de API iets mist (bv. wie doorgaat na strafschoppen of een correctie).
        </p>
        <div className="space-y-2">
          {(matches ?? []).map((m) => {
            const home = m.home_team_id ? tmap.get(m.home_team_id) : (m.home_placeholder ?? "TBD");
            const away = m.away_team_id ? tmap.get(m.away_team_id) : (m.away_placeholder ?? "TBD");
            return (
              <form key={m.id} action={adminOverrideMatch} className="rounded border p-3">
                <input type="hidden" name="match_id" value={m.id} />
                <div className="flex flex-wrap items-end gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{home} – {away}</div>
                    <div className="text-xs text-slate-500">{stageLabel(m.stage)} · {fmtKickoff(m.kickoff_at)} · status {m.status}</div>
                  </div>
                  <div>
                    <label className="block text-xs">Thuis</label>
                    <input name="home_score" type="number" defaultValue={m.home_score ?? ""} className="input w-20" />
                  </div>
                  <div>
                    <label className="block text-xs">Uit</label>
                    <input name="away_score" type="number" defaultValue={m.away_score ?? ""} className="input w-20" />
                  </div>
                  <div>
                    <label className="block text-xs">Door</label>
                    <select name="advancing_team_id" defaultValue={m.advancing_team_id ?? ""} className="input">
                      <option value="">—</option>
                      {m.home_team_id && <option value={m.home_team_id}>{tmap.get(m.home_team_id)}</option>}
                      {m.away_team_id && <option value={m.away_team_id}>{tmap.get(m.away_team_id)}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs">Status</label>
                    <select name="status" defaultValue={m.status} className="input">
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="TIMED">TIMED</option>
                      <option value="IN_PLAY">IN_PLAY</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="FINISHED">FINISHED</option>
                    </select>
                  </div>
                  <button className="btn">Opslaan</button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
