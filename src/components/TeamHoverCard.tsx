"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTeamHistory, type TeamHistory, type TeamHistoryMatch } from "@/actions/team";
import { stageLabel } from "@/lib/format";

const POPOVER_WIDTH = 288; // matches w-72
const GAP = 8;
const VIEWPORT_MARGIN = 16;

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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Recompute popover position relative to the trigger.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return;
    function place() {
      const trigger = wrapperRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const vw = window.innerWidth;
      let left =
        align === "right"
          ? trigger.right - POPOVER_WIDTH
          : trigger.left;
      // Clamp to viewport
      left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - POPOVER_WIDTH - VIEWPORT_MARGIN));
      const top = trigger.bottom + GAP;
      setPos({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, align]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
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
    <div ref={wrapperRef} className="w-full">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`flex w-full min-w-0 items-center rounded-md ${align === "right" ? "justify-end" : "justify-start"} ${
          disabled ? "cursor-default" : "transition hover:bg-white/5"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {children}
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
              className="z-[100] rounded-xl border border-white/10 bg-ink-900 p-3 text-left shadow-2xl shadow-black/40 ring-1 ring-black/20"
            >
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <svg className="h-4 w-4 animate-spin text-accent-500" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                    <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {error && <p className="px-1 py-2 text-xs text-red-400">{error}</p>}

              {data && !loading && !error && (
                <>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-sm font-semibold text-white">{data.team_name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">WK 2026</span>
                  </div>

                  {data.matches.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-slate-500">Nog geen wedstrijden gespeeld.</p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-white/5 overflow-y-auto">
                      {data.matches.map((m) => (
                        <HistoryRow key={m.match_id} m={m} />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>,
            document.body
          )
        : null}
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
