"use client";

import { useState, useTransition } from "react";
import { adminDiagnose } from "@/actions/admin";

type Result = Awaited<ReturnType<typeof adminDiagnose>>;

export function Diagnose() {
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await adminDiagnose();
        setData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Onbekende fout");
      }
    });
  }

  return (
    <div className="space-y-3">
      <button onClick={run} disabled={pending} className="btn-secondary">
        {pending ? "Bezig…" : data ? "Opnieuw draaien" : "Diagnose draaien"}
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      {data && (
        <div className="card space-y-3 p-4 text-xs">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Verweesde match-ids
            </div>
            {data.orphaned_match_ids.length === 0 ? (
              <p className="text-ink-500">
                Geen — alle voorspellingen verwijzen naar bestaande matches. ✓
              </p>
            ) : (
              <p className="text-warn">
                {data.orphaned_match_ids.length} verweesde match-id(s):{" "}
                <code className="font-mono">{data.orphaned_match_ids.join(", ")}</code>
                <br />
                <span className="text-ink-500">
                  Dit betekent dat football-data.org een match-id heeft gewijzigd.
                  Voorspellingen voor deze id&apos;s zijn niet meer zichtbaar in de UI
                  (maar staan nog in de database).
                </span>
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Voorspellingen per gebruiker
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="py-1">Naam</th>
                  <th className="py-1 text-right">Totaal</th>
                  <th className="py-1 text-right">Verweesd</th>
                </tr>
              </thead>
              <tbody>
                {data.per_user.map((u) => (
                  <tr key={u.name} className="border-b border-line last:border-0">
                    <td className="py-1.5 font-medium text-ink-900">{u.name}</td>
                    <td className="py-1.5 text-right tabular-nums text-ink-700">{u.total}</td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        u.orphaned > 0 ? "text-warn font-semibold" : "text-ink-300"
                      }`}
                    >
                      {u.orphaned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
