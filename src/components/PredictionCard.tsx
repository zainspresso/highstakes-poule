"use client";

import { useState, useTransition } from "react";
import { submitPrediction } from "@/actions/predictions";
import { fmtTime, isKnockoutStage } from "@/lib/format";

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
  match,
  prediction,
  others,
  currentUserId,
  totalUsers,
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

  function save(form: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitPrediction(form);
      if (res.ok) {
        setSavedAt(Date.now());
        setTimeout(() => setSavedAt((t) => (t && Date.now() - t > 1500 ? null : t)), 1700);
      } else {
        setError(res.error ?? "Fout");
      }
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save(new FormData(e.currentTarget));
  }

  const homeName = match.home_team?.name ?? match.home_placeholder ?? "TBD";
  const awayName = match.away_team?.name ?? match.away_placeholder ?? "TBD";
  const homeShort = match.home_team?.short_code ?? truncate(homeName, 3);
  const awayShort = match.away_team?.short_code ?? truncate(awayName, 3);

  const points = prediction?.points_total ?? 0;

  return (
    <form onSubmit={onSubmit} className="card relative">
      <input type="hidden" name="match_id" value={match.id} />

      {/* Top row: time + status pills + points badge */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round"/>
          </svg>
          <span className="tabular-nums">{fmtTime(match.kickoff_at)}</span>
          {match.group_name && <span className="text-slate-500">· Groep {match.group_name.replace(/^GROUP_?/i, "")}</span>}
          {!teamsKnown && !locked && <span className="pill-warn">TBD</span>}
          {locked && !finished && <span className="pill-warn">Live · gesloten</span>}
          {finished && <span className="pill-muted">Afgelopen</span>}
        </div>
        {finished && (
          <span className={points > 0 ? "pill-accent" : "pill-muted"}>
            {points > 0 ? `+${points}` : "+0"}
          </span>
        )}
      </div>

      {/* Teams + score inputs */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamCell team={match.home_team} placeholder={match.home_placeholder} align="right" short={homeShort} />

        <div className="flex items-center gap-1.5">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            enterKeyHint="next"
            name="home_score"
            value={home}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
            disabled={!editable}
            className="score-input"
            placeholder="–"
            aria-label={`Score ${homeName}`}
            required
          />
          <span className="text-slate-500">·</span>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            enterKeyHint="done"
            name="away_score"
            value={away}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
            disabled={!editable}
            className="score-input"
            placeholder="–"
            aria-label={`Score ${awayName}`}
            required
          />
        </div>

        <TeamCell team={match.away_team} placeholder={match.away_placeholder} align="left" short={awayShort} />
      </div>

      {/* Real result if finished */}
      {finished && match.home_score != null && match.away_score != null && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
          Uitslag:
          <span className="tabular-nums font-bold text-white">
            {match.home_score} – {match.away_score}
          </span>
        </div>
      )}

      {/* Knockout: advancing team toggle */}
      {isKnockout && teamsKnown && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAdvancing((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
          >
            <span>
              Wie gaat door?{" "}
              {advancing && (
                <span className="ml-1 font-semibold text-accent-400">
                  {advancing === String(match.home_team!.id) ? match.home_team!.name : match.away_team!.name}
                </span>
              )}
            </span>
            <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition ${showAdvancing ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {showAdvancing && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <AdvancingChoice
                name="advancing_team_id"
                value={String(match.home_team!.id)}
                checked={advancing === String(match.home_team!.id)}
                onChange={setAdvancing}
                disabled={!editable}
                label={match.home_team!.name}
                flag={match.home_team!.flag_url}
              />
              <AdvancingChoice
                name="advancing_team_id"
                value={String(match.away_team!.id)}
                checked={advancing === String(match.away_team!.id)}
                onChange={setAdvancing}
                disabled={!editable}
                label={match.away_team!.name}
                flag={match.away_team!.flag_url}
              />
            </div>
          )}
        </div>
      )}

      {/* Save button / status */}
      {editable ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {error ? <span className="text-red-400">{error}</span> :
             savedAt ? <span className="text-accent-400">✓ Opgeslagen</span> :
             prediction ? "Opgeslagen" : "Nog niet ingevuld"}
          </span>
          <button type="submit" className="btn" disabled={pending}>
            {pending ? <Spin /> : prediction ? "Bijwerken" : "Opslaan"}
          </button>
        </div>
      ) : !teamsKnown ? (
        <p className="mt-3 text-center text-xs text-slate-500">
          Voorspelbaar zodra teams bekend zijn.
        </p>
      ) : null}

      {/* Submitter / predictions overview */}
      {others && others.length > 0 && (
        <OthersPredictions
          others={others}
          currentUserId={currentUserId}
          locked={locked}
          finished={finished}
          totalUsers={totalUsers}
          realHome={match.home_score}
          realAway={match.away_score}
        />
      )}
    </form>
  );
}

