import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PROTECTED_ROUTES = ["/dashboard", "/settings"];
const AUTH_ROUTES      = ["/login", "/register"];
const MFA_ROUTE        = "/2fa-verify";

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);
  const { pathname } = request.nextUrl;

  // Refresh session on every request
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Unauthenticated: block protected routes and MFA page
    if (
      PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) ||
      pathname.startsWith(MFA_ROUTE)
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // User has a session — check MFA assurance level
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsMfa =
    aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2";

  if (needsMfa) {
    // AAL1 session but user has MFA enrolled — must complete 2FA before accessing app
    if (!pathname.startsWith(MFA_ROUTE)) {
      return NextResponse.redirect(new URL(MFA_ROUTE, request.url));
    }
    return supabaseResponse;
  }

  // Fully authenticated (AAL2 or no MFA enrolled)
  if (
    AUTH_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith(MFA_ROUTE)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
