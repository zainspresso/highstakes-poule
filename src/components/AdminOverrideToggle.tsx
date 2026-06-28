"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminToggleOverride } from "@/actions/admin";

export function AdminOverrideToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await adminToggleOverride(next);
        router.refresh();
      } catch {
        // Revert on failure
        setOn(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={on ? "Admin override AAN: je kunt scores ook na kickoff aanpassen." : "Admin override UIT"}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
        on
          ? "bg-warn text-white"
          : "border border-line bg-surface text-ink-500 hover:border-line2 hover:text-ink-900"
      } ${pending ? "opacity-60" : ""}`}
    >
      <span
        className={`grid h-3.5 w-6 place-items-start rounded-full p-[2px] transition ${
          on ? "bg-white/30" : "bg-line"
        }`}
        aria-hidden
      >
        <span
          className={`block h-2.5 w-2.5 rounded-full bg-white transition ${
            on ? "translate-x-[10px]" : ""
          }`}
        />
      </span>
      Override
    </button>
  );
}