function OthersPredictions({
  others,
  currentUserId,
  locked,
  finished,
  totalUsers,
  realHome,
  realAway,
}: {
  others: OtherPrediction[];
  currentUserId?: string;
  locked: boolean;
  finished: boolean;
  totalUsers?: number;
  realHome: number | null;
  realAway: number | null;
}) {
  const [open, setOpen] = useState(false);

  const sorted = [...others].sort((a, b) => {
    if (finished) return b.points_total - a.points_total || a.display_name.localeCompare(b.display_name);
    return a.display_name.localeCompare(b.display_name);
  });

  const label = finished
    ? "Wie zat erbij?"
    : locked
    ? "Voorspellingen van iedereen"
    : "Wie heeft al ingevuld?";

  const counter = totalUsers != null ? `${sorted.length}/${totalUsers}` : `${sorted.length}`;

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="flex w-full items-center justify-between text-xs text-slate-400 hover:text-white"
      >
        <span>
          {label}
          <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/10 tabular-nums">
            {counter}
          </span>
        </span>
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-white/5 rounded-xl bg-white/5 ring-1 ring-white/10">
          {sorted.map((o) => {
            const isMe = o.user_id === currentUserId;
            const exact = finished && realHome != null && realAway != null && o.home_score === realHome && o.away_score === realAway;
            return (
              <li key={o.user_id} className={`flex items-center gap-3 px-3 py-2 ${isMe ? "bg-accent-500/5" : ""}`}>
                <span className={`min-w-0 flex-1 truncate text-sm ${isMe ? "font-semibold text-white" : "text-slate-200"}`}>
                  {o.display_name}{isMe && <span className="ml-1 text-[10px] uppercase text-accent-400">jij</span>}
                </span>
                {locked ? (
                  <>
                    <span className={`tabular-nums text-sm font-semibold ${exact ? "text-accent-400" : "text-slate-300"}`}>
                      {o.home_score}–{o.away_score}
                    </span>
                    {finished && (
                      <span className={o.points_total > 0 ? "pill-accent" : "pill-muted"}>
                        {o.points_total > 0 ? `+${o.points_total}` : "0"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-500/20 text-accent-400">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TeamCell({
  team,
  placeholder,
  align,
  short,
}: {
  team: Team | null;
  placeholder: string | null;
  align: "left" | "right";
  short: string;
}) {
  const name = team?.name ?? placeholder ?? "TBD";
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {team?.flag_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.flag_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
      ) : (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-[10px] font-bold text-slate-400 ring-1 ring-white/10">
          ?
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{short}</div>
        <div className="truncate text-[11px] text-slate-500">{name}</div>
      </div>
    </div>
  );
}

function AdvancingChoice({
  name,
  value,
  checked,
  onChange,
  disabled,
  label,
  flag,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  disabled: boolean;
  label: string;
  flag: string | null;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
        checked
          ? "border-accent-500/50 bg-accent-500/10 text-white ring-1 ring-accent-500/30"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="radio" name={name} value={value} checked={checked}
        onChange={() => onChange(value)} disabled={disabled} className="sr-only"
      />
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt="" className="h-5 w-5 rounded-full object-cover" />
      )}
      <span className="truncate">{label}</span>
    </label>
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
