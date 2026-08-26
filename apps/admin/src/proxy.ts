import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE } from "@/lib/cookies";
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

/**
 * Cheap, unverified read of the JWT's role claim for routing only — real
 * authorization happens server-side via /auth/me (layout) and the API's
 * RolesGuard. This just keeps a non-admin token from bouncing between
 * "/" and "/login" forever.
 */
function tokenRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const isAdmin = !!token && tokenRole(token) === "admin";
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!isAdmin && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdmin && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
