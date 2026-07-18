import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/lib/auth";

/**
 * Gate the internal dashboards. Anyone can browse the marketing site and use
 * the chatbot, but /crm, /analytics and /rubric require an admin session.
 * Unauthenticated visitors are redirected to /login (with a ?next= so they
 * land back where they were headed after signing in).
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect only the dashboard routes.
  matcher: ["/crm/:path*", "/analytics/:path*", "/rubric/:path*"],
};
