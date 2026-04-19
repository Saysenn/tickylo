import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
	PROTECTED_ROUTES,
	SUPER_ADMIN_ROUTES,
	AUTH_ROUTES,
	MFA_ROUTE,
} from "@/configs/auth.config";
import { checkRoutePermission } from "@/lib/middlewares/rbac.middleware";
import { DEFAULT_ROLE, ROLES, type Role } from "@/configs/rbac.config";

export async function AuthMiddleware(request: NextRequest) {
	const { supabase, supabaseResponse } = createMiddlewareClient(request);
	const { pathname } = request.nextUrl;

	// Refresh session on every request — catch stale/invalid refresh token errors
	let user = null;
	try {
		const { data } = await supabase.auth.getUser();
		user = data.user;
	} catch {
		// Invalid refresh token: clear session and redirect to login
		const response = NextResponse.redirect(new URL("/login", request.url));
		request.cookies.getAll().forEach(({ name }) => {
			if (name.startsWith("sb-")) response.cookies.delete(name);
		});
		return response;
	}

	if (!user) {
		// Unauthenticated: block protected + super-admin routes and MFA page
		if (
			PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) ||
			SUPER_ADMIN_ROUTES.some((r) => pathname.startsWith(r)) ||
			pathname.startsWith(MFA_ROUTE)
		) {
			return NextResponse.redirect(new URL("/login", request.url));
		}
		return supabaseResponse;
	}

	// Super-admin routes — only accessible to super_admin role
	if (SUPER_ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
		const role = user.app_metadata?.role as Role;
		if (role !== ROLES.SUPER_ADMIN) {
			return NextResponse.redirect(new URL("/dashboard", request.url));
		}
		return supabaseResponse;
	}

	// User has a session — check MFA assurance level
	const { data: aal } =
		await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	const needsMfa = aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2";

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
		const role = (user.app_metadata?.role ?? DEFAULT_ROLE) as Role;
		const dest = role === ROLES.SUPER_ADMIN ? "/super-admin/dashboard" : "/dashboard";
		return NextResponse.redirect(new URL(dest, request.url));
	}

	// RBAC — reads role from JWT, zero DB calls
	const role = (user.app_metadata?.role ?? DEFAULT_ROLE) as Role;

	// Super admin shouldn't access the regular dashboard
	if (role === ROLES.SUPER_ADMIN && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
		return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
	}

	const rbacResponse = checkRoutePermission(pathname, role, request);
	if (rbacResponse) return rbacResponse;

	return supabaseResponse;
}
