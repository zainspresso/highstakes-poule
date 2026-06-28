import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const COOKIE = "poule_session";
const ALG = "HS256";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type Session = {
  uid: string;
  name: string;
  admin: boolean;
};

export async function createSession(s: Session): Promise<void> {
  const jwt = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);

  const c = await cookies();
  c.set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.uid === "string" &&
      typeof payload.name === "string" &&
      typeof payload.admin === "boolean"
    ) {
      return { uid: payload.uid, name: payload.name, admin: payload.admin };
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!s.admin) throw new Error("FORBIDDEN");
  return s;
}

// ---- Admin override: laat admin voorspellingen na kickoff aanpassen ----
const ADMIN_OVERRIDE_COOKIE = "poule_admin_override";

export async function isAdminOverrideActive(): Promise<boolean> {
  const s = await getSession();
  if (!s?.admin) return false;
  const c = await cookies();
  return c.get(ADMIN_OVERRIDE_COOKIE)?.value === "1";
}

export async function setAdminOverride(on: boolean): Promise<void> {
  const c = await cookies();
  if (on) {
    c.set(ADMIN_OVERRIDE_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
  } else {
    c.delete(ADMIN_OVERRIDE_COOKIE);
  }
}
