import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { fmtKickoff, stageLabel } from "@/lib/format";
import {
  adminCreateUser, adminDeleteUser, adminOverrideMatch, adminResetPin,
  adminResolveBonus, adminToggleAdmin, adminTriggerSync, adminUpdateScoring,
} from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (!session.admin) {
    return <p className="card p-4 text-sm text-danger">Geen toegang.</p>;
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
      <h1 className="text-3xl font-bold tracking-tightest">Admin</h1>

      <Section title="Match-sync" caption="Cron draait elke 10 min via Supabase. Hier kun je handmatig triggeren.">
        <form action={adminTriggerSync}>
          <button className="btn-brand">Nu synchroniseren</button>
        </form>
      </Section>

      <Section title="Deelnemers">
        <form action={adminCreateUser} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-500">Naam</label>
            <input name="display_name" className="input" required />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="is_admin" className="h-4 w-4 accent-brand-500" /> Admin
          </label>
          <button className="btn-brand">Toevoegen</button>
        </form>

        <div className="mt-4 card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-500">Naam</th>
                <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-500">PIN</th>
                <th className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-500">Admin</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2.5 font-medium text-ink-900">{u.display_name}</td>
                  <td className="px-3 py-2.5 text-ink-500">{u.pin_hash ? "ingesteld" : "nog niet"}</td>
                  <td className="px-3 py-2.5 text-ink-500">{u.is_admin ? "ja" : "nee"}</td>
                  <td className="px-3 py-2.5">
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
                        <button className="btn-secondary !text-danger">Verwijder</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Puntentelling">
        <form action={adminUpdateScoring} className="card p-4 space-y-3">
          {(scoring ?? []).map((s) => (
            <div key={s.key} className="grid grid-cols-[160px_90px_1fr] items-center gap-3">
              <span className="font-mono text-xs text-ink-700">{s.key}</span>
              <input type="number" name={`scoring__${s.key}`} defaultValue={s.points} className="input" />
              <span className="text-xs text-ink-500">{s.description}</span>
            </div>
          ))}
          <button className="btn-brand mt-2">Opslaan</button>
        </form>
      </Section>

      <Section
        title="Bonusvragen oplossen"
        caption={
          <>
            JSON voorbeelden:{" "}
            <code className="rounded bg-bg px-1 font-mono text-[11px] text-ink-700">{`top3: {"first":"BRA","second":"ARG","third":"FRA"}`}</code>
          </>
        }
      >
        <div className="space-y-3">
          {(questions ?? []).map((q) => (
            <form key={q.id} action={adminResolveBonus} className="card p-4">
              <input type="hidden" name="question_id" value={q.id} />
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-sm font-semibold text-ink-900">{q.label}</div>
                <div className="font-mono text-[11px] text-ink-500">{q.key}</div>
              </div>
              <textarea
                name="resolved_value" rows={2}
                defaultValue={q.resolved_value == null ? "" : JSON.stringify(q.resolved_value)}
                className="input font-mono text-xs" placeholder="JSON"
              />
              <button className="btn-brand mt-2">Opslaan & herrekenen</button>
            </form>
          ))}
        </div>
      </Section>

      <Section title="Handmatige uitslagen" caption="Alleen voor correcties of penalty-doorgaander.">
        <div className="space-y-3">
          {(matches ?? []).map((m) => {
            const home = m.home_team_id ? tmap.get(m.home_team_id) : (m.home_placeholder ?? "TBD");
            const away = m.away_team_id ? tmap.get(m.away_team_id) : (m.away_placeholder ?? "TBD");
            return (
              <form key={m.id} action={adminOverrideMatch} className="card p-4">
                <input type="hidden" name="match_id" value={m.id} />
                <div className="flex flex-wrap items-end gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink-900">{home} – {away}</div>
                    <div className="text-[11px] text-ink-500">{stageLabel(m.stage)} · {fmtKickoff(m.kickoff_at)} · {m.status}</div>
                  </div>
                  <FieldSmall label="Thuis"><input name="home_score" type="number" defaultValue={m.home_score ?? ""} className="input w-20" /></FieldSmall>
                  <FieldSmall label="Uit"><input name="away_score" type="number" defaultValue={m.away_score ?? ""} className="input w-20" /></FieldSmall>
                  <FieldSmall label="Door">
                    <select name="advancing_team_id" defaultValue={m.advancing_team_id ?? ""} className="input">
                      <option value="">—</option>
                      {m.home_team_id && <option value={m.home_team_id}>{tmap.get(m.home_team_id)}</option>}
                      {m.away_team_id && <option value={m.away_team_id}>{tmap.get(m.away_team_id)}</option>}
                    </select>
                  </FieldSmall>
                  <FieldSmall label="Status">
                    <select name="status" defaultValue={m.status} className="input">
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="TIMED">TIMED</option>
                      <option value="IN_PLAY">IN_PLAY</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="FINISHED">FINISHED</option>
                    </select>
                  </FieldSmall>
                  <button className="btn-brand">Opslaan</button>
                </div>
              </form>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, caption, children }: { title: string; caption?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tightest text-ink-900">{title}</h2>
      {caption && <p className="mt-0.5 mb-3 text-xs text-ink-500">{caption}</p>}
      {!caption && <div className="mt-3" />}
      {children}
    </section>
  );
}

function FieldSmall({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-500">{label}</label>
      {children}
    </div>
  );
}
