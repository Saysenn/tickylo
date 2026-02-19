import {
	ROUTE_PERMISSIONS,
	UNAUTHORIZED_REDIRECT,
	type Role,
} from "@/configs/rbac.config";
import { NextRequest, NextResponse } from "next/server";

export function checkRoutePermission(
	pathname: string,
	role: Role,
	request: NextRequest,
): NextResponse | null {
	// const allowedRoles = Object.entries(ROUTE_PERMISSIONS).find(([route]) =>
	// 	pathname.startsWith(route),
	// )?.[1];
	const matchedRole = Object.keys(ROUTE_PERMISSIONS).find((route) =>
		pathname.startsWith(route),
	);
	const allowedRoles = matchedRole ? ROUTE_PERMISSIONS[matchedRole] : undefined;

	if (allowedRoles && !allowedRoles.includes(role)) {
		return NextResponse.redirect(new URL(UNAUTHORIZED_REDIRECT, request.url));
	}

	return null; // access granted
}
