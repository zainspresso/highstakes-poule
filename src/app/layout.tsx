import "./globals.css";
import type { Metadata } from "next";
import { getSession, isAdminOverrideActive } from "@/lib/session";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { TopProgress } from "@/components/TopProgress";
import { AdminOverrideToggle } from "@/components/AdminOverrideToggle";

export const metadata: Metadata = {
  title: "High Stakes Poule",
  description: "WK 2026 — High Stakes Poule",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const override = session?.admin ? await isAdminOverrideActive() : false;

  return (
    <html lang="nl">
      <body className="min-h-screen antialiased">
        <TopProgress />

        <header className="border-b border-line bg-bg/85 backdrop-blur sm:sticky sm:top-0 sm:z-30">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                HS
              </span>
              <span className="text-[15px] font-semibold tracking-tight">High Stakes</span>
            </Link>

            {session ? (
              <nav className="flex items-center gap-0.5">
                <NavLink href="/predictions">Voorspellen</NavLink>
                <NavLink href="/leaderboard">Klassement</NavLink>
                <NavLink href="/bonus">Bonus</NavLink>
                <NavLink href="/me">Mij</NavLink>
                {session.admin && <NavLink href="/admin">Admin</NavLink>}
                {session.admin && (
                  <div className="ml-1">
                    <AdminOverrideToggle initial={override} />
                  </div>
                )}
                <span className="mx-2 hidden h-4 w-px bg-line sm:block" />
                <span className="hidden text-xs font-medium text-ink-500 sm:inline">{session.name}</span>
                <form action="/api/logout" method="post" className="ml-1">
                  <button type="submit" className="btn-icon" aria-label="Uitloggen">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </form>
              </nav>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
