import { NextResponse } from "next/server";
import { syncMatches } from "@/lib/sync";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth === `Bearer ${env.CRON_SECRET}`) return true;
  const url = new URL(req.url);
  if (env.CRON_SECRET && url.searchParams.get("secret") === env.CRON_SECRET) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncMatches();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
