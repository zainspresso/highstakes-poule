"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type UserOption = { id: string; display_name: string; needs_pin: boolean };

export function LoginForm({ users }: { users: UserOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = users.find((u) => u.id === userId);
  const isFirstLogin = selected?.needs_pin ?? false;

  function pickUser(id: string) {
    setUserId(id); setError(null); setPin(""); setConfirmPin(""); setStep(2);
  }
  function back() { setStep(1); setError(null); }

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!userId) return;
    if (!/^\d{4}$/.test(pin)) return setError("PIN moet uit 4 cijfers bestaan.");
    if (isFirstLogin && pin !== confirmPin) return setError("PINs komen niet overeen.");

    startTransition(async () => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, pin }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Inloggen mislukt."); return;
      }
      router.push("/predictions"); router.refresh();
    });
  }

  if (step === 1) {
    return (
      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.id}>
            <button
              onClick={() => pickUser(u.id)}
              className="group flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-bg"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-600">
                  {initials(u.display_name)}
                </span>
                <span className="text-[15px] font-medium leading-none text-ink-900">{u.display_name}</span>
              </span>
              <span className="flex items-center gap-2">
                {u.needs_pin && <span className="pill-brand">Nieuw</span>}
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-900" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <form onSubmit={submit}>
      <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-900">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Andere naam
      </button>

      <div className="mb-5 flex items-center gap-3 rounded-xl bg-bg px-3 py-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-[13px] font-semibold text-brand-600">
          {initials(selected?.display_name ?? "")}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-ink-900">{selected?.display_name}</div>
          {isFirstLogin && <div className="text-[11px] font-medium text-brand-600">Eerste login · kies je PIN</div>}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-ink-700">
          {isFirstLogin ? "Kies een PIN" : "PIN"}
        </label>
        <PinInput value={pin} onChange={setPin} autoFocus />
      </div>

      {isFirstLogin && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-ink-700">Bevestig PIN</label>
          <PinInput value={confirmPin} onChange={setConfirmPin} />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <button type="submit" className="btn-brand w-full" disabled={pending}>
        {pending ? <Spin /> : isFirstLogin ? "PIN instellen & inloggen" : "Inloggen"}
      </button>
    </form>
  );
}

function PinInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1}
          autoComplete="off" autoCorrect="off"
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ""}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(-1);
            const next = (value.slice(0, i) + c + value.slice(i + 1)).slice(0, 4);
            onChange(next);
            if (c) {
              const all = e.target.parentElement?.querySelectorAll("input") ?? [];
              (all[i + 1] as HTMLInputElement | undefined)?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]) {
              const all = e.currentTarget.parentElement?.querySelectorAll("input") ?? [];
              (all[Math.max(0, i - 1)] as HTMLInputElement | undefined)?.focus();
            }
          }}
          className="h-14 w-14 rounded-xl border border-line bg-bg text-center text-2xl font-bold tabular-nums text-ink-900 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      ))}
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

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
