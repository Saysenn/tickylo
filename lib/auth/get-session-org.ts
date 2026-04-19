import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface SessionOrg {
	userId: string;
	orgId: string | null;
	role: string;
	isSuperAdmin: boolean;
	isAdmin: boolean;
}

/**
 * Reads the Supabase session and returns tenant context.
 * Returns a 401 NextResponse if no session exists.
 * Super admins have no org_id (org-agnostic).
 */
export async function getSessionOrg(): Promise<SessionOrg | NextResponse> {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const role        = (user.app_metadata?.role ?? "employee") as string;
	const orgId       = (user.app_metadata?.org_id ?? null) as string | null;
	const isSuperAdmin = role === "super_admin";
	const isAdmin      = role === "admin" || isSuperAdmin;

	return { userId: user.id, orgId, role, isSuperAdmin, isAdmin };
}

/** Type guard — narrows the union returned by getSessionOrg */
export function isSessionOrg(v: SessionOrg | NextResponse): v is SessionOrg {
	return !(v instanceof NextResponse);
}
