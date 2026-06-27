import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Force fresh data on every navigation. Without this, the browser / CDN can
// hold on to a stale RSC payload or HTML for the dynamic app pages — which
// caused the "TBD" issue: a sync filled the team-ids in Supabase, but users
// kept seeing the previous cached render.
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

export const config = {
  // Apply to everything except static assets and the Next internals.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)).*)",
  ],
};
