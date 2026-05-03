import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/predictions");

  const { data: users, error } = await db()
    .from("users")
    .select("id, display_name, pin_hash")
    .order("display_name", { ascending: true });

  if (error) throw new Error(error.message);

  const list = (users ?? []).map((u) => ({
    id: u.id,
    display_name: u.display_name,
    needs_pin: u.pin_hash === null,
  }));

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="card relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative">
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-400">
            WK 2026 · Vrienden-poule
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold">Welkom terug</h1>
          <p className="mb-6 text-sm text-slate-400">
            Selecteer je naam en log in met je PIN.
          </p>
          {list.length === 0 ? (
            <p className="rounded-xl bg-warn-500/10 p-3 text-sm text-warn-400 ring-1 ring-warn-500/30">
              Er zijn nog geen deelnemers aangemaakt. Vraag de admin om je toe te voegen.
            </p>
          ) : (
            <LoginForm users={list} />
          )}
        </div>
      </div>
    </div>
  );
}
