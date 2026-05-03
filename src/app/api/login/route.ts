import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { createSession } from "@/lib/session";

const Body = z.object({
  user_id: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/),
});

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const cur = attempts.get(key);
  if (!cur || now - cur.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return true;
  }
  if (cur.count >= MAX_ATTEMPTS) return false;
  cur.count++;
  return true;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 });
  }

  const { user_id, pin } = parsed.data;

  if (!checkRateLimit(user_id)) {
    return NextResponse.json(
      { error: "Te veel pogingen. Probeer later opnieuw." },
      { status: 429 }
    );
  }

  const supabase = db();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, display_name, pin_hash, is_admin")
    .eq("id", user_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Onbekende gebruiker." }, { status: 404 });

  if (user.pin_hash === null) {
    const hash = await bcrypt.hash(pin, 10);
    const upd = await supabase.from("users").update({ pin_hash: hash }).eq("id", user.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
  } else {
    const ok = await bcrypt.compare(pin, user.pin_hash);
    if (!ok) return NextResponse.json({ error: "Onjuiste PIN." }, { status: 401 });
  }

  await createSession({ uid: user.id, name: user.display_name, admin: user.is_admin });
  attempts.delete(user_id);
  return NextResponse.json({ ok: true });
}
