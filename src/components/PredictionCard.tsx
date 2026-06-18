"use client";

import { useState, useTransition } from "react";
import { submitPrediction } from "@/actions/predictions";
import { fmtTime, isKnockoutStage } from "@/lib/format";
import { TeamHoverCard } from "@/components/TeamHoverCard";

type Team = { id: number; name: string; short_code: string | null; flag_url: string | null };

export type MatchView = {
  id: number;
  stage: string;
  group_name: string | null;
  kickoff_at: string;
  home_team: Team | null;
  away_team: Team | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

export type PredictionView = {
  home_score: number;
  away_score: number;
  advancing_team_id: number | null;
  points_total?: number;
} | null;

export type OtherPrediction = {
  user_id: string;
  display_name: string;
  home_score: number;
  away_score: number;
  advancing_team_id: number | null;
  points_total: number;
};

export function PredictionCard({
  match, prediction, others, currentUserId, totalUsers,
}: {
  match: MatchView;
  prediction: PredictionView;
  others?: OtherPrediction[];
  currentUserId?: string;
  totalUsers?: number;
}) {
  const isKnockout = isKnockoutStage(match.stage);
  const teamsKnown = match.home_team != null && match.away_team != null;
  const locked = new Date(match.kickoff_at).getTime() <= Date.now();
  const editable = teamsKnown && !locked;
  const finished = match.status === "FINISHED";

  const [home, setHome] = useState(prediction?.home_score?.toString() ?? "");
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? "");
  const [advancing, setAdvancing] = useState<string>(prediction?.advancing_team_id?.toString() ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(prediction ? 0 : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAdvancing, setShowAdvancing] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitPrediction(fd);
      if (res.ok) {
        setSavedAt(Date.now());
        setTimeout(() => setSavedAt((t) => (t && Date.now() - t > 1500 ? null : t)), 1700);
      } else setError(res.error ?? "Fout");
    });
  }

  const homeName = match.home_team?.name ?? match.home_placeholder ?? "TBD";
  const awayName = match.away_team?.name ?? match.away_placeholder ?? "TBD";
  const points = prediction?.points_total ?? 0;

  return (
    <form onSubmit={onSubmit} className="card card-hover p-5">
      <input type="hidden" name="match_id" value={match.id} />

      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-ink-500">
          <span className="font-mono text-[13px] font-medium text-ink-900">{fmtTime(match.kickoff_at)}</span>
          {match.group_name && <span>Groep {match.group_name.replace(/^GROUP_?/i, "")}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {!teamsKnown && !locked && <span className="pill-muted">TBD</span>}
          {locked && !finished && <span className="pill-warn">Gesloten</span>}
          {finished && <span className="pill-muted">Afgelopen</span>}
          {finished && (
            <span className={points > 0 ? "pill-brand" : "pill-muted"}>
              {points > 0 ? `+${points}` : "0"}
            </span>
          )}
        </div>
      </div>

      {/* Fixture */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamCell team={match.home_team} placeholder={match.home_placeholder} align="right" />

        <div className="flex items-center gap-2">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            enterKeyHint="next" name="home_score"
            value={home}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
            disabled={!editable} className="score-input"
            placeholder="–" aria-label={`Score ${homeName}`} required
          />
          <span className="text-sm text-ink-300">·</span>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            enterKeyHint="done" name="away_score"
            value={away}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
            disabled={!editable} className="score-input"
            placeholder="–" aria-label={`Score ${awayName}`} required
          />
        </div>

        <TeamCell team={match.away_team} placeholder={match.away_placeholder} align="left" />
      </div>

      {finished && match.home_score != null && match.away_score != null && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-500">
          Uitslag
          <span className="rounded-md bg-bg px-2 py-0.5 text-sm font-semibold tabular-nums text-ink-900">
            {match.home_score} – {match.away_score}
          </span>
        </div>
      )}

      {/* Knockout: advancing team */}
      {isKnockout && teamsKnown && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAdvancing((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-bg px-3 py-2 text-xs text-ink-700 transition hover:bg-line/50"
          >
            <span className="font-medium">
              Wie gaat door?{" "}
              {advancing && (
                <span className="ml-1 font-semibold text-brand-600">
                  {advancing === String(match.home_team!.id) ? match.home_team!.name : match.away_team!.name}
                </span>
              )}
            </span>
            <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 text-ink-500 transition ${showAdvancing ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showAdvancing && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <AdvancingChoice
                name="advancing_team_id" value={String(match.home_team!.id)}
                checked={advancing === String(match.home_team!.id)}
                onChange={setAdvancing} disabled={!editable}
                label={match.home_team!.name} flag={match.home_team!.flag_url}
              />
              <AdvancingChoice
                name="advancing_team_id" value={String(match.away_team!.id)}
                checked={advancing === String(match.away_team!.id)}
                onChange={setAdvancing} disabled={!editable}
                label={match.away_team!.name} flag={match.away_team!.flag_url}
              />
            </div>
          )}
        </div>
      )}

      {/* Save */}
      {editable ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs">
            {error ? <span className="text-danger">{error}</span> :
             savedAt ? <span className="text-ok">✓ Opgeslagen</span> :
             prediction ? <span className="text-ink-500">Opgeslagen</span> :
                          <span className="text-ink-400">Nog niet ingevuld</span>}
          </span>
          <button type="submit" className="btn-brand" disabled={pending}>
            {pending ? <Spin /> : prediction ? "Bijwerken" : "Opslaan"}
          </button>
        </div>
      ) : !teamsKnown ? (
        <p className="mt-4 text-center text-xs text-ink-500">
          Voorspelbaar zodra teams bekend zijn.
        </p>
      ) : null}

      {/* Others */}
      {others && others.length > 0 && (
        <OthersPredictions
          others={others} currentUserId={currentUserId}
          locked={locked} finished={finished} totalUsers={totalUsers}
          realHome={match.home_score} realAway={match.away_score}
        />
      )}
    </form>
  );
}

