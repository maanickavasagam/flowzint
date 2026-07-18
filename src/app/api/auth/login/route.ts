import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_MAX_AGE,
  adminPassword,
  allowedDomain,
  signSession,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const domain = allowedDomain();
  const normalized = String(email || "").trim().toLowerCase();

  // Access requires BOTH: an email on the company domain AND the shared password.
  if (!normalized.endsWith(`@${domain}`)) {
    return NextResponse.json(
      { error: `Use your @${domain} work email to sign in.` },
      { status: 401 }
    );
  }

  const expected = adminPassword();
  if (!expected) {
    return NextResponse.json(
      { error: "Admin access isn't configured on this deployment." },
      { status: 500 }
    );
  }
  if (String(password || "") !== expected) {
    return NextResponse.json(
      { error: "That password doesn't match. Try again." },
      { status: 401 }
    );
  }

  const token = await signSession(normalized);
  const res = NextResponse.json({ ok: true, email: normalized });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
