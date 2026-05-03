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
    setUserId(id);
    setError(null);
    setPin("");
    setConfirmPin("");
    setStep(2);
  }

  function back() {
    setStep(1);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!userId) return;
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN moet uit 4 cijfers bestaan.");
      return;
    }
    if (isFirstLogin && pin !== confirmPin) {
      setError("PINs komen niet overeen.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, pin }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Inloggen mislukt.");
        return;
      }
      router.push("/predictions");
      router.refresh();
    });
  }

  if (step === 1) {
    return (
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Wie ben jij?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => pickUser(u.id)}
              className="group relative flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-accent-500/40 hover:bg-accent-500/5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-500/30 to-accent-500/10 text-sm font-bold text-accent-400 ring-1 ring-accent-500/30">
                {initials(u.display_name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{u.display_name}</span>
                {u.needs_pin && (
                  <span className="block text-[10px] uppercase tracking-wider text-accent-400">
                    Eerste login
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <button
        type="button"
        onClick={back}
        className="-ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        andere naam
      </button>

      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent-500/30 to-accent-500/10 text-sm font-bold text-accent-400 ring-1 ring-accent-500/30">
          {initials(selected?.display_name ?? "")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">{selected?.display_name}</div>
          {isFirstLogin && (
            <div className="text-[10px] uppercase tracking-wider text-accent-400">
              Eerste login · kies een PIN
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {isFirstLogin ? "Kies een PIN (4 cijfers)" : "PIN"}
        </label>
        <PinInput value={pin} onChange={setPin} autoFocus />
      </div>

      {isFirstLogin && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Bevestig PIN
          </label>
          <PinInput value={confirmPin} onChange={setConfirmPin} />
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 p-2.5 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}

      <button type="submit" className="btn w-full" disabled={pending}>
        {pending ? <Spinner /> : isFirstLogin ? "PIN instellen & inloggen" : "Inloggen"}
      </button>
    </form>
  );
}

function PinInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="relative">
          <input
            type={i === 0 ? "tel" : "tel"}
            inputMode="numeric"
            maxLength={1}
            autoFocus={autoFocus && i === 0}
            value={value[i] ?? ""}
            onChange={(e) => {
              const c = e.target.value.replace(/\D/g, "").slice(-1);
              const next = (value.slice(0, i) + c + value.slice(i + 1)).slice(0, 4);
              onChange(next);
              if (c) {
                const all = e.target.parentElement?.parentElement?.querySelectorAll("input") ?? [];
                (all[i + 1] as HTMLInputElement | undefined)?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !value[i]) {
                const all = e.currentTarget.parentElement?.parentElement?.querySelectorAll("input") ?? [];
                (all[Math.max(0, i - 1)] as HTMLInputElement | undefined)?.focus();
              }
            }}
            className="h-14 w-14 rounded-xl border border-white/10 bg-ink-900/60 text-center text-2xl font-bold text-white shadow-inner focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
          />
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
