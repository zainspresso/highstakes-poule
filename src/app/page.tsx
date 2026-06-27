import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
    <div className="mx-auto mt-8 max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tightest">Welkom terug</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Selecteer je naam en log in met je PIN.
        </p>
      </div>

      <div className="card p-6">
        {list.length === 0 ? (
          <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">
            Er zijn nog geen deelnemers. Vraag de admin om je toe te voegen.
          </p>
        ) : (
          <LoginForm users={list} />
        )}
      </div>
    </div>
  );
}
