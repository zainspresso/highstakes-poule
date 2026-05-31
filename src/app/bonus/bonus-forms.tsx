"use client";

import { useState, useTransition } from "react";
import { submitBonus } from "@/actions/predictions";
import { fmtKickoff } from "@/lib/format";

type Team = { id: number; name: string; short_code: string | null };

type Question = {
  id: number;
  key: string;
  label: string;
  type: "top3_teams" | "player_name" | "integer";
  closes_at: string;
  resolved_value: unknown;
  my_value: unknown;
  my_points: number;
};

export function BonusForms({ questions, teams }: { questions: Question[]; teams: Team[] }) {
  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <BonusCard key={q.id} q={q} teams={teams} />
      ))}
    </div>
  );
}

function BonusCard({ q, teams }: { q: Question; teams: Team[] }) {
  const closed = new Date(q.closes_at).getTime() <= Date.now();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const my = (q.my_value ?? {}) as Record<string, unknown>;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(null);
    const fd = new FormData(e.currentTarget);
    let value: Record<string, unknown> = {};
    if (q.type === "top3_teams") {
      value = { first: fd.get("first"), second: fd.get("second"), third: fd.get("third") };
    } else if (q.type === "player_name") {
      value = { name: fd.get("name") };
    } else if (q.type === "integer") {
      value = { count: Number(fd.get("count")) };
    }
    const out = new FormData();
    out.set("question_id", String(q.id));
    out.set("value", JSON.stringify(value));
    startTransition(async () => {
      const res = await submitBonus(out);
      setMsg(res.ok ? "Opgeslagen" : res.error ?? "Fout");
    });
  }

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-900">{q.label}</h2>
        <span className="text-[11px] text-ink-500">Sluit · {fmtKickoff(q.closes_at)}</span>
      </div>

      <div className="mt-4">
        {q.type === "top3_teams" && (
          <div className="grid grid-cols-3 gap-2">
            {(["first", "second", "third"] as const).map((slot, i) => (
              <div key={slot}>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-500">
                  {i + 1}e
                </label>
                <select name={slot} defaultValue={(my[slot] as string) ?? ""} disabled={closed} className="input">
                  <option value="">— kies —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.short_code ?? t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {q.type === "player_name" && (
          <input name="name" defaultValue={(my.name as string) ?? ""} disabled={closed}
            className="input" placeholder="Bv. Erling Haaland" />
        )}

        {q.type === "integer" && (
          <input name="count" type="number" min={0} max={20}
            defaultValue={(my.count as number) ?? ""} disabled={closed}
            className="input" placeholder="0" />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs">
          {closed
            ? <span className="text-ink-500">Gesloten · <span className="font-semibold text-brand-600">{q.my_points} pt</span></span>
            : msg ? <span className="text-ok">{msg}</span>
            : q.my_value ? <span className="text-ink-500">Opgeslagen</span>
            : <span className="text-ink-400">Nog niet ingevuld</span>}
        </span>
        {!closed && (
          <button type="submit" className="btn-brand" disabled={pending}>
            {pending ? "…" : "Opslaan"}
          </button>
        )}
      </div>
    </form>
  );
}
