"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-bg hover:text-ink-900"
      }`}
    >
      {children}
    </Link>
  );
}
