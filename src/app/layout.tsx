import "./globals.css";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { TopProgress } from "@/components/TopProgress";

export const metadata: Metadata = {
  title: "WK 2026 Poule",
  description: "WK 2026 vrienden-poule",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="nl">
      <body className="min-h-screen antialiased">
        <TopProgress />
        <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-900/80 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500 text-ink-900 shadow-glow">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16z" /></svg>
              </span>
              <span className="font-display text-lg font-bold tracking-tight">WK Poule</span>
            </Link>
            {session ? (
              <nav className="flex items-center gap-1 text-sm">
                <NavLink href="/predictions">Voorspellen</NavLink>
                <NavLink href="/leaderboard">Klassement</NavLink>
                <NavLink href="/bonus">Bonus</NavLink>
                <NavLink href="/me">Mij</NavLink>
                {session.admin && <NavLink href="/admin">Admin</NavLink>}
                <span className="ml-2 hidden rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10 sm:inline">
                  {session.name}
                </span>
                <form action="/api/logout" method="post">
                  <button type="submit" className="btn-ghost text-slate-400 hover:text-red-400" aria-label="Uitloggen">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </form>
              </nav>
            ) : null}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
