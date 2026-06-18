"use client";

import { useEffect, useRef, useState } from "react";
import { getTeamHistory, type TeamHistory, type TeamHistoryMatch } from "@/actions/team";
import { stageLabel } from "@/lib/format";

export function TeamHoverCard({
  teamId,
  align,
  children,
}: {
  teamId: number | null;
  align: "left" | "right";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TeamHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (teamId == null) return;
    setOpen((v) => !v);
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
      const res = await getTeamHistory(teamId);
      setLoading(false);
      if ("error" in res) setError(res.error);
      else setData(res);
    }
  }

  const disabled = teamId == null;

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`flex min-w-0 items-center gap-2 rounded-md ${align === "right" ? "flex-row-reverse text-right" : ""} ${
          disabled ? "cursor-default" : "transition hover:bg-white/5 -mx-1 px-1 py-0.5"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-[calc(100%+8px)] z-40 w-72 rounded-xl border border-white/10 bg-ink-900 p-3 shadow-2xl shadow-black/40 ring-1 ring-black/20 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {loading && (
            <div className="flex items-center justify-center py-6">
              <svg className="h-4 w-4 animate-spin text-accent-500" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          )}

          {error && (
            <p className="px-1 py-2 text-xs text-red-400">{error}</p>
          )}

          {data && !loading && !error && (
            <>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-white">{data.team_name}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500">WK 2026</span>
              </div>

              {data.matches.length === 0 ? (
                <p className="px-1 py-2 text-xs text-slate-500">Nog geen wedstrijden bekend.</p>
              ) : (
                <ul className="max-h-72 divide-y divide-white/5 overflow-y-auto">
                  {data.matches.map((m) => (
                    <HistoryRow key={m.match_id} m={m} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ m }: { m: TeamHistoryMatch }) {
  const finished = m.status === "FINISHED" && m.team_score != null && m.opponent_score != null;
  const result =
    finished && m.team_score != null && m.opponent_score != null
      ? m.team_score > m.opponent_score
        ? "W"
        : m.team_score < m.opponent_score
        ? "L"
        : "D"
      : null;

  return (
    <li className="flex items-center gap-2 px-1 py-2 text-xs">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-slate-500">
        {stageLabel(m.stage)}{m.group_name ? `·${m.group_name.replace(/^GROUP_?/i, "")}` : ""}
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {m.opponent_flag ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.opponent_flag} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <span className="h-4 w-4 shrink-0 rounded-full bg-white/5 ring-1 ring-white/10" />
        )}
        <span className="truncate text-slate-300">
          {m.is_home ? "vs" : "@"} {m.opponent_short ?? m.opponent_name}
        </span>
      </span>

      {finished ? (
        <>
          <span className="font-mono tabular-nums text-white">
            {m.team_score}–{m.opponent_score}
          </span>
          <span
            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
              result === "W"
                ? "bg-accent-500/20 text-accent-400"
                : result === "L"
                ? "bg-red-500/20 text-red-400"
                : "bg-white/10 text-slate-400"
            }`}
          >
            {result}
          </span>
        </>
      ) : (
        <span className="font-mono text-[10px] tabular-nums text-slate-500">
          {fmtTimeOnly(m.kickoff_at)}
        </span>
      )}
    </li>
  );
}

function fmtTimeOnly(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  }).format(d);
}
