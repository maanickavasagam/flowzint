/**
 * Tiny, dependency-free session tokens for the admin dashboard gate.
 *
 * A token is  base64url(payload) "." base64url(HMAC-SHA256(payload)).
 * We use the Web Crypto API (crypto.subtle) so the SAME code verifies in both
 * the Edge middleware runtime and Node route handlers — no `jose`, no `pg`, no
 * extra deps to install or break on Render.
 *
 * This is a deliberately simple shared-secret gate for a demo, not a full IdP:
 * access is granted to anyone who knows the admin password AND signs in with an
 * email on the allowed company domain (e.g. @foyer.com).
 */

export const AUTH_COOKIE = "foyer_admin";

/** Allowed login domain — configurable, defaults to foyer.com. */
export function allowedDomain(): string {
  return (process.env.ADMIN_EMAIL_DOMAIN || "foyer.com").toLowerCase();
}

/** The shared admin password. If unset, auth is effectively open in dev. */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

function secretKeyMaterial(): string {
  // Fall back to a constant only so local dev without config still works; in
  // production ADMIN_PASSWORD/AUTH_SECRET should always be set.
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "foyer-dev-secret";
}

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(payload: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKeyMaterial()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SessionPayload {
  email: string;
  exp: number; // unix seconds
}

/** Create a signed session token for a verified admin email. */
export async function signSession(email: string): Promise<string> {
  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64urlEncode(await hmac(body));
  return `${body}.${sig}`;
}

/** Verify a token; returns the payload if valid and unexpired, else null. */
export async function verifySession(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64urlEncode(await hmac(body));
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body))
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