function TeamCell({
  team, placeholder, align,
}: { team: Team | null; placeholder: string | null; align: "left" | "right" }) {
  const name = team?.name ?? placeholder ?? "TBD";
  const short = team?.short_code ?? truncate(name, 3);
  return (
    <TeamHoverCard teamId={team?.id ?? null} align={align}>
      <span className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
        {team?.flag_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.flag_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-line" />
        ) : (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bg text-[10px] font-semibold text-ink-300 ring-1 ring-line">?</span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink-900">{short}</span>
          <span className="block truncate text-[11px] text-ink-500">{name}</span>
        </span>
      </span>
    </TeamHoverCard>
  );
}

function AdvancingChoice({
  name, value, checked, onChange, disabled, label, flag,
}: {
  name: string; value: string; checked: boolean; onChange: (v: string) => void;
  disabled: boolean; label: string; flag: string | null;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
      checked ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-700 hover:border-line2"
    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
      <input type="radio" name={name} value={value} checked={checked}
        onChange={() => onChange(value)} disabled={disabled} className="sr-only" />
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt="" className="h-4 w-4 rounded-full object-cover" />
      )}
      <span className="truncate font-medium">{label}</span>
    </label>
  );
}

function OthersPredictions({
  others, currentUserId, locked, finished, totalUsers, realHome, realAway,
}: {
  others: OtherPrediction[]; currentUserId?: string;
  locked: boolean; finished: boolean; totalUsers?: number;
  realHome: number | null; realAway: number | null;
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...others].sort((a, b) => {
    if (finished) return b.points_total - a.points_total || a.display_name.localeCompare(b.display_name);
    return a.display_name.localeCompare(b.display_name);
  });
  const label = finished ? "Wie zat erbij?" : locked ? "Voorspellingen" : "Wie heeft ingevuld?";
  const counter = totalUsers != null ? `${sorted.length}/${totalUsers}` : `${sorted.length}`;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex w-full items-center justify-between text-xs"
      >
        <span className="font-medium text-ink-700">
          {label}{" "}
          <span className="ml-1 rounded-full bg-bg px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-ink-500">{counter}</span>
        </span>
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 text-ink-500 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-bg/50">
          {sorted.map((o) => {
            const isMe = o.user_id === currentUserId;
            const exact = finished && realHome != null && realAway != null && o.home_score === realHome && o.away_score === realAway;
            return (
              <li key={o.user_id} className={`flex items-center gap-3 px-3 py-2 ${isMe ? "bg-brand-50/50" : ""}`}>
                <span className={`min-w-0 flex-1 truncate text-sm ${isMe ? "font-semibold text-ink-900" : "text-ink-700"}`}>
                  {o.display_name}
                  {isMe && <span className="ml-1 text-[10px] font-medium text-brand-600">jij</span>}
                </span>
                {locked ? (
                  <>
                    <span className={`font-mono text-sm tabular-nums ${exact ? "font-semibold text-brand-600" : "text-ink-700"}`}>
                      {o.home_score}–{o.away_score}
                    </span>
                    {finished && (
                      <span className={o.points_total > 0 ? "pill-brand" : "pill-muted"}>
                        {o.points_total > 0 ? `+${o.points_total}` : "0"}
                      </span>
                    )}
                  </>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-ok" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Spin() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s.toUpperCase() : s.slice(0, n).toUpperCase();
}
