"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setShow(true);
    setProgress(0);
    const t1 = setTimeout(() => setProgress(40), 50);
    const t2 = setTimeout(() => setProgress(75), 250);
    const t3 = setTimeout(() => setProgress(100), 500);
    const t4 = setTimeout(() => setShow(false), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className={`fixed inset-x-0 top-0 z-50 h-0.5 transition-opacity ${show ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className="h-full bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
